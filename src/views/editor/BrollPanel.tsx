import { useRef, useState } from 'react';
import type { Edit, ShotEdit } from '../../lib/style';
import type { BrollAsset } from '../../lib/broll';
import Icon from '../../components/Icon';

interface Props {
  edit: Edit; edits: Record<string, ShotEdit>; brolls: BrollAsset[]; busy: string;
  onAdd: (files: File[]) => void; onRemove: (id: string) => void; onEdit: (key: string, patch: ShotEdit | null) => void;
  onAuto: () => void; onSeek: (t: number) => void;
}

const fmt = (t: number) => `${Math.floor(t / 60)}:${String(Math.round(t % 60)).padStart(2, '0')}`;

export default function BrollPanel({ edit, edits, brolls, busy, onAdd, onRemove, onEdit, onAuto, onSeek }: Props) {
  const inp = useRef<HTMLInputElement>(null);
  const [copied, setCopied] = useState('');
  const spots = edit.shots.filter((s) => s.hint?.pick || s.layout === 'broll');
  const copy = (k: string, txt: string) => { navigator.clipboard?.writeText(txt).then(() => { setCopied(k); setTimeout(() => setCopied(''), 1500); }).catch(() => {}); };
  return (
    <div className="broll">
      <div className="card-h" style={{ marginBottom: 8 }}>
        <div className="card-t">Your clips <span className="card-n">· {brolls.length}</span></div>
        <button className="btn btn-g btn-sm" onClick={() => inp.current?.click()} disabled={!!busy}><Icon name="upload" size={14} /> Add clips or photos</button>
        <input ref={inp} type="file" multiple accept="video/*,image/*,.mov,.mp4,.m4v,.webm" hidden onChange={(e) => { const f = [...(e.target.files ?? [])]; if (f.length) onAdd(f); e.target.value = ''; }} />
      </div>
      {busy && <div className="note">{busy}</div>}
      {brolls.length ? (
        <div className="bgrid">
          {brolls.map((b) => (
            <div key={b.id} className="bitem" title={b.name}>
              <div className="bthumb" style={{ backgroundImage: b.thumb ? `url(${b.thumb})` : undefined }}>
                <span className="pbadge">{b.kind === 'video' ? fmt(b.dur) : 'Photo'}</span>
                {!b.blob && <span className="pbadge warn">removed</span>}
              </div>
              <div className="bname">{b.name}</div>
              <button className="ibtn bdel" title="Remove" onClick={() => onRemove(b.id)}><Icon name="trash" size={14} /></button>
            </div>
          ))}
        </div>
      ) : <div className="hint">Drop in phone clips, screen recordings or AI shots. They stay on this computer.</div>}

      <div className="card-h" style={{ margin: '16px 0 8px' }}>
        <div className="card-t">B-roll spots <span className="card-n">· {spots.length}</span></div>
        <button className="btn btn-o btn-sm" disabled={!brolls.length} onClick={onAuto}><Icon name="wand" size={14} /> Auto-place</button>
      </div>
      <div className="spots">
        {spots.map((s) => {
          const e = edits[s.key] ?? {};
          return (
            <div key={s.key} className={'spot' + (s.layout === 'broll' ? ' on' : '')}>
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <button className="linkbtn" onClick={() => onSeek(s.outS + 0.02)}>{fmt(s.outS)} · {s.hint?.query ?? s.kw}</button>
                <select className="sel sm" style={{ width: 150 }} value={s.layout === 'broll' ? s.broll?.id ?? '' : ''} onChange={(ev) => {
                  const id = ev.target.value;
                  if (!id) onEdit(s.key, { ...e, layout: undefined, broll: undefined });
                  else onEdit(s.key, { ...e, layout: 'broll', broll: { id, mode: e.broll?.mode ?? 'full' } });
                }}>
                  <option value="">No B-roll</option>
                  {brolls.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>
              {s.hint && (
                <div className="prompt">
                  <span>{s.hint.prompt}</span>
                  <button className="ibtn" title="Copy prompt" onClick={() => copy(s.key, s.hint!.prompt)}><Icon name={copied === s.key ? 'check' : 'copy'} size={14} /></button>
                </div>
              )}
            </div>
          );
        })}
        {!spots.length && <div className="hint">No obvious B-roll spots in this script. Pick any shot in the Shots tab and set it to B-roll.</div>}
      </div>
      <div className="note" style={{ marginTop: 10 }}>Each spot has a ready prompt you can paste into an AI video tool, then add the result here.</div>
    </div>
  );
}
