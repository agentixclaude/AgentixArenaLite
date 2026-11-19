import { useEffect, useState } from 'react';
import Create from './views/Create';
import Projects from './views/Projects';
import Library from './views/Library';
import { listProjects } from './lib/db';
import { VERSION, RELEASED, WHATS_NEW } from './lib/version';
import { currentUser, onAuthChange, signOut, type ProUser } from './lib/auth';
import ProLogin from './views/pro/ProLogin';
import PlanDoc from './views/pro/PlanDoc';
import StyleTrainer from './views/pro/StyleTrainer';

type Tab = 'create' | 'projects' | 'library';
type ProTab = 'plan' | 'trainer';
type Mode = 'lite' | 'pro';

const Icon = {
  create: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 16V4M6 10l6-6 6 6" /><path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" /></svg>,
  projects: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M3 9h18M8 4v5" /></svg>,
  plan: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="3" width="16" height="18" rx="2" /><path d="M8 8h8M8 12h8M8 16h5" /></svg>,
  trainer: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.4 6.8 19.1l1-5.8L3.5 9.2l5.9-.9z" /></svg>,
  lock: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></svg>,
  library: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="9" rx="1.5" /><rect x="14" y="3" width="7" height="5" rx="1.5" /><rect x="14" y="12" width="7" height="9" rx="1.5" /><rect x="3" y="16" width="7" height="5" rx="1.5" /></svg>,
};

const LITE_TABS = ['create', 'projects', 'library'];
const getHash = (): Tab => (LITE_TABS.includes(location.hash.slice(1)) ? (location.hash.slice(1) as Tab) : 'create');
const getMode = (): Mode => (location.hash.startsWith('#pro') ? 'pro' : 'lite');
const getProTab = (): ProTab => (location.hash === '#pro/trainer' ? 'trainer' : 'plan');

export default function App() {
  const [tab, setTabState] = useState<Tab>(getHash());
  const [mode, setModeState] = useState<Mode>(getMode());
  const [proTab, setProTabState] = useState<ProTab>(getProTab());
  const [user, setUser] = useState<ProUser | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [defaultPack, setDefaultPackState] = useState<string>(() => { try { return localStorage.getItem('aal.pack') || 'auto'; } catch { return 'auto'; } });
  const [defaultCap, setDefaultCapState] = useState<string>(() => { try { return localStorage.getItem('aal.cap') || 'auto'; } catch { return 'auto'; } });
  const [openId, setOpenId] = useState<string | null>(null);
  const [msg, setMsg] = useState('');
  const toast = (m: string) => { setMsg(m); window.setTimeout(() => setMsg((x) => (x === m ? '' : x)), 7000); };
  const [count, setCount] = useState(0);
  const supported = typeof window !== 'undefined' && 'VideoEncoder' in window && 'VideoDecoder' in window;

  const setTab = (t: Tab) => { setTabState(t); setModeState('lite'); history.replaceState(null, '', '#' + t); };
  const setProTab = (t: ProTab) => { setProTabState(t); setModeState('pro'); history.replaceState(null, '', '#pro/' + t); };
  const setMode = (m: Mode) => (m === 'lite' ? setTab(tab) : setProTab(proTab));
  const logout = async () => { await signOut(); setUser(null); };
  const setDefaultPack = (id: string) => { setDefaultPackState(id); try { localStorage.setItem('aal.pack', id); } catch { /* private mode */ } };
  const setDefaultCap = (id: string) => { setDefaultCapState(id); try { localStorage.setItem('aal.cap', id); } catch { /* private mode */ } };
  const refresh = () => listProjects().then((l) => setCount(l.length)).catch(() => {});

  useEffect(() => {
    refresh();
    const h = () => { setModeState(getMode()); if (getMode() === 'pro') setProTabState(getProTab()); else setTabState(getHash()); };
    addEventListener('hashchange', h);
    return () => removeEventListener('hashchange', h);
  }, []);
  useEffect(() => {
    currentUser().then((u) => { setUser(u); setAuthReady(true); }).catch(() => setAuthReady(true));
    return onAuthChange((u) => setUser(u));
  }, []);
  const pro = mode === 'pro';
  const proOpen = pro && !!user;

  return (
    <div className="app">
      <aside className="rail">
        <div className="brand">
          <svg className="brand-mark" viewBox="0 0 64 64" aria-hidden="true"><rect width="64" height="64" rx="16" fill="#DBFF4F" /><path d="M32 13 L51 50 H42 L32 30 L22 50 H13 Z" fill="#090B0E" /><rect x="26" y="40" width="12" height="5" rx="1.5" fill="#090B0E" /></svg>
          <div>
            <div className="brand-name">Agentix Arena <span>Hub</span></div>
            <div className="brand-sub">AI reel editor</div>
          </div>
        </div>
        <div className="mode" role="group" aria-label="Mode">
          <button className={mode === 'lite' ? 'on' : ''} aria-pressed={mode === 'lite'} onClick={() => setMode('lite')}>Lite</button>
          <button className={mode === 'pro' ? 'on' : ''} aria-pressed={mode === 'pro'} onClick={() => setMode('pro')}>Pro{!user && Icon.lock}</button>
        </div>
        {!pro ? (
          <>
            <button className={'nav' + (tab === 'create' ? ' on' : '')} onClick={() => setTab('create')}>{Icon.create}Upload video</button>
            <button className={'nav' + (tab === 'projects' ? ' on' : '')} onClick={() => setTab('projects')}>{Icon.projects}Projects<span className="num">{count || ''}</span></button>
            <button className={'nav' + (tab === 'library' ? ' on' : '')} onClick={() => setTab('library')}>{Icon.library}Library</button>
          </>
        ) : (
          <>
            <button className={'nav' + (proTab === 'trainer' ? ' on' : '')} onClick={() => setProTab('trainer')} disabled={!user}>{Icon.trainer}Style Trainer</button>
            <button className={'nav' + (proTab === 'plan' ? ' on' : '')} onClick={() => setProTab('plan')} disabled={!user}>{Icon.plan}Plan Doc</button>
          </>
        )}
        {pro && user && (
          <div className="rail-user">
            <span>Signed in{user.preview ? ' (preview)' : ''}</span>
            <b>{user.email}</b>
            <span style={{ textTransform: 'capitalize' }}>Role: {user.role}</span>
            <button className="btn btn-g btn-sm" onClick={logout}>Sign out</button>
          </div>
        )}
        <div className="ver">
          <div className="ver-row"><span className="ver-tag">v{VERSION}</span><span>Updated {RELEASED}</span></div>
          <details className="ver-new">
            <summary>What's new</summary>
            <ul>{WHATS_NEW.map((n) => <li key={n}>{n}</li>)}</ul>
          </details>
        </div>
      </aside>
      <main className="main">
        {pro && (
          !authReady ? <div className="page"><p className="note">Checking sign-in…</p></div>
          : !proOpen ? <ProLogin onUser={setUser} onLite={() => setTab('create')} />
          : proTab === 'plan' ? <PlanDoc toast={toast} onLite={() => setTab('create')} />
          : <StyleTrainer toast={toast} />
        )}
        {/* Lite stays mounted while Pro is open, so an edit or export in progress is never lost */}
        <div style={{ display: pro ? 'none' : 'block' }}>
          {!supported ? (
            <div className="unsupported page">
              <h1 className="h1">This browser can't edit video yet</h1>
              <p className="lede">Agentix Arena Hub needs WebCodecs. Open this page in Chrome or Edge on a desktop or laptop.</p>
            </div>
          ) : (
            <>
              <div style={{ display: tab === 'create' ? 'block' : 'none' }}>
                <Create defaultPack={defaultPack} defaultCap={defaultCap} openId={openId} onOpened={() => setOpenId(null)} onSaved={refresh} toast={toast} />
              </div>
              {!pro && tab === 'projects' && <Projects onOpen={(id) => { setOpenId(id); setTab('create'); }} onChange={refresh} />}
              {!pro && tab === 'library' && <Library current={defaultPack} currentCap={defaultCap} onPick={(id) => { setDefaultPack(id); toast('Default preset saved.'); }} onPickCap={(id) => { setDefaultCap(id); toast('Default caption template saved.'); }} onUse={(id) => { setDefaultPack(id); setTab('create'); }} />}
            </>
          )}
        </div>
      </main>
      {msg && <div className="toast" onClick={() => setMsg('')}>{msg}</div>}
    </div>
  );
}
