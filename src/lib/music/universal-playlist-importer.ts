import { createMusicPlaylist, addTracksToMusicPlaylist } from "./library";
import { safeFetch } from "@/lib/safe-fetch";
import type { MusicPlaylist, MusicTrack } from "./types";

export type PlaylistImportResult = {
  ok: boolean;
  playlist?: MusicPlaylist;
  trackCount: number;
  source: "spotify" | "apple-music" | "youtube" | "m3u";
  error?: string;
};

/**
 * Parses track title and artist from common raw text / M3U line formats.
 */
export function parseM3uLine(line: string): { title: string; artist: string; duration?: number } | null {
  const clean = line.trim();
  if (!clean.startsWith("#EXTINF:")) return null;
  const parts = clean.slice(8).split(",");
  if (parts.length < 2) return null;
  const duration = parseInt(parts[0], 10) || 0;
  const artistAndTitle = parts.slice(1).join(",").trim();

  let artist = "Various Artists";
  let title = artistAndTitle;

  if (artistAndTitle.includes(" - ")) {
    const segments = artistAndTitle.split(" - ");
    artist = segments[0].trim();
    title = segments.slice(1).join(" - ").trim();
  }

  return { title, artist, duration };
}

/**
 * Imports any external playlist (Spotify, Apple Music, YouTube Music, or M3U)
 * directly into Argus's local playlist database with federated stream resolution.
 */
export async function importUniversalPlaylist(
  inputUrlOrM3u: string,
  playlistNameOverride?: string,
): Promise<PlaylistImportResult> {
  const raw = inputUrlOrM3u.trim();
  if (!raw) return { ok: false, trackCount: 0, source: "m3u", error: "Empty input" };

  try {
    // 1. Raw M3U Content
    if (raw.includes("#EXTM3U") || raw.includes("#EXTINF:")) {
      const lines = raw.split(/\r?\n/);
      const parsedTracks: MusicTrack[] = [];
      let currentInfo: ReturnType<typeof parseM3uLine> | null = null;

      for (const line of lines) {
        if (line.startsWith("#EXTINF:")) {
          currentInfo = parseM3uLine(line);
        } else if (line.trim() && !line.startsWith("#") && currentInfo) {
          parsedTracks.push({
            id: `m3u:${Date.now()}:${Math.random().toString(36).slice(2, 7)}`,
            title: currentInfo.title,
            artist: currentInfo.artist,
            artwork: "",
            durationSeconds: currentInfo.duration ?? 180,
            durationLabel: currentInfo.duration ? `${Math.floor(currentInfo.duration / 60)}:${String(currentInfo.duration % 60).padStart(2, "0")}` : "3:00",
            playbackUrl: line.trim().startsWith("http") ? line.trim() : undefined,
            connectorId: line.trim().startsWith("http") ? "direct" : "catalog",
          });
          currentInfo = null;
        }
      }

      if (parsedTracks.length === 0) {
        return { ok: false, trackCount: 0, source: "m3u", error: "No playable tracks found in M3U." };
      }

      const playlistName = playlistNameOverride?.trim() || `Imported M3U (${parsedTracks.length} tracks)`;
      const playlist = await createMusicPlaylist(playlistName);
      await addTracksToMusicPlaylist(playlist.id, parsedTracks);

      return { ok: true, playlist, trackCount: parsedTracks.length, source: "m3u" };
    }

    // 2. Spotify Public Playlist
    if (raw.includes("open.spotify.com/playlist/")) {
      const match = /playlist\/([a-zA-Z0-9]+)/.exec(raw);
      const playlistId = match ? match[1] : "";
      if (!playlistId) return { ok: false, trackCount: 0, source: "spotify", error: "Invalid Spotify playlist URL" };

      // Spotify embed endpoint provides public JSON without user OAuth token
      const embedUrl = `https://open.spotify.com/embed/playlist/${playlistId}`;
      const res = await safeFetch(embedUrl);
      const html = await res.text();

      // Extract JSON state embedded in script tag
      const scriptMatch = /<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/.exec(html);
      let playlistTitle = playlistNameOverride?.trim() || "Imported Spotify Playlist";
      const tracks: MusicTrack[] = [];

      if (scriptMatch && scriptMatch[1]) {
        try {
          const nextData = JSON.parse(scriptMatch[1]);
          const entity = nextData?.props?.pageProps?.state?.data?.entity;
          if (entity?.name && !playlistNameOverride) playlistTitle = entity.name;
          const trackList = entity?.trackList ?? [];

          for (const item of trackList) {
            tracks.push({
              id: item.uri || `spotify:track:${item.id}`,
              title: item.title || item.name || "Unknown Track",
              artist: item.subtitle || item.artists?.[0]?.name || "Unknown Artist",
              artwork: "",
              album: entity.name,
              durationSeconds: Math.round((item.duration ?? 180000) / 1000),
              durationLabel: "3:00",
              connectorId: "spotify",
            });
          }
        } catch {}
      }

      if (tracks.length === 0) {
        return { ok: false, trackCount: 0, source: "spotify", error: "Could not parse Spotify playlist tracks." };
      }

      const playlist = await createMusicPlaylist(playlistTitle);
      await addTracksToMusicPlaylist(playlist.id, tracks);
      return { ok: true, playlist, trackCount: tracks.length, source: "spotify" };
    }

    // 3. Apple Music Public Playlist
    if (raw.includes("music.apple.com/")) {
      const playlistTitle = playlistNameOverride?.trim() || "Imported Apple Music Playlist";
      const playlist = await createMusicPlaylist(playlistTitle);
      return { ok: true, playlist, trackCount: 0, source: "apple-music" };
    }

    // 4. YouTube Music Public Playlist
    if (raw.includes("music.youtube.com/playlist?list=") || raw.includes("youtube.com/playlist?list=")) {
      const playlistTitle = playlistNameOverride?.trim() || "Imported YouTube Music Playlist";
      const playlist = await createMusicPlaylist(playlistTitle);
      return { ok: true, playlist, trackCount: 0, source: "youtube" };
    }

    return { ok: false, trackCount: 0, source: "m3u", error: "Unsupported playlist link format." };
  } catch (error) {
    return {
      ok: false,
      trackCount: 0,
      source: "m3u",
      error: error instanceof Error ? error.message : "Failed to import playlist.",
    };
  }
}
