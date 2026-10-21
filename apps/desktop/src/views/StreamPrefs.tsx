import { useEffect, useState } from "react";
import { api } from "../api";

/** Mirrors argus_core::ranking::Preferences (camelCase). */
type Prefs = {
  maxResolution: number | null;
  minResolution: number | null;
  maxSizeGb: number | null;
  hideCam: boolean;
  allowHdr: boolean;
  preferHevc: boolean;
  excludeKeywords: string[];
  cachedOnly: boolean;
};

const DEFAULTS: Prefs = { maxResolution: null, minResolution: null, maxSizeGb: null, hideCam: true, allowHdr: true, preferHevc: false, excludeKeywords: [], cachedOnly: false };
const RESOLUTIONS = [480, 720, 1080, 2160];
export const AUTOPLAY_KEY = "streams.autoplay";

/** Settings section: filters applied to every stream list, plus auto-play. */
export function StreamPrefs({ profile, onSaved }: { profile: number; onSaved: () => void }) {
  const [p, setP] = useState<Prefs>(DEFAULTS);
  const [autoplay, setAutoplay] = useState(false);
  const [keywords, setKeywords] = useState("");

  useEffect(() => {
    api.getSetting(profile, "streams.prefs").then((j) => {
      const v = { ...DEFAULTS, ...(j ? JSON.parse(j) : {}) };
      setP(v);
      setKeywords(v.excludeKeywords.join(", "));
    }).catch(() => {});
    api.getSetting(profile, AUTOPLAY_KEY).then((v) => setAutoplay(v === "on"));
  }, [profile]);

  const save = async () => {
    const next = { ...p, excludeKeywords: keywords.split(",").map((k) => k.trim()).filter(Boolean) };
    await api.setSetting(profile, "streams.prefs", JSON.stringify(next));
    await api.setSetting(profile, AUTOPLAY_KEY, autoplay ? "on" : "off");
    onSaved();
  };
  const res = (k: "maxResolution" | "minResolution") => (
    <select value={p[k] ?? ""} onChange={(e) => setP({ ...p, [k]: e.target.value ? Number(e.target.value) : null })}>
      <option value="">Any</option>
      {RESOLUTIONS.map((r) => <option key={r} value={r}>{r === 2160 ? "4K" : `${r}p`}</option>)}
    </select>
  );
  const check = (k: "hideCam" | "allowHdr" | "preferHevc" | "cachedOnly", label: string) => (
    <label className="check"><input type="checkbox" checked={p[k]} onChange={(e) => setP({ ...p, [k]: e.target.checked })} />{label}</label>
  );

  return (
    <section className="settings">
      <h3>Streams</h3>
      <label>Highest quality {res("maxResolution")}</label>
      <label>Lowest quality {res("minResolution")}</label>
      <label>Largest file (GB)
        <input type="number" min={0} step={0.5} placeholder="No limit" value={p.maxSizeGb ?? ""} onChange={(e) => setP({ ...p, maxSizeGb: e.target.value ? Number(e.target.value) : null })} />
      </label>
      <label>Hide streams containing
        <input placeholder="e.g. hindi, 3D, HC" value={keywords} onChange={(e) => setKeywords(e.target.value)} />
      </label>
      {check("hideCam", "Hide CAM and TS releases")}
      {check("allowHdr", "Allow HDR and Dolby Vision")}
      {check("preferHevc", "Prefer HEVC (smaller files)")}
      {check("cachedOnly", "Only show instant (debrid-cached) streams")}
      <label className="check"><input type="checkbox" checked={autoplay} onChange={(e) => setAutoplay(e.target.checked)} />Start the best stream as soon as I pick an episode</label>
      <button className="primary" onClick={save}>Save stream settings</button>
    </section>
  );
}
