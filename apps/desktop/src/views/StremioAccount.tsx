import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";

type Summary = { addons: number; library: number; progress: number };

/** Settings section: import addons, library and Continue Watching from a Stremio account. */
export function StremioAccount({ profile, onError, onSaved }: { profile: number; onError: (s: string) => void; onSaved: () => void }) {
  const [signedIn, setSignedIn] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [last, setLast] = useState<Summary | null>(null);

  useEffect(() => { invoke<boolean>("stremio_signed_in", { profile }).then(setSignedIn).catch(() => {}); }, [profile]);

  const run = async (f: () => Promise<void>) => {
    setBusy(true);
    try { await f(); } catch (e) { onError(String(e)); } finally { setBusy(false); }
  };
  const importNow = () => run(async () => {
    const s = await invoke<Summary>("stremio_import", { profile });
    setLast(s);
    onSaved();
  });
  const login = () => run(async () => {
    await invoke("stremio_login", { profile, email, password });
    setPassword("");
    setSignedIn(true);
    await importNow();
  });

  return (
    <section className="settings">
      <h3>Stremio account</h3>
      {signedIn ? (
        <>
          <div className="small muted">Signed in. Argus keeps a sign-in key, not your password.</div>
          <div className="inline">
            <button className="primary" disabled={busy} onClick={importNow}>{busy ? "Importing…" : "Import again"}</button>
            <button disabled={busy} onClick={() => invoke("stremio_logout", { profile }).then(() => { setSignedIn(false); setLast(null); })}>Sign out</button>
          </div>
          {last && <div className="small muted">Added {last.addons} addons, {last.library} library titles and {last.progress} unfinished titles.</div>}
        </>
      ) : (
        <>
          <label>Email<input type="email" autoComplete="off" value={email} onChange={(e) => setEmail(e.target.value)} /></label>
          <label>Password<input type="password" autoComplete="off" value={password} onChange={(e) => setPassword(e.target.value)} /></label>
          <button className="primary" disabled={busy || !email || !password} onClick={login}>{busy ? "Signing in…" : "Sign in and import"}</button>
          <div className="small muted">Copies your addons, library and Continue Watching into this profile. Nothing is sent back to Stremio.</div>
        </>
      )}
    </section>
  );
}
