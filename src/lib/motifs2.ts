// Background designs for the v0.5 presets (one per preset). Same rules as motifs.ts: the preset's own
// colours, low alpha so type on top reads, one signature shape, at most one slow moving element.
import type { Pack } from './packs';
import { hexA } from './text';

type Rect = { x: number; y: number; w: number; h: number };
export type MotifFn = (ctx: CanvasRenderingContext2D, r: Rect, p: Pack, t: number, k: number) => void;

const TAU = Math.PI * 2;
const rnd = (i: number) => { const v = Math.sin(i * 127.1 + 311.7) * 43758.5453; return v - Math.floor(v); };
const hair = (k: number) => Math.max(1, 1.2 * k);
const wrap = (v: number, a: number, b: number) => a + ((((v - a) % (b - a)) + (b - a)) % (b - a));

// Sports: court lines, keys and arcs; the ball travels the centre circle.
const court: MotifFn = (ctx, { x, y, w, h }, p, t, k) => {
  const m = 40 * k, cx = x + w / 2, cy = y + h / 2;
  ctx.strokeStyle = hexA(p.ink, 0.085); ctx.lineWidth = 3 * k;
  ctx.strokeRect(x + m, y + m, w - 2 * m, h - 2 * m);
  ctx.beginPath(); ctx.moveTo(x + m, cy); ctx.lineTo(x + w - m, cy); ctx.stroke();
  const R = Math.min(w, h) * 0.13;
  ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.stroke();
  const kw = Math.min(w * 0.34, 380 * k), kh = Math.min(h * 0.15, 320 * k), arcR = Math.min(w * 0.42, h * 0.3);
  for (const top of [true, false]) {
    const by = top ? y + m : y + h - m;
    ctx.strokeRect(cx - kw / 2, top ? by : by - kh, kw, kh);
    ctx.beginPath(); ctx.arc(cx, top ? by + kh : by - kh, kw / 2, top ? 0 : Math.PI, top ? Math.PI : TAU); ctx.stroke();
    ctx.beginPath(); ctx.arc(cx, by, arcR, top ? 0.1 : Math.PI + 0.1, top ? Math.PI - 0.1 : TAU - 0.1); ctx.stroke();
  }
  ctx.fillStyle = p.accent;
  const a = t * 0.7;
  ctx.beginPath(); ctx.arc(cx + Math.cos(a) * R, cy + Math.sin(a) * R, 8 * k, 0, TAU); ctx.fill();
};

// Gaming: an 8-bit pixel field that builds up toward the bottom; a few pixels blink in the accent.
const pixels: MotifFn = (ctx, { x, y, w, h }, p, t, k) => {
  const s = 30 * k, cols = Math.ceil(w / s), rows = Math.ceil(h / s);
  ctx.fillStyle = hexA(p.ink, 0.06);
  for (let j = 0; j < rows; j++) {
    const d = Math.pow(j / rows, 2.2) * 0.75;
    for (let i = 0; i < cols; i++) if (rnd(i * 91 + j * 7) < d) ctx.fillRect(x + i * s + 2 * k, y + j * s + 2 * k, s - 4 * k, s - 4 * k);
  }
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
    if (rnd(i * 13 + j * 29) < 0.988) continue;
    const a = 0.5 + 0.5 * Math.sin(t * 2.4 + i * 1.7 + j);
    ctx.fillStyle = hexA(p.accent, 0.15 + 0.6 * a);
    ctx.fillRect(x + i * s + 2 * k, y + j * s + 2 * k, s - 4 * k, s - 4 * k);
  }
};

// Cars: a livery stripe across the lower-right corner, clear of the type; speed lines run along it.
const stripes: MotifFn = (ctx, { x, y, w, h }, p, t, k) => {
  const L = Math.hypot(w, h), S = Math.min(w, h);
  ctx.save();
  ctx.translate(x + w, y + h - S * 0.3);
  ctx.rotate(-0.42);
  ctx.fillStyle = hexA(p.ink, 0.055); ctx.fillRect(-L, -150 * k, 2 * L, 110 * k);
  ctx.fillStyle = hexA(p.accent, 0.85); ctx.fillRect(-L, -14 * k, 2 * L, 40 * k);
  ctx.fillStyle = hexA(p.accent, 0.4); ctx.fillRect(-L, 42 * k, 2 * L, 12 * k);
  ctx.strokeStyle = hexA(p.ink, 0.12); ctx.lineWidth = 2 * k;
  ctx.setLineDash([60 * k, 26 * k]); ctx.lineDashOffset = -t * 50 * k;
  ctx.beginPath();
  for (const off of [-196, -222]) { ctx.moveTo(-L, off * k); ctx.lineTo(L, off * k); }
  ctx.stroke();
  ctx.restore();
};

// Books: a set text column, a margin rule, stacked page edges and a bookmark ribbon.
const pages: MotifFn = (ctx, { x, y, w, h }, p, t, k) => {
  const left = x + 96 * k;
  ctx.fillStyle = hexA(p.ink, 0.05);
  for (let i = 0, yy = y + 110 * k; yy < y + h - 170 * k; i++, yy += 46 * k) {
    if (i % 7 === 6) continue;
    const len = (w - 190 * k) * (i % 7 === 5 ? 0.45 : 0.72 + 0.28 * rnd(i));
    ctx.fillRect(left, yy, len, 9 * k);
  }
  ctx.strokeStyle = hexA(p.accent, 0.35); ctx.lineWidth = hair(k);
  ctx.beginPath(); ctx.moveTo(x + 64 * k, y); ctx.lineTo(x + 64 * k, y + h); ctx.stroke();
  ctx.strokeStyle = hexA(p.ink, 0.09);
  ctx.beginPath();
  for (let j = 0; j < 9; j++) { const yy = y + h - 34 * k - j * 7 * k; ctx.moveTo(x + 40 * k + j * 3 * k, yy); ctx.lineTo(x + w - 40 * k - j * 3 * k, yy); }
  ctx.stroke();
  const rx = x + w - 200 * k, rw = 30 * k, rh = 230 * k;
  ctx.save();
  ctx.translate(rx + rw / 2, y);
  ctx.rotate(Math.sin(t * 0.7) * 0.03);
  ctx.fillStyle = hexA(p.accent, 0.85);
  ctx.beginPath(); ctx.moveTo(-rw / 2, 0); ctx.lineTo(rw / 2, 0); ctx.lineTo(rw / 2, rh); ctx.lineTo(0, rh - 18 * k); ctx.lineTo(-rw / 2, rh); ctx.closePath(); ctx.fill();
  ctx.restore();
};

// Weddings & events: a colonnade of arches and a scatter of twinkling pearls.
const arches: MotifFn = (ctx, { x, y, w, h }, p, t, k) => {
  const n = Math.max(3, Math.round(w / (230 * k))), aw = w / n, ah = h * 0.4;
  for (let i = 0; i < n; i++) {
    const ax = x + i * aw + aw * 0.14, wi = aw * 0.72, top = y + h - ah;
    for (const [off, a] of [[0, 0.24], [9 * k, 0.11]] as const) {
      ctx.strokeStyle = hexA(p.accent, a); ctx.lineWidth = off ? hair(k) : 2 * k;
      ctx.beginPath();
      ctx.moveTo(ax + off, y + h);
      ctx.lineTo(ax + off, top + wi / 2);
      ctx.arc(ax + wi / 2, top + wi / 2, wi / 2 - off, Math.PI, 0);
      ctx.lineTo(ax + wi - off, y + h);
      ctx.stroke();
    }
  }
  for (let i = 0; i < 46; i++) {
    const px = x + rnd(i * 3.1) * w, py = y + rnd(i * 7.7) * h * 0.55;
    ctx.fillStyle = hexA(p.accent, 0.12 + 0.16 * (0.5 + 0.5 * Math.sin(t * 1.3 + i)));
    ctx.beginPath(); ctx.arc(px, py, (2 + 3 * rnd(i)) * k, 0, TAU); ctx.fill();
  }
};

// Parenting: soft toy shapes scattered and gently bobbing.
const blocks: MotifFn = (ctx, { x, y, w, h }, p, t, k) => {
  for (let i = 0; i < 14; i++) {
    const s = (46 + 60 * rnd(i * 5)) * k;
    const px = x + rnd(i * 2.3) * w, py = y + rnd(i * 9.1) * h + Math.sin(t * 0.8 + i) * 8 * k;
    const kind = i % 4;
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate((rnd(i * 4.4) - 0.5) * 0.8);
    ctx.fillStyle = i % 3 === 0 ? hexA(p.accent, 0.16) : hexA(p.ink, 0.05);
    ctx.beginPath();
    if (kind === 0) ctx.arc(0, 0, s / 2, 0, TAU);
    else if (kind === 1) ctx.roundRect(-s / 2, -s / 2, s, s, 12 * k);
    else if (kind === 2) { ctx.moveTo(0, -s / 2); ctx.lineTo(s / 2, s / 2); ctx.lineTo(-s / 2, s / 2); ctx.closePath(); }
    else ctx.arc(0, s / 4, s / 2, Math.PI, 0);
    ctx.fill();
    ctx.restore();
  }
};

// Crypto: a hex grid with one chain of linked nodes; the head node pulses.
const hex: MotifFn = (ctx, { x, y, w, h }, p, t, k) => {
  const s = 46 * k, dx = s * 1.5, dy = s * Math.sqrt(3);
  ctx.strokeStyle = hexA(p.ink, 0.06); ctx.lineWidth = hair(k);
  ctx.beginPath();
  for (let i = 0, cx = x; cx < x + w + s; i++, cx += dx) {
    for (let cy = y + (i % 2 ? dy / 2 : 0); cy < y + h + s; cy += dy) {
      for (let v = 0; v <= 6; v++) { const a = (v / 6) * TAU; const px = cx + Math.cos(a) * s, py = cy + Math.sin(a) * s; if (v) ctx.lineTo(px, py); else ctx.moveTo(px, py); }
    }
  }
  ctx.stroke();
  const pts: [number, number][] = [];
  for (let i = 0; i < 6; i++) { const col = 2 + i * 2, row = 2 + i * 2 + (i % 2); pts.push([x + col * dx, y + row * dy * 0.5 + (col % 2 ? dy / 2 : 0)]); }
  ctx.strokeStyle = hexA(p.accent, 0.3); ctx.lineWidth = 3 * k;
  ctx.beginPath(); pts.forEach(([px, py], i) => (i ? ctx.lineTo(px, py) : ctx.moveTo(px, py))); ctx.stroke();
  pts.forEach(([px, py], i) => {
    const pulse = i === pts.length - 1 ? 1 + 0.35 * (0.5 + 0.5 * Math.sin(t * 2.6)) : 1;
    ctx.fillStyle = hexA(p.accent, i === pts.length - 1 ? 0.9 : 0.55);
    ctx.beginPath(); ctx.arc(px, py, 7 * k * pulse, 0, TAU); ctx.fill();
  });
};

// AI tools: circuit traces with pads; three signals travel along them.
const circuit: MotifFn = (ctx, { x, y, w, h }, p, t, k) => {
  const traces: [number, number][][] = [];
  for (let i = 0; i < 12; i++) {
    let px = x + (rnd(i * 3) < 0.5 ? 0 : w), py = y + rnd(i * 7) * h;
    const dir = px === x ? 1 : -1;
    const pts: [number, number][] = [[px, py]];
    for (let s = 0; s < 4; s++) {
      if (s % 2 === 0) px += dir * (60 + 160 * rnd(i * 11 + s)) * k; else py += (rnd(i * 13 + s) - 0.5) * 260 * k;
      pts.push([px, py]);
    }
    traces.push(pts);
  }
  ctx.strokeStyle = hexA(p.ink, 0.09); ctx.lineWidth = 3 * k; ctx.lineJoin = 'round';
  ctx.beginPath(); for (const tr of traces) tr.forEach(([px, py], i) => (i ? ctx.lineTo(px, py) : ctx.moveTo(px, py))); ctx.stroke();
  ctx.lineWidth = 2.5 * k;
  for (const tr of traces) { const [px, py] = tr[tr.length - 1]; ctx.beginPath(); ctx.arc(px, py, 7 * k, 0, TAU); ctx.stroke(); }
  ctx.fillStyle = p.accent;
  for (let i = 0; i < 3; i++) {
    const tr = traces[i * 4];
    const lens = tr.slice(1).map(([px, py], j) => Math.hypot(px - tr[j][0], py - tr[j][1]));
    const total = lens.reduce((a, b) => a + b, 0);
    let d = ((t * 0.18 + i * 0.33) % 1) * total, j = 0;
    while (j < lens.length - 1 && d > lens[j]) { d -= lens[j]; j++; }
    const f = lens[j] ? d / lens[j] : 0;
    ctx.beginPath(); ctx.arc(tr[j][0] + (tr[j + 1][0] - tr[j][0]) * f, tr[j][1] + (tr[j + 1][1] - tr[j][1]) * f, 6 * k, 0, TAU); ctx.fill();
  }
};

// Breaking news: a dotted globe, latitude lines and a scan band; the live dot blinks.
const wire: MotifFn = (ctx, { x, y, w, h }, p, t, k) => {
  ctx.strokeStyle = hexA(p.ink, 0.045); ctx.lineWidth = hair(k);
  ctx.beginPath(); for (let gy = y + 40 * k; gy < y + h; gy += 80 * k) { ctx.moveTo(x, gy); ctx.lineTo(x + w, gy); } ctx.stroke();
  const R = Math.min(w, h) * 0.46, cx = x + w * 0.72, cy = y + h * 0.5;
  ctx.fillStyle = hexA(p.ink, 0.1);
  for (let la = -80; la <= 80; la += 10) for (let lo = -180; lo < 180; lo += 10) {
    const a = ((lo + t * 6) * Math.PI) / 180, b = (la * Math.PI) / 180;
    const z = Math.cos(b) * Math.cos(a);
    if (z < 0) continue;
    ctx.beginPath(); ctx.arc(cx + R * Math.cos(b) * Math.sin(a), cy - R * Math.sin(b), (1.5 + 1.5 * z) * k, 0, TAU); ctx.fill();
  }
  ctx.strokeStyle = hexA(p.ink, 0.08); ctx.lineWidth = 2 * k;
  ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.stroke();
  const sy = y + wrap(t * 120 * k, 0, h);
  ctx.fillStyle = hexA(p.accent, 0.08); ctx.fillRect(x, sy, w, 36 * k);
  ctx.fillStyle = hexA(p.accent, Math.sin(t * 4) > 0 ? 1 : 0.25);
  ctx.beginPath(); ctx.arc(x + 54 * k, y + 54 * k, 10 * k, 0, TAU); ctx.fill();
};

// History: an archive card with a dashed border, photo corners and a slanted seal.
const stamp: MotifFn = (ctx, { x, y, w, h }, p, t, k) => {
  const m = 34 * k;
  ctx.strokeStyle = hexA(p.ink, 0.16); ctx.lineWidth = 2 * k; ctx.setLineDash([14 * k, 10 * k]);
  ctx.strokeRect(x + m, y + m, w - 2 * m, h - 2 * m);
  ctx.setLineDash([]);
  ctx.fillStyle = hexA(p.ink, 0.1);
  const c = 46 * k;
  for (const [cx, cy, sx, sy] of [[x + m, y + m, 1, 1], [x + w - m, y + m, -1, 1], [x + m, y + h - m, 1, -1], [x + w - m, y + h - m, -1, -1]] as const) {
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + sx * c, cy); ctx.lineTo(cx, cy + sy * c); ctx.closePath(); ctx.fill();
  }
  ctx.fillStyle = hexA(p.ink, 0.06);
  for (let i = 0; i < 4; i++) ctx.fillRect(x + 80 * k, y + h - 190 * k + i * 30 * k, (i === 0 ? 260 : 180 + 90 * rnd(i)) * k, 8 * k);
  const sx = x + w - 190 * k, sy = y + h - 230 * k, R = 110 * k;
  ctx.save();
  ctx.translate(sx, sy); ctx.rotate(-0.22 + Math.sin(t * 0.4) * 0.015);
  ctx.strokeStyle = hexA(p.accent, 0.42); ctx.lineWidth = 4 * k;
  ctx.beginPath(); ctx.arc(0, 0, R, 0, TAU); ctx.stroke();
  ctx.lineWidth = 2 * k;
  ctx.beginPath(); ctx.arc(0, 0, R - 14 * k, 0, TAU); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-R * 0.7, -10 * k); ctx.lineTo(R * 0.7, -10 * k); ctx.moveTo(-R * 0.7, 18 * k); ctx.lineTo(R * 0.7, 18 * k); ctx.stroke();
  ctx.fillStyle = hexA(p.accent, 0.42);
  for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + (i - 2) * 0.5; ctx.beginPath(); ctx.arc(Math.cos(a) * (R - 42 * k), Math.sin(a) * (R - 42 * k), 5 * k, 0, TAU); ctx.fill(); }
  ctx.restore();
};

// Science: graph paper and three slowly turning molecules.
const molecule: MotifFn = (ctx, { x, y, w, h }, p, t, k) => {
  const g = 40 * k;
  ctx.strokeStyle = hexA(p.ink, 0.04); ctx.lineWidth = hair(k);
  ctx.beginPath();
  for (let gx = x; gx < x + w; gx += g) { ctx.moveTo(gx, y); ctx.lineTo(gx, y + h); }
  for (let gy = y; gy < y + h; gy += g) { ctx.moveTo(x, gy); ctx.lineTo(x + w, gy); }
  ctx.stroke();
  const mols: [number, number, number][] = [[0.24, 0.2, 1], [0.78, 0.44, -1], [0.34, 0.8, 1]];
  mols.forEach(([fx, fy, dir], m) => {
    const cx = x + fx * w, cy = y + fy * h, R = Math.min(w, h) * 0.085, a0 = t * 0.12 * dir + m;
    const ring: [number, number][] = Array.from({ length: 6 }, (_, i) => [cx + Math.cos(a0 + (i * TAU) / 6) * R, cy + Math.sin(a0 + (i * TAU) / 6) * R]);
    ctx.strokeStyle = hexA(p.ink, 0.14); ctx.lineWidth = 3 * k;
    ctx.beginPath(); ring.forEach(([px, py], i) => (i ? ctx.lineTo(px, py) : ctx.moveTo(px, py))); ctx.closePath(); ctx.stroke();
    ctx.beginPath();
    [0, 2, 4].forEach((i) => { const [px, py] = ring[i]; const a = a0 + (i * TAU) / 6; ctx.moveTo(px, py); ctx.lineTo(px + Math.cos(a) * R * 0.8, py + Math.sin(a) * R * 0.8); });
    ctx.stroke();
    ring.forEach(([px, py], i) => { ctx.fillStyle = i % 2 ? hexA(p.ink, 0.22) : hexA(p.accent, 0.75); ctx.beginPath(); ctx.arc(px, py, 7 * k, 0, TAU); ctx.fill(); });
  });
};

// Explainers: newspaper columns with a headline block; a highlighter reads down one column.
const columns: MotifFn = (ctx, { x, y, w, h }, p, t, k) => {
  const m = 48 * k, cols = w > h ? 4 : 3, gap = 30 * k, cw = (w - 2 * m - gap * (cols - 1)) / cols;
  ctx.fillStyle = hexA(p.ink, 0.07);
  ctx.fillRect(x + m, y + 60 * k, w - 2 * m, 54 * k);
  ctx.fillRect(x + m, y + 130 * k, (w - 2 * m) * 0.6, 22 * k);
  ctx.strokeStyle = hexA(p.ink, 0.08); ctx.lineWidth = hair(k);
  ctx.beginPath(); ctx.moveTo(x + m, y + 176 * k); ctx.lineTo(x + w - m, y + 176 * k); ctx.stroke();
  ctx.fillStyle = hexA(p.ink, 0.045);
  for (let c = 0; c < cols; c++) {
    const cx = x + m + c * (cw + gap);
    for (let i = 0, yy = y + 206 * k; yy < y + h - 40 * k; i++, yy += 30 * k) ctx.fillRect(cx, yy, cw * (i % 9 === 8 ? 0.5 : 0.85 + 0.15 * rnd(c * 50 + i)), 8 * k);
    if (c) { ctx.strokeStyle = hexA(p.ink, 0.06); ctx.beginPath(); ctx.moveTo(cx - gap / 2, y + 206 * k); ctx.lineTo(cx - gap / 2, y + h - 40 * k); ctx.stroke(); }
  }
  const hy = y + 206 * k + Math.floor(wrap(t * 1.4, 0, Math.max(1, (h * 0.55 - 206 * k) / (30 * k)))) * 30 * k;
  ctx.fillStyle = hexA('#FFFFFF', 0.4);
  ctx.fillRect(x + m - 4 * k, hy - 6 * k, cw + 8 * k, 20 * k);
};

// Film: sprocket strips down both sides and scope frame guides.
const filmstrip: MotifFn = (ctx, { x, y, w, h }, p, t, k) => {
  const sw = 64 * k, hole = 22 * k, step = 46 * k, off = (t * 26 * k) % step;
  for (const sx of [x, x + w - sw]) {
    ctx.fillStyle = hexA(p.ink, 0.06); ctx.fillRect(sx, y, sw, h);
    ctx.fillStyle = p.bg;
    for (let yy = y - step + off; yy < y + h; yy += step) { ctx.beginPath(); ctx.roundRect(sx + (sw - hole) / 2, yy, hole, hole * 0.8, 4 * k); ctx.fill(); }
  }
  const fw = w - 2 * sw - 80 * k, fh = Math.min(h * 0.5, fw / 2.39), fx = x + sw + 40 * k, fy = y + (h - fh) / 2;
  ctx.strokeStyle = hexA(p.ink, 0.08); ctx.lineWidth = hair(k);
  ctx.strokeRect(fx, fy, fw, fh);
  ctx.strokeStyle = hexA(p.accent, 0.4); ctx.lineWidth = 3 * k;
  const L = 34 * k;
  ctx.beginPath();
  ctx.moveTo(fx, fy + L); ctx.lineTo(fx, fy); ctx.lineTo(fx + L, fy);
  ctx.moveTo(fx + fw - L, fy + fh); ctx.lineTo(fx + fw, fy + fh); ctx.lineTo(fx + fw, fy + fh - L);
  ctx.stroke();
};

// Storytelling: night rain, a streetlight circle and ripples at the bottom.
const rain: MotifFn = (ctx, { x, y, w, h }, p, t, k) => {
  ctx.fillStyle = hexA(p.accent, 0.07);
  ctx.beginPath(); ctx.arc(x + w * 0.8, y + h * 0.16, Math.min(w, h) * 0.22, 0, TAU); ctx.fill();
  ctx.fillStyle = hexA(p.accent, 0.12);
  ctx.beginPath(); ctx.arc(x + w * 0.8, y + h * 0.16, Math.min(w, h) * 0.08, 0, TAU); ctx.fill();
  ctx.strokeStyle = hexA(p.ink, 0.08); ctx.lineWidth = hair(k);
  ctx.beginPath();
  for (let i = 0; i < 90; i++) {
    const L = (40 + 60 * rnd(i)) * k, sp = (500 + 300 * rnd(i * 2)) * k;
    const px = x + rnd(i * 3.3) * (w + 200 * k) - 100 * k, py = y + wrap(rnd(i * 7.1) * h + t * sp, -L, h + L);
    ctx.moveTo(px + (py - y) * 0.18, py); ctx.lineTo(px + (py - y) * 0.18 + L * 0.18, py + L);
  }
  ctx.stroke();
  ctx.strokeStyle = hexA(p.ink, 0.07);
  for (let i = 0; i < 4; i++) {
    const ph = (t * 0.5 + i * 0.25) % 1, cx = x + w * (0.2 + 0.6 * rnd(i + Math.floor(t * 0.5 + i * 0.25) * 9)), cy = y + h - 80 * k;
    ctx.globalAlpha = 1 - ph;
    ctx.beginPath(); ctx.ellipse(cx, cy, 10 * k + ph * 90 * k, 3 * k + ph * 18 * k, 0, 0, TAU); ctx.stroke();
  }
  ctx.globalAlpha = 1;
};

// Outdoors: layered mountain ridges drifting slowly and a small sun.
const ridge: MotifFn = (ctx, { x, y, w, h }, p, t, k) => {
  ctx.fillStyle = hexA(p.accent, 0.5);
  const S = Math.min(w, h);
  ctx.beginPath(); ctx.arc(x + w - S * 0.16, y + S * 0.3, S * 0.05, 0, TAU); ctx.fill();
  const layers = 4;
  for (let l = 0; l < layers; l++) {
    const base = y + h * (0.45 + l * 0.13), amp = h * (0.12 - l * 0.018), drift = t * (4 + l * 5) * k;
    ctx.fillStyle = hexA(p.ink, 0.04 + l * 0.025);
    ctx.beginPath(); ctx.moveTo(x, y + h);
    for (let px = 0; px <= w + 20 * k; px += 18 * k) {
      const u = (px + drift) / (w * 0.9);
      const v = Math.sin(u * 5.1 + l * 1.7) * 0.5 + Math.sin(u * 11.3 + l) * 0.25 + Math.abs(Math.sin(u * 2.3 + l * 2.1)) * 0.6;
      ctx.lineTo(x + px, base - v * amp);
    }
    ctx.lineTo(x + w, y + h); ctx.closePath(); ctx.fill();
  }
};

// Photography: thirds grid, viewfinder corners and focus points; the active point hops.
const viewfinder: MotifFn = (ctx, { x, y, w, h }, p, t, k) => {
  ctx.strokeStyle = hexA(p.ink, 0.07); ctx.lineWidth = hair(k);
  ctx.beginPath();
  for (const f of [1 / 3, 2 / 3]) { ctx.moveTo(x + w * f, y); ctx.lineTo(x + w * f, y + h); ctx.moveTo(x, y + h * f); ctx.lineTo(x + w, y + h * f); }
  ctx.stroke();
  const m = 44 * k, L = 60 * k;
  ctx.strokeStyle = hexA(p.ink, 0.2); ctx.lineWidth = 3 * k;
  ctx.beginPath();
  for (const [cx, cy, sx, sy] of [[x + m, y + m, 1, 1], [x + w - m, y + m, -1, 1], [x + m, y + h - m, 1, -1], [x + w - m, y + h - m, -1, -1]] as const) {
    ctx.moveTo(cx, cy + sy * L); ctx.lineTo(cx, cy); ctx.lineTo(cx + sx * L, cy);
  }
  ctx.stroke();
  // One focus point drifting slowly around the lower-right thirds point.
  const fx = x + (w * 2) / 3 + Math.sin(t * 0.45) * w * 0.05, fy = y + (h * 2) / 3 + Math.cos(t * 0.35) * h * 0.04;
  const fs = 34 * k, fc = fs * 0.35;
  ctx.strokeStyle = hexA(p.accent, 0.8); ctx.lineWidth = 3 * k;
  ctx.beginPath();
  for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    const cx = fx + (sx * fs) / 2, cy = fy + (sy * fs) / 2;
    ctx.moveTo(cx, cy - sy * fc); ctx.lineTo(cx, cy); ctx.lineTo(cx - sx * fc, cy);
  }
  ctx.stroke();
  ctx.strokeStyle = hexA(p.ink, 0.14); ctx.lineWidth = 2 * k;
  const ty = y + h - m - 30 * k;
  ctx.beginPath();
  for (let i = -6; i <= 6; i++) { const tx = x + w / 2 + i * 22 * k; ctx.moveTo(tx, ty); ctx.lineTo(tx, ty - (i % 3 ? 10 : 20) * k); }
  ctx.stroke();
  ctx.fillStyle = p.accent;
  ctx.beginPath(); const ix = x + w / 2 + Math.sin(t * 0.9) * 2 * 22 * k; ctx.moveTo(ix, ty + 6 * k); ctx.lineTo(ix - 7 * k, ty + 18 * k); ctx.lineTo(ix + 7 * k, ty + 18 * k); ctx.closePath(); ctx.fill();
};

// Comedy: confetti drifting down and turning.
const confetti: MotifFn = (ctx, { x, y, w, h }, p, t, k) => {
  for (let i = 0; i < 44; i++) {
    const sp = (28 + 40 * rnd(i * 5)) * k;
    const px = x + rnd(i * 1.7) * w + Math.sin(t * 0.9 + i) * 12 * k, py = y + wrap(rnd(i * 3.9) * h + t * sp, -40 * k, h + 40 * k);
    ctx.save(); ctx.translate(px, py); ctx.rotate(t * (0.6 + rnd(i)) + i);
    ctx.fillStyle = i % 3 === 0 ? hexA(p.accent, 0.55) : i % 3 === 1 ? hexA(p.ink, 0.12) : hexA(p.ink, 0.06);
    const kind = i % 4, s = (12 + 12 * rnd(i * 2)) * k;
    if (kind === 0) ctx.fillRect(-s, -s / 3, 2 * s, (2 * s) / 3);
    else if (kind === 1) { ctx.beginPath(); ctx.arc(0, 0, s * 0.6, 0, TAU); ctx.fill(); }
    else if (kind === 2) { ctx.beginPath(); ctx.moveTo(0, -s); ctx.lineTo(s, s * 0.7); ctx.lineTo(-s, s * 0.7); ctx.closePath(); ctx.fill(); }
    else { ctx.strokeStyle = ctx.fillStyle as string; ctx.lineWidth = 4 * k; ctx.lineCap = 'round'; ctx.beginPath(); for (let j = 0; j <= 8; j++) { const u = j / 8; const qx = -s * 1.2 + u * 2.4 * s, qy = Math.sin(u * TAU) * s * 0.35; if (j) ctx.lineTo(qx, qy); else ctx.moveTo(qx, qy); } ctx.stroke(); }
    ctx.restore();
  }
};

// Pets: a trail of paw prints that appear one by one.
const paws: MotifFn = (ctx, { x, y, w, h }, p, t, k) => {
  const n = 12, step = Math.hypot(w, h) / n;
  const ang = Math.atan2(-h, w * 0.8);
  const head = (t * 1.3) % (n + 4);
  for (let i = 0; i < n; i++) {
    const age = head - i;
    const a = age < 0 ? 0.03 : Math.max(0.05, 0.16 - age * 0.012);
    const d = i * step * 0.85 + step * 0.5;
    const side = i % 2 ? 1 : -1;
    const px = x + w * 0.1 + Math.cos(ang) * d - Math.sin(ang) * side * 26 * k;
    const py = y + h * 0.95 + Math.sin(ang) * d + Math.cos(ang) * side * 26 * k;
    ctx.save(); ctx.translate(px, py); ctx.rotate(ang + Math.PI / 2);
    ctx.fillStyle = i === Math.floor(head) ? hexA(p.accent, 0.6) : hexA(p.ink, a);
    const s = 24 * k;
    ctx.beginPath(); ctx.ellipse(0, s * 0.35, s * 0.62, s * 0.5, 0, 0, TAU); ctx.fill();
    for (const [tx, ty] of [[-0.72, -0.35], [-0.26, -0.78], [0.26, -0.78], [0.72, -0.35]]) { ctx.beginPath(); ctx.ellipse(tx * s, ty * s, s * 0.2, s * 0.26, 0, 0, TAU); ctx.fill(); }
    ctx.restore();
  }
};

// DIY: a cutting-mat grid, a stitched border and two strips of tape.
const stitch: MotifFn = (ctx, { x, y, w, h }, p, t, k) => {
  const g = 44 * k;
  ctx.strokeStyle = hexA(p.ink, 0.045); ctx.lineWidth = hair(k);
  ctx.beginPath();
  for (let gx = x; gx < x + w; gx += g) { ctx.moveTo(gx, y); ctx.lineTo(gx, y + h); }
  for (let gy = y; gy < y + h; gy += g) { ctx.moveTo(x, gy); ctx.lineTo(x + w, gy); }
  ctx.stroke();
  const m = 34 * k;
  ctx.strokeStyle = hexA(p.ink, 0.28); ctx.lineWidth = 3 * k; ctx.lineCap = 'round';
  ctx.setLineDash([16 * k, 12 * k]); ctx.lineDashOffset = -t * 10 * k;
  ctx.beginPath(); ctx.roundRect(x + m, y + m, w - 2 * m, h - 2 * m, 18 * k); ctx.stroke();
  ctx.setLineDash([]); ctx.lineDashOffset = 0;
  for (const [cx, cy, a] of [[x + 70 * k, y + 60 * k, -0.6], [x + w - 70 * k, y + h - 60 * k, -0.6]] as const) {
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(a);
    ctx.fillStyle = hexA(p.accent, 0.4);
    const tw = 150 * k, th = 40 * k;
    ctx.beginPath(); ctx.moveTo(-tw / 2, -th / 2);
    for (let i = 0; i <= 6; i++) ctx.lineTo(tw / 2 + (i % 2 ? 5 : -2) * k, -th / 2 + (th * i) / 6);
    ctx.lineTo(-tw / 2, th / 2);
    for (let i = 6; i >= 0; i--) ctx.lineTo(-tw / 2 + (i % 2 ? -5 : 2) * k, -th / 2 + (th * i) / 6);
    ctx.closePath(); ctx.fill();
    ctx.restore();
  }
};

// Beauty: soft bubbles rising.
const bubbles: MotifFn = (ctx, { x, y, w, h }, p, t, k) => {
  for (let i = 0; i < 22; i++) {
    const r = (18 + 70 * rnd(i * 4.2)) * k, sp = (14 + 30 * rnd(i)) * k;
    const px = x + rnd(i * 2.9) * w + Math.sin(t * 0.7 + i) * 14 * k, py = y + wrap(rnd(i * 8.3) * h - t * sp, -r, h + r);
    ctx.fillStyle = hexA(p.accent, 0.07);
    ctx.strokeStyle = hexA(p.ink, 0.08); ctx.lineWidth = hair(k);
    ctx.beginPath(); ctx.arc(px, py, r, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.fillStyle = hexA('#FFFFFF', 0.18);
    ctx.beginPath(); ctx.arc(px - r * 0.35, py - r * 0.35, r * 0.18, 0, TAU); ctx.fill();
  }
};

// Mindfulness: a brushed enso and slow ripples.
const enso: MotifFn = (ctx, { x, y, w, h }, p, t, k) => {
  const S = Math.min(w, h), cx = x + w - S * 0.2, cy = y + h - S * 0.22, R = S * 0.34;
  ctx.strokeStyle = hexA(p.ink, 0.05); ctx.lineWidth = hair(k);
  for (let i = 0; i < 4; i++) { const ph = (t * 0.08 + i / 4) % 1; ctx.globalAlpha = 1 - ph; ctx.beginPath(); ctx.arc(cx, cy, R * (1.1 + ph * 0.9), 0, TAU); ctx.stroke(); }
  ctx.globalAlpha = 1;
  ctx.lineCap = 'round';
  const a0 = -1.9, sweep = 5.6, n = 90;
  for (let i = 0; i < n; i++) {
    const u = i / n, a = a0 + u * sweep;
    ctx.strokeStyle = hexA(p.accent, 0.3 * (0.55 + 0.45 * Math.sin(u * Math.PI)));
    ctx.lineWidth = (8 + 26 * Math.sin(u * Math.PI) * (0.8 + 0.2 * rnd(i))) * k;
    ctx.beginPath(); ctx.arc(cx, cy, R + (rnd(i * 3) - 0.5) * 3 * k, a, a + sweep / n + 0.01); ctx.stroke();
  }
};

// Productivity: a sparse dot grid and a progress line filling along the bottom.
const dotgrid: MotifFn = (ctx, { x, y, w, h }, p, t, k) => {
  const s = 42 * k, cols = Math.floor(w / s), rows = Math.floor(h / s);
  ctx.fillStyle = hexA(p.ink, 0.13);
  for (let j = 1; j < rows; j++) for (let i = 1; i < cols; i++) { ctx.beginPath(); ctx.arc(x + i * s, y + j * s, 2 * k, 0, TAU); ctx.fill(); }
  const prog = (t * 0.05) % 1;
  ctx.fillStyle = hexA(p.ink, 0.08); ctx.fillRect(x + s, y + h - s * 0.6, w - 2 * s, 4 * k);
  ctx.fillStyle = hexA(p.accent, 0.6); ctx.fillRect(x + s, y + h - s * 0.6, (w - 2 * s) * prog, 4 * k);
};

// Career: a résumé layout — a strong left rule, section lines and bullet rows; a highlight slides.
const rule: MotifFn = (ctx, { x, y, w, h }, p, t, k) => {
  const lx = x + 70 * k;
  ctx.fillStyle = hexA(p.accent, 0.7); ctx.fillRect(lx, y + 60 * k, 5 * k, h - 120 * k);
  let yy = y + 90 * k;
  for (let s = 0; yy < y + h - 120 * k; s++) {
    ctx.fillStyle = hexA(p.ink, 0.07); ctx.fillRect(lx + 40 * k, yy, 220 * k, 14 * k);
    ctx.strokeStyle = hexA(p.ink, 0.06); ctx.lineWidth = hair(k);
    ctx.beginPath(); ctx.moveTo(lx + 40 * k, yy + 34 * k); ctx.lineTo(x + w - 60 * k, yy + 34 * k); ctx.stroke();
    yy += 62 * k;
    for (let b = 0; b < 3 && yy < y + h - 120 * k; b++) {
      ctx.fillStyle = hexA(p.ink, 0.09); ctx.fillRect(lx + 44 * k, yy + 2 * k, 8 * k, 8 * k);
      ctx.fillStyle = hexA(p.ink, 0.035); ctx.fillRect(lx + 66 * k, yy, (w - 220 * k) * (0.55 + 0.4 * rnd(s * 10 + b)), 10 * k);
      yy += 34 * k;
    }
    yy += 30 * k;
  }
  const hy = y + 90 * k + wrap(t * 40 * k, 0, Math.max(1, h - 240 * k));
  ctx.fillStyle = hexA(p.accent, 0.1); ctx.fillRect(lx + 30 * k, hy, w - 160 * k, 26 * k);
};

// Legal: a thin double frame, a large section mark and a small seal.
const quiet: MotifFn = (ctx, { x, y, w, h }, p, t, k) => {
  ctx.strokeStyle = hexA(p.ink, 0.16); ctx.lineWidth = hair(k);
  ctx.strokeRect(x + 30 * k, y + 30 * k, w - 60 * k, h - 60 * k);
  ctx.strokeRect(x + 40 * k, y + 40 * k, w - 80 * k, h - 80 * k);
  const fs = Math.min(w, h) * 0.62;
  ctx.font = `400 ${fs}px "DM Serif Display", serif`;
  ctx.fillStyle = hexA(p.ink, 0.045);
  ctx.textAlign = 'right'; ctx.textBaseline = 'alphabetic';
  ctx.fillText('§', x + w - 40 * k, y + h - 70 * k);
  ctx.textAlign = 'left';
  const cx = x + 110 * k, cy = y + h - 110 * k, R = 34 * k;
  ctx.save(); ctx.translate(cx, cy); ctx.rotate(t * 0.15);
  ctx.strokeStyle = hexA(p.accent, 0.55); ctx.lineWidth = 2 * k;
  ctx.beginPath(); ctx.arc(0, 0, R, 0, TAU); ctx.stroke();
  ctx.beginPath();
  for (let i = 0; i < 24; i++) { const a = (i / 24) * TAU; ctx.moveTo(Math.cos(a) * (R + 6 * k), Math.sin(a) * (R + 6 * k)); ctx.lineTo(Math.cos(a) * (R + 13 * k), Math.sin(a) * (R + 13 * k)); }
  ctx.stroke();
  ctx.restore();
  ctx.fillStyle = hexA(p.accent, 0.55);
  ctx.beginPath(); ctx.arc(cx, cy, 9 * k, 0, TAU); ctx.fill();
};

// ---------- generic designs for the Look → Background picker (any preset) ----------

// No design: just the last layer.
const plain: MotifFn = () => {};

// Grid: a quiet checkerboard drifting sideways.
const checker: MotifFn = (ctx, { x, y, w, h }, p, t, k) => {
  const s = 64 * k, off = (t * 6 * k) % (2 * s);
  ctx.fillStyle = hexA(p.ink, 0.04);
  for (let j = 0; j * s < h + s; j++) for (let i = -2; i * s < w + s; i++) if (((i + j) % 2 + 2) % 2 === 0) ctx.fillRect(x + i * s + off, y + j * s, s, s);
};

// Grid: an isometric lattice with one floating cube.
const isometric: MotifFn = (ctx, { x, y, w, h }, p, t, k) => {
  const s = 56 * k, tn = Math.tan(Math.PI / 6), dx = s * Math.cos(Math.PI / 6);
  ctx.strokeStyle = hexA(p.ink, 0.05); ctx.lineWidth = hair(k);
  ctx.beginPath();
  for (let gx = x; gx <= x + w; gx += dx) { ctx.moveTo(gx, y); ctx.lineTo(gx, y + h); }
  for (let c = y - w * tn; c <= y + h + w * tn; c += s) { ctx.moveTo(x, c); ctx.lineTo(x + w, c - w * tn); ctx.moveTo(x, c); ctx.lineTo(x + w, c + w * tn); }
  ctx.stroke();
  const S = Math.min(w, h), cx = x + w - S * 0.24, cy = y + h - S * 0.28 + Math.sin(t * 0.8) * 6 * k, r = S * 0.11;
  const v = (a: number) => [cx + Math.cos(a) * r, cy + Math.sin(a) * r] as const;
  ctx.strokeStyle = hexA(p.accent, 0.5); ctx.lineWidth = 3 * k; ctx.lineJoin = 'round';
  ctx.beginPath();
  for (let i = 0; i <= 6; i++) { const [px, py] = v(-Math.PI / 2 + (i * Math.PI) / 3); if (i) ctx.lineTo(px, py); else ctx.moveTo(px, py); }
  for (const a of [Math.PI / 6, (5 * Math.PI) / 6, -Math.PI / 2]) { const [px, py] = v(a); ctx.moveTo(cx, cy); ctx.lineTo(px, py); }
  ctx.stroke();
};

// Shapes: a Bauhaus corner — quarter circle, square, half circle, a bar and a dot that rolls round the arc.
const bauhaus: MotifFn = (ctx, { x, y, w, h }, p, t) => {
  const S = Math.min(w, h), R = x + w, B = y + h;
  ctx.fillStyle = hexA(p.accent, 0.18);
  ctx.beginPath(); ctx.moveTo(R, B); ctx.arc(R, B, S * 0.42, Math.PI, Math.PI * 1.5); ctx.closePath(); ctx.fill();
  ctx.fillStyle = hexA(p.ink, 0.07);
  ctx.fillRect(R - S * 0.74, B - S * 0.18, S * 0.18, S * 0.18);
  ctx.beginPath(); ctx.arc(R - S * 0.65, B - S * 0.18, S * 0.09, Math.PI, TAU); ctx.fill();
  ctx.fillStyle = hexA(p.ink, 0.09);
  ctx.fillRect(R - S * 0.86, B - S * 0.38, S * 0.022, S * 0.38);
  const a = Math.PI * 1.25 + Math.sin(t * 0.35) * Math.PI * 0.2;
  ctx.fillStyle = hexA(p.accent, 0.75);
  ctx.beginPath(); ctx.arc(R + Math.cos(a) * S * 0.48, B + Math.sin(a) * S * 0.48, S * 0.028, 0, TAU); ctx.fill();
};

// Shapes: Memphis-style squiggles, triangles, dot clusters and arcs, turning slightly.
const memphis: MotifFn = (ctx, { x, y, w, h }, p, t, k) => {
  ctx.lineWidth = 4 * k; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  for (let i = 0; i < 12; i++) {
    const px = x + rnd(i * 5.3 + 1) * w, py = y + rnd(i * 2.9 + 2) * h, s = (26 + 28 * rnd(i * 7.1)) * k;
    const col = i % 3 === 0 ? hexA(p.accent, 0.42) : hexA(p.ink, 0.1);
    ctx.save(); ctx.translate(px, py); ctx.rotate(rnd(i) * TAU + Math.sin(t * 0.3 + i) * 0.15);
    ctx.strokeStyle = col; ctx.fillStyle = col;
    ctx.beginPath();
    switch (i % 4) {
      case 0: ctx.moveTo(-s, 0); for (let j = 1; j <= 6; j++) ctx.lineTo(-s + (j * s) / 3, j % 2 ? -s * 0.3 : 0); ctx.stroke(); break;
      case 1: ctx.moveTo(0, -s * 0.6); ctx.lineTo(s * 0.55, s * 0.4); ctx.lineTo(-s * 0.55, s * 0.4); ctx.closePath(); ctx.stroke(); break;
      case 2: for (let a = 0; a < 3; a++) for (let b = 0; b < 3; b++) { ctx.moveTo(-s * 0.4 + a * s * 0.4 + 4 * k, -s * 0.4 + b * s * 0.4); ctx.arc(-s * 0.4 + a * s * 0.4, -s * 0.4 + b * s * 0.4, 4 * k, 0, TAU); } ctx.fill(); break;
      default: ctx.arc(0, 0, s * 0.6, Math.PI, TAU); ctx.stroke();
    }
    ctx.restore();
  }
};

// Abstract: a halftone screen that grows toward the lower-right; its light drifts slowly.
const halftone: MotifFn = (ctx, { x, y, w, h }, p, t, k) => {
  const g = 22 * k, rMax = 9 * k, drift = 0.06 * Math.sin(t * 0.5);
  ctx.fillStyle = hexA(p.ink, 0.1);
  ctx.beginPath();
  for (let j = 0, py = y; py < y + h + g; j++, py += g * 0.87) {
    for (let px = x + (j % 2 ? g / 2 : 0); px < x + w + g; px += g) {
      const f = ((px - x) / w) * 0.45 + ((py - y) / h) * 0.55 + drift;
      const e = Math.min(1, Math.max(0, (f - 0.42) / 0.6));
      const r = rMax * e * e * (3 - 2 * e);
      if (r < 0.6 * k) continue;
      ctx.moveTo(px + r, py); ctx.arc(px, py, r, 0, TAU);
    }
  }
  ctx.fill();
};

// Abstract: flowing stream lines across the lower part, one in the accent.
const flow: MotifFn = (ctx, { x, y, w, h }, p, t, k) => {
  const n = 16, A = Math.min(h * 0.05, 60 * k);
  ctx.lineWidth = 2 * k;
  for (let i = 0; i < n; i++) {
    const by = y + h * (0.38 + (0.6 * i) / n);
    ctx.strokeStyle = i === 9 ? hexA(p.accent, 0.5) : hexA(p.ink, 0.07);
    ctx.beginPath();
    for (let px = 0; px <= w + 16 * k; px += 16 * k) {
      const u = px / w;
      const yy = by + Math.sin(u * 4.2 + i * 0.35 + t * 0.25) * A * (0.6 + 0.4 * Math.sin(i * 0.7)) + Math.sin(u * 9 + i) * A * 0.15;
      if (px) ctx.lineTo(x + px, yy); else ctx.moveTo(x + px, yy);
    }
    ctx.stroke();
  }
};

export const MORE_MOTIFS = {
  court, pixels, stripes, pages, arches, blocks, hex, circuit, wire, stamp, molecule, columns,
  filmstrip, rain, ridge, viewfinder, confetti, paws, stitch, bubbles, enso, dotgrid, rule, quiet,
  plain, checker, isometric, bauhaus, memphis, halftone, flow,
} satisfies Record<string, MotifFn>;
