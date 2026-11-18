// Background designs: one shape + pattern system per preset, in the preset's own colours.
// Drawn behind split panels, circles, arches, polaroids, bands, frames, stickers and full graphics.
// Patterns stay quiet (low alpha) so type on top reads; one signature shape per design, and at
// most one slow element moves.
import type { Pack } from './packs';
import type { MotifId } from './looks';
import { hexA } from './text';
import { MORE_MOTIFS } from './motifs2';

type Rect = { x: number; y: number; w: number; h: number };
type Fn = (ctx: CanvasRenderingContext2D, r: Rect, p: Pack, t: number, k: number) => void;

const TAU = Math.PI * 2;
const rnd = (i: number) => { const v = Math.sin(i * 127.1 + 311.7) * 43758.5453; return v - Math.floor(v); };
const hair = (k: number) => Math.max(1, 1.2 * k);

const broadcast: Fn = (ctx, { x, y, w, h }, p, t, k) => {
  const step = 54 * k, big = step * 4, ox = (t * 5 * k) % step;
  ctx.lineWidth = hair(k);
  ctx.strokeStyle = hexA(p.ink, 0.045);
  ctx.beginPath();
  for (let gx = x - step + ox; gx <= x + w; gx += step) { ctx.moveTo(gx, y); ctx.lineTo(gx, y + h); }
  for (let gy = y + step; gy < y + h; gy += step) { ctx.moveTo(x, gy); ctx.lineTo(x + w, gy); }
  ctx.stroke();
  ctx.strokeStyle = hexA(p.ink, 0.09);
  ctx.beginPath();
  for (let gx = x - step + ox - big; gx <= x + w; gx += big) { ctx.moveTo(gx, y); ctx.lineTo(gx, y + h); }
  for (let gy = y + big; gy < y + h; gy += big) { ctx.moveTo(x, gy); ctx.lineTo(x + w, gy); }
  ctx.stroke();
  // crop marks
  const m = 34 * k, L = 50 * k;
  ctx.strokeStyle = p.accent; ctx.lineWidth = 4 * k; ctx.lineCap = 'square';
  ctx.beginPath();
  ctx.moveTo(x + m, y + m + L); ctx.lineTo(x + m, y + m); ctx.lineTo(x + m + L, y + m);
  ctx.moveTo(x + w - m - L, y + m); ctx.lineTo(x + w - m, y + m); ctx.lineTo(x + w - m, y + m + L);
  ctx.moveTo(x + m, y + h - m - L); ctx.lineTo(x + m, y + h - m); ctx.lineTo(x + m + L, y + h - m);
  ctx.moveTo(x + w - m - L, y + h - m); ctx.lineTo(x + w - m, y + h - m); ctx.lineTo(x + w - m, y + h - m - L);
  ctx.stroke();
  // signal bars
  const n = 7, bw = 9 * k, gap = 7 * k, maxH = 64 * k;
  const bx = x + w - 100 * k - n * (bw + gap), by = y + h - 40 * k;
  ctx.fillStyle = hexA(p.accent, 0.4);
  for (let i = 0; i < n; i++) {
    const hh = maxH * (0.3 + 0.7 * (0.5 + 0.5 * Math.sin(t * 1.7 + i * 0.95)));
    ctx.fillRect(bx + i * (bw + gap), by - hh, bw, hh);
  }
};

const ledger: Fn = (ctx, { x, y, w, h }, p, t, k) => {
  ctx.lineWidth = hair(k);
  ctx.strokeStyle = hexA(p.ink, 0.05);
  ctx.beginPath();
  for (let gy = y + 64 * k; gy < y + h; gy += 58 * k) { ctx.moveTo(x, gy); ctx.lineTo(x + w, gy); }
  ctx.stroke();
  ctx.strokeStyle = hexA(p.accent, 0.3);
  ctx.beginPath();
  for (const d of [70, 78]) { ctx.moveTo(x + w - d * k, y); ctx.lineTo(x + w - d * k, y + h); }
  ctx.stroke();
  ctx.strokeStyle = hexA(p.accent, 0.24); ctx.lineWidth = 2 * k;
  ctx.strokeRect(x + 24 * k, y + 24 * k, w - 48 * k, h - 48 * k);
  ctx.strokeStyle = hexA(p.accent, 0.11); ctx.lineWidth = hair(k);
  ctx.strokeRect(x + 34 * k, y + 34 * k, w - 68 * k, h - 68 * k);
  // rotating seal
  const cx = x + w - 160 * k, cy = y + h - 160 * k, R = 118 * k, rot = t * 0.06;
  ctx.strokeStyle = hexA(p.accent, 0.18); ctx.lineWidth = 2 * k;
  ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.stroke();
  ctx.beginPath(); ctx.arc(cx, cy, R * 0.74, 0, TAU); ctx.stroke();
  ctx.beginPath();
  for (let i = 0; i < 60; i++) {
    const a = rot + (i / 60) * TAU;
    ctx.moveTo(cx + Math.cos(a) * R * 0.8, cy + Math.sin(a) * R * 0.8);
    ctx.lineTo(cx + Math.cos(a) * R * (i % 5 ? 0.88 : 0.95), cy + Math.sin(a) * R * (i % 5 ? 0.88 : 0.95));
  }
  ctx.stroke();
};

const chart: Fn = (ctx, { x, y, w, h }, p, t, k) => {
  const step = 80 * k;
  ctx.lineWidth = hair(k);
  ctx.strokeStyle = hexA(p.ink, 0.04);
  ctx.beginPath();
  for (let gx = x + step; gx < x + w; gx += step) { ctx.moveTo(gx, y); ctx.lineTo(gx, y + h); }
  for (let gy = y + step; gy < y + h; gy += step) { ctx.moveTo(x, gy); ctx.lineTo(x + w, gy); }
  ctx.stroke();
  const sp = 46 * k, cw = 16 * k, shift = t * 12 * k;
  const first = Math.floor(shift / sp), off = shift - first * sp;
  const n = Math.ceil(w / sp) + 2;
  const pts: [number, number][] = [];
  for (let i = 0; i < n; i++) {
    const idx = first + i;
    const cx = x + i * sp - off;
    const prog = (cx - x) / w;
    const mid = y + h * (0.86 - 0.3 * prog) + (rnd(idx) - 0.5) * h * 0.08;
    const bh = (0.02 + rnd(idx + 9) * 0.05) * h;
    ctx.fillStyle = rnd(idx + 3) > 0.35 ? hexA(p.accent, 0.22) : hexA(p.muted, 0.2);
    ctx.fillRect(cx - cw / 2, mid - bh / 2, cw, bh);
    ctx.fillRect(cx - k, mid - bh / 2 - h * 0.025, 2 * k, bh + h * 0.05);
    pts.push([cx, mid - h * 0.07]);
  }
  ctx.strokeStyle = hexA(p.accent, 0.38); ctx.lineWidth = 3 * k; ctx.lineJoin = 'round';
  ctx.beginPath();
  pts.forEach(([px, py], i) => (i ? ctx.lineTo(px, py) : ctx.moveTo(px, py)));
  ctx.stroke();
};

const rays: Fn = (ctx, { x, y, w, h }, p, t, k) => {
  const ox = x + w * 0.16, oy = y + h * 1.06, R = Math.hypot(w, h) * 1.4, N = 30, rot = t * 0.025;
  ctx.fillStyle = p.bg2;
  ctx.beginPath();
  for (let i = 0; i < N; i += 2) {
    const a0 = rot + (i / N) * TAU, a1 = rot + ((i + 1) / N) * TAU;
    ctx.moveTo(ox, oy); ctx.lineTo(ox + Math.cos(a0) * R, oy + Math.sin(a0) * R); ctx.lineTo(ox + Math.cos(a1) * R, oy + Math.sin(a1) * R); ctx.closePath();
  }
  ctx.fill();
  ctx.save();
  ctx.translate(x + w - 64 * k, y + h - 40 * k);
  ctx.rotate(0.55);
  ctx.fillStyle = p.accent;
  ctx.fillRect(-46 * k, -170 * k, 16 * k, 170 * k);
  ctx.fillRect(-14 * k, -170 * k, 16 * k, 170 * k);
  ctx.restore();
};

const drafting: Fn = (ctx, { x, y, w, h }, p, t, k) => {
  const s1 = 30 * k, s2 = s1 * 5;
  ctx.lineWidth = hair(k);
  ctx.strokeStyle = hexA(p.ink, 0.04);
  ctx.beginPath();
  for (let gx = x + s1; gx < x + w; gx += s1) { ctx.moveTo(gx, y); ctx.lineTo(gx, y + h); }
  for (let gy = y + s1; gy < y + h; gy += s1) { ctx.moveTo(x, gy); ctx.lineTo(x + w, gy); }
  ctx.stroke();
  ctx.strokeStyle = hexA(p.accent, 0.12);
  ctx.beginPath();
  for (let gx = x + s2; gx < x + w; gx += s2) { ctx.moveTo(gx, y); ctx.lineTo(gx, y + h); }
  for (let gy = y + s2; gy < y + h; gy += s2) { ctx.moveTo(x, gy); ctx.lineTo(x + w, gy); }
  ctx.stroke();
  const cx = x + w * 0.84, cy = y + h * 0.22, R = Math.min(w, h) * 0.24;
  ctx.strokeStyle = hexA(p.accent, 0.3); ctx.lineWidth = 2 * k;
  ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.stroke();
  ctx.beginPath(); ctx.arc(cx, cy, 6 * k, 0, TAU); ctx.stroke();
  ctx.setLineDash([8 * k, 8 * k]);
  ctx.beginPath(); ctx.moveTo(cx - R * 1.25, cy); ctx.lineTo(cx + R * 1.25, cy); ctx.moveTo(cx, cy - R * 1.25); ctx.lineTo(cx, cy + R * 1.25); ctx.stroke();
  ctx.setLineDash([]);
  const a = t * 0.3;
  ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R); ctx.stroke();
  const dy = y + h - 64 * k, d0 = x + 64 * k, d1 = x + w * 0.5;
  ctx.strokeStyle = hexA(p.accent, 0.42);
  ctx.beginPath();
  ctx.moveTo(d0, dy); ctx.lineTo(d1, dy);
  ctx.moveTo(d0, dy - 14 * k); ctx.lineTo(d0, dy + 14 * k); ctx.moveTo(d1, dy - 14 * k); ctx.lineTo(d1, dy + 14 * k);
  ctx.moveTo(d0 + 16 * k, dy - 8 * k); ctx.lineTo(d0, dy); ctx.lineTo(d0 + 16 * k, dy + 8 * k);
  ctx.moveTo(d1 - 16 * k, dy - 8 * k); ctx.lineTo(d1, dy); ctx.lineTo(d1 - 16 * k, dy + 8 * k);
  ctx.stroke();
};

const waves: Fn = (ctx, { x, y, w, h }, p, t, k) => {
  const cx = x - w * 0.06, cy = y + h * 0.42, gap = 46 * k, maxR = Math.hypot(w, h) * 1.05;
  ctx.lineWidth = 2 * k;
  for (let R = ((t * 14 * k) % gap) + gap; R < maxR; R += gap) {
    ctx.strokeStyle = hexA(p.ink, 0.075 * (1 - R / maxR));
    ctx.beginPath(); ctx.arc(cx, cy, R, -Math.PI / 2, Math.PI / 2); ctx.stroke();
  }
  const pitch = 14 * k, n = Math.floor(w / pitch), base = y + h - h * 0.085, amp = h * 0.05;
  ctx.fillStyle = hexA(p.accent, 0.32);
  for (let i = 0; i < n; i++) {
    const v = 0.15 + 0.85 * Math.abs(Math.sin(i * 0.37 + t * 2.1) * Math.sin(i * 0.11 - t * 0.6));
    const bh = Math.max(2 * k, amp * v);
    ctx.fillRect(x + pitch / 2 + i * pitch, base - bh, 6 * k, bh * 2);
  }
};

const speed: Fn = (ctx, { x, y, w, h }, p, t, k) => {
  ctx.save();
  ctx.translate(x + w / 2, y + h / 2);
  ctx.rotate(-0.34);
  const L = Math.hypot(w, h), band = 70 * k, gap = 190 * k, off = (t * 26 * k) % gap;
  ctx.fillStyle = p.bg2;
  for (let s = -L - gap + off; s < L; s += gap) ctx.fillRect(s, -L, band, 2 * L);
  ctx.restore();
  const step = 24 * k, D = Math.min(w, h) * 0.5;
  ctx.fillStyle = hexA(p.accent, 0.5);
  ctx.beginPath();
  for (let gy = y + step / 2; gy < y + D; gy += step) {
    for (let gx = x + w - step / 2; gx > x + w - D; gx -= step) {
      const rad = 6 * k * (1 - Math.hypot(x + w - gx, gy - y) / D);
      if (rad > 0.6 * k) { ctx.moveTo(gx + rad, gy); ctx.arc(gx, gy, rad, 0, TAU); }
    }
  }
  ctx.fill();
};

function blob(ctx: CanvasRenderingContext2D, cx: number, cy: number, R: number, t: number, seed: number) {
  ctx.beginPath();
  for (let i = 0; i <= 72; i++) {
    const a = (i / 72) * TAU;
    const rr = R * (1 + 0.09 * Math.sin(3 * a + t * 0.35 + seed) + 0.05 * Math.sin(5 * a - t * 0.25 + seed * 2));
    const px = cx + Math.cos(a) * rr, py = cy + Math.sin(a) * rr;
    if (i) ctx.lineTo(px, py); else ctx.moveTo(px, py);
  }
  ctx.closePath();
}

const picnic: Fn = (ctx, { x, y, w, h }, p, t, k) => {
  const m = Math.min(w, h);
  ctx.fillStyle = p.bg2;
  blob(ctx, x + w * 0.96, y + h * 0.06, m * 0.34, t, 1); ctx.fill();
  blob(ctx, x + w * 0.02, y + h * 0.7, m * 0.24, t, 4); ctx.fill();
  const bh = Math.min(h * 0.09, 120 * k), by = y + h - bh, c = 26 * k;
  ctx.save();
  ctx.beginPath(); ctx.rect(x, by, w, bh); ctx.clip();
  ctx.fillStyle = hexA(p.accent, 0.14);
  for (let gx = x; gx < x + w; gx += 2 * c) ctx.fillRect(gx, by, c, bh);
  for (let gy = by; gy < by + bh; gy += 2 * c) ctx.fillRect(x, gy, w, c);
  ctx.restore();
  ctx.fillStyle = hexA(p.accent, 0.55);
  ctx.fillRect(x, by - 3 * k, w, 3 * k);
  ctx.fillStyle = hexA(p.ink, 0.12);
  for (let i = 0; i < 16; i++) {
    const sx = x + rnd(i * 3 + 1) * w, sy = y + 20 * k + rnd(i * 3 + 2) * (h - bh - 40 * k);
    ctx.save();
    ctx.translate(sx, sy); ctx.rotate(rnd(i * 3 + 3) * Math.PI);
    ctx.beginPath(); ctx.ellipse(0, 0, 7 * k, 3.5 * k, 0, 0, TAU); ctx.fill();
    ctx.restore();
  }
};

const deco: Fn = (ctx, { x, y, w, h }, p, _t, k) => {
  ctx.lineWidth = hair(k);
  ctx.strokeStyle = hexA(p.ink, 0.035);
  ctx.beginPath();
  for (let gx = x + 27 * k; gx < x + w; gx += 54 * k) { ctx.moveTo(gx, y); ctx.lineTo(gx, y + h); }
  ctx.stroke();
  const fan = (cx: number, cy: number, a0: number) => {
    ctx.strokeStyle = hexA(p.accent, 0.26); ctx.lineWidth = 2 * k;
    for (let R = 70 * k; R <= 380 * k; R += 62 * k) { ctx.beginPath(); ctx.arc(cx, cy, R, a0, a0 + Math.PI / 2); ctx.stroke(); }
    ctx.strokeStyle = hexA(p.accent, 0.14);
    ctx.beginPath();
    for (let i = 1; i < 6; i++) {
      const a = a0 + (i / 6) * (Math.PI / 2);
      ctx.moveTo(cx + Math.cos(a) * 70 * k, cy + Math.sin(a) * 70 * k);
      ctx.lineTo(cx + Math.cos(a) * 380 * k, cy + Math.sin(a) * 380 * k);
    }
    ctx.stroke();
  };
  fan(x, y + h, -Math.PI / 2);
  fan(x + w, y + h, Math.PI);
  const ty = y + 44 * k, tx = x + w / 2;
  ctx.strokeStyle = hexA(p.accent, 0.42); ctx.lineWidth = 1.5 * k;
  ctx.beginPath(); ctx.moveTo(tx - 150 * k, ty); ctx.lineTo(tx - 18 * k, ty); ctx.moveTo(tx + 18 * k, ty); ctx.lineTo(tx + 150 * k, ty); ctx.stroke();
  ctx.fillStyle = hexA(p.accent, 0.75);
  ctx.beginPath(); ctx.moveTo(tx, ty - 9 * k); ctx.lineTo(tx + 9 * k, ty); ctx.lineTo(tx, ty + 9 * k); ctx.lineTo(tx - 9 * k, ty); ctx.closePath(); ctx.fill();
};

const notebook: Fn = (ctx, { x, y, w, h }, p, _t, k) => {
  ctx.lineWidth = Math.max(1, 1.4 * k);
  ctx.strokeStyle = hexA(p.muted, 0.22);
  ctx.beginPath();
  for (let gy = y + 110 * k; gy < y + h; gy += 52 * k) { ctx.moveTo(x, gy); ctx.lineTo(x + w, gy); }
  ctx.stroke();
  ctx.strokeStyle = hexA(p.accent, 0.5); ctx.lineWidth = 2 * k;
  ctx.beginPath(); ctx.moveTo(x + 52 * k, y); ctx.lineTo(x + 52 * k, y + h); ctx.stroke();
  for (const f of [0.22, 0.5, 0.78]) {
    ctx.fillStyle = p.bg2;
    ctx.beginPath(); ctx.arc(x + 24 * k, y + h * f, 10 * k, 0, TAU); ctx.fill();
    ctx.strokeStyle = hexA(p.ink, 0.12); ctx.lineWidth = 1.5 * k; ctx.stroke();
  }
};

const orbits: Fn = (ctx, { x, y, w, h }, p, t, k) => {
  const S = Math.max(w, h * 0.56);
  const orbs: [number, number][] = [[0.26 * S, 0.1 * S], [0.42 * S, 0.16 * S], [0.6 * S, 0.23 * S]];
  ctx.save();
  ctx.translate(x + w * 0.8, y + h * 0.26);
  ctx.rotate(-0.38);
  ctx.setLineDash([10 * k, 12 * k]); ctx.lineWidth = 2 * k; ctx.strokeStyle = hexA(p.ink, 0.13);
  for (const [rx, ry] of orbs) { ctx.beginPath(); ctx.ellipse(0, 0, rx, ry, 0, 0, TAU); ctx.stroke(); }
  ctx.setLineDash([]);
  ctx.fillStyle = p.bg2;
  ctx.beginPath(); ctx.arc(0, 0, 46 * k, 0, TAU); ctx.fill();
  orbs.forEach(([rx, ry], i) => {
    const a = t * (0.32 / (i + 1)) + i * 2.1;
    ctx.fillStyle = i === 0 ? p.accent : hexA(p.ink, 0.35);
    ctx.beginPath(); ctx.arc(Math.cos(a) * rx, Math.sin(a) * ry, (i === 0 ? 9 : 6) * k, 0, TAU); ctx.fill();
  });
  ctx.restore();
};

const typewall: Fn = (ctx, { x, y, w, h }, p, t, k) => {
  const word = `${(p.subject || p.name).toUpperCase()}  ·  `;
  const size = 150 * k;
  ctx.font = `800 ${Math.max(8, Math.round(size))}px "Archivo", sans-serif`;
  ctx.textBaseline = 'alphabetic';
  const seg = ctx.measureText(word).width;
  if (seg <= 0) return;
  ctx.lineWidth = 2 * k;
  ctx.strokeStyle = hexA(p.ink, 0.06);
  ctx.fillStyle = hexA(p.accent, 0.1);
  let row = 0;
  for (let by = y + size * 0.9; by < y + h + size; by += size * 0.98, row++) {
    const dir = row % 2 ? 1 : -1;
    const off = (((t * 22 * k * dir) % seg) + seg) % seg;
    for (let tx = x - 2 * seg + off; tx < x + w; tx += seg) {
      if (row === 2) ctx.fillText(word, tx, by); else ctx.strokeText(word, tx, by);
    }
  }
};

const contours: Fn = (ctx, { x, y, w, h }, p, t, k) => {
  const ring = (cx: number, cy: number, seed: number) => {
    for (let l = 0; l < 7; l++) {
      const R = (50 + l * 52) * k;
      ctx.beginPath();
      for (let i = 0; i <= 90; i++) {
        const a = (i / 90) * TAU;
        const rr = R * (1 + 0.13 * Math.sin(3 * a + l * 0.45 + seed + t * 0.12) + 0.06 * Math.sin(5 * a - l * 0.3 + seed * 1.7));
        const px = cx + Math.cos(a) * rr, py = cy + Math.sin(a) * rr * 0.86;
        if (i) ctx.lineTo(px, py); else ctx.moveTo(px, py);
      }
      ctx.stroke();
    }
  };
  ctx.strokeStyle = hexA(p.accent, 0.2); ctx.lineWidth = 1.6 * k;
  ring(x + w * 0.9, y + h * 0.14, 1.3);
  ring(x + w * 0.06, y + h * 0.9, 4.1);
  const ax = x + w * 0.08, ay = y + h * 0.9, cx = x + w * 0.55, cy = y + h * 0.48, bx = x + w * 0.95, by = y + h * 0.66;
  ctx.setLineDash([10 * k, 10 * k]); ctx.strokeStyle = hexA(p.ink, 0.25); ctx.lineWidth = 2 * k;
  ctx.beginPath(); ctx.moveTo(ax, ay); ctx.quadraticCurveTo(cx, cy, bx, by); ctx.stroke();
  ctx.setLineDash([]);
  const s = (t * 0.05) % 1, q = 1 - s;
  ctx.fillStyle = p.accent;
  ctx.beginPath(); ctx.arc(q * q * ax + 2 * q * s * cx + s * s * bx, q * q * ay + 2 * q * s * cy + s * s * by, 7 * k, 0, TAU); ctx.fill();
};

const soft: Fn = (ctx, { x, y, w, h }, p, t, k) => {
  const m = Math.min(w, h);
  ctx.fillStyle = hexA(p.bg2, 0.8);
  ([[0.94, 0.08, 0.42], [0.66, -0.06, 0.24], [0.04, 0.96, 0.34]] as const).forEach(([fx, fy, fr], i) => {
    ctx.beginPath(); ctx.arc(x + w * fx, y + h * fy, m * fr * (1 + 0.025 * Math.sin(t * 0.5 + i * 2)), 0, TAU); ctx.fill();
  });
  const step = 72 * k, a = 6 * k;
  ctx.strokeStyle = hexA(p.accent, 0.18); ctx.lineWidth = 2 * k; ctx.lineCap = 'round';
  ctx.beginPath();
  for (let gy = y + step / 2; gy < y + h; gy += step) for (let gx = x + step / 2; gx < x + w; gx += step) { ctx.moveTo(gx - a, gy); ctx.lineTo(gx + a, gy); ctx.moveTo(gx, gy - a); ctx.lineTo(gx, gy + a); }
  ctx.stroke();
};

const GLYPHS = '01{}[]<>/=+*;:#$&|abcdef';
const code: Fn = (ctx, { x, y, w, h }, p, t, k) => {
  const fs = Math.max(6, Math.round(22 * k)), colW = 46 * k, rowH = 34 * k;
  ctx.font = `500 ${fs}px "JetBrains Mono", monospace`;
  ctx.textBaseline = 'top';
  const cols = Math.ceil(w / colW), rows = Math.ceil(h / rowH) + 1;
  for (let c = 0; c < cols; c++) {
    const scroll = t * (10 + rnd(c * 7.3) * 18) * k + rnd(c) * h;
    const first = Math.floor(scroll / rowH), off = scroll - first * rowH;
    const len = 8 + Math.floor(rnd(c + 0.5) * 14), period = len + 10 + Math.floor(rnd(c + 0.9) * 16);
    for (let j = 0; j < rows; j++) {
      const id = j - first;
      const ph = ((id % period) + period) % period;
      if (ph >= len) continue;
      ctx.fillStyle = ph === len - 1 ? hexA(p.accent, 0.4) : hexA(p.ink, 0.07);
      ctx.fillText(GLYPHS[Math.floor(rnd(c * 131 + id) * GLYPHS.length)], x + c * colW + 12 * k, y - rowH + j * rowH + off);
    }
  }
  ctx.font = `800 ${Math.max(8, Math.round(240 * k))}px "JetBrains Mono", monospace`;
  ctx.textAlign = 'right'; ctx.textBaseline = 'alphabetic';
  ctx.strokeStyle = hexA(p.accent, 0.15); ctx.lineWidth = 3 * k;
  ctx.strokeText('</>', x + w - 40 * k, y + h - 50 * k);
  ctx.textAlign = 'left';
};

const herringbone: Fn = (ctx, { x, y, w, h }, p, _t, k) => {
  const c = 34 * k, hs = c * 0.5;
  ctx.strokeStyle = hexA(p.ink, 0.05); ctx.lineWidth = 1.6 * k;
  ctx.beginPath();
  let col = 0;
  for (let gx = x; gx < x + w; gx += c, col++) {
    for (let gy = y - c; gy < y + h; gy += hs) {
      if (col % 2) { ctx.moveTo(gx, gy); ctx.lineTo(gx + c, gy + c); } else { ctx.moveTo(gx, gy + c); ctx.lineTo(gx + c, gy); }
    }
  }
  ctx.stroke();
  const fx = x + 30 * k, fy = y + 30 * k, fw = w - 60 * k, fh = h - 60 * k;
  const R = Math.min(fw / 2, fh * 0.45);
  ctx.strokeStyle = hexA(p.accent, 0.34); ctx.lineWidth = 2 * k;
  ctx.beginPath(); ctx.roundRect(fx, fy, fw, fh, [R, R, 0, 0]); ctx.stroke();
  const i = 12 * k;
  ctx.strokeStyle = hexA(p.accent, 0.14); ctx.lineWidth = hair(k);
  ctx.beginPath(); ctx.roundRect(fx + i, fy + i, fw - 2 * i, fh - 2 * i, [Math.max(0, R - i), Math.max(0, R - i), 0, 0]); ctx.stroke();
};

const FNS: Record<MotifId, Fn> = { broadcast, ledger, chart, rays, drafting, waves, speed, picnic, deco, notebook, orbits, typewall, contours, soft, code, herringbone, ...MORE_MOTIFS };

/** The last layer when it is a gradient or a photo (a flat colour is just p.bg). */
function paintBase(ctx: CanvasRenderingContext2D, r: Rect, b: NonNullable<Pack['base']>, t: number) {
  if (b.kind === 'gradient') {
    const a = (b.angle * Math.PI) / 180, cx = r.x + r.w / 2, cy = r.y + r.h / 2, L = Math.hypot(r.w, r.h) / 2;
    const gr = ctx.createLinearGradient(cx - Math.sin(a) * L, cy + Math.cos(a) * L, cx + Math.sin(a) * L, cy - Math.cos(a) * L);
    gr.addColorStop(0, b.a); gr.addColorStop(1, b.b);
    ctx.fillStyle = gr; ctx.fillRect(r.x, r.y, r.w, r.h);
    return;
  }
  // Photo: cover the rect, with a very slow push-in; darkened so type on top reads.
  const z = 1.04 + Math.sin(t * 0.15) * 0.02;
  const s = Math.max(r.w / b.w, r.h / b.h) * z, dw = b.w * s, dh = b.h * s;
  ctx.drawImage(b.img, r.x + (r.w - dw) / 2, r.y + (r.h - dh) / 2, dw, dh);
  if (b.dim > 0) { ctx.fillStyle = `rgba(0,0,0,${b.dim})`; ctx.fillRect(r.x, r.y, r.w, r.h); }
}

/** Fill a rect with the preset colour and its background design. k = frame short side / 1080. */
export function drawMotif(ctx: CanvasRenderingContext2D, r: Rect, p: Pack, t: number, k: number, id: MotifId = p.motif) {
  ctx.save();
  ctx.beginPath(); ctx.rect(r.x, r.y, r.w, r.h); ctx.clip();
  ctx.fillStyle = p.bg;
  ctx.fillRect(r.x, r.y, r.w, r.h);
  if (p.base) paintBase(ctx, r, p.base, t);
  (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = '0px';
  ctx.setLineDash([]);
  ctx.lineCap = 'butt';
  ctx.lineJoin = 'miter';
  ctx.textAlign = 'left';
  (FNS[id] ?? broadcast)(ctx, r, p, t, k);
  ctx.restore();
}
