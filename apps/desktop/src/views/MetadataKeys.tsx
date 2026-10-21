import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { api } from "../api";
import { setRpdbKey } from "./Poster";

const FIELDS: [key: string, label: string, hint: string][] = [
  ["meta.tmdb.key", "TMDB API key", "Movies and Shows rooms (free at themoviedb.org/settings/api)"],
  ["meta.omdb.key", "OMDb API key", "IMDb, Rotten Tomatoes and Metascore on detail pages (free at omdbapi.com)"],
  ["meta.rpdb.key", "RPDB key", "Rating badges on posters (ratingposterdb.com)"],
];

/** Settings section: optional metadata keys. Stored on this device only. */
export function MetadataKeys({ profile, onSaved, onError }: { profile: number; onSaved: () => void; onError: (s: string) => void }) {
  const [vals, setVals] = useState<Record<string, string>>({});
  useEffect(() => {
    Promise.all(FIELDS.map(([k]) => api.getSetting(profile, k).then((v) => [k, v ?? ""] as const)))
      .then((e) => setVals(Object.fromEntries(e)))
      .catch(() => {});
  }, [profile]);

  const save = async () => {
    try {
      if (vals["meta.tmdb.key"]?.trim() && !(await invoke<boolean>("check_tmdb_key", { key: vals["meta.tmdb.key"] }))) {
        return onError("TMDB rejected that key.");
      }
      await Promise.all(FIELDS.map(([k]) => api.setSetting(profile, k, (vals[k] ?? "").trim())));
      setRpdbKey(vals["meta.rpdb.key"] ?? "");
      onSaved();
    } catch (e) {
      onError(String(e));
    }
  };

  return (
    <section className="settings">
      <h3>Metadata keys (optional)</h3>
      {FIELDS.map(([k, label, hint]) => (
        <label key={k}>{label}
          <input type="password" autoComplete="off" value={vals[k] ?? ""} onChange={(e) => setVals((v) => ({ ...v, [k]: e.target.value }))} />
          <span className="small muted">{hint}</span>
        </label>
      ))}
      <button className="primary" onClick={save}>Save keys</button>
    </section>
  );
}
