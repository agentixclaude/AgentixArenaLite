import { useState } from 'react';
import { authConfigured, previewBypassAllowed, signInGoogle, signInEmail, enterPreview, allowedDomains, type ProUser } from '../../lib/auth';
import Icon from '../../components/Icon';

export default function ProLogin({ onUser, onLite }: { onUser: (u: ProUser) => void; onLite: () => void }) {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  const doms = allowedDomains().map((d) => '@' + d).join(', ');

  const google = async () => { setBusy(true); const e = await signInGoogle(); if (e) { setMsg({ ok: false, t: e }); setBusy(false); } };
  const magic = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!email.includes('@')) { setMsg({ ok: false, t: 'Enter your work email.' }); return; }
    setBusy(true);
    const e = await signInEmail(email);
    setBusy(false);
    setMsg(e ? { ok: false, t: e } : { ok: true, t: `Sign-in link sent to ${email}. Open it on this computer.` });
  };

  return (
    <div className="login">
      <section className="login-l">
        <div className="kicker">Agentix Arena Pro</div>
        <h1>The director workflow, <span className="hl">behind one login.</span></h1>
        <p className="lede" style={{ margin: 0, maxWidth: 520 }}>Trained styles, beat-by-beat plans, revision patches and QC history live on your account and sync across every team Mac.</p>
        <div className="roles">
          <div><b>Admin</b>Styles, members, billing</div>
          <div><b>Editor</b>Plan, build, patch, QC</div>
          <div><b>Client viewer</b>Review drafts, comment</div>
        </div>
      </section>
      <section className="login-r">
        <form className="login-form" onSubmit={magic}>
          <h2>Sign in to Pro</h2>
          <button type="button" className="btn btn-lg btn-o w100" onClick={google} disabled={busy || !authConfigured}>
            <Icon name="star" size={17} /> Continue with Google
          </button>
          <div className="or">or</div>
          <label className="field" htmlFor="pro-email">Work email
            <input id="pro-email" className="input" type="email" autoComplete="email" placeholder="name@ugenticai.com" value={email} onChange={(e) => setEmail(e.target.value)} disabled={!authConfigured} />
          </label>
          <button type="submit" className="btn btn-lg btn-g w100" disabled={busy || !authConfigured}><Icon name="mail" size={17} /> Email me a sign-in link</button>
          <p className="note">Pro opens for {doms} and invited emails. Everyone else keeps Lite and can ask an admin for access.</p>
          {msg && <div className={msg.ok ? 'card note' : 'err'} role="status">{msg.t}</div>}
          {!authConfigured && (
            <div className="card note" role="status">
              Sign-in isn't connected on this deploy yet (needs the Supabase keys in Vercel).
              {previewBypassAllowed && <> This is a preview build, so you can review Pro without signing in.</>}
            </div>
          )}
          {previewBypassAllowed && (
            <button type="button" className="btn btn-g w100" onClick={() => onUser(enterPreview())}><Icon name="play" size={16} /> Open Pro in preview mode</button>
          )}
          <button type="button" className="btn btn-sm w100" style={{ color: 'var(--mute)' }} onClick={onLite}>Continue with Lite instead</button>
        </form>
      </section>
    </div>
  );
}
