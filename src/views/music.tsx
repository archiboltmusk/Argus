import { Disc3, FolderPlus, ListMusic, Music, RefreshCw, Search, Users } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useT } from "@/lib/i18n";
import {
  groupAlbums,
  groupArtists,
  loadMusicIndex,
  scanMusicFolders,
  sortTracks,
  useMusicLibrary,
} from "@/lib/music/library";
import { currentTrack, enqueue, playTracks, usePlayer } from "@/lib/music/player";
import type { Album, Track } from "@/lib/music/types";
import { useSettings } from "@/lib/settings";
import { useView } from "@/lib/view";
import { Cover } from "./music/cover";
import { LyricsPanel } from "./music/lyrics-panel";
import { NowPlayingBar } from "./music/now-playing-bar";
import { PlaylistsTab } from "./music/playlists-tab";
import { QueueTab } from "./music/queue-tab";
import { AddToPlaylist, TrackList } from "./music/track-list";

type Tab = "songs" | "albums" | "artists" | "playlists" | "queue";

const TABS: Array<{ id: Tab; label: string; icon: typeof Music }> = [
  { id: "songs", label: "Songs", icon: Music },
  { id: "albums", label: "Albums", icon: Disc3 },
  { id: "artists", label: "Artists", icon: Users },
  { id: "playlists", label: "Playlists", icon: ListMusic },
  { id: "queue", label: "Queue", icon: ListMusic },
];

function AlbumGrid({ albums, onOpen }: { albums: Album[]; onOpen: (a: Album) => void }) {
  const t = useT();
  return (
    <div className="grid min-h-0 flex-1 grid-cols-[repeat(auto-fill,minmax(150px,1fr))] content-start gap-4 overflow-y-auto pb-4">
      {albums.map((a) => (
        <div key={a.key} className="group flex flex-col gap-2">
          <button type="button" onClick={() => onOpen(a)} className="text-start">
            <Cover track={a.tracks[0]} className="aspect-square w-full" />
          </button>
          <div className="flex min-w-0 items-start justify-between gap-1">
            <button type="button" onClick={() => onOpen(a)} className="flex min-w-0 flex-col text-start">
              <span className="truncate text-[13.5px] font-semibold text-ink">{a.title}</span>
              <span className="truncate text-[12px] text-ink-subtle">
                {a.artist}
                {a.year ? ` · ${a.year}` : ""}
              </span>
            </button>
            <div className="flex opacity-0 group-hover:opacity-100">
              <button
                type="button"
                title={t("Add to queue")}
                onClick={() => enqueue(a.tracks)}
                className="rounded-md px-1.5 py-1 text-[11px] font-semibold text-ink-subtle hover:bg-elevated hover:text-ink"
              >
                {t("Queue")}
              </button>
              <AddToPlaylist trackIds={a.tracks.map((x) => x.id)} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function MusicView({ active }: { active: boolean }) {
  const t = useT();
  const { settings } = useSettings();
  const { setView } = useView();
  const lib = useMusicLibrary();
  const player = usePlayer();
  const [tab, setTab] = useState<Tab>("songs");
  const [query, setQuery] = useState("");
  const [album, setAlbum] = useState<Album | null>(null);
  const [artist, setArtist] = useState<string | null>(null);
  const [lyricsOpen, setLyricsOpen] = useState(false);

  useEffect(() => {
    if (active) void loadMusicIndex();
  }, [active]);

  const folders = settings.musicFolders;
  const all = useMemo(() => sortTracks(lib.tracks), [lib.tracks]);
  const albums = useMemo(() => groupAlbums(lib.tracks), [lib.tracks]);
  const artists = useMemo(() => groupArtists(albums), [albums]);

  const q = query.trim().toLowerCase();
  const songs = useMemo(
    () =>
      q ? all.filter((x: Track) => `${x.title} ${x.artist} ${x.album}`.toLowerCase().includes(q)) : all,
    [all, q],
  );
  const shownAlbums = useMemo(
    () => (q ? albums.filter((a) => `${a.title} ${a.artist}`.toLowerCase().includes(q)) : albums),
    [albums, q],
  );
  const artistAlbums = artist ? (artists.find((a) => a.name === artist)?.albums ?? []) : [];
  const now = currentTrack(player);

  const switchTab = (next: Tab) => {
    setTab(next);
    setAlbum(null);
    setArtist(null);
  };

  const body = () => {
    if (tab === "playlists") return <PlaylistsTab tracks={lib.tracks} />;
    if (tab === "queue") return <QueueTab />;
    if (album) {
      return (
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="mb-3 flex items-center gap-4">
            <Cover track={album.tracks[0]} className="h-28 w-28" />
            <div className="flex min-w-0 flex-col gap-1">
              <button type="button" onClick={() => setAlbum(null)} className="text-start text-[12px] font-semibold text-ink-subtle hover:text-ink">
                ← {t("Back")}
              </button>
              <h2 className="truncate text-[22px] font-semibold text-ink">{album.title}</h2>
              <span className="text-[13px] text-ink-subtle">
                {album.artist}
                {album.year ? ` · ${album.year}` : ""} · {t("{n} tracks", { n: album.tracks.length })}
              </span>
              <button
                type="button"
                onClick={() => playTracks(album.tracks)}
                className="mt-1 w-fit rounded-full bg-accent px-4 py-1.5 text-[12.5px] font-semibold text-canvas"
              >
                {t("Play")}
              </button>
            </div>
          </div>
          <TrackList tracks={album.tracks} showAlbum={false} />
        </div>
      );
    }
    if (tab === "albums") return <AlbumGrid albums={shownAlbums} onOpen={setAlbum} />;
    if (tab === "artists") {
      if (artist) {
        return (
          <div className="flex min-h-0 flex-1 flex-col gap-3">
            <button type="button" onClick={() => setArtist(null)} className="w-fit text-[12px] font-semibold text-ink-subtle hover:text-ink">
              ← {t("Back")}
            </button>
            <h2 className="text-[22px] font-semibold text-ink">{artist}</h2>
            <AlbumGrid albums={artistAlbums} onOpen={setAlbum} />
          </div>
        );
      }
      const list = q ? artists.filter((a) => a.name.toLowerCase().includes(q)) : artists;
      return (
        <ul className="min-h-0 flex-1 overflow-y-auto">
          {list.map((a) => (
            <li key={a.name}>
              <button
                type="button"
                onClick={() => setArtist(a.name)}
                className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-start hover:bg-elevated/60"
              >
                <Cover track={a.albums[0].tracks[0]} className="h-10 w-10 !rounded-full" />
                <span className="flex min-w-0 flex-col">
                  <span className="truncate text-[14px] text-ink">{a.name}</span>
                  <span className="text-[12px] text-ink-subtle">
                    {t("{n} albums", { n: a.albums.length })} · {t("{n} tracks", { n: a.trackCount })}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      );
    }
    return <TrackList tracks={songs} />;
  };

  const empty = lib.loaded && lib.tracks.length === 0 && !lib.scanning;

  return (
    <main className="flex h-full flex-1 flex-col overflow-hidden bg-canvas pt-24 lg:pt-28">
      <div className="mx-auto flex min-h-0 w-full max-w-5xl flex-1 flex-col px-5 sm:px-8">
        <header className="mb-4 flex flex-wrap items-center gap-3">
          <h1 className="me-auto text-[28px] font-semibold tracking-tight text-ink">{t("Music")}</h1>
          <label className="flex items-center gap-2 rounded-lg border border-edge-soft bg-elevated/50 px-2.5 py-1.5 text-ink-subtle">
            <Search size={14} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("Search music")}
              className="w-44 bg-transparent text-[13px] text-ink outline-none"
            />
          </label>
          <button
            type="button"
            disabled={lib.scanning || folders.length === 0}
            onClick={() => void scanMusicFolders(folders)}
            title={t("Rescan folders")}
            className="flex items-center gap-1.5 rounded-lg border border-edge-soft px-3 py-1.5 text-[12.5px] font-semibold text-ink-muted hover:text-ink disabled:opacity-50"
          >
            <RefreshCw size={14} className={lib.scanning ? "animate-spin" : ""} />
            {lib.scanning ? t("Scanning {n}", { n: lib.scanned }) : t("Rescan")}
          </button>
        </header>
        <nav className="mb-4 flex gap-1 border-b border-edge-soft">
          {TABS.map((x) => (
            <button
              key={x.id}
              type="button"
              onClick={() => switchTab(x.id)}
              className={`-mb-px border-b-2 px-3 py-2 text-[13.5px] font-semibold transition-colors ${
                tab === x.id ? "border-accent text-ink" : "border-transparent text-ink-subtle hover:text-ink"
              }`}
            >
              {t(x.label)}
            </button>
          ))}
        </nav>
        {empty && tab !== "playlists" && tab !== "queue" ? (
          <div className="flex flex-col items-center gap-4 rounded-[20px] border border-dashed border-edge-soft bg-elevated/30 px-8 py-16 text-center">
            <FolderPlus size={26} className="text-ink-subtle" />
            <p className="max-w-sm text-[13.5px] leading-relaxed text-ink-muted">
              {folders.length === 0
                ? t("Add a music folder in Settings to build your library. Files stay where they are.")
                : t("No audio files found in your music folders.")}
            </p>
            {folders.length === 0 ? (
              <button type="button" onClick={() => setView("settings")} className="rounded-full bg-accent px-4 py-1.5 text-[12.5px] font-semibold text-canvas">
                {t("Open Settings")}
              </button>
            ) : (
              <button type="button" onClick={() => void scanMusicFolders(folders)} className="rounded-full bg-accent px-4 py-1.5 text-[12.5px] font-semibold text-canvas">
                {t("Scan now")}
              </button>
            )}
          </div>
        ) : (
          <div className="flex min-h-0 flex-1 gap-4">
            <div className="flex min-h-0 min-w-0 flex-1 flex-col">{body()}</div>
            {lyricsOpen && (
              <aside className="hidden w-80 shrink-0 overflow-hidden rounded-2xl border border-edge-soft bg-elevated/30 lg:flex lg:flex-col">
                <LyricsPanel track={now} position={player.position} online={settings.musicOnlineLyrics} />
              </aside>
            )}
          </div>
        )}
        {lib.error && <p className="py-2 text-[12px] text-red-400">{lib.error}</p>}
      </div>
      <NowPlayingBar
        lyricsOpen={lyricsOpen}
        onLyrics={() => setLyricsOpen((v) => !v)}
        onQueue={() => switchTab("queue")}
      />
    </main>
  );
}
