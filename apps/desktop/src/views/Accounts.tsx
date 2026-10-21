import { useEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { openUrl } from "@tauri-apps/plugin-opener";

type Service = "realdebrid" | "alldebrid" | "trakt" | "simkl" | "plex";
type DeviceCode = { deviceCode: string; userCode: string; verificationUrl: string; intervalS: number; expiresInS: number };

const SERVICES: { id: Service; name: string; what: string }[] = [
  { id: "realdebrid", name: "Real-Debrid", what: "Instant cached streams" },
  { id: "alldebrid", name: "AllDebrid", what: "Instant cached streams" },
  { id: "trakt", name: "Trakt", what: "Scrobbling and watch history" },
  { id: "simkl", name: "Simkl", what: "Scrobbling and watch history" },
  { id: "plex", name: "Plex", what: "Sign in to add your Plex server" },
];

/** Settings section: sign in by approving a code on the provider's site. */
export function Accounts({ profile, onError, only, onChange }: { profile: number; onError: (s: string) => void; only?: Service[]; onChange?: () => void }) {
  const [signedIn, setSignedIn] = useState<Service[]>([]);
  const [pending, setPending] = useState<{ service: Service; code: DeviceCode } | null>(null);
  const timer = useRef<number>(undefined);
  const refresh = () => invoke<Service[]>("signins", { profile }).then((s) => { setSignedIn(s); onChange?.(); }).catch(() => {});
  const services = SERVICES.filter((s) => (only ? only.includes(s.id) : s.id !== "plex"));

  useEffect(() => { refresh(); return () => window.clearTimeout(timer.current); }, [profile]); // eslint-disable-line react-hooks/exhaustive-deps

  const start = async (service: Service) => {
    window.clearTimeout(timer.current);
    try {
      const code = await invoke<DeviceCode>("signin_start", { service });
      setPending({ service, code });
      openUrl(code.verificationUrl).catch(() => {});
      const deadline = Date.now() + code.expiresInS * 1000;
      const poll = async () => {
        if (Date.now() > deadline) { setPending(null); return onError("Sign-in code expired. Try again."); }
        try {
          if (await invoke<boolean>("signin_poll", { profile, service, code })) { setPending(null); return refresh(); }
        } catch (e) {
          setPending(null);
          return onError(String(e));
        }
        timer.current = window.setTimeout(poll, code.intervalS * 1000);
      };
      timer.current = window.setTimeout(poll, code.intervalS * 1000);
    } catch (e) {
      onError(String(e));
    }
  };

  return (
    <section>
      {!only && <h3>Accounts</h3>}
      <ul className="addons">
        {services.map((s) => (
          <li key={s.id}>
            <div>
              <strong>{s.name}</strong>
              <div className="small muted">{s.what}{signedIn.includes(s.id) ? " · signed in" : ""}</div>
            </div>
            {signedIn.includes(s.id) ? (
              <button onClick={() => invoke("signout", { profile, service: s.id }).then(refresh)}>Sign out</button>
            ) : (
              <button className="primary" onClick={() => start(s.id)}>Sign in</button>
            )}
          </li>
        ))}
      </ul>
      {pending && (
        <div className="code-box">
          <div>Enter this code at <a href="#" onClick={(e) => { e.preventDefault(); openUrl(pending.code.verificationUrl); }}>{pending.code.verificationUrl}</a></div>
          <div className="user-code">{pending.code.userCode}</div>
          <div className="small muted">Waiting for approval…</div>
          <button onClick={() => { window.clearTimeout(timer.current); setPending(null); }}>Cancel</button>
        </div>
      )}
    </section>
  );
}
