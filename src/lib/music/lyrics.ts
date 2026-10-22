import { invoke } from "@tauri-apps/api/core";
import { fetch as httpFetch } from "@tauri-apps/plugin-http";
import { parseLrc } from "./lrc";
import type { LyricLine, Track } from "./types";

export type Lyrics = { lines: LyricLine[]; synced: boolean; source: "file" | "lrclib" };

const memo = new Map<string, Promise<Lyrics | null>>();

async function fromLrclib(track: Track): Promise<string | null> {
  const q = new URLSearchParams({
    track_name: track.title,
    artist_name: track.artist,
    album_name: track.album,
    duration: String(Math.round(track.durationMs / 1000)),
  });
  const res = await httpFetch(`https://lrclib.net/api/get?${q}`, {
    headers: { "Lrclib-Client": "Argus" },
  });
  if (!res.ok) return null;
  const body = (await res.json()) as { syncedLyrics?: string | null; plainLyrics?: string | null };
  return body.syncedLyrics || body.plainLyrics || null;
}

async function resolve(track: Track, online: boolean): Promise<Lyrics | null> {
  const local = await invoke<string | null>("music_lyrics", { path: track.path, id: track.id });
  if (local) return { ...parseLrc(local), source: "file" };
  if (!online || !track.artist) return null;
  try {
    const text = await fromLrclib(track);
    if (!text) return null;
    void invoke("music_lyrics_store", { id: track.id, text }).catch(() => {});
    return { ...parseLrc(text), source: "lrclib" };
  } catch {
    return null;
  }
}

/** Local `.lrc`/embedded lyrics first; LRCLIB lookup only when `online` (opt-in setting). */
export function getLyrics(track: Track, online: boolean): Promise<Lyrics | null> {
  const key = `${track.id}:${online ? 1 : 0}`;
  let hit = memo.get(key);
  if (!hit) {
    hit = resolve(track, online);
    memo.set(key, hit);
  }
  return hit;
}
