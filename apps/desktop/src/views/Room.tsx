import { useEffect, useState } from "react";
import { api, type CatalogRow, type MetaPreview } from "../api";
import { Poster } from "./Poster";

/** Movies / Shows room: rails from the user's own TMDB key. */
export function Room({ profile, room, onOpen, onGoSettings }: {
  profile: number; room: "movies" | "shows"; onOpen: (m: MetaPreview) => void; onGoSettings: () => void;
}) {
  const [rows, setRows] = useState<CatalogRow[] | null>(null);
  const [hasKey, setHasKey] = useState(true);
  useEffect(() => {
    setRows(null);
    api.getSetting(profile, "meta.tmdb.key").then((k) => {
      setHasKey(!!k?.trim());
      return k?.trim() ? api.roomRows(profile, room) : [];
    }).then(setRows).catch(() => setRows([]));
  }, [profile, room]);

  if (!hasKey) {
    return (
      <div className="empty">
        <h2>{room === "movies" ? "Movies" : "Shows"} needs a TMDB key</h2>
        <p className="muted">A free key from themoviedb.org unlocks trending, in theaters, top rated and streaming-service rows. It stays on this device.</p>
        <button className="primary" onClick={onGoSettings}>Add a key in Settings</button>
      </div>
    );
  }
  return (
    <>
      {rows === null && <div className="muted">Loading…</div>}
      {rows?.length === 0 && <div className="muted">Nothing came back. Check the key in Settings.</div>}
      {rows?.map((r) => (
        <section key={r.id + r.title}>
          <h3>{r.title}</h3>
          <div className="row">{r.items.map((m) => <Poster key={m.id} item={m} onOpen={onOpen} />)}</div>
        </section>
      ))}
    </>
  );
}
