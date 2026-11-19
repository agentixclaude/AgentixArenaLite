import { visualFor, drawVisual, lightLeak, vignette } from './scenes';
import { layerFor, drawGraphicsCaption, drawTypography, greatInOut, type MotionQuality, type TextLayer } from './motion';
// One renderer for preview AND export, so they always match.
// Layer order (graphics rules): theme bg → B-roll → A-roll → cut-out → fade overlay → text → captions.
import type { Pack, Bg, CaptionStyleId } from './packs';
import { BG_GRADIENTS } from './packs';
import type { Edit, Shot, MG } from './style';
import { drawCaption } from './captions';
import type { Keyer, KeySettings } from './keyer';
import { clamp01, lerp, outExpo, inOut, perceptualScale } from './ease';
import { resolveText, setText, resetTracking, caseText, layWords, placed, drawSelection, hexA, lum, lift, type Hit, type LayerId, type TextOverrides, type TextProps } from './text';
import { drawMG, decor, fadeBlurWords, type Typo } from './mg';
import { drawCard } from './cards';
import { personMask, segState } from './segment';
import { drawMotif } from './motifs';
import { groupById, type LockupFonts } from './looks';
import { drawLockup, lockupOf, measureLockup, type LockupText } from './kinetic';
import { hashStr } from './style';
import { popIn } from './ease';

export interface Face { x: number; y: number }
export interface FrameSrc { img: CanvasImageSource; w: number; h: number }
type Rect = { x: number; y: number; w: number; h: number };
interface Win extends Rect { rt: number; rb: number; rot: number; zoom: number; ax: number; ay: number }

const MORPH = 0.55;
const EXIT = 0.34;

let grainCanvas: HTMLCanvasElement | null = null;
function grain() {
  if (grainCanvas) return grainCanvas;
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d')!;
  const d = g.createImageData(256, 256);
  for (let i = 0; i < d.data.length; i += 4) { const v = 128 + (Math.random() - 0.5) * 255; d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 255; }
  g.putImageData(d, 0, 0);
  return (grainCanvas = c);
}

function coverXf(src: FrameSrc, r: Rect, face: Face, zoom: number, ax: number, ay: number) {
  const s = Math.max(r.w / src.w, r.h / src.h) * zoom;
  const dw = src.w * s, dh = src.h * s;
  let dx = r.x + r.w * ax - face.x * dw;
  let dy = r.y + r.h * ay - face.y * dh;
  dx = Math.min(r.x, Math.max(r.x + r.w - dw, dx));
  dy = Math.min(r.y, Math.max(r.y + r.h - dh, dy));
  return { dx, dy, dw, dh };
}
function drawCover(ctx: CanvasRenderingContext2D, src: FrameSrc, r: Rect, face: Face, zoom: number, ax = 0.5, ay = 0.42) {
  const x = coverXf(src, r, face, zoom, ax, ay);
  ctx.save();
  ctx.beginPath(); ctx.rect(r.x, r.y, r.w, r.h); ctx.clip();
  ctx.drawImage(src.img, x.dx, x.dy, x.dw, x.dh);
  ctx.restore();
  return x;
}

export function drawBg(ctx: CanvasRenderingContext2D, r: Rect, bg: Bg, pack: Pack, t: number, photo: CanvasImageSource | null, photoSize?: { w: number; h: number }, k = Math.max(r.w, r.h) / 1920) {
  ctx.save();
  ctx.beginPath(); ctx.rect(r.x, r.y, r.w, r.h); ctx.clip();
  const u = Math.max(r.w, r.h) / 1920;
  switch (bg.type) {
    case 'color': ctx.fillStyle = bg.value; ctx.fillRect(r.x, r.y, r.w, r.h); break;
    case 'gradient': {
      const gp = BG_GRADIENTS.find((x) => x.id === bg.id) ?? BG_GRADIENTS[0];
      const a = (gp.angle * Math.PI) / 180, cx = r.x + r.w / 2, cy = r.y + r.h / 2, L = Math.hypot(r.w, r.h) / 2;
      const gr = ctx.createLinearGradient(cx - Math.sin(a) * L, cy + Math.cos(a) * L, cx + Math.sin(a) * L, cy - Math.cos(a) * L);
      gr.addColorStop(0, gp.a); gr.addColorStop(1, gp.b);
      ctx.fillStyle = gr; ctx.fillRect(r.x, r.y, r.w, r.h);
      break;
    }
    case 'pattern': {
      ctx.fillStyle = bg.color; ctx.fillRect(r.x, r.y, r.w, r.h);
      const light = parseInt(bg.color.slice(1, 3), 16) + parseInt(bg.color.slice(3, 5), 16) + parseInt(bg.color.slice(5, 7), 16) > 380;
      ctx.strokeStyle = ctx.fillStyle = light ? 'rgba(0,0,0,0.09)' : 'rgba(255,255,255,0.08)';
      ctx.lineWidth = 2 * u;
      const step = 72 * u, drift = (t * 12 * u) % step;
      if (bg.id === 'grid' || bg.id === 'lines') {
        ctx.beginPath();
        for (let y = r.y - step + drift; y < r.y + r.h; y += step) { ctx.moveTo(r.x, y); ctx.lineTo(r.x + r.w, y); }
        if (bg.id === 'grid') for (let x = r.x - step + drift; x < r.x + r.w; x += step) { ctx.moveTo(x, r.y); ctx.lineTo(x, r.y + r.h); }
        ctx.stroke();
      } else if (bg.id === 'dots') {
        for (let y = r.y - step + drift; y < r.y + r.h + step; y += step / 1.5) for (let x = r.x; x < r.x + r.w + step; x += step / 1.5) { ctx.beginPath(); ctx.arc(x, y, 3.2 * u, 0, Math.PI * 2); ctx.fill(); }
      } else if (bg.id === 'checker') {
        const s2 = step * 1.4;
        for (let y = r.y - s2 + (drift * 1.4) % s2, yi = 0; y < r.y + r.h; y += s2, yi++) for (let x = r.x, xi = 0; x < r.x + r.w; x += s2, xi++) if ((xi + yi) % 2 === 0) ctx.fillRect(x, y, s2, s2);
      } else if (bg.id === 'rings') {
        const cx = r.x + r.w * 0.5, cy = r.y + r.h * 0.42;
        for (let rad = (drift * 2) % (step * 1.2); rad < Math.hypot(r.w, r.h); rad += step * 1.2) { ctx.beginPath(); ctx.arc(cx, cy, rad, 0, Math.PI * 2); ctx.stroke(); }
      } else {
        ctx.beginPath();
        for (let x = r.x - r.h + drift; x < r.x + r.w; x += step * 0.7) { ctx.moveTo(x, r.y + r.h); ctx.lineTo(x + r.h, r.y); }
        ctx.stroke();
      }
      break;
    }
    case 'photo': {
      if (photo && photoSize) {
        drawCover(ctx, { img: photo, w: photoSize.w, h: photoSize.h }, r, { x: 0.5, y: 0.5 }, 1.04 + Math.sin(t * 0.15) * 0.02, 0.5, 0.5);
        if (bg.dim > 0) { ctx.fillStyle = `rgba(0,0,0,${bg.dim})`; ctx.fillRect(r.x, r.y, r.w, r.h); }
      } else { ctx.fillStyle = pack.bg; ctx.fillRect(r.x, r.y, r.w, r.h); }
      break;
    }
    default:
      // Every preset has its own background design (shapes + pattern) in its own colours.
      drawMotif(ctx, r, pack, t, k);
  }
  ctx.restore();
}

interface Geo { full: Rect; split: { panel: Rect; spk: Rect }; circle: { c: { x: number; y: number }; r: number; content: Rect }; safe: Rect; capY: number; capSize: number }
function geo(W: number, H: number): Geo {
  const full = { x: 0, y: 0, w: W, h: H };
  const m = Math.round(Math.min(W, H) * 0.07);
  if (W > H) {
    return {
      full,
      split: { panel: { x: 0, y: 0, w: W * 0.5, h: H }, spk: { x: W * 0.5, y: 0, w: W * 0.5, h: H } },
      circle: { c: { x: W * 0.72, y: H * 0.47 }, r: H * 0.34, content: { x: m, y: m + H * 0.04, w: W * 0.44, h: H - 2 * m - H * 0.04 } },
      safe: { x: m, y: m, w: W - 2 * m, h: H - 2 * m },
      capY: H * 0.86, capSize: 46,
    };
  }
  const tall = H / W > 1.5;
  const split = tall ? 0.5 : 0.46;
  return {
    full,
    split: { panel: { x: 0, y: 0, w: W, h: H * split }, spk: { x: 0, y: H * split, w: W, h: H * (1 - split) } },
    circle: tall
      ? { c: { x: W * 0.5, y: H * 0.57 }, r: W * 0.31, content: { x: m, y: H * 0.115, w: W - 2 * m, h: H * 0.235 } }
      : { c: { x: W * 0.5, y: H * 0.6 }, r: W * 0.25, content: { x: m, y: H * 0.1, w: W - 2 * m, h: H * 0.22 } },
    safe: { x: m, y: tall ? H * 0.1 : m, w: W - 2 * m, h: H - 2 * m },
    capY: tall ? H * 0.785 : H * 0.85,
    capSize: tall ? 58 : 50,
  };
}

// ---- Extra layouts: arch window, polaroid, cinema band, frame break, sticker. ----
interface XGeo {
  u: number; k: number; wide: boolean; tall: boolean;
  arch: { win: Rect; text: Rect };
  pola: { win: Rect; pad: number; bot: number; text: Rect; capY: number };
  band: { win: Rect; text: Rect };
  frame: { win: Rect; text: Rect };
  sticker: { s: number; dx: number; text: Rect };
}
function xgeo(W: number, H: number): XGeo {
  const wide = W > H, tall = H / W > 1.5;
  const m = Math.round(Math.min(W, H) * 0.07);
  const u = W / 1080, k = Math.min(W, H) / 1080;
  if (wide) {
    const text = { x: m, y: H * 0.16, w: W * 0.46, h: H * 0.62 };
    const pw = H * 0.5, ph = pw * 1.1, pad = H * 0.026, bot = H * 0.1;
    return {
      u, k, wide, tall,
      arch: { win: { x: W * 0.58, y: H * 0.12, w: W * 0.34, h: H * 0.92 }, text },
      pola: { win: { x: W * 0.74 - pw / 2, y: H * 0.1 + pad, w: pw, h: ph }, pad, bot, text, capY: H * 0.9 },
      band: { win: { x: 0, y: H * 0.3, w: W, h: H * 0.44 }, text: { x: m, y: H * 0.035, w: W - 2 * m, h: H * 0.24 } },
      frame: { win: { x: W * 0.56, y: H * 0.3, w: W * 0.38, h: H * 0.62 }, text },
      sticker: { s: 0.86, dx: 0, text },
    };
  }
  if (tall) {
    const text = { x: m, y: H * 0.07, w: W - 2 * m, h: H * 0.2 };
    const pw = W * 0.66, ph = pw * 1.08, pad = W * 0.034, bot = W * 0.15;
    const py = H * 0.3 + pad;
    return {
      u, k, wide, tall,
      arch: { win: { x: W * 0.1, y: H * 0.4, w: W * 0.8, h: H * 0.62 }, text: { x: m, y: H * 0.075, w: W - 2 * m, h: H * 0.28 } },
      pola: { win: { x: (W - pw) / 2, y: py, w: pw, h: ph }, pad, bot, text, capY: Math.min(H * 0.9, py + ph + bot + H * 0.052) },
      band: { win: { x: 0, y: H * 0.35, w: W, h: H * 0.34 }, text: { x: m, y: H * 0.08, w: W - 2 * m, h: H * 0.25 } },
      frame: { win: { x: W * 0.08, y: H * 0.4, w: W * 0.84, h: H * 0.5 }, text },
      sticker: { s: 0.86, dx: 0, text },
    };
  }
  const text = { x: m, y: H * 0.06, w: W - 2 * m, h: H * 0.21 };
  const pw = W * 0.5, ph = pw * 1.08, pad = W * 0.03, bot = W * 0.11;
  const py = H * 0.3 + pad;
  return {
    u, k, wide, tall,
    arch: { win: { x: W * 0.18, y: H * 0.36, w: W * 0.64, h: H * 0.68 }, text: { x: m, y: H * 0.06, w: W - 2 * m, h: H * 0.27 } },
    pola: { win: { x: (W - pw) / 2, y: py, w: pw, h: ph }, pad, bot, text, capY: Math.min(H * 0.93, py + ph + bot + H * 0.06) },
    band: { win: { x: 0, y: H * 0.36, w: W, h: H * 0.37 }, text: { x: m, y: H * 0.07, w: W - 2 * m, h: H * 0.26 } },
    frame: { win: { x: W * 0.12, y: H * 0.4, w: W * 0.76, h: H * 0.53 }, text },
    sticker: { s: 0.82, dx: 0, text },
  };
}

// ---- Speaker window: every layout is a rounded rect (per-corner radius + tilt), so any layout
// morphs straight into the next. ----
type Shape = 'full' | 'split' | 'circle' | 'cut' | 'arch' | 'pola' | 'band' | 'frame';
const shapeOf = (s: Shot): Shape => {
  switch (s.layout) {
    case 'split': return 'split';
    case 'circle': return 'circle';
    case 'arch': return 'arch';
    case 'polaroid': return 'pola';
    case 'band': return 'band';
    case 'frame': return 'frame';
    case 'sticker': return 'cut';
    case 'broll': return s.broll?.mode === 'split' ? 'split' : 'cut';
    default: return 'full';
  }
};
const BG_LAYOUTS = new Set(['split', 'circle', 'arch', 'polaroid', 'band', 'frame', 'sticker']);
const hasBg = (s: Shot) => BG_LAYOUTS.has(s.layout);
const polaRot = (s: Shot) => (hashStr(s.key) % 2 ? 1 : -1) * 0.045;
function winFor(s: Shot, g: Geo, X: XGeo, landscapeSrc: boolean, lt: number, dur: number, cutOK: boolean, fit?: { w: number; h: number; face: Face }): Win {
  const flat = { rt: 0, rb: 0, rot: 0 };
  switch (shapeOf(s)) {
    case 'split': return { ...g.split.spk, ...flat, zoom: 1, ax: 0.5, ay: 0.42 };
    case 'circle': { const R = g.circle.r; return { x: g.circle.c.x - R, y: g.circle.c.y - R, w: 2 * R, h: 2 * R, rt: R, rb: R, rot: 0, zoom: landscapeSrc ? 2.1 : 1.45, ax: 0.5, ay: 0.5 }; }
    case 'arch': return { ...X.arch.win, rt: X.arch.win.w / 2, rb: 0, rot: 0, zoom: landscapeSrc ? 1.15 : 1, ax: 0.5, ay: 0.3 };
    case 'pola': return { ...X.pola.win, rt: 3 * X.u, rb: 3 * X.u, rot: polaRot(s), zoom: landscapeSrc ? 1.3 : 1, ax: 0.5, ay: 0.4 };
    case 'band': return { ...X.band.win, ...flat, zoom: landscapeSrc ? 1.6 : 1, ax: 0.5, ay: 0.5 };
    case 'frame': {
      const w = X.frame.win;
      let zoom = cutOK && landscapeSrc ? 1.45 : 1;
      // Frame break: zoom until the eyes can sit 12% under the frame top, so the head clears the edge.
      if (cutOK && fit) zoom = Math.max(zoom, Math.min(1.4, (0.88 * w.h) / ((1 - fit.face.y) * fit.h * Math.max(w.w / fit.w, w.h / fit.h))));
      return { ...w, rt: 30 * X.k, rb: 30 * X.k, rot: 0, zoom, ax: 0.5, ay: cutOK ? 0.12 : 0.34 };
    }
    default: {
      const zoom = s.layout === 'punch' ? s.zoom : s.layout === 'card' ? 1.04 : 1 + 0.045 * clamp01(lt / Math.max(dur, 0.1));
      return { ...g.full, ...flat, zoom, ax: 0.5, ay: 0.42 };
    }
  }
}
const lerpWin = (a: Win, b: Win, t: number): Win => ({
  x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t), w: lerp(a.w, b.w, t), h: lerp(a.h, b.h, t),
  rt: lerp(a.rt, b.rt, t), rb: lerp(a.rb, b.rb, t), rot: lerp(a.rot, b.rot, t),
  zoom: perceptualScale(t, a.zoom, b.zoom), ax: lerp(a.ax, b.ax, t), ay: lerp(a.ay, b.ay, t),
});
function winPath(ctx: CanvasRenderingContext2D, w: Win) {
  const rt = Math.max(0, Math.min(w.rt, w.w / 2, w.h / 2)), rb = Math.max(0, Math.min(w.rb, w.w / 2, w.h / 2));
  ctx.beginPath();
  ctx.roundRect(w.x, w.y, w.w, w.h, [rt, rt, rb, rb]);
}
function rotateAbout(ctx: CanvasRenderingContext2D, w: Win) {
  if (!w.rot) return;
  const cx = w.x + w.w / 2, cy = w.y + w.h / 2;
  ctx.translate(cx, cy); ctx.rotate(w.rot); ctx.translate(-cx, -cy);
}

const strongest = (text: string) => text.split(/\s+/).reduce((a, b) => (b.replace(/[^\p{L}\p{N}]/gu, '').length > a.replace(/[^\p{L}\p{N}]/gu, '').length ? b : a), '');

// ---- Hook title: lower third over a bottom fade (or top, if moved up in the Text panel). ----
function drawHook(ctx: CanvasRenderingContext2D, mg: Extract<MG, { kind: 'hook' }>, W: number, H: number, lt: number, tp: TextProps, hits?: Hit[]) {
  const u = W / 1080;
  const end = mg.end;
  const out = outExpo(clamp01((end - lt) / 0.45));
  if (lt > end || out <= 0) return;
  const s = tp.scale / 100;
  let size = tp.size * u;
  const maxW = (W > H ? W * 0.46 : W * 0.86) / s;
  setText(ctx, tp, size);
  const words = caseText(mg.text, tp.textCase).split(/\s+/).filter(Boolean);
  let lay = layWords(ctx, words, maxW);
  while (lay.lines.length > 4 && size > 28 * u) { size *= 0.9; setText(ctx, tp, size); lay = layWords(ctx, words, maxW); }
  const lh = tp.leading / 100;
  const lines = lay.lines.map((l) => l.map((i) => words[i]).join(' '));
  const blockW = Math.max(...lay.lineW), blockH = (lines.length - 1) * size * lh + size * 1.08;
  const bottom = tp.y > 0.5;
  const ax = tp.x * W, ay = tp.y * H;
  const top = bottom ? -blockH : 0;
  const lx = tp.align === 'left' ? 0 : tp.align === 'right' ? -blockW : -blockW / 2;
  const fade = tp.fade === 'auto' ? (bottom ? 'bottom' : 'top') : tp.fade;
  const a = Math.min(outExpo(clamp01(lt / 0.3)), out);
  if (fade !== 'none') {
    ctx.save();
    ctx.globalAlpha = a;
    if (fade === 'bottom') {
      const y0 = Math.max(0, Math.min(H * 0.42, ay - blockH * s - H * 0.12));
      const gr = ctx.createLinearGradient(0, y0, 0, H);
      gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(0.45, 'rgba(0,0,0,0.5)'); gr.addColorStop(1, 'rgba(0,0,0,0.86)');
      ctx.fillStyle = gr; ctx.fillRect(0, y0, W, H - y0);
    } else {
      const y1 = Math.min(H, Math.max(H * 0.46, ay + blockH * s + H * 0.12));
      const gr = ctx.createLinearGradient(0, 0, 0, y1);
      gr.addColorStop(0, 'rgba(0,0,0,0.82)'); gr.addColorStop(0.55, 'rgba(0,0,0,0.45)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = gr; ctx.fillRect(0, 0, W, y1);
    }
    ctx.restore();
  }
  ctx.save();
  if (tp.shadow) { ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = tp.shadow * u; ctx.shadowOffsetY = 2 * u; }
  placed(ctx, ax, ay, tp, { x: lx - 6 * u, y: top - 6 * u, w: blockW + 12 * u, h: blockH + 12 * u }, 'hook', hits, () => {
    if (tp.bg) { ctx.fillStyle = hexA(tp.bgColor, (tp.bgOpacity / 100) * a); ctx.beginPath(); ctx.roundRect(lx - 28 * u, top - 22 * u, blockW + 56 * u, blockH + 44 * u, 18 * u); ctx.fill(); }
    setText(ctx, tp, size);
    fadeBlurWords(ctx, lines, 0, top + size * 0.86, size, lh, lt, tp.fill, tp.align, u, out, caseText(strongest(mg.text), tp.textCase), fade !== 'none' && !tp.bg ? lift(tp.accent) : tp.accent, { w: tp.stroke * u, color: tp.strokeColor });
  });
  resetTracking(ctx);
  ctx.restore();
}

// ---- Text behind the subject: giant word, cut-out of the person on top. ----
let cutCanvas: HTMLCanvasElement | null = null;
const headCache = new Map<string, number>();
function personLayer(W: number, H: number): HTMLCanvasElement {
  if (!cutCanvas) cutCanvas = document.createElement('canvas');
  if (cutCanvas.width !== W || cutCanvas.height !== H) { cutCanvas.width = W; cutCanvas.height = H; }
  return cutCanvas;
}
function headTop(cut: HTMLCanvasElement, W: number, H: number): number | null {
  const sw = 54, sh = Math.round((54 * H) / W);
  const c = document.createElement('canvas');
  c.width = sw; c.height = sh;
  const g = c.getContext('2d', { willReadFrequently: true })!;
  g.drawImage(cut, 0, 0, sw, sh);
  const d = g.getImageData(0, 0, sw, sh).data;
  for (let y = 0; y < sh; y++) {
    let n = 0;
    for (let x = Math.round(sw * 0.2); x < sw * 0.8; x++) if (d[(y * sw + x) * 4 + 3] > 140) n++;
    if (n >= 3) return (y / sh) * H;
  }
  return null;
}
function drawBehind(ctx: CanvasRenderingContext2D, word: string, W: number, H: number, lt: number, dur: number, tp: TextProps, head: number | null, hits?: Hit[]) {
  const u = W / 1080;
  const txt = caseText(word, tp.textCase);
  let size = tp.size * u;
  setText(ctx, tp, size);
  const maxW = (W * 0.9) / (tp.scale / 100);
  const w0 = ctx.measureText(txt).width;
  if (w0 > maxW) { size *= maxW / w0; setText(ctx, tp, size); }
  const tw = ctx.measureText(txt).width;
  const capH = size * 0.74;
  let cy: number;
  if (tp.y >= 0) cy = tp.y * H;
  else {
    const ht = head ?? H * 0.3;
    cy = Math.max(H * 0.07 + capH / 2, ht - capH * 0.42 + capH / 2);
  }
  const out = c01((dur - lt) / 0.45);
  const lx = tp.align === 'left' ? -tw / 2 : tp.align === 'right' ? -tw / 2 : -tw / 2;
  placed(ctx, tp.x * W, cy, tp, { x: lx, y: -capH / 2, w: tw, h: capH }, 'behind', hits, () => {
    ctx.textBaseline = 'alphabetic';
    const chars = [...txt];
    let x = lx;
    const enter = clamp01(lt / 0.6);
    const sc = perceptualScale(outExpo(enter), 1.1, 1);
    ctx.scale(sc, sc);
    chars.forEach((ch, i) => {
      const p = outExpo(clamp01((lt - i * 0.066) / 0.55));
      const a = Math.min(p, outExpo(out));
      const cw = ctx.measureText(ch).width;
      if (a > 0.01) {
        ctx.save();
        const blur = Math.max(12 * (1 - p), 12 * (1 - out)) * u;
        if (blur > 0.3) ctx.filter = `blur(${blur.toFixed(1)}px)`;
        ctx.globalAlpha *= a;
        if (tp.stroke) { ctx.lineWidth = tp.stroke * u; ctx.strokeStyle = tp.strokeColor; ctx.strokeText(ch, x, capH / 2 + (1 - p) * size * 0.06); }
        ctx.fillStyle = tp.fill;
        ctx.fillText(ch, x, capH / 2 + (1 - p) * size * 0.06);
        ctx.restore();
      }
      x += cw;
    });
  });
  resetTracking(ctx);
}
const c01 = clamp01;

export interface RenderOpts {
  face: Face; captions: boolean; capStyle: CaptionStyleId; t: number; frameIdx: number;
  key?: KeySettings | null; keyer?: Keyer | null; bg?: Bg; photo?: { img: CanvasImageSource; w: number; h: number } | null;
  text?: TextOverrides; hits?: Hit[]; sel?: LayerId | null; srcT?: number; cutout?: boolean;
  broll?: (id: string, localT: number) => FrameSrc | null;
  /** Basic (default) or Great motion: stronger easing, letter stagger; motion blur is added on export. */
  motion?: MotionQuality;
  /** Which text layer speaks: Normal caption (default), Graphics caption, Typography, or Auto per scene. */
  textLayer?: TextLayer;
}

// ---- Kinetic two-font lockup at the bottom: lockup hook, main-word moments, duotone poster. ----
function drawBottomLockup(ctx: CanvasRenderingContext2D, L: LockupText, F: LockupFonts, W: number, H: number, lt: number, endAt: number, tp: TextProps, ov: Partial<TextProps> | undefined, hits?: Hit[]) {
  if (lt <= 0 || lt > endAt || !L.big) return;
  const out = outExpo(clamp01((endAt - lt) / 0.45));
  if (out <= 0) return;
  const u = W / 1080;
  const wide = W > H, tall = H / W > 1.5;
  const fonts: LockupFonts = ov?.font ? { ...F, big: { font: tp.font, weight: tp.weight, upper: tp.textCase === 'upper' } } : F;
  const ax = (ov?.x != null ? tp.x : 0.5) * W;
  const ay = (ov?.y != null ? tp.y : wide ? 0.9 : tall ? 0.84 : 0.89) * H;
  const maxW = wide ? W * 0.62 : W * 0.86;
  const maxBig = (wide ? 120 : tall ? 210 : 175) * u;
  const maxH = H * (wide ? 0.3 : tall ? 0.19 : 0.23);
  const m = measureLockup(ctx, L, fonts, maxW, maxBig, u, maxH);
  const a = Math.min(outExpo(clamp01(lt / 0.3)), out);
  if (tp.fade !== 'none') {
    ctx.save();
    ctx.globalAlpha = a;
    const y0 = Math.max(0, Math.min(H * 0.5, ay - m.h * (tp.scale / 100) - H * 0.14));
    const gr = ctx.createLinearGradient(0, y0, 0, H);
    gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(0.45, 'rgba(0,0,0,0.52)'); gr.addColorStop(1, 'rgba(0,0,0,0.86)');
    ctx.fillStyle = gr; ctx.fillRect(0, y0, W, H - y0);
    ctx.restore();
  }
  const acc = tp.fade !== 'none' ? lift(tp.accent) : tp.accent;
  placed(ctx, ax, ay, tp, { x: -m.w / 2, y: -m.h, w: m.w, h: m.h }, 'hook', hits, () => {
    drawLockup(ctx, L, fonts, { ink: tp.fill, accent: acc, smallColor: acc }, 0, 0, 'bottom', maxW, maxBig, lt, out, u, maxH);
  });
}

/** How long a bottom lockup stays on a shot (captions step aside meanwhile). */
const lockEnd = (s: Shot) => {
  const dur = s.outE - s.outS;
  if (s.mg?.kind === 'word') return Math.min(dur - 0.05, 2.8);
  if (s.layout === 'duotone' && s.mg) return Math.min(dur - 0.05, 3.2);
  return -1;
};

let silCanvas: HTMLCanvasElement | null = null;
let duoCanvas: HTMLCanvasElement | null = null;
const scratch = (c: HTMLCanvasElement | null, W: number, H: number) => {
  const cv = c ?? document.createElement('canvas');
  if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; }
  return cv;
};

export function renderFrame(ctx: CanvasRenderingContext2D, W: number, H: number, raw: FrameSrc | null, edit: Edit, pack: Pack, o: RenderOpts) {
  const t = o.t;
  const g = geo(W, H);
  const X = xgeo(W, H);
  const u = W / 1080;
  const k = X.k;
  ctx.save();
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, W, H);
  let si = edit.shots.findIndex((s) => t >= s.outS && t < s.outE);
  if (si < 0) si = edit.shots.length - 1;
  const shot = edit.shots[si];
  const prevShot = si > 0 ? edit.shots[si - 1] : null;
  const nextShot = edit.shots[si + 1];
  const lt = t - shot.outS;
  const dur = shot.outE - shot.outS;
  const mgAlpha = Math.min(outExpo(clamp01(lt / 0.3)), clamp01((dur - lt) / EXIT));
  const mgBlur = (1 - clamp01((dur - lt) / EXIT)) * 12 * u;
  const T: Typo = { pack, u, W, H, head: resolveText('headline', pack, W, H, o.capStyle, o.text), body: resolveText('body', pack, W, H, o.capStyle, o.text) };
  const F = groupById(pack.group).lockup(pack);

  let src = raw;
  const keyed = !!(raw && o.key && o.keyer);
  if (keyed) src = { img: o.keyer!.process(raw!.img as TexImageSource, raw!.w, raw!.h, o.key!), w: raw!.w, h: raw!.h };
  const bg: Bg = o.bg ?? { type: 'pack' };
  const landscapeSrc = src ? src.w > src.h : true;
  const cutOK = keyed || (!!o.cutout && segState() === 'ready');

  // Speaker window, morphing straight from the previous layout (no detour through full frame).
  const fit = src ? { w: src.w, h: src.h, face: o.face } : undefined;
  const cur = winFor(shot, g, X, landscapeSrc, lt, dur, cutOK, fit);
  let win = cur;
  let morph = 1;
  if (prevShot && shapeOf(prevShot) !== shapeOf(shot) && shapeOf(prevShot) !== 'cut' && shapeOf(shot) !== 'cut') {
    const pd = prevShot.outE - prevShot.outS;
    morph = (o.motion === 'great' ? greatInOut : inOut)(clamp01(lt / MORPH));
    win = lerpWin(winFor(prevShot, g, X, landscapeSrc, pd, pd, cutOK, fit), cur, morph);
  }
  const bgNow = hasBg(shot) || (morph < 1 && !!prevShot && hasBg(prevShot));
  if (bgNow) drawBg(ctx, g.full, { type: 'pack' }, pack, t, null, undefined, k);
  const speaker = (w: Win) => {
    ctx.save();
    rotateAbout(ctx, w);
    winPath(ctx, w);
    ctx.clip();
    if (keyed) drawBg(ctx, w, bg, pack, t, o.photo?.img ?? null, o.photo ?? undefined, k);
    const x = src ? drawCover(ctx, src, w, o.face, w.zoom, w.ax, w.ay) : null;
    ctx.restore();
    return x;
  };
  /** The speaker alone (green-screen key or the in-browser cut-out), aligned to transform Xc. */
  const cutLayer = (Xc: { dx: number; dy: number; dw: number; dh: number }): HTMLCanvasElement | null => {
    if (!src) return null;
    const cut = personLayer(W, H);
    const cg = cut.getContext('2d')!;
    cg.clearRect(0, 0, W, H);
    if (keyed) { cg.drawImage(src.img, Xc.dx, Xc.dy, Xc.dw, Xc.dh); return cut; }
    if (!o.cutout || !raw) return null;
    const m = personMask(raw.img, o.srcT ?? t);
    if (!m) return null;
    cg.drawImage(raw.img, Xc.dx, Xc.dy, Xc.dw, Xc.dh);
    cg.globalCompositeOperation = 'destination-in';
    cg.imageSmoothingQuality = 'high';
    cg.drawImage(m, Xc.dx, Xc.dy, Xc.dw, Xc.dh);
    cg.globalCompositeOperation = 'source-over';
    return cut;
  };
  const headOf = (cut: HTMLCanvasElement, tag: string) => {
    const hk = `${shot.key}|${tag}|${W}x${H}|${o.face.x.toFixed(3)}`;
    let head = headCache.get(hk);
    if (head == null) { const h = headTop(cut, W, H); if (h != null) { head = h; headCache.set(hk, h); } }
    return head ?? null;
  };
  /** Accent outline around a window, drawing on clockwise. */
  const outline = (w: Win, off: number, p: number, alpha = 1) => {
    if (p <= 0) return;
    const ow: Win = { ...w, x: w.x - off, y: w.y - off, w: w.w + 2 * off, h: w.h + 2 * off, rt: w.rt ? w.rt + off : 0, rb: w.rb ? w.rb + off : 0 };
    ctx.save();
    rotateAbout(ctx, ow);
    ctx.strokeStyle = T.head.accent;
    ctx.globalAlpha *= alpha;
    ctx.lineWidth = 3 * k;
    const per = 2 * (ow.w + ow.h);
    ctx.setLineDash([per * p, per]);
    winPath(ctx, ow);
    ctx.stroke();
    ctx.restore();
  };
  /** The shot's message as a centred two-font lockup in a text area. */
  const areaMax = (area: Rect) => Math.min(area.h * 0.66, 240 * u * (X.wide ? 0.72 : 1));
  const areaLockup = (area: Rect) => {
    if (!shot.mg) return;
    const lt2 = lt - 0.25;
    const L = lockupOf(shot.mg, shot.kw || shot.text, lt2, dur);
    drawLockup(ctx, L, F, { ink: T.head.fill, accent: T.head.accent, smallColor: T.head.accent }, area.x + area.w / 2, area.y + area.h / 2, 'center', area.w, areaMax(area), lt2, clamp01((dur - lt) / EXIT), u, area.h);
  };
  /** Bottom edge of the panel lockup (settled size), so nothing breaks into it. */
  const areaBottom = (area: Rect) => {
    if (!shot.mg) return area.y;
    const m = measureLockup(ctx, lockupOf(shot.mg, shot.kw || shot.text, 9, dur), F, area.w, areaMax(area), u, area.h);
    return area.y + area.h / 2 + m.h / 2;
  };
  const polaroid = (w: Win, cardA: number) => {
    ctx.save();
    rotateAbout(ctx, w);
    ctx.globalAlpha *= cardA;
    ctx.shadowColor = 'rgba(0,0,0,0.3)'; ctx.shadowBlur = 40 * k; ctx.shadowOffsetY = 16 * k;
    ctx.fillStyle = '#F6F3EC';
    ctx.beginPath(); ctx.roundRect(w.x - X.pola.pad, w.y - X.pola.pad, w.w + 2 * X.pola.pad, w.h + X.pola.pad + X.pola.bot, 6 * k); ctx.fill();
    ctx.restore();
    speaker(w);
    const la = outExpo(clamp01((lt - 0.55) / 0.6)) * cardA;
    if (la > 0) {
      ctx.save();
      rotateAbout(ctx, w);
      ctx.globalAlpha *= la;
      setText(ctx, { font: 'Instrument Serif', weight: 400, italic: true }, Math.min(X.pola.bot * 0.46, 64 * k));
      ctx.fillStyle = '#2E2925';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(`${pack.subject.toLowerCase()}, nº ${String(mgIndex(edit, si)).padStart(2, '0')}`, w.x + w.w / 2, w.y + w.h + X.pola.bot * 0.5);
      ctx.textAlign = 'left';
      ctx.restore();
    }
  };

  const behindWord = shot.layout === 'behind' ? shot.behind : shot.mg?.kind === 'hook' ? shot.mg.behind : undefined;
  const bt = resolveText('behind', pack, W, H, o.capStyle, o.text);
  const hp = resolveText('hook', pack, W, H, o.capStyle, o.text);

  switch (shot.layout) {
    case 'full': case 'punch': case 'behind': {
      const Xc = speaker(win);
      if (behindWord && bt.visible && Xc) {
        const cut = cutLayer(Xc);
        if (cut) {
          const head = headOf(cut, 'behind');
          const endA = shot.mg?.kind === 'hook' ? Math.min(1, clamp01((dur - lt) / 0.45)) : 1;
          // Visibility fade behind the word (graphics rules: text on footage gets an overlay).
          ctx.save();
          ctx.globalAlpha = 0.75 * Math.min(outExpo(clamp01(lt / 0.4)), endA);
          const gr = ctx.createLinearGradient(0, 0, 0, H * 0.5);
          gr.addColorStop(0, 'rgba(0,0,0,0.55)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H * 0.5);
          ctx.restore();
          drawBehind(ctx, behindWord, W, H, lt, dur, bt, head, o.hits);
          ctx.drawImage(cut, 0, 0);
        }
      }
      if (shot.mg?.kind === 'hook' && hp.visible) {
        if (shot.mg.style === 'lockup') drawBottomLockup(ctx, lockupOf(shot.mg, shot.kw, lt, dur), F, W, H, lt, shot.mg.end, hp, o.text?.hook, o.hits);
        else drawHook(ctx, shot.mg, W, H, lt, hp, o.hits);
      }
      if (shot.mg?.kind === 'word' && hp.visible) drawBottomLockup(ctx, lockupOf(shot.mg, shot.kw, lt - 0.12, dur), F, W, H, lt - 0.12, lockEnd(shot) - 0.12, hp, o.text?.hook, o.hits);
      break;
    }
    case 'split': {
      const panel = g.split.panel;
      const land = W > H;
      const slide = prevShot && hasBg(prevShot) ? 1 : outExpo(clamp01(lt / 0.5));
      const off = land ? { x: -panel.w * (1 - slide), y: 0 } : { x: 0, y: -panel.h * (1 - slide) };
      const pr = { x: panel.x + off.x, y: panel.y + off.y, w: panel.w, h: panel.h };
      drawBg(ctx, pr, { type: 'pack' }, pack, t, null, undefined, k);
      speaker(win);
      const lineP = outExpo(clamp01((lt - 0.15) / 0.6));
      ctx.fillStyle = T.head.accent;
      if (land) ctx.fillRect(pr.x + pr.w - 6 * u, pr.y, 6 * u, pr.h * lineP); else ctx.fillRect(pr.x, pr.y + pr.h - 6 * u, pr.w * lineP, 6 * u);
      if (shot.mg) {
        ctx.save();
        ctx.globalAlpha = mgAlpha;
        if (mgBlur > 0.2) ctx.filter = `blur(${mgBlur}px)`;
        const m = g.safe.x;
        const topPad = land ? m + H * 0.05 : Math.max(m, H * 0.08) + H * 0.035;
        const inner = { x: pr.x + m, y: pr.y + topPad, w: pr.w - 2 * m, h: pr.h - topPad - m };
        decor(ctx, T, { x: inner.x, y: inner.y - H * 0.012, w: inner.w, h: inner.h }, pack.subject, mgIndex(edit, si), lt - 0.2);
        drawMG(ctx, shot.mg, { x: inner.x, y: inner.y + H * 0.012, w: inner.w, h: inner.h - H * 0.012 }, T, lt - 0.3, dur);
        ctx.restore();
      }
      break;
    }
    case 'circle': {
      if (!bgNow) drawBg(ctx, g.full, { type: 'pack' }, pack, t, null, undefined, k);
      speaker(win);
      if (morph >= 1) {
        ctx.strokeStyle = T.head.accent;
        ctx.lineWidth = 7 * u;
        ctx.beginPath();
        ctx.arc(g.circle.c.x, g.circle.c.y, g.circle.r + 12 * u, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * outExpo(clamp01((lt - MORPH) / 0.8)));
        ctx.stroke();
      }
      if (shot.mg) {
        ctx.save();
        ctx.globalAlpha = mgAlpha;
        if (mgBlur > 0.2) ctx.filter = `blur(${mgBlur}px)`;
        const c = g.circle.content;
        decor(ctx, T, { x: c.x, y: c.y - H * 0.012, w: c.w, h: c.h }, pack.subject, mgIndex(edit, si), lt - 0.2, false);
        drawMG(ctx, shot.mg, { x: c.x, y: c.y + H * 0.01, w: c.w, h: c.h }, T, lt - 0.3, dur);
        ctx.restore();
      }
      break;
    }
    case 'arch': {
      speaker(win);
      outline(win, 16 * k, morph >= 1 ? outExpo(clamp01(lt / 1.1)) : 0, 0.9);
      areaLockup(X.arch.text);
      break;
    }
    case 'polaroid': {
      polaroid(win, clamp01((morph - 0.35) / 0.65));
      areaLockup(X.pola.text);
      break;
    }
    case 'band': {
      speaker(win);
      const p = morph >= 1 ? outExpo(clamp01((lt - 0.15) / 0.7)) : 0;
      if (p > 0) {
        ctx.fillStyle = T.head.accent;
        ctx.fillRect(W / 2 - (W * p) / 2, win.y - 4 * k, W * p, 4 * k);
        ctx.fillRect(W / 2 - (W * p) / 2, win.y + win.h, W * p, 4 * k);
      }
      areaLockup(X.band.text);
      break;
    }
    case 'frame': {
      const Xc = speaker(win);
      outline(win, 0, morph >= 1 ? 1 : 0, 0.85);
      // Frame break: the head comes out over the top edge (clip to the frame's sides, not its top).
      if (cutOK && Xc && morph > 0.85) {
        const cut = cutLayer(Xc);
        if (cut) {
          // Never break into the title: above its bottom edge the head fades out.
          const top = X.wide ? 0 : Math.min(win.y - 20 * k, areaBottom(X.frame.text) + H * 0.012);
          if (top > 0) {
            const cg = cut.getContext('2d')!;
            const fade = Math.min(40 * k, Math.max(1, win.y - top));
            const gr = cg.createLinearGradient(0, top, 0, top + fade);
            gr.addColorStop(0, 'rgba(0,0,0,1)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
            cg.save();
            cg.globalCompositeOperation = 'destination-out';
            cg.fillStyle = gr;
            cg.fillRect(0, 0, W, top + fade);
            cg.restore();
          }
          ctx.save();
          ctx.globalAlpha *= clamp01((morph - 0.85) / 0.15) * outExpo(clamp01(lt / 0.25));
          ctx.beginPath(); ctx.rect(win.x - W * 0.06, 0, win.w + W * 0.12, win.y + 2 * k); ctx.clip();
          ctx.drawImage(cut, 0, 0);
          ctx.restore();
        }
      }
      areaLockup(X.frame.text);
      break;
    }
    case 'sticker': {
      let done = false;
      if (cutOK && src) {
        const S = X.sticker;
        // Wide: the speaker stands in the right half, the title sits beside it.
        const area = X.wide ? { x: W * 0.47, y: 0, w: W * 0.53, h: H } : g.full;
        const Xf = coverXf(src, area, o.face, 1, 0.5, 0.42);
        const cut = cutLayer(Xf);
        if (cut) {
          const head = headOf(cut, 'sticker');
          const limit = X.wide ? H * 0.07 : S.text.y + S.text.h + H * 0.025;
          const sc = Math.min(S.s, head != null && head < H ? (H - limit) / (H - head) : S.s);
          const px = X.wide ? area.x + area.w / 2 : W / 2;
          const sil = (silCanvas = scratch(silCanvas, W, H));
          const sg = sil.getContext('2d')!;
          sg.clearRect(0, 0, W, H);
          sg.drawImage(cut, 0, 0);
          sg.globalCompositeOperation = 'source-in';
          sg.fillStyle = '#FFFFFF';
          sg.fillRect(0, 0, W, H);
          sg.globalCompositeOperation = 'source-over';
          const pop = prevShot?.layout === 'sticker' ? 1 : popIn(clamp01(lt / 0.55));
          const z = sc * (0.9 + 0.1 * pop);
          ctx.save();
          ctx.globalAlpha *= clamp01(lt / 0.12);
          ctx.translate(px + S.dx, H + 16 * k);
          ctx.rotate(-0.025);
          ctx.scale(z, z);
          ctx.translate(-px, -H);
          ctx.save();
          ctx.shadowColor = 'rgba(0,0,0,0.32)'; ctx.shadowBlur = 30 * k; ctx.shadowOffsetY = 14 * k;
          ctx.drawImage(sil, 0, 0);
          ctx.restore();
          const R = (10 * k) / z;
          for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; ctx.drawImage(sil, Math.cos(a) * R, Math.sin(a) * R); }
          ctx.drawImage(cut, 0, 0);
          ctx.restore();
          done = true;
        }
      }
      if (!done) polaroid(winFor({ ...shot, layout: 'polaroid' }, g, X, landscapeSrc, lt, dur, false), 1);
      areaLockup(X.sticker.text);
      break;
    }
    case 'duotone': {
      const Xc = speaker(win);
      if (src && Xc) {
        const dl = (duoCanvas = scratch(duoCanvas, W, H));
        const dg = dl.getContext('2d')!;
        dg.save();
        dg.clearRect(0, 0, W, H);
        const shade = lum(pack.bg) <= lum(pack.ink) ? pack.bg : pack.ink;
        dg.filter = 'grayscale(1) contrast(1.25) brightness(1.04)';
        dg.drawImage(src.img, Xc.dx, Xc.dy, Xc.dw, Xc.dh);
        dg.filter = 'none';
        dg.globalCompositeOperation = 'multiply';
        dg.fillStyle = lift(pack.accent);
        dg.fillRect(0, 0, W, H);
        dg.globalCompositeOperation = 'screen';
        dg.fillStyle = shade;
        dg.fillRect(0, 0, W, H);
        dg.restore();
        // Clip to the (morphing) window: outside the footage the tint layer is bare colour.
        ctx.save();
        ctx.globalAlpha *= prevShot?.layout === 'duotone' ? 1 : outExpo(clamp01(lt / 0.35));
        rotateAbout(ctx, win);
        winPath(ctx, win);
        ctx.clip();
        ctx.drawImage(dl, 0, 0);
        ctx.restore();
      }
      // Poster frame + masthead.
      const a = outExpo(clamp01((lt - 0.1) / 0.5)) * clamp01((dur - lt) / EXIT);
      if (a > 0) {
        const ins = 28 * k;
        ctx.save();
        ctx.globalAlpha *= a;
        ctx.strokeStyle = 'rgba(255,255,255,0.7)';
        ctx.lineWidth = 2 * k;
        ctx.strokeRect(ins, ins, W - 2 * ins, H - 2 * ins);
        setText(ctx, { font: pack.body, weight: 800, tracking: 260 }, 22 * k);
        ctx.fillStyle = '#FFFFFF';
        ctx.textBaseline = 'middle';
        ctx.fillText(pack.subject.toUpperCase(), ins + 26 * k, ins + 44 * k);
        ctx.textAlign = 'right';
        ctx.fillText(`Nº ${String(mgIndex(edit, si)).padStart(2, '0')}`, W - ins - 26 * k, ins + 44 * k);
        ctx.textAlign = 'left';
        resetTracking(ctx);
        ctx.restore();
      }
      if (shot.mg && hp.visible) drawBottomLockup(ctx, lockupOf(shot.mg, shot.kw, lt - 0.1, dur), F, W, H, lt - 0.1, lockEnd(shot) - 0.1, hp, o.text?.hook, o.hits);
      break;
    }
    case 'card': {
      speaker(win);
      drawCard(ctx, shot, {
        T, lt, dur, t, idx: mgIndex(edit, si), last: !nextShot,
        bubble: src ? (cx, cy, r) => { const z = landscapeSrc ? 2.2 : 1.6; drawCover(ctx, src!, { x: cx - r, y: cy - r, w: 2 * r, h: 2 * r }, o.face, z, 0.5, 0.5); } : undefined,
      });
      break;
    }
    case 'broll': {
      const b = shot.broll!;
      const fr = o.broll?.(b.id, lt) ?? null;
      const kb = 1 + 0.05 * clamp01(lt / Math.max(dur, 0.1));
      if (b.mode === 'full') {
        if (fr) drawCover(ctx, fr, g.full, { x: 0.5, y: 0.5 }, kb, 0.5, 0.5); else speaker(win);
      } else {
        const panel = g.split.panel;
        const land = W > H;
        const rev = outExpo(clamp01(lt / 0.5));
        drawBg(ctx, panel, { type: 'pack' }, pack, t, null, undefined, k);
        ctx.save();
        ctx.beginPath();
        if (land) ctx.rect(panel.x, panel.y, panel.w * rev, panel.h); else ctx.rect(panel.x, panel.y, panel.w, panel.h * rev);
        ctx.clip();
        if (fr) drawCover(ctx, fr, panel, { x: 0.5, y: 0.5 }, kb, 0.5, 0.5);
        ctx.restore();
        speaker(win);
        ctx.fillStyle = T.head.accent;
        if (land) ctx.fillRect(panel.x + panel.w - 6 * u, 0, 6 * u, H); else ctx.fillRect(0, panel.h - 3 * u, W * rev, 6 * u);
      }
      break;
    }
  }

  // Great: the edit itself changes. Speaker shots announce on the face, then a full visual takes over.
  let visualOn = false;
  if (o.motion === 'great') {
    const v = visualFor(edit, si, pack);
    if (v && lt >= v.start) visualOn = drawVisual(ctx, v, shot, lt - v.start, dur - v.start, W, H, pack, o.frameIdx, src);
    if (!visualOn) vignette(ctx, W, H, 0.32);
    if (si > 0) lightLeak(ctx, W, H, lt, pack.accent);
  }

  if (pack.grain > 0) {
    const gc = grain();
    ctx.save();
    ctx.globalAlpha = shot.layout === 'duotone' ? Math.min(0.12, pack.grain * 2) : pack.grain;
    ctx.globalCompositeOperation = 'overlay';
    const ox = (o.frameIdx * 73) % 256, oy = (o.frameIdx * 151) % 256;
    ctx.translate(-ox, -oy);
    for (let x = 0; x < W + 256; x += 256) for (let y = 0; y < H + 256; y += 256) ctx.drawImage(gc, x, y);
    ctx.restore();
  }

  if (o.captions && !visualOn) {
    const hookOn = edit.shots[0]?.mg?.kind === 'hook' && hp.visible;
    const cap = edit.caps.find((c) => t >= c.outS && t < c.outE);
    const cp = o.text?.caption ?? {};
    // A bottom lockup (main word or duotone poster) stands in for the captions while it is up.
    const lockOn = hp.visible && lockEnd(shot) > 0 && lt < lockEnd(shot) + 0.05;
    if (cap && cp.visible !== false && !lockOn && !(hookOn && cap.outS < edit.hookEnd - 1e-3)) {
      let capY = g.capY;
      if (shot.layout === 'circle' && W < H) capY = Math.max(g.capY, g.circle.c.y + g.circle.r + g.capSize * u * 1.3);
      if (shot.layout === 'polaroid' || (shot.layout === 'sticker' && !cutOK)) capY = X.wide ? g.capY : X.pola.capY;
      let ov = cp.y == null && capY !== g.capY ? { ...cp, y: capY / H } : cp;
      // 16:9: graphics own the left half, so captions sit under the speaker on the right.
      const leftPanel = W > H && (['split', 'circle', 'card', 'arch', 'polaroid', 'frame', 'sticker'].includes(shot.layout) || (shot.layout === 'broll' && shot.broll?.mode === 'split'));
      if (leftPanel && cp.x == null) ov = { ...ov, x: shot.layout === 'circle' ? g.circle.c.x / W : 0.75 };
      // Captions that sit on the preset background rather than footage need dark ink on light presets.
      const onBg = shot.layout === 'polaroid' || shot.layout === 'band' || shot.layout === 'card' || (shot.layout === 'sticker' && !cutOK) || (shot.layout === 'circle' && W < H);
      const light = onBg && !keyed && lum(pack.bg) > 0.4;
      // Text layers (graphics rules §7): one layer speaks at a time; the Normal caption is hidden, not removed.
      const layer = layerFor(o.textLayer, shot, cap, cap === edit.caps[edit.caps.length - 1]);
      const great = o.motion === 'great';
      if (layer === 'typo') drawTypography(ctx, cap, t, W, H, pack, great);
      else if (layer === 'graphics') {
        const cy = W > H ? H * 0.78 : Math.min(H * 0.76, (ov.y ?? capY / H) * H);
        drawGraphicsCaption(ctx, cap, t, W, H, pack, cy, great, !light);
      } else drawCaption(ctx, o.capStyle, cap, t, { capY: g.capY, capSize: g.capSize, W, H, light }, pack, ov, o.hits);
    }
  }
  if (o.sel && o.hits) { const h = [...o.hits].reverse().find((x) => x.id === o.sel); if (h) drawSelection(ctx, h, W); }
  ctx.restore();
}

const MG_LAYOUTS = new Set(['split', 'card', 'circle', 'arch', 'polaroid', 'band', 'frame', 'sticker', 'duotone']);
function mgIndex(edit: Edit, si: number) {
  let n = 0;
  for (let i = 0; i <= si; i++) if (MG_LAYOUTS.has(edit.shots[i].layout)) n++;
  return Math.max(1, n);
}

let demoSpk: HTMLCanvasElement | null = null;
const demoWords = (pack: Pack) => ['Here’s', 'how', 'to', 'grow', pack.subject.toLowerCase(), 'fast'];
export function renderDemo(ctx: CanvasRenderingContext2D, W: number, H: number, pack: Pack, t: number, capStyle?: CaptionStyleId, onlyCaption = false) {
  const ws = demoWords(pack).map((w, i) => ({ w, s: 0.25 + i * 0.32, e: 0.25 + i * 0.32 + 0.28 }));
  const base = { text: '', kw: pack.subject, auto: 'full' as const };
  // Each style group shows its own signature layouts (no cut-out in demos, so skip the ones that need it).
  const sig = (Object.entries(groupById(pack.group).layouts) as [Shot['layout'], number][])
    .filter(([k]) => !['full', 'punch', 'card', 'frame', 'sticker', 'duotone'].includes(k))
    .sort((a, b) => b[1] - a[1]).map(([k]) => k);
  const [l1, l2] = [sig[0] ?? 'split', sig[1] ?? 'circle'];
  const fake: Edit = {
    duration: 6, segs: [], words: [], hookEnd: 0,
    shots: onlyCaption ? [{ ...base, key: 'd0', outS: 0, outE: 6, layout: 'full', zoom: 1 }] : [
      { ...base, key: 'd1', outS: 0, outE: 3, layout: l1, zoom: 1, mg: l1 === 'split' || l1 === 'circle' ? { kind: 'stat', value: '87%', label: 'more reach', icon: 'up' } : { kind: 'keyword', text: pack.subject, sub: 'the part that matters', icon: pack.icon } },
      { ...base, key: 'd2', outS: 3, outE: 6, layout: l2, zoom: 1, mg: l2 === 'split' || l2 === 'circle' ? { kind: 'keyword', text: pack.subject, sub: pack.blurb, icon: pack.icon } : { kind: 'stat', value: '87%', label: 'more reach', icon: 'up' } },
    ],
    caps: [{ outS: 0, outE: ws[3].s, words: ws.slice(0, 3) }, { outS: ws[3].s, outE: 6, words: ws.slice(3) }],
  };
  if (!demoSpk) {
    const c = document.createElement('canvas');
    c.width = 480; c.height = 480;
    const g = c.getContext('2d')!;
    const gr = g.createLinearGradient(0, 0, 0, 480); gr.addColorStop(0, '#4a4440'); gr.addColorStop(1, '#2c2826');
    g.fillStyle = gr; g.fillRect(0, 0, 480, 480);
    g.fillStyle = '#7a6d63'; g.beginPath(); g.arc(240, 190, 70, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#5d524b'; g.beginPath(); g.ellipse(240, 470, 150, 170, 0, Math.PI, 0); g.fill();
    demoSpk = c;
  }
  renderFrame(ctx, W, H, { img: demoSpk, w: 480, h: 480 }, fake, pack, { face: { x: 0.5, y: 0.4 }, captions: true, capStyle: capStyle ?? pack.capStyle, t: t % 6, frameIdx: Math.floor(t * 30) });
}
