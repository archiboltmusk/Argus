import type { MusicTrack } from "./types";

export type SleepTimerMode = "off" | "track" | 15 | 30 | 60;

export interface ListeningReplayStats {
  totalPlays: number;
  totalMinutes: number;
  topArtists: Array<{ name: string; count: number }>;
  topTracks: Array<{ title: string; artist: string; count: number }>;
}

const STATS_KEY = "argus.music.replay.stats.v1";

export function recordReplayPlay(track: MusicTrack | null | undefined): void {
  if (!track) return;
  try {
    const raw = localStorage.getItem(STATS_KEY);
    const data = raw
      ? (JSON.parse(raw) as { plays: Array<{ title: string; artist: string; dur: number; at: number }> })
      : { plays: [] };
    data.plays.unshift({
      title: track.title,
      artist: track.artist || "Unknown Artist",
      dur: Number(track.durationSeconds) || 210,
      at: Date.now(),
    });
    data.plays = data.plays.slice(0, 500);
    localStorage.setItem(STATS_KEY, JSON.stringify(data));
  } catch {}
}

export function getListeningReplayStats(): ListeningReplayStats {
  try {
    const raw = localStorage.getItem(STATS_KEY);
    if (!raw) return { totalPlays: 0, totalMinutes: 0, topArtists: [], topTracks: [] };
    const { plays } = JSON.parse(raw) as {
      plays: Array<{ title: string; artist: string; dur: number; at: number }>;
    };
    const artistMap = new Map<string, number>();
    const trackMap = new Map<string, { title: string; artist: string; count: number }>();
    let totalSec = 0;
    for (const p of plays) {
      totalSec += p.dur || 0;
      artistMap.set(p.artist, (artistMap.get(p.artist) ?? 0) + 1);
      const k = `${p.title}::${p.artist}`;
      const cur = trackMap.get(k);
      trackMap.set(k, cur ? { ...cur, count: cur.count + 1 } : { title: p.title, artist: p.artist, count: 1 });
    }
    const topArtists = [...artistMap.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }));
    const topTracks = [...trackMap.values()].sort((a, b) => b.count - a.count).slice(0, 5);
    return {
      totalPlays: plays.length,
      totalMinutes: Math.round(totalSec / 60),
      topArtists,
      topTracks,
    };
  } catch {
    return { totalPlays: 0, totalMinutes: 0, topArtists: [], topTracks: [] };
  }
}

/** Spotube-style query builder for matching a Spotify track onto YouTube Music / Hi-Res sources. */
export function buildSpotubeMatchQuery(title: string, artist: string): string {
  const cleanTitle = title.replace(/\s*\((feat\.|with|remastered|deluxe)[^)]*\)/gi, "").trim();
  return `${artist} ${cleanTitle} official audio`.trim();
}

/** SimpMusic / LRCLIB multi-provider synced lyrics cascade. */
export async function fetchSyncedLyricsCascade(track: MusicTrack): Promise<string | null> {
  const title = encodeURIComponent(track.title);
  const artist = encodeURIComponent(track.artist || "");
  try {
    const res = await fetch(`https://lrclib.net/api/get?track_name=${title}&artist_name=${artist}`);
    if (res.ok) {
      const json = (await res.json()) as { syncedLyrics?: string; plainLyrics?: string };
      if (json.syncedLyrics || json.plainLyrics) return json.syncedLyrics ?? json.plainLyrics ?? null;
    }
  } catch {}
  if (track.sourceId) {
    try {
      const res = await fetch(`https://api.simpmusic.org/v1/lyrics/${encodeURIComponent(track.sourceId)}`);
      if (res.ok) {
        const json = (await res.json()) as { data?: Array<{ syncedLyrics?: string; plainLyric?: string }> };
        const hit = json.data?.[0];
        if (hit?.syncedLyrics || hit?.plainLyric) return hit.syncedLyrics ?? hit.plainLyric ?? null;
      }
    } catch {}
  }
  return null;
}
