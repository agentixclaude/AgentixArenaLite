// Background music + sound effects, synthesised on the device with Web Audio and mixed under the voice.
// Nothing is downloaded and nothing is licensed: every track and effect is generated here, so it is free to use anywhere.
import type { Edit } from './style';
import type { GroupId } from './looks';

export type SfxId = 'whoosh' | 'click' | 'capture' | 'pop';
export type MusicCat = 'calm' | 'lofi' | 'upbeat' | 'cinematic' | 'corporate';

export interface SoundSettings {
  /** 'off' | 'auto' (track picked by the style group) | 'upload' | a track id */
  music: string;
  /** 0.1–1; 0.5 is the reference level */
  musicVol: number;
  /** Music drops under speech and comes back up in gaps and at the end. */
  duck: boolean;
  sfx: SfxId[];
  sfxVol: number;
}
export const SOUND_DEFAULT: SoundSettings = { music: 'auto', musicVol: 0.5, duck: true, sfx: ['whoosh', 'click'], sfxVol: 0.5 };
export const soundOf = (s?: Partial<SoundSettings> | null): SoundSettings => ({ ...SOUND_DEFAULT, ...(s ?? {}) });
export const soundOn = (s: SoundSettings) => s.music !== 'off' || s.sfx.length > 0;

export const MUSIC_CATS: { id: MusicCat; name: string }[] = [
  { id: 'calm', name: 'Calm' }, { id: 'lofi', name: 'Lo-fi' }, { id: 'upbeat', name: 'Upbeat' },
  { id: 'cinematic', name: 'Cinematic' }, { id: 'corporate', name: 'Corporate' },
];

export const SFX: { id: SfxId; name: string; note: string }[] = [
  { id: 'whoosh', name: 'Whoosh', note: 'Layout changes' },
  { id: 'click', name: 'Click', note: 'Titles landing' },
  { id: 'capture', name: 'Capture', note: 'Camera shutter on polaroids' },
  { id: 'pop', name: 'Pop', note: 'Stickers popping in' },
];

// ---------------------------------------------------------------- music tracks
type Q = 'maj' | 'min' | 'maj7' | 'm7' | 'maj9' | 'm9' | 'add9' | 'sus2' | 'sus4' | '7' | '9' | '69' | 'm11';
const IV: Record<Q, number[]> = {
  maj: [0, 4, 7], min: [0, 3, 7], maj7: [0, 4, 7, 11], m7: [0, 3, 7, 10], maj9: [0, 4, 7, 11, 14], m9: [0, 3, 7, 10, 14],
  add9: [0, 4, 7, 14], sus2: [0, 2, 7], sus4: [0, 5, 7], '7': [0, 4, 7, 10], '9': [0, 4, 7, 10, 14], '69': [0, 4, 7, 9, 14], m11: [0, 3, 7, 10, 14, 17],
};
interface Chord { r: number; q: Q }
type Keys = 'ep' | 'piano' | 'pluck' | 'marimba' | 'bell';
type Comp = 'hold' | 'lofi' | 'arp8' | 'arp16' | 'pulse8' | 'stab';
type Drums = 'none' | 'lofi' | 'soft' | 'pop' | 'tech' | 'cine';
export interface Track {
  id: string; cat: MusicCat; name: string; note: string; bpm: number;
  /** MIDI note of the key root (around the third octave). */
  key: number;
  prog: Chord[];
  keys: Keys; comp: Comp; pad: 'warm' | 'air' | 'none'; bass: 'sub' | 'pulse' | 'none'; drums: Drums;
  lead?: boolean; vinyl?: boolean; swing?: number; bright: number;
}
const C = (r: number, q: Q): Chord => ({ r, q });

export const TRACKS: Track[] = [
  { id: 'keys', cat: 'calm', name: 'Soft keys', note: 'Warm electric piano, slow and gentle', bpm: 72, key: 50,
    prog: [C(0, 'maj9'), C(9, 'm9'), C(5, 'maj7'), C(7, 'sus4')], keys: 'ep', comp: 'hold', pad: 'warm', bass: 'sub', drums: 'none', lead: true, bright: 9000 },
  { id: 'morning', cat: 'calm', name: 'Morning light', note: 'Open piano arpeggios, hopeful', bpm: 84, key: 53,
    prog: [C(0, 'add9'), C(4, 'm7'), C(5, 'maj7'), C(7, 'sus2')], keys: 'piano', comp: 'arp8', pad: 'air', bass: 'sub', drums: 'none', bright: 11000 },
  { id: 'still', cat: 'calm', name: 'Still water', note: 'Airy pad and soft bells', bpm: 64, key: 51,
    prog: [C(0, 'maj9'), C(9, 'm9'), C(5, 'maj7'), C(7, 'sus2')], keys: 'bell', comp: 'stab', pad: 'warm', bass: 'sub', drums: 'none', lead: true, bright: 8000 },
  { id: 'desk', cat: 'lofi', name: 'Desk lamp', note: 'Dusty keys over a lazy swing beat', bpm: 80, key: 53,
    prog: [C(2, 'm9'), C(7, '9'), C(0, 'maj9'), C(9, 'm9')], keys: 'ep', comp: 'lofi', pad: 'none', bass: 'sub', drums: 'lofi', vinyl: true, swing: 0.6, bright: 6500 },
  { id: 'latebus', cat: 'lofi', name: 'Late bus', note: 'Mellow minor chords, soft hats', bpm: 76, key: 57,
    prog: [C(0, 'm9'), C(8, 'maj7'), C(3, 'maj7'), C(10, '69')], keys: 'piano', comp: 'lofi', pad: 'warm', bass: 'sub', drums: 'lofi', vinyl: true, swing: 0.58, bright: 6000 },
  { id: 'bright', cat: 'upbeat', name: 'Bright idea', note: 'Light pluck and claps, positive', bpm: 104, key: 48,
    prog: [C(0, 'add9'), C(7, 'sus4'), C(9, 'm7'), C(5, 'maj7')], keys: 'pluck', comp: 'arp8', pad: 'air', bass: 'pulse', drums: 'pop', bright: 12000 },
  { id: 'sunday', cat: 'upbeat', name: 'Sunday', note: 'Marimba and shaker, easy smile', bpm: 96, key: 55,
    prog: [C(5, 'maj'), C(0, 'maj'), C(7, 'maj'), C(9, 'min')], keys: 'marimba', comp: 'arp8', pad: 'none', bass: 'pulse', drums: 'soft', bright: 11000 },
  { id: 'rise', cat: 'cinematic', name: 'Slow rise', note: 'Swelling pads and a heartbeat pulse', bpm: 70, key: 57,
    prog: [C(0, 'min'), C(8, 'maj'), C(3, 'maj'), C(10, 'maj')], keys: 'piano', comp: 'stab', pad: 'warm', bass: 'pulse', drums: 'cine', lead: true, bright: 8500 },
  { id: 'night', cat: 'cinematic', name: 'Night drive', note: 'Moody synth arpeggio, steady motion', bpm: 92, key: 50,
    prog: [C(0, 'm9'), C(8, 'maj7'), C(5, 'm7'), C(7, 'm7')], keys: 'pluck', comp: 'arp16', pad: 'warm', bass: 'pulse', drums: 'tech', bright: 7500 },
  { id: 'slate', cat: 'corporate', name: 'Clean slate', note: 'Marimba and soft kick, for explainers', bpm: 100, key: 50,
    prog: [C(0, 'add9'), C(5, 'maj7'), C(9, 'm7'), C(7, 'sus4')], keys: 'marimba', comp: 'arp8', pad: 'air', bass: 'pulse', drums: 'soft', bright: 11000 },
  { id: 'signal', cat: 'corporate', name: 'Signal', note: 'Minimal tech pulse for product and AI updates', bpm: 110, key: 52,
    prog: [C(0, 'm9'), C(8, 'maj7'), C(3, 'add9'), C(10, 'sus2')], keys: 'pluck', comp: 'pulse8', pad: 'air', bass: 'pulse', drums: 'tech', bright: 9500 },
];
export const trackById = (id: string) => TRACKS.find((t) => t.id === id) ?? TRACKS[0];

/** The track Auto picks for each style group. */
const AUTO_TRACK: Record<string, string> = {
  bold: 'bright', editorial: 'keys', clean: 'morning', tech: 'signal', news: 'slate', cinema: 'rise', playful: 'sunday', minimal: 'still',
};
export const autoTrack = (g: GroupId | string) => trackById(AUTO_TRACK[g] ?? 'keys');
export const resolveTrack = (s: SoundSettings, g: GroupId | string): Track | null =>
  s.music === 'off' || s.music === 'upload' ? null : s.music === 'auto' ? autoTrack(g) : trackById(s.music);

// ---------------------------------------------------------------- helpers
const mtof = (m: number) => 440 * Math.pow(2, (m - 69) / 12);
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const dB = (d: number) => Math.pow(10, d / 20);
function rng(seed: number) {
  let s = seed >>> 0 || 1;
  return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return ((s >>> 0) % 100000) / 100000; };
}
function hash(str: string) { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }

/** Chord tones inside a register, lowest note in [lo, lo + 12). */
function voice(key: number, c: Chord, lo = 55, hi = 79) {
  let n = IV[c.q].map((i) => key + c.r + i);
  while (n[0] < lo) n = n.map((x) => x + 12);
  while (n[0] >= lo + 12) n = n.map((x) => x - 12);
  n = n.map((x) => (x > hi ? x - 12 : x));
  return [...new Set(n)].sort((a, b) => a - b);
}

type AC = BaseAudioContext;
interface Kit { ac: AC; noise: AudioBuffer; r: () => number }

function osc(ac: AC, type: OscillatorType, f: number) { const o = ac.createOscillator(); o.type = type; o.frequency.value = f; return o; }
function gain(ac: AC, v = 0) { const g = ac.createGain(); g.gain.value = v; return g; }
function filt(ac: AC, type: BiquadFilterType, f: number, q = 0.7) { const b = ac.createBiquadFilter(); b.type = type; b.frequency.value = f; b.Q.value = q; return b; }

/** A noise hit through a chain of filters with an exponential decay. */
function noiseHit(k: Kit, out: AudioNode, t: number, peak: number, tau: number, chain: [BiquadFilterType, number, number][], attack = 0.001) {
  const { ac } = k;
  const s = ac.createBufferSource();
  s.buffer = k.noise;
  let node: AudioNode = s;
  for (const [ty, f, q] of chain) { const b = filt(ac, ty, f, q); node.connect(b); node = b; }
  const g = gain(ac);
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(peak, t + attack);
  g.gain.setTargetAtTime(0, t + attack, tau);
  node.connect(g).connect(out);
  s.start(t, k.r() * 1.2);
  s.stop(t + attack + tau * 7 + 0.02);
}

// ---------------------------------------------------------------- instruments
function ep(k: Kit, out: AudioNode, t: number, m: number, v: number, dur: number) {
  const { ac } = k;
  const f = mtof(m);
  const car = osc(ac, 'sine', f), mod = osc(ac, 'sine', f), tine = osc(ac, 'sine', f * 14);
  const mg = gain(ac), tg = gain(ac), amp = gain(ac);
  mg.gain.setValueAtTime(f * 1.5 * v, t); mg.gain.setTargetAtTime(f * 0.22, t + 0.004, 0.22);
  tg.gain.setValueAtTime(f * 0.5 * v, t); tg.gain.setTargetAtTime(0, t, 0.012);
  mod.connect(mg).connect(car.frequency);
  tine.connect(tg).connect(car.frequency);
  const decay = 1.1 + 1.7 * clamp((76 - m) / 24, 0, 1);
  amp.gain.setValueAtTime(0, t);
  amp.gain.linearRampToValueAtTime(0.3 * v, t + 0.005);
  amp.gain.setTargetAtTime(0, t + 0.006, decay / 3.2);
  amp.gain.setTargetAtTime(0, t + dur, 0.12);
  car.connect(amp).connect(out);
  const end = t + dur + 0.9;
  for (const o of [car, mod, tine]) { o.start(t); o.stop(end); }
}

function piano(k: Kit, out: AudioNode, t: number, m: number, v: number, dur: number) {
  const { ac } = k;
  const f = mtof(m);
  const base = 1.3 + 2.2 * clamp((74 - m) / 30, 0, 1);
  const amp = gain(ac, 0.2 * v);
  amp.connect(out);
  const parts: [number, number, number][] = [[1, 1, 1], [2, 0.4, 0.6], [3, 0.17, 0.42], [4, 0.08, 0.3], [5, 0.04, 0.22]];
  const end = t + dur + 1.1;
  for (const [n, a, ds] of parts) {
    const o = osc(ac, 'sine', f * n * Math.sqrt(1 + 0.0003 * n * n));
    const g = gain(ac);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(a, t + 0.004);
    g.gain.setTargetAtTime(0, t + 0.004, (base * ds) / 3);
    g.gain.setTargetAtTime(0, t + dur, 0.16);
    o.connect(g).connect(amp);
    o.start(t); o.stop(end);
  }
  noiseHit(k, amp, t, 0.12 * v, 0.006, [['bandpass', 2600, 1.2]]);
}

function pluck(k: Kit, out: AudioNode, t: number, m: number, v: number, dur: number, bright = 1) {
  const { ac } = k;
  const f = mtof(m);
  const o = osc(ac, 'triangle', f), o2 = osc(ac, 'sawtooth', f * 1.003);
  const g2 = gain(ac, 0.22);
  const lp = filt(ac, 'lowpass', 500, 0.9);
  lp.frequency.setValueAtTime(700 + 3000 * bright * v, t);
  lp.frequency.setTargetAtTime(520, t, 0.07);
  const amp = gain(ac);
  amp.gain.setValueAtTime(0, t);
  amp.gain.linearRampToValueAtTime(0.26 * v, t + 0.003);
  amp.gain.setTargetAtTime(0, t + 0.003, Math.min(0.2, dur * 0.55));
  o.connect(lp); o2.connect(g2).connect(lp); lp.connect(amp).connect(out);
  o.start(t); o2.start(t); o.stop(t + 1.3); o2.stop(t + 1.3);
}

function marimba(k: Kit, out: AudioNode, t: number, m: number, v: number) {
  const { ac } = k;
  const f = mtof(m);
  const amp = gain(ac);
  amp.gain.setValueAtTime(0, t);
  amp.gain.linearRampToValueAtTime(0.3 * v, t + 0.002);
  amp.gain.setTargetAtTime(0, t + 0.002, 0.15);
  amp.connect(out);
  const o1 = osc(ac, 'sine', f), o4 = osc(ac, 'sine', f * 4), o10 = osc(ac, 'sine', f * 9.9);
  const g4 = gain(ac), g10 = gain(ac);
  g4.gain.setValueAtTime(0.28, t); g4.gain.setTargetAtTime(0, t, 0.02);
  g10.gain.setValueAtTime(0.08, t); g10.gain.setTargetAtTime(0, t, 0.007);
  o1.connect(amp); o4.connect(g4).connect(amp); o10.connect(g10).connect(amp);
  for (const o of [o1, o4, o10]) { o.start(t); o.stop(t + 1.2); }
}

function bell(k: Kit, out: AudioNode, t: number, m: number, v: number) {
  const { ac } = k;
  const f = mtof(m);
  const amp = gain(ac, 0.16 * v);
  amp.connect(out);
  const parts: [number, number, number][] = [[1, 1, 1.4], [2.76, 0.42, 0.7], [5.4, 0.2, 0.35], [8.93, 0.08, 0.16]];
  for (const [n, a, d] of parts) {
    const o = osc(ac, 'sine', f * n), g = gain(ac);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(a, t + 0.004);
    g.gain.setTargetAtTime(0, t + 0.004, d);
    o.connect(g).connect(amp);
    o.start(t); o.stop(t + d * 7 + 0.1);
  }
}

function playKey(k: Kit, kind: Keys, out: AudioNode, t: number, m: number, v: number, dur: number, bright = 1) {
  if (kind === 'ep') ep(k, out, t, m, v, dur);
  else if (kind === 'piano') piano(k, out, t, m, v, dur);
  else if (kind === 'pluck') pluck(k, out, t, m, v, dur, bright);
  else if (kind === 'marimba') marimba(k, out, t, m, v);
  else bell(k, out, t, m, v);
}

function pad(k: Kit, out: AudioNode, t: number, notes: number[], dur: number, kind: 'warm' | 'air') {
  const { ac } = k;
  const lp = filt(ac, 'lowpass', kind === 'warm' ? 950 : 2300, 0.5);
  const amp = gain(ac);
  const lvl = (kind === 'warm' ? 0.06 : 0.05) / Math.sqrt(notes.length / 3);
  amp.gain.setValueAtTime(0, t);
  amp.gain.linearRampToValueAtTime(lvl, t + 0.9);
  amp.gain.setValueAtTime(lvl, t + dur);
  amp.gain.linearRampToValueAtTime(0, t + dur + 1.1);
  lp.connect(amp).connect(out);
  const end = t + dur + 1.2;
  for (const n of notes) for (const d of [-7, 7]) {
    const o = osc(ac, kind === 'warm' ? 'sawtooth' : 'triangle', mtof(n));
    o.detune.value = d;
    o.connect(lp);
    o.start(t); o.stop(end);
  }
  const lfo = osc(ac, 'sine', 0.13), lg = gain(ac, kind === 'warm' ? 200 : 450);
  lfo.connect(lg).connect(lp.frequency);
  lfo.start(t); lfo.stop(end);
}

function bassNote(k: Kit, out: AudioNode, t: number, m: number, v: number, dur: number) {
  const { ac } = k;
  const f = mtof(m);
  const o = osc(ac, 'sine', f), o2 = osc(ac, 'sine', f * 2);
  const g2 = gain(ac, 0.32), amp = gain(ac);
  amp.gain.setValueAtTime(0, t);
  amp.gain.linearRampToValueAtTime(0.42 * v, t + 0.012);
  amp.gain.setValueAtTime(0.42 * v, t + Math.max(0.02, dur - 0.04));
  amp.gain.linearRampToValueAtTime(0, t + dur + 0.04);
  o.connect(amp); o2.connect(g2).connect(amp); amp.connect(out);
  o.start(t); o2.start(t); o.stop(t + dur + 0.1); o2.stop(t + dur + 0.1);
}

// drums
function kick(k: Kit, out: AudioNode, t: number, v: number, soft = false) {
  const { ac } = k;
  const o = osc(ac, 'sine', 120);
  o.frequency.setValueAtTime(soft ? 105 : 125, t);
  o.frequency.exponentialRampToValueAtTime(46, t + 0.1);
  const g = gain(ac);
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(0.8 * v, t + 0.002);
  g.gain.setTargetAtTime(0, t + 0.002, soft ? 0.07 : 0.09);
  const lp = filt(ac, 'lowpass', soft ? 700 : 1400, 0.6);
  o.connect(g).connect(lp).connect(out);
  o.start(t); o.stop(t + 0.6);
  if (!soft) noiseHit(k, out, t, 0.08 * v, 0.003, [['highpass', 3000, 0.7]]);
}
function rim(k: Kit, out: AudioNode, t: number, v: number) {
  noiseHit(k, out, t, 0.3 * v, 0.022, [['bandpass', 2400, 2.6]]);
  const o = osc(k.ac, 'sine', 420), g = gain(k.ac);
  g.gain.setValueAtTime(0.18 * v, t); g.gain.setTargetAtTime(0, t, 0.014);
  o.connect(g).connect(out); o.start(t); o.stop(t + 0.15);
}
function clap(k: Kit, out: AudioNode, t: number, v: number) {
  for (const d of [0, 0.011, 0.022]) noiseHit(k, out, t + d, 0.26 * v, 0.008, [['bandpass', 1500, 1.1]]);
  noiseHit(k, out, t + 0.03, 0.2 * v, 0.07, [['bandpass', 1400, 0.9]]);
}
function hat(k: Kit, out: AudioNode, t: number, v: number, open = false) {
  noiseHit(k, out, t, 0.13 * v, open ? 0.08 : 0.02, [['highpass', 7000, 0.7], ['bandpass', 10500, 0.6]]);
}
function shaker(k: Kit, out: AudioNode, t: number, v: number) {
  noiseHit(k, out, t, 0.09 * v, 0.035, [['bandpass', 5600, 1.3]], 0.012);
}
function boom(k: Kit, out: AudioNode, t: number, v: number) {
  const { ac } = k;
  const o = osc(ac, 'sine', 72), g = gain(ac);
  o.frequency.setValueAtTime(72, t); o.frequency.exponentialRampToValueAtTime(38, t + 0.7);
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.7 * v, t + 0.01); g.gain.setTargetAtTime(0, t + 0.01, 0.42);
  o.connect(g).connect(out); o.start(t); o.stop(t + 2.4);
  noiseHit(k, out, t, 0.12 * v, 0.3, [['lowpass', 220, 0.7]], 0.02);
}

function impulse(ac: AC, secs: number, decay: number, seed: number) {
  const len = Math.floor(ac.sampleRate * secs);
  const ir = ac.createBuffer(2, len, ac.sampleRate);
  const pre = Math.floor(ac.sampleRate * 0.014);
  for (let c = 0; c < 2; c++) {
    const r = rng(seed + c * 77);
    const d = ir.getChannelData(c);
    let lp = 0;
    for (let i = pre; i < len; i++) {
      const x = (i - pre) / (len - pre);
      lp += (r() * 2 - 1 - lp) * (0.18 + 0.55 * (1 - x));
      d[i] = lp * Math.pow(1 - x, decay);
    }
  }
  return ir;
}

function vinylBuffer(ac: AC, secs: number, seed: number) {
  const len = Math.floor(ac.sampleRate * secs);
  const b = ac.createBuffer(1, len, ac.sampleRate);
  const d = b.getChannelData(0);
  const r = rng(seed);
  let lp = 0;
  for (let i = 0; i < len; i++) { lp += (r() * 2 - 1 - lp) * 0.08; d[i] = lp * 0.03; }
  const crackles = Math.floor(secs * 7);
  for (let j = 0; j < crackles; j++) {
    const at = Math.floor(r() * (len - 40));
    const a = (0.05 + r() * 0.2) * (r() < 0.5 ? -1 : 1);
    for (let i = 0; i < 30; i++) d[at + i] += a * Math.exp(-i / 5);
  }
  return b;
}

// ---------------------------------------------------------------- loop render
interface Loop { buf: AudioBuffer; loop: number }
const loopCache = new Map<string, Promise<Loop>>();

/** One 8-bar loop (bars 5–8 fuller than 1–4) plus a reverb tail, normalized to -20 dBFS RMS. */
export function renderLoop(tr: Track, sr: number): Promise<Loop> {
  const key = `${tr.id}@${sr}`;
  let p = loopCache.get(key);
  if (!p) { p = buildLoop(tr, sr); loopCache.set(key, p); }
  return p;
}

async function buildLoop(tr: Track, sr: number): Promise<Loop> {
  const beat = 60 / tr.bpm, bar = beat * 4, loop = bar * 8, tail = 3;
  const ac = new OfflineAudioContext(2, Math.ceil((loop + tail) * sr), sr);
  const r = rng(hash(tr.id));
  const noise = ac.createBuffer(1, sr * 2, sr);
  { const d = noise.getChannelData(0); const nr = rng(hash(tr.id) + 9); for (let i = 0; i < d.length; i++) d[i] = nr() * 2 - 1; }
  const k: Kit = { ac, noise, r };

  // buses → reverb sends → master (gentle high-cut + glue compression)
  const master = gain(ac, 1);
  const hp = filt(ac, 'highpass', 32, 0.7);
  const lp = filt(ac, 'lowpass', tr.bright, 0.5);
  const comp = ac.createDynamicsCompressor();
  comp.threshold.value = -20; comp.knee.value = 10; comp.ratio.value = 2.5; comp.attack.value = 0.012; comp.release.value = 0.25;
  master.connect(hp).connect(lp).connect(comp).connect(ac.destination);
  const verb = ac.createConvolver();
  verb.buffer = impulse(ac, 2.4, 2.6, hash(tr.id) + 3);
  const verbOut = gain(ac, 0.9);
  verb.connect(verbOut).connect(master);
  const bus = (lvl: number, send: number, pan = 0) => {
    const g = gain(ac, lvl);
    const p = ac.createStereoPanner(); p.pan.value = pan;
    g.connect(p).connect(master);
    const s = gain(ac, send); g.connect(s).connect(verb);
    return g;
  };
  const keysBus = bus(1, 0.28, -0.05), padBus = bus(1, 0.4, 0.08), bassBus = bus(1, 0, 0), drumBus = bus(0.9, 0.06, 0), hatBus = bus(0.8, 0.05, 0.22), leadBus = bus(0.8, 0.5, 0.15);

  const swing = tr.swing ?? 0.5;
  const step = beat / 4;
  /** Time of a 16th step; odd 8ths are pushed late by the swing amount. */
  const at = (b: number, s: number) => {
    let x = b * bar + s * step;
    if (s % 4 === 2) x += (swing - 0.5) * 2 * step;
    return Math.max(0, x + (r() - 0.5) * 0.006);
  };
  const hv = (v: number) => v * (0.88 + r() * 0.2);

  for (let b = 0; b < 8; b++) {
    const ch = tr.prog[b % 4];
    const B = b >= 4;
    const t0 = b * bar;
    const notes = voice(tr.key, ch);
    const root = 36 + ((tr.key + ch.r) % 12);

    if (tr.pad !== 'none') pad(k, padBus, t0, voice(tr.key, ch, 50, 72), bar, tr.pad);

    // bass
    if (tr.bass === 'sub') bassNote(k, bassBus, t0, root, 0.8, bar); // legato: the release overlaps the next attack
    else if (tr.bass === 'pulse') {
      for (let e = 0; e < 8; e++) {
        if (!B && tr.drums === 'cine' && e % 2) continue;
        bassNote(k, bassBus, t0 + e * beat / 2, root, e % 2 ? 0.55 : 0.8, beat / 2 * 0.55);
      }
    }

    // keys
    const K = tr.keys;
    switch (tr.comp) {
      case 'hold':
        notes.forEach((n, i) => playKey(k, K, keysBus, t0 + i * 0.014, n, hv(0.78), beat * 2.2));
        notes.slice(-3).forEach((n, i) => playKey(k, K, keysBus, t0 + beat * 2 + i * 0.012, n, hv(0.5), beat * 1.9));
        break;
      case 'lofi':
        notes.forEach((n, i) => playKey(k, K, keysBus, at(b, 0) + i * 0.01, n, hv(0.7), beat * 1.4));
        notes.slice(-3).forEach((n, i) => playKey(k, K, keysBus, at(b, 6) + i * 0.01, n, hv(0.5), beat));
        if (B) notes.slice(-2).forEach((n, i) => playKey(k, K, keysBus, at(b, 12) + i * 0.01, n, hv(0.42), beat * 0.8));
        break;
      case 'arp8': {
        const pool = [...notes, notes[0] + 12, notes[1] + 12];
        const pat = [0, 1, 2, 3, 4, 3, 2, 1];
        pat.forEach((pi, e) => { if (!B && e % 2 && K === 'marimba') return; playKey(k, K, keysBus, at(b, e * 2), pool[pi % pool.length], hv(e % 2 ? 0.48 : 0.66), beat / 2 * 0.9); });
        break;
      }
      case 'arp16': {
        const pool = [...notes, ...notes.map((n) => n + 12)];
        for (let s = 0; s < 16; s++) playKey(k, K, keysBus, at(b, s), pool[(s * 3 + (s >> 2)) % pool.length], hv(s % 4 === 0 ? 0.5 : 0.32), step * 0.9, B ? 0.55 : 0.32);
        break;
      }
      case 'pulse8':
        for (let e = 0; e < 8; e++) notes.slice(0, 3).forEach((n) => playKey(k, K, keysBus, at(b, e * 2), n + 12, hv(e % 4 === 0 ? 0.42 : 0.24), step * 1.4, 0.4));
        break;
      case 'stab':
        voice(tr.key, ch, 45, 64).slice(0, 3).forEach((n, i) => playKey(k, K, keysBus, t0 + i * 0.02, n, hv(0.62), bar));
        if (B) playKey(k, K, keysBus, t0 + beat * 2.5, notes[notes.length - 1], hv(0.4), beat * 1.5);
        break;
    }

    // lead sparkle in the fuller half
    if (tr.lead && B) {
      const top = notes.slice(-3).map((n) => n + 12);
      [[0, 0], [1.5, 1], [3, 2]].forEach(([bt, i]) => bell(k, leadBus, t0 + bt * beat + (r() - 0.5) * 0.01, top[i % top.length], hv(0.42)));
    }

    // drums
    switch (tr.drums) {
      case 'lofi':
        (B ? [0, 7, 10] : [0, 10]).forEach((s) => kick(k, drumBus, at(b, s), hv(0.85), true));
        [4, 12].forEach((s) => rim(k, drumBus, at(b, s), hv(0.75)));
        for (let s = 0; s < 16; s += B ? 2 : 4) hat(k, hatBus, at(b, s), hv(s % 4 ? 0.5 : 0.75));
        break;
      case 'soft':
        [0, 8].forEach((s) => kick(k, drumBus, at(b, s), hv(0.7), true));
        (B ? [4, 12] : [12]).forEach((s) => rim(k, drumBus, at(b, s), hv(0.45)));
        for (let s = 0; s < 16; s += B ? 1 : 2) shaker(k, hatBus, at(b, s), hv(s % 2 ? 0.45 : 0.75));
        break;
      case 'pop':
        [0, 4, 8, 12].forEach((s) => kick(k, drumBus, at(b, s), hv(0.72), true));
        if (B) [4, 12].forEach((s) => clap(k, drumBus, at(b, s), hv(0.7)));
        [2, 6, 10, 14].forEach((s) => hat(k, hatBus, at(b, s), hv(0.55), true));
        for (let s = 0; s < 16; s++) if (s % 2) shaker(k, hatBus, at(b, s), hv(0.35));
        break;
      case 'tech':
        (B ? [0, 6, 8] : [0, 8]).forEach((s) => kick(k, drumBus, at(b, s), hv(0.75), true));
        for (let s = 0; s < 16; s += B ? 1 : 2) hat(k, hatBus, at(b, s), hv(s % 4 === 0 ? 0.55 : 0.28));
        if (B) rim(k, drumBus, at(b, 12), hv(0.45));
        break;
      case 'cine':
        if (b % 4 === 0) boom(k, drumBus, t0, 0.85);
        if (B) for (let s = 0; s < 16; s += 2) hat(k, hatBus, at(b, s), hv(0.22));
        break;
    }
  }

  if (tr.vinyl) {
    const v = ac.createBufferSource();
    v.buffer = vinylBuffer(ac, loop + tail, hash(tr.id) + 5);
    const vg = gain(ac, 0.5);
    v.connect(filt(ac, 'lowpass', 5200, 0.6)).connect(vg).connect(ac.destination);
    v.start(0);
  }

  const buf = await ac.startRendering();
  normalize(buf, Math.floor(loop * sr), -20);
  return { buf, loop };
}

function rmsOf(chs: Float32Array[], n: number) {
  let s = 0, c = 0;
  for (const d of chs) for (let i = 0; i < Math.min(n, d.length); i++) { s += d[i] * d[i]; c++; }
  return Math.sqrt(s / Math.max(1, c)) || 1e-6;
}
function normalize(buf: AudioBuffer, n: number, targetDb: number) {
  const chs = Array.from({ length: buf.numberOfChannels }, (_, c) => buf.getChannelData(c));
  const g = dB(targetDb) / rmsOf(chs, n);
  for (const d of chs) for (let i = 0; i < d.length; i++) d[i] *= g;
}

// ---------------------------------------------------------------- sound effects
interface Fx { buf: AudioBuffer; anchor: number; level: number }
const fxCache = new Map<string, Promise<Fx>>();
export function renderSfx(id: SfxId, sr: number): Promise<Fx> {
  const key = `${id}@${sr}`;
  let p = fxCache.get(key);
  if (!p) { p = buildSfx(id, sr); fxCache.set(key, p); }
  return p;
}

async function buildSfx(id: SfxId, sr: number): Promise<Fx> {
  const dur = id === 'whoosh' ? 0.8 : id === 'capture' ? 0.36 : 0.22;
  const ac = new OfflineAudioContext(2, Math.ceil(dur * sr), sr);
  const noise = ac.createBuffer(1, sr * 2, sr);
  { const d = noise.getChannelData(0); const nr = rng(hash(id)); for (let i = 0; i < d.length; i++) d[i] = nr() * 2 - 1; }
  const k: Kit = { ac, noise, r: rng(hash(id) + 1) };
  const out = gain(ac, 1);
  out.connect(ac.destination);
  let anchor = 0, level = 0.4;
  if (id === 'whoosh') {
    // band-passed air that swells to the cut and pans across
    anchor = 0.36; level = 0.42;
    const s = ac.createBufferSource(); s.buffer = noise;
    const bp = filt(ac, 'bandpass', 380, 1.3);
    bp.frequency.setValueAtTime(380, 0);
    bp.frequency.exponentialRampToValueAtTime(2600, 0.36);
    bp.frequency.exponentialRampToValueAtTime(650, 0.74);
    const air = filt(ac, 'highpass', 3800, 0.7), airG = gain(ac, 0.18);
    const g = gain(ac);
    const curve = new Float32Array(64);
    for (let i = 0; i < 64; i++) { const x = i / 63; curve[i] = x < 0.48 ? Math.pow(x / 0.48, 2.2) : Math.pow(1 - (x - 0.48) / 0.52, 1.6); }
    g.gain.setValueCurveAtTime(curve, 0, 0.75);
    const pan = ac.createStereoPanner();
    pan.pan.setValueAtTime(-0.55, 0); pan.pan.linearRampToValueAtTime(0.55, 0.75);
    s.connect(bp).connect(g); s.connect(air).connect(airG).connect(g);
    g.connect(pan).connect(out);
    s.start(0, 0.2); s.stop(0.78);
  } else if (id === 'click') {
    // soft UI tick: a short tone, a bright tick and a low body
    level = 0.3;
    const o = osc(ac, 'sine', 2300), g = gain(ac);
    o.frequency.setValueAtTime(2300, 0); o.frequency.exponentialRampToValueAtTime(1700, 0.03);
    g.gain.setValueAtTime(0.5, 0); g.gain.setTargetAtTime(0, 0.001, 0.011);
    o.connect(g).connect(out); o.start(0); o.stop(0.15);
    noiseHit(k, out, 0, 0.35, 0.004, [['bandpass', 3800, 2]]);
    const b = osc(ac, 'sine', 160), bg = gain(ac);
    bg.gain.setValueAtTime(0.3, 0); bg.gain.setTargetAtTime(0, 0.001, 0.028);
    b.connect(bg).connect(out); b.start(0); b.stop(0.2);
  } else if (id === 'capture') {
    // camera shutter: open click, a short mechanical whirr, close click with a thump
    level = 0.48;
    noiseHit(k, out, 0, 0.7, 0.006, [['bandpass', 3200, 1.5]]);
    noiseHit(k, out, 0, 0.36, 0.022, [['bandpass', 900, 0.8]]);
    noiseHit(k, out, 0.035, 0.14, 0.028, [['bandpass', 1600, 4]], 0.006);
    noiseHit(k, out, 0.095, 0.55, 0.008, [['bandpass', 2600, 1.5]]);
    for (const [t, f] of [[0, 110], [0.095, 88]] as const) {
      const o = osc(ac, 'sine', f), g = gain(ac);
      g.gain.setValueAtTime(0.32, t); g.gain.setTargetAtTime(0, t + 0.001, 0.035);
      o.connect(g).connect(out); o.start(t); o.stop(t + 0.25);
    }
  } else {
    // pop: a quick upward blip
    level = 0.38;
    const o = osc(ac, 'sine', 380), g = gain(ac);
    o.frequency.setValueAtTime(380, 0); o.frequency.exponentialRampToValueAtTime(920, 0.05);
    g.gain.setValueAtTime(0, 0); g.gain.linearRampToValueAtTime(0.6, 0.004); g.gain.setTargetAtTime(0, 0.006, 0.035);
    o.connect(g).connect(out); o.start(0); o.stop(0.22);
    noiseHit(k, out, 0, 0.12, 0.003, [['highpass', 2500, 0.7]]);
  }
  const buf = await ac.startRendering();
  // peak-normalize to -6 dBFS so levels below are predictable
  let pk = 0;
  for (let c = 0; c < buf.numberOfChannels; c++) { const d = buf.getChannelData(c); for (let i = 0; i < d.length; i++) pk = Math.max(pk, Math.abs(d[i])); }
  const g = 0.5 / (pk || 1);
  for (let c = 0; c < buf.numberOfChannels; c++) { const d = buf.getChannelData(c); for (let i = 0; i < d.length; i++) d[i] *= g; }
  return { buf, anchor, level };
}

// ---------------------------------------------------------------- placement
export interface SfxEvent { t: number; id: SfxId }
const MOVE = new Set(['split', 'circle', 'arch', 'polaroid', 'band', 'frame', 'sticker', 'duotone', 'card', 'broll']);

/** Where effects land: whoosh on layout changes, click when a title lands, capture on polaroids, pop on stickers. Sparse by design. */
export function sfxEvents(edit: Edit, on: SfxId[]): SfxEvent[] {
  const want = new Set(on);
  const raw: SfxEvent[] = [];
  edit.shots.forEach((s, i) => {
    const prev = edit.shots[i - 1];
    if (prev && s.layout !== prev.layout && (MOVE.has(s.layout) || MOVE.has(prev.layout))) {
      if (s.layout === 'polaroid' && want.has('capture')) raw.push({ t: s.outS + 0.42, id: 'capture' });
      else if (s.layout === 'sticker' && want.has('pop')) raw.push({ t: s.outS + 0.08, id: 'pop' });
      else if (want.has('whoosh')) raw.push({ t: s.outS + 0.2, id: 'whoosh' });
    }
    if (want.has('click') && s.mg) {
      const at = i === 0 ? 0.2 : s.mg.kind === 'word' ? 0.35 : s.layout === 'split' || s.layout === 'circle' ? 0.55 : 0.48;
      if (s.outS + at < s.outE - 0.2) raw.push({ t: s.outS + at, id: 'click' });
    }
  });
  raw.sort((a, b) => a.t - b.t);
  const out: SfxEvent[] = [];
  for (const e of raw) {
    if (e.t < 0.05 || e.t > edit.duration - 0.3) continue;
    const last = out[out.length - 1];
    if (last && e.t - last.t < 0.26) continue;
    const same = [...out].reverse().find((x) => x.id === e.id);
    if (same && e.t - same.t < 2.2) continue;
    out.push(e);
  }
  return out;
}

// ---------------------------------------------------------------- ducking
/** Speech presence 0..1 at 100 Hz, from the caption timings (fast attack, slow release). */
export function speechEnvelope(edit: Edit) {
  const rate = 100;
  const n = Math.max(1, Math.ceil(edit.duration * rate) + 1);
  const on = new Uint8Array(n);
  for (const c of edit.caps) {
    const a = Math.max(0, Math.floor(c.outS * rate)), b = Math.min(n - 1, Math.ceil((c.outE + 0.18) * rate));
    for (let i = a; i <= b; i++) on[i] = 1;
  }
  const env = new Float32Array(n);
  const att = 1 - Math.exp(-1 / (0.05 * rate)), rel = 1 - Math.exp(-1 / (0.42 * rate));
  let v = 0;
  for (let i = 0; i < n; i++) { const tgt = on[i]; v += (tgt - v) * (tgt > v ? att : rel); env[i] = v; }
  // look ahead a little so the dip starts just before the first word
  const ahead = Math.round(0.08 * rate);
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) out[i] = Math.max(env[i], env[Math.min(n - 1, i + ahead)]);
  return { env: out, rate };
}

// ---------------------------------------------------------------- bed
export async function decodeMusic(blob: Blob, sr: number): Promise<AudioBuffer> {
  const ac = new OfflineAudioContext(2, 1, sr);
  return ac.decodeAudioData(await blob.arrayBuffer());
}

function tile(src: AudioBuffer, loopSamples: number, len: number, L: Float32Array, R: Float32Array, xfade = 0) {
  const a = src.getChannelData(0), b = src.numberOfChannels > 1 ? src.getChannelData(1) : a;
  const step = Math.max(1, loopSamples - xfade);
  for (let off = 0; off < len; off += step) {
    for (let i = 0; i < src.length && off + i < len; i++) {
      let g = 1;
      if (xfade && off > 0 && i < xfade) g = i / xfade;
      if (xfade && i > loopSamples - xfade) g = Math.max(0, (loopSamples - i) / xfade);
      if (xfade && i >= loopSamples) break;
      L[off + i] += a[i] * g;
      R[off + i] += b[i] * g;
    }
  }
}

export interface Bed { buf: AudioBuffer; events: SfxEvent[]; track: Track | null }

/**
 * Music + effects for the whole edit, already set against the voice (voice is normalized to about -16 dBFS RMS):
 * music sits ~15 dB under speech when ducked, ~7 dB under in gaps and at the end, effects ~2–4 dB under the voice peaks.
 */
export async function buildBed(edit: Edit, s: SoundSettings, o: { sr: number; group: GroupId | string; upload?: AudioBuffer | null }): Promise<Bed | null> {
  if (!soundOn(s)) return null;
  const sr = o.sr;
  const len = Math.max(1, Math.round(edit.duration * sr));
  const L = new Float32Array(len), R = new Float32Array(len);
  const { env, rate } = speechEnvelope(edit);
  const envAt = (i: number) => { const x = (i / sr) * rate; const a = Math.floor(x); const f = x - a; return (env[Math.min(env.length - 1, a)] ?? 0) * (1 - f) + (env[Math.min(env.length - 1, a + 1)] ?? 0) * f; };

  const track = resolveTrack(s, o.group);
  let hasMusic = false;
  if (track) {
    const { buf, loop } = await renderLoop(track, sr);
    tile(buf, Math.round(loop * sr), len, L, R);
    hasMusic = true;
  } else if (s.music === 'upload' && o.upload) {
    const up = o.upload;
    normalize(up, up.length, -20);
    if (up.length >= len) tile(up, up.length, len, L, R);
    else tile(up, up.length, len, L, R, Math.min(Math.round(sr * 1.5), Math.floor(up.length / 4)));
    hasMusic = true;
  }
  if (hasMusic) {
    const vol = dB(20 * Math.log10(clamp(s.musicVol, 0.05, 1) / 0.5));
    const ducked = dB(-11), open = dB(-3), flat = dB(-7);
    const fin = Math.round(0.25 * sr), fout = Math.round(Math.min(1.8, edit.duration / 4) * sr);
    for (let i = 0; i < len; i++) {
      let g = s.duck ? ducked + (open - ducked) * (1 - envAt(i)) : flat;
      if (i < fin) g *= i / fin;
      if (i > len - fout) g *= 0.5 - 0.5 * Math.cos(Math.PI * Math.max(0, (len - i) / fout));
      g *= vol;
      L[i] *= g; R[i] *= g;
    }
  }

  const events = sfxEvents(edit, s.sfx);
  const fxVol = dB(20 * Math.log10(clamp(s.sfxVol, 0.05, 1) / 0.5));
  for (const e of events) {
    const fx = await renderSfx(e.id, sr);
    const a = fx.buf.getChannelData(0), b = fx.buf.numberOfChannels > 1 ? fx.buf.getChannelData(1) : a;
    const start = Math.round((e.t - fx.anchor) * sr);
    const duck = 1 - 0.3 * envAt(Math.max(0, Math.round(e.t * sr)));
    const g = fx.level * fxVol * duck;
    for (let i = 0; i < a.length; i++) {
      const j = start + i;
      if (j < 0 || j >= len) continue;
      L[j] += a[i] * g; R[j] += b[i] * g;
    }
  }

  const buf = new AudioBuffer({ length: len, numberOfChannels: 2, sampleRate: sr });
  buf.copyToChannel(L, 0); buf.copyToChannel(R, 1);
  return { buf, events, track };
}

// ---------------------------------------------------------------- voice level + mix
/** The gain export applies to the voice (same rule as buildAudio): RMS to -16 dBFS, peaks under -1 dBFS, at most ×6. */
export function voiceGain(src: AudioBuffer, edit: Edit): number {
  const sr = src.sampleRate, s = src.getChannelData(0);
  let sum = 0, peak = 0;
  for (const g of edit.segs) {
    const a = Math.floor(g.srcS * sr), b = Math.min(s.length, Math.floor(g.srcE * sr));
    for (let i = a; i < b; i++) { sum += s[i] * s[i]; peak = Math.max(peak, Math.abs(s[i])); }
  }
  const rms = Math.sqrt(sum / Math.max(1, Math.round(edit.duration * sr))) || 1e-6;
  return Math.min(dB(-16) / rms, 0.89 / (peak || 1), 6) || 1;
}

/** Voice + bed into one stereo buffer, then a look-ahead peak limiter at -1 dBFS. */
export function mixDown(voice: AudioBuffer | null, bed: AudioBuffer | null, sr: number, len: number): AudioBuffer {
  const out = new AudioBuffer({ length: len, numberOfChannels: 2, sampleRate: sr });
  const L = out.getChannelData(0), R = out.getChannelData(1);
  if (voice) {
    const a = voice.getChannelData(0), b = voice.numberOfChannels > 1 ? voice.getChannelData(1) : a;
    const n = Math.min(len, a.length);
    for (let i = 0; i < n; i++) { L[i] = a[i]; R[i] = b[i]; }
  }
  if (bed) {
    const a = bed.getChannelData(0), b = bed.numberOfChannels > 1 ? bed.getChannelData(1) : a;
    const n = Math.min(len, a.length);
    for (let i = 0; i < n; i++) { L[i] += a[i]; R[i] += b[i]; }
  }
  limit(L, R, sr, 0.89);
  return out;
}

function limit(L: Float32Array, R: Float32Array, sr: number, ceil: number) {
  const blk = 64;
  const rel = Math.exp(-blk / (0.09 * sr));
  const need = (i: number) => {
    let pk = 0;
    const end = Math.min(L.length, i + blk);
    for (let j = i; j < end; j++) pk = Math.max(pk, Math.abs(L[j]), Math.abs(R[j]));
    return pk > ceil ? ceil / pk : 1;
  };
  let g = 1;
  let cur = need(0);
  for (let i = 0; i < L.length; i += blk) {
    const next = need(i + blk);
    // ramp across this block toward what the next block needs; never above what this block needs
    const g0 = Math.min(g, cur);
    const g1 = Math.min(1 - (1 - g) * rel, next, cur);
    const stop = Math.min(L.length, i + blk);
    for (let j = i; j < stop; j++) { const gj = g0 + (g1 - g0) * ((j - i) / blk); L[j] *= gj; R[j] *= gj; }
    g = g1;
    cur = next;
  }
}

/** 16-bit PCM WAV. */
export function toWav(buf: AudioBuffer): Blob {
  const ch = buf.numberOfChannels, sr = buf.sampleRate, n = buf.length;
  const data = new DataView(new ArrayBuffer(44 + n * ch * 2));
  const w = (o: number, s: string) => { for (let i = 0; i < s.length; i++) data.setUint8(o + i, s.charCodeAt(i)); };
  w(0, 'RIFF'); data.setUint32(4, 36 + n * ch * 2, true); w(8, 'WAVE'); w(12, 'fmt ');
  data.setUint32(16, 16, true); data.setUint16(20, 1, true); data.setUint16(22, ch, true); data.setUint32(24, sr, true);
  data.setUint32(28, sr * ch * 2, true); data.setUint16(32, ch * 2, true); data.setUint16(34, 16, true);
  w(36, 'data'); data.setUint32(40, n * ch * 2, true);
  const chs = Array.from({ length: ch }, (_, c) => buf.getChannelData(c));
  let o = 44;
  for (let i = 0; i < n; i++) for (let c = 0; c < ch; c++) { const v = clamp(chs[c][i], -1, 1); data.setInt16(o, v < 0 ? v * 0x8000 : v * 0x7fff, true); o += 2; }
  return new Blob([data.buffer], { type: 'audio/wav' });
}

// ---------------------------------------------------------------- live playback
let ctxSingleton: AudioContext | null = null;
export const audioCtx = () => (ctxSingleton ??= new AudioContext());

let preview: { src: AudioBufferSourceNode; done?: () => void } | null = null;
export function stopPreview() {
  if (!preview) return;
  try { preview.src.stop(); } catch { /* already stopped */ }
  const d = preview.done;
  preview = null;
  d?.();
}
/** Play a short audition (track loop or effect) and call done when it ends or is replaced. */
export async function playPreview(buf: AudioBuffer, secs: number, level: number, done?: () => void) {
  stopPreview();
  const ac = audioCtx();
  if (ac.state !== 'running') await ac.resume();
  const src = ac.createBufferSource();
  src.buffer = buf;
  const g = ac.createGain();
  const t = ac.currentTime + 0.02, end = t + Math.min(secs, buf.duration);
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(level, t + 0.04);
  g.gain.setValueAtTime(level, Math.max(t + 0.05, end - 0.5)); g.gain.linearRampToValueAtTime(0, end);
  src.connect(g).connect(ac.destination);
  src.start(t); src.stop(end);
  const me = { src, done };
  preview = me;
  src.onended = () => { if (preview === me) { preview = null; done?.(); } };
}
