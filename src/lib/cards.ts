// Full-graphic templates. Each card is a designed page, not text on a plain colour:
// a kicker row, layered type, one hero element, structure (rules, grids, numerals) and the live
// speaker in a bubble so the presenter never disappears.
import type { Shot, MG, CardKind } from './style';
import { rng, hashStr } from './style';
import { drawIcon } from './icons';
import { setText, resetTracking, hexA } from './text';
import { clamp01, outExpo, inOut, popIn, springAt } from './ease';
import { decor, fitHead, hcase, headFont, bodyFont, maskText, wrap, iconBadge, rr, type Rect, type Typo } from './mg';
import { render3DIcon } from './three3d';
import { drawMotif } from './motifs';
import { groupById } from './looks';
import { drawLockup, lockupOf } from './kinetic';

export interface CardCtx {
  T: Typo; lt: number; dur: number; t: number; idx: number; last: boolean;
  bubble?: (cx: number, cy: number, r: number) => void;
}

const LABEL: Record<MG['kind'], string> = { hook: 'Intro', stat: 'By the numbers', list: 'Step by step', keyword: 'In focus', quote: 'Key point', cta: 'Next step', word: 'In focus' };

export function cardGeo(W: number, H: number) {
  const wide = W > H, tall = H / W > 1.5;
  const m = Math.round(Math.min(W, H) * 0.07);
  const C: Rect = tall ? { x: m, y: H * 0.165, w: W - 2 * m, h: H * 0.49 } : wide ? { x: m, y: H * 0.2, w: W * 0.56, h: H * 0.6 } : { x: m, y: H * 0.15, w: W - 2 * m, h: H * 0.5 };
  const B = tall ? { cx: m + W * 0.075, cy: H * 0.705, r: W * 0.075 } : wide ? { cx: W * 0.8, cy: H * 0.47, r: H * 0.17 } : { cx: m + W * 0.062, cy: H * 0.735, r: W * 0.062 };
  return { C, B, m, wide, tall };
}

function textOf(mg: MG | undefined, shot: Shot): string {
  if (!mg) return shot.kw || shot.text;
  switch (mg.kind) {
    case 'quote': case 'keyword': case 'cta': case 'hook': return mg.text;
    case 'stat': return `${mg.value} ${mg.label}`.trim();
    case 'list': return mg.title;
    case 'word': return `${mg.small} ${mg.big}`.trim();
  }
}

/** Card with its own in/out: wipes up over the speaker, wipes away at the end. */
export function drawCard(ctx: CanvasRenderingContext2D, shot: Shot, c: CardCtx) {
  const { T, lt, dur } = c;
  const { W, H, u, pack } = T;
  const inP = outExpo(clamp01(lt / 0.55));
  const outP = c.last ? 0 : inOut(clamp01((lt - (dur - 0.42)) / 0.42));
  const y = (1 - inP) * H * 0.9 - outP * H;
  if (inP <= 0.001) return;
  ctx.save();
  ctx.translate(0, y);
  rr(ctx, { x: 0, y: 0, w: W, h: H }, (1 - inP) * 70 * u + outP * 70 * u);
  ctx.clip();
  drawMotif(ctx, { x: 0, y: 0, w: W, h: H }, pack, c.t, Math.min(W, H) / 1080);
  const lc = lt - 0.22;
  const kind: CardKind = shot.card ?? 'editorial';
  const g = cardGeo(W, H);
  const mg = shot.mg;
  decor(ctx, T, { x: g.C.x, y: g.C.y - (g.tall ? H * 0.035 : H * 0.05), w: g.wide ? W - 2 * g.m : g.C.w, h: g.C.h }, LABEL[mg?.kind ?? 'quote'], c.idx, lc, false);
  switch (kind) {
    case 'data': data(ctx, shot, g.C, T, lc, dur); break;
    case 'stack': stack(ctx, shot, g.C, T, lc); break;
    case 'index': index(ctx, shot, g.C, T, lc); break;
    case 'object3d': object3d(ctx, shot, g.C, T, lc); break;
    case 'lockup': lockupCard(ctx, shot, g.C, T, lc, dur); break;
    default: editorial(ctx, shot, g.C, T, lc);
  }
  if (c.bubble && kind !== 'stack') bubble(ctx, g.B, T, lc, c.bubble);
  ctx.restore();
}

function bubble(ctx: CanvasRenderingContext2D, B: { cx: number; cy: number; r: number }, T: Typo, lt: number, draw: (cx: number, cy: number, r: number) => void) {
  const k = popIn(clamp01((lt - 0.3) / 0.7));
  if (k <= 0) return;
  const r = B.r * Math.max(0, k);
  ctx.save();
  ctx.beginPath(); ctx.arc(B.cx, B.cy, r, 0, Math.PI * 2); ctx.clip();
  draw(B.cx, B.cy, r);
  ctx.restore();
  ctx.save();
  ctx.strokeStyle = T.head.accent;
  ctx.lineWidth = 5 * T.u;
  ctx.beginPath();
  ctx.arc(B.cx, B.cy, r + 9 * T.u, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * outExpo(clamp01((lt - 0.6) / 0.9)));
  ctx.stroke();
  ctx.restore();
}

// Position of one word inside lines drawn by maskText (same measuring rules).
function wordBox(ctx: CanvasRenderingContext2D, lines: string[], x: number, y: number, size: number, lh: number, target: string) {
  const space = ctx.measureText(' ').width;
  const want = target.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
  let wi = 0;
  for (let li = 0; li < lines.length; li++) {
    let cx = x;
    for (const w of lines[li].split(' ')) {
      const ww = ctx.measureText(w).width;
      if (w.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '') === want) return { x: cx, y: y + li * size * lh, w: ww, wi };
      cx += ww + space;
      wi++;
    }
  }
  return null;
}

function strongestWord(text: string) {
  return text.split(/\s+/).reduce((a, b) => (b.replace(/[^\p{L}\p{N}]/gu, '').length > a.replace(/[^\p{L}\p{N}]/gu, '').length ? b : a), '');
}

function editorial(ctx: CanvasRenderingContext2D, shot: Shot, C: Rect, T: Typo, lt: number) {
  const { u, pack } = T;
  const text = hcase(T, textOf(shot.mg, shot));
  // Layered type: the shot's keyword, huge and hollow, drifting behind everything.
  if (shot.kw) {
    ctx.save();
    setText(ctx, { font: T.head.font, weight: T.head.weight }, C.w * 0.46);
    ctx.globalAlpha = 0.07 * outExpo(clamp01(lt / 0.8));
    ctx.strokeStyle = pack.ink;
    ctx.lineWidth = 2.5 * u;
    ctx.textBaseline = 'alphabetic';
    ctx.strokeText(shot.kw.toUpperCase(), C.x - lt * 14 * u, C.y + C.h * 1.02);
    ctx.restore();
  }
  const f = fitHead(ctx, T, text, C.w, C.h * 0.6, 150 * u, 1.04, 4);
  const top = C.y + C.h * 0.06 + f.size * 0.86;
  setText(ctx, T.head, f.size);
  const hiW = strongestWord(text);
  const wb = wordBox(ctx, f.lines, C.x, top, f.size, 1.04, hiW);
  if (wb) {
    const p = outExpo(clamp01((lt - 0.45 - wb.wi * 0.07) / 0.5));
    ctx.fillStyle = T.head.accent;
    ctx.fillRect(wb.x - 10 * u, wb.y - f.size * 0.8, (wb.w + 20 * u) * p, f.size * 0.98);
  }
  maskText(ctx, f.lines, C.x, top, f.size, 1.04, lt, T.head.fill, 'left', wb && lt > 0.5 ? hiW : undefined, pack.bg);
  resetTracking(ctx);
  const after = top + (f.lines.length - 1) * f.size * 1.04 + 34 * u;
  ctx.fillStyle = T.head.accent;
  ctx.fillRect(C.x, after, 140 * u * outExpo(clamp01((lt - 0.4) / 0.6)), 7 * u);
  const sub = shot.mg?.kind === 'keyword' ? shot.mg.sub : shot.mg?.kind === 'quote' ? '' : '';
  if (sub) {
    bodyFont(ctx, T, 36 * u);
    const bs = 36 * u * (T.body.size / 100);
    maskText(ctx, wrap(ctx, sub, C.w).slice(0, 2), C.x, after + 74 * u, bs, 1.3, lt - 0.5, T.body.fill, 'left');
    resetTracking(ctx);
  }
}

function data(ctx: CanvasRenderingContext2D, shot: Shot, C: Rect, T: Typo, lt: number, dur: number) {
  const { u, pack } = T;
  const mg = shot.mg;
  const value = mg?.kind === 'stat' ? mg.value : (shot.text.match(/\d[\d,.%]*/)?.[0] ?? '1');
  const label = mg?.kind === 'stat' ? mg.label : (mg && 'text' in mg ? mg.text : shot.kw);
  // Faint horizontal grid.
  ctx.save();
  ctx.globalAlpha = 0.08;
  ctx.strokeStyle = pack.ink;
  ctx.lineWidth = Math.max(1, 1.5 * u);
  const gy0 = C.y + C.h * 0.58, gh = C.h * 0.4;
  for (let i = 0; i <= 4; i++) { const y = gy0 + (gh * i) / 4; ctx.beginPath(); ctx.moveTo(C.x, y); ctx.lineTo(C.x + C.w, y); ctx.stroke(); }
  ctx.restore();
  // Count-up number.
  const m = value.match(/^([$₹]?)([\d,.]+)(.*)$/);
  let shown = value;
  if (m) {
    const target = parseFloat(m[2].replace(/,/g, ''));
    const dec = (m[2].split('.')[1] ?? '').length;
    const p = outExpo(clamp01((lt - 0.1) / Math.min(1.3, dur * 0.6)));
    shown = m[1] + (dec ? (target * p).toFixed(dec) : Math.round(target * p).toLocaleString('en-US')) + m[3];
  }
  const f = fitHead(ctx, T, hcase(T, value), C.w, C.h * 0.3, 280 * u, 1, 1);
  const ny = C.y + C.h * 0.02 + f.size * 0.84;
  setText(ctx, T.head, f.size);
  ctx.save();
  ctx.beginPath(); ctx.rect(C.x - 10, ny - f.size, C.w + 20, f.size * 1.2); ctx.clip();
  ctx.fillStyle = T.head.accent;
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(hcase(T, shown), C.x, ny + (1 - outExpo(clamp01(lt / 0.5))) * f.size);
  ctx.restore();
  resetTracking(ctx);
  if (label) {
    headFont(ctx, T, 58 * u);
    const ls = 58 * u * (T.head.size / 100);
    maskText(ctx, wrap(ctx, hcase(T, label), C.w).slice(0, 2), C.x, ny + f.size * 0.22 + ls * 0.95, ls, 1.06, lt - 0.3, T.head.fill, 'left');
    resetTracking(ctx);
  }
  // Bar chart: the stat is the tall accent bar.
  const r = rng(hashStr(shot.key));
  const hs = [0.28 + r() * 0.12, 0.38 + r() * 0.12, 0.34 + r() * 0.14, 0.5 + r() * 0.14, 1];
  const n = hs.length, gap = C.w * 0.035, bw = (C.w - gap * (n - 1)) / n;
  hs.forEach((h, i) => {
    const k = clamp01(springAt(Math.max(0, lt - 0.35 - i * 0.08), { stiffness: 140, damping: 16 }));
    const bh = gh * 0.96 * h * k;
    const x = C.x + i * (bw + gap);
    ctx.fillStyle = i === n - 1 ? T.head.accent : hexA(pack.ink.length === 7 ? pack.ink : '#FFFFFF', 0.14);
    rr(ctx, { x, y: gy0 + gh - bh, w: bw, h: bh }, pack.shape === 'sharp' ? 2 * u : 10 * u);
    ctx.fill();
  });
  ctx.fillStyle = hexA(pack.ink.length === 7 ? pack.ink : '#FFFFFF', 0.5);
  ctx.fillRect(C.x, gy0 + gh, C.w * outExpo(clamp01((lt - 0.2) / 0.6)), Math.max(1, 2 * u));
}

function stack(ctx: CanvasRenderingContext2D, shot: Shot, C: Rect, T: Typo, lt: number) {
  const { u, pack } = T;
  const words = textOf(shot.mg, shot).split(/\s+/).filter(Boolean).slice(0, 7).map((w) => w.toUpperCase());
  const lines: string[] = [];
  for (const w of words) { const l = lines[lines.length - 1]; if (l && (l + ' ' + w).length <= 9) lines[lines.length - 1] = l + ' ' + w; else lines.push(w); }
  const sizes = lines.map((l) => {
    let s = C.w * 0.34;
    setText(ctx, { font: T.head.font, weight: T.head.weight, tracking: -10 }, s);
    const w = ctx.measureText(l).width;
    if (w > C.w) s *= C.w / w;
    return Math.min(s, C.h / Math.max(3, lines.length) * 1.05);
  });
  const total = sizes.reduce((a, s) => a + s * 0.98, 0);
  let y = C.y + (C.h - total) / 2;
  lines.forEach((l, i) => {
    const s = sizes[i];
    y += s * 0.98;
    const st = i * 0.12;
    const p = outExpo(clamp01((lt - st) / 0.6));
    if (p <= 0) return;
    const dir = i % 2 ? 1 : -1;
    const drift = (lt - st) * 12 * u * -dir;
    const off = (1 - p) * W0(T) * 0.7 * dir;
    setText(ctx, { font: T.head.font, weight: T.head.weight, tracking: -10 }, s);
    const lw = ctx.measureText(l).width;
    const x = C.x + (i % 2 ? C.w - lw : 0) + off + drift;
    const style = i % 3;
    const paint = (dx: number, a: number) => {
      ctx.globalAlpha = a;
      if (style === 2) {
        ctx.fillStyle = T.head.accent;
        ctx.fillRect(x + dx - 14 * u, y - s * 0.8, lw + 28 * u, s * 0.9);
        ctx.fillStyle = pack.bg;
        ctx.fillText(l, x + dx, y);
      } else if (style === 1) {
        ctx.strokeStyle = T.head.fill; ctx.lineWidth = 3 * u;
        ctx.strokeText(l, x + dx, y);
      } else { ctx.fillStyle = T.head.fill; ctx.fillText(l, x + dx, y); }
    };
    ctx.save();
    ctx.textBaseline = 'alphabetic';
    if (p < 0.9) { paint(-dir * -(1 - p) * 60 * u, 0.18); paint(-dir * -(1 - p) * 30 * u, 0.3); }
    paint(0, 1);
    ctx.restore();
  });
  resetTracking(ctx);
}
const W0 = (T: Typo) => T.W;

function index(ctx: CanvasRenderingContext2D, shot: Shot, C: Rect, T: Typo, lt: number) {
  const { u, pack } = T;
  const mg = shot.mg;
  const title = mg?.kind === 'list' ? mg.title : shot.kw || 'Key points';
  const items = mg?.kind === 'list' && mg.items.length ? mg.items : textOf(mg, shot).split(/\s+/).filter((w) => w.length > 3).slice(0, 3);
  // Dot grid, top right.
  ctx.save();
  ctx.globalAlpha = 0.12 * outExpo(clamp01(lt / 0.6));
  ctx.fillStyle = pack.ink;
  for (let gx = 0; gx < 6; gx++) for (let gy = 0; gy < 4; gy++) { ctx.beginPath(); ctx.arc(C.x + C.w - gx * 22 * u, C.y + gy * 22 * u, 2.6 * u, 0, Math.PI * 2); ctx.fill(); }
  ctx.restore();
  const f = fitHead(ctx, T, hcase(T, title), C.w * 0.78, C.h * 0.2, 84 * u, 1, 2);
  setText(ctx, T.head, f.size);
  maskText(ctx, f.lines, C.x, C.y + f.size * 0.86, f.size, 1, lt, T.head.fill, 'left');
  const y0 = C.y + f.lines.length * f.size + 50 * u;
  const rowH = Math.min((C.y + C.h - y0) / Math.max(3, items.length), 170 * u);
  items.slice(0, 4).forEach((it, i) => {
    const st = 0.35 + i * 0.28;
    const p = outExpo(clamp01((lt - st) / 0.55));
    if (p <= 0) return;
    const y = y0 + i * rowH;
    const num = String(i + 1).padStart(2, '0');
    setText(ctx, { font: T.head.font, weight: T.head.weight }, rowH * 0.62);
    ctx.textBaseline = 'alphabetic';
    ctx.lineWidth = 2.5 * u;
    ctx.strokeStyle = T.head.accent;
    ctx.globalAlpha = p;
    ctx.strokeText(num, C.x, y + rowH * 0.66);
    const nw = ctx.measureText('00').width;
    ctx.save();
    ctx.beginPath(); ctx.rect(C.x + nw + 30 * u, y, C.w, rowH * 0.85); ctx.clip();
    headFont(ctx, T, 58 * u);
    ctx.fillStyle = T.head.fill;
    ctx.fillText(hcase(T, it), C.x + nw + 34 * u, y + rowH * 0.6 + (1 - p) * rowH * 0.6);
    ctx.restore();
    drawIcon(ctx, 'check', C.x + C.w - 52 * u, y + rowH * 0.24, 50 * u, T.head.accent, outExpo(clamp01((lt - st - 0.2) / 0.5)), 2.4);
    ctx.globalAlpha = 0.25;
    ctx.fillStyle = T.body.fill;
    ctx.fillRect(C.x, y + rowH - 2 * u, C.w * p, Math.max(1, 1.5 * u));
    ctx.globalAlpha = 1;
  });
  resetTracking(ctx);
}

function object3d(ctx: CanvasRenderingContext2D, shot: Shot, C: Rect, T: Typo, lt: number) {
  const { u, pack } = T;
  const icon = shot.mg && 'icon' in shot.mg ? shot.mg.icon : pack.icon;
  const s = Math.min(C.w * 0.82, C.h * 0.6);
  const ox = C.x + (C.w - s) / 2, oy = C.y + C.h * 0.01;
  // Spotlight and contact shadow, drawn in 2D under the 3D render.
  const sp = ctx.createRadialGradient(ox + s / 2, oy + s * 0.48, s * 0.05, ox + s / 2, oy + s * 0.48, s * 0.7);
  sp.addColorStop(0, hexA(pack.bg2.length === 7 ? pack.bg2 : '#333333', 1));
  sp.addColorStop(1, hexA(pack.bg.length === 7 ? pack.bg : '#000000', 0));
  ctx.fillStyle = sp;
  ctx.fillRect(ox - s * 0.3, oy - s * 0.2, s * 1.6, s * 1.4);
  const sh = ctx.createRadialGradient(ox + s / 2, oy + s * 0.94, 2, ox + s / 2, oy + s * 0.94, s * 0.34);
  sh.addColorStop(0, 'rgba(0,0,0,0.38)');
  sh.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.save();
  ctx.translate(ox + s / 2, oy + s * 0.94);
  ctx.scale(1, 0.18);
  ctx.translate(-(ox + s / 2), -(oy + s * 0.94));
  ctx.globalAlpha = clamp01(lt / 0.5);
  ctx.fillStyle = sh;
  ctx.fillRect(ox - s * 0.2, oy + s * 0.6, s * 1.4, s * 0.7);
  ctx.restore();
  const cv = lt > -0.2 ? render3DIcon(shot.key, icon, T.head.accent, Math.max(0, lt), Math.min(900, Math.round(s))) : null;
  if (cv) ctx.drawImage(cv, ox, oy, s, s);
  else iconBadge(ctx, icon, ox + s * 0.2, oy + s * 0.2, s * 0.6, pack, lt, T.head.accent);
  const text = hcase(T, textOf(shot.mg, shot));
  const box = { x: C.x, y: oy + s * 1.02, w: C.w, h: C.y + C.h - (oy + s * 1.02) + C.h * 0.12 };
  const f = fitHead(ctx, T, text, box.w, box.h, 110 * u, 1.04, 3);
  setText(ctx, T.head, f.size);
  maskText(ctx, f.lines, C.x, box.y + f.size * 0.86, f.size, 1.04, lt - 0.35, T.head.fill, 'left', strongestWord(text), T.head.accent);
  resetTracking(ctx);
}

/** Two-font lockup, centred on the card: short line in one face, the main word huge in another. */
function lockupCard(ctx: CanvasRenderingContext2D, shot: Shot, C: Rect, T: Typo, lt: number, dur: number) {
  const F = groupById(T.pack.group).lockup(T.pack);
  const L = lockupOf(shot.mg, shot.kw || shot.text, lt, dur);
  drawLockup(ctx, L, F, { ink: T.head.fill, accent: T.head.accent, smallColor: T.head.accent }, C.x + C.w / 2, C.y + C.h * 0.5, 'center', C.w, Math.min(C.h * 0.42, 300 * T.u), lt, 1, T.u, C.h * 0.8);
}
