// Motion quality (Basic / Great) and the two upgraded text layers.
// Rules: claude/ugentic-graphics-rules.md §7 (text layers) and §9 (editing logic).
//  - Normal caption  = the existing caption templates (captions.ts). Hidden, never deleted, under the others.
//  - Graphics caption = key word big + centred, the other words small in the gaps.
//  - Typography       = main-screen kinetic type: Graphics caption + letter stagger, mask rise, tracking, underline draw.
//  - Great = strong ease-out + spring, ~2-frame letter stagger, and true motion blur on export.
import type { Pack } from './packs';
import type { CapGroup, Shot } from './style';
import { clean, keywordOf } from './style';
import { setText, resetTracking, lift, lum, hexA } from './text';
import { bezier, clamp01, outExpo, popIn } from './ease';

export type MotionQuality = 'basic' | 'great';
export type TextLayer = 'normal' | 'graphics' | 'typo' | 'auto';
export const TEXT_LAYERS: { id: TextLayer; name: string; note: string }[] = [
  { id: 'auto', name: 'Auto', note: 'Normal caption on the speaker, Graphics caption on graphics, Typography on the last line' },
  { id: 'normal', name: 'Normal caption', note: 'Box or single line, the caption template you pick' },
  { id: 'graphics', name: 'Graphics caption', note: 'Key word big and centred, the rest small around it' },
  { id: 'typo', name: 'Typography', note: 'Main-screen kinetic type on every line' },
];

/** Strong ease-out (fast start, long settle): the "not AI" curve. */
export const strongOut = bezier(0.05, 0.85, 0.08, 1);
export const greatInOut = bezier(0.7, 0, 0.2, 1);
const FRAME = 1 / 30;

const A_ROLL = new Set(['full', 'punch', 'behind']);

/** Which text layer speaks for this caption group. */
export function layerFor(choice: TextLayer | undefined, shot: Shot, cap: CapGroup, isLast: boolean): Exclude<TextLayer, 'auto'> {
  const c = choice ?? 'normal';
  if (c !== 'auto') return c;
  if (A_ROLL.has(shot.layout)) return isLast ? 'typo' : 'normal';
  // cards and posters already carry the line as their own headline: keep the plain caption there
  if (shot.layout === 'card' || shot.layout === 'duotone') return 'normal';
  return 'graphics';
}

function split(cap: CapGroup) {
  const words = cap.words.map((w) => w.w.trim());
  const kw = keywordOf(cap.words).toLowerCase();
  let k = words.findIndex((w) => clean(w).toLowerCase() === kw);
  if (k < 0) { let best = 0; words.forEach((w, i) => { if (clean(w).length > clean(words[best]).length) best = i; }); k = best; }
  return { words, k, before: words.slice(0, k), after: words.slice(k + 1), key: clean(words[k]) || words[k] };
}

const accentOf = (pack: Pack) => (lum(pack.accent) >= 0.25 ? pack.accent : lum(pack.capHi) >= 0.25 ? pack.capHi : lift(pack.accent, 0.35));

/** 0→1 in, 1→0 out for the whole group (fade + blur in / out). */
function groupAlpha(cap: CapGroup, t: number, great: boolean) {
  const ease = great ? strongOut : outExpo;
  const inA = ease(clamp01((t - cap.outS + 0.02) / 0.28));
  const outA = clamp01((cap.outE - t) / 0.22);
  return Math.min(inA, outA);
}

/** Small words, revealed one by one on their spoken time with fade + blur. */
function smallLine(ctx: CanvasRenderingContext2D, ws: string[], cap: CapGroup, idx0: number, t: number, cx: number, y: number, size: number, font: { font: string; weight: number; italic?: boolean }, color: string, great: boolean) {
  if (!ws.length) return;
  setText(ctx, font, size);
  const space = ctx.measureText(' ').width;
  const widths = ws.map((w) => ctx.measureText(w).width);
  const total = widths.reduce((a, b) => a + b, 0) + space * (ws.length - 1);
  let x = cx - total / 2;
  ws.forEach((w, i) => {
    const wd = cap.words[idx0 + i];
    const p = clamp01((t - wd.s + 0.06) / (great ? 0.32 : 0.2));
    const e = (great ? strongOut : outExpo)(p);
    if (e > 0) {
      ctx.save();
      ctx.globalAlpha *= e;
      if (e < 1) ctx.filter = `blur(${((1 - e) * size * 0.18).toFixed(1)}px)`;
      ctx.fillStyle = color;
      ctx.fillText(w, x, y + (1 - e) * size * 0.25);
      ctx.restore();
    }
    x += widths[i] + space;
  });
}

/** The key word: Basic = word fade; Great = letters ~2 frames apart, mask rise, spring scale, tracking in. */
function keyWord(ctx: CanvasRenderingContext2D, word: string, start: number, t: number, cx: number, y: number, size: number, font: { font: string; weight: number; italic?: boolean }, color: string, great: boolean, tracking = 0) {
  setText(ctx, font, size);
  const lt = t - start + 0.04;
  if (lt <= 0) return 0;
  if (!great) {
    const e = outExpo(clamp01(lt / 0.24));
    ctx.save();
    ctx.globalAlpha *= e;
    if (e < 1) ctx.filter = `blur(${((1 - e) * size * 0.12).toFixed(1)}px)`;
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.fillText(word, cx, y + (1 - e) * size * 0.12);
    ctx.restore();
    return ctx.measureText(word).width;
  }
  const chars = [...word];
  const trk = tracking + (1 - strongOut(clamp01(lt / 0.6))) * 0.18; // em, tracks in while settling
  const widths = chars.map((c) => ctx.measureText(c).width);
  const total = widths.reduce((a, b) => a + b, 0) + trk * size * (chars.length - 1);
  const sc = 0.94 + 0.06 * popIn(clamp01(lt / 0.55));
  ctx.save();
  ctx.translate(cx, y);
  ctx.scale(sc, sc);
  // mask: letters rise from below a baseline line
  ctx.beginPath();
  ctx.rect(-total, -size * 1.1, total * 2, size * 1.45);
  ctx.clip();
  let x = -total / 2;
  chars.forEach((c, i) => {
    const p = clamp01((lt - i * 2 * FRAME) / 0.42);
    const e = strongOut(p);
    if (e > 0) {
      ctx.save();
      ctx.globalAlpha *= Math.min(1, e * 1.6);
      ctx.fillStyle = color;
      ctx.fillText(c, x, (1 - e) * size * 0.9);
      ctx.restore();
    }
    x += widths[i] + trk * size;
  });
  ctx.restore();
  return total * sc;
}

const fitSize = (ctx: CanvasRenderingContext2D, word: string, font: { font: string; weight: number; italic?: boolean }, maxW: number, maxSize: number) => {
  setText(ctx, font, 100);
  const w = ctx.measureText(word).width || 1;
  return Math.max(20, Math.min(maxSize, (maxW / w) * 100));
};

/** L2 Graphics caption. `cy` = vertical centre of the block. */
export function drawGraphicsCaption(ctx: CanvasRenderingContext2D, cap: CapGroup, t: number, W: number, H: number, pack: Pack, cy: number, great: boolean, onFootage: boolean) {
  const a = groupAlpha(cap, t, great);
  if (a <= 0) return;
  const u = Math.min(W, H) / 1080;
  const { words, k, before, after, key } = split(cap);
  const keyFont = { font: 'Instrument Serif', weight: 400, italic: true };
  const smallFont = { font: pack.body, weight: 600 };
  const keySize = fitSize(ctx, key, keyFont, W * 0.8, 175 * u);
  const small = 54 * u;
  const ink = onFootage ? '#FFFFFF' : pack.ink;
  const acc = onFootage ? accentOf(pack) : pack.accent;
  ctx.save();
  ctx.globalAlpha = a;
  if (a < 1) ctx.filter = `blur(${((1 - a) * 10 * u).toFixed(1)}px)`;
  if (onFootage) { ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 26 * u; ctx.shadowOffsetY = 3 * u; }
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  const yB = cy - keySize * 0.62 - small * 0.5, yK = cy, yA = cy + keySize * 0.62 + small * 0.5;
  smallLine(ctx, before, cap, 0, t, W / 2, yB, small, smallFont, ink, great);
  keyWord(ctx, key, cap.words[k].s, t, W / 2, yK, keySize, keyFont, acc, great);
  ctx.textAlign = 'left';
  smallLine(ctx, after, cap, k + 1, t, W / 2, yA, small, smallFont, ink, great);
  void words;
  resetTracking(ctx);
  ctx.restore();
}

/** L3 Typography: main-screen type over a dimmed frame, underline drawn under the key word. */
export function drawTypography(ctx: CanvasRenderingContext2D, cap: CapGroup, t: number, W: number, H: number, pack: Pack, great: boolean) {
  const a = groupAlpha(cap, t, great);
  if (a <= 0) return;
  const u = Math.min(W, H) / 1080;
  const { k, before, after, key } = split(cap);
  ctx.save();
  // dim the frame so the type owns the screen
  ctx.globalAlpha = a * 0.74;
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, W, H);
  ctx.globalAlpha = a;
  if (a < 1) ctx.filter = `blur(${((1 - a) * 12 * u).toFixed(1)}px)`;
  const keyFont = { font: pack.display, weight: Math.max(700, pack.displayWeight) };
  const word = pack.displayCase === 'upper' ? key.toUpperCase() : key;
  const keySize = fitSize(ctx, word, keyFont, W * 0.86, 300 * u);
  const small = 56 * u;
  const cy = H * 0.5;
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  smallLine(ctx, before, cap, 0, t, W / 2, cy - keySize * 0.7 - small * 0.4, small, { font: 'Instrument Serif', weight: 400, italic: true }, '#FFFFFF', great);
  const kw = keyWord(ctx, word, cap.words[k].s, t, W / 2, cy, keySize, keyFont, '#FFFFFF', great);
  // underline draws on once the letters have landed
  const ul = (great ? strongOut : outExpo)(clamp01((t - cap.words[k].s - (great ? 0.18 + 2 * FRAME * word.length : 0.15)) / 0.4));
  if (ul > 0 && kw > 0) {
    ctx.fillStyle = accentOf(pack);
    const h = Math.max(4, keySize * 0.06);
    ctx.fillRect(W / 2 - kw / 2, cy + keySize * 0.52, kw * ul, h);
  }
  smallLine(ctx, after, cap, k + 1, t, W / 2, cy + keySize * 0.78 + small * 0.6, small, { font: pack.body, weight: 600 }, hexA('#FFFFFF', 0.92), great);
  resetTracking(ctx);
  ctx.restore();
}

// ---------- true motion blur (export only) ----------
let acc: HTMLCanvasElement | null = null;
let tmp: HTMLCanvasElement | null = null;
const canvasOf = (c: HTMLCanvasElement | null, W: number, H: number) => {
  const cv = c ?? document.createElement('canvas');
  if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; }
  return cv;
};

/**
 * Renders `samples` sub-frames across a 180° shutter (half a frame) around `t` and averages them,
 * so fast moves smear like a real camera instead of strobing.
 */
export function motionBlurred(ctx: CanvasRenderingContext2D, W: number, H: number, t: number, fps: number, draw: (c: CanvasRenderingContext2D, t: number) => void, samples = 6, shutter = 0.5, cuts: number[] = []) {
  // the sub-frame window may not cross a hard cut (shot change, caption switch): clamp to the cut
  let lo = t - shutter / fps / 2, hi = t + shutter / fps / 2;
  for (const c of cuts) { if (c > lo && c <= t) lo = c; if (c > t && c < hi) hi = c - 1e-4; }
  acc = canvasOf(acc, W, H);
  tmp = canvasOf(tmp, W, H);
  const ac = acc.getContext('2d', { alpha: false })!;
  const tc = tmp.getContext('2d', { alpha: false })!;
  for (let j = 0; j < samples; j++) {
    const tj = Math.max(0, lo + ((j + 0.5) / samples) * (hi - lo));
    draw(tc, tj);
    ac.globalAlpha = 1 / (j + 1);
    ac.drawImage(tmp, 0, 0);
  }
  ac.globalAlpha = 1;
  ctx.drawImage(acc, 0, 0);
}

/** Every hard cut in an edit: shot boundaries and caption-group switches. */
export function cutsOf(edit: { shots: { outS: number }[]; caps: { outS: number; outE: number }[] }) {
  const c = new Set<number>();
  edit.shots.forEach((s) => c.add(s.outS));
  edit.caps.forEach((g) => { c.add(g.outS); c.add(g.outE); });
  return [...c].sort((a, b) => a - b);
}
