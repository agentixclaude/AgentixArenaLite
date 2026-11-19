import { useEffect, useRef, useState } from 'react';
import type { Edit } from '../lib/style';
import { outToSrc, usesCutout } from '../lib/style';
import type { Pack } from '../lib/packs';
import { renderFrame, type Face, type RenderOpts } from '../lib/render';
import { sharedKeyer } from '../lib/keyer';
import { resolveText, type Hit, type LayerId } from '../lib/text';
import { loadSegmenter } from '../lib/segment';
import { load3D } from '../lib/three3d';
import { BrollPreview, type BrollAsset } from '../lib/broll';
import { audioCtx } from '../lib/sound';

const LAYOUT_COLORS: Record<string, string> = {
  full: '#6b655c', punch: '#a39a8c', behind: '#c9a227', split: '#4f7df3', card: '#d97757', circle: '#7fbf8e', broll: '#b08bd8',
  arch: '#e2b07a', polaroid: '#ece6da', band: '#5bb3b0', duotone: '#e0607e', frame: '#9aa7ff', sticker: '#f2d14b',
};
export const LAYOUT_NAMES: Record<string, string> = {
  full: 'Talking head', punch: 'Punch-in', behind: 'Text behind', split: 'Split', card: 'Full graphic', circle: 'Circle', broll: 'B-roll',
  arch: 'Arch window', polaroid: 'Polaroid', band: 'Cinema band', duotone: 'Duotone poster', frame: 'Frame break', sticker: 'Sticker',
};

type Look = Pick<RenderOpts, 'capStyle' | 'key' | 'bg' | 'photo' | 'text' | 'cutout' | 'motion' | 'textLayer'>;
interface Props {
  url: string; edit: Edit; pack: Pack; W: number; H: number; face: Face; captions: boolean; look: Look;
  brolls: BrollAsset[]; sel: LayerId | null; onSelect: (l: LayerId | null) => void; onMove: (l: LayerId, x: number, y: number) => void;
  onTime?: (t: number) => void; seekRef?: React.MutableRefObject<((t: number) => void) | null>;
  /** Music + effects in output time; gain matches the export's voice normalization. */
  bed?: { buf: AudioBuffer; gain: number } | null;
}

const fmt = (t: number) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;

export default function Player({ url, edit, pack, W, H, face, captions, look, brolls, sel, onSelect, onMove, onTime, seekRef, bed }: Props) {
  const cv = useRef<HTMLCanvasElement>(null);
  const vid = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [t, setT] = useState(0);
  const [hover, setHover] = useState(false);
  const st = useRef({ t: 0, seg: 0, playing: false, frame: 0 });
  const props = useRef({ edit, pack, W, H, face, captions, look, sel });
  props.current = { edit, pack, W, H, face, captions, look, sel };
  const hits = useRef<Hit[]>([]);
  const bp = useRef<BrollPreview | null>(null);
  const drag = useRef<{ id: LayerId; sx: number; sy: number; ox: number; oy: number; moved: boolean } | null>(null);
  const PS = 0.5;

  // ---- music + effects bed, played in output time next to the video's own audio
  const bedRef = useRef(bed);
  bedRef.current = bed;
  const au = useRef<{ src: AudioBufferSourceNode | null; g: GainNode | null; c0: number; t0: number }>({ src: null, g: null, c0: 0, t0: 0 });
  const stopBed = () => {
    const { src, g } = au.current;
    if (src && g) {
      const ac = audioCtx();
      g.gain.setTargetAtTime(0, ac.currentTime, 0.015);
      try { src.stop(ac.currentTime + 0.08); } catch { /* already stopped */ }
    }
    au.current = { src: null, g: null, c0: 0, t0: 0 };
  };
  const startBed = (tt: number) => {
    stopBed();
    const b = bedRef.current;
    if (!b || tt >= b.buf.duration - 0.05) return;
    const ac = audioCtx();
    if (ac.state !== 'running') ac.resume();
    const src = ac.createBufferSource();
    src.buffer = b.buf;
    const g = ac.createGain();
    const at = ac.currentTime + 0.03;
    g.gain.setValueAtTime(0, at);
    g.gain.linearRampToValueAtTime(b.gain, at + 0.03);
    src.connect(g).connect(ac.destination);
    src.start(at, Math.max(0, tt));
    au.current = { src, g, c0: at, t0: Math.max(0, tt) };
  };
  useEffect(() => () => stopBed(), []); // eslint-disable-line react-hooks/exhaustive-deps
  // New mix (settings or edit changed) while playing: swap it in at the current time.
  useEffect(() => { if (st.current.playing) startBed(st.current.t); else stopBed(); }, [bed]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { bp.current = new BrollPreview(); return () => bp.current?.dispose(); }, []);
  useEffect(() => { bp.current?.sync(brolls); }, [brolls]);
  useEffect(() => {
    if (look.cutout && !look.key && usesCutout(edit)) loadSegmenter();
    if (edit.shots.some((s) => s.layout === 'card' && s.card === 'object3d')) load3D();
  }, [edit, look.cutout, look.key]);

  const draw = () => {
    const c = cv.current, v = vid.current;
    if (!c || !v) return;
    const p = props.current;
    const ctx = c.getContext('2d', { alpha: false })!;
    const ready = v.readyState >= 2 && v.videoWidth > 0;
    const cw = Math.round(p.W * PS), ch = Math.round(p.H * PS);
    const hs: Hit[] = [];
    const s = st.current;
    const si = p.edit.shots.findIndex((x) => s.t >= x.outS && s.t < x.outE);
    const sh = p.edit.shots[si];
    bp.current?.pauseExcept(sh?.layout === 'broll' ? sh.broll?.id ?? null : null);
    renderFrame(ctx, cw, ch, ready ? { img: v, w: v.videoWidth, h: v.videoHeight } : null, p.edit, p.pack, {
      ...p.look, keyer: p.look.key ? sharedKeyer() : null, face: p.face, captions: p.captions, t: s.t, frameIdx: s.frame++,
      srcT: v.currentTime, hits: hs, sel: p.sel, broll: (id, lt) => bp.current?.frame(id, lt, s.playing) ?? null,
    });
    hits.current = hs;
  };

  const segAt = (tt: number) => { const sg = props.current.edit.segs; let i = sg.findIndex((g) => tt < g.outE); if (i < 0) i = sg.length - 1; return Math.max(0, i); };

  const seek = (tt: number) => {
    const v = vid.current; if (!v) return;
    tt = Math.max(0, Math.min(props.current.edit.duration - 0.01, tt));
    st.current.t = tt; st.current.seg = segAt(tt);
    setT(tt); onTime?.(tt);
    v.currentTime = outToSrc(props.current.edit.segs, tt);
    if (st.current.playing) startBed(tt);
  };
  if (seekRef) seekRef.current = seek;

  useEffect(() => {
    let raf = 0;
    const loop = () => {
      const v = vid.current; const s = st.current; const segs = props.current.edit.segs;
      if (v && s.playing && segs.length) {
        let g = segs[s.seg];
        if (v.currentTime >= g.srcE - 0.03) {
          if (s.seg + 1 < segs.length) { s.seg++; g = segs[s.seg]; v.currentTime = g.srcS; }
          else { s.playing = false; v.pause(); setPlaying(false); stopBed(); }
        }
        const nt = g.outS + Math.max(0, Math.min(g.srcE, v.currentTime) - g.srcS);
        if (!v.seeking) {
          s.t = Math.min(nt, props.current.edit.duration); setT(s.t); onTime?.(s.t);
          // keep the bed locked to the picture: re-sync if it drifts (segment jumps, slow seeks)
          const a = au.current;
          if (s.playing && bedRef.current && audioCtx().state === 'running') {
            const pos = a.src ? a.t0 + (audioCtx().currentTime - a.c0) : -1;
            if (!a.src || Math.abs(pos - s.t) > 0.2) startBed(s.t);
          }
        }
      }
      draw();
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { st.current.seg = segAt(st.current.t); if (!st.current.playing) seek(Math.min(st.current.t, edit.duration - 0.01)); }, [edit]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggle = async () => {
    const v = vid.current; if (!v) return;
    const s = st.current;
    if (s.playing) { s.playing = false; v.pause(); setPlaying(false); stopBed(); return; }
    if (s.t >= edit.duration - 0.05) seek(0);
    s.seg = segAt(s.t);
    v.currentTime = outToSrc(edit.segs, s.t);
    s.playing = true; setPlaying(true);
    if (bedRef.current) audioCtx().resume();
    try { await v.play(); startBed(s.t); } catch { s.playing = false; setPlaying(false); stopBed(); }
  };

  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (e.code === 'Space' && tag !== 'INPUT' && tag !== 'TEXTAREA' && tag !== 'SELECT') { e.preventDefault(); toggle(); }
      if (e.code === 'Escape') onSelect(null);
    };
    addEventListener('keydown', k); return () => removeEventListener('keydown', k);
  });

  const scrubTo = (e: React.PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    seek(((e.clientX - r.left) / r.width) * edit.duration);
  };

  // Canvas coordinates of a pointer event.
  const at = (e: React.PointerEvent) => {
    const c = cv.current!;
    const r = c.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * c.width, y: ((e.clientY - r.top) / r.height) * c.height, cw: c.width, ch: c.height };
  };
  const hitAt = (x: number, y: number) => [...hits.current].reverse().find((h) => x >= h.x - 10 && x <= h.x + h.w + 10 && y >= h.y - 10 && y <= h.y + h.h + 10);

  const down = (e: React.PointerEvent<HTMLDivElement>) => {
    const p = at(e);
    const h = hitAt(p.x, p.y);
    e.currentTarget.setPointerCapture(e.pointerId);
    if (!h) { drag.current = null; return; }
    const tp = resolveText(h.id, pack, W, H, look.capStyle, look.text);
    const oy = h.id === 'behind' && tp.y < 0 ? (h.y + h.h / 2) / p.ch : h.ay != null ? h.ay / p.ch : tp.y;
    const ox = h.ax != null ? h.ax / p.cw : tp.x;
    drag.current = { id: h.id, sx: p.x, sy: p.y, ox, oy, moved: false };
    onSelect(h.id);
  };
  const move = (e: React.PointerEvent<HTMLDivElement>) => {
    const p = at(e);
    if (!drag.current) { setHover(!!hitAt(p.x, p.y)); return; }
    const d = drag.current;
    const dx = (p.x - d.sx) / p.cw, dy = (p.y - d.sy) / p.ch;
    if (!d.moved && Math.hypot(p.x - d.sx, p.y - d.sy) < 3) return;
    d.moved = true;
    const snap = (v: number, to: number) => (Math.abs(v - to) < 0.012 ? to : v);
    onMove(d.id, Math.min(0.98, Math.max(0.02, snap(d.ox + dx, 0.5))), Math.min(0.98, Math.max(0.02, d.oy + dy)));
  };
  const up = () => {
    const d = drag.current;
    drag.current = null;
    if (!d) { onSelect(null); toggle(); }
  };

  const maxH = typeof window !== 'undefined' ? Math.min(window.innerHeight - 230, 760) : 700;
  const dispH = W > H ? Math.min(maxH, 560 * H / W) : maxH;
  const dispW = dispH * W / H;

  return (
    <div className="stage">
      <div className="screen" style={{ width: dispW, height: dispH, cursor: hover ? 'move' : 'pointer' }} onPointerDown={down} onPointerMove={move} onPointerUp={up}>
        <canvas ref={cv} width={Math.round(W * PS)} height={Math.round(H * PS)} />
      </div>
      <video ref={vid} src={url} playsInline preload="auto" style={{ display: 'none' }} onLoadedData={() => seek(st.current.t)} onSeeked={draw} />
      <div className="tport">
        <button className="play" onClick={toggle} aria-label={playing ? 'Pause' : 'Play'}>
          {playing ? <svg width="16" height="16" viewBox="0 0 16 16"><rect x="3" y="2" width="4" height="12" rx="1" fill="currentColor" /><rect x="9" y="2" width="4" height="12" rx="1" fill="currentColor" /></svg>
            : <svg width="16" height="16" viewBox="0 0 16 16"><path d="M4 2.5v11l9.5-5.5z" fill="currentColor" /></svg>}
        </button>
        <div className="scrub" onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); scrubTo(e); }} onPointerMove={(e) => { if (e.buttons) scrubTo(e); }}>
          <div className="scrub-track">
            {edit.shots.map((s, i) => <i key={i} style={{ width: `${((s.outE - s.outS) / edit.duration) * 100}%`, background: LAYOUT_COLORS[s.layout], opacity: 0.85, borderRight: '1px solid #0d0c0b' }} />)}
          </div>
          <div className="scrub-head" style={{ left: `${(t / Math.max(0.01, edit.duration)) * 100}%` }} />
        </div>
        <div className="time">{fmt(t)} / {fmt(edit.duration)}</div>
      </div>
      <div className="legend">{Object.keys(LAYOUT_COLORS).filter((k) => edit.shots.some((s) => s.layout === k)).map((k) => <span key={k}><b style={{ background: LAYOUT_COLORS[k] }} />{LAYOUT_NAMES[k]}</span>)}</div>
      <div className="hint" style={{ marginTop: 0 }}>Click any text on the video to select it, drag to move it.</div>
    </div>
  );
}
