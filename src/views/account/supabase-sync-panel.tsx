import { useEffect, useState } from "react";
import { SUPABASE } from "@/lib/config/supabase";
import { signInSupabase, signOutSupabase, signUpSupabase, subscribeSupabaseSession, supabaseSession } from "@/lib/supabase/account";
import { syncSupabaseTaste } from "@/lib/supabase/taste";
import { SettingRow } from "@/views/settings/kit";
import { Section } from "@/views/settings/shared";

const button = "rounded-md bg-ink px-3 py-2 text-sm font-medium text-canvas disabled:cursor-not-allowed disabled:opacity-50";
const field = "rounded-md border border-border bg-canvas px-3 py-2 text-ink outline-none focus:border-accent";

export function SupabaseSyncPanel() {
  const [, rerender] = useState(0);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  useEffect(() => subscribeSupabaseSession(() => rerender((n) => n + 1)), []);
  const session = supabaseSession();
  if (!SUPABASE) return null;

  const run = async (action: () => Promise<void>) => {
    setBusy(true); setNotice(null);
    try { await action(); setNotice("Cloud taste is synced."); }
    catch (error) { setNotice(error instanceof Error ? error.message : "Cloud sync failed."); }
    finally { setBusy(false); }
  };

  return <Section title="Cloud sync" subtitle="Optional private recommendations that follow your account. Only aggregate genre, decade, and language preferences sync.">
    {session ? <SettingRow label={session.user.email || "Cloud account connected"} desc="Your raw viewing history, titles, and provider credentials stay on this device.">
      <span className="flex gap-2"><button type="button" className={button} disabled={busy} onClick={() => run(syncSupabaseTaste)}>{busy ? "Syncing…" : "Sync now"}</button><button type="button" className={button} onClick={signOutSupabase}>Sign out</button></span>
    </SettingRow> : <div className="flex max-w-md flex-col gap-3 p-4">
      <input className={field} type="email" autoComplete="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
      <input className={field} type="password" autoComplete="current-password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
      <span className="flex gap-2"><button type="button" className={button} disabled={busy || !email || password.length < 6} onClick={() => run(async () => { await signInSupabase(email, password); await syncSupabaseTaste(); })}>{busy ? "Connecting…" : "Sign in"}</button><button type="button" className={button} disabled={busy || !email || password.length < 6} onClick={() => run(async () => { const signedIn = await signUpSupabase(email, password); if (signedIn) await syncSupabaseTaste(); else setNotice("Check your email to confirm your account, then sign in."); })}>Create account</button></span>
    </div>}
    {notice && <p className="px-4 pb-4 text-sm text-ink-muted">{notice}</p>}
  </Section>;
}
