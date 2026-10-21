import { useCallback, useEffect, useState } from "react";
import { PlayerView } from "./PlayerView";
import { startPlayerEvents } from "./player";
import { play as startPlayback, playNextEpisode } from "./playback";
import { api, CINEMETA_URL, type Addon, type CatalogRow, type Meta, type MetaPreview, type Profile, type Progress, type RankedStream, type StreamInfo, type Video } from "./api";

type View = { name: "home" | "search" | "addons" | "settings" } | { name: "detail"; item: MetaPreview };

function errText(e: unknown) {
  return typeof e === "string" ? e : e instanceof Error ? e.message : "Something went wrong";
}

export default function App() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [view, setView] = useState<View>({ name: "home" });
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    startPlayerEvents();
    api.profiles().then((p) => setProfile(p[0] ?? null)).catch((e) => setToast(errText(e)));
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  if (!profile) return <div className="center muted">Loading…</div>;
  const open = (item: MetaPreview) => setView({ name: "detail", item });
  const nav = (["home", "search", "addons", "settings"] as const).map((n) => (
    <button key={n} className={view.name === n ? "nav active" : "nav"} onClick={() => setView({ name: n })}>
      {n[0].toUpperCase() + n.slice(1)}
    </button>
  ));

  return (
    <div className="app">
      <aside className="sidebar" data-tauri-drag-region>
        <div className="brand">Argus</div>
        {nav}
        <div className="profile muted">{profile.name}</div>
      </aside>
      <main className="content">
        {view.name === "home" && <Home profile={profile.id} onOpen={open} onGoAddons={() => setView({ name: "addons" })} />}
        {view.name === "search" && <Search profile={profile.id} onOpen={open} />}
        {view.name === "addons" && <Addons profile={profile.id} onError={setToast} />}
        {view.name === "settings" && <Settings profile={profile.id} onSaved={() => setToast("Saved")} />}
        {view.name === "detail" && <Detail profile={profile.id} item={view.item} onError={setToast} />}
      </main>
      <PlayerView
        profile={profile.id}
        onClose={() => undefined}
        onError={setToast}
        onNextEpisode={() => playNextEpisode(profile.id).catch((e) => setToast(errText(e)))}
      />
      {toast && <div className="toast" role="status">{toast}</div>}
    </div>
  );
}

function Poster({ item, onOpen }: { item: MetaPreview; onOpen: (m: MetaPreview) => void }) {
  return (
    <button className="poster" onClick={() => onOpen(item)} title={item.name}>
      {item.poster ? <img src={item.poster} alt="" loading="lazy" decoding="async" /> : <div className="poster-fallback">{item.name}</div>}
      <span className="poster-name">{item.name}</span>
    </button>
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

function Detail({ profile, item, onError }: { profile: number; item: MetaPreview; onError: (s: string) => void }) {
  const [meta, setMeta] = useState<Meta | null>(null);
  const [videoId, setVideoId] = useState<string | null>(item.type === "movie" ? item.id : null);
  const [streams, setStreams] = useState<RankedStream[] | null>(null);
  const [playing, setPlaying] = useState<number | null>(null);

  useEffect(() => {
    api.meta(profile, item.type, item.id).then(setMeta).catch(() => setMeta({ ...item }));
  }, [profile, item]);

  useEffect(() => {
    if (!videoId) return;
    setStreams(null);
    api.streams(profile, item.type, videoId).then(setStreams).catch((e) => onError(errText(e)));
  }, [profile, item.type, videoId, onError]);

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
      <div className="muted">{[m.releaseInfo, meta?.runtime, m.imdbRating && `IMDb ${m.imdbRating}`].filter(Boolean).join(" · ")}</div>
      {m.description && <p className="desc">{m.description}</p>}
      {[...seasons.entries()].sort(([a], [b]) => a - b).map(([s, eps]) => (
        <details key={s} open={s === 1}>
          <summary>{s === 0 ? "Specials" : `Season ${s}`}</summary>
          {eps.map((v) => (
            <button key={v.id} className={videoId === v.id ? "ep active" : "ep"} onClick={() => setVideoId(v.id)}>
              {v.episode ? `${v.episode}. ` : ""}{v.title}
            </button>
          ))}
        </details>
      ))}
      {videoId && (
        <section>
          <h3>Streams</h3>
          {streams === null && <div className="muted">Asking your addons…</div>}
          {streams?.length === 0 && <div className="muted">No addon returned a stream for this title.</div>}
          {streams?.map(({ stream: s, info }, i) => (
            <button key={i} className="stream" disabled={playing !== null} onClick={() => play(i)}>
              <span className="badges">{badges(info).map((b) => <span key={b} className="badge">{b}</span>)}</span>
              <strong>{s.name ?? s.origin}</strong>
              <span className="muted">{s.description}</span>
              <span className="small muted">{s.origin}{s.infoHash && info.cached !== true ? " · needs debrid" : ""}{playing === i ? " · opening…" : ""}</span>
            </button>
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
  { key: "debrid.realdebrid.key", label: "Real-Debrid API key", type: "password", hint: "real-debrid.com/apitoken" },
  { key: "debrid.alldebrid.key", label: "AllDebrid API key", type: "password", hint: "alldebrid.com/apikeys" },
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
