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
  safety: "strict" | "balanced" | "off";
  source: "both" | "debrid" | "p2p";
  order: "rank" | "addon";
  addonWaitSecs: number;
};

/** How the stream list looks. Stored separately; applies to the picker on title pages. */
export type PickerPrefs = { layout: "condensed" | "full"; fullDescription: boolean; showRelease: boolean };
export const PICKER_KEY = "streams.picker";
export const DEFAULT_PICKER: PickerPrefs = { layout: "full", fullDescription: true, showRelease: true };
export async function loadPicker(profile: number): Promise<PickerPrefs> {
  const j = await api.getSetting(profile, PICKER_KEY).catch(() => null);
  try { return { ...DEFAULT_PICKER, ...(j ? JSON.parse(j) : {}) }; } catch { return DEFAULT_PICKER; }
}
const FILTERS_KEY = "streams.filters";
type SavedFilter = { name: string; prefs: Prefs };

const DEFAULTS: Prefs = { maxResolution: null, minResolution: null, maxSizeGb: null, hideCam: true, allowHdr: true, preferHevc: false, excludeKeywords: [], cachedOnly: false, safety: "balanced", source: "both", order: "rank", addonWaitSecs: 6 };
const RESOLUTIONS = [480, 720, 1080, 2160];
export const AUTOPLAY_KEY = "streams.autoplay";

/** Settings section: filters applied to every stream list, plus auto-play. */
export function StreamPrefs({ profile, onSaved }: { profile: number; onSaved: () => void }) {
  const [p, setP] = useState<Prefs>(DEFAULTS);
  const [autoplay, setAutoplay] = useState(false);
  const [keywords, setKeywords] = useState("");
  const [picker, setPicker] = useState<PickerPrefs>(DEFAULT_PICKER);
  const [filters, setFilters] = useState<SavedFilter[]>([]);
  const [filterName, setFilterName] = useState("");

  useEffect(() => {
    api.getSetting(profile, "streams.prefs").then((j) => {
      const v = { ...DEFAULTS, ...(j ? JSON.parse(j) : {}) };
      setP(v);
      setKeywords(v.excludeKeywords.join(", "));
    }).catch(() => {});
    api.getSetting(profile, AUTOPLAY_KEY).then((v) => setAutoplay(v === "on"));
    loadPicker(profile).then(setPicker);
    api.getSetting(profile, FILTERS_KEY).then((j) => { try { setFilters(j ? JSON.parse(j) : []); } catch { /* ignore */ } }).catch(() => {});
  }, [profile]);

  const saveFilters = (next: SavedFilter[]) => { setFilters(next); api.setSetting(profile, FILTERS_KEY, JSON.stringify(next)); };
  const apply = (f: SavedFilter) => { setP({ ...DEFAULTS, ...f.prefs }); setKeywords((f.prefs.excludeKeywords ?? []).join(", ")); };

  const save = async () => {
    // The Languages page edits these two; keep whatever it saved last.
    const latest = await api.getSetting(profile, "streams.prefs").then((j) => (j ? JSON.parse(j) : {})).catch(() => ({}));
    const next = { ...p, excludeKeywords: keywords.split(",").map((k) => k.trim()).filter(Boolean), languages: latest.languages ?? [], onlyMyLanguages: latest.onlyMyLanguages ?? false };
    await api.setSetting(profile, "streams.prefs", JSON.stringify(next));
    await api.setSetting(profile, AUTOPLAY_KEY, autoplay ? "on" : "off");
    await api.setSetting(profile, PICKER_KEY, JSON.stringify(picker));
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
      <label>Stream safety filter
        <select value={p.safety} onChange={(e) => setP({ ...p, safety: e.target.value as Prefs["safety"] })}>
          <option value="strict">Strict: also hide extras and undersized files</option>
          <option value="balanced">Balanced: hide fakes, samples and wrong episodes</option>
          <option value="off">Off: show everything</option>
        </select>
      </label>
      <label>Prefer
        <select value={p.source} onChange={(e) => setP({ ...p, source: e.target.value as Prefs["source"] })}>
          <option value="both">Both: whichever is best</option>
          <option value="debrid">Direct links and debrid first</option>
          <option value="p2p">Torrents (P2P) first</option>
        </select>
      </label>
      <label>Order
        <select value={p.order} onChange={(e) => setP({ ...p, order: e.target.value as Prefs["order"] })}>
          <option value="rank">Best first (Argus ranking)</option>
          <option value="addon">Exactly as my addons return them</option>
        </select>
      </label>
      <label>Wait for each addon up to
        <select value={p.addonWaitSecs} onChange={(e) => setP({ ...p, addonWaitSecs: Number(e.target.value) })}>
          {[3, 6, 10, 15, 30].map((n) => <option key={n} value={n}>{n} seconds</option>)}
        </select>
      </label>
      {check("hideCam", "Hide CAM and TS releases")}
      {check("allowHdr", "Allow HDR and Dolby Vision")}
      {check("preferHevc", "Prefer HEVC (smaller files)")}
      {check("cachedOnly", "Only show instant (debrid-cached) streams")}
      <label className="check"><input type="checkbox" checked={autoplay} onChange={(e) => setAutoplay(e.target.checked)} />Start the best stream as soon as I pick an episode</label>
      <h3>Stream list</h3>
      <label>Layout
        <select value={picker.layout} onChange={(e) => setPicker({ ...picker, layout: e.target.value as PickerPrefs["layout"] })}>
          <option value="full">Full: badges, name and description</option>
          <option value="condensed">Condensed: one line per stream</option>
        </select>
      </label>
      <label className="check"><input type="checkbox" checked={picker.showRelease} onChange={(e) => setPicker({ ...picker, showRelease: e.target.checked })} />Show the release name</label>
      <label className="check"><input type="checkbox" checked={picker.fullDescription} onChange={(e) => setPicker({ ...picker, fullDescription: e.target.checked })} />Show full descriptions (not cut to two lines)</label>
      <h3>Saved filters</h3>
      <div className="inline">
        <input placeholder="Name, like 4K only" value={filterName} onChange={(e) => setFilterName(e.target.value)} />
        <button disabled={!filterName.trim()} onClick={() => { saveFilters([...filters.filter((f) => f.name !== filterName.trim()), { name: filterName.trim(), prefs: { ...p, excludeKeywords: keywords.split(",").map((k) => k.trim()).filter(Boolean) } }]); setFilterName(""); }}>Save current as filter</button>
      </div>
      {filters.map((f) => (
        <div key={f.name} className="inline">
          <button onClick={() => apply(f)}>Use "{f.name}"</button>
          <button className="link" onClick={() => saveFilters(filters.filter((x) => x.name !== f.name))}>Delete</button>
        </div>
      ))}
      <button className="primary" onClick={save}>Save stream settings</button>
    </section>
  );
}
