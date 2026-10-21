import { useEffect, useState } from "react";
import { api } from "../api";
import { ACTIONS, DEFAULT_KEYS, KEYS_SETTING, conflict, keyName } from "../keys";

export async function loadKeys(profile: number) {
  const j = await api.getSetting(profile, KEYS_SETTING).catch(() => null);
  return { ...DEFAULT_KEYS, ...(j ? JSON.parse(j) : {}) } as Record<string, string>;
}

/** Settings section: click a shortcut, press the new key. */
export function Hotkeys({ profile, onSaved }: { profile: number; onSaved: () => void }) {
  const [keys, setKeys] = useState(DEFAULT_KEYS);
  const [listening, setListening] = useState<string | null>(null);
  const [warn, setWarn] = useState("");

  useEffect(() => { loadKeys(profile).then(setKeys); }, [profile]);

  useEffect(() => {
    if (!listening) return;
    const onKey = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.key === "Shift" || e.key === "Control" || e.key === "Alt" || e.key === "Meta") return;
      const clash = conflict(keys, e.key, listening);
      if (clash) setWarn(`${keyName(e.key)} is already used for "${clash}". Pick another key.`);
      else {
        setKeys((k) => ({ ...k, [listening]: e.key }));
        setWarn("");
        setListening(null);
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [listening, keys]);

  const save = (next: Record<string, string>) => {
    // Store only overrides so new default actions still reach existing users.
    const diff = Object.fromEntries(Object.entries(next).filter(([id, k]) => k !== DEFAULT_KEYS[id]));
    return api.setSetting(profile, KEYS_SETTING, JSON.stringify(diff)).then(onSaved);
  };

  return (
    <section className="settings">
      <h3>Keyboard shortcuts</h3>
      <div className="hotkeys">
        {ACTIONS.map(([id, label]) => (
          <div key={id} className="hotkey-row">
            <span>{label}</span>
            <button className={listening === id ? "primary" : ""} onClick={() => { setWarn(""); setListening(listening === id ? null : id); }}>
              {listening === id ? "Press a key…" : keyName(keys[id])}
            </button>
          </div>
        ))}
      </div>
      {warn && <div className="small muted">{warn}</div>}
      <div className="inline">
        <button className="primary" onClick={() => save(keys)}>Save shortcuts</button>
        <button onClick={() => { setKeys(DEFAULT_KEYS); save(DEFAULT_KEYS); }}>Reset to defaults</button>
      </div>
    </section>
  );
}
