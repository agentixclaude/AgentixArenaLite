import { useEffect, useState } from 'react';
import Create from './views/Create';
import Projects from './views/Projects';
import Library from './views/Library';
import { listProjects } from './lib/db';
import { VERSION, RELEASED, WHATS_NEW } from './lib/version';

type Tab = 'create' | 'projects' | 'library';

const Icon = {
  create: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 16V4M6 10l6-6 6 6" /><path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" /></svg>,
  projects: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M3 9h18M8 4v5" /></svg>,
  library: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="9" rx="1.5" /><rect x="14" y="3" width="7" height="5" rx="1.5" /><rect x="14" y="12" width="7" height="9" rx="1.5" /><rect x="3" y="16" width="7" height="5" rx="1.5" /></svg>,
};

const getHash = (): Tab => (['create', 'projects', 'library'].includes(location.hash.slice(1)) ? (location.hash.slice(1) as Tab) : 'create');

export default function App() {
  const [tab, setTabState] = useState<Tab>(getHash());
  const [defaultPack, setDefaultPackState] = useState<string>(() => { try { return localStorage.getItem('aal.pack') || 'auto'; } catch { return 'auto'; } });
  const [defaultCap, setDefaultCapState] = useState<string>(() => { try { return localStorage.getItem('aal.cap') || 'auto'; } catch { return 'auto'; } });
  const [openId, setOpenId] = useState<string | null>(null);
  const [msg, setMsg] = useState('');
  const toast = (m: string) => { setMsg(m); window.setTimeout(() => setMsg((x) => (x === m ? '' : x)), 7000); };
  const [count, setCount] = useState(0);
  const supported = typeof window !== 'undefined' && 'VideoEncoder' in window && 'VideoDecoder' in window;

  const setTab = (t: Tab) => { setTabState(t); history.replaceState(null, '', '#' + t); };
  const setDefaultPack = (id: string) => { setDefaultPackState(id); try { localStorage.setItem('aal.pack', id); } catch { /* private mode */ } };
  const setDefaultCap = (id: string) => { setDefaultCapState(id); try { localStorage.setItem('aal.cap', id); } catch { /* private mode */ } };
  const refresh = () => listProjects().then((l) => setCount(l.length)).catch(() => {});

  useEffect(() => { refresh(); const h = () => setTabState(getHash()); addEventListener('hashchange', h); return () => removeEventListener('hashchange', h); }, []);

  return (
    <div className="app">
      <aside className="rail">
        <div className="brand">
          <svg className="brand-mark" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#2B2925" /><path d="M32 12 L52 50 H42 L32 30 L22 50 H12 Z" fill="#D97757" /><rect x="26" y="40" width="12" height="5" rx="1" fill="#4F7DF3" /></svg>
          <div>
            <div className="brand-name">Agentix Arena <span>Lite</span></div>
            <div className="brand-sub">AI reel editor</div>
          </div>
        </div>
        <button className={'nav' + (tab === 'create' ? ' on' : '')} onClick={() => setTab('create')}>{Icon.create}Upload video</button>
        <button className={'nav' + (tab === 'projects' ? ' on' : '')} onClick={() => setTab('projects')}>{Icon.projects}Projects<span className="num">{count || ''}</span></button>
        <button className={'nav' + (tab === 'library' ? ' on' : '')} onClick={() => setTab('library')}>{Icon.library}Library</button>
        <div className="ver">
          <div className="ver-row"><span className="ver-tag">v{VERSION}</span><span>Updated {RELEASED}</span></div>
          <details className="ver-new">
            <summary>What's new</summary>
            <ul>{WHATS_NEW.map((n) => <li key={n}>{n}</li>)}</ul>
          </details>
        </div>
      </aside>
      <main className="main">
        {!supported ? (
          <div className="unsupported page">
            <h1 className="h1">This browser can't edit video yet</h1>
            <p className="lede">Agentix Arena Lite needs WebCodecs. Open this page in Chrome or Edge on a desktop or laptop.</p>
          </div>
        ) : (
          <>
            <div style={{ display: tab === 'create' ? 'block' : 'none' }}>
              <Create defaultPack={defaultPack} defaultCap={defaultCap} openId={openId} onOpened={() => setOpenId(null)} onSaved={refresh} toast={toast} />
            </div>
            {tab === 'projects' && <Projects onOpen={(id) => { setOpenId(id); setTab('create'); }} onChange={refresh} />}
            {tab === 'library' && <Library current={defaultPack} currentCap={defaultCap} onPick={(id) => { setDefaultPack(id); toast('Default preset saved.'); }} onPickCap={(id) => { setDefaultCap(id); toast('Default caption template saved.'); }} onUse={(id) => { setDefaultPack(id); setTab('create'); }} />}
          </>
        )}
      </main>
      {msg && <div className="toast" onClick={() => setMsg('')}>{msg}</div>}
    </div>
  );
}
