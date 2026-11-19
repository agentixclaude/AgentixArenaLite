import { useEffect, useMemo, useState } from 'react';
import { listProjects, loadProject, type ProjectMeta } from '../../lib/db';
import { buildPlan, loadPlan, savePlan, planText, sceneById, LAYERS, tc, type Plan, type SceneId, type TextLayer } from '../../lib/plan';
import Icon from '../../components/Icon';
import ProFlow from './ProFlow';

const ROLE: Record<string, string> = { announce: 'Announce · stay on face', describe: 'Describe · show it', hook: 'Hook · strong visual', ending: 'Ending · statement' };

export default function PlanDoc({ toast, onLite }: { toast: (m: string) => void; onLite: () => void }) {
  const [projects, setProjects] = useState<ProjectMeta[] | null>(null);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [thumb, setThumb] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => { listProjects().then(setProjects).catch(() => setProjects([])); }, []);

  const open = async (m: ProjectMeta) => {
    setBusy(true);
    try {
      setThumb(m.thumb);
      const saved = await loadPlan(m.id);
      if (saved) { setPlan(saved); return; }
      const p = await loadProject(m.id);
      if (!p || !p.words?.length) { toast('This project has no transcript yet. Open it in Lite first so captions are made.'); return; }
      const fresh = buildPlan(p.id, p.name, p.words);
      await savePlan(fresh);
      setPlan(fresh);
    } finally { setBusy(false); }
  };

  const update = (fn: (p: Plan) => void) => {
    if (!plan) return;
    const next: Plan = { ...plan, beats: plan.beats.map((b) => ({ ...b })) };
    fn(next);
    next.approved = undefined;
    setPlan(next);
    savePlan(next).catch(() => toast('Could not save the plan in this browser.'));
  };
  const pick = (n: number, id: SceneId) => update((p) => { const b = p.beats[n - 1]; b.pick = id; if (id === 'aroll') b.layer = 'normal'; else if (b.layer === 'normal') b.layer = 'graphics'; });
  const layer = (n: number, l: TextLayer) => update((p) => { p.beats[n - 1].layer = l; });
  const note = (n: number, t: string) => update((p) => { p.beats[n - 1].note = t; });

  const stats = useMemo(() => {
    if (!plan) return null;
    const total = plan.beats.length;
    const visuals = plan.beats.filter((b) => b.pick !== 'aroll').length;
    const repeats = plan.beats.filter((b, i) => i > 0 && b.pick !== 'aroll' && b.pick === plan.beats[i - 1].pick).length;
    const firstVisual = plan.beats.find((b) => b.pick !== 'aroll');
    return { total, visuals, repeats, hookOk: !!firstVisual && firstVisual.s <= 4.5 };
  }, [plan]);

  const copy = async () => {
    if (!plan) return;
    try { await navigator.clipboard.writeText(planText(plan)); toast('Plan copied. Paste it into the Claude chat for this edit.'); } catch { toast('Copy blocked by the browser.'); }
  };
  const approve = async () => {
    if (!plan) return;
    const next = { ...plan, approved: Date.now() };
    setPlan(next); await savePlan(next);
    try { await navigator.clipboard.writeText(planText(next)); } catch { /* ignore */ }
    toast('Plan approved and copied. Nothing renders before this step.');
  };
  const rebuild = async () => {
    if (!plan) return;
    const p = await loadProject(plan.projectId);
    if (!p) return;
    const fresh = buildPlan(p.id, p.name, p.words);
    setPlan(fresh); await savePlan(fresh); toast('Suggestions rebuilt from the transcript.');
  };

  if (!plan) {
    return (
      <div className="page">
        <ProFlow on="plan" />
        <div className="kicker">Step 02 · your 15-minute pass</div>
        <h1 className="h1">Plan every beat <span className="hl">before anything renders.</span></h1>
        <p className="lede">Pick a project. Arena splits its transcript into beats and suggests three scene designs for each one. You choose a design and a text layer per beat, then approve.</p>
        {projects === null ? <p className="note">Loading projects…</p> : projects.length === 0 ? (
          <div className="card"><p className="note" style={{ marginTop: 0 }}>No projects yet. Upload a video in Lite first: its transcript feeds the plan.</p><button className="btn btn-o" onClick={onLite}><Icon name="film" size={16} /> Go to Lite upload</button></div>
        ) : (
          <div className="pick-proj">
            {projects.map((m) => (
              <button key={m.id} onClick={() => open(m)} disabled={busy}>
                {m.thumb ? <img src={m.thumb} alt="" /> : <div style={{ aspectRatio: '16 / 10', background: 'var(--bg)' }} />}
                <div><b>{m.name}</b><span>{Math.round(m.srcDur)} s · {m.aspect}</span></div>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  const done = plan.beats.length;
  return (
    <div className="page">
      <ProFlow on="plan" />
      <div className="page-head">
        <div>
          <div className="kicker">Plan Doc · {plan.approved ? 'approved' : 'draft'}</div>
          <h1 className="h1">{plan.projectName}</h1>
        </div>
        <div className="row" style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button className="btn btn-g" onClick={() => setPlan(null)}>Projects</button>
          <button className="btn btn-g" onClick={copy}><Icon name="copy" size={16} /> Copy plan</button>
          <button className="btn btn-o" onClick={approve}><Icon name="check" size={16} /> Approve plan</button>
        </div>
      </div>
      <p className="lede">Announce a new idea = stay on the face. Describe it = show it. Graphics caption and Typography hide the Normal caption for that beat (it stays on its track).</p>
      <div className="plan">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {plan.beats.map((b) => (
            <section key={b.n} className={'beat' + (b.note ? ' done' : '')}>
              <div className="beat-top">
                <div><span className="beat-n">Beat {b.n}</span><span className="beat-tc">{tc(b.s)} – {tc(b.e)}</span></div>
                <span className={'beat-role ' + b.role}>{ROLE[b.role]}</span>
              </div>
              <div className="beat-line">“{b.text}”</div>
              <div className="opt3" role="radiogroup" aria-label={`Design for beat ${b.n}`}>
                {b.options.map((id, i) => {
                  const s = sceneById(id);
                  return (
                    <button key={id} role="radio" aria-checked={b.pick === id} className={'optc' + (b.pick === id ? ' on' : '')} onClick={() => pick(b.n, id)}>
                      <small>{'ABC'[i]} · {s.code}</small><b>{s.name}</b><span>{s.build}</span>
                    </button>
                  );
                })}
              </div>
              <div className="chips" role="radiogroup" aria-label={`Text layer for beat ${b.n}`}>
                <span className="chip-l">Text layer</span>
                {LAYERS.map((l) => (
                  <button key={l.id} role="radio" aria-checked={b.layer === l.id} className={'chip' + (b.layer === l.id ? ' on' : '')} onClick={() => layer(b.n, l.id)} title={l.hint}>{l.name}</button>
                ))}
              </div>
              <label className="field">Your note
                <input className="input" value={b.note} placeholder="e.g. hold 1 s longer, the line steps up on every “up”" onChange={(e) => note(b.n, e.target.value)} />
              </label>
            </section>
          ))}
        </div>
        <aside className="plan-side">
          {thumb && <img src={thumb} alt="" style={{ width: '100%', borderRadius: 20, border: '1px solid var(--line)' }} />}
          {stats && (
            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <b>Plan check</b>
              <div className="note" style={{ display: 'flex', justifyContent: 'space-between' }}><span>Visual beats</span><b style={{ color: 'var(--ink)' }}>{stats.visuals} of {done}</b></div>
              <div className="meter"><i style={{ width: `${Math.round((stats.visuals / Math.max(1, done)) * 100)}%` }} /></div>
              <div className="note">{stats.hookOk ? '✓ Strong visual inside the first 4 s' : '⚠ No visual in the first 4 s: pick one on beat 2'}</div>
              <div className="note">{stats.repeats === 0 ? '✓ No scene type twice in a row' : `⚠ ${stats.repeats} beat(s) repeat the previous scene type`}</div>
              <div className="note">{plan.beats[plan.beats.length - 1]?.pick === 'quote' ? '✓ Ends on a statement card' : 'Tip: end on a Quote card'}</div>
            </div>
          )}
          <div className="card note">Approval gate: nothing renders and no credits are spent until the plan is approved. The approved plan is copied for Claude, which builds the draft on the team Mac.</div>
          <button className="btn btn-g btn-sm" onClick={rebuild}>Rebuild suggestions from transcript</button>
        </aside>
      </div>
    </div>
  );
}
