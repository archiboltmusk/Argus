import { useEffect, useState } from "react";
import { api } from "../api";

/** Mirrors argus_core::torrent::TorrentPrefs (camelCase). */
type Prefs = { downloadKbps: number; uploadKbps: number; cacheGb: number };
const KEY = "torrent.prefs";
const DEFAULTS: Prefs = { downloadKbps: 0, uploadKbps: 0, cacheGb: 10 };

/** Settings section: limits for the built-in torrent engine (used when no debrid is set up). */
export function TorrentSettings({ profile, onSaved }: { profile: number; onSaved: () => void }) {
  const [p, setP] = useState(DEFAULTS);
  useEffect(() => {
    api.getSetting(profile, KEY).then((j) => setP({ ...DEFAULTS, ...(j ? JSON.parse(j) : {}) })).catch(() => {});
  }, [profile]);
  const num = (k: keyof Prefs) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setP((o) => ({ ...o, [k]: Math.max(0, Math.floor(Number(e.target.value) || 0)) }));

  return (
    <section className="settings">
      <h3>Built-in torrent engine</h3>
      <div className="small muted">Used when no debrid service is signed in. Applies from the next stream you start.</div>
      <label>Download limit (KB/s, 0 = unlimited)
        <input type="number" min={0} value={p.downloadKbps} onChange={num("downloadKbps")} />
      </label>
      <label>Upload limit (KB/s, 0 = unlimited)
        <input type="number" min={0} value={p.uploadKbps} onChange={num("uploadKbps")} />
      </label>
      <label>Cache size (GB)
        <input type="number" min={1} max={500} value={p.cacheGb} onChange={num("cacheGb")} />
      </label>
      <button className="primary" onClick={() => api.setSetting(profile, KEY, JSON.stringify(p)).then(onSaved)}>Save torrent settings</button>
    </section>
  );
}
