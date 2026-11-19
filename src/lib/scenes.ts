// Great-only visual scenes: Great changes the edit, not just the polish.
// Speaker shots keep the face for the "announce" part, then a full, detailed visual takes over for "describe"
// (graphics rules §9). Craft from cinetic / motion-studio: one hero per scene, layered depth, a weighted camera,
// every element animated from a few house curves, labels taken from the transcript (no fake metrics),
// one accent with a meaning, and a different entrance per scene so cuts never repeat.
import type { Pack } from './packs';
import type { Edit, Shot, Word } from './style';
import { clean, keywordOf } from './style';
import { drawIcon, iconFor } from './icons';
import { setText, resetTracking, lum, lift } from './text';
import { bezier, clamp01 } from './ease';
import { strongOut } from './motion';
import { render3DIcon, ready3D } from './three3d';
import type { FrameSrc } from './render';

export type SceneKind = 'object' | 'graph' | 'flow' | 'stat' | 'compare' | 'quote';
export interface Visual {
  kind: SceneKind; start: number; key: string; number: string | null;
  icons: string[]; labels: string[]; text: string;
}

// ---------- house motion (cinetic tokens) ----------
const camE = bezier(0.48, 0.1, 0, 0.9);
const restE = bezier(0.45, 0, 0.1, 1);
const p = (vt: number, t0: number, d: number) => clamp01((vt - t0) / d);
const inn = (vt: number, t0: number, d = 0.5) => strongOut(p(vt, t0, d));
const lmix = (a: number, b: number, t: number) => Math.exp(Math.log(a) + (Math.log(b) - Math.log(a)) * t);

// ---------- planning ----------
const A_ROLL = new Set(['full', 'punch']);
const NUM = /^(\$|₹)?\d[\d,.]*(%|k|m|b|x)?$/i;
const NUM_WORDS: Record<string, string> = { two: '2', three: '3', four: '4', five: '5', six: '6', seven: '7', eight: '8', nine: '9', ten: '10', hundred: '100', thousand: '1,000', million: '1M', billion: '1B' };
const GROW = /\b(up|grow|growth|more|double|increase|faster|scale|rise|climb|better|higher)\b/i;
const STEPS = /\b(first|then|next|finally|step|steps|phase|process|start)\b/i;
const VS = /\b(but|vs|versus|instead|than|old|new|before|after|between)\b/i;
const STOP = /^(the|and|that|this|with|from|have|your|their|there|what|when|like|just|they|them|then|than|into|about|every|still|most|people|really|thing)$/i;
const POOL = ['target', 'zap', 'rocket', 'bulb', 'trophy', 'star', 'heart', 'chart', 'users', 'clock'];

const plans = new WeakMap<Edit, (Visual | null)[]>();

/** Which visual (if any) takes over each shot in Great. Planned once per edit so scene types never repeat back to back. */
export function visualFor(edit: Edit, si: number, pack: Pack): Visual | null {
  let plan = plans.get(edit);
  if (!plan) { plan = planVisuals(edit, pack); plans.set(edit, plan); }
  return plan[si] ?? null;
}

function planVisuals(edit: Edit, pack: Pack): (Visual | null)[] {
  let prev: SceneKind | null = null;
  let iconTurn = 0;
  void pack;
  return edit.shots.map((s, si) => {
    if (si === 0 || !A_ROLL.has(s.layout)) return null;
    const dur = s.outE - s.outS;
    if (dur < 1.3) return null;
    const words = edit.words.filter((w) => w.s >= s.outS - 0.01 && w.s < s.outE);
    const text = words.map((w) => w.w).join(' ') || s.text;
    const key = clean(keywordOf(words.length ? words : [{ w: s.kw, s: 0, e: 0 } as Word])) || s.kw;
    const number = numberIn(words);
    const icons: string[] = [];
    for (const w of words) { const ic = iconFor(w.w); if (ic && !icons.includes(ic)) icons.push(ic); }
    while (icons.length < 4) { const c = POOL[(si * 3 + iconTurn++) % POOL.length]; if (!icons.includes(c)) icons.push(c); }
    const labels: string[] = [];
    for (const w of words) { const c = clean(w.w); if (c.length > 3 && !STOP.test(c) && c.toLowerCase() !== key.toLowerCase() && !labels.some((l) => l.toLowerCase() === c.toLowerCase())) labels.push(c); }
    const last = si === edit.shots.length - 1;
    const order: SceneKind[] = last ? ['quote']
      : number ? ['stat', 'graph', 'object']
      : GROW.test(text) ? ['graph', 'stat', 'object']
      : VS.test(text) ? ['compare', 'object', 'flow']
      : STEPS.test(text) || labels.length >= 3 ? ['flow', 'object', 'compare']
      : ['object', 'flow', 'compare'];
    const kind = order.find((k) => k !== prev) ?? order[0];
    prev = kind;
    // announce on the face first, then the visual (never less than 1.0 s of visual)
    const start = Math.min(Math.max(0.55, dur * 0.28), dur - 1.0);
    return { kind, start, key, number, icons, labels: labels.slice(0, 3), text };
  });
}
function numberIn(ws: Word[]): string | null {
  for (const w of ws) {
    const c = clean(w.w);
    if (NUM.test(c) && /\d/.test(c)) return c;
    if (NUM_WORDS[c.toLowerCase()]) return NUM_WORDS[c.toLowerCase()];
  }
  return null;
}

// ---------- shared look ----------
let noise: HTMLCanvasElement | null = null;
function grainTile(): HTMLCanvasElement {
  if (noise) return noise;
  noise = document.createElement('canvas'); noise.width = noise.height = 256;
  const g = noise.getContext('2d')!; const id = g.createImageData(256, 256);
  let s = 7; const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < id.data.length; i += 4) { const v = 128 + (r() - 0.5) * 80; id.data[i] = id.data[i + 1] = id.data[i + 2] = v; id.data[i + 3] = 255; }
  g.putImageData(id, 0, 0);
  return noise;
}
function texture(ctx: CanvasRenderingContext2D, W: number, H: number, strength: number, seed: number) {
  const n = grainTile();
  ctx.save(); ctx.globalAlpha = strength; ctx.globalCompositeOperation = 'overlay';
  ctx.translate(-((seed * 37) % 256), -((seed * 91) % 256));
  for (let x = 0; x < W + 256; x += 256) for (let y = 0; y < H + 256; y += 256) ctx.drawImage(n, x, y);
  ctx.restore();
}
export function vignette(ctx: CanvasRenderingContext2D, W: number, H: number, a = 0.45) {
  const g = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.hypot(W, H) * 0.6);
  g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, `rgba(0,0,0,${a})`);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
}
/** Soft light sweep on a cut into a speaker shot (screen blend, tinted by the accent, no flare). */
export function lightLeak(ctx: CanvasRenderingContext2D, W: number, H: number, lt: number, accent: string) {
  const q = lt / 0.55;
  if (q <= 0 || q >= 1) return;
  const a = Math.sin(q * Math.PI) * 0.32;
  const x = -W * 0.3 + q * W * 1.6;
  const [r, g, b] = rgb(accent);
  ctx.save(); ctx.globalCompositeOperation = 'screen';
  const gr = ctx.createRadialGradient(x, H * 0.35, 0, x, H * 0.35, Math.max(W, H) * 0.55);
  gr.addColorStop(0, `rgba(255,255,255,${a})`); gr.addColorStop(0.4, `rgba(${r},${g},${b},${a * 0.5})`); gr.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H);
  ctx.restore();
}
function rgb(hex: string): [number, number, number] {
  const h = hex.replace('#', ''); if (h.length < 6) return [255, 255, 255];
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)) as [number, number, number];
}
const rgba = (hex: string, a: number) => { const [r, g, b] = rgb(hex); return `rgba(${r},${g},${b},${a})`; };

interface Look { u: number; W: number; H: number; dark: boolean; bg: string; ink: string; mute: string; acc: string; card: string; line: string; display: string; dw: number; body: string; upper: boolean }
function lookOf(pack: Pack, W: number, H: number, kind: SceneKind): Look {
  const dark = kind === 'graph' || kind === 'stat' || lum(pack.bg) < 0.35;
  const acc = dark ? (lum(pack.accent) >= 0.2 ? pack.accent : lift(pack.accent, 0.3)) : pack.accent;
  return {
    u: Math.min(W, H) / 1080, W, H, dark, acc,
    bg: kind === 'quote' ? acc : dark ? '#0d0f12' : '#F3F4F2',
    ink: kind === 'quote' ? (lum(acc) > 0.5 ? '#0d0f12' : '#FFFFFF') : dark ? '#F4F5F7' : '#111316',
    mute: dark ? 'rgba(244,245,247,0.55)' : 'rgba(17,19,22,0.5)',
    card: dark ? '#171a1f' : '#FFFFFF',
    line: dark ? 'rgba(255,255,255,0.09)' : 'rgba(17,19,22,0.08)',
    display: pack.display, dw: Math.max(700, pack.displayWeight), body: pack.body, upper: pack.displayCase === 'upper',
  };
}
const cap = (L: Look, s: string) => (L.upper ? s.toUpperCase() : s);

function shadowCard(ctx: CanvasRenderingContext2D, L: Look, x: number, y: number, w: number, h: number, r: number) {
  ctx.save();
  ctx.shadowColor = L.dark ? 'rgba(0,0,0,0.45)' : 'rgba(17,19,22,0.16)';
  ctx.shadowBlur = 60 * L.u; ctx.shadowOffsetY = 24 * L.u;
  ctx.fillStyle = L.card; ctx.beginPath(); ctx.roundRect(x, y, w, h, r); ctx.fill();
  ctx.restore();
  if (L.dark) { ctx.save(); ctx.strokeStyle = 'rgba(255,255,255,0.08)'; ctx.lineWidth = 1.5 * L.u; ctx.beginPath(); ctx.roundRect(x, y, w, h, r); ctx.stroke(); ctx.restore(); }
}
function iconTile(ctx: CanvasRenderingContext2D, L: Look, icon: string, x: number, y: number, s: number, prog: number, accent: boolean) {
  ctx.save();
  ctx.fillStyle = accent ? L.acc : L.dark ? '#22262d' : '#EEF0EE';
  ctx.beginPath(); ctx.roundRect(x, y, s, s, s * 0.28); ctx.fill();
  ctx.restore();
  const ink = accent ? (lum(L.acc) > 0.5 ? '#111316' : '#FFFFFF') : L.ink;
  drawIcon(ctx, icon, x + s * 0.22, y + s * 0.22, s * 0.56, ink, prog, 2.2);
}
function text(ctx: CanvasRenderingContext2D, s: string, x: number, y: number, size: number, font: { font: string; weight: number }, color: string, align: CanvasTextAlign = 'left', a = 1, rise = 0) {
  if (a <= 0) return;
  setText(ctx, font, size);
  ctx.save(); ctx.globalAlpha *= a; ctx.fillStyle = color; ctx.textAlign = align; ctx.textBaseline = 'middle';
  ctx.fillText(s, x, y + rise);
  ctx.restore();
}
/** Headline with a mask rise (the whole line rises from a clip, so no half glyphs). */
function headline(ctx: CanvasRenderingContext2D, L: Look, s: string, x: number, y: number, size: number, vt: number, t0: number, align: CanvasTextAlign = 'left', color = L.ink) {
  const e = inn(vt, t0, 0.55);
  if (e <= 0) return;
  setText(ctx, { font: L.display, weight: L.dw }, size);
  ctx.save();
  ctx.beginPath(); ctx.rect(0, y - size * 0.75, L.W, size * 1.5); ctx.clip();
  ctx.fillStyle = color; ctx.textAlign = align; ctx.textBaseline = 'middle';
  ctx.fillText(cap(L, s), x, y + (1 - e) * size * 1.1);
  ctx.restore();
  resetTracking(ctx);
}

// ---------- entrances (one per scene kind, so cuts never repeat) ----------
function entrance(ctx: CanvasRenderingContext2D, kind: SceneKind, vt: number, W: number, H: number) {
  const e = restE(clamp01(vt / 0.42));
  ctx.beginPath();
  switch (kind) {
    case 'graph': ctx.rect(0, 0, W * e, H); break;                       // wipe from the left
    case 'flow': ctx.rect(0, H * (1 - e), W, H * e); break;             // wipe up
    case 'compare': ctx.rect(W / 2 - (W / 2) * e, 0, W * e, H); break;  // doors open from the centre
    case 'stat': ctx.rect(0, 0, W, H * e); break;                        // wipe down
    default: {                                                           // container grows from the centre
      const w = lmix(W * 0.42, W, e), h = lmix(H * 0.3, H, e);
      ctx.roundRect(W / 2 - w / 2, H / 2 - h / 2, w, h, (1 - e) * 60);
    }
  }
  ctx.clip();
}

// ---------- the scenes ----------
/** Draws the visual for local time `vt` (seconds since it began). */
export function drawVisual(ctx: CanvasRenderingContext2D, v: Visual, shot: Shot, vt: number, vdur: number, W: number, H: number, pack: Pack, frameIdx: number, src?: FrameSrc | null) {
  if (vt < 0) return false;
  const L = lookOf(pack, W, H, v.kind);
  ctx.save();
  entrance(ctx, v.kind, vt, W, H);
  ctx.fillStyle = L.bg; ctx.fillRect(0, 0, W, H);
  // camera: settles from a slight push-in, then a slow dolly through the hold (log-space zoom)
  const z = lmix(1.06, 1, camE(clamp01(vt / 0.9))) * lmix(1, 1.035, clamp01(vt / Math.max(1.2, vdur)));
  ctx.translate(W / 2, H / 2); ctx.scale(z, z); ctx.translate(-W / 2, -H / 2);
  switch (v.kind) {
    case 'graph': graph(ctx, L, v, vt, vdur); break;
    case 'flow': flow(ctx, L, v, vt, vdur); break;
    case 'stat': stat(ctx, L, v, vt, vdur); break;
    case 'compare': compare(ctx, L, v, vt); break;
    case 'quote': quote(ctx, L, v, shot, vt, src ?? null); break;
    default: object(ctx, L, v, vt, vdur, shot);
  }
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  texture(ctx, W, H, L.dark ? 0.12 : 0.16, frameIdx);
  vignette(ctx, W, H, L.dark ? 0.42 : 0.16);
  ctx.restore();
  return true;
}

/** 3D lit hero object with three info chips at different depths, tied to it by drawn connectors. */
function object(ctx: CanvasRenderingContext2D, L: Look, v: Visual, vt: number, vdur: number, shot: Shot) {
  const { W, H, u } = L;
  const tall = H > W;
  const cx = W / 2, cy = tall ? H * 0.47 : H * 0.52;
  const hero = Math.min(W * 0.62, H * 0.42);
  const d = inn(vt, 0.05, 0.6);
  ctx.save(); ctx.globalAlpha = 0.18 * d; ctx.fillStyle = L.acc;
  ctx.beginPath(); ctx.ellipse(cx, cy, hero * 0.62 * (0.8 + 0.2 * d), hero * 0.62 * (0.8 + 0.2 * d), 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  ctx.save(); ctx.globalAlpha = 0.25 * d; ctx.fillStyle = '#000'; ctx.filter = `blur(${12 * u}px)`;
  ctx.beginPath(); ctx.ellipse(cx, cy + hero * 0.52, hero * 0.34, hero * 0.05, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  const heroIcon = v.icons[0];
  const c3 = ready3D() ? render3DIcon('scene-' + shot.key, heroIcon, L.acc, vt, Math.round(hero)) : null;
  const hs = inn(vt, 0.1, 0.7);
  if (c3) { ctx.save(); ctx.globalAlpha = hs; ctx.drawImage(c3, cx - hero / 2, cy - hero / 2 + (1 - hs) * 40 * u, hero, hero); ctx.restore(); }
  else iconTile(ctx, L, heroIcon, cx - hero * 0.32, cy - hero * 0.32 + (1 - hs) * 40 * u, hero * 0.64, hs, true);
  const slots = tall ? [[0.07, 0.2], [0.55, 0.28], [0.1, 0.7]] : [[0.06, 0.2], [0.68, 0.24], [0.66, 0.7]];
  const chipW = (tall ? 0.42 : 0.28) * W, chipH = 124 * u;
  const drift = (vt / Math.max(1.5, vdur)) * 24 * u;
  slots.forEach(([sx, sy], i) => {
    const label = v.labels[i] ?? '';
    if (!label) return;
    const t0 = 0.35 + i * 0.14;
    const e = inn(vt, t0, 0.5);
    if (e <= 0) return;
    const depth = [1.4, 0.8, 1.1][i];
    const x = sx * W - drift * depth, y = sy * H + (1 - e) * 50 * u;
    const ce = inn(vt, t0 + 0.12, 0.45);
    ctx.save(); ctx.strokeStyle = rgba(L.acc, 0.55); ctx.lineWidth = 2 * u; ctx.setLineDash([6 * u, 8 * u]);
    const ax = x + chipW / 2, ay = y + chipH / 2;
    ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(ax + (cx - ax) * 0.55 * ce, ay + (cy - ay) * 0.55 * ce); ctx.stroke(); ctx.restore();
    ctx.save(); ctx.globalAlpha = e;
    shadowCard(ctx, L, x, y, chipW, chipH, 28 * u);
    iconTile(ctx, L, v.icons[i + 1] ?? 'star', x + 18 * u, y + 18 * u, chipH - 36 * u, inn(vt, t0 + 0.1, 0.5), false);
    text(ctx, cap(L, label), x + chipH + 6 * u, y + chipH / 2, 46 * u, { font: L.body, weight: 700 }, L.ink);
    ctx.restore();
  });
  headline(ctx, L, v.key, cx, tall ? H * 0.86 : H * 0.1, (tall ? 120 : 96) * u, vt, 0.25, 'center');
}

/** Area chart: grid, filled area, line with a live head, the spoken number in a tag; the camera follows the head. */
function graph(ctx: CanvasRenderingContext2D, L: Look, v: Visual, vt: number, vdur: number) {
  const { W, H, u } = L;
  const x0 = W * 0.08, x1 = W * 1.25, y0 = H * 0.8, y1 = H * 0.3;
  const pts: [number, number][] = [];
  const n = 9;
  for (let i = 0; i <= n; i++) { const f = i / n; const wob = Math.sin(i * 1.7) * 0.06 * (1 - f); pts.push([x0 + (x1 - x0) * f, y0 + (y1 - y0) * Math.pow(f, 1.6) + wob * (y0 - y1)]); }
  const prog = restE(p(vt, 0.15, Math.max(1, vdur * 0.8)));
  const headX = x0 + (x1 - x0) * prog;
  const at = (x: number) => { for (let i = 1; i < pts.length; i++) if (x <= pts[i][0]) { const a = pts[i - 1], b = pts[i]; const f = (x - a[0]) / (b[0] - a[0]); return a[1] + (b[1] - a[1]) * f; } return pts[pts.length - 1][1]; };
  const headY = at(headX);
  const camX = Math.max(0, headX - W * 0.66);
  ctx.save(); ctx.translate(-camX * 0.35, 0);
  for (let i = 0, x = 0; x < W * 1.6; i++, x += 45 * u) { ctx.strokeStyle = i % 4 === 0 ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.035)'; ctx.lineWidth = 1.2 * u; ctx.beginPath(); ctx.moveTo(x, H * 0.2); ctx.lineTo(x, H * 0.88); ctx.stroke(); }
  for (let y = H * 0.2; y < H * 0.88; y += 45 * u) { ctx.strokeStyle = 'rgba(255,255,255,0.035)'; ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W * 1.6, y); ctx.stroke(); }
  ctx.restore();
  ctx.save(); ctx.translate(-camX, 0);
  for (let i = 0; i < 12; i++) {
    const bx = x0 + i * (x1 - x0) / 12; if (bx > headX) break;
    const bh = (y0 - at(bx)) * 0.55; const e = inn(vt, 0.15 + i * 0.05, 0.4);
    ctx.fillStyle = rgba(L.acc, 0.1); ctx.fillRect(bx + 6 * u, y0 - bh * e, (x1 - x0) / 12 - 12 * u, bh * e);
  }
  const gr = ctx.createLinearGradient(0, y1, 0, y0); gr.addColorStop(0, rgba(L.acc, 0.32)); gr.addColorStop(1, rgba(L.acc, 0));
  ctx.fillStyle = gr; ctx.beginPath(); ctx.moveTo(x0, y0);
  for (const q of pts) { if (q[0] > headX) break; ctx.lineTo(q[0], q[1]); }
  ctx.lineTo(headX, headY); ctx.lineTo(headX, y0); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = L.acc; ctx.lineWidth = 6 * u; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
  for (const q of pts) { if (q[0] > headX) break; ctx.lineTo(q[0], q[1]); }
  ctx.lineTo(headX, headY); ctx.stroke();
  ctx.setLineDash([5 * u, 7 * u]); ctx.strokeStyle = rgba(L.acc, 0.6); ctx.lineWidth = 2 * u;
  ctx.beginPath(); ctx.moveTo(headX, headY); ctx.lineTo(headX, y0); ctx.stroke(); ctx.setLineDash([]);
  ctx.fillStyle = L.bg; ctx.beginPath(); ctx.arc(headX, headY, 15 * u, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = L.acc; ctx.lineWidth = 6 * u; ctx.stroke();
  const tag = v.number ?? cap(L, v.key);
  const te = inn(vt, 0.3, 0.45);
  setText(ctx, { font: L.display, weight: L.dw }, 64 * u);
  const tw = ctx.measureText(tag).width + 56 * u;
  ctx.save(); ctx.globalAlpha = te; ctx.translate(headX - tw / 2, headY - 130 * u + (1 - te) * 20 * u);
  ctx.fillStyle = L.acc; ctx.beginPath(); ctx.roundRect(0, 0, tw, 92 * u, 46 * u); ctx.fill();
  ctx.beginPath(); ctx.moveTo(tw / 2 - 14 * u, 92 * u); ctx.lineTo(tw / 2, 110 * u); ctx.lineTo(tw / 2 + 14 * u, 92 * u); ctx.fill();
  ctx.fillStyle = lum(L.acc) > 0.5 ? '#0d0f12' : '#FFFFFF'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(tag, tw / 2, 47 * u);
  ctx.restore();
  resetTracking(ctx);
  ctx.restore();
  ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.fillRect(0, y0, W, 2 * u);
  headline(ctx, L, v.key, W * 0.08, H * 0.12, 110 * u, vt, 0.1);
  if (v.labels[0]) text(ctx, cap(L, v.labels.slice(0, 2).join(' · ')), W * 0.08, H * 0.12 + 100 * u, 38 * u, { font: L.body, weight: 600 }, L.mute, 'left', inn(vt, 0.35, 0.5));
}

/** Process flow: three step cards down a winding line; a dot travels it and the camera follows. */
function flow(ctx: CanvasRenderingContext2D, L: Look, v: Visual, vt: number, vdur: number) {
  const { W, H, u } = L;
  const tall = H > W;
  const steps = [0, 1, 2].map((i) => ({ label: v.labels[i] ?? v.key, icon: v.icons[i] }));
  const nodes = tall
    ? steps.map((_, i) => [i % 2 ? W * 0.58 : W * 0.42, H * (0.3 + i * 0.25)] as [number, number])
    : steps.map((_, i) => [W * (0.2 + i * 0.3), H * (i % 2 ? 0.62 : 0.46)] as [number, number]);
  const dotP = restE(p(vt, 0.2, Math.max(1.1, vdur * 0.75)));
  const camY = tall ? (dotP - 0.5) * H * 0.08 : 0;
  ctx.save(); ctx.translate(0, -camY);
  const path = new Path2D();
  path.moveTo(nodes[0][0], nodes[0][1] - H * 0.12);
  nodes.forEach((n, i) => { if (i === 0) path.lineTo(n[0], n[1]); else { const a = nodes[i - 1]; path.bezierCurveTo(a[0], (a[1] + n[1]) / 2, n[0], (a[1] + n[1]) / 2, n[0], n[1]); } });
  const len = tall ? H * 1.1 : W * 1.1;
  ctx.save(); ctx.strokeStyle = L.line; ctx.lineWidth = 5 * u; ctx.stroke(path); ctx.restore();
  ctx.save(); ctx.strokeStyle = rgba(L.acc, 0.9); ctx.lineWidth = 5 * u; ctx.lineCap = 'round';
  ctx.setLineDash([len * inn(vt, 0.05, 1.2), len]); ctx.stroke(path); ctx.restore();
  // the dot travels under the cards, so it never covers their text
  const seg = Math.min(1.999, dotP * 2), si = Math.floor(seg), f = seg - si;
  const a = nodes[si], b = nodes[si + 1];
  const dx = a[0] + (b[0] - a[0]) * f, dy = a[1] + (b[1] - a[1]) * f;
  ctx.fillStyle = L.acc; ctx.beginPath(); ctx.arc(dx, dy, 13 * u, 0, Math.PI * 2); ctx.fill();
  const cw = tall ? W * 0.7 : W * 0.27, ch = 190 * u;
  nodes.forEach(([x, y], i) => {
    const t0 = 0.25 + i * 0.32;
    const e = inn(vt, t0, 0.5);
    if (e <= 0) return;
    const reached = dotP >= i / 2 - 0.02;
    const cx = x - cw / 2, cy = y - ch / 2 + (1 - e) * 40 * u;
    ctx.save(); ctx.globalAlpha = e;
    shadowCard(ctx, L, cx, cy, cw, ch, 30 * u);
    iconTile(ctx, L, steps[i].icon, cx + 22 * u, cy + 22 * u, ch - 44 * u, inn(vt, t0 + 0.1, 0.5), reached);
    text(ctx, String(i + 1).padStart(2, '0'), cx + ch + 10 * u, cy + ch * 0.32, 36 * u, { font: L.body, weight: 700 }, L.acc);
    text(ctx, cap(L, steps[i].label), cx + ch + 10 * u, cy + ch * 0.64, 60 * u, { font: L.body, weight: 800 }, L.ink);
    ctx.restore();
  });
  ctx.restore();
  headline(ctx, L, v.key, W * 0.5, tall ? H * 0.1 : H * 0.14, (tall ? 110 : 90) * u, vt, 0.05, 'center');
}

/** Stat: the spoken number counts up inside a progress ring, with its label and the transcript's context words. */
function stat(ctx: CanvasRenderingContext2D, L: Look, v: Visual, vt: number, vdur: number) {
  const { W, H, u } = L;
  const cx = W / 2, cy = H * 0.46, R = Math.min(W * 0.36, H * 0.24);
  const raw = v.number ?? '';
  const m = raw.match(/^([^\d]*)([\d,.]+)(.*)$/);
  const target = m ? parseFloat(m[2].replace(/,/g, '')) : 0;
  const ring = restE(p(vt, 0.15, Math.max(0.9, Math.min(1.6, vdur * 0.6))));
  ctx.save(); ctx.lineWidth = 22 * u; ctx.lineCap = 'round';
  ctx.strokeStyle = 'rgba(255,255,255,0.07)'; ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.stroke();
  ctx.strokeStyle = L.acc; ctx.beginPath(); ctx.arc(cx, cy, R, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * 0.82 * ring); ctx.stroke();
  for (let i = 0; i < 48; i++) { const ang = (i / 48) * Math.PI * 2 - Math.PI / 2; const r0 = R + 30 * u, r1 = R + (i % 4 ? 38 : 50) * u; ctx.strokeStyle = i / 48 <= 0.82 * ring ? rgba(L.acc, 0.6) : 'rgba(255,255,255,0.12)'; ctx.lineWidth = 3 * u; ctx.beginPath(); ctx.moveTo(cx + Math.cos(ang) * r0, cy + Math.sin(ang) * r0); ctx.lineTo(cx + Math.cos(ang) * r1, cy + Math.sin(ang) * r1); ctx.stroke(); }
  ctx.restore();
  const shown = m ? `${m[1]}${fmt(target * ring, m[2])}${m[3]}` : cap(L, v.key);
  setText(ctx, { font: L.display, weight: L.dw }, Math.min(R * 0.8, 240 * u));
  ctx.save(); ctx.fillStyle = L.ink; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(shown, cx, cy); ctx.restore();
  resetTracking(ctx);
  text(ctx, cap(L, v.key), cx, cy + R + 110 * u, 72 * u, { font: L.display, weight: L.dw }, L.ink, 'center', inn(vt, 0.35, 0.5), (1 - inn(vt, 0.35, 0.5)) * 30 * u);
  if (v.labels[0]) text(ctx, cap(L, v.labels.slice(0, 2).join(' · ')), cx, cy + R + 190 * u, 38 * u, { font: L.body, weight: 600 }, L.mute, 'center', inn(vt, 0.5, 0.5));
}
function fmt(x: number, like: string) {
  const dec = (like.split('.')[1] ?? '').length;
  const s = x.toFixed(dec);
  return like.includes(',') ? Number(s).toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec }) : s;
}

/** Compare: two cards; the second (the point being made) lands in the accent with a drawn check. */
function compare(ctx: CanvasRenderingContext2D, L: Look, v: Visual, vt: number) {
  const { W, H, u } = L;
  const tall = H > W;
  const cw = tall ? W * 0.8 : W * 0.36, ch = tall ? H * 0.29 : H * 0.5;
  const pos = tall ? [[W * 0.1, H * 0.16], [W * 0.1, H * 0.53]] : [[W * 0.1, H * 0.28], [W * 0.54, H * 0.28]];
  const names = [v.labels[0] ?? 'Before', v.key];
  pos.forEach(([x, y], i) => {
    const t0 = 0.2 + i * 0.35;
    const e = inn(vt, t0, 0.55);
    if (e <= 0) return;
    const win = i === 1;
    ctx.save(); ctx.globalAlpha = win ? e : e * 0.9;
    const yy = y + (1 - e) * 60 * u;
    if (win) { ctx.save(); ctx.shadowColor = 'rgba(17,19,22,0.18)'; ctx.shadowBlur = 70 * u; ctx.shadowOffsetY = 28 * u; ctx.fillStyle = L.acc; ctx.beginPath(); ctx.roundRect(x, yy, cw, ch, 36 * u); ctx.fill(); ctx.restore(); }
    else shadowCard(ctx, L, x, yy, cw, ch, 36 * u);
    const ink = win ? (lum(L.acc) > 0.5 ? '#111316' : '#FFFFFF') : L.mute;
    drawIcon(ctx, v.icons[i], x + 44 * u, yy + 44 * u, 120 * u, ink, inn(vt, t0 + 0.1, 0.5), 2);
    text(ctx, cap(L, names[i]), x + 44 * u, yy + ch - 70 * u, (tall ? 76 : 64) * u, { font: L.display, weight: L.dw }, win ? ink : L.ink);
    const me = inn(vt, t0 + 0.35, 0.4);
    ctx.strokeStyle = ink; ctx.lineWidth = 7 * u; ctx.lineCap = 'round';
    const mx = x + cw - 110 * u, my = yy + 70 * u;
    ctx.beginPath();
    if (win) { const a = Math.min(1, me * 2), b = Math.max(0, me * 2 - 1); ctx.moveTo(mx, my); ctx.lineTo(mx + 24 * u * a, my + 24 * u * a); if (b > 0) ctx.lineTo(mx + 24 * u + 40 * u * b, my + 24 * u - 48 * u * b); }
    else { ctx.moveTo(mx, my); ctx.lineTo(mx + 56 * u * me, my); }
    ctx.stroke();
    ctx.restore();
  });
  text(ctx, 'vs', W * 0.5, tall ? H * 0.5 : H * 0.53, 44 * u, { font: L.body, weight: 800 }, L.mute, 'center', inn(vt, 0.45, 0.4));
}

/** Quote: the speaker's own frame in a circle above the statement; the key word gets the underline. */
function quote(ctx: CanvasRenderingContext2D, L: Look, v: Visual, shot: Shot, vt: number, src: FrameSrc | null) {
  const { W, H, u } = L;
  const words = (shot.text || v.text).split(/\s+/).filter(Boolean).slice(0, 9);
  const pe = inn(vt, 0.05, 0.6);
  ctx.save(); ctx.globalAlpha = 0.14 * pe; ctx.fillStyle = '#000';
  ctx.beginPath(); ctx.roundRect(W * 0.06 + 18 * u, H * 0.3 + 22 * u, W * 0.88, H * 0.44, 40 * u); ctx.fill(); ctx.restore();
  const ae = inn(vt, 0.15, 0.55);
  const ar = Math.min(W, H) * 0.12, ax = W * 0.1 + ar, ay = H * 0.2;
  if (src && ae > 0) {
    ctx.save(); ctx.globalAlpha = ae; ctx.beginPath(); ctx.arc(ax, ay, ar * (0.85 + 0.15 * ae), 0, Math.PI * 2); ctx.clip();
    const s = Math.max((ar * 2) / src.w, (ar * 2.4) / src.h); const iw = src.w * s, ih = src.h * s;
    ctx.drawImage(src.img, ax - iw / 2, ay - ih * 0.38, iw, ih); ctx.restore();
    ctx.save(); ctx.globalAlpha = ae; ctx.strokeStyle = L.ink; ctx.lineWidth = 5 * u; ctx.beginPath(); ctx.arc(ax, ay, ar * (0.85 + 0.15 * ae) + 8 * u, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
  }
  const size = (H > W ? 96 : 84) * u;
  setText(ctx, { font: L.display, weight: L.dw }, size);
  const lines: string[] = []; let cur = '';
  for (const w of words) { const t = cur ? cur + ' ' + w : w; if (ctx.measureText(cap(L, t)).width > W * 0.8 && cur) { lines.push(cur); cur = w; } else cur = t; }
  if (cur) lines.push(cur);
  const top = H * 0.42;
  lines.forEach((ln, i) => {
    const y = top + i * size * 1.12;
    headline(ctx, L, ln, W * 0.1, y, size, vt, 0.3 + i * 0.12, 'left', L.ink);
    const kw = v.key.toLowerCase();
    const idx = ln.toLowerCase().indexOf(kw);
    if (idx >= 0 && kw) {
      setText(ctx, { font: L.display, weight: L.dw }, size);
      const pre = ctx.measureText(cap(L, ln.slice(0, idx))).width, kwW = ctx.measureText(cap(L, ln.slice(idx, idx + kw.length))).width;
      const ue = inn(vt, 0.75 + i * 0.12, 0.45);
      ctx.fillStyle = L.ink; ctx.fillRect(W * 0.1 + pre, y + size * 0.55, kwW * ue, 8 * u);
      resetTracking(ctx);
    }
  });
  setText(ctx, { font: L.display, weight: L.dw }, 300 * u);
  ctx.save(); ctx.globalAlpha = 0.2 * pe; ctx.fillStyle = L.ink; ctx.textAlign = 'right'; ctx.textBaseline = 'alphabetic'; ctx.fillText('”', W * 0.92, H * 0.34); ctx.restore();
  resetTracking(ctx);
}
