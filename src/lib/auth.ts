// Pro sign-in. Lite never touches this file's network code.
// Supabase Auth: Google sign-in + email magic link. Configure in Vercel env:
//   VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY  (Supabase project → Settings → API)
//   VITE_PRO_DOMAINS   (optional, default "ugenticai.com,soaringmedia.in")
//   VITE_PRO_INVITES   (optional, comma-separated invited emails)
// The allowlist here is the UI gate. Enforce it on the server too (Supabase
// "before user created" hook or RLS on Pro tables) before Pro stores real data.
import { createClient, type SupabaseClient, type Session } from '@supabase/supabase-js';

export type Role = 'admin' | 'editor' | 'client';
export interface ProUser { email: string; name: string; role: Role; preview?: boolean }

const URL_ = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
const DOMAINS = ((import.meta.env.VITE_PRO_DOMAINS as string | undefined) || 'ugenticai.com,soaringmedia.in')
  .split(',').map((d) => d.trim().toLowerCase()).filter(Boolean);
const INVITES = ((import.meta.env.VITE_PRO_INVITES as string | undefined) || '')
  .split(',').map((d) => d.trim().toLowerCase()).filter(Boolean);

export const PRODUCTION_HOST = 'agentix-arena-lite.vercel.app';
export const authConfigured = !!(URL_ && KEY);
/** Preview deploys (and localhost) may open Pro without sign-in so it can be reviewed before auth is set up. Never in production. */
export const previewBypassAllowed = typeof location !== 'undefined' && location.hostname !== PRODUCTION_HOST;

let client: SupabaseClient | null = null;
export function sb(): SupabaseClient | null {
  if (!authConfigured) return null;
  if (!client) client = createClient(URL_!, KEY!, { auth: { persistSession: true, detectSessionInUrl: true, flowType: 'pkce' } });
  return client;
}

export function isAllowed(email: string): boolean {
  const e = email.trim().toLowerCase();
  if (INVITES.includes(e)) return true;
  const dom = e.split('@')[1] || '';
  return DOMAINS.includes(dom);
}
export const allowedDomains = () => DOMAINS;

function toUser(s: Session | null): ProUser | null {
  const u = s?.user;
  if (!u?.email) return null;
  const role = ((u.app_metadata as { role?: Role } | undefined)?.role) || 'editor';
  const meta = (u.user_metadata || {}) as { full_name?: string; name?: string };
  return { email: u.email, name: meta.full_name || meta.name || u.email.split('@')[0], role };
}

const PREVIEW_KEY = 'aah.previewUser';

export async function currentUser(): Promise<ProUser | null> {
  const c = sb();
  if (c) {
    const { data } = await c.auth.getSession();
    const u = toUser(data.session);
    if (u) return u;
  }
  if (previewBypassAllowed) {
    try { const raw = sessionStorage.getItem(PREVIEW_KEY); if (raw) return JSON.parse(raw) as ProUser; } catch { /* private mode */ }
  }
  return null;
}

export function onAuthChange(cb: (u: ProUser | null) => void): () => void {
  const c = sb();
  if (!c) return () => {};
  const { data } = c.auth.onAuthStateChange((_e, s) => cb(toUser(s)));
  return () => data.subscription.unsubscribe();
}

const redirect = () => location.origin + location.pathname + '#pro';

export async function signInGoogle(): Promise<string | null> {
  const c = sb();
  if (!c) return 'Pro sign-in is not set up on this deploy yet.';
  const { error } = await c.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: redirect() } });
  return error ? error.message : null;
}

export async function signInEmail(email: string): Promise<string | null> {
  const c = sb();
  if (!c) return 'Pro sign-in is not set up on this deploy yet.';
  if (!isAllowed(email)) return `Pro is open to ${DOMAINS.map((d) => '@' + d).join(', ')} and invited emails. Use Lite, or ask an admin for an invite.`;
  const { error } = await c.auth.signInWithOtp({ email: email.trim(), options: { emailRedirectTo: redirect(), shouldCreateUser: true } });
  return error ? error.message : null;
}

export function enterPreview(): ProUser {
  const u: ProUser = { email: 'preview@agentix.local', name: 'Preview reviewer', role: 'admin', preview: true };
  try { sessionStorage.setItem(PREVIEW_KEY, JSON.stringify(u)); } catch { /* ignore */ }
  return u;
}

export async function signOut() {
  try { sessionStorage.removeItem(PREVIEW_KEY); } catch { /* ignore */ }
  await sb()?.auth.signOut();
}
