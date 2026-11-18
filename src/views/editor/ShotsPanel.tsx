import type { LayoutKind } from '../../lib/packs';
import { CARD_KINDS, type Edit, type ShotEdit, type CardKind } from '../../lib/style';
import type { BrollAsset } from '../../lib/broll';
import { LAYOUT_NAMES } from '../Player';
import Icon from '../../components/Icon';

interface Props {
  edit: Edit; edits: Record<string, ShotEdit>; brolls: BrollAsset[]; now: number;
  onEdit: (key: string, patch: ShotEdit | null) => void; onSeek: (t: number) => void; segNote: string; cutout: boolean;
}

const fmt = (t: number) => `${Math.floor(t / 60)}:${(t % 60).toFixed(1).padStart(4, '0')}`;
const LAYOUTS: LayoutKind[] = ['full', 'punch', 'behind', 'split', 'circle', 'arch', 'polaroid', 'band', 'frame', 'sticker', 'duotone', 'card', 'broll'];
const CUT: Partial<Record<LayoutKind, string>> = { behind: 'needs cut-out', frame: 'head breaks out with cut-out', sticker: 'needs cut-out' };

function textOf(s: Edit['shots'][number]) {
  if (s.layout === 'behind') return s.behind ?? '';
  const m = s.mg;
  if (!m) return '';
  if (m.kind === 'hook' || m.kind === 'keyword' || m.kind === 'quote' || m.kind === 'cta') return m.text;
  if (m.kind === 'list') return m.title;
  if (m.kind === 'stat') return m.label;
  if (m.kind === 'word') return m.small ? (m.order === 'big-small' ? `${m.big} / ${m.small}` : `${m.small} / ${m.big}`) : m.big;
  return '';
}

export default function ShotsPanel({ edit, edits, brolls, now, onEdit, onSeek, segNote, cutout }: Props) {
  return (
    <div className="shots">
      {segNote && <div className="note" style={{ marginBottom: 8 }}>{segNote}</div>}
      {edit.shots.map((s, i) => {
        const e = edits[s.key] ?? {};
        const on = now >= s.outS && now < s.outE;
        const txt = textOf(s);
        const canText = !!txt || s.layout === 'behind';
        return (
          <div key={s.key} className={'shot' + (on ? ' now' : '')}>
            <div className="shot-h">
              <button className="shot-n" onClick={() => onSeek(s.outS + 0.02)} title="Jump here">{String(i + 1).padStart(2, '0')}</button>
              <span className="shot-t" onClick={() => onSeek(s.outS + 0.02)}>{fmt(s.outS)}–{fmt(s.outE)}</span>
              <select className="sel sm" value={e.layout ?? ''} onChange={(ev) => {
                const v = ev.target.value as LayoutKind | '';
                if (!v) { onEdit(s.key, { ...e, layout: undefined, broll: v === '' ? e.broll : undefined }); return; }
                if (v === 'broll' && !brolls.length) return;
                onEdit(s.key, { ...e, layout: v, broll: v === 'broll' ? (e.broll ?? { id: brolls[0].id, mode: 'full' }) : e.broll });
              }}>
                <option value="">Auto · {LAYOUT_NAMES[s.auto]}</option>
                {LAYOUTS.map((l) => <option key={l} value={l} disabled={l === 'broll' && !brolls.length}>{LAYOUT_NAMES[l]}{l === 'broll' && !brolls.length ? ' (add clips first)' : !cutout && CUT[l] ? ` (${CUT[l]})` : ''}</option>)}
              </select>
              {(e.layout || e.text || e.card || e.broll) && <button className="ibtn" title="Back to auto" onClick={() => onEdit(s.key, null)}><Icon name="reset" size={14} /></button>}
            </div>
            <div className="shot-b">
              <span className="shot-say">“{s.text.length > 90 ? s.text.slice(0, 88) + '…' : s.text}”</span>
              {canText && (
                <input className="tp-in" key={s.key + txt} defaultValue={e.text ?? ''} placeholder={s.layout === 'behind' ? `Word behind: ${txt}` : s.mg?.kind === 'word' || (s.mg?.kind === 'hook' && s.mg.style === 'lockup') ? `small / BIG: ${txt}` : `Graphic text: ${txt}`}
                  onBlur={(ev) => { const v = ev.target.value.trim(); if (v !== (e.text ?? '')) onEdit(s.key, { ...e, text: v || undefined }); }}
                  onKeyDown={(ev) => { if (ev.key === 'Enter') (ev.target as HTMLInputElement).blur(); }} />
              )}
              {s.layout === 'card' && (
                <div className="seg small wrap">
                  {CARD_KINDS.map((c) => <button key={c.id} className={s.card === c.id ? 'on' : ''} onClick={() => onEdit(s.key, { ...e, card: c.id as CardKind })}>{c.name}</button>)}
                </div>
              )}
              {s.layout === 'broll' && (
                <div className="row">
                  <select className="sel sm" value={s.broll?.id ?? ''} onChange={(ev) => onEdit(s.key, { ...e, layout: 'broll', broll: { id: ev.target.value, mode: s.broll?.mode ?? 'full' } })}>
                    {brolls.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                  <div className="seg small" style={{ width: 150 }}>
                    {(['full', 'split'] as const).map((m) => <button key={m} className={s.broll?.mode === m ? 'on' : ''} onClick={() => onEdit(s.key, { ...e, layout: 'broll', broll: { id: s.broll?.id ?? brolls[0]?.id, mode: m } })}>{m === 'full' ? 'Full' : 'Split'}</button>)}
                  </div>
                </div>
              )}
              {s.hint?.pick && s.layout !== 'broll' && <span className="shot-tag"><Icon name="film" size={12} /> B-roll spot · {s.hint.query}</span>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
