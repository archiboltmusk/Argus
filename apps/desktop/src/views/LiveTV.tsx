import { useEffect, useMemo, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { player } from "../player";

type Channel = { id: string; name: string; url: string; group?: string; logo?: string; tvgId?: string; source: string };
type Programme = { title: string; start: number; stop: number; desc?: string };
type Guide = Record<string, { now?: Programme; next?: Programme }>;

const hhmm = (t: number) => new Date(t * 1000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

/** Channel grid with now/next, grouped and searchable. */
export function LiveTV({ profile, onError, onGoSources }: { profile: number; onError: (s: string) => void; onGoSources: () => void }) {
  const [channels, setChannels] = useState<Channel[] | null>(null);
  const [guide, setGuide] = useState<Guide>({});
  const [group, setGroup] = useState<string>("All");
  const [q, setQ] = useState("");

  useEffect(() => {
    invoke<Channel[]>("live_channels", { profile }).then(setChannels).catch((e) => { setChannels([]); onError(String(e)); });
    invoke<Guide>("live_guide", { profile }).then(setGuide).catch(() => {});
  }, [profile, onError]);

  const groups = useMemo(() => ["All", ...new Set((channels ?? []).map((c) => c.group ?? "Other"))], [channels]);
  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return (channels ?? [])
      .filter((c) => group === "All" || (c.group ?? "Other") === group)
      .filter((c) => !needle || c.name.toLowerCase().includes(needle))
      .slice(0, 500);
  }, [channels, group, q]);

  const watch = (c: Channel) =>
    player.load(c.url, 0, { profile, itemId: c.id, kind: "tv", name: c.name, poster: c.logo, videoId: c.id, fileKey: c.id }, [], 0).catch((e) => onError(String(e)));

  if (channels === null) return <div className="muted">Loading channels…</div>;
  if (channels.length === 0) {
    return (
      <div className="empty">
        <h2>No channels yet</h2>
        <p className="muted">Add an M3U playlist or Xtream login you already have.</p>
        <button className="primary" onClick={onGoSources}>Add a playlist</button>
      </div>
    );
  }
  return (
    <>
      <div className="inline">
        <input placeholder={`Search ${channels.length} channels`} value={q} onChange={(e) => setQ(e.target.value)} />
        <select value={group} onChange={(e) => setGroup(e.target.value)}>{groups.map((g) => <option key={g}>{g}</option>)}</select>
      </div>
      <div className="channels">
        {shown.map((c) => {
          const g = c.tvgId ? guide[c.tvgId] : undefined;
          return (
            <button key={c.id} className="channel" onClick={() => watch(c)}>
              {c.logo ? <img src={c.logo} alt="" loading="lazy" /> : <span className="channel-logo">{c.name.slice(0, 2)}</span>}
              <span className="channel-text">
                <strong>{c.name}</strong>
                {g?.now && <span className="small">{g.now.title} <span className="muted">until {hhmm(g.now.stop)}</span></span>}
                {g?.next && <span className="small muted">Next: {g.next.title} at {hhmm(g.next.start)}</span>}
              </span>
            </button>
          );
        })}
      </div>
    </>
  );
}
