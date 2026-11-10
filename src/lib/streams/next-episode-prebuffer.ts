/**
 * Next-Episode Pre-Buffering Engine
 *
 * Pre-emptively queries debrid and addon stream providers when the active episode
 * reaches 88% watch progress. Eliminates loading spinners between binge episodes.
 */

import { buildStreamIds } from "@/lib/streams/stream-ids";
import type { ScoredStream } from "@/lib/streams/types";

const prebufferCache = new Map<string, ScoredStream[]>();

export function getCachedPrebufferedStreams(contentId: string, season: number, episode: number): ScoredStream[] | null {
  const key = `${contentId}:s${season}:e${episode}`;
  return prebufferCache.get(key) ?? null;
}

export function setCachedPrebufferedStreams(contentId: string, season: number, episode: number, streams: ScoredStream[]): void {
  const key = `${contentId}:s${season}:e${episode}`;
  prebufferCache.set(key, streams);
}

/**
 * Generates stream query keys for the next episode.
 */
export function getNextEpisodeStreamKeys(contentId: string, currentSeason: number, currentEpisode: number): string[] {
  const nextSeason = currentSeason;
  const nextEpisode = currentEpisode + 1;
  return buildStreamIds(contentId, { season: nextSeason, episode: nextEpisode } as any, null);
}
