import { useEffect, useState } from 'react';
import { get, set } from 'idb-keyval';
import { SCENES } from '../../lib/plan';
import Icon from '../../components/Icon';
import ProFlow from './ProFlow';

interface Training { name: string; refs: string[]; board: string; notes: string; requested?: number }
const EMPTY: Training = { name: '', refs: ['', '', ''], board: '', notes: '' };

const requestText = (t: Training) => [
  `AGENTIX ARENA PRO — TRAIN STYLE: ${t.name || '(unnamed)'}`,
  `References (${t.refs.filter(Boolean).length}):`, ...t.refs.filter(Boolean).map((r, i) => `  ${i + 1}. ${r}`),
  `Breakdown board: ${t.board || '—'}`,
  t.notes ? `Notes: ${t.notes}` : '',
  '',
  'Do: word-by-word transcript + frame-by-frame breakdown of every reference. Study (a) where each animation sits against the script, (b) how the design is composed, (c) the animation logic and timing.',
  'Deliver: style skill (rules, sizes, fonts, textures, text layers), scene library (one folder per animation: design ref + keyframe sheet), SFX map, Registry entry.',
].filter((l) => l !== '').join('\n');

export default function StyleTrainer({ toast }: { toast: (m: string) => void }) {
  const [t, setT] = useState<Training>(EMPTY);
  useEffect(() => { get('pro:training').then((v) => v && setT(v as Training)).catch(() => {}); }, []);
  const save = (n: Training) => { setT(n); set('pro:training', n).catch(() => {}); };
  const setRef = (i: number, v: string) => save({ ...t, refs: t.refs.map((r, j) => (j === i ? v : r)) });
  const filled = t.refs.filter((r) => r.trim()).length;

  const request = async () => {
    if (!t.name.trim() || filled === 0) { toast('Name the style and add at least one reference.'); return; }
    const n = { ...t, requested: Date.now() };
    save(n);
    try { await navigator.clipboard.writeText(requestText(n)); toast('Training request copied. Paste it into Claude in this project.'); } catch { toast('Copy blocked by the browser.'); }
  };

  return (
    <div className="page">
      <ProFlow on="trainer" />
      <div className="kicker">Step 01 · teach Arena a look once, reuse it forever</div>
      <h1 className="h1">20 references in. <span className="hl">A style out.</span></h1>
      <p className="lede">Add the reference videos and your breakdown board. Claude studies where each animation sits in the script, how it is designed and how it moves, then saves a style and a scene library the Plan Doc can suggest from.</p>

      <div className="grid3" style={{ marginBottom: 28 }}>
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <b>1 · Reference videos</b>
          <label className="field">Style name<input className="input" value={t.name} placeholder="e.g. Minimal Paper" onChange={(e) => save({ ...t, name: e.target.value })} /></label>
          <div className="reflist">
            {t.refs.map((r, i) => (
              <div key={i} className="refrow">
                <input className="input" aria-label={`Reference ${i + 1}`} value={r} placeholder="YouTube / Instagram / Drive link" onChange={(e) => setRef(i, e.target.value)} />
                {t.refs.length > 1 && <button className="btn btn-g btn-sm" aria-label={`Remove reference ${i + 1}`} onClick={() => save({ ...t, refs: t.refs.filter((_, j) => j !== i) })}><Icon name="trash" size={14} /></button>}
              </div>
            ))}
          </div>
          {t.refs.length < 20 && <button className="btn btn-g btn-sm" onClick={() => save({ ...t, refs: [...t.refs, ''] })}>Add reference ({filled}/20)</button>}
        </div>
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <b>2 · Breakdown board</b>
          <label className="field">Figma / moodboard link<input className="input" type="url" value={t.board} placeholder="https://figma.com/board/…" onChange={(e) => save({ ...t, board: e.target.value })} /></label>
          <label className="field">Notes for Claude<textarea className="input" value={t.notes} placeholder="What makes this style work, what to avoid…" onChange={(e) => save({ ...t, notes: e.target.value })} /></label>
          <p className="note" style={{ margin: 0 }}>Screenshot about 100+ scenes and group them by scene type. Videos teach the logic; the board teaches the design.</p>
        </div>
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <b>3 · Output</b>
          <div className="note">Style skill: rules, sizes, fonts, textures, text layers</div>
          <div className="note">Scene library: one folder per animation, design ref + keyframe sheet</div>
          <div className="note">SFX map + Registry entry</div>
          <button className="btn btn-o" style={{ marginTop: 'auto' }} onClick={request}><Icon name="wand" size={16} /> Copy training request</button>
          {t.requested && <p className="note" style={{ margin: 0 }}>Requested {new Date(t.requested).toLocaleString()}</p>}
        </div>
      </div>

      <div className="page-head" style={{ marginBottom: 14 }}>
        <h2 className="h1" style={{ fontSize: 22 }}>Scene library · Minimal Paper</h2>
        <span className="note">Feeds the A/B/C picks in the Plan Doc</span>
      </div>
      <div className="grid5">
        {SCENES.map((s) => (
          <div key={s.id} className="scene">
            <div className="scene-t" style={{ background: s.bg, color: s.ink }}>{s.word}</div>
            <div className="scene-b"><small>{s.code}</small><b>{s.name}</b><span>{s.use}</span></div>
          </div>
        ))}
      </div>
    </div>
  );
}
