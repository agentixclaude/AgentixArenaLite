import { motionBlurred, cutsOf } from './motion';
import {
  Input, BlobSource, ALL_FORMATS, CanvasSink, Output, Mp4OutputFormat, BufferTarget,
  CanvasSource, AudioBufferSource, QUALITY_HIGH, canEncodeVideo, canEncodeAudio,
} from 'mediabunny';
import type { Pack } from './packs';
import type { Edit } from './style';
import { outToSrc, usesCutout } from './style';
import { renderFrame, type Face, type RenderOpts, type FrameSrc } from './render';
import { Keyer } from './keyer';
import { loadSegmenter, resetMaskHistory } from './segment';
import { load3D } from './three3d';
import { brollExporter, type BrollAsset } from './broll';
import { fontStr, loadFonts, type TextOverrides } from './text';
import { mixDown } from './sound';

const FPS = 30;

/** Cut the original audio to the edit's kept segments, short fades at each join, loudness-ish normalize. */
export function buildAudio(src: AudioBuffer, edit: Edit): AudioBuffer {
  const sr = src.sampleRate;
  const len = Math.max(1, Math.ceil(edit.duration * sr));
  const ch = src.numberOfChannels;
  const out = new AudioBuffer({ length: len, numberOfChannels: ch, sampleRate: sr });
  const fade = Math.floor(sr * 0.008);
  for (let c = 0; c < ch; c++) {
    const s = src.getChannelData(c);
    const d = out.getChannelData(c);
    for (const g of edit.segs) {
      const a = Math.floor(g.srcS * sr), b = Math.min(s.length, Math.floor(g.srcE * sr));
      const o = Math.floor(g.outS * sr);
      const n = Math.min(b - a, len - o);
      for (let i = 0; i < n; i++) {
        let v = s[a + i];
        if (i < fade) v *= i / fade;
        else if (i > n - fade) v *= (n - i) / fade;
        d[o + i] = v;
      }
    }
  }
  // normalize: RMS target ~ -16 dBFS, peak ceiling -1 dBFS
  let sum = 0, peak = 0;
  const d0 = out.getChannelData(0);
  for (let i = 0; i < d0.length; i++) { sum += d0[i] * d0[i]; peak = Math.max(peak, Math.abs(d0[i])); }
  const rms = Math.sqrt(sum / d0.length) || 1e-6;
  const gain = Math.min(Math.pow(10, -16 / 20) / rms, 0.89 / (peak || 1), 6);
  for (let c = 0; c < ch; c++) { const d = out.getChannelData(c); for (let i = 0; i < d.length; i++) d[i] *= gain; }
  return out;
}

export interface ExportOpts {
  file: Blob; edit: Edit; pack: Pack; W: number; H: number; face: Face; captions: boolean;
  audio: AudioBuffer | null; onProgress: (p: number) => void; signal?: AbortSignal;
  /** Music + effects bed at the voice's sample rate (mixed under the normalized voice). */
  bed?: AudioBuffer | null;
  look: Pick<RenderOpts, 'capStyle' | 'key' | 'bg' | 'photo' | 'text' | 'cutout' | 'motion' | 'textLayer'>;
  brolls?: BrollAsset[];
}

/** Every font the text overrides ask for, so export never draws with a fallback face. */
export function textFonts(t?: TextOverrides) {
  const out: string[] = [];
  for (const v of Object.values(t ?? {})) if (v?.font) out.push(fontStr({ font: v.font, weight: v.weight ?? 400, italic: v.italic }, 40));
  return out;
}

export async function exportMp4(o: ExportOpts): Promise<{ blob: Blob; codec: string }> {
  const input = new Input({ source: new BlobSource(o.file), formats: ALL_FORMATS });
  const vt = await input.getPrimaryVideoTrack();
  if (!vt) throw new Error('No video track');
  const longSide = Math.max(vt.displayWidth, vt.displayHeight);
  const k = Math.min(1, 2560 / longSide);
  const sw = Math.round((vt.displayWidth * k) / 2) * 2, sh = Math.round((vt.displayHeight * k) / 2) * 2;
  const sink = new CanvasSink(vt, { width: sw, height: sh, fit: 'fill', poolSize: 2 });

  const keyer = o.look.key ? new Keyer(2560) : null;
  const needsCut = !o.look.key && o.look.cutout && usesCutout(o.edit);
  if (needsCut) { await loadSegmenter(); resetMaskHistory(); }
  if (o.edit.shots.some((s) => s.layout === 'card' && s.card === 'object3d')) await load3D();
  await loadFonts(textFonts(o.look.text));
  const bx = o.brolls?.length && o.edit.shots.some((s) => s.layout === 'broll') ? await brollExporter(o.brolls, o.edit, FPS) : null;
  const canvas = document.createElement('canvas');
  canvas.width = o.W; canvas.height = o.H;
  const ctx = canvas.getContext('2d', { alpha: false })!;

  const vcodec = (await canEncodeVideo('avc', { width: o.W, height: o.H })) ? 'avc' : 'vp9';
  const acodec = (await canEncodeAudio('aac')) ? 'aac' : 'opus';
  const output = new Output({ format: new Mp4OutputFormat({ fastStart: 'in-memory' }), target: new BufferTarget() });
  const vsrc = new CanvasSource(canvas, { codec: vcodec, quality: QUALITY_HIGH, keyFrameInterval: 2 });
  output.addVideoTrack(vsrc, { frameRate: FPS });
  let asrc: AudioBufferSource | null = null;
  if (o.audio || o.bed) { asrc = new AudioBufferSource({ codec: acodec, quality: QUALITY_HIGH }); output.addAudioTrack(asrc); }
  await output.start();

  const n = Math.max(1, Math.round(o.edit.duration * FPS));
  const cuts = cutsOf(o.edit);
  const times = function* () { for (let i = 0; i < n; i++) yield outToSrc(o.edit.segs, i / FPS); };
  let i = 0;
  for await (const wc of sink.canvasesAtTimestamps(times())) {
    if (o.signal?.aborted) { await output.cancel(); throw new Error('cancelled'); }
    const src = wc ? { img: wc.canvas as CanvasImageSource, w: sw, h: sh } : null;
    const t = i / FPS;
    let si = o.edit.shots.findIndex((s) => t >= s.outS && t < s.outE);
    if (si < 0) si = o.edit.shots.length - 1;
    const bfr: FrameSrc | null = bx && o.edit.shots[si].layout === 'broll' ? await bx.frame(si, i) : null;
    const opts = { ...o.look, keyer, face: o.face, captions: o.captions, frameIdx: i, srcT: outToSrc(o.edit.segs, t), broll: () => bfr };
    // Great: true motion blur, 6 sub-frames across a 180° shutter (same decoded video frame, graphics move).
    if (o.look.motion === 'great') motionBlurred(ctx, o.W, o.H, t, FPS, (c, tj) => renderFrame(c, o.W, o.H, src, o.edit, o.pack, { ...opts, t: tj }), 6, 0.5, cuts);
    else renderFrame(ctx, o.W, o.H, src, o.edit, o.pack, { ...opts, t });
    await vsrc.add(i / FPS, 1 / FPS);
    i++;
    if (i % 5 === 0) o.onProgress(i / n * (asrc ? 0.97 : 1));
    if (i >= n) break;
  }
  vsrc.close();
  if (asrc) {
    const voice = o.audio ? buildAudio(o.audio, o.edit) : null;
    const sr = voice?.sampleRate ?? o.bed!.sampleRate;
    const mixed = o.bed ? mixDown(voice, o.bed, sr, Math.max(1, Math.round(o.edit.duration * sr))) : voice!;
    await asrc.add(mixed);
    asrc.close();
  }
  await output.finalize();
  bx?.close();
  o.onProgress(1);
  const buf = (output.target as BufferTarget).buffer!;
  return { blob: new Blob([buf], { type: 'video/mp4' }), codec: `${vcodec.toUpperCase()} + ${acodec.toUpperCase()}` };
}

// ---------- SRT ----------
const ts = (t: number) => {
  const ms = Math.round(t * 1000);
  const h = Math.floor(ms / 3600000), m = Math.floor((ms % 3600000) / 60000), s = Math.floor((ms % 60000) / 1000);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')},${String(ms % 1000).padStart(3, '0')}`;
};
export function buildSrt(edit: Edit): string {
  return edit.caps.map((c, i) => `${i + 1}\n${ts(c.outS)} --> ${ts(c.outE)}\n${c.words.map((w) => w.w.trim()).join(' ')}\n`).join('\n');
}

// ---------- Premiere / FCP7 XML ----------
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const f = (t: number) => Math.round(t * FPS);

export function buildXml(o: { edit: Edit; name: string; fileName: string; srcW: number; srcH: number; srcDur: number; W: number; H: number; brolls?: BrollAsset[]; sound?: { name: string } }): string {
  const { edit } = o;
  const rate = `<rate><timebase>${FPS}</timebase><ntsc>FALSE</ntsc></rate>`;
  const fileDef = `<file id="file-1"><name>${esc(o.fileName)}</name><pathurl>file://localhost/${encodeURIComponent(o.fileName)}</pathurl>${rate}<duration>${f(o.srcDur)}</duration><media><video><samplecharacteristics>${rate}<width>${o.srcW}</width><height>${o.srcH}</height></samplecharacteristics></video><audio><samplecharacteristics><depth>16</depth><samplerate>48000</samplerate></samplecharacteristics><channelcount>2</channelcount></audio></media></file>`;
  const baseScale = Math.max(o.W / o.srcW, o.H / o.srcH) * 100;
  // video pieces = segments split at shot boundaries (so punch-ins get their own scale)
  const pieces: { outS: number; outE: number; srcS: number; zoom: number; layout: string }[] = [];
  for (const g of edit.segs) {
    let a = g.outS;
    while (a < g.outE - 1e-3) {
      const shot = edit.shots.find((s) => a >= s.outS - 1e-4 && a < s.outE) ?? edit.shots[edit.shots.length - 1];
      const b = Math.min(g.outE, shot.outE);
      pieces.push({ outS: a, outE: b, srcS: g.srcS + (a - g.outS), zoom: shot.layout === 'punch' ? shot.zoom : 1, layout: shot.layout });
      if (b <= a) break;
      a = b;
    }
  }
  let first = true;
  const vClips = pieces.filter((p) => f(p.outE) > f(p.outS)).map((p, i) => {
    const file = first ? fileDef : '<file id="file-1"/>';
    first = false;
    return `<clipitem id="v-${i + 1}"><name>${esc(o.fileName)}</name><enabled>TRUE</enabled><duration>${f(o.srcDur)}</duration>${rate}<start>${f(p.outS)}</start><end>${f(p.outE)}</end><in>${f(p.srcS)}</in><out>${f(p.srcS) + f(p.outE) - f(p.outS)}</out>${file}<filter><effect><name>Basic Motion</name><effectid>basic</effectid><effectcategory>motion</effectcategory><effecttype>motion</effecttype><mediatype>video</mediatype><parameter authoringApp="PremierePro"><parameterid>scale</parameterid><name>Scale</name><valuemin>0</valuemin><valuemax>1000</valuemax><value>${(baseScale * p.zoom).toFixed(2)}</value></parameter></effect></filter><labels><label2>${p.layout === 'punch' ? 'Mango' : 'Iris'}</label2></labels></clipitem>`;
  });
  const aClips = edit.segs.filter((g) => f(g.outE) > f(g.outS)).map((g, i) => `<clipitem id="a-${i + 1}"><name>${esc(o.fileName)}</name><enabled>TRUE</enabled><duration>${f(o.srcDur)}</duration>${rate}<start>${f(g.outS)}</start><end>${f(g.outE)}</end><in>${f(g.srcS)}</in><out>${f(g.srcS) + f(g.outE) - f(g.outS)}</out><file id="file-1"/><sourcetrack><mediatype>audio</mediatype><trackindex>1</trackindex></sourcetrack></clipitem>`);
  const markers = edit.shots.filter((s) => s.mg).map((s) => {
    const mg = s.mg!;
    const txt = mg.kind === 'stat' ? `${mg.value} ${mg.label}` : mg.kind === 'list' ? `${mg.title}: ${mg.items.join(', ')}` : 'text' in mg ? mg.text : '';
    return `<marker><name>${esc(`MG ${s.layout.toUpperCase()} · ${mg.kind}`)}</name><comment>${esc(txt)}</comment><in>${f(s.outS)}</in><out>${f(s.outE)}</out></marker>`;
  });
  const seen = new Set<string>();
  const bClips = edit.shots.filter((s) => s.layout === 'broll' && s.broll).map((s, i) => {
    const a = o.brolls?.find((x) => x.id === s.broll!.id);
    if (!a) return '';
    const fid = `broll-${a.id.slice(0, 8)}`;
    const len = f(s.outE) - f(s.outS);
    const fdur = a.kind === 'video' ? Math.max(len, f(a.dur)) : len;
    const fileXml = seen.has(fid) ? `<file id="${fid}"/>` : `<file id="${fid}"><name>${esc(a.name)}</name><pathurl>file://localhost/${encodeURIComponent(a.name)}</pathurl>${rate}<duration>${fdur}</duration><media><video><samplecharacteristics>${rate}<width>${a.w}</width><height>${a.h}</height></samplecharacteristics></video></media></file>`;
    seen.add(fid);
    return `<clipitem id="b-${i + 1}"><name>${esc(a.name)}</name><enabled>TRUE</enabled><duration>${fdur}</duration>${rate}<start>${f(s.outS)}</start><end>${f(s.outE)}</end><in>0</in><out>${len}</out>${fileXml}<labels><label2>Forest</label2></labels></clipitem>`;
  }).filter(Boolean);
  const v2 = bClips.length ? `<track>${bClips.join('')}</track>` : '';
  // A2: the music + effects bed as one WAV that spans the sequence
  const end = f(edit.duration);
  const a2 = o.sound ? `<track><clipitem id="m-1"><name>${esc(o.sound.name)}</name><enabled>TRUE</enabled><duration>${end}</duration>${rate}<start>0</start><end>${end}</end><in>0</in><out>${end}</out><file id="file-m"><name>${esc(o.sound.name)}</name><pathurl>file://localhost/${encodeURIComponent(o.sound.name)}</pathurl>${rate}<duration>${end}</duration><media><audio><samplecharacteristics><depth>16</depth><samplerate>48000</samplerate></samplecharacteristics><channelcount>2</channelcount></audio></media></file><sourcetrack><mediatype>audio</mediatype><trackindex>1</trackindex></sourcetrack><labels><label2>Caribbean</label2></labels></clipitem></track>` : '';
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE xmeml>
<xmeml version="4"><sequence id="seq-1"><name>${esc(o.name)}</name><duration>${f(edit.duration)}</duration>${rate}${markers.join('')}<media><video><format><samplecharacteristics>${rate}<width>${o.W}</width><height>${o.H}</height><pixelaspectratio>square</pixelaspectratio><fielddominance>none</fielddominance></samplecharacteristics></format><track>${vClips.join('')}</track>${v2}</video><audio><track>${aClips.join('')}</track>${a2}</audio></media></sequence></xmeml>`;
}

export function download(data: Blob | string, filename: string, type = 'application/octet-stream') {
  const blob = typeof data === 'string' ? new Blob([data], { type }) : data;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}
