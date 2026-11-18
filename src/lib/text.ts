// Text layers: Premiere-style properties for every piece of on-screen text, their defaults per
// preset/format, and the shared drawing helpers (font, tracking, case, word layout, hit boxes).
import type { CaptionStyleId, Pack } from './packs';

export type LayerId = 'hook' | 'caption' | 'behind' | 'headline' | 'body';

export const LAYERS: { id: LayerId; name: string; hint: string; placed: boolean }[] = [
  { id: 'hook', name: 'Hook title', hint: 'Opening headline over the first shot', placed: true },
  { id: 'caption', name: 'Captions', hint: 'Word-synced subtitles', placed: true },
  { id: 'behind', name: 'Text behind subject', hint: 'Giant word behind the head', placed: true },
  { id: 'headline', name: 'Graphic headlines', hint: 'Titles in splits, circles and full graphics', placed: false },
  { id: 'body', name: 'Graphic body', hint: 'Small lines under the titles', placed: false },
];

export type TextCase = 'as-is' | 'upper' | 'lower' | 'title';
export type Align = 'left' | 'center' | 'right';

export interface TextProps {
  visible: boolean;
  font: string; weight: number; italic: boolean; size: number;
  align: Align; tracking: number; leading: number; textCase: TextCase;
  fill: string; accent: string; stroke: number; strokeColor: string; shadow: number;
  bg: boolean; bgColor: string; bgOpacity: number;
  fade: 'auto' | 'none' | 'bottom' | 'top';
  x: number; y: number; scale: number; rotation: number; opacity: number;
}
export type TextOverrides = Partial<Record<LayerId, Partial<TextProps>>>;

export const FONT_FAMILIES: { name: string; weights: number[]; italic?: boolean }[] = [
  { name: 'Anton', weights: [400] },
  { name: 'Archivo', weights: [400, 500, 600, 700, 800, 900], italic: true },
  { name: 'Bebas Neue', weights: [400] },
  { name: 'Bricolage Grotesque', weights: [400, 500, 600, 700, 800] },
  { name: 'Caveat', weights: [400, 500, 600, 700] },
  { name: 'Chakra Petch', weights: [400, 500, 600, 700] },
  { name: 'Cormorant Garamond', weights: [400, 500, 600, 700] },
  { name: 'DM Serif Display', weights: [400], italic: true },
  { name: 'Fraunces', weights: [400, 500, 600, 700, 800, 900], italic: true },
  { name: 'Fredoka', weights: [400, 500, 600, 700] },
  { name: 'Geist', weights: [400, 500, 600, 700, 800, 900] },
  { name: 'Instrument Serif', weights: [400], italic: true },
  { name: 'JetBrains Mono', weights: [400, 500, 600, 700, 800], italic: true },
  { name: 'Manrope', weights: [400, 500, 600, 700, 800] },
  { name: 'Montserrat', weights: [400, 500, 600, 700, 800, 900], italic: true },
  { name: 'Oswald', weights: [400, 500, 600, 700] },
  { name: 'Sora', weights: [400, 500, 600, 700, 800] },
  { name: 'Space Grotesk', weights: [400, 500, 600, 700] },
];
/** Relative luminance of a #RRGGBB colour (0 black to 1 white). */
export function lum(hex: string) {
  const h = hex.replace('#', '');
  if (h.length < 6) return 1;
  const c = [0, 2, 4].map((i) => { const v = parseInt(h.slice(i, i + 2), 16) / 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}
/** A colour readable on footage or the black fade: mix toward white until it is light enough. */
export function lift(hex: string, min = 0.28) {
  if (!/^#[0-9a-f]{6}$/i.test(hex) || lum(hex) >= min) return hex;
  const n = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  for (let k = 0.1; k <= 0.9; k += 0.1) {
    const m = n.map((v) => Math.round(v + (255 - v) * k));
    const out = '#' + m.map((v) => v.toString(16).padStart(2, '0')).join('');
    if (lum(out) >= min) return out;
  }
  return '#FFFFFF';
}
export const WEIGHT_NAMES: Record<number, string> = { 300: 'Light', 400: 'Regular', 500: 'Medium', 600: 'Semibold', 700: 'Bold', 800: 'Extrabold', 900: 'Black' };

type Geo = { tall: boolean; wide: boolean; capY: number; capSize: number };
const geoOf = (W: number, H: number): Geo => {
  const wide = W > H, tall = H / W > 1.5;
  return { wide, tall, capY: wide ? 0.86 : tall ? 0.785 : 0.85, capSize: wide ? 46 : tall ? 58 : 50 };
};

export function capFont(style: CaptionStyleId, pack: Pack): { font: string; weight: number; italic: boolean; textCase: TextCase } {
  const sans = /Serif|Fraunces|Mono/.test(pack.caption) ? 'Montserrat' : pack.caption;
  switch (style) {
    case 'pop': case 'outline': return { font: sans, weight: 900, italic: false, textCase: 'upper' };
    case 'stack': return { font: 'Anton', weight: 400, italic: false, textCase: 'upper' };
    case 'serif': return { font: 'Instrument Serif', weight: 400, italic: true, textCase: 'lower' };
    case 'minimal': return { font: pack.body, weight: 700, italic: false, textCase: 'lower' };
    case 'frosted': return { font: pack.caption === 'Instrument Serif' ? 'Manrope' : pack.caption, weight: 700, italic: false, textCase: 'as-is' };
    case 'box': return { font: pack.caption, weight: pack.captionWeight, italic: pack.caption === 'Instrument Serif', textCase: 'as-is' };
    case 'one': return { font: pack.caption, weight: pack.captionWeight, italic: false, textCase: 'upper' };
    case 'ticker': return { font: pack.caption, weight: 700, italic: false, textCase: 'as-is' };
    default: return { font: pack.caption, weight: 800, italic: pack.caption === 'Instrument Serif', textCase: 'as-is' };
  }
}

export function layerDefaults(id: LayerId, pack: Pack, W: number, H: number, capStyle: CaptionStyleId): TextProps {
  const g = geoOf(W, H);
  const base: TextProps = {
    visible: true, font: pack.display, weight: pack.displayWeight, italic: false, size: 100,
    align: 'left', tracking: 0, leading: 100, textCase: pack.displayCase === 'upper' ? 'upper' : 'as-is',
    fill: '#FFFFFF', accent: pack.accent, stroke: 0, strokeColor: '#000000', shadow: 0,
    bg: false, bgColor: '#000000', bgOpacity: 80, fade: 'auto',
    x: 0.5, y: 0.5, scale: 100, rotation: 0, opacity: 100,
  };
  switch (id) {
    case 'hook':
      return { ...base, size: g.wide ? 70 : g.tall ? 100 : 86, x: g.wide ? 0.05 : 0.07, y: g.wide ? 0.88 : g.tall ? 0.79 : 0.86, leading: 98 };
    case 'caption': {
      const f = capFont(capStyle, pack);
      const box = capStyle === 'box';
      const cb = rgbaParts(pack.capBox);
      return {
        ...base, ...f, size: g.capSize, align: 'center', x: 0.5, y: g.capY,
        fill: box ? pack.capInk : '#FFFFFF', accent: box ? pack.capHi : pack.accent,
        bg: box || capStyle === 'ticker' || capStyle === 'frosted',
        bgColor: box ? cb.hex : capStyle === 'frosted' ? '#FFFFFF' : '#0A0A0A', bgOpacity: box ? Math.round(cb.a * 100) : capStyle === 'frosted' ? 14 : 88, fade: 'none',
      };
    }
    case 'behind':
      return { ...base, font: 'Anton', weight: 400, size: 360, align: 'center', textCase: 'upper', leading: 88, x: 0.5, y: -1, fade: 'top' };
    case 'headline':
      return { ...base, fill: pack.ink, fade: 'none' };
    case 'body':
      return { ...base, font: pack.body, weight: pack.bodyWeight, textCase: 'as-is', fill: pack.muted, fade: 'none' };
  }
}

export const resolveText = (id: LayerId, pack: Pack, W: number, H: number, capStyle: CaptionStyleId, o?: TextOverrides): TextProps =>
  ({ ...layerDefaults(id, pack, W, H, capStyle), ...(o?.[id] ?? {}) });

export function caseText(s: string, c: TextCase) {
  if (c === 'upper') return s.toUpperCase();
  if (c === 'lower') return s.toLowerCase();
  if (c === 'title') return s.replace(/\p{L}[\p{L}'’]*/gu, (w) => w[0].toUpperCase() + w.slice(1).toLowerCase());
  return s;
}

export const fontStr = (p: { italic?: boolean; weight: number; font: string }, size: number) =>
  `${p.italic ? 'italic ' : ''}${p.weight} ${Math.max(1, Math.round(size))}px "${p.font}", sans-serif`;

const asked = new Set<string>();
/** Ask the browser for a font face the first time it is used; the next frame picks it up. */
export function ensureFont(spec: string) {
  if (asked.has(spec) || typeof document === 'undefined') return;
  asked.add(spec);
  document.fonts.load(spec.replace(/\d+px/, '40px')).catch(() => {});
}
export async function loadFonts(specs: string[]) {
  await Promise.all(specs.map((s) => document.fonts.load(s.replace(/\d+px/, '40px')).catch(() => []))).catch(() => {});
}

/** Set font + Premiere-style tracking (thousandths of an em). */
export function setText(ctx: CanvasRenderingContext2D, p: { italic?: boolean; weight: number; font: string; tracking?: number }, size: number) {
  const f = fontStr(p, size);
  ensureFont(f);
  ctx.font = f;
  (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = `${((p.tracking ?? 0) / 1000) * size}px`;
}
export function resetTracking(ctx: CanvasRenderingContext2D) { (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = '0px'; }

export interface WordLay { words: string[]; widths: number[]; space: number; lines: number[][]; lineW: number[] }
export function layWords(ctx: CanvasRenderingContext2D, words: string[], maxW: number, spaceMul = 1): WordLay {
  const space = ctx.measureText(' ').width * spaceMul;
  const widths = words.map((w) => ctx.measureText(w).width);
  const lines: number[][] = [[]];
  let cur = 0;
  words.forEach((_, i) => {
    const add = (lines[lines.length - 1].length ? space : 0) + widths[i];
    if (cur + add > maxW && lines[lines.length - 1].length) { lines.push([i]); cur = widths[i]; } else { lines[lines.length - 1].push(i); cur += add; }
  });
  const lineW = lines.map((l) => l.reduce((a, i, k) => a + widths[i] + (k ? space : 0), 0));
  return { words, widths, space, lines, lineW };
}

export interface Hit { id: LayerId; x: number; y: number; w: number; h: number; /** Anchor in canvas px, so a drag starts from where the layer really is. */ ax?: number; ay?: number }

/** Run fn inside the layer transform (anchor, rotation, scale) and record its on-screen box. */
export function placed(ctx: CanvasRenderingContext2D, ax: number, ay: number, p: Pick<TextProps, 'scale' | 'rotation' | 'opacity'>, box: { x: number; y: number; w: number; h: number }, id: LayerId, hits: Hit[] | undefined, fn: () => void) {
  const s = p.scale / 100, r = (p.rotation * Math.PI) / 180;
  ctx.save();
  ctx.translate(ax, ay);
  ctx.rotate(r);
  ctx.scale(s, s);
  ctx.globalAlpha *= p.opacity / 100;
  fn();
  ctx.restore();
  if (hits) {
    const pts = [[box.x, box.y], [box.x + box.w, box.y], [box.x, box.y + box.h], [box.x + box.w, box.y + box.h]].map(([x, y]) => {
      const X = x * s, Y = y * s;
      return [ax + X * Math.cos(r) - Y * Math.sin(r), ay + X * Math.sin(r) + Y * Math.cos(r)];
    });
    const xs = pts.map((q) => q[0]), ys = pts.map((q) => q[1]);
    hits.push({ id, x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys), ax, ay });
  }
}

export function drawSelection(ctx: CanvasRenderingContext2D, h: Hit, W: number) {
  const u = W / 1080;
  ctx.save();
  ctx.strokeStyle = '#4F7DF3';
  ctx.lineWidth = Math.max(1, 2.5 * u);
  ctx.setLineDash([10 * u, 7 * u]);
  ctx.strokeRect(h.x - 8 * u, h.y - 8 * u, h.w + 16 * u, h.h + 16 * u);
  ctx.setLineDash([]);
  ctx.fillStyle = '#FFFFFF';
  for (const [x, y] of [[h.x - 8 * u, h.y - 8 * u], [h.x + h.w + 8 * u, h.y - 8 * u], [h.x - 8 * u, h.y + h.h + 8 * u], [h.x + h.w + 8 * u, h.y + h.h + 8 * u]]) {
    ctx.fillRect(x - 6 * u, y - 6 * u, 12 * u, 12 * u);
    ctx.strokeRect(x - 6 * u, y - 6 * u, 12 * u, 12 * u);
  }
  ctx.restore();
}

export function rgbaParts(s: string): { hex: string; a: number } {
  const m = s.match(/rgba?\(([^)]+)\)/);
  if (!m) return { hex: s.slice(0, 7), a: 1 };
  const [r, g, b, a = '1'] = m[1].split(',').map((x) => x.trim());
  const h = (v: string) => Math.round(+v).toString(16).padStart(2, '0');
  return { hex: `#${h(r)}${h(g)}${h(b)}`.toUpperCase(), a: +a };
}

export function hexA(hex: string, a: number) {
  const h = hex.replace('#', '');
  if (h.length < 6) return hex;
  return `rgba(${parseInt(h.slice(0, 2), 16)},${parseInt(h.slice(2, 4), 16)},${parseInt(h.slice(4, 6), 16)},${a})`;
}
