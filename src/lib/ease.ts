// Motion core, modelled on Remotion: interpolate() with clamping, Easing.bezier(), Easing.spring()
// and perceptual scale. Everything is a pure function of time, so preview and export match.

export const clamp01 = (t: number) => (t < 0 ? 0 : t > 1 ? 1 : t);
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** CSS-style cubic-bezier easing (Remotion's Easing.bezier). */
export function bezier(x1: number, y1: number, x2: number, y2: number) {
  const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
  const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
  const sx = (t: number) => ((ax * t + bx) * t + cx) * t;
  const sy = (t: number) => ((ay * t + by) * t + cy) * t;
  const dx = (t: number) => (3 * ax * t + 2 * bx) * t + cx;
  return (x: number) => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    let t = x;
    for (let i = 0; i < 8; i++) {
      const e = sx(t) - x;
      if (Math.abs(e) < 1e-6) return sy(t);
      const d = dx(t);
      if (Math.abs(d) < 1e-6) break;
      t -= e / d;
    }
    let lo = 0, hi = 1;
    t = x;
    for (let i = 0; i < 30; i++) { const v = sx(t); if (Math.abs(v - x) < 1e-6) break; if (v < x) lo = t; else hi = t; t = (lo + hi) / 2; }
    return sy(t);
  };
}

/** House curves. outExpo = Remotion's recommended Easing.bezier(0.16, 1, 0.3, 1). */
export const outExpo = bezier(0.16, 1, 0.3, 1);
export const inOut = bezier(0.65, 0, 0.35, 1);
export const outQuart = bezier(0.25, 1, 0.5, 1);

export interface SpringCfg { stiffness?: number; damping?: number; mass?: number }

/** Damped spring position at time t seconds (0 → 1, may overshoot). Remotion defaults: k 100, c 10, m 1. */
export function springAt(t: number, cfg: SpringCfg = {}) {
  if (t <= 0) return 0;
  const k = cfg.stiffness ?? 100, c = cfg.damping ?? 10, m = cfg.mass ?? 1;
  const w0 = Math.sqrt(k / m);
  const z = c / (2 * Math.sqrt(k * m));
  if (z < 1) {
    const wd = w0 * Math.sqrt(1 - z * z);
    return 1 - Math.exp(-z * w0 * t) * (Math.cos(wd * t) + ((z * w0) / wd) * Math.sin(wd * t));
  }
  if (z === 1) return 1 - Math.exp(-w0 * t) * (1 + w0 * t);
  const s = Math.sqrt(z * z - 1);
  const r1 = -w0 * (z - s), r2 = -w0 * (z + s);
  return 1 - (r2 * Math.exp(r1 * t) - r1 * Math.exp(r2 * t)) / (r2 - r1);
}

const settleCache = new Map<string, number>();
function settleTime(cfg: SpringCfg) {
  const key = `${cfg.stiffness ?? 100}|${cfg.damping ?? 10}|${cfg.mass ?? 1}`;
  let T = settleCache.get(key);
  if (T == null) {
    T = 0;
    for (let t = 0.01; t < 40; t += 0.01) {
      let rest = true;
      for (let k = 0; k < 6; k++) if (Math.abs(1 - springAt(t + k * 0.05, cfg)) > 0.004) { rest = false; break; }
      if (rest) { T = t; break; }
    }
    T ||= 1;
    settleCache.set(key, T);
  }
  return T;
}

/** Remotion's Easing.spring(): the spring curve normalised so it settles exactly at progress 1. */
export function springEase(cfg: SpringCfg = { damping: 200 }) {
  const T = settleTime(cfg);
  return (p: number) => (p <= 0 ? 0 : p >= 1 ? 1 : springAt(p * T, cfg));
}
export const pushIn = springEase({ damping: 200 });            // no bounce, a soft push
export const popIn = springEase({ damping: 12, stiffness: 160 }); // small, controlled overshoot

/** interpolate(t, [t0, t1], [a, b], ease) with clamping on both sides. */
export function interp(t: number, t0: number, t1: number, a: number, b: number, ease: (x: number) => number = outExpo) {
  return lerp(a, b, ease(clamp01((t - t0) / Math.max(1e-6, t1 - t0))));
}

/** Remotion's output: 'perceptual-scale' — scale changes feel even at any size. */
export function perceptualScale(p: number, from: number, to: number) {
  const a = Math.max(from, 1e-3), b = Math.max(to, 1e-3);
  return a * Math.pow(b / a, clamp01(p));
}
