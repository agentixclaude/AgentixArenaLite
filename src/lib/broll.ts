// B-roll: clips and photos the user adds to a project, played in the preview and decoded
// frame-accurately for export.
import { Input, BlobSource, ALL_FORMATS, CanvasSink } from 'mediabunny';
import type { Edit } from './style';
import type { FrameSrc } from './render';

export interface BrollAsset { id: string; name: string; kind: 'video' | 'image'; blob: Blob | null; w: number; h: number; dur: number; thumb: string }

async function thumbOf(img: CanvasImageSource, w: number, h: number) {
  const c = document.createElement('canvas');
  c.width = 240; c.height = Math.round((240 * h) / w);
  c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height);
  return c.toDataURL('image/jpeg', 0.7);
}

export async function makeAsset(file: File): Promise<BrollAsset> {
  const id = crypto.randomUUID();
  if (/^image\//.test(file.type)) {
    const bmp = await createImageBitmap(file);
    const thumb = await thumbOf(bmp, bmp.width, bmp.height);
    const a: BrollAsset = { id, name: file.name, kind: 'image', blob: file, w: bmp.width, h: bmp.height, dur: 0, thumb };
    bmp.close();
    return a;
  }
  const input = new Input({ source: new BlobSource(file), formats: ALL_FORMATS });
  const v = await input.getPrimaryVideoTrack();
  if (!v) throw new Error(`${file.name} has no video track.`);
  if (!(await v.canDecode())) throw new Error(`This browser can't decode ${file.name}. Export it as H.264 MP4.`);
  const dur = await input.computeDuration();
  const sink = new CanvasSink(v, { width: 240, height: Math.round((240 * v.displayHeight) / v.displayWidth), fit: 'fill' });
  const fr = await sink.getCanvas(Math.min(1, dur / 2));
  const thumb = fr ? await thumbOf(fr.canvas as CanvasImageSource, 240, Math.round((240 * v.displayHeight) / v.displayWidth)) : '';
  return { id, name: file.name, kind: 'video', blob: file, w: v.displayWidth, h: v.displayHeight, dur, thumb };
}

/** Preview playback: one muted <video> (or bitmap) per asset, kept in step with the timeline. */
export class BrollPreview {
  private els = new Map<string, { kind: 'video' | 'image'; el: HTMLVideoElement | ImageBitmap; url?: string; w: number; h: number; dur: number }>();
  async sync(assets: BrollAsset[]) {
    const ids = new Set(assets.map((a) => a.id));
    for (const [id, e] of this.els) if (!ids.has(id)) { this.drop(id, e); }
    for (const a of assets) {
      if (this.els.has(a.id) || !a.blob) continue;
      if (a.kind === 'image') {
        try { const bmp = await createImageBitmap(a.blob); this.els.set(a.id, { kind: 'image', el: bmp, w: bmp.width, h: bmp.height, dur: 0 }); } catch { /* skip */ }
      } else {
        const url = URL.createObjectURL(a.blob);
        const v = document.createElement('video');
        v.src = url; v.muted = true; v.playsInline = true; v.preload = 'auto';
        this.els.set(a.id, { kind: 'video', el: v, url, w: a.w, h: a.h, dur: a.dur });
      }
    }
  }
  private drop(id: string, e: { kind: string; el: HTMLVideoElement | ImageBitmap; url?: string }) {
    if (e.kind === 'video') { (e.el as HTMLVideoElement).pause(); (e.el as HTMLVideoElement).removeAttribute('src'); }
    else (e.el as ImageBitmap).close();
    if (e.url) URL.revokeObjectURL(e.url);
    this.els.delete(id);
  }
  frame(id: string, localT: number, playing: boolean): FrameSrc | null {
    const e = this.els.get(id);
    if (!e) return null;
    if (e.kind === 'image') return { img: e.el as ImageBitmap, w: e.w, h: e.h };
    const v = e.el as HTMLVideoElement;
    const target = Math.min(localT, Math.max(0, (v.duration || e.dur) - 0.05));
    if (playing) {
      if (v.paused) { v.currentTime = target; v.play().catch(() => {}); }
      else if (Math.abs(v.currentTime - target) > 0.3) v.currentTime = target;
    } else {
      if (!v.paused) v.pause();
      if (Math.abs(v.currentTime - target) > 0.04 && !v.seeking) v.currentTime = target;
    }
    return v.readyState >= 2 && v.videoWidth ? { img: v, w: v.videoWidth, h: v.videoHeight } : null;
  }
  pauseExcept(id: string | null) { for (const [k, e] of this.els) if (k !== id && e.kind === 'video') (e.el as HTMLVideoElement).pause(); }
  dispose() { for (const [id, e] of this.els) this.drop(id, e); }
}

/** Export: per B-roll shot, a sequential decoder over exactly the frames the export will draw. */
export async function brollExporter(assets: BrollAsset[], edit: Edit, fps: number) {
  const byId = new Map(assets.map((a) => [a.id, a]));
  const images = new Map<string, ImageBitmap>();
  const gens = new Map<number, AsyncGenerator<{ canvas: unknown } | null>>();
  const sinks = new Map<string, { sink: CanvasSink; w: number; h: number }>();
  for (const a of assets) {
    if (!a.blob) continue;
    if (a.kind === 'image') { try { images.set(a.id, await createImageBitmap(a.blob)); } catch { /* skip */ } continue; }
    const input = new Input({ source: new BlobSource(a.blob), formats: ALL_FORMATS });
    const v = await input.getPrimaryVideoTrack();
    if (!v) continue;
    const k = Math.min(1, 1920 / Math.max(v.displayWidth, v.displayHeight));
    const w = Math.round((v.displayWidth * k) / 2) * 2, h = Math.round((v.displayHeight * k) / 2) * 2;
    sinks.set(a.id, { sink: new CanvasSink(v, { width: w, height: h, fit: 'fill', poolSize: 2 }), w, h });
  }
  const n = Math.max(1, Math.round(edit.duration * fps));
  return {
    async frame(shotIdx: number, frameIdx: number): Promise<FrameSrc | null> {
      const s = edit.shots[shotIdx];
      if (!s?.broll) return null;
      const a = byId.get(s.broll.id);
      if (!a) return null;
      const img = images.get(a.id);
      if (img) return { img, w: img.width, h: img.height };
      const sk = sinks.get(a.id);
      if (!sk) return null;
      let gen = gens.get(shotIdx);
      if (!gen) {
        const times: number[] = [];
        for (let i = frameIdx; i < n; i++) { const t = i / fps; if (t >= s.outE) break; times.push(Math.min(t - s.outS, Math.max(0, a.dur - 0.05))); }
        gen = sk.sink.canvasesAtTimestamps(times) as unknown as AsyncGenerator<{ canvas: unknown } | null>;
        gens.set(shotIdx, gen);
      }
      const r = await gen.next();
      const wc = r.value as { canvas: CanvasImageSource } | null | undefined;
      return wc ? { img: wc.canvas, w: sk.w, h: sk.h } : null;
    },
    close() { images.forEach((b) => b.close()); },
  };
}
