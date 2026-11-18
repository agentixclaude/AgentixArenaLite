import { useEffect, useMemo, useRef, useState } from 'react';
import { PACKS, packById, detectTheme, ASPECTS, FONT_LOADS, CAPTION_STYLES, BG_COLORS, BG_GRADIENTS, BG_PATTERNS, type Aspect, type Bg, type CaptionStyleId, type Pack } from '../lib/packs';
import { GROUPS, MOTIFS, MOTIF_CATS, groupById, type MotifId, type MotifCat } from '../lib/looks';
import { withBase, photoAvg, BASE_COLORS, type BaseBg, type BasePhoto } from '../lib/basebg';
import { drawMotif } from '../lib/motifs';
import { buildEdit, hashStr, type Word } from '../lib/style';
import { probe, decodeAudio, to16kMono, thumbnail } from '../lib/media';
import { exportMp4, buildXml, buildSrt, download } from '../lib/export';
import { saveProject, loadProject, askPersist, type Project } from '../lib/db';
import { detectScreen, faceFromScreen, faceFromDetector, DEFAULT_KEY } from '../lib/keyer';
import Player, { LAYOUT_NAMES } from './Player';
import Icon from '../components/Icon';
import TextPanel from './editor/TextPanel';
import ShotsPanel from './editor/ShotsPanel';
import BrollPanel from './editor/BrollPanel';
import SoundPanel from './editor/SoundPanel';
import { soundOf, soundOn, buildBed, sfxEvents, voiceGain, decodeMusic, renderLoop, autoTrack, toWav, type SoundSettings } from '../lib/sound';
import { segState, onSegState, findFace, type SegState } from '../lib/segment';
import { makeAsset, type BrollAsset } from '../lib/broll';
import { lum as lumOf, type LayerId, type TextProps } from '../lib/text';
import type { ShotEdit } from '../lib/style';
import DeviceNote from '../components/DeviceNote';

/** A still of one background motif in the current palette. */
function MotifThumb({ pack, id }: { pack: Pack; id: MotifId }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    drawMotif(c.getContext('2d')!, { x: 0, y: 0, w: c.width, h: c.height }, pack, 2.6, c.width / 560, id);
  }, [pack.bg, pack.bg2, pack.ink, pack.accent, pack.subject, pack.base, id]); // eslint-disable-line react-hooks/exhaustive-deps
  return <canvas ref={ref} width={176} height={124} />;
}

const HOOK_NAMES = { lockup: 'Kinetic', lower: 'Classic' } as const;
const BASE_NAMES = { preset: 'Preset', color: 'Colour', gradient: 'Gradient', photo: 'Photo' } as const;
const HOOK_NOTES = { lockup: 'Two fonts, big word rises in, centred', lower: 'One-font title with a highlight word' } as const;

type Tab = 'style' | 'text' | 'shots' | 'broll' | 'sound' | 'captions';
const TABS: { id: Tab; name: string; icon: string }[] = [
  { id: 'style', name: 'Style', icon: 'palette' }, { id: 'text', name: 'Text', icon: 'type' }, { id: 'shots', name: 'Shots', icon: 'shots' },
  { id: 'broll', name: 'B-roll', icon: 'film' }, { id: 'sound', name: 'Sound', icon: 'music' }, { id: 'captions', name: 'Captions', icon: 'captions' },
];

type Stage = 'drop' | 'working' | 'editor' | 'relink';
type StepKey = 'read' | 'model' | 'listen' | 'design';
interface StepState { status: 'wait' | 'run' | 'done'; p: number; note: string }

const STEPS: { key: StepKey; label: string }[] = [
  { key: 'read', label: 'Reading your video' },
  { key: 'model', label: 'Loading caption AI (first time only)' },
  { key: 'listen', label: 'Writing captions word by word' },
  { key: 'design', label: 'Cutting pauses and designing the edit' },
];

const MAX_SEC = 300;
const fmt = (t: number) => `${Math.floor(t / 60)}:${String(Math.round(t % 60)).padStart(2, '0')}`;
const mb = (b: number) => (b / 1048576).toFixed(0);
const baseName = (n: string) => n.replace(/\.[^.]+$/, '');
const fileSafe = (n: string) => n.replace(/[^\w\- ]+/g, '').trim().replace(/\s+/g, '_') || 'Arena_Lite_Edit';

let fontsReady: Promise<unknown> | null = null;
const loadFonts = () => (fontsReady ??= Promise.all(FONT_LOADS.map((f) => document.fonts.load(f))).catch(() => {}));

interface Props { defaultPack: string; defaultCap: string; openId: string | null; onOpened: () => void; onSaved: () => void; toast: (m: string) => void }

export default function Create({ defaultPack, defaultCap, openId, onOpened, onSaved, toast }: Props) {
  const [stage, setStage] = useState<Stage>('drop');
  const [over, setOver] = useState(false);
  const [aspect, setAspect] = useState<Aspect>('9:16');
  const [lang, setLang] = useState('en');
  const [acc, setAcc] = useState<'fast' | 'accurate'>('accurate');
  const [packChoice, setPackChoice] = useState(defaultPack);
  const [capChoice, setCapChoice] = useState(defaultCap);
  const [steps, setSteps] = useState<Record<StepKey, StepState>>(() => Object.fromEntries(STEPS.map((s) => [s.key, { status: 'wait', p: 0, note: '' }])) as Record<StepKey, StepState>);
  const [error, setError] = useState('');
  const [working, setWorking] = useState<{ name: string; meta: string; thumb: string } | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [url, setUrl] = useState('');
  const [photo, setPhoto] = useState<{ img: ImageBitmap; w: number; h: number } | null>(null);
  const [canvasPhoto, setCanvasPhoto] = useState<BasePhoto | null>(null);
  const [designCat, setDesignCat] = useState<MotifCat | 'all'>('all');
  const [exp, setExp] = useState<{ p: number; running: boolean; blob?: Blob; codec?: string; secs?: number; err?: string }>({ p: 0, running: false });
  const [now, setNow] = useState(0);
  const [bgTab, setBgTab] = useState<Bg['type']>('pack');
  const [tab, setTab] = useState<Tab>('style');
  const [sel, setSel] = useState<LayerId | null>(null);
  const [busy, setBusy] = useState('');
  const [seg, setSeg] = useState<SegState>(segState());
  useEffect(() => onSegState(setSeg), []);
  const audioRef = useRef<{ id: string; buf: AudioBuffer } | null>(null);
  const workerRef = useRef<Worker | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const seekRef = useRef<((t: number) => void) | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const relinkRef = useRef<HTMLInputElement>(null);
  const photoRef = useRef<HTMLInputElement>(null);
  const canvasPhotoRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setPackChoice(defaultPack); }, [defaultPack]);
  useEffect(() => { setCapChoice(defaultCap); }, [defaultCap]);
  useEffect(() => { loadFonts(); askPersist(); }, []);

  useEffect(() => {
    if (!openId) return;
    (async () => {
      const p = await loadProject(openId);
      onOpened();
      if (!p) return;
      await loadFonts();
      openProject(p);
    })();
  }, [openId]); // eslint-disable-line react-hooks/exhaustive-deps

  const openProject = async (p: Project) => {
    if (url) URL.revokeObjectURL(url);
    // older projects: fill in new fields
    p.capStyle ??= 'auto';
    p.screen ??= { on: false, detected: false, key: DEFAULT_KEY };
    p.bg ??= { type: 'pack' };
    p.textProps ??= {};
    p.shotEdits ??= {};
    p.cutout ??= true;
    p.brolls ??= [];
    setBgTab(p.bg.type);
    setProject(p);
    setExp({ p: 0, running: false });
    setPhoto(null);
    if (p.photo) { try { const img = await createImageBitmap(p.photo); setPhoto({ img, w: img.width, h: img.height }); } catch { /* ignore */ } }
    setCanvasPhoto(null);
    if (p.canvasPhoto) { try { const img = await createImageBitmap(p.canvasPhoto); setCanvasPhoto({ img, w: img.width, h: img.height, avg: photoAvg(img) }); } catch { /* ignore */ } }
    if (!p.file) { setUrl(''); setStage('relink'); return; }
    setUrl(URL.createObjectURL(p.file));
    setStage('editor');
  };

  const step = (k: StepKey, s: Partial<StepState>) => setSteps((cur) => ({ ...cur, [k]: { ...cur[k], ...s } }));

  const transcribe = (audio: Float32Array) => new Promise<{ words: Word[]; text: string }>((resolve, reject) => {
    if (!workerRef.current) workerRef.current = new Worker(new URL('../lib/whisper.worker.ts', import.meta.url), { type: 'module' });
    const w = workerRef.current;
    w.onmessage = (e) => {
      const m = e.data;
      if (m.type === 'download') step('model', { status: 'run', p: m.total ? m.loaded / m.total : 0, note: m.total ? `${mb(m.loaded)} / ${mb(m.total)} MB` : '' });
      else if (m.type === 'ready') { step('model', { status: 'done', p: 1, note: m.device === 'webgpu' ? 'GPU' : 'CPU' }); step('listen', { status: 'run', note: '' }); }
      else if (m.type === 'progress') step('listen', { status: 'run', p: m.p, note: `${Math.round(m.p * 100)}%` });
      else if (m.type === 'done') resolve({ words: m.words, text: m.text });
      else if (m.type === 'error') reject(new Error(m.message));
    };
    w.onerror = (e) => reject(new Error(e.message || 'Caption AI failed to start'));
    step('model', { status: 'run', note: 'starting…' });
    w.postMessage({ type: 'run', audio, model: acc, language: lang, device: new URLSearchParams(location.search).has('cpu') ? 'wasm' : 'auto' }, [audio.buffer]);
  });

  const save = async (p: Project) => {
    try {
      const { freed } = await saveProject(p);
      if (freed.length) toast(`Browser storage was full — removed the saved video from: ${freed.join(', ')}. Their edits are kept.`);
    } catch { /* storage unavailable: app still works for this session */ }
    onSaved();
  };

  const processFile = async (file: File) => {
    setError('');
    setSteps(Object.fromEntries(STEPS.map((s) => [s.key, { status: 'wait', p: 0, note: '' }])) as Record<StepKey, StepState>);
    if (!/^video\//.test(file.type) && !/\.(mp4|mov|m4v|webm|mkv)$/i.test(file.name)) { setError('That file is not a video. Upload an MP4, MOV or WebM.'); return; }
    setStage('working');
    setWorking({ name: file.name, meta: `${(file.size / 1048576).toFixed(1)} MB`, thumb: '' });
    try {
      step('read', { status: 'run', note: 'checking…' });
      const info = await probe(file);
      if (!info.canDecode) throw new Error('This browser cannot decode this video codec. Export it as H.264 MP4 and try again.');
      if (!info.hasAudio) throw new Error('This video has no audio, so there is nothing to caption or cut.');
      if (info.duration > MAX_SEC) throw new Error(`This video is ${fmt(info.duration)}. Lite handles up to ${MAX_SEC / 60} minutes — trim it and upload again.`);
      const thumb = await thumbnail(file, Math.min(1, info.duration / 3)).catch(() => '');
      setWorking({ name: file.name, meta: `${fmt(info.duration)} · ${info.width}×${info.height} · ${(file.size / 1048576).toFixed(1)} MB`, thumb });
      // green screen + face
      let screen = { on: false, detected: false, key: DEFAULT_KEY };
      let face = { x: 0.5, y: 0.3 };
      if (thumb) {
        const scr = await detectScreen(thumb).catch(() => null);
        if (scr?.isScreen) {
          screen = { on: true, detected: true, key: { ...DEFAULT_KEY, color: scr.color } };
          face = (await faceFromScreen(thumb, scr.color).catch(() => null)) ?? face;
        } else {
          const big = await thumbnail(file, Math.min(1, info.duration / 3), 640).catch(() => '');
          face = (big ? await findFace(big) : null) ?? (await faceFromDetector(thumb)) ?? face;
        }
      }
      const buf = await decodeAudio(file, (p) => step('read', { p, note: `${Math.round(p * 100)}%` }));
      const pcm = await to16kMono(buf);
      step('read', { status: 'done', p: 1, note: screen.detected ? 'green screen found' : '' });
      const id = crypto.randomUUID();
      audioRef.current = { id, buf };
      const { words, text } = await transcribe(pcm);
      step('listen', { status: 'done', p: 1, note: `${words.length} words` });
      step('design', { status: 'run' });
      await loadFonts();
      if (!words.length) throw new Error('No speech was detected. Lite works with talking-head videos where someone speaks.');
      const auto = detectTheme(text).packId;
      const p: Project = {
        id, name: baseName(file.name), created: Date.now(), updated: Date.now(), fileName: file.name, fileSize: file.size, file, thumb,
        srcDur: info.duration, srcW: info.width, srcH: info.height, words, packId: packChoice, autoPackId: auto,
        capStyle: capChoice as CaptionStyleId | 'auto', aspect, seed: hashStr(file.name + file.size), face, captions: true,
        screen, bg: { type: 'pack' }, cutout: true, textProps: {}, shotEdits: {}, brolls: [],
      };
      await save(p);
      step('design', { status: 'done', p: 1 });
      openProject(p);
    } catch (e: any) {
      setError(e?.message ?? String(e));
    }
  };

  // ---------- editor state ----------
  const basePack = project ? packById(project.packId === 'auto' ? project.autoPackId : project.packId) : PACKS[0];
  const groupPick = project?.group && project.group !== 'auto' ? project.group : null;
  const motifPick = project?.motif && project.motif !== 'auto' ? project.motif : null;
  const hookPick = project?.hookStyle && project.hookStyle !== 'auto' ? project.hookStyle : undefined;
  // A preset is group + palette + motif + captions; the Look card can swap the group or the motif.
  // The Look card's Background can also swap the last layer (colour, gradient or photo); the preset recolours to fit it.
  const canvasBg = project?.canvas;
  const pack = useMemo<Pack>(() => withBase({ ...basePack, group: groupPick ?? basePack.group, motif: motifPick ?? basePack.motif }, canvasBg, canvasPhoto), [basePack, groupPick, motifPick, canvasBg, canvasPhoto]);
  const capStyle: CaptionStyleId = project && project.capStyle !== 'auto' ? project.capStyle : pack.capStyle;
  const edit = useMemo(() => (project ? buildEdit(project.words, project.srcDur, pack, project.seed, { edits: project.shotEdits, cutout: project.cutout !== false, hook: hookPick }) : null), [project?.words, project?.srcDur, project?.seed, pack.id, pack.group, hookPick, project?.shotEdits, project?.cutout]); // eslint-disable-line react-hooks/exhaustive-deps
  const dims = project ? ASPECTS[project.aspect] : ASPECTS['9:16'];
  const look = useMemo(() => ({ capStyle, key: project?.screen.on ? project.screen.key : null, bg: project?.bg, photo, text: project?.textProps, cutout: project?.cutout !== false }), [capStyle, project?.screen, project?.bg, photo, project?.textProps, project?.cutout]);

  // ---------- sound: music bed + effects ----------
  const sound = useMemo(() => soundOf(project?.sound), [project?.sound]);
  const sfxCount = useMemo(() => (edit ? sfxEvents(edit, sound.sfx).length : 0), [edit, sound.sfx]);
  const [bed, setBed] = useState<{ buf: AudioBuffer; gain: number } | null>(null);
  const [soundNote, setSoundNote] = useState('');
  const musicCache = useRef(new Map<string, AudioBuffer>());
  const uploadBuf = async (sr: number) => {
    const m = project?.music;
    if (sound.music !== 'upload' || !m?.blob) return null;
    const k = `${m.name}:${m.blob.size}@${sr}`;
    let b = musicCache.current.get(k);
    if (!b) { b = await decodeMusic(m.blob, sr); musicCache.current.set(k, b); }
    return b;
  };
  // Warm the auto track while the user looks around, so the first play is instant.
  useEffect(() => { if (project && sound.music !== 'off') renderLoop(autoTrack(pack.group), 48000).catch(() => {}); }, [pack.group]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!project || !edit) return;
    if (!soundOn(sound)) { setBed(null); setSoundNote(''); return; }
    let dead = false;
    const id = window.setTimeout(async () => {
      try {
        setSoundNote('Mixing music and effects…');
        const upload = await uploadBuf(48000);
        const res = await buildBed(edit, sound, { sr: 48000, group: pack.group, upload });
        let gain = 1;
        try { const src = await getAudio(); if (src) gain = 1 / voiceGain(src, edit); } catch { /* no voice track */ }
        if (!dead) { setBed(res ? { buf: res.buf, gain } : null); setSoundNote(''); }
      } catch {
        if (!dead) { setBed(null); setSoundNote('Could not mix the sound in this browser. Try Chrome or Edge.'); }
      }
    }, 350);
    return () => { dead = true; clearTimeout(id); };
  }, [edit, sound, pack.group, project?.music]); // eslint-disable-line react-hooks/exhaustive-deps
  const setSound = (p: Partial<SoundSettings>) => upd((pr) => ({ sound: { ...soundOf(pr.sound), ...p } }));
  const pickMusic = async (f: File) => {
    try {
      await decodeMusic(f, 48000);
      upd((pr) => ({ music: { name: f.name, blob: f }, sound: { ...soundOf(pr.sound), music: 'upload' } }));
    } catch { toast('That audio file could not be opened. Try MP3, M4A or WAV.'); }
  };

  const saveTimer = useRef<number>(0);
  const upd = (patch: Partial<Project> | ((p: Project) => Partial<Project>), keepExport = false) => {
    setProject((p) => {
      if (!p) return p;
      const n = { ...p, ...(typeof patch === 'function' ? patch(p) : patch) };
      clearTimeout(saveTimer.current);
      saveTimer.current = window.setTimeout(() => { save(n); }, 500);
      return n;
    });
    if (!keepExport) setExp((e) => (e.running ? e : { p: 0, running: false }));
  };
  const setBg = (bg: Bg) => upd({ bg });
  const setText = (l: LayerId, patch: Partial<TextProps>, keepExport = false) => upd((p) => ({ textProps: { ...(p.textProps ?? {}), [l]: { ...(p.textProps?.[l] ?? {}), ...patch } } }), keepExport);
  const resetText = (l: LayerId, keys?: (keyof TextProps)[]) => upd((p) => {
    const cur = { ...(p.textProps?.[l] ?? {}) } as Record<string, unknown>;
    if (keys) for (const k of keys) delete cur[k]; else for (const k of Object.keys(cur)) delete cur[k];
    return { textProps: { ...(p.textProps ?? {}), [l]: cur as Partial<TextProps> } };
  });
  const shotEdit = (key: string, patch: ShotEdit | null) => upd((p) => {
    const next = { ...(p.shotEdits ?? {}) };
    if (patch && Object.values(patch).some((v) => v != null)) next[key] = patch; else delete next[key];
    return { shotEdits: next };
  });
  const addBroll = async (files: File[]) => {
    const added: BrollAsset[] = [];
    for (const [i, f] of files.entries()) {
      setBusy(`Reading ${i + 1} of ${files.length}: ${f.name}`);
      try { added.push(await makeAsset(f)); } catch (e: any) { toast(e?.message ?? `Could not open ${f.name}`); }
    }
    setBusy('');
    if (added.length) upd((p) => ({ brolls: [...(p.brolls ?? []), ...added] }));
  };
  const removeBroll = (id: string) => upd((p) => {
    const next = { ...(p.shotEdits ?? {}) };
    for (const [k, e] of Object.entries(next)) if (e.broll?.id === id) next[k] = { ...e, layout: e.layout === 'broll' ? undefined : e.layout, broll: undefined };
    return { brolls: (p.brolls ?? []).filter((b) => b.id !== id), shotEdits: next };
  });
  const autoPlace = () => {
    if (!edit || !project?.brolls?.length) return;
    const clips = project.brolls.filter((b) => b.blob);
    let k = 0;
    upd((p) => {
      const next = { ...(p.shotEdits ?? {}) };
      for (const s of edit.shots) {
        if (!s.hint?.pick || s.layout === 'broll' || !clips.length) continue;
        next[s.key] = { ...(next[s.key] ?? {}), layout: 'broll', broll: { id: clips[k++ % clips.length].id, mode: 'full' } };
      }
      return { shotEdits: next };
    });
  };
  const setKey = (k: Partial<Project['screen']['key']>) => project && upd({ screen: { ...project.screen, key: { ...project.screen.key, ...k } } });

  const editCaption = (gi: number, text: string) => {
    if (!project || !edit) return;
    const g = edit.caps[gi];
    const idx = g.words.map((w) => w.i!).filter((i) => i != null);
    if (!idx.length) return;
    const parts = text.trim().split(/\s+/).filter(Boolean);
    const old = idx.map((i) => project.words[i]);
    let repl: Word[];
    if (parts.length === old.length) repl = old.map((w, k) => ({ ...w, w: parts[k] }));
    else {
      const s = old[0].s, e = old[old.length - 1].e;
      const st = (e - s) / Math.max(1, parts.length);
      repl = parts.map((w, k) => ({ w, s: s + k * st, e: s + (k + 1) * st - 0.01 }));
    }
    const words = [...project.words];
    words.splice(idx[0], idx[idx.length - 1] - idx[0] + 1, ...repl);
    upd({ words });
  };

  const getAudio = async () => {
    if (!project?.file) return null;
    if (audioRef.current?.id === project.id) return audioRef.current.buf;
    const buf = await decodeAudio(project.file);
    audioRef.current = { id: project.id, buf };
    return buf;
  };

  const runExport = async () => {
    if (!project?.file || !edit) return;
    const ac = new AbortController();
    abortRef.current = ac;
    setExp({ p: 0, running: true });
    const t0 = performance.now();
    try {
      await loadFonts();
      const audio = await getAudio().catch(() => null);
      const sr = audio?.sampleRate ?? 48000;
      const bedRes = soundOn(sound) ? await buildBed(edit, sound, { sr, group: pack.group, upload: await uploadBuf(sr) }) : null;
      const { blob, codec } = await exportMp4({ file: project.file, edit, pack, W: dims.w, H: dims.h, face: project.face, captions: project.captions, audio, bed: bedRes?.buf ?? null, look, brolls: project.brolls, signal: ac.signal, onProgress: (p) => setExp((e) => ({ ...e, p })) });
      setExp({ p: 1, running: false, blob, codec, secs: (performance.now() - t0) / 1000 });
      download(blob, `${fileSafe(project.name)}_${project.aspect.replace(':', 'x')}.mp4`);
      upd({ exported: Date.now() }, true);
    } catch (e: any) {
      setExp({ p: 0, running: false, err: e?.message === 'cancelled' ? undefined : (e?.message ?? String(e)) });
    }
  };

  const xml = async () => {
    if (!project || !edit) return;
    // Music + effects ride along as one WAV on audio track 2.
    let bedFile: { name: string } | undefined;
    if (soundOn(sound)) {
      try {
        const res = await buildBed(edit, sound, { sr: 48000, group: pack.group, upload: await uploadBuf(48000) });
        if (res) {
          bedFile = { name: `${fileSafe(project.name)}_music_sfx.wav` };
          download(toWav(res.buf), bedFile.name, 'audio/wav');
        }
      } catch { toast('The music track could not be made, so the XML has the voice only.'); }
    }
    download(buildXml({ edit, name: project.name, fileName: project.fileName, srcW: project.srcW, srcH: project.srcH, srcDur: project.srcDur, W: dims.w, H: dims.h, brolls: project.brolls, sound: bedFile }), `${fileSafe(project.name)}_${project.aspect.replace(':', 'x')}.xml`, 'application/xml');
    download(buildSrt(edit), `${fileSafe(project.name)}.srt`, 'text/plain');
  };

  const pickCanvasPhoto = async (f: File) => {
    try {
      const img = await createImageBitmap(f);
      setCanvasPhoto({ img, w: img.width, h: img.height, avg: photoAvg(img) });
      upd({ canvasPhoto: f, canvas: { base: 'photo', dim: project?.canvas?.base === 'photo' ? project.canvas.dim : 0.45 } });
    } catch { toast('That image could not be opened. Try a JPG or PNG.'); }
  };
  const pickBase = (b: BaseBg['base']) => {
    if (!project) return;
    const cur = project.canvas;
    if (b === 'preset') upd({ canvas: { base: 'preset' } });
    else if (b === 'color') upd({ canvas: { base: 'color', color: cur?.base === 'color' ? cur.color : basePack.bg } });
    else if (b === 'gradient') upd({ canvas: { base: 'gradient', id: cur?.base === 'gradient' ? cur.id : lumOf(basePack.bg) < 0.3 ? 'night' : 'paper' } });
    else { upd({ canvas: { base: 'photo', dim: cur?.base === 'photo' ? cur.dim : 0.45 } }); if (!canvasPhoto) canvasPhotoRef.current?.click(); }
  };

  const pickPhoto = async (f: File) => {
    try {
      const img = await createImageBitmap(f);
      setPhoto({ img, w: img.width, h: img.height });
      upd({ photo: f, bg: { type: 'photo', dim: 0.15 } });
    } catch { toast('That image could not be opened. Try a JPG or PNG.'); }
  };

  const relink = (f: File) => {
    if (!project) return;
    if (f.size !== project.fileSize && baseName(f.name) !== baseName(project.fileName)) toast('That looks like a different file — the edit may not line up.');
    const p = { ...project, file: f };
    setProject(p);
    setUrl(URL.createObjectURL(f));
    setStage('editor');
    save(p);
  };

  const autoFace = async () => {
    if (!project?.thumb) return;
    const f = project.screen.on ? await faceFromScreen(project.thumb, project.screen.key.color) : (await findFace(project.thumb)) ?? (await faceFromDetector(project.thumb));
    if (f) upd({ face: f }); else toast('Could not find the face automatically — tap between the eyes instead.');
  };

  const reset = () => { setStage('drop'); setProject(null); setError(''); setExp({ p: 0, running: false }); };

  // ---------- views ----------
  if (stage === 'drop') {
    return (
      <div className="page">
        <div className="page-head">
          <h1 className="h1">Upload your video</h1>
          <DeviceNote />
        </div>
        <p className="lede">Drop a raw talking-head clip. You get captions, pause cuts, punch-ins, splits and motion graphics — styled to your script. Green screen is removed automatically.</p>
        <div
          className={'drop' + (over ? ' over' : '')}
          onDragOver={(e) => { e.preventDefault(); setOver(true); }}
          onDragLeave={() => setOver(false)}
          onDrop={(e) => { e.preventDefault(); setOver(false); const f = e.dataTransfer.files[0]; if (f) processFile(f); }}
        >
          <div>
            <div className="drop-ic"><svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 16V4M6 10l6-6 6 6" /><path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" /></svg></div>
            <h2>Drop your raw video here</h2>
            <p>or pick it from your computer</p>
            <button className="btn btn-o btn-lg" onClick={() => inputRef.current?.click()}>Choose video</button>
            <input ref={inputRef} type="file" accept="video/*,.mov,.mp4,.m4v,.webm,.mkv" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) processFile(f); e.target.value = ''; }} />
            <div className="specs"><span>MP4 · MOV · WebM</span><span>Up to 5 minutes</span><span>One person speaking</span><span>Green screen OK</span></div>
          </div>
        </div>
        {error && <div className="err">{error}</div>}
        <div className="opts">
          <div className="opt">
            <div className="opt-l">Format</div>
            <div className="seg">{(['9:16', '4:5', '16:9'] as Aspect[]).map((a) => <button key={a} className={aspect === a ? 'on' : ''} onClick={() => setAspect(a)}>{a}</button>)}</div>
          </div>
          <div className="opt">
            <div className="opt-l">Preset</div>
            <select className="sel" value={packChoice} onChange={(e) => setPackChoice(e.target.value)}>
              <option value="auto">Auto — match my script</option>
              {GROUPS.map((g) => (
                <optgroup key={g.id} label={g.name}>
                  {PACKS.filter((p) => p.group === g.id).map((p) => <option key={p.id} value={p.id}>{p.subject} — {p.name}</option>)}
                </optgroup>
              ))}
            </select>
          </div>
          <div className="opt">
            <div className="opt-l">Caption template</div>
            <select className="sel" value={capChoice} onChange={(e) => setCapChoice(e.target.value)}>
              <option value="auto">Preset's own captions</option>
              {CAPTION_STYLES.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="opt">
            <div className="opt-l">Spoken language</div>
            <select className="sel" value={lang} onChange={(e) => setLang(e.target.value)}>
              <option value="en">English</option>
              <option value="hi">Hindi</option>
              <option value="es">Spanish</option>
              <option value="fr">French</option>
              <option value="de">German</option>
              <option value="pt">Portuguese</option>
            </select>
          </div>
          <div className="opt">
            <div className="opt-l">Caption accuracy</div>
            <div className="seg">
              <button className={acc === 'fast' ? 'on' : ''} onClick={() => setAcc('fast')}>Fast</button>
              <button className={acc === 'accurate' ? 'on' : ''} onClick={() => setAcc('accurate')}>Accurate</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (stage === 'working') {
    return (
      <div className="page">
        <div className="work">
          <div className="work-top">
            {working?.thumb ? <img className="work-thumb" src={working.thumb} alt="" /> : <div className="work-thumb" />}
            <div><div className="work-name">{working?.name}</div><div className="work-meta">{working?.meta}</div></div>
          </div>
          {STEPS.map((s) => {
            const v = steps[s.key];
            return (
              <div key={s.key} className={'step ' + v.status}>
                <div className="step-ic">{v.status === 'done' ? '✓' : ''}</div>
                <div>
                  <div className="step-t">{s.label}</div>
                  {v.status === 'run' && v.p > 0 && v.p < 1 && <div className="bar"><i style={{ width: `${v.p * 100}%` }} /></div>}
                </div>
                <div className="step-s">{v.note}</div>
              </div>
            );
          })}
          {error && (<><div className="err">{error}</div><div style={{ marginTop: 14 }}><button className="btn btn-g" onClick={reset}>Try another video</button></div></>)}
        </div>
      </div>
    );
  }

  if (stage === 'relink' && project) {
    return (
      <div className="page">
        <div className="work">
          <div className="work-top">
            {project.thumb ? <img className="work-thumb" src={project.thumb} alt="" /> : <div className="work-thumb" />}
            <div><div className="work-name">{project.name}</div><div className="work-meta">The video was removed from browser storage to free space. Your edit is saved.</div></div>
          </div>
          <p className="note">Pick the original file <b>{project.fileName}</b> again to keep editing.</p>
          <div className="row" style={{ marginTop: 14 }}>
            <button className="btn btn-o" onClick={() => relinkRef.current?.click()}>Re-attach video</button>
            <button className="btn btn-g" onClick={reset}>Back</button>
          </div>
          <input ref={relinkRef} type="file" accept="video/*,.mov,.mp4,.m4v,.webm,.mkv" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) relink(f); e.target.value = ''; }} />
        </div>
      </div>
    );
  }

  if (!project || !edit) return null;
  const cur = edit.caps.findIndex((c) => now >= c.outS && now < c.outE);
  const cut = project.srcDur - edit.duration;
  const counts = edit.shots.reduce<Record<string, number>>((a, s) => ((a[s.layout] = (a[s.layout] ?? 0) + 1), a), {});
  const bg = project.bg;

  return (
    <div className="page">
      <div className="ed-head">
        <input className="ed-title" value={project.name} onChange={(e) => upd({ name: e.target.value })} aria-label="Project name" />
        <DeviceNote />
        <button className="btn btn-g btn-sm" onClick={reset}>+ New video</button>
      </div>
      <div className="ed">
        <Player url={url} edit={edit} pack={pack} W={dims.w} H={dims.h} face={project.face} captions={project.captions} look={look}
          brolls={project.brolls ?? []} sel={sel} onSelect={(l) => { setSel(l); if (l) setTab('text'); }} onMove={(l, x, y) => setText(l, { x, y })} onTime={setNow} seekRef={seekRef} bed={bed} />
        <div className="side">
          <div className="card">
            <div className="card-h"><div className="card-t">Export</div><div className="card-n">{fmt(edit.duration)} · {dims.w}×{dims.h}</div></div>
            {exp.running ? (
              <>
                <div className="row" style={{ justifyContent: 'space-between' }}><span>Rendering on your device…</span><b>{Math.round(exp.p * 100)}%</b></div>
                <div className="bar o" style={{ height: 8 }}><i style={{ width: `${exp.p * 100}%` }} /></div>
                <button className="btn btn-g btn-sm w100" style={{ marginTop: 10 }} onClick={() => abortRef.current?.abort()}>Cancel</button>
              </>
            ) : (
              <button className="btn btn-o btn-lg w100" onClick={runExport}>Export MP4</button>
            )}
            {exp.blob && !exp.running && (
              <div className="export-done">
                <div className="note">Done in {exp.secs?.toFixed(0)}s · {(exp.blob.size / 1048576).toFixed(1)} MB · {exp.codec}</div>
                <button className="btn btn-g btn-sm" onClick={() => download(exp.blob!, `${fileSafe(project.name)}_${project.aspect.replace(':', 'x')}.mp4`)}>Download again</button>
              </div>
            )}
            {exp.err && <div className="err">{exp.err}</div>}
            <div className="grid2" style={{ marginTop: 10 }}>
              <button className="btn btn-b btn-sm" onClick={xml} title={soundOn(sound) ? 'Also downloads the music + effects as a WAV on audio track 2' : undefined}>Premiere XML + SRT{soundOn(sound) ? ' + WAV' : ''}</button>
              <button className="btn btn-g btn-sm" onClick={() => download(buildSrt(edit), `${fileSafe(project.name)}.srt`, 'text/plain')}>Captions only</button>
            </div>
          </div>

          <div className="tabs">
            {TABS.map((tb) => <button key={tb.id} className={tab === tb.id ? 'on' : ''} onClick={() => setTab(tb.id)}><Icon name={tb.icon} size={15} />{tb.name}</button>)}
          </div>

          {tab === 'style' && (
            <>
          <div className="card">
            <div className="card-h">
              <div className="card-t">Preset</div>
              <button className="btn btn-g btn-sm" onClick={() => upd({ seed: (project.seed + 7919) >>> 0 })} title="Same look, new edit decisions">↻ Shuffle edit</button>
            </div>
            <div className="chips scroll">
              {GROUPS.map((g) => (
                <div key={g.id} className="chips-g">
                  <div className="chips-h">{g.name}<span>{g.note}</span></div>
                  {PACKS.filter((p) => p.group === g.id).map((p) => (
                    <button key={p.id} className={'chip' + (pack.id === p.id ? ' on' : '')} onClick={() => upd({ packId: p.id })}>
                      <span className="sw" style={{ background: p.bg, color: p.accent, border: `1px solid ${p.bg2}` }}><Icon name={p.icon} size={15} /></span>
                      <span>
                        <div className="chip-n">{p.subject}</div>
                        {project.autoPackId === p.id ? <div className="auto-tag">Matches script</div> : <div className="chip-s">{p.name}</div>}
                      </span>
                    </button>
                  ))}
                </div>
              ))}
            </div>
            <div className="note" style={{ marginTop: 10 }}>
              {Object.entries(counts).map(([k, v]) => `${v} ${LAYOUT_NAMES[k].toLowerCase()}`).join(' · ')}
              {cut > 0.5 && <> · {cut.toFixed(1)}s of pauses removed</>}
            </div>
          </div>
          <div className="card">
            <div className="card-h"><div className="card-t">Look</div><div className="card-n">{groupById(pack.group).name} · {MOTIFS.find((m) => m.id === pack.motif)?.name}</div></div>
            <div className="lk-l">Layout style</div>
            <div className="seg small wrap">
              <button className={!groupPick ? 'on' : ''} onClick={() => upd({ group: 'auto' })} title="Use the preset's own layout style">Auto · {groupById(basePack.group).name}</button>
              {GROUPS.map((g) => <button key={g.id} className={groupPick === g.id ? 'on' : ''} onClick={() => upd({ group: g.id })}>{g.name}</button>)}
            </div>
            <div className="hint">{groupById(pack.group).note}.</div>
            <div className="lk-l">Hook title</div>
            <div className="seg small">
              <button className={!hookPick ? 'on' : ''} onClick={() => upd({ hookStyle: 'auto' })} title="Use the layout style's hook">Auto · {HOOK_NAMES[groupById(pack.group).hook]}</button>
              <button className={hookPick === 'lockup' ? 'on' : ''} onClick={() => upd({ hookStyle: 'lockup' })} title={HOOK_NOTES.lockup}>{HOOK_NAMES.lockup}</button>
              <button className={hookPick === 'lower' ? 'on' : ''} onClick={() => upd({ hookStyle: 'lower' })} title={HOOK_NOTES.lower}>{HOOK_NAMES.lower}</button>
            </div>
            <div className="hint">{HOOK_NOTES[hookPick ?? groupById(pack.group).hook]}.</div>
            <div className="lk-l">Background · last layer</div>
            <div className="seg small">
              {(['preset', 'color', 'gradient', 'photo'] as BaseBg['base'][]).map((b) => (
                <button key={b} className={(canvasBg?.base ?? 'preset') === b ? 'on' : ''} onClick={() => pickBase(b)}>{BASE_NAMES[b]}</button>
              ))}
            </div>
            {canvasBg?.base === 'color' && (
              <div className="swatches">
                {BASE_COLORS.map((c) => <button key={c} className={'swatch' + (canvasBg.color.toUpperCase() === c ? ' on' : '')} style={{ background: c }} onClick={() => upd({ canvas: { base: 'color', color: c } })} aria-label={c} />)}
                <label className="swatch picker" title="Any colour"><input type="color" value={canvasBg.color} onChange={(e) => upd({ canvas: { base: 'color', color: e.target.value } })} />+</label>
              </div>
            )}
            {canvasBg?.base === 'gradient' && (
              <div className="swatches">{BG_GRADIENTS.map((g) => <button key={g.id} title={g.name} className={'swatch big' + (canvasBg.id === g.id ? ' on' : '')} style={{ background: `linear-gradient(${g.angle}deg, ${g.a}, ${g.b})` }} onClick={() => upd({ canvas: { base: 'gradient', id: g.id } })} />)}</div>
            )}
            {canvasBg?.base === 'photo' && (
              <div className="row" style={{ marginTop: 10, flexWrap: 'wrap' }}>
                <button className="btn btn-g btn-sm" onClick={() => canvasPhotoRef.current?.click()}><Icon name="imagePlus" size={15} /> {canvasPhoto ? 'Change photo' : 'Upload photo'}</button>
                {canvasPhoto && <label className="slider">Darken<input type="range" min={0} max={0.8} step={0.05} value={canvasBg.dim} onChange={(e) => upd({ canvas: { base: 'photo', dim: +e.target.value } })} /></label>}
              </div>
            )}
            <input ref={canvasPhotoRef} type="file" accept="image/*" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) pickCanvasPhoto(f); e.target.value = ''; }} />
            <div className="hint">{!canvasBg || canvasBg.base === 'preset' ? 'The preset’s own colour. Pick a colour, gradient or your photo to change it.' : 'Headlines, small type and accents recolour so they stay readable on it.'}</div>
            <div className="lk-l">Design · shapes &amp; pattern</div>
            <div className="cats sm">
              {([{ id: 'all', name: 'All' }, ...MOTIF_CATS] as { id: MotifCat | 'all'; name: string }[]).map((c) => (
                <button key={c.id} className={designCat === c.id ? 'on' : ''} onClick={() => setDesignCat(c.id)}>{c.name} <span>{MOTIFS.filter((m) => m.cat !== 'none' && (c.id === 'all' || m.cat === c.id)).length}</span></button>
              ))}
            </div>
            <div className="motifs">
              <button className={'motif' + (!motifPick ? ' on' : '')} onClick={() => upd({ motif: 'auto' })}><MotifThumb pack={pack} id={basePack.motif} /><span>Preset</span></button>
              <button className={'motif' + (motifPick === 'plain' ? ' on' : '')} onClick={() => upd({ motif: 'plain' })}><MotifThumb pack={pack} id="plain" /><span>None</span></button>
              {MOTIFS.filter((m) => m.cat !== 'none' && (designCat === 'all' || m.cat === designCat)).map((m) => <button key={m.id} className={'motif' + (motifPick === m.id ? ' on' : '')} onClick={() => upd({ motif: m.id })}><MotifThumb pack={pack} id={m.id} /><span>{m.name}</span></button>)}
            </div>
          </div>
          <div className="card">
            <div className="card-h">
              <div className="card-t">Caption template</div>
              <button className={'toggle' + (project.captions ? ' on' : '')} onClick={() => upd({ captions: !project.captions })} aria-label="Captions on/off" />
            </div>
            <div className="capgrid">
              <button className={'capchip' + (project.capStyle === 'auto' ? ' on' : '')} onClick={() => upd({ capStyle: 'auto' })}><b>Preset</b><span>{CAPTION_STYLES.find((c) => c.id === pack.capStyle)?.name}</span></button>
              {CAPTION_STYLES.map((c) => (
                <button key={c.id} className={'capchip' + (project.capStyle === c.id ? ' on' : '')} onClick={() => upd({ capStyle: c.id })} title={c.note}><b>{c.name}</b><span>{c.note}</span></button>
              ))}
            </div>
          </div>
          <div className="card">
            <div className="card-h">
              <div className="card-t row"><Icon name="image" size={16} /> Green screen {project.screen.detected && <span className="tag-b">detected</span>}</div>
              <button className={'toggle' + (project.screen.on ? ' on' : '')} onClick={() => upd({ screen: { ...project.screen, on: !project.screen.on } })} aria-label="Remove green screen" />
            </div>
            {project.screen.on ? (
              <>
                <div className="seg small">
                  {(['pack', 'color', 'gradient', 'pattern', 'photo'] as Bg['type'][]).map((t) => (
                    <button key={t} className={bgTab === t ? 'on' : ''} onClick={() => { setBgTab(t); if (t === 'pack') setBg({ type: 'pack' }); if (t === 'photo' && photo) setBg({ type: 'photo', dim: 0.15 }); }}>{t === 'pack' ? 'Preset' : t[0].toUpperCase() + t.slice(1)}</button>
                  ))}
                </div>
                {bgTab === 'color' && <div className="swatches">{BG_COLORS.map((c) => <button key={c} className={'swatch' + (bg.type === 'color' && bg.value === c ? ' on' : '')} style={{ background: c }} onClick={() => setBg({ type: 'color', value: c })} aria-label={c} />)}<label className="swatch picker"><input type="color" onChange={(e) => setBg({ type: 'color', value: e.target.value })} />+</label></div>}
                {bgTab === 'gradient' && <div className="swatches">{BG_GRADIENTS.map((g) => <button key={g.id} title={g.name} className={'swatch big' + (bg.type === 'gradient' && bg.id === g.id ? ' on' : '')} style={{ background: `linear-gradient(${g.angle}deg, ${g.a}, ${g.b})` }} onClick={() => setBg({ type: 'gradient', id: g.id })} />)}</div>}
                {bgTab === 'pattern' && (
                  <>
                    <div className="patterns">{BG_PATTERNS.map((pt) => <button key={pt.id} className={'capchip' + (bg.type === 'pattern' && bg.id === pt.id ? ' on' : '')} onClick={() => setBg({ type: 'pattern', id: pt.id, color: bg.type === 'pattern' ? bg.color : pack.bg })}><b>{pt.name}</b></button>)}</div>
                    <div className="swatches">{BG_COLORS.slice(0, 8).map((c) => <button key={c} className={'swatch' + (bg.type === 'pattern' && bg.color === c ? ' on' : '')} style={{ background: c }} onClick={() => setBg({ type: 'pattern', id: bg.type === 'pattern' ? bg.id : 'grid', color: c })} />)}</div>
                  </>
                )}
                {bgTab === 'photo' && (
                  <div className="row" style={{ marginTop: 10, flexWrap: 'wrap' }}>
                    <button className="btn btn-g btn-sm" onClick={() => photoRef.current?.click()}><Icon name="camera" size={15} /> {photo ? 'Change photo' : 'Upload photo'}</button>
                    {bg.type === 'photo' && <label className="slider">Darken<input type="range" min={0} max={0.7} step={0.05} value={bg.dim} onChange={(e) => setBg({ type: 'photo', dim: +e.target.value })} /></label>}
                    <input ref={photoRef} type="file" accept="image/*" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) pickPhoto(f); e.target.value = ''; }} />
                  </div>
                )}
                <div className="sliders">
                  <label className="slider">Key strength<input type="range" min={0.1} max={0.9} step={0.02} value={project.screen.key.similarity} onChange={(e) => setKey({ similarity: +e.target.value })} /></label>
                  <label className="slider">Edge softness<input type="range" min={0.02} max={0.25} step={0.01} value={project.screen.key.smoothness} onChange={(e) => setKey({ smoothness: +e.target.value })} /></label>
                </div>
              </>
            ) : <div className="hint">Shot on green or blue? Turn this on to swap the background for a colour, gradient, pattern or your own photo.</div>}
          </div>
          <div className="card">
            <div className="card-h">
              <div className="card-t row"><Icon name="layers" size={16} /> Subject cut-out</div>
              <button className={'toggle' + (project.cutout !== false ? ' on' : '')} onClick={() => upd({ cutout: !(project.cutout !== false) })} aria-label="Subject cut-out" />
            </div>
            <div className="hint">{project.cutout === false ? 'Off. Turn on for a giant word behind the speaker, frame breaks and sticker shots.' : project.screen.on ? 'Uses your green-screen key for the cut-out.' : seg === 'loading' ? 'Loading the subject cut-out model (about 16 MB, first time only)…' : seg === 'failed' ? 'Subject cut-out could not load in this browser, so those shots fall back to plain frames. Try Chrome or Edge.' : 'Cuts out the speaker in your browser: text behind the head, frame breaks and stickers.'}</div>
          </div>
          <div className="card">
            <div className="card-h"><div className="card-t">Format</div></div>
            <div className="seg">{(['9:16', '4:5', '16:9'] as Aspect[]).map((a) => <button key={a} className={project.aspect === a ? 'on' : ''} onClick={() => upd({ aspect: a })}>{a}</button>)}</div>
          </div>
          <div className="card">
            <div className="card-h"><div className="card-t">Framing</div><button className="btn btn-g btn-sm" onClick={autoFace}><Icon name="target" size={14} /> Auto-find face</button></div>
            {project.thumb && (
              <div className="frame-pick" onClick={(e) => { const r = e.currentTarget.getBoundingClientRect(); upd({ face: { x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height } }); }}>
                <img src={project.thumb} alt="Source frame" />
                <div className="frame-dot" style={{ left: `${project.face.x * 100}%`, top: `${project.face.y * 100}%` }} />
              </div>
            )}
            <div className="hint">Tap <b>between the eyes</b>. Circle, punch-ins and splits keep that point centred.</div>
          </div>
            </>
          )}

          {tab === 'text' && (
            <div className="card">
              <TextPanel pack={pack} W={dims.w} H={dims.h} capStyle={capStyle} text={project.textProps ?? {}} sel={sel ?? 'hook'} onSel={setSel} onChange={(l, patch) => setText(l, patch)} onReset={resetText} />
            </div>
          )}

          {tab === 'shots' && (
            <div className="card">
              <div className="card-h"><div className="card-t">Shots</div><div className="card-n">{edit.shots.length} shots</div></div>
              <ShotsPanel edit={edit} edits={project.shotEdits ?? {}} brolls={project.brolls ?? []} now={now} onEdit={shotEdit} onSeek={(t) => seekRef.current?.(t)} segNote={project.cutout !== false && !project.screen.on && seg === 'loading' ? 'Loading subject cut-out…' : ''} cutout={project.cutout !== false} />
            </div>
          )}

          {tab === 'broll' && (
            <div className="card">
              <BrollPanel edit={edit} edits={project.shotEdits ?? {}} brolls={project.brolls ?? []} busy={busy} onAdd={addBroll} onRemove={removeBroll} onEdit={shotEdit} onAuto={autoPlace} onSeek={(t) => seekRef.current?.(t)} />
            </div>
          )}

          {tab === 'sound' && (
            <SoundPanel s={sound} set={setSound} group={pack.group} groupName={groupById(pack.group).name} events={sfxCount}
              upload={project.music?.blob ? { name: project.music.name } : null} onUpload={pickMusic}
              onClearUpload={() => upd((pr) => ({ music: undefined, sound: { ...soundOf(pr.sound), music: soundOf(pr.sound).music === 'upload' ? 'auto' : soundOf(pr.sound).music } }))}
              status={soundNote} />
          )}
          {tab === 'captions' && (
            <>
          <div className="card">
            <div className="card-h"><div className="card-t">Caption text</div><div className="card-n">{edit.caps.length} lines</div></div>
            <div className="caps">
              {edit.caps.map((c, i) => (
                <div key={i + ':' + c.words.map((w) => w.w).join(' ')} className={'cap' + (i === cur ? ' now' : '')}>
                  <span onClick={() => seekRef.current?.(c.outS)}>{fmt(c.outS)}</span>
                  <input defaultValue={c.words.map((w) => w.w.trim()).join(' ')} onFocus={() => seekRef.current?.(c.outS + 0.01)} onBlur={(e) => { if (e.target.value !== e.target.defaultValue) editCaption(i, e.target.value); }} onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }} />
                </div>
              ))}
            </div>
            <div className="hint">Fix any word, press Enter. Timing stays synced.</div>
          </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
