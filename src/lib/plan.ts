// Pro Plan Doc: turn a project's transcript into beats, suggest three scene designs
// per beat from the scene library, and pick a text layer per beat.
// Rules: claude/ugentic-graphics-rules.md §7 (text layers) and §9 (editing logic).
import { get, set } from 'idb-keyval';
import type { Word } from './style';

export type SceneId = 'aroll' | 'broll' | 'painting' | 'linetext' | 'lineillus' | 'quote' | 'centre' | 'side' | 'object' | 'graph';
export type TextLayer = 'normal' | 'graphics' | 'typo';
export type BeatRole = 'announce' | 'describe' | 'hook' | 'ending';

export interface Scene { id: SceneId; code: string; name: string; build: string; use: string; word: string; bg: string; ink: string }

/** The 10 Minimal Paper scene types (REF G9X) plus A-roll. */
export const SCENES: Scene[] = [
  { id: 'aroll', code: 'P1', name: 'A-roll + captions', build: 'Speaker on screen, Normal caption.', use: 'A new idea is announced', word: 'focus', bg: '#0e0f10', ink: '#f5f6f8' },
  { id: 'broll', code: 'P2', name: 'B-roll + text', build: 'Literal B-roll, paper texture, darkened + blurred edges, text in the clean area.', use: 'Physical or action lines', word: 'against', bg: '#101214', ink: '#f5f6f8' },
  { id: 'painting', code: 'P3', name: 'Painting + text', build: 'Classical painting, paint + paper texture, slide-in, text around the subject.', use: 'Story, emotion', word: 'San Diego', bg: '#3b2e22', ink: '#f3ebdd' },
  { id: 'linetext', code: 'P4', name: 'Line + text', build: 'One accent line interrupted by text, camera tracks the line.', use: 'Linking 2–3 ideas', word: 'courage', bg: '#e9e6de', ink: '#1e3fa8' },
  { id: 'lineillus', code: 'P5', name: 'Line + illustration', build: 'Line leads into illustrations, dot marks each object, camera pans.', use: 'Steps, phases, progress', word: 'the rock', bg: '#0e0f10', ink: '#f5f6f8' },
  { id: 'quote', code: 'P6', name: 'Quote card', build: 'Rough paper, quote marks, centred type.', use: 'Big statement, ending', word: 'I can deal', bg: '#2346c9', ink: '#ffffff' },
  { id: 'centre', code: 'P7', name: 'Centre illustration', build: 'Rough painted illustration in the lower half, text around it.', use: 'Main idea of a section', word: 'meaningful', bg: '#e9e6de', ink: '#1e3fa8' },
  { id: 'side', code: 'P8', name: 'Side illustration + text', build: 'Character or half-circle one side (cloth texture), text the other.', use: 'Two elements at once', word: 'same job', bg: '#e9e6de', ink: '#1e3fa8' },
  { id: 'object', code: 'P9', name: 'Object call-out', build: 'One element on paper, text around it, rough reveal.', use: 'Proof, photo, prop', word: 'French horn', bg: '#e9e6de', ink: '#1e3fa8' },
  { id: 'graph', code: 'P10', name: 'Graph', build: 'Dark grid, accent ball draws the line, camera follows; steps land on the spoken words.', use: 'Numbers, growth, change', word: 'up · up · up', bg: '#0e0f10', ink: '#f5f6f8' },
];
export const sceneById = (id: SceneId) => SCENES.find((s) => s.id === id)!;

export const LAYERS: { id: TextLayer; name: string; hint: string }[] = [
  { id: 'normal', name: 'Normal caption', hint: 'Box or single line. Shown on A-roll.' },
  { id: 'graphics', name: 'Graphics caption', hint: 'Key word big, bold and centred. Normal caption hidden here, kept on its track.' },
  { id: 'typo', name: 'Typography', hint: 'Main-screen kinetic type. Normal caption hidden here, kept on its track.' },
];

export interface Beat { n: number; s: number; e: number; text: string; role: BeatRole; options: SceneId[]; pick: SceneId; layer: TextLayer; note: string }
export interface Plan { projectId: string; projectName: string; created: number; updated: number; approved?: number; beats: Beat[] }

const RX = {
  announce: /^(so|now|here'?s|there (are|is)|the (first|second|third|next|last|big|real)|let me|let's|number|one thing|the reason|what if|why|how)\b|\?$/i,
  number: /\b(\d[\d,.]*%?|percent|million|billion|thousand|double|triple|half|grow|growth|up|down|increase|decrease|more|less|faster|slower|years?|months?|days?)\b/i,
  story: /\b(i|i'm|i've|my|me|we|our|remember|love|felt|feel|story|once|when i)\b/i,
  steps: /\b(first|then|next|after|finally|step|phase|stage|level|start|end)\b/i,
  link: /\b(but|because|so that|which means|and that|instead|however|while)\b/i,
  idea: /\b(mind|brain|think|idea|meaning|purpose|happiness|life|truth|fear|success)\b/i,
  object: /\b(this|that|look at|photo|book|phone|app|tool|website|product)\b/i,
  two: /\b(vs|versus|both|either|two|compare|between|other)\b/i,
};

function score(text: string, role: BeatRole): [SceneId, number][] {
  const sc: Record<SceneId, number> = { aroll: 0, broll: 1, painting: 0, linetext: 0, lineillus: 0, quote: 0, centre: 0, side: 0, object: 0, graph: 0 };
  if (role === 'announce') sc.aroll += 5;
  if (role === 'ending') { sc.quote += 5; sc.aroll += 1; }
  if (RX.number.test(text)) sc.graph += 3;
  if (RX.story.test(text)) sc.painting += 2.5;
  if (RX.steps.test(text)) sc.lineillus += 3;
  if (RX.link.test(text)) sc.linetext += 2.5;
  if (RX.idea.test(text)) sc.centre += 2.5;
  if (RX.object.test(text)) sc.object += 1.5;
  if (RX.two.test(text)) sc.side += 2.5;
  if (role === 'hook') { sc.graph += 1; sc.quote += 1; sc.broll += 1; sc.aroll -= 2; }
  return (Object.entries(sc) as [SceneId, number][]).sort((a, b) => b[1] - a[1]);
}

/** Split words into beats: sentence ends or pauses > 0.55 s, 2–7 s long. */
export function splitBeats(words: Word[]): { s: number; e: number; text: string }[] {
  const out: { s: number; e: number; text: string }[] = [];
  let cur: Word[] = [];
  const flush = () => { if (cur.length) { out.push({ s: cur[0].s, e: cur[cur.length - 1].e, text: cur.map((w) => w.w).join(' ').replace(/\s+([,.!?;:])/g, '$1').trim() }); cur = []; } };
  for (let i = 0; i < words.length; i++) {
    const w = words[i];
    cur.push(w);
    const len = w.e - cur[0].s;
    const gap = i + 1 < words.length ? words[i + 1].s - w.e : 1;
    const end = /[.!?]$/.test(w.w.trim());
    if ((end && len > 1.6) || gap > 0.55 || len > 7) flush();
  }
  flush();
  // merge very short fragments into the previous beat
  const merged: typeof out = [];
  for (const b of out) {
    const prev = merged[merged.length - 1];
    if (prev && b.e - b.s < 1.1) { prev.e = b.e; prev.text += ' ' + b.text; } else merged.push({ ...b });
  }
  return merged;
}

export function buildPlan(projectId: string, projectName: string, words: Word[]): Plan {
  const raw = splitBeats(words);
  const beats: Beat[] = [];
  raw.forEach((b, i) => {
    const role: BeatRole = i === raw.length - 1 && raw.length > 2 ? 'ending' : i === 1 ? 'hook' : RX.announce.test(b.text) || i === 0 ? 'announce' : 'describe';
    const ranked = score(b.text, role).map(([id]) => id);
    // scene balance: never the same scene type as the previous beat's pick (A-roll may repeat after a visual)
    const prev = beats[beats.length - 1]?.pick;
    const opts = ranked.filter((id) => id !== prev || id === 'aroll').slice(0, 3);
    const pick = opts[0];
    const layer: TextLayer = pick === 'aroll' ? 'normal' : role === 'hook' || pick === 'quote' ? 'typo' : 'graphics';
    beats.push({ n: i + 1, s: b.s, e: b.e, text: b.text, role, options: opts, pick, layer, note: '' });
  });
  const now = Date.now();
  return { projectId, projectName, created: now, updated: now, beats };
}

export const tc = (t: number) => `${String(Math.floor(t / 60)).padStart(2, '0')}:${(t % 60).toFixed(1).padStart(4, '0')}`;

export async function loadPlan(projectId: string): Promise<Plan | undefined> { return get('plan:' + projectId); }
export async function savePlan(p: Plan) { p.updated = Date.now(); await set('plan:' + p.projectId, p); }

/** Plain-text plan for Claude / the Mac backend ("Copy plan"). */
export function planText(p: Plan): string {
  const lines = [`AGENTIX ARENA PRO — EDIT PLAN · ${p.projectName}`, `Rules: ugentic-graphics-rules §7 text layers, §9 editing logic. ${p.approved ? 'APPROVED ' + new Date(p.approved).toLocaleString() : 'DRAFT'}`, ''];
  for (const b of p.beats) {
    const s = sceneById(b.pick);
    lines.push(`Beat ${b.n} [${tc(b.s)}–${tc(b.e)}] ${b.role.toUpperCase()}`);
    lines.push(`  "${b.text}"`);
    lines.push(`  Scene: ${s.code} ${s.name} · Text layer: ${LAYERS.find((l) => l.id === b.layer)!.name}${b.layer !== 'normal' ? ' (Normal caption hidden, kept)' : ''}`);
    if (b.note.trim()) lines.push(`  Note: ${b.note.trim()}`);
  }
  return lines.join('\n');
}
