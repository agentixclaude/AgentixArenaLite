// Kinetic two-font lockup: a short line in one face and the main word(s) huge in another,
// centred. Big letters rise out of a mask about 2 frames apart with a short motion-blur trail,
// an accent rule draws under them, and the whole block leaves with the house fade + blur.
import type { MG } from './style';
import type { LockupFonts } from './looks';
import { setText, resetTracking } from './text';
import { clamp01, outExpo } from './ease';
import { fadeBlurWords } from './mg';

export interface LockupText { small: string; big: string; order?: 'small-big' | 'big-small' }
export interface LockupPaint { ink: string; accent: string; smallColor: string; underline?: boolean }
export interface Box { x: number; y: number; w: number; h: number }

const STOPS = new Set('a an the and or but so to of in on at for with from by is are was were be it its this that i you we they my your our me he she them his her as if then than there here what which who when where why how all just not no do does did can will have has had get got like really one part'.split(' '));
const bare = (w: string) => w.replace(/^[^\p{L}\p{N}$₹]+|[^\p{L}\p{N}%]+$/gu, '');

/** Split a phrase around its key word: a few lead-in words small, the key word big. */
export function lockupFromWords(words: string[], kw: string): LockupText {
  const ws = words.map(bare).filter(Boolean);
  if (!ws.length) return { small: '', big: kw };
  let i = ws.findIndex((w) => w.toLowerCase() === kw.toLowerCase());
  if (i < 0) i = ws.reduce((b, w, j) => (!STOPS.has(w.toLowerCase()) && w.length > ws[b].length ? j : b), 0);
  let big = ws[i];
  const nx = ws[i + 1];
  // Pair only names ("Google Takeout", "GPT 5"), not a key word and whatever verb follows it.
  if (nx && /^[A-Z0-9]/.test(nx) && !STOPS.has(nx.toLowerCase()) && (big + nx).length <= 14) big = `${big} ${nx}`;
  if (i >= 1) return { small: ws.slice(Math.max(0, i - 4), i).join(' '), big, order: 'small-big' };
  const rest = ws.slice(i + (big.includes(' ') ? 2 : 1), i + 6);
  return { small: rest.join(' '), big, order: 'big-small' };
}

/** Count a stat up from zero (keeps currency, separators and suffix). */
export function countUp(value: string, lt: number, dur: number) {
  const m = value.match(/^([$₹]?)([\d,.]+)(.*)$/);
  if (!m) return value;
  const target = parseFloat(m[2].replace(/,/g, ''));
  const dec = (m[2].split('.')[1] ?? '').length;
  const v = target * outExpo(clamp01((lt - 0.15) / Math.min(1.2, dur * 0.6)));
  return m[1] + (dec ? v.toFixed(dec) : Math.round(v).toLocaleString('en-US')) + m[3];
}

/** What a motion graphic says, as a lockup. */
export function lockupOf(mg: MG | undefined, fallback: string, lt: number, dur: number): LockupText {
  if (!mg) return { small: '', big: fallback };
  switch (mg.kind) {
    case 'keyword': {
      const sw = (mg.sub ?? '').split(/\s+/).filter(Boolean);
      const kw = mg.text.toLowerCase().split(/\s+/);
      const i = sw.findIndex((w) => bare(w).toLowerCase() === kw[0]);
      const tidy = (ws: string[]) => ws.join(' ').replace(/[,;:.!?]+$/, '');
      // The sub line usually contains the key word: keep only the words around it.
      if (i >= 1) return { small: tidy(sw.slice(Math.max(0, i - 4), i)), big: mg.text, order: 'small-big' };
      if (i === 0) return { small: tidy(sw.slice(kw.length, kw.length + 5)), big: mg.text, order: 'big-small' };
      const sub = mg.sub && mg.sub.toLowerCase() !== mg.text.toLowerCase() ? tidy(sw.slice(0, 6)) : '';
      return { small: sub, big: mg.text, order: 'small-big' };
    }
    case 'stat': return { small: mg.label, big: countUp(mg.value, lt, dur), order: 'big-small' };
    case 'list': return { small: mg.title, big: mg.items[0] ?? mg.title, order: 'small-big' };
    case 'quote': {
      const ws = mg.text.split(/\s+/);
      return { small: ws.slice(4, 9).join(' '), big: ws.slice(0, 4).join(' '), order: 'big-small' };
    }
    case 'cta': return { small: 'next step', big: mg.text.split(/\s+/).slice(0, 4).join(' '), order: 'small-big' };
    case 'word': return { small: mg.small, big: mg.big, order: mg.order };
    case 'hook': return { small: mg.small ?? '', big: mg.big ?? mg.text, order: mg.order };
  }
}

/** Gap from the last big baseline to the rule: clears descenders in mixed-case faces. */
const ruleOff = (size: number, F: LockupFonts) => size * (F.big.upper ? 0.16 : 0.3);

interface Laid { big: string[]; bigSize: number; bigW: number[]; small: string[]; smallSize: number; smallW: number[]; h: number; w: number; sp: number }

/** Monospace faces read as double-spaced at display size, so their spaces are drawn narrower. */
const spaceFactor = (F: LockupFonts) => (/Mono/.test(F.big.font) ? 0.45 : 1);
function adv(ctx: CanvasRenderingContext2D, s: string, sp: number) {
  const w = ctx.measureText(s).width;
  if (sp === 1) return w;
  const n = (s.match(/ /g) ?? []).length;
  return n ? w - n * ctx.measureText(' ').width * (1 - sp) : w;
}

function layLines(ctx: CanvasRenderingContext2D, big: string[], L: LockupText, F: LockupFonts, maxW: number, bigSize: number, u: number, sp: number): Laid {
  setText(ctx, { font: F.big.font, weight: F.big.weight }, bigSize);
  const bigW = big.map((l) => adv(ctx, l, sp));
  const smallTxt = F.small.upper ? L.small.toUpperCase() : L.small;
  let smallSize = Math.max(36 * u, Math.min(72 * u, bigSize * (F.small.scale ?? (F.small.italic ? 0.42 : 0.3))));
  let small: string[] = [];
  let smallW: number[] = [];
  if (smallTxt.trim()) {
    const fit = () => {
      setText(ctx, { font: F.small.font, weight: F.small.weight, italic: F.small.italic, tracking: F.small.tracking }, smallSize);
      return ctx.measureText(smallTxt).width;
    };
    let sw = fit();
    while (sw > maxW * 0.92 && smallSize > 26 * u) { smallSize *= 0.93; sw = fit(); }
    small = [smallTxt];
    smallW = [sw];
  }
  const bigLH = bigSize * (F.big.upper ? 0.94 : 1.06);
  const gap = small.length ? bigSize * 0.12 : 0;
  const rule = Math.max(5 * u, bigSize * 0.055) + ruleOff(bigSize, F);
  const h = small.length * smallSize * 1.3 + gap + big.length * bigLH + rule;
  resetTracking(ctx);
  return { big, bigSize, bigW, small, smallSize, smallW, h, w: Math.max(...bigW, ...smallW, 1), sp };
}

/**
 * Lay out the block: the big words on one line or balanced over two, whichever comes out larger
 * inside maxW (and maxH, when given). One line wins unless two are clearly bigger.
 */
function lay(ctx: CanvasRenderingContext2D, L: LockupText, F: LockupFonts, maxW: number, maxBig: number, u: number, maxH?: number): Laid {
  const sp = spaceFactor(F);
  const bigTxt = F.big.upper ? L.big.toUpperCase() : L.big;
  setText(ctx, { font: F.big.font, weight: F.big.weight }, 100);
  const cands: string[][] = [[bigTxt]];
  const words = bigTxt.split(/\s+/).filter(Boolean);
  if (words.length > 1) {
    let best = Infinity, pick: string[] = [];
    for (let i = 1; i < words.length; i++) {
      const a = words.slice(0, i).join(' '), b = words.slice(i).join(' ');
      const wm = Math.max(adv(ctx, a, sp), adv(ctx, b, sp));
      if (wm < best) { best = wm; pick = [a, b]; }
    }
    cands.push(pick);
  }
  let out: Laid | null = null;
  for (const lines of cands) {
    setText(ctx, { font: F.big.font, weight: F.big.weight }, 100);
    const wm = Math.max(...lines.map((l) => adv(ctx, l, sp)), 1);
    let size = Math.min(maxBig, (100 * maxW) / wm);
    let g = layLines(ctx, lines, L, F, maxW, size, u, sp);
    for (let i = 0; i < 5 && maxH && g.h > maxH + 0.5; i++) {
      size *= Math.max(0.5, (maxH / g.h) * 0.985);
      g = layLines(ctx, lines, L, F, maxW, size, u, sp);
    }
    if (!out || g.bigSize > out.bigSize * 1.12) out = g;
  }
  return out!;
}

/** Size of the laid-out block, for hit boxes and fades. */
export function measureLockup(ctx: CanvasRenderingContext2D, L: LockupText, F: LockupFonts, maxW: number, maxBig: number, u: number, maxH?: number) {
  const g = lay(ctx, L, F, maxW, maxBig, u, maxH);
  return { w: g.w, h: g.h };
}

/**
 * Draw the lockup centred on cx. `anchor` says whether y is the block's top, centre or bottom.
 * `out` is 1 while on screen and falls to 0 for the fade + blur exit. Returns the block box.
 */
export function drawLockup(
  ctx: CanvasRenderingContext2D, L: LockupText, F: LockupFonts, P: LockupPaint,
  cx: number, y: number, anchor: 'top' | 'center' | 'bottom', maxW: number, maxBig: number,
  lt: number, out: number, u: number, maxH?: number,
): Box {
  const g = lay(ctx, L, F, maxW, maxBig, u, maxH);
  const top = anchor === 'top' ? y : anchor === 'center' ? y - g.h / 2 : y - g.h;
  const box = { x: cx - g.w / 2, y: top, w: g.w, h: g.h };
  if (lt <= 0 || out <= 0) return box;
  const smallFirst = (L.order ?? 'small-big') === 'small-big';
  const bigLH = g.bigSize * (F.big.upper ? 0.94 : 1.06);
  const base = g.bigSize * (F.big.upper ? 0.8 : 0.84);
  const smallLH = g.smallSize * 1.3;
  const gap = g.small.length ? g.bigSize * 0.12 : 0;
  const th = Math.max(5 * u, g.bigSize * 0.055);
  const ruleH = th + ruleOff(g.bigSize, F);
  const bigTop = smallFirst ? top + g.small.length * smallLH + gap : top;
  const smallTop = smallFirst ? top : top + g.big.length * bigLH + ruleH + gap;
  const tBig = smallFirst && g.small.length ? 0.16 : 0;
  const tSmall = smallFirst ? 0 : 0.3;
  const chars = g.big.reduce((a, l) => a + [...l].length, 0);
  const stag = Math.min(0.066, 0.45 / Math.max(1, chars));

  ctx.save();
  ctx.globalAlpha *= out;
  const exitBlur = 12 * (1 - out) * u;
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';

  // Big line(s): letters rise out of the line mask, ~2 frames apart, with a trail while moving.
  setText(ctx, { font: F.big.font, weight: F.big.weight }, g.bigSize);
  let gi = 0;
  g.big.forEach((line, li) => {
    const lx = cx - g.bigW[li] / 2;
    const by = bigTop + li * bigLH + base;
    ctx.save();
    ctx.beginPath();
    ctx.rect(lx - g.bigSize, by - g.bigSize * 1.02, g.bigW[li] + g.bigSize * 2, g.bigSize * 1.3);
    ctx.clip();
    if (exitBlur > 0.3) ctx.filter = `blur(${exitBlur.toFixed(1)}px)`;
    const cs = [...line];
    cs.forEach((ch, ci) => {
      const p = outExpo(clamp01((lt - tBig - gi * stag) / 0.52));
      gi++;
      if (p <= 0.001 || ch === ' ') return;
      const x = lx + adv(ctx, cs.slice(0, ci).join(''), g.sp);
      const dy = (1 - p) * g.bigSize * 0.96;
      ctx.fillStyle = P.ink;
      if (p < 0.94) {
        const a = ctx.globalAlpha;
        ctx.globalAlpha = a * 0.16; ctx.fillText(ch, x, by + dy + g.bigSize * 0.12 * (1 - p));
        ctx.globalAlpha = a * 0.07; ctx.fillText(ch, x, by + dy + g.bigSize * 0.26 * (1 - p));
        ctx.globalAlpha = a;
      }
      ctx.fillText(ch, x, by + dy);
    });
    ctx.restore();
  });

  // Accent rule under the big line, drawing out from the centre once the letters land.
  if (P.underline !== false) {
    const tU = tBig + chars * stag + 0.12;
    const p = outExpo(clamp01((lt - tU) / 0.5));
    if (p > 0) {
      const ry = bigTop + (g.big.length - 1) * bigLH + base + ruleOff(g.bigSize, F);
      const rw = Math.max(...g.bigW) * 0.42 * p;
      ctx.save();
      if (exitBlur > 0.3) ctx.filter = `blur(${exitBlur.toFixed(1)}px)`;
      ctx.fillStyle = P.accent;
      ctx.fillRect(cx - rw / 2, ry, rw, th);
      ctx.restore();
    }
  }

  // Short line: the house fade + blur, word by word.
  if (g.small.length) {
    setText(ctx, { font: F.small.font, weight: F.small.weight, italic: F.small.italic, tracking: F.small.tracking }, g.smallSize);
    fadeBlurWords(ctx, g.small, cx, smallTop + g.smallSize * 0.98, g.smallSize, 1.3, lt - tSmall, P.smallColor, 'center', u, 1);
    resetTracking(ctx);
  }
  ctx.restore();
  return box;
}
