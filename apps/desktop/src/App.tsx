import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { getCurrentWebview } from "@tauri-apps/api/webview";
import { PlayerView } from "./PlayerView";
import { UpdateBanner, UpdateSettings } from "./updates";
import { player, startPlayerEvents } from "./player";
import { play as startPlayback, playNextEpisode, playStage } from "./playback";
import { api, CINEMETA_URL, type Addon, type CatalogRow, type Meta, type MetaPreview, type Profile, type Progress, type Ratings, type RankedStream, type StreamInfo, type Video } from "./api";
import { Accounts } from "./views/Accounts";
import { Calendar } from "./views/Calendar";
import { Discover } from "./views/Discover";
import { Downloads } from "./views/Downloads";
import { Library, LibraryButton } from "./views/Library";
import { LiveTV } from "./views/LiveTV";
import { Sources } from "./views/Sources";
import { OpenMedia } from "./views/Open";
import { PlayerSettings, loadPlayerPrefs } from "./views/PlayerSettings";
import { PlaybackSettings } from "./views/PlaybackSettings";
import { SubtitleSettings } from "./views/SubtitleSettings";
import { Hotkeys } from "./views/Hotkeys";
import { StremioAccount } from "./views/StremioAccount";
import { Room } from "./views/Room";
import { MetadataKeys } from "./views/MetadataKeys";
import { setRpdbKey } from "./views/Poster";
import { TorrentSettings } from "./views/TorrentSettings";
import { Poster } from "./views/Poster";
import { ManageProfiles, ProfileGate } from "./views/Profiles";
import { AUTOPLAY_KEY, StreamPrefs } from "./views/StreamPrefs";

type Page = "home" | "discover" | "movies" | "shows" | "search" | "library" | "calendar" | "live" | "downloads" | "addons" | "settings";
const PAGE_LABEL: Record<Page, string> = { home: "Home", discover: "Discover", movies: "Movies", shows: "Shows", search: "Search", library: "Library", calendar: "Calendar", live: "Live TV", downloads: "Downloads", addons: "Sources", settings: "Settings" };
type View = { name: Page } | { name: "detail"; item: MetaPreview };
/** Kids profiles can't change sources or settings. */
const KIDS_HIDDEN: Page[] = ["addons", "settings"];

function errText(e: unknown) {
  return typeof e === "string" ? e : e instanceof Error ? e.message : "Something went wrong";
}

export default function App() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [view, setView] = useState<View>({ name: "home" });
  const [toast, setToast] = useState<string | null>(null);

  const [gate, setGate] = useState(0);
  useEffect(() => { startPlayerEvents(); }, []);

  // Files dropped on the window, or opened from Finder, play right away.
  useEffect(() => {
    if (!profile) return;
    const playFile = (path: string) =>
      player.load(path, 0, { profile: profile.id, itemId: `open:${path}`, kind: "other", name: path.split("/").pop() ?? path, videoId: path, fileKey: path }, [], 0)
        .catch((e) => setToast(errText(e)));
    const subs = [
      getCurrentWebview().onDragDropEvent((e) => { if (e.payload.type === "drop" && e.payload.paths[0]) playFile(e.payload.paths[0]); }),
      listen<string[]>("open-files", (e) => e.payload[0] && playFile(e.payload[0])),
    ];
    return () => { subs.forEach((s) => s.then((off) => off())); };
  }, [profile]);
  const enter = useCallback((p: Profile) => {
    setProfile(p);
    setView({ name: "home" });
    api.getSetting(p.id, "meta.rpdb.key").then((k) => setRpdbKey(k ?? "")).catch(() => {});
  }, []);
  const showError = useCallback((e: unknown) => setToast(errText(e)), []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  if (!profile) {
    return (
      <>
        <ProfileGate key={gate} onEnter={enter} onError={showError} />
        {toast && <div className="toast" role="status">{toast}</div>}
      </>
    );
  }
  const open = (item: MetaPreview) => setView({ name: "detail", item });
  const pages: Page[] = ["home", "discover", "movies", "shows", "search", "library", "calendar", "live", "downloads", "addons", "settings"];
  const nav = pages.filter((n) => !(profile.kids && KIDS_HIDDEN.includes(n))).map((n) => (
    <button key={n} className={view.name === n ? "nav active" : "nav"} onClick={() => setView({ name: n })}>
      {PAGE_LABEL[n]}
    </button>
  ));

  return (
    <div className="app">
      <aside className="sidebar" data-tauri-drag-region>
        <div className="brand">Argus</div>
        {nav}
        <button className="profile nav" title="Switch profile" onClick={() => { setProfile(null); setGate((g) => g + 1); }}>
          <span className="avatar-circle small-circle">{profile.name[0]?.toUpperCase()}</span> {profile.name}
        </button>
      </aside>
      <main className="content">
        {view.name === "home" && <OpenMedia profile={profile.id} onError={showError} />}
        {view.name === "home" && <Home profile={profile.id} onOpen={open} onGoAddons={() => setView({ name: "addons" })} />}
        {(view.name === "movies" || view.name === "shows") && <Room profile={profile.id} room={view.name} onOpen={open} onGoSettings={() => setView({ name: "settings" })} />}
        {view.name === "discover" && <Discover profile={profile.id} onOpen={open} onError={showError} />}
        {view.name === "search" && <Search profile={profile.id} onOpen={open} />}
        {view.name === "library" && <Library profile={profile.id} onOpen={open} />}
        {view.name === "calendar" && <Calendar profile={profile.id} onOpen={open} />}
        {view.name === "downloads" && <Downloads profile={profile.id} onError={showError} />}
        {view.name === "live" && <LiveTV profile={profile.id} onError={showError} onGoSources={() => setView({ name: "addons" })} />}
        {view.name === "addons" && (
          <>
            <Addons profile={profile.id} onError={setToast} />
            <Sources profile={profile.id} onError={showError} onSaved={() => setToast("Saved")} />
          </>
        )}
        {view.name === "settings" && (
          <>
            <Accounts profile={profile.id} onError={showError} />
            <StreamPrefs profile={profile.id} onSaved={() => setToast("Saved")} />
            <PlayerSettings profile={profile.id} onSaved={() => setToast("Saved")} />
            <PlaybackSettings profile={profile.id} onSaved={() => setToast("Saved")} />
            <SubtitleSettings profile={profile.id} onSaved={() => setToast("Saved")} />
            <StremioAccount profile={profile.id} onError={showError} onSaved={() => setToast("Imported")} />
            <MetadataKeys profile={profile.id} onSaved={() => setToast("Saved")} onError={showError} />
            <Hotkeys profile={profile.id} onSaved={() => setToast("Saved")} />
            <TorrentSettings profile={profile.id} onSaved={() => setToast("Saved")} />
            <Settings profile={profile.id} onSaved={() => setToast("Saved")} />
            <UpdateSettings />
            <ManageProfiles current={profile} onError={showError} onChanged={() => api.profiles().then((ps) => setProfile(ps.find((p) => p.id === profile.id) ?? profile))} />
          </>
        )}
        {view.name === "detail" && <Detail profile={profile.id} item={view.item} onError={setToast} onToast={setToast} />}
      </main>
      <PlayerView
        profile={profile.id}
        onClose={() => undefined}
        onError={setToast}
        onNextEpisode={() => loadPlayerPrefs(profile.id).then((p) => p.autoNext && playNextEpisode(profile.id)).catch((e) => setToast(errText(e)))}
      />
      <UpdateBanner />
      {toast && <div className="toast" role="status">{toast}</div>}
    </div>
  );
}

function Home({ profile, onOpen, onGoAddons }: { profile: number; onOpen: (m: MetaPreview) => void; onGoAddons: () => void }) {
  const [rows, setRows] = useState<CatalogRow[] | null>(null);
  const [cw, setCw] = useState<Progress[]>([]);
  const [hasAddons, setHasAddons] = useState(true);

  useEffect(() => {
    api.addons(profile).then((a) => setHasAddons(a.length > 0));
    api.continueWatching(profile).then(setCw);
    api.homeRows(profile).then(setRows).catch(() => setRows([]));
  }, [profile]);

  if (!hasAddons) {
    return (
      <div className="empty">
        <h2>Nothing here yet</h2>
        <p className="muted">Argus has no built-in content. Add the addons, debrid account, media server or playlists you already use.</p>
        <button className="primary" onClick={onGoAddons}>Add sources</button>
      </div>
    );
  }
  return (
    <>
      {cw.length > 0 && (
        <section>
          <h3>Continue watching</h3>
          <div className="row">
            {cw.map((p) => (
              <div key={p.item_id} className="cw">
                <Poster item={{ id: p.item_id, type: p.kind, name: p.name, poster: p.poster }} onOpen={onOpen} />
                <div className="bar"><div style={{ width: `${(p.position_s / p.duration_s) * 100}%` }} /></div>
              </div>
            ))}
          </div>
        </section>
      )}
      {rows === null && <div className="muted">Loading catalogs…</div>}
      {rows?.map((r) => (
        <section key={`${r.addon}/${r.kind}/${r.id}`}>
          <h3>{r.title} <span className="muted small">{r.kind} · {r.addon}</span></h3>
          <div className="row">{r.items.map((m) => <Poster key={m.id} item={m} onOpen={onOpen} />)}</div>
        </section>
      ))}
    </>
  );
}

function Search({ profile, onOpen }: { profile: number; onOpen: (m: MetaPreview) => void }) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<MetaPreview[]>([]);
  const [busy, setBusy] = useState(false);

  // Debounced so typing never fires a request per keystroke.
  useEffect(() => {
    const query = q.trim();
    if (query.length < 2) return setResults([]);
    setBusy(true);
    const t = setTimeout(() => api.search(profile, query).then(setResults).finally(() => setBusy(false)), 300);
    return () => clearTimeout(t);
  }, [q, profile]);

  return (
    <>
      <input className="search" autoFocus placeholder="Search movies, series, channels…" value={q} onChange={(e) => setQ(e.target.value)} />
      {busy && <div className="muted">Searching…</div>}
      <div className="grid">{results.map((m) => <Poster key={`${m.type}/${m.id}`} item={m} onOpen={onOpen} />)}</div>
    </>
  );
}

function Detail({ profile, item, onError, onToast }: { profile: number; item: MetaPreview; onError: (s: string) => void; onToast: (s: string) => void }) {
  const [meta, setMeta] = useState<Meta | null>(null);
  const [videoId, setVideoId] = useState<string | null>(item.type === "movie" ? item.id : null);
  const [streams, setStreams] = useState<RankedStream[] | null>(null);
  const [playing, setPlaying] = useState<number | null>(null);
  const [watched, setWatched] = useState<Set<string>>(new Set());
  const [autoplay, setAutoplay] = useState(false);
  const [picked, setPicked] = useState(false);
  const [ratings, setRatings] = useState<Ratings | null>(null);
  useEffect(() => { setRatings(null); api.ratings(profile, item.id).then(setRatings).catch(() => {}); }, [profile, item.id]);
  useEffect(() => { api.watchedVideos(profile, item.id).then((l) => setWatched(new Set(l))).catch(() => {}); }, [profile, item.id, playing]);
  const mark = (ids: string[], on: boolean) =>
    api.setWatched(profile, item.id, ids, on).then(() => setWatched((w) => { const n = new Set(w); ids.forEach((i) => (on ? n.add(i) : n.delete(i))); return n; })).catch((e) => onError(errText(e)));
  useEffect(() => { api.getSetting(profile, AUTOPLAY_KEY).then((v) => setAutoplay(v === "on")); }, [profile]);

  useEffect(() => {
    api.meta(profile, item.type, item.id).then(setMeta).catch(() => setMeta({ ...item }));
  }, [profile, item]);

  useEffect(() => {
    if (!videoId) return;
    setStreams(null);
    api.streams(profile, item.type, videoId).then(setStreams).catch((e) => onError(errText(e)));
  }, [profile, item.type, videoId, onError]);

  const stage = useSyncExternalStore(playStage.subscribe, playStage.get);
  const play = useCallback(async (i: number) => {
    if (!streams || !videoId) return;
    setPlaying(i);
    try {
      await startPlayback(profile, { item, videoId }, streams, i);
    } catch (e) {
      onError(errText(e));
    } finally {
      setPlaying(null);
    }
  }, [profile, onError, streams, videoId, item]);

  // Picking an episode with auto-play on starts the top-ranked stream.
  useEffect(() => {
    if (picked && autoplay && streams?.length) { setPicked(false); play(0); }
  }, [picked, autoplay, streams, play]);

  const m = meta ?? item;
  const seasons = new Map<number, Video[]>();
  meta?.videos?.forEach((v) => {
    const s = v.season ?? 0;
    seasons.set(s, [...(seasons.get(s) ?? []), v]);
  });

  return (
    <div className="detail">
      {m.background && <div className="backdrop" style={{ backgroundImage: `url(${m.background})` }} />}
      <h1>{m.name}</h1>
      <div className="actions">
        <LibraryButton profile={profile} item={m} />
        {item.type === "movie" && <button onClick={() => mark([item.id], !watched.has(item.id))}>{watched.has(item.id) ? "✓ Watched" : "Mark watched"}</button>}
      </div>
      <div className="muted">{[m.releaseInfo, meta?.runtime, m.imdbRating && `IMDb ${m.imdbRating}`].filter(Boolean).join(" · ")}</div>
      {ratings && (
        <div className="ratings">
          {ratings.imdb && <span className="chip">IMDb {ratings.imdb}</span>}
          {ratings.rottenTomatoes && <span className="chip">🍅 {ratings.rottenTomatoes}</span>}
          {ratings.metascore && <span className="chip">Metascore {ratings.metascore}</span>}
          {ratings.awards && <span className="small muted">{ratings.awards}</span>}
        </div>
      )}
      {m.description && <p className="desc">{m.description}</p>}
      {[...seasons.entries()].sort(([a], [b]) => a - b).map(([s, eps]) => (
        <details key={s} open={s === 1}>
          <summary>
            {s === 0 ? "Specials" : `Season ${s}`} <span className="small muted">{eps.filter((v) => watched.has(v.id)).length}/{eps.length} watched</span>
          </summary>
          <button className="link" onClick={() => { const all = eps.every((v) => watched.has(v.id)); mark(eps.map((v) => v.id), !all); }}>
            {eps.every((v) => watched.has(v.id)) ? "Mark season unwatched" : "Mark season watched"}
          </button>
          {eps.map((v) => (
            <div key={v.id} className="ep-row">
              <button className={`${videoId === v.id ? "ep active" : "ep"}${watched.has(v.id) ? " watched" : ""}`} onClick={() => { setVideoId(v.id); setPicked(true); }}>
                {watched.has(v.id) && <span className="check-mark">✓</span>}{v.episode ? `${v.episode}. ` : ""}{v.title}
              </button>
              <button className="small" title={watched.has(v.id) ? "Mark unwatched" : "Mark watched"} onClick={() => mark([v.id], !watched.has(v.id))}>{watched.has(v.id) ? "Unwatch" : "Watched"}</button>
            </div>
          ))}
        </details>
      ))}
      {videoId && (
        <section>
          <h3>Streams</h3>
          {streams === null && <div className="muted">Asking your addons…</div>}
          {playing !== null && stage && <div className="muted" role="status">{stage}</div>}
          {streams?.length === 0 && <div className="muted">No addon returned a stream for this title.</div>}
          {!!streams?.length && (
            <button className="primary play-best" disabled={playing !== null} onClick={() => play(0)}>
              ▶ Play best · {badges(streams[0].info).slice(0, 3).join(" · ") || streams[0].stream.origin}
            </button>
          )}
          {streams?.map(({ stream: s, info }, i) => (
            <div key={i} className="stream-row">
              <button className="stream" disabled={playing !== null} onClick={() => play(i)}>
                <span className="badges">{badges(info).map((b) => <span key={b} className="badge">{b}</span>)}</span>
                <strong>{s.name ?? s.origin}</strong>
                <span className="muted">{s.description}</span>
                <span className="small muted">{s.origin}{s.infoHash && info.cached !== true ? " · P2P" : ""}{playing === i ? " · opening…" : ""}</span>
              </button>
              {s.origin !== "Downloads" && (
                <button className="dl" title="Download for offline" onClick={() => videoId && invoke("download_start", {
                  profile,
                  item: { itemId: item.id, videoId, kind: item.type, name: meta?.name ?? item.name, poster: item.poster },
                  stream: s,
                }).then(() => onToast("Downloading — see Downloads")).catch((e) => onError(errText(e)))}>⬇</button>
              )}
            </div>
          ))}
        </section>
      )}
    </div>
  );
}

const HDR_LABEL: Record<StreamInfo["hdr"], string | null> = { none: null, hlg: "HLG", hdr10: "HDR10", hdr10plus: "HDR10+", dolbyvision: "Dolby Vision" };

/** Facts shown on a stream card so users can choose before pressing play. */
function badges(i: StreamInfo): string[] {
  const gb = i.sizeBytes ? `${(i.sizeBytes / 2 ** 30).toFixed(1)} GB` : null;
  return [
    i.cached ? "⚡ Instant" : null,
    i.resolution ? (i.resolution >= 2160 ? "4K" : `${i.resolution}p`) : null,
    HDR_LABEL[i.hdr],
    i.codec !== "other" ? i.codec.toUpperCase() : null,
    i.release === "remux" ? "REMUX" : null,
    [i.audio, i.channels].filter(Boolean).join(" ") || null,
    gb,
    i.seeders != null && !i.cached ? `${i.seeders} seeds` : null,
  ].filter((b): b is string => !!b);
}

function Addons({ profile, onError }: { profile: number; onError: (s: string) => void }) {
  const [list, setList] = useState<Addon[]>([]);
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const refresh = useCallback(() => api.addons(profile).then(setList), [profile]);
  useEffect(() => { refresh(); }, [refresh]);

  const install = async (u: string) => {
    setBusy(true);
    try {
      await api.installAddon(profile, u);
      setUrl("");
      await refresh();
    } catch (e) {
      onError(errText(e));
    } finally {
      setBusy(false);
    }
  };
  const move = async (i: number, d: -1 | 1) => {
    const next = [...list];
    [next[i], next[i + d]] = [next[i + d], next[i]];
    setList(next);
    await api.reorderAddons(profile, next.map((a) => a.base_url));
  };

  return (
    <>
      <h2>Addons</h2>
      <p className="muted">Paste a Stremio-compatible addon URL. Order sets priority for metadata.</p>
      <form className="inline" onSubmit={(e) => { e.preventDefault(); if (url.trim()) install(url); }}>
        <input placeholder="https://…/manifest.json" value={url} onChange={(e) => setUrl(e.target.value)} />
        <button className="primary" disabled={busy}>{busy ? "Installing…" : "Install"}</button>
      </form>
      {!list.some((a) => a.manifest.id === "com.linvo.cinemeta") && (
        <button className="link" disabled={busy} onClick={() => install(CINEMETA_URL)}>+ Add Cinemeta (movie and series info, no streams)</button>
      )}
      <ul className="addons">
        {list.map((a, i) => (
          <li key={a.base_url}>
            {a.manifest.logo && <img src={a.manifest.logo} alt="" />}
            <div>
              <strong>{a.manifest.name}</strong> <span className="small muted">v{a.manifest.version}</span>
              <div className="small muted">{a.manifest.description}</div>
            </div>
            <button disabled={i === 0} onClick={() => move(i, -1)} aria-label="Move up">↑</button>
            <button disabled={i === list.length - 1} onClick={() => move(i, 1)} aria-label="Move down">↓</button>
            <button onClick={() => api.removeAddon(profile, a.base_url).then(refresh)}>Remove</button>
          </li>
        ))}
      </ul>
    </>
  );
}

const SETTINGS = [
  { key: "debrid.realdebrid.key", label: "Real-Debrid API key (or sign in above)", type: "password", hint: "real-debrid.com/apitoken" },
  { key: "debrid.premiumize.key", label: "Premiumize API key", type: "password", hint: "premiumize.me/account" },
  { key: "debrid.torbox.key", label: "TorBox API key", type: "password", hint: "torbox.app/settings" },
  { key: "player.mode", label: "Player", type: "text", hint: "builtin (default) or external" },
  { key: "player.external", label: "External player app", type: "text", hint: "IINA, VLC, Infuse, or empty for system default" },
] as const;

function Settings({ profile, onSaved }: { profile: number; onSaved: () => void }) {
  const [values, setValues] = useState<Record<string, string>>({});
  useEffect(() => {
    Promise.all(SETTINGS.map((s) => api.getSetting(profile, s.key))).then((v) =>
      setValues(Object.fromEntries(SETTINGS.map((s, i) => [s.key, v[i] ?? ""]))),
    );
  }, [profile]);

  return (
    <form className="settings" onSubmit={async (e) => {
      e.preventDefault();
      await Promise.all(SETTINGS.map((s) => api.setSetting(profile, s.key, values[s.key] ?? "")));
      onSaved();
    }}>
      <h2>Settings</h2>
      {SETTINGS.map((s) => (
        <label key={s.key}>
          {s.label}
          <input type={s.type} placeholder={s.hint} value={values[s.key] ?? ""} onChange={(e) => setValues({ ...values, [s.key]: e.target.value })} />
        </label>
      ))}
      <button className="primary">Save</button>
    </form>
  );
}
