import { useEffect, useState } from "react";
import { api, type Profile } from "../api";

const LAST_PROFILE = "ui.lastProfile";

/** Picks the profile to start with: the only one if there's a single
 * profile without a PIN, otherwise the user chooses. */
export function ProfileGate({ onEnter, onError }: { onEnter: (p: Profile) => void; onError: (s: string) => void }) {
  const [list, setList] = useState<Profile[] | null>(null);
  const [locked, setLocked] = useState<Profile | null>(null);
  const [pin, setPin] = useState("");

  useEffect(() => {
    api.profiles().then(async (ps) => {
      const last = Number(await api.getAppSetting(LAST_PROFILE).catch(() => null));
      if (ps.length === 1 && !ps[0].has_pin) return onEnter(ps[0]);
      setList([...ps].sort((a, b) => Number(b.id === last) - Number(a.id === last)));
    }).catch((e) => onError(String(e)));
  }, [onEnter, onError]);

  const enter = (p: Profile) => {
    api.setAppSetting(LAST_PROFILE, String(p.id)).catch(() => {});
    onEnter(p);
  };
  const pick = (p: Profile) => (p.has_pin ? (setLocked(p), setPin("")) : enter(p));
  const unlock = async () => {
    if (!locked) return;
    if (await api.checkPin(locked.id, pin)) enter(locked);
    else { setPin(""); onError("Wrong PIN"); }
  };

  if (!list) return <div className="center muted">Loading…</div>;
  return (
    <div className="gate">
      <h1>Who's watching?</h1>
      <div className="profiles">
        {list.map((p) => (
          <button key={p.id} className="avatar" onClick={() => pick(p)}>
            <span className="avatar-circle">{p.name[0]?.toUpperCase()}</span>
            {p.name}
            <span className="small muted">{[p.kids && "Kids", p.has_pin && "🔒"].filter(Boolean).join(" · ")}</span>
          </button>
        ))}
      </div>
      {locked && (
        <form className="inline pin" onSubmit={(e) => { e.preventDefault(); unlock(); }}>
          <input autoFocus type="password" inputMode="numeric" maxLength={4} placeholder={`PIN for ${locked.name}`} value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))} />
          <button className="primary" disabled={pin.length !== 4}>Unlock</button>
        </form>
      )}
    </div>
  );
}

/** Settings section: add, rename, lock and delete profiles. */
export function ManageProfiles({ current, onError, onChanged }: { current: Profile; onError: (s: string) => void; onChanged: () => void }) {
  const [list, setList] = useState<Profile[]>([]);
  const [name, setName] = useState("");
  const [kids, setKids] = useState(false);
  const refresh = () => api.profiles().then(setList).catch((e) => onError(String(e)));
  useEffect(() => { refresh(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const run = (f: () => Promise<unknown>) => f().then(refresh).then(onChanged).catch((e) => onError(String(e)));
  const askPin = (p: Profile) => {
    const pin = window.prompt(p.has_pin ? `New PIN for ${p.name} (empty removes it)` : `4-digit PIN for ${p.name}`);
    if (pin === null) return;
    run(() => api.setPin(p.id, pin.trim() || null));
  };

  return (
    <section>
      <h3>Profiles</h3>
      <ul className="addons">
        {list.map((p) => (
          <li key={p.id}>
            <span className="avatar-circle small-circle">{p.name[0]?.toUpperCase()}</span>
            <div>
              <strong>{p.name}</strong>{p.id === current.id && <span className="small muted"> · you</span>}
              <div className="small muted">{[p.kids ? "Kids profile" : null, p.has_pin ? "PIN set" : null].filter(Boolean).join(" · ")}</div>
            </div>
            <button onClick={() => { const n = window.prompt("Rename profile", p.name); if (n) run(() => api.renameProfile(p.id, n)); }}>Rename</button>
            <button onClick={() => askPin(p)}>{p.has_pin ? "Change PIN" : "Set PIN"}</button>
            <button disabled={list.length <= 1 || p.id === current.id} onClick={() => window.confirm(`Delete ${p.name} and its history?`) && run(() => api.deleteProfile(p.id))}>Delete</button>
          </li>
        ))}
      </ul>
      <form className="inline" onSubmit={(e) => { e.preventDefault(); if (name.trim()) run(() => api.createProfile(name.trim(), kids)).then(() => { setName(""); setKids(false); }); }}>
        <input placeholder="New profile name" value={name} maxLength={32} onChange={(e) => setName(e.target.value)} />
        <label className="check"><input type="checkbox" checked={kids} onChange={(e) => setKids(e.target.checked)} />Kids</label>
        <button className="primary" disabled={!name.trim()}>Add</button>
      </form>
    </section>
  );
}
