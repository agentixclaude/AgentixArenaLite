// Shared motion-graphics building blocks: typography reveals, icon badges, panel graphics.
import type { Pack } from './packs';
import type { MG } from './style';
import { drawIcon } from './icons';
import { caseText, setText, resetTracking, type TextProps } from './text';
import { clamp01, outExpo, popIn } from './ease';

export type Rect = { x: number; y: number; w: number; h: number };
export interface Typo { pack: Pack; head: TextProps; body: TextProps; u: number; W: number; H: number }

export const headFont = (ctx: CanvasRenderingContext2D, T: Typo, size: number) => setText(ctx, T.head, size * (T.head.size / 100));
export const bodyFont = (ctx: CanvasRenderingContext2D, T: Typo, size: number) => setText(ctx, T.body, size * (T.body.size / 100));
export const hcase = (T: Typo, s: string) => caseText(s, T.head.textCase);

export function rr(ctx: CanvasRenderingContext2D, r: Rect, rad: number) { ctx.beginPath(); ctx.roundRect(r.x, r.y, r.w, r.h, Math.max(0, rad)); }

export function wrap(ctx: CanvasRenderingContext2D, text: string, maxW: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let cur = '';
  for (const w of words) { const t = cur ? cur + ' ' + w : w; if (ctx.measureText(t).width > maxW && cur) { lines.push(cur); cur = w; } else cur = t; }
  if (cur) lines.push(cur);
  return lines;
}

/** Largest headline size that fits the box (in final px, headline props applied). */
export function fitHead(ctx: CanvasRenderingContext2D, T: Typo, text: string, maxW: number, maxH: number, maxSize: number, lh = 1.02, maxLines = 3) {
  let size = maxSize;
  for (; size > 18; size -= 4) {
    headFont(ctx, T, size);
    const lines = wrap(ctx, text, maxW);
    const real = size * (T.head.size / 100);
    if (!lines.some((l) => ctx.measureText(l).width > maxW) && lines.length <= maxLines && lines.length * real * lh <= maxH) return { size: real, lines };
  }
  headFont(ctx, T, size);
  return { size: size * (T.head.size / 100), lines: wrap(ctx, text, maxW).slice(0, maxLines) };
}

const norm = (w: string) => w.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');

/** Words rise out of a line mask, staggered, with a short motion-blur trail while moving. */
export function maskText(ctx: CanvasRenderingContext2D, lines: string[], x: number, y: number, size: number, lh: number, lt: number, color: string, align: 'left' | 'center', hiWord?: string, hiColor?: string) {
  let wi = 0;
  ctx.textBaseline = 'alphabetic';
  const space = ctx.measureText(' ').width;
  lines.forEach((line, li) => {
    const lw = ctx.measureText(line).width;
    let cx = align === 'center' ? x - lw / 2 : x;
    const ly = y + li * size * lh;
    ctx.save();
    ctx.beginPath(); ctx.rect(cx - size, ly - size * 1.05, lw + size * 2, size * 1.32); ctx.clip();
    for (const w of line.split(' ')) {
      const p = outExpo(clamp01((lt - wi * 0.07) / 0.55));
      wi++;
      const ww = ctx.measureText(w).width;
      if (p > 0.001) {
        const col = hiWord && hiColor && norm(w) === norm(hiWord) ? hiColor : color;
        const off = (1 - p) * size * 1.15;
        if (p < 0.92) {
          ctx.globalAlpha = 0.22;
          ctx.fillStyle = col;
          ctx.fillText(w, cx, ly + off + size * 0.16 * (1 - p));
          ctx.globalAlpha = 1;
        }
        ctx.fillStyle = col;
        ctx.fillText(w, cx, ly + off);
      }
      cx += ww + space;
    }
    ctx.restore();
  });
}

/** Graphics-rules default: fade + blur in (12px → 0, 0.55s, 70ms word stagger). */
export function fadeBlurWords(ctx: CanvasRenderingContext2D, lines: string[], x: number, y: number, size: number, lh: number, lt: number, color: string, align: 'left' | 'center' | 'right', u: number, out = 1, hiWord?: string, hiColor?: string, stroke?: { w: number; color: string }) {
  let wi = 0;
  ctx.textBaseline = 'alphabetic';
  const space = ctx.measureText(' ').width;
  lines.forEach((line, li) => {
    const lw = ctx.measureText(line).width;
    let cx = align === 'center' ? x - lw / 2 : align === 'right' ? x - lw : x;
    const ly = y + li * size * lh;
    for (const w of line.split(' ')) {
      const p = outExpo(clamp01((lt - wi * 0.07) / 0.55));
      wi++;
      const ww = ctx.measureText(w).width;
      const a = Math.min(p, out);
      if (a > 0.01) {
        const blur = Math.max(12 * (1 - p), 12 * (1 - out)) * u;
        ctx.save();
        if (blur > 0.3) ctx.filter = `blur(${blur.toFixed(1)}px)`;
        ctx.globalAlpha *= a;
        const yy = ly + (1 - p) * size * 0.08;
        if (stroke && stroke.w > 0) { ctx.lineWidth = stroke.w; ctx.strokeStyle = stroke.color; ctx.lineJoin = 'round'; ctx.strokeText(w, cx, yy); }
        ctx.fillStyle = hiWord && hiColor && norm(w) === norm(hiWord) ? hiColor : color;
        ctx.fillText(w, cx, yy);
        ctx.restore();
      }
      cx += ww + space;
    }
  });
}

export function iconBadge(ctx: CanvasRenderingContext2D, name: string, x: number, y: number, d: number, pack: Pack, lt: number, accent = pack.accent) {
  const k = popIn(clamp01(lt / 0.6));
  if (lt <= 0) return;
  ctx.save();
  ctx.translate(x + d / 2, y + d / 2);
  ctx.scale(Math.max(0, k), Math.max(0, k));
  ctx.fillStyle = accent;
  ctx.beginPath(); ctx.arc(0, 0, d / 2, 0, Math.PI * 2); ctx.fill();
  drawIcon(ctx, name, -d * 0.29, -d * 0.29, d * 0.58, pack.bg, outExpo(clamp01((lt - 0.15) / 0.6)), 2.2);
  ctx.restore();
}

/** Kicker row + faint index numeral: structure for panels and cards (two font families only). */
export function decor(ctx: CanvasRenderingContext2D, T: Typo, r: Rect, label: string, idx: number, lt: number, numeral = true) {
  const { pack, u } = T;
  const a = outExpo(clamp01(lt / 0.5));
  ctx.save();
  ctx.globalAlpha *= a;
  ctx.fillStyle = T.head.accent;
  ctx.fillRect(r.x, r.y - 15 * u, 14 * u, 14 * u);
  setText(ctx, { font: T.body.font, weight: 700, tracking: 140 }, 24 * u);
  ctx.fillStyle = pack.muted;
  ctx.textBaseline = 'middle';
  ctx.fillText(label.toUpperCase(), r.x + 26 * u, r.y - 7 * u);
  const nm = String(idx).padStart(2, '0');
  ctx.textAlign = 'right';
  ctx.fillText(nm, r.x + r.w, r.y - 7 * u);
  ctx.textAlign = 'left';
  resetTracking(ctx);
  ctx.globalAlpha *= 0.35;
  ctx.fillRect(r.x, r.y + 14 * u, r.w * outExpo(clamp01((lt - 0.1) / 0.7)), Math.max(1, 1.5 * u));
  ctx.restore();
  if (numeral) {
    ctx.save();
    setText(ctx, { font: T.head.font, weight: T.head.weight }, r.h * 0.42);
    ctx.globalAlpha *= 0.09 * a;
    ctx.strokeStyle = pack.ink;
    ctx.lineWidth = 2.5 * u;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'alphabetic';
    ctx.strokeText(nm, r.x + r.w + 6 * u, r.y + r.h);
    ctx.restore();
  }
}

/** Graphics inside split panels and above the circle. */
export function drawMG(ctx: CanvasRenderingContext2D, mg: MG, b: Rect, T: Typo, lt: number, dur: number) {
  const { pack, u } = T;
  const ink = T.head.fill, acc = T.head.accent, muted = T.body.fill;
  ctx.save();
  ctx.textAlign = 'left';
  switch (mg.kind) {
    case 'keyword': {
      const txt = hcase(T, mg.text);
      const badge = 104 * u;
      iconBadge(ctx, mg.icon, b.x, b.y + b.h * 0.06, badge, pack, lt, acc);
      const area = { x: b.x, y: b.y + b.h * 0.06 + badge + 24 * u, w: b.w, h: b.h * 0.94 - badge - 24 * u };
      const f = fitHead(ctx, T, txt, area.w, area.h * 0.6, 180 * u, 0.98, 2);
      const top = area.y + f.size * 0.86;
      setText(ctx, T.head, f.size);
      maskText(ctx, f.lines, area.x, top, f.size, 0.98, lt - 0.12, ink, 'left');
      resetTracking(ctx);
      const after = top + (f.lines.length - 1) * f.size * 0.98;
      ctx.fillStyle = acc;
      ctx.fillRect(area.x, after + 26 * u, 120 * u * outExpo(clamp01((lt - 0.35) / 0.5)), 8 * u);
      if (mg.sub && mg.sub.toLowerCase() !== mg.text.toLowerCase()) {
        bodyFont(ctx, T, 36 * u);
        const bs = 36 * u * (T.body.size / 100);
        const sub = wrap(ctx, mg.sub, area.w).slice(0, 2);
        maskText(ctx, sub, area.x, after + 94 * u, bs, 1.3, lt - 0.45, muted, 'left', mg.text, acc);
        resetTracking(ctx);
      }
      break;
    }
    case 'stat': {
      const m = mg.value.match(/^([$₹]?)([\d,.]+)(.*)$/);
      let shown = mg.value, frac = 1;
      if (m) {
        const target = parseFloat(m[2].replace(/,/g, ''));
        const dec = (m[2].split('.')[1] ?? '').length;
        const p = outExpo(clamp01((lt - 0.15) / Math.min(1.2, dur * 0.6)));
        frac = p;
        const v = target * p;
        shown = m[1] + (dec ? v.toFixed(dec) : Math.round(v).toLocaleString('en-US')) + m[3];
      }
      const badge = 92 * u;
      iconBadge(ctx, mg.icon, b.x, b.y + b.h * 0.06, badge, pack, lt, acc);
      const f = fitHead(ctx, T, hcase(T, mg.value), b.w, b.h * 0.42, 250 * u, 1, 1);
      const cy = b.y + b.h * 0.06 + badge + 24 * u + f.size * 0.82;
      setText(ctx, T.head, f.size);
      ctx.fillStyle = acc;
      ctx.save();
      ctx.beginPath(); ctx.rect(b.x - 10, cy - f.size, b.w + 20, f.size * 1.25); ctx.clip();
      ctx.fillText(hcase(T, shown), b.x, cy + (1 - outExpo(clamp01(lt / 0.5))) * f.size);
      ctx.restore();
      resetTracking(ctx);
      const pct = /%/.test(mg.value) && m ? Math.min(1, parseFloat(m[2]) / 100) : 1;
      ctx.fillStyle = pack.bg2;
      ctx.fillRect(b.x, cy + 30 * u, b.w * outExpo(clamp01((lt - 0.1) / 0.6)), 10 * u);
      ctx.fillStyle = acc;
      ctx.fillRect(b.x, cy + 30 * u, b.w * pct * frac, 10 * u);
      if (mg.label) {
        headFont(ctx, T, 56 * u);
        const ls = 56 * u * (T.head.size / 100);
        const lines = wrap(ctx, hcase(T, mg.label), b.w).slice(0, 2);
        maskText(ctx, lines, b.x, cy + 120 * u, ls, 1.08, lt - 0.35, ink, 'left');
        resetTracking(ctx);
      }
      break;
    }
    case 'list': {
      iconBadge(ctx, mg.icon, b.x, b.y + b.h * 0.06, 84 * u, pack, lt, acc);
      headFont(ctx, T, 62 * u);
      const ts = 62 * u * (T.head.size / 100);
      maskText(ctx, [hcase(T, mg.title)], b.x + 108 * u, b.y + b.h * 0.06 + 62 * u, ts, 1, lt - 0.1, ink, 'left');
      const rowH = Math.min(b.h * 0.19, 112 * u);
      mg.items.forEach((it, i) => {
        const st = 0.35 + i * 0.3;
        const p = outExpo(clamp01((lt - st) / 0.5));
        if (p <= 0) return;
        const y = b.y + b.h * 0.34 + i * rowH;
        drawIcon(ctx, 'check', b.x, y + rowH * 0.2, 54 * u, acc, p, 2.4);
        ctx.save();
        ctx.beginPath(); ctx.rect(b.x + 76 * u, y, b.w, rowH * 0.9); ctx.clip();
        ctx.fillStyle = ink;
        headFont(ctx, T, 52 * u);
        ctx.fillText(hcase(T, it), b.x + 84 * u, y + rowH * 0.62 + (1 - p) * rowH * 0.7);
        ctx.restore();
        ctx.globalAlpha = 0.3;
        ctx.fillStyle = muted;
        ctx.fillRect(b.x, y + rowH - 2 * u, b.w * p, 2 * u);
        ctx.globalAlpha = 1;
      });
      resetTracking(ctx);
      break;
    }
    case 'quote': {
      const txt = hcase(T, mg.text);
      const f = fitHead(ctx, T, txt, b.w, b.h * 0.6, 116 * u, 1.05, 4);
      const blockH = f.lines.length * f.size * 1.05;
      const top = b.y + (b.h - blockH) / 2 + f.size * 0.8;
      ctx.fillStyle = acc;
      setText(ctx, { font: 'DM Serif Display', weight: 400 }, 220 * u);
      ctx.globalAlpha = outExpo(clamp01(lt / 0.4));
      ctx.fillText('“', b.x - 8 * u, top - f.size * 0.55 + (1 - outExpo(clamp01(lt / 0.5))) * 40 * u);
      ctx.globalAlpha = 1;
      setText(ctx, T.head, f.size);
      maskText(ctx, f.lines, b.x, top, f.size, 1.05, lt - 0.1, ink, 'left');
      resetTracking(ctx);
      break;
    }
    case 'cta': {
      const cx = b.x + b.w / 2;
      const f = fitHead(ctx, T, hcase(T, mg.text), b.w, b.h * 0.4, 96 * u, 1.04, 3);
      const top = b.y + b.h * 0.16 + f.size * 0.8;
      setText(ctx, T.head, f.size);
      maskText(ctx, f.lines, cx, top, f.size, 1.04, lt, ink, 'center');
      resetTracking(ctx);
      const after = top + (f.lines.length - 1) * f.size * 1.04 + f.size * 0.4;
      const ay = after + 16 * u;
      const bob = Math.sin(lt * 6) * 6 * u;
      ctx.strokeStyle = acc; ctx.lineWidth = 7 * u; ctx.lineCap = 'round';
      ctx.globalAlpha = outExpo(clamp01((lt - 0.4) / 0.4));
      ctx.beginPath();
      ctx.moveTo(cx, ay + bob); ctx.lineTo(cx, ay + 58 * u + bob);
      ctx.moveTo(cx - 22 * u, ay + 36 * u + bob); ctx.lineTo(cx, ay + 60 * u + bob); ctx.lineTo(cx + 22 * u, ay + 36 * u + bob);
      ctx.stroke();
      const t = mg.text.toLowerCase();
      const btn = /follow/.test(t) ? 'FOLLOW' : /subscribe/.test(t) ? 'SUBSCRIBE' : /comment/.test(t) ? 'COMMENT' : /link|bio/.test(t) ? 'LINK IN BIO' : /regist|join|sign/.test(t) ? 'JOIN NOW' : 'LEARN MORE';
      setText(ctx, { font: T.body.font, weight: 800 }, 44 * u);
      const iconS = 46 * u;
      const bw = ctx.measureText(btn).width + 120 * u + iconS;
      const bh = 106 * u;
      const pb = popIn(clamp01((lt - 0.55) / 0.6));
      ctx.globalAlpha = clamp01((lt - 0.55) / 0.2);
      const by = ay + 92 * u;
      ctx.save();
      ctx.translate(cx, by + bh / 2);
      ctx.scale(Math.max(0, pb), Math.max(0, pb));
      ctx.fillStyle = acc;
      rr(ctx, { x: -bw / 2, y: -bh / 2, w: bw, h: bh }, pack.shape === 'sharp' ? 8 * u : bh / 2);
      ctx.fill();
      drawIcon(ctx, mg.icon, -bw / 2 + 44 * u, -iconS / 2, iconS, pack.bg, outExpo(clamp01((lt - 0.8) / 0.5)), 2.4);
      ctx.fillStyle = pack.bg;
      ctx.textBaseline = 'middle';
      ctx.fillText(btn, -bw / 2 + 60 * u + iconS, 2 * u);
      ctx.restore();
      resetTracking(ctx);
      break;
    }
    case 'hook':
      break;
  }
  ctx.restore();
}
