// Look → Background: the last layer under the design (preset colour, any colour, a gradient or a photo).
// Changing it recolours the preset so headlines, small type and accents still read on the new layer.
import type { Pack, PackBase } from './packs';
import { BG_GRADIENTS } from './packs';
import { lum } from './text';

export type BaseBg =
  | { base: 'preset' }
  | { base: 'color'; color: string }
  | { base: 'gradient'; id: string }
  | { base: 'photo'; dim: number };

export interface BasePhoto { img: CanvasImageSource; w: number; h: number; avg: string }

export const BASE_COLORS = [
  '#111110', '#1E1714', '#0F1A15', '#2B2D2F', '#3B4A3F', '#163330', '#7A1F2B', '#A3141B', '#D93A6E',
  '#D97757', '#F5C842', '#C4CFA1', '#E3EFE6', '#F6E7E2', '#F3EBDD', '#ECEAE3', '#D9D5CE', '#FFFFFF',
];

const hx = (v: number) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0');
const rgb = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const ok = (h: string) => /^#[0-9a-f]{6}$/i.test(h);
export function mix(a: string, b: string, t: number) {
  if (!ok(a) || !ok(b)) return a;
  const x = rgb(a), y = rgb(b);
  return '#' + x.map((v, i) => hx(v + (y[i] - v) * t)).join('');
}
export const contrast = (a: string, b: string) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };

/** Move a colour toward `to` until it reaches `min` contrast with `bg`. */
function reach(c: string, bg: string, to: string, min: number) {
  if (contrast(c, bg) >= min) return c;
  for (let t = 0.1; t <= 1.001; t += 0.1) { const m = mix(c, to, t); if (contrast(m, bg) >= min) return m; }
  return to;
}

/** Average colour of a photo (for type decisions on top of it). */
export function photoAvg(img: CanvasImageSource): string {
  const c = document.createElement('canvas');
  c.width = 12; c.height = 12;
  const g = c.getContext('2d', { willReadFrequently: true })!;
  g.drawImage(img, 0, 0, 12, 12);
  const d = g.getImageData(0, 0, 12, 12).data;
  let r = 0, gg = 0, b = 0;
  for (let i = 0; i < d.length; i += 4) { r += d[i]; gg += d[i + 1]; b += d[i + 2]; }
  const n = d.length / 4;
  return '#' + hx(r / n) + hx(gg / n) + hx(b / n);
}

/** The preset with a new last layer: bg (and a matching surface, ink, muted and accent) follow it. */
export function withBase(p: Pack, b: BaseBg | undefined, photo: BasePhoto | null): Pack {
  if (!b || b.base === 'preset') return p;
  let bg: string;
  let base: PackBase | undefined;
  if (b.base === 'color') {
    if (!ok(b.color)) return p;
    bg = b.color.toUpperCase();
  } else if (b.base === 'gradient') {
    const g = BG_GRADIENTS.find((x) => x.id === b.id) ?? BG_GRADIENTS[0];
    bg = mix(g.a, g.b, 0.5);
    base = { kind: 'gradient', a: g.a, b: g.b, angle: g.angle };
  } else {
    if (!photo) return p;
    bg = mix(photo.avg, '#000000', b.dim);
    base = { kind: 'photo', img: photo.img, w: photo.w, h: photo.h, dim: b.dim };
  }
  const dark = lum(bg) < 0.22;
  // Ink: the preset's own if it still reads, else its other end (its own bg), else plain light / dark.
  const ink = [p.ink, p.bg, dark ? '#F5F2EC' : '#151515'].find((c) => contrast(c, bg) >= 4.5) ?? (dark ? '#FFFFFF' : '#111111');
  const muted = reach(mix(ink, bg, 0.42), bg, ink, 3);
  const accent = reach(p.accent, bg, dark ? '#FFFFFF' : '#111111', 3);
  return { ...p, bg, bg2: mix(bg, ink, 0.07), ink, muted, accent, base };
}
