import { useEffect, useMemo, useState } from "react";
import { api, type Addon, type CatalogDef, type MetaPreview } from "../api";
import { Poster } from "./Poster";

type Entry = { addon: Addon; def: CatalogDef; label: string };

/** Stremio-style Discover: pick a catalog, filter by genre, keep loading. */
export function Discover({ profile, onOpen, onError }: { profile: number; onOpen: (m: MetaPreview) => void; onError: (s: string) => void }) {
  const [entries, setEntries] = useState<Entry[] | null>(null);
  const [kind, setKind] = useState("");
  const [pick, setPick] = useState(0);
  const [genre, setGenre] = useState("");
  const [items, setItems] = useState<MetaPreview[]>([]);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    api.addons(profile).then((as) => {
      const list = as.flatMap((addon) =>
        addon.manifest.catalogs
          .filter((def) => !def.extra.some((e) => e.isRequired))
          .map((def) => ({ addon, def, label: `${def.name ?? def.id} · ${addon.manifest.name}` })),
      );
      setEntries(list);
      setKind(list[0]?.def.type ?? "");
    }).catch((e) => onError(String(e)));
  }, [profile, onError]);

  const kinds = useMemo(() => [...new Set((entries ?? []).map((e) => e.def.type))], [entries]);
  const inKind = useMemo(() => (entries ?? []).filter((e) => e.def.type === kind), [entries, kind]);
  const cur = inKind[Math.min(pick, inKind.length - 1)];
  const genres = cur?.def.extra.find((e) => e.name === "genre")?.options ?? [];

  const load = (reset: boolean) => {
    if (!cur) return;
    setLoading(true);
    const extra: [string, string][] = [];
    if (genre) extra.push(["genre", genre]);
    if (!reset && items.length) extra.push(["skip", String(items.length)]);
    api.catalogPage(profile, cur.addon.base_url, cur.def.type, cur.def.id, extra)
      .then((page) => {
        const seen = new Set(reset ? [] : items.map((i) => i.id));
        const fresh = page.filter((m) => !seen.has(m.id));
        setItems(reset ? fresh : [...items, ...fresh]);
        setDone(fresh.length === 0 || page.length < 10);
      })
      .catch((e) => onError(String(e)))
      .finally(() => setLoading(false));
  };

  // Reload from page one whenever the catalog or genre changes.
  useEffect(() => { setItems([]); setDone(false); if (cur) load(true); }, [cur?.addon.base_url, cur?.def.id, cur?.def.type, genre]); // eslint-disable-line react-hooks/exhaustive-deps

  if (entries === null) return <div className="muted">Loading…</div>;
  if (!entries.length) return <div className="empty"><h2>No catalogs</h2><p className="muted">Install an addon with catalogs on the Sources page.</p></div>;
  return (
    <>
      <h2>Discover</h2>
      <div className="inline wrap">
        <select value={kind} onChange={(e) => { setKind(e.target.value); setPick(0); setGenre(""); }}>
          {kinds.map((k) => <option key={k} value={k}>{k[0].toUpperCase() + k.slice(1)}</option>)}
        </select>
        <select value={Math.min(pick, inKind.length - 1)} onChange={(e) => { setPick(Number(e.target.value)); setGenre(""); }}>
          {inKind.map((e, i) => <option key={e.label} value={i}>{e.label}</option>)}
        </select>
        {genres.length > 0 && (
          <select value={genre} onChange={(e) => setGenre(e.target.value)}>
            <option value="">All genres</option>
            {genres.map((g) => <option key={g}>{g}</option>)}
          </select>
        )}
      </div>
      <div className="grid">{items.map((m) => <Poster key={m.id} item={m} onOpen={onOpen} />)}</div>
      {loading && <div className="muted">Loading…</div>}
      {!loading && !done && items.length > 0 && <button className="more" onClick={() => load(false)}>Load more</button>}
    </>
  );
}
