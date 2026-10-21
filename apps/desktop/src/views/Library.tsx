import { useEffect, useState } from "react";
import { api, type LibraryItem, type MetaPreview } from "../api";
import { Poster } from "./Poster";

export function Library({ profile, onOpen }: { profile: number; onOpen: (m: MetaPreview) => void }) {
  const [items, setItems] = useState<LibraryItem[] | null>(null);
  const [kind, setKind] = useState<"all" | "movie" | "series">("all");
  useEffect(() => { api.library(profile).then(setItems).catch(() => setItems([])); }, [profile]);

  if (items === null) return <div className="muted">Loading…</div>;
  if (items.length === 0) {
    return (
      <div className="empty">
        <h2>Your library is empty</h2>
        <p className="muted">Press “+ Library” on any title to keep it here. Series in your library also show up in the calendar.</p>
      </div>
    );
  }
  const shown = items.filter((i) => kind === "all" || i.kind === kind);
  return (
    <>
      <div className="tabs">
        {(["all", "movie", "series"] as const).map((k) => (
          <button key={k} className={k === kind ? "nav active" : "nav"} onClick={() => setKind(k)}>
            {k === "all" ? "All" : k === "movie" ? "Movies" : "Series"}
          </button>
        ))}
      </div>
      <div className="grid">
        {shown.map((i) => <Poster key={i.item_id} item={{ id: i.item_id, type: i.kind, name: i.name, poster: i.poster }} onOpen={onOpen} />)}
      </div>
    </>
  );
}

/** "+ Library" / "✓ In library" toggle for the detail page. */
export function LibraryButton({ profile, item }: { profile: number; item: MetaPreview }) {
  const [saved, setSaved] = useState<boolean | null>(null);
  useEffect(() => {
    api.library(profile).then((l) => setSaved(l.some((i) => i.item_id === item.id))).catch(() => setSaved(false));
  }, [profile, item.id]);

  const toggle = async () => {
    if (saved) await api.removeFromLibrary(profile, item.id);
    else await api.addToLibrary(profile, { item_id: item.id, kind: item.type, name: item.name, poster: item.poster, added_at: Math.floor(Date.now() / 1000) });
    setSaved(!saved);
  };
  return <button disabled={saved === null} onClick={toggle}>{saved ? "✓ In library" : "+ Library"}</button>;
}
