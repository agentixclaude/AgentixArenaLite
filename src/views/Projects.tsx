import { useEffect, useState } from 'react';
import { listProjects, deleteProject, removeVideo, storageInfo, type ProjectMeta } from '../lib/db';
import { packById } from '../lib/packs';
import Icon from '../components/Icon';
import DeviceNote from '../components/DeviceNote';

const fmt = (t: number) => `${Math.floor(t / 60)}:${String(Math.round(t % 60)).padStart(2, '0')}`;
const gb = (b: number) => (b > 1073741824 ? `${(b / 1073741824).toFixed(1)} GB` : `${Math.round(b / 1048576)} MB`);
const ago = (ts: number) => {
  const s = (Date.now() - ts) / 1000;
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  return new Date(ts).toLocaleDateString();
};

export default function Projects({ onOpen, onChange }: { onOpen: (id: string) => void; onChange: () => void }) {
  const [list, setList] = useState<ProjectMeta[] | null>(null);
  const [confirm, setConfirm] = useState<string | null>(null);
  const [store, setStore] = useState<{ used: number; quota: number } | null>(null);
  const load = () => { listProjects().then(setList).catch(() => setList([])); storageInfo().then(setStore); };
  useEffect(() => { load(); }, []);

  const freeAll = async () => {
    for (const p of list ?? []) if (p.hasVideo) await removeVideo(p.id);
    load(); onChange();
  };
  const saved = (list ?? []).filter((p) => p.hasVideo);

  return (
    <div className="page">
      <div className="page-head">
        <h1 className="h1">Projects</h1>
        <DeviceNote />
      </div>
      <p className="lede">Every edit is saved in this browser. Videos stay on your computer — nothing is uploaded.</p>
      {store && (
        <div className="storebar">
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <span><Icon name="chart" size={15} /> Browser storage: <b>{gb(store.used)}</b> of {gb(store.quota)}</span>
            {saved.length > 0 && <button className="btn btn-g btn-sm" onClick={freeAll}>Free up space ({saved.length} video{saved.length > 1 ? 's' : ''})</button>}
          </div>
          <div className="bar" style={{ height: 6 }}><i style={{ width: `${Math.min(100, (store.used / Math.max(1, store.quota)) * 100)}%` }} /></div>
          <div className="note" style={{ marginTop: 6 }}>Freeing space removes the saved copy of each video but keeps the edit. Re-attach the original file to keep working. When storage fills up, the oldest videos are removed automatically.</div>
        </div>
      )}
      {list === null ? null : list.length === 0 ? (
        <div className="empty"><h3>No projects yet</h3>Upload a video and it will show up here.</div>
      ) : (
        <div className="pgrid">
          {list.map((p) => {
            const pk = packById(p.packId === 'auto' ? p.autoPackId : p.packId);
            return (
              <div key={p.id} className="pcard">
                <div className="pthumb" style={{ backgroundImage: p.thumb ? `url(${p.thumb})` : undefined }} onClick={() => onOpen(p.id)}>
                  <span className="pbadge">{fmt(p.srcDur)} · {p.aspect}</span>
                  {!p.hasVideo && <span className="pbadge warn">video removed</span>}
                </div>
                <div className="pbody">
                  <div className="pname" title={p.name}>{p.name}</div>
                  <div className="pmeta row"><Icon name={pk.icon} size={13} /> {pk.subject} · edited {ago(p.updated)}{p.exported ? ' · exported' : ''}</div>
                  <div className="pacts">
                    {confirm === p.id ? (
                      <>
                        <button className="btn btn-sm" style={{ background: '#5a3127', color: '#ffd9cf' }} onClick={async () => { await deleteProject(p.id); setConfirm(null); load(); onChange(); }}>Delete</button>
                        <button className="btn btn-g btn-sm" onClick={() => setConfirm(null)}>Keep</button>
                      </>
                    ) : (
                      <>
                        <button className="btn btn-o btn-sm" onClick={() => onOpen(p.id)}>Open</button>
                        <button className="btn btn-g btn-sm" onClick={() => setConfirm(p.id)}>Delete</button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
