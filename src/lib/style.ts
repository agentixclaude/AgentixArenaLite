// Style engine: transcript words -> pause cuts -> beats -> shots + motion graphics + caption groups.
// Every shot has a stable key (its first word) so the Shots panel can override it.
import type { LayoutKind, Pack } from './packs';
import { iconForText } from './icons';
import { groupById, type HookStyle } from './looks';
import { lockupFromWords } from './kinetic';

export interface Word { w: string; s: number; e: number; i?: number }
export interface Seg { srcS: number; srcE: number; outS: number; outE: number }

export type CardKind = 'editorial' | 'data' | 'stack' | 'index' | 'object3d' | 'lockup';
export const CARD_KINDS: { id: CardKind; name: string }[] = [
  { id: 'editorial', name: 'Editorial' }, { id: 'data', name: 'Big number' }, { id: 'stack', name: 'Kinetic stack' },
  { id: 'index', name: 'Numbered list' }, { id: 'object3d', name: '3D object' }, { id: 'lockup', name: 'Two-font lockup' },
];

export type MG =
  | { kind: 'hook'; text: string; end: number; behind?: string; style?: 'lockup'; small?: string; big?: string; order?: 'small-big' | 'big-small' }
  | { kind: 'word'; small: string; big: string; order?: 'small-big' | 'big-small' }
  | { kind: 'stat'; value: string; label: string; icon: string }
  | { kind: 'list'; title: string; items: string[]; icon: string }
  | { kind: 'keyword'; text: string; sub: string; icon: string }
  | { kind: 'quote'; text: string; icon: string }
  | { kind: 'cta'; text: string; icon: string };

export interface BrollRef { id: string; mode: 'full' | 'split' }
export interface Shot {
  key: string; outS: number; outE: number; layout: LayoutKind; auto: LayoutKind; zoom: number;
  mg?: MG; card?: CardKind; behind?: string; broll?: BrollRef; hint?: { query: string; prompt: string; pick?: boolean };
  text: string; kw: string;
}
export interface CapGroup { outS: number; outE: number; words: Word[] }

export interface ShotEdit { layout?: LayoutKind; text?: string; card?: CardKind; broll?: BrollRef | null }
export interface EditOpts { edits?: Record<string, ShotEdit>; cutout?: boolean; hook?: HookStyle }

export interface Edit {
  duration: number;
  segs: Seg[];
  words: Word[];
  shots: Shot[];
  caps: CapGroup[];
  hookEnd: number;
}

/** True when a shot needs the speaker cut out (text behind, frame break, sticker). */
export const usesCutout = (edit: Edit) =>
  edit.shots.some((s) => s.layout === 'behind' || s.layout === 'frame' || s.layout === 'sticker' || (s.mg?.kind === 'hook' && !!s.mg.behind));

export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashStr(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

export function cutPauses(words: Word[], srcDur: number, maxGap = 0.42, pad = 0.12): Seg[] {
  if (!words.length) return [{ srcS: 0, srcE: srcDur, outS: 0, outE: srcDur }];
  const ranges: [number, number][] = [];
  let s = Math.max(0, words[0].s - pad);
  let e = words[0].e + pad;
  for (let i = 1; i < words.length; i++) {
    const w = words[i];
    if (w.s - pad > e && w.s - words[i - 1].e > maxGap) {
      ranges.push([s, e]);
      s = w.s - pad;
    }
    e = Math.max(e, w.e + pad);
  }
  ranges.push([s, Math.min(srcDur, e)]);
  const segs: Seg[] = [];
  let out = 0;
  for (const [a, b] of ranges) {
    if (b - a < 0.08) continue;
    segs.push({ srcS: a, srcE: b, outS: out, outE: out + (b - a) });
    out += b - a;
  }
  return segs;
}

export function srcToOut(segs: Seg[], t: number): number | null {
  for (const g of segs) if (t >= g.srcS - 1e-4 && t <= g.srcE + 1e-4) return g.outS + (t - g.srcS);
  return null;
}
export function outToSrc(segs: Seg[], t: number): number {
  for (const g of segs) if (t < g.outE) return g.srcS + Math.max(0, t - g.outS);
  const l = segs[segs.length - 1];
  return l ? l.srcE : t;
}

const STOP = new Set('a an the and or but so to of in on at for with from by is are was were be been being it its this that these those i you he she we they me my your our their them his her as if then than there here what which who whom whose when where why how all any both each few more most other some such no nor not only own same too very can will just do does did done have has had having about into over after before again further once up down out off also get got going gonna like really thing things know think yeah okay ok um uh let lets just actually right now one part'.split(' '));

export const clean = (w: string) => w.replace(/^[^\p{L}\p{N}$₹]+|[^\p{L}\p{N}%]+$/gu, '');

export function keywordOf(ws: Word[]): string {
  let best = '';
  let score = -1;
  ws.forEach((w, k) => {
    const c = clean(w.w);
    if (!c || STOP.has(c.toLowerCase())) return;
    let sc = c.length;
    const sentenceStart = k === 0 || /[.?!]$/.test(ws[k - 1].w.trim());
    if (/^[A-Z]/.test(c) && !sentenceStart) sc += 3;
    if (/\d/.test(c)) sc += 6;
    if (sc > score) { score = sc; best = c; }
  });
  return best;
}

const NUM_RE = /^(\$|₹)?\d[\d,.]*(%|k|m|b|x)?$/i;
const NUM_WORDS: Record<string, string> = { two: '2', three: '3', four: '4', five: '5', six: '6', seven: '7', eight: '8', nine: '9', ten: '10', hundred: '100', thousand: '1,000', million: '1M', billion: '1B' };
const CTA_RE = /\b(follow|subscribe|comment|link|dm|bio|join|register|sign up|signup|click|save this|share)\b/i;
const LIST_RE = /\b(first|second|third|step|number one|tip|reasons?|ways?)\b/i;
const ENERGETIC = new Set(['ignite', 'loud', 'pulse', 'signal']);

function statOf(ws: Word[]): { value: string; label: string } | null {
  for (let i = 0; i < ws.length; i++) {
    const c = clean(ws[i].w);
    let v: string | null = null;
    if (NUM_RE.test(c) && c.replace(/\D/g, '').length > 0) v = c;
    else if (NUM_WORDS[c.toLowerCase()] && i + 1 < ws.length) v = NUM_WORDS[c.toLowerCase()];
    if (v) {
      const nx = clean(ws[i + 1]?.w ?? '').toLowerCase();
      if (nx === 'percent') v += '%';
      else if (['million', 'billion', 'thousand', 'lakh', 'crore', 'x', 'times'].includes(nx)) v += ' ' + (nx === 'times' ? 'x' : nx);
      const after = ws.slice(i + 1, i + 6).map((w) => clean(w.w)).filter((w) => w && !['percent', 'million', 'billion', 'thousand'].includes(w.toLowerCase()));
      return { value: v, label: after.slice(0, 3).join(' ') };
    }
  }
  return null;
}

function beats(words: Word[]): Word[][] {
  const out: Word[][] = [];
  let cur: Word[] = [];
  for (let i = 0; i < words.length; i++) {
    const w = words[i];
    cur.push(w);
    const len = cur[cur.length - 1].e - cur[0].s;
    const endPunct = /[.?!]$/.test(w.w.trim());
    const next = words[i + 1];
    const gapNext = next ? next.s - w.e : 1;
    if ((endPunct && len > 1.6) || len > 4.6 || (len > 2.6 && gapNext > 0.25) || !next) {
      out.push(cur);
      cur = [];
    }
  }
  if (cur.length) out.push(cur);
  const merged: Word[][] = [];
  for (const b of out) {
    const len = b[b.length - 1].e - b[0].s;
    if (merged.length && len < 1.0) merged[merged.length - 1].push(...b);
    else merged.push(b);
  }
  return merged;
}

function pickWeighted<T extends string>(r: () => number, weights: Partial<Record<T, number>>, avoid: Set<T>): T {
  const entries = (Object.entries(weights) as [T, number][]).filter(([k, v]) => v > 0 && !avoid.has(k));
  const total = entries.reduce((a, [, v]) => a + v, 0);
  let x = r() * total;
  for (const [k, v] of entries) { x -= v; if (x <= 0) return k; }
  return entries[0][0];
}

const sentence = (ws: Word[], max = 6) => ws.slice(0, max).map((w) => clean(w.w)).filter(Boolean).join(' ');
const contentWords = (ws: Word[]) => ws.map((w) => clean(w.w)).filter((w) => w.length > 3 && !STOP.has(w.toLowerCase()) && !/^\d/.test(w));
const MG_LAYOUTS = new Set<LayoutKind>(['split', 'card', 'circle', 'arch', 'polaroid', 'band', 'frame', 'sticker', 'duotone']);
/** Layouts that show a keyword/stat beside or above the speaker. */
const PANEL_LAYOUTS = new Set<LayoutKind>(['split', 'circle', 'arch', 'polaroid', 'band', 'frame', 'sticker', 'duotone']);
/** Layouts that need the subject cut-out, and what they become without it. */
const NEEDS_CUT: Partial<Record<LayoutKind, LayoutKind>> = { frame: 'arch', sticker: 'polaroid' };

function cardFor(mg: MG | undefined, pack: Pack, r: () => number): CardKind {
  if (mg?.kind === 'stat') return r() < 0.7 ? 'data' : 'object3d';
  if (mg?.kind === 'list') return 'index';
  // Each style group has its own full-graphic set (common look across its presets).
  const set = groupById(pack.group).cards.filter((c) => c !== 'data' && c !== 'index');
  const x = r();
  if (set.length) return set[Math.min(set.length - 1, Math.floor(x * set.length))];
  if (ENERGETIC.has(pack.id)) return x < 0.45 ? 'stack' : x < 0.8 ? 'editorial' : 'object3d';
  return x < 0.55 ? 'editorial' : x < 0.8 ? 'object3d' : 'stack';
}

const HOOK_MAX = 12;

/** Lockup text typed by hand: "small line / BIG WORD", or let the key word be picked. */
function splitLockup(t: string): { small: string; big: string; order: 'small-big' | 'big-small' } {
  if (t.includes('/')) {
    const [a, b] = t.split('/').map((x) => x.trim());
    return { small: a, big: b || a, order: 'small-big' };
  }
  const ws = t.split(/\s+/).filter(Boolean);
  const L = lockupFromWords(ws, keywordOf(ws.map((w) => ({ w, s: 0, e: 0 }))));
  return { small: L.small, big: L.big, order: L.order ?? 'small-big' };
}

export function buildEdit(srcWords: Word[], srcDur: number, pack: Pack, seed: number, opts: EditOpts = {}): Edit {
  const r = rng(seed);
  const G = groupById(pack.group);
  const hookStyle: HookStyle = opts.hook ?? G.hook;
  // The group's layout set; layouts that need the cut-out fall back when it is off.
  const mix: Partial<Record<LayoutKind, number>> = { ...G.layouts };
  if (!opts.cutout) for (const [k, to] of Object.entries(NEEDS_CUT) as [LayoutKind, LayoutKind][]) if (mix[k]) { mix[to] = (mix[to] ?? 0) + mix[k]!; delete mix[k]; }
  const panelPick = (Object.keys(mix) as LayoutKind[]).filter((l) => PANEL_LAYOUTS.has(l) && l !== 'split' && l !== 'circle');
  const segs = cutPauses(srcWords, srcDur);
  const words: Word[] = [];
  srcWords.forEach((w, i) => {
    const s = srcToOut(segs, w.s);
    const e = srcToOut(segs, w.e);
    if (s == null) return;
    words.push({ w: w.w, s, e: e ?? s + (w.e - w.s), i });
  });
  const duration = segs.length ? segs[segs.length - 1].outE : srcDur;
  const bs = beats(words);
  const shots: Shot[] = [];
  let mgTime = 0;
  let prev: LayoutKind | null = null;
  let hookEnd = 0;
  bs.forEach((b, i) => {
    const outS = i === 0 ? 0 : b[0].s;
    const outE = i === bs.length - 1 ? duration : bs[i + 1][0].s;
    const len = outE - outS;
    const text = b.map((w) => w.w).join(' ');
    const icon = iconForText(text, pack.icon);
    const kw = keywordOf(b);
    const base = { key: `w${b[0].i ?? i}`, outS, outE, text, kw };
    let shot: Shot;
    if (i === 0) {
      const end = b.length > HOOK_MAX ? b[HOOK_MAX].s : outE;
      hookEnd = end;
      const hk = b.slice(0, HOOK_MAX);
      if (hookStyle === 'lockup') {
        const L = lockupFromWords(hk.map((w) => w.w), keywordOf(hk) || kw);
        shot = { ...base, layout: 'full', auto: 'full', zoom: 1.0, mg: { kind: 'hook', text: sentence(b, HOOK_MAX), end, style: 'lockup', small: L.small, big: L.big, order: L.order } };
      } else shot = { ...base, layout: 'full', auto: 'full', zoom: 1.0, mg: { kind: 'hook', text: sentence(b, HOOK_MAX), end, behind: opts.cutout ? kw : undefined } };
    } else if (i === bs.length - 1 && CTA_RE.test(text)) {
      const lay: LayoutKind = prev === 'split' || prev === 'circle' ? 'card' : 'split';
      shot = { ...base, layout: lay, auto: lay, zoom: 1, mg: { kind: 'cta', text: sentence(b, 6), icon: /comment|dm|message/i.test(text) ? 'message' : /link|bio|click/i.test(text) ? 'link' : /subscribe/i.test(text) ? 'bell' : /follow/i.test(text) ? 'heart' : 'rocket' } };
      if (lay === 'card') shot.card = 'editorial';
    } else {
      const stat = statOf(b);
      const isList = LIST_RE.test(text);
      const mgShare = mgTime / Math.max(1, outS);
      const allowMG = !MG_LAYOUTS.has(prev as LayoutKind) && mgShare < 0.5 && len > 1.2;
      if (stat && allowMG) {
        const x = r();
        const alt = panelPick.filter((l) => l !== 'duotone' && l !== 'sticker');
        const lay: LayoutKind = x < 0.4 ? 'split' : x < 0.7 || !alt.length ? 'card' : alt[Math.floor(r() * alt.length)];
        shot = { ...base, layout: lay, auto: lay, zoom: 1, mg: { kind: 'stat', ...stat, icon } };
      } else if (isList && allowMG) {
        const items = b.map((w) => clean(w.w)).filter((w) => w && !STOP.has(w.toLowerCase())).slice(0, 3);
        shot = { ...base, layout: 'split', auto: 'split', zoom: 1, mg: { kind: 'list', title: kw || 'Key points', items, icon } };
      } else {
        const avoid = new Set<LayoutKind>();
        if (prev) avoid.add(prev);
        if (!allowMG) for (const l of MG_LAYOUTS) avoid.add(l);
        const layout = pickWeighted<LayoutKind>(r, mix, avoid);
        if (PANEL_LAYOUTS.has(layout)) shot = { ...base, layout, auto: layout, zoom: 1, mg: { kind: 'keyword', text: kw || sentence(b, 2), sub: sentence(b, 7), icon: iconForText(kw, icon) } };
        else if (layout === 'card') shot = { ...base, layout, auto: layout, zoom: 1, mg: { kind: 'quote', text: sentence(b, 7), icon } };
        else shot = { ...base, layout, auto: layout, zoom: layout === 'punch' ? 1.16 + r() * 0.08 : 1.0 };
      }
      if (shot.layout === 'card') shot.card = cardFor(shot.mg, pack, r);
    }
    if (MG_LAYOUTS.has(shot.layout)) mgTime += len;
    prev = shot.layout;
    shots.push(shot);
  });
  if (!shots.length) shots.push({ key: 'w0', outS: 0, outE: duration, layout: 'full', auto: 'full', zoom: 1, text: '', kw: '' });

  // One mid-video "text behind subject" moment, on a plain talking-head beat with a strong word.
  if (opts.cutout && shots.length > 4) {
    let best = -1, bestD = Infinity;
    shots.forEach((s, i) => {
      if (i < 2 || i > shots.length - 2 || (s.layout !== 'full' && s.layout !== 'punch') || s.kw.length < 4 || s.outE - s.outS < 1.3) return;
      if (MG_LAYOUTS.has(shots[i - 1].layout) && MG_LAYOUTS.has(shots[i + 1].layout)) return;
      const d = Math.abs((s.outS + s.outE) / 2 - duration * 0.55);
      if (d < bestD) { bestD = d; best = i; }
    });
    if (best > 0) { shots[best].layout = 'behind'; shots[best].auto = 'behind'; shots[best].behind = shots[best].kw; shots[best].zoom = 1; }
  }

  // Kinetic main-word lockups on some plain talking-head beats (the group decides how often).
  let lastWord = -99;
  shots.forEach((s, i) => {
    if (i === 0 || i === shots.length - 1 || s.mg || (s.layout !== 'full' && s.layout !== 'punch')) return;
    if (s.outE - s.outS < 1.5 || s.kw.length < 4 || s.outS - lastWord < 5.5) return;
    if (r() > G.words) return;
    const L = lockupFromWords((bs[i] ?? []).map((w) => w.w), s.kw);
    if (!L.big) return;
    s.mg = { kind: 'word', small: L.small, big: L.big, order: L.order };
    lastWord = s.outS;
  });

  // B-roll spots: talking-head beats with concrete words, roughly one every 7 seconds.
  let lastHint = -99;
  shots.forEach((s, i) => {
    if (i === 0 || i === shots.length - 1) return;
    const b = bs[i] ?? [];
    const cw = contentWords(b);
    if (!cw.length) return;
    s.hint = {
      query: cw.slice(0, 3).join(' ').toLowerCase(),
      prompt: `Cinematic B-roll for "${sentence(b, 12)}": ${cw.slice(0, 3).join(', ').toLowerCase()} — real-world shot, natural light, 35mm, shallow depth of field, slow push-in, no on-screen text`,
    };
    if ((s.layout === 'full' || s.layout === 'punch') && s.outS - lastHint > 7 && s.outE - s.outS > 1.4) { lastHint = s.outS; s.hint.pick = true; }
  });

  // Per-shot overrides from the Shots panel.
  const ed = opts.edits ?? {};
  shots.forEach((s, i) => {
    const e = ed[s.key];
    if (!e) return;
    const b = bs[i] ?? [];
    const icon = iconForText(s.text, pack.icon);
    if (e.layout && e.layout !== s.layout) {
      const L = e.layout;
      const keepMg = s.mg && s.mg.kind !== 'hook' ? s.mg : undefined;
      s.layout = L;
      s.zoom = L === 'punch' ? 1.18 : 1;
      if (L === 'full') s.mg = s.mg?.kind === 'hook' ? s.mg : undefined;
      else if (L === 'punch') s.mg = undefined;
      else if (PANEL_LAYOUTS.has(L)) s.mg = keepMg && keepMg.kind !== 'quote' && keepMg.kind !== 'word' ? keepMg : { kind: 'keyword', text: s.kw || sentence(b, 2), sub: sentence(b, 7), icon: iconForText(s.kw, icon) };
      else if (L === 'card') { s.mg = keepMg && keepMg.kind !== 'word' ? keepMg : { kind: 'quote', text: sentence(b, 7), icon }; s.card = cardFor(s.mg, pack, rng(hashStr(s.key))); }
      else if (L === 'behind') { s.mg = s.mg?.kind === 'hook' ? s.mg : undefined; s.behind = s.kw || clean(b[0]?.w ?? ''); }
      else if (L === 'broll') s.mg = s.mg?.kind === 'hook' ? s.mg : undefined;
    }
    if (e.card && s.layout === 'card') s.card = e.card;
    if (e.broll) s.broll = e.broll;
    if (s.layout === 'broll' && !s.broll) { s.layout = 'full'; }
    if (e.text != null && e.text.trim()) {
      const t = e.text.trim();
      const m = s.mg;
      if (s.layout === 'behind') s.behind = t;
      else if (m?.kind === 'hook' && m.style === 'lockup') { m.text = t; Object.assign(m, splitLockup(t)); }
      else if (m?.kind === 'hook') m.text = t;
      else if (m?.kind === 'word') Object.assign(m, splitLockup(t));
      else if (m?.kind === 'keyword' || m?.kind === 'quote' || m?.kind === 'cta') m.text = t;
      else if (m?.kind === 'list') m.title = t;
      else if (m?.kind === 'stat') m.label = t;
    }
  });
  const first = shots[0];
  if (first.mg?.kind === 'hook' && ed[first.key]?.layout === 'behind') first.mg.behind = first.behind;
  if (first.layout === 'behind' && first.mg?.kind === 'hook') { first.mg.behind = first.behind ?? first.mg.behind; }

  // Caption groups. A group never straddles the end of the hook, so no word is lost when it fades.
  const caps: CapGroup[] = [];
  let g: Word[] = [];
  const flush = () => { if (g.length) caps.push({ outS: g[0].s, outE: g[g.length - 1].e, words: g }); g = []; };
  for (let i = 0; i < words.length; i++) {
    const w = words[i];
    const chars = g.map((x) => x.w.trim()).join(' ').length + w.w.trim().length;
    const crossesHook = g.length && g[0].s < hookEnd - 1e-3 && w.s >= hookEnd - 1e-3;
    if (g.length && (g.length >= 4 || chars > 20 || w.s - g[g.length - 1].e > 0.3 || crossesHook)) flush();
    g.push(w);
    if (/[.?!,]$/.test(w.w.trim())) flush();
  }
  flush();
  for (let i = 0; i < caps.length; i++) {
    const nx = caps[i + 1];
    caps[i].outE = nx ? Math.min(nx.outS, caps[i].outE + 0.5) : Math.min(duration, caps[i].outE + 0.5);
  }
  return { duration, segs, words, shots, caps, hookEnd };
}
