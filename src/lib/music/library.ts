import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { useSyncExternalStore } from "react";
import type { Album, Artist, Track } from "./types";

type LibraryState = {
  tracks: Track[];
  loaded: boolean;
  scanning: boolean;
  scanned: number;
  error: string | null;
};

const isTauri = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

let state: LibraryState = { tracks: [], loaded: false, scanning: false, scanned: 0, error: null };
const listeners = new Set<() => void>();

function set(patch: Partial<LibraryState>): void {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
}

export function useMusicLibrary(): LibraryState {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => state,
  );
}

export function getMusicTracks(): Track[] {
  return state.tracks;
}

export async function loadMusicIndex(): Promise<void> {
  if (!isTauri || state.loaded) return;
  try {
    set({ tracks: await invoke<Track[]>("music_index"), loaded: true });
  } catch (e) {
    set({ loaded: true, error: String(e) });
  }
}

export async function scanMusicFolders(folders: string[]): Promise<void> {
  if (!isTauri || state.scanning) return;
  set({ scanning: true, scanned: 0, error: null });
  const unlisten = await listen<{ scanned: number }>("music://scan", (e) =>
    set({ scanned: e.payload.scanned }),
  );
  try {
    set({ tracks: await invoke<Track[]>("music_scan", { folders }), loaded: true });
  } catch (e) {
    set({ error: String(e) });
  } finally {
    unlisten();
    set({ scanning: false });
  }
}

const covers = new Map<string, Promise<string | null>>();

/** Cover art as a data URL, cached per album folder so a shelf of tracks loads it once. */
export function getCover(track: Track): Promise<string | null> {
  const key = track.album ? `${track.albumArtist || track.artist}\u0000${track.album}` : track.path;
  let hit = covers.get(key);
  if (!hit) {
    hit = invoke<string | null>("music_cover", { path: track.path }).catch(() => null);
    covers.set(key, hit);
  }
  return hit;
}

/** Peak envelope (0..1) for waveform views; backed by the shared Rust decoder. */
export function waveformPeaks(path: string, buckets: number): Promise<number[]> {
  return invoke<number[]>("music_peaks", { path, buckets });
}

const collator = new Intl.Collator(undefined, { sensitivity: "base", numeric: true });

export function sortTracks(tracks: Track[]): Track[] {
  return [...tracks].sort(
    (a, b) =>
      collator.compare(a.albumArtist || a.artist, b.albumArtist || b.artist) ||
      collator.compare(a.album, b.album) ||
      a.discNo - b.discNo ||
      a.trackNo - b.trackNo ||
      collator.compare(a.title, b.title),
  );
}

export function groupAlbums(tracks: Track[]): Album[] {
  const map = new Map<string, Album>();
  for (const t of sortTracks(tracks)) {
    const artist = t.albumArtist || t.artist || "Unknown artist";
    const title = t.album || "Unknown album";
    const key = `${artist}\u0000${title}`;
    let a = map.get(key);
    if (!a) {
      a = { key, title, artist, year: t.year, tracks: [], durationMs: 0 };
      map.set(key, a);
    }
    a.tracks.push(t);
    a.durationMs += t.durationMs;
    if (!a.year) a.year = t.year;
  }
  return [...map.values()];
}

export function groupArtists(albums: Album[]): Artist[] {
  const map = new Map<string, Artist>();
  for (const a of albums) {
    let ar = map.get(a.artist);
    if (!ar) {
      ar = { name: a.artist, albums: [], trackCount: 0 };
      map.set(a.artist, ar);
    }
    ar.albums.push(a);
    ar.trackCount += a.tracks.length;
  }
  return [...map.values()].sort((a, b) => collator.compare(a.name, b.name));
}

export function formatDuration(ms: number): string {
  const s = Math.max(0, Math.round(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = String(s % 60).padStart(2, "0");
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${sec}` : `${m}:${sec}`;
}
