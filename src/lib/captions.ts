// 12 caption templates, word-synced to the transcript. Each template keeps its own look, and any
// property set in the Text panel (font, size, colours, tracking, position, scale, rotation) overrides it.
import type { CaptionStyleId, Pack } from './packs';
import type { CapGroup } from './style';
import { capFont, caseText, placed, setText, resetTracking, hexA, lift, lum, type Hit, type TextProps, type WordLay, layWords } from './text';
import { clamp01, outExpo } from './ease';

export interface CapGeo { capY: number; capSize: number; W: number; H: number; light?: boolean }

const back = (t: number) => { t = clamp01(t); const c1 = 1.9, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); };

function strongest(parts: string[]) {
  let hi = -1, best = 0;
  parts.forEach((p, i) => { const c = p.replace(/[^\p{L}\p{N}]/gu, ''); if (c.length > best && c.length > 3) { best = c.length; hi = i; } });
  return hi;
}
const activeIdx = (cap: CapGroup, t: number) => { let a = -1; cap.words.forEach((w, i) => { if (t >= w.s - 0.02) a = i; }); return a; };
function rrect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); }

export function drawCaption(ctx: CanvasRenderingContext2D, style: CaptionStyleId, cap: CapGroup, t: number, g: CapGeo, pack: Pack, ov: Partial<TextProps> = {}, hits?: Hit[]) {
  const { W, H } = g;
  const u = W / 1080;
  const def = capFont(style, pack);
  const fam = (f: string) => ov.font ?? f;
  const wgt = (w: number) => ov.weight ?? w;
  const ital = ov.italic ?? def.italic;
  const tcase = ov.textCase ?? def.textCase;
  const k = (ov.size ?? g.capSize) / g.capSize;
  const base = g.capSize * u * k;
  const trk = ov.tracking ?? 0;
  // Captions on a light preset background (polaroid, band, circle): dark ink, no dark strokes or shadows.
  const light = !!g.light && style !== 'box' && style !== 'ticker';
  const fill = (d: string) => ov.fill ?? (light ? pack.ink : d);
  const strokeOr = (d: string) => ov.strokeColor ?? (light ? 'rgba(0,0,0,0)' : d);
  const acc = (d: string) => ov.accent ?? d;
  // Accent over footage with no dark stroke around it (serif, frosted, outline, ticker, underline bar): a dark preset
  // accent (made for light panels) switches to the preset's light caption highlight, or is lifted, so it reads.
  const accT = (d: string) => ov.accent ?? (light || lum(d) >= 0.4 ? d : lum(pack.capHi) >= 0.4 ? pack.capHi : lift(d, 0.4));
  const align = ov.align ?? 'center';
  const act = activeIdx(cap, t);
  const fadeA = (i: number) => clamp01((t - cap.words[i].s + 0.04) / 0.14);
  const ax = (ov.x ?? 0.5) * W, ay = (ov.y ?? g.capY / H) * H;
  const font = (f: string, w: number, size: number, it = ital) => setText(ctx, { font: fam(f), weight: wgt(w), italic: it, tracking: trk }, size);
  const words = (upper = false, lower = false) => cap.words.map((w) => {
    const s = w.w.trim();
    return ov.textCase ? caseText(s, tcase) : upper ? s.toUpperCase() : lower ? s.toLowerCase() : s;
  });
  const lx = (lay: WordLay, li: number) => (align === 'left' ? 0 : align === 'right' ? -lay.lineW[li] : -lay.lineW[li] / 2);
  const flow = (lay: WordLay, size: number, y0: number, lh: number, each: (i: number, x: number, y: number) => void) => {
    lay.lines.forEach((ln, li) => {
      let x = lx(lay, li);
      const y = y0 + li * size * lh;
      ln.forEach((i) => { each(i, x, y); x += lay.widths[i] + lay.space; });
    });
  };
  const boxOf = (lay: WordLay, size: number, y0: number, lh: number, pad = 0) => {
    const w = Math.max(...lay.lineW);
    const x = align === 'left' ? 0 : align === 'right' ? -w : -w / 2;
    return { x: x - pad, y: y0 - size * 0.62 - pad, w: w + pad * 2, h: (lay.lines.length - 1) * size * lh + size * 1.24 + pad * 2 };
  };
  const strokeW = ov.stroke != null ? ov.stroke * u : null;
  const strokeC = strokeOr('rgba(0,0,0,0.85)');

  const draw = (box: { x: number; y: number; w: number; h: number }, fn: () => void) => {
    ctx.save();
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    if (ov.shadow) { ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = ov.shadow * u; ctx.shadowOffsetY = 2 * u; }
    placed(ctx, ax, ay, { scale: ov.scale ?? 100, rotation: ov.rotation ?? 0, opacity: ov.opacity ?? 100 }, box, 'caption', hits, fn);
    resetTracking(ctx);
    ctx.restore();
  };

  switch (style) {
    case 'box': {
      font(pack.caption, pack.captionWeight, base);
      const lay = layWords(ctx, words(), W * 0.8);
      const padX = 34 * u * k, padY = 22 * u * k, lh = 1.12;
      const bw = Math.max(...lay.lineW) + padX * 2;
      const bh = lay.lines.length * base * lh + padY * 2 - base * (lh - 1.05);
      const bx = align === 'left' ? -padX : align === 'right' ? -bw + padX : -bw / 2;
      const box = { x: bx, y: -bh / 2, w: bw, h: bh };
      const hi = strongest(lay.words);
      draw(box, () => {
        const cb = ov.bgColor ? hexA(ov.bgColor, (ov.bgOpacity ?? 86) / 100) : pack.capBox;
        if (ov.bg !== false) { ctx.fillStyle = cb; rrect(ctx, bx, -bh / 2, bw, bh, bh * 0.2 / lay.lines.length); ctx.fill(); }
        flow(lay, base, -bh / 2 + padY + base * 0.55, lh, (i, x, y) => {
          const a = fadeA(i); if (a <= 0) return;
          ctx.globalAlpha = a;
          if (strokeW) { ctx.lineWidth = strokeW; ctx.strokeStyle = strokeC; ctx.strokeText(lay.words[i], x, y); }
          ctx.fillStyle = i === hi ? acc(pack.capHi) : fill(pack.capInk);
          ctx.fillText(lay.words[i], x, y);
        });
      });
      break;
    }
    case 'pop': {
      const size = base * 1.12;
      font(def.font, 900, size, false);
      const lay = layWords(ctx, words(true), W * 0.8, 1.45);
      const y0 = -(lay.lines.length - 1) * size * 0.55;
      draw(boxOf(lay, size, y0, 1.1), () => flow(lay, size, y0, 1.1, (i, x, y) => {
        const a = fadeA(i); if (a <= 0) return;
        const on = i === act;
        const sc = on ? 1 + 0.08 * (1 - clamp01((t - cap.words[i].s) / 0.25)) + 0.03 : 1;
        ctx.save();
        ctx.globalAlpha *= a;
        ctx.translate(x + lay.widths[i] / 2, y);
        ctx.scale(sc, sc);
        ctx.lineWidth = strokeW ?? size * 0.16;
        ctx.strokeStyle = strokeOr('rgba(0,0,0,0.9)');
        ctx.strokeText(lay.words[i], -lay.widths[i] / 2, 0);
        ctx.fillStyle = on ? acc(pack.accent) : fill('#FFFFFF');
        ctx.fillText(lay.words[i], -lay.widths[i] / 2, 0);
        ctx.restore();
      }));
      break;
    }
    case 'karaoke': {
      font(pack.caption, 800, base);
      const lay = layWords(ctx, words(), W * 0.82);
      const y0 = -(lay.lines.length - 1) * base * 0.56;
      draw(boxOf(lay, base, y0, 1.12), () => flow(lay, base, y0, 1.12, (i, x, y) => {
        const w = cap.words[i];
        const p = clamp01((t - w.s) / Math.max(0.08, w.e - w.s));
        ctx.lineWidth = strokeW ?? base * 0.12; ctx.strokeStyle = strokeOr('rgba(0,0,0,0.75)');
        ctx.strokeText(lay.words[i], x, y);
        ctx.fillStyle = ov.fill ? hexA(ov.fill, 0.55) : light ? hexA(pack.ink, 0.32) : 'rgba(255,255,255,0.55)';
        ctx.fillText(lay.words[i], x, y);
        if (p > 0) {
          ctx.save();
          ctx.beginPath(); ctx.rect(x, y - base, lay.widths[i] * p, base * 2); ctx.clip();
          ctx.fillStyle = acc(pack.accent); ctx.fillText(lay.words[i], x, y);
          ctx.restore();
        }
      }));
      break;
    }
    case 'marker': {
      font(pack.caption, 800, base);
      const lay = layWords(ctx, words(), W * 0.82);
      const y0 = -(lay.lines.length - 1) * base * 0.6;
      draw(boxOf(lay, base, y0, 1.2, 12 * u), () => {
        let pos: { x: number; y: number; w: number } | null = null;
        let prev: { x: number; y: number; w: number } | null = null;
        flow(lay, base, y0, 1.2, (i, x, y) => { if (i === act) pos = { x, y, w: lay.widths[i] }; if (i === act - 1) prev = { x, y, w: lay.widths[i] }; });
        if (pos) {
          const p = pos as { x: number; y: number; w: number };
          const q = (prev ?? p) as { x: number; y: number; w: number };
          const e = outExpo(clamp01((t - cap.words[act].s) / 0.18));
          ctx.fillStyle = acc(pack.accent);
          rrect(ctx, q.x + (p.x - q.x) * e - 12 * u, q.y + (p.y - q.y) * e - base * 0.62, q.w + (p.w - q.w) * e + 24 * u, base * 1.24, 10 * u);
          ctx.fill();
        }
        flow(lay, base, y0, 1.2, (i, x, y) => {
          const a = fadeA(i); if (a <= 0) return;
          ctx.globalAlpha = a;
          if (i !== act) { ctx.lineWidth = strokeW ?? base * 0.12; ctx.strokeStyle = strokeOr('rgba(0,0,0,0.7)'); ctx.strokeText(lay.words[i], x, y); }
          ctx.fillStyle = i === act ? pack.bg : fill('#FFFFFF');
          ctx.fillText(lay.words[i], x, y);
          ctx.globalAlpha = 1;
        });
      });
      break;
    }
    case 'one': {
      if (act < 0) break;
      const w = cap.words[act];
      const txt = (ov.textCase ? caseText(w.w.trim(), tcase) : w.w.trim().toUpperCase()).replace(/[,.!?]+$/, '');
      let size = base * 2.3;
      font(pack.caption, pack.captionWeight, size);
      const mw = ctx.measureText(txt).width;
      if (mw > W * 0.86) { size *= (W * 0.86) / mw; font(pack.caption, pack.captionWeight, size); }
      const tw = ctx.measureText(txt).width;
      const kk = back((t - w.s) / 0.22);
      draw({ x: -tw / 2, y: -base * 0.4 - size * 0.62, w: tw, h: size * 1.24 }, () => {
        ctx.translate(0, -base * 0.4);
        ctx.scale(0.6 + 0.4 * kk, 0.6 + 0.4 * kk);
        ctx.textAlign = 'center';
        ctx.lineWidth = strokeW ?? size * 0.12; ctx.strokeStyle = strokeOr('rgba(0,0,0,0.85)');
        ctx.strokeText(txt, 0, 0);
        ctx.fillStyle = act === strongest(cap.words.map((x) => x.w)) ? acc(pack.accent) : fill('#FFFFFF');
        ctx.fillText(txt, 0, 0);
      });
      break;
    }
    case 'ticker': {
      const size = base * 0.86;
      font(pack.caption, 700, size);
      const lay = layWords(ctx, words(), W * 0.66);
      const bh = size * 1.9 * Math.max(1, lay.lines.length * 0.75);
      const tagW = 150 * u;
      const x0 = -W * 0.45;
      draw({ x: x0, y: -bh / 2, w: W * 0.9, h: bh }, () => {
        ctx.fillStyle = ov.bgColor ? hexA(ov.bgColor, (ov.bgOpacity ?? 88) / 100) : 'rgba(10,10,10,0.88)';
        if (ov.bg !== false) ctx.fillRect(x0, -bh / 2, W * 0.9, bh);
        ctx.fillStyle = accT(pack.accent);
        ctx.fillRect(x0, -bh / 2, tagW, bh);
        ctx.fillStyle = pack.bg === '#0A0C0A' ? '#0A0C0A' : '#111';
        setText(ctx, { font: 'JetBrains Mono', weight: 800 }, size * 0.62);
        ctx.textAlign = 'center';
        ctx.fillText(pack.subject.toUpperCase().slice(0, 8), x0 + tagW / 2, 0);
        ctx.textAlign = 'left';
        font(pack.caption, 700, size);
        const ly0 = -(lay.lines.length - 1) * size * 0.55;
        lay.lines.forEach((ln, li) => {
          let x = x0 + tagW + 26 * u;
          ln.forEach((i) => {
            const a = fadeA(i);
            if (a > 0) { ctx.globalAlpha = a; ctx.fillStyle = i === act ? accT(pack.accent) : fill('#F2F2F2'); ctx.fillText(lay.words[i], x, ly0 + li * size * 1.1); }
            x += lay.widths[i] + lay.space;
          });
        });
      });
      break;
    }
    case 'outline': {
      const size = base * 1.1;
      font(def.font, 900, size, false);
      const lay = layWords(ctx, words(true), W * 0.84, 1.3);
      const y0 = -(lay.lines.length - 1) * size * 0.55;
      draw(boxOf(lay, size, y0, 1.1), () => flow(lay, size, y0, 1.1, (i, x, y) => {
        ctx.lineWidth = strokeW ?? size * 0.05; ctx.strokeStyle = ov.strokeColor ?? fill('#FFFFFF');
        ctx.strokeText(lay.words[i], x, y);
        const a = fadeA(i);
        if (a > 0) { ctx.globalAlpha = a; ctx.fillStyle = i === act ? accT(pack.accent) : fill('#FFFFFF'); ctx.fillText(lay.words[i], x, y); ctx.globalAlpha = 1; }
      }));
      break;
    }
    case 'stack': {
      const size = base * 1.55;
      font('Anton', 400, size, false);
      const lay = layWords(ctx, words(true), W * 0.8);
      const last = cap.words.length - 1;
      const y0 = -(lay.lines.length - 1) * size * 0.5;
      draw(boxOf(lay, size, y0, 1.0), () => flow(lay, size, y0, 1.0, (i, x, y) => {
        const a = fadeA(i); if (a <= 0) return;
        const e = outExpo(clamp01((t - cap.words[i].s) / 0.2));
        ctx.globalAlpha = a;
        ctx.lineWidth = strokeW ?? size * 0.1; ctx.strokeStyle = strokeOr('rgba(0,0,0,0.85)');
        ctx.strokeText(lay.words[i], x, y + (1 - e) * size * 0.25);
        ctx.fillStyle = i === last ? acc(pack.accent) : fill('#FFFFFF');
        ctx.fillText(lay.words[i], x, y + (1 - e) * size * 0.25);
        ctx.globalAlpha = 1;
      }));
      break;
    }
    case 'underline': {
      font(pack.caption, 800, base);
      const lay = layWords(ctx, words(), W * 0.82);
      const y0 = -(lay.lines.length - 1) * base * 0.6;
      draw(boxOf(lay, base, y0, 1.2), () => flow(lay, base, y0, 1.2, (i, x, y) => {
        const a = fadeA(i); if (a <= 0) return;
        ctx.globalAlpha = a;
        ctx.lineWidth = strokeW ?? base * 0.12; ctx.strokeStyle = strokeOr('rgba(0,0,0,0.75)');
        ctx.strokeText(lay.words[i], x, y);
        ctx.fillStyle = fill('#FFFFFF');
        ctx.fillText(lay.words[i], x, y);
        if (i === act) {
          const e = outExpo(clamp01((t - cap.words[i].s) / 0.2));
          ctx.fillStyle = accT(pack.accent);
          ctx.fillRect(x, y + base * 0.55, lay.widths[i] * e, 7 * u);
        }
        ctx.globalAlpha = 1;
      }));
      break;
    }
    case 'minimal': {
      const size = base * 0.86;
      font(pack.body, 700, size, false);
      const lay = layWords(ctx, words(false, true), W * 0.7);
      draw(boxOf(lay, size, base * 0.6, 1.25), () => {
        if (!ov.shadow && !light) { ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 10 * u; ctx.shadowOffsetY = 2 * u; }
        flow(lay, size, base * 0.6, 1.25, (i, x, y) => { const a = fadeA(i); if (a <= 0) return; ctx.globalAlpha = a * 0.95; ctx.fillStyle = fill('#FFFFFF'); ctx.fillText(lay.words[i], x, y); });
      });
      break;
    }
    case 'frosted': {
      font(def.font, 700, base, false);
      const lay = layWords(ctx, words(), W * 0.8);
      const padX = 36 * u * k, padY = 24 * u * k;
      const bw = Math.max(...lay.lineW) + padX * 2;
      const bh = lay.lines.length * base * 1.15 + padY * 2;
      const bx = align === 'left' ? -padX : align === 'right' ? -bw + padX : -bw / 2, by = -bh / 2;
      draw({ x: bx, y: by, w: bw, h: bh }, () => {
        if (ov.bg !== false) {
          ctx.save();
          rrect(ctx, bx, by, bw, bh, 22 * u);
          ctx.clip();
          ctx.filter = `blur(${18 * u}px)`;
          const m = ctx.getTransform();
          ctx.drawImage(ctx.canvas, m.e + bx, m.f + by, bw, bh, bx, by, bw, bh);
          ctx.filter = 'none';
          ctx.fillStyle = ov.bgColor ? hexA(ov.bgColor, (ov.bgOpacity ?? 14) / 100) : 'rgba(255,255,255,0.14)';
          ctx.fillRect(bx, by, bw, bh);
          ctx.restore();
          ctx.strokeStyle = 'rgba(255,255,255,0.28)'; ctx.lineWidth = 1.5 * u;
          rrect(ctx, bx, by, bw, bh, 22 * u); ctx.stroke();
        }
        flow(lay, base, by + padY + base * 0.55, 1.15, (i, x, y) => { const a = fadeA(i); if (a <= 0) return; ctx.globalAlpha = a; ctx.fillStyle = i === act ? accT(pack.accent) : fill('#FFFFFF'); ctx.fillText(lay.words[i], x, y); });
      });
      break;
    }
    case 'serif': {
      const size = base * 1.15;
      font('Instrument Serif', 400, size, true);
      const lay = layWords(ctx, words(false, true), W * 0.8);
      const hi = strongest(lay.words);
      const y0 = -(lay.lines.length - 1) * size * 0.5;
      draw(boxOf(lay, size, y0, 1.05), () => {
        if (!ov.shadow && !light) { ctx.shadowColor = 'rgba(0,0,0,0.55)'; ctx.shadowBlur = 14 * u; }
        flow(lay, size, y0, 1.05, (i, x, y) => {
          const a = fadeA(i); if (a <= 0) return;
          const e = outExpo(clamp01((t - cap.words[i].s) / 0.3));
          ctx.globalAlpha = a;
          ctx.fillStyle = i === hi ? accT(pack.accent) : fill('#FFFFFF');
          ctx.fillText(lay.words[i], x, y + (1 - e) * 10 * u);
        });
      });
      break;
    }
  }
}
