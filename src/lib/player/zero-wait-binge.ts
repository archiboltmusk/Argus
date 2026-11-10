import type { Stream } from "@/lib/streams/types";
import type { PlayEpisode } from "@/lib/view";

interface PreloadedBingeSession {
  metaId: string;
  episodeId: string;
  season: number;
  episode: number;
  timestamp: number;
  stream: Stream;
}

let activePreload: PreloadedBingeSession | null = null;

const PRELOAD_MAX_AGE_MS = 15 * 60 * 1000; // 15 minutes

export function clearPreloadedNextStreams(): void {
  activePreload = null;
}

export function storePreloadedNextStream(
  metaId: string,
  nextEpisode: PlayEpisode | { season?: number; episode: number } | number,
  stream: Stream,
): void {
  const season =
    typeof nextEpisode === "number"
      ? 1
      : typeof nextEpisode.season === "number"
        ? nextEpisode.season
        : 1;
  const episode = typeof nextEpisode === "number" ? nextEpisode : nextEpisode.episode;
  const epId = `${metaId}:${season}:${episode}`;
  activePreload = {
    metaId,
    episodeId: epId,
    season,
    episode,
    timestamp: Date.now(),
    stream,
  };
}

export function consumePreloadedNextStream(
  metaId: string,
  seasonOrEpisode: number,
  maybeEpisode?: number,
): Stream | null {
  if (!activePreload) return null;
  const season = maybeEpisode !== undefined ? seasonOrEpisode : 1;
  const episode = maybeEpisode !== undefined ? maybeEpisode : seasonOrEpisode;

  const isMatch =
    activePreload.metaId === metaId &&
    activePreload.season === season &&
    activePreload.episode === episode &&
    Date.now() - activePreload.timestamp < PRELOAD_MAX_AGE_MS;

  if (isMatch) {
    const stream = activePreload.stream;
    activePreload = null;
    return stream;
  }
  return null;
}

export function clearPreloadedNextStream(): void {
  activePreload = null;
}
