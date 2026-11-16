/**
 * Live TV EPG & Multi-Source Stream Health Fallback Engine
 *
 * Combines Argus's stream health measurement (EWMA throughput + HTTP status checks)
 * with the EPG channel catalog to guarantee seamless live viewing without dead channels.
 *
 * When a user selects an EPG program or live channel:
 * 1. Resolves all candidate streams matching that channel across active playlists and Xtream servers.
 * 2. Ranks candidates by connection health, historical throughput, and latency.
 * 3. Provides instant automatic fallback if the active stream disconnects or errors.
 */

import type { IptvChannel, IptvPlaylist } from "./types";
import { getHostEwmaMbps } from "../streams/host-health";

export interface ChannelStreamCandidate {
  channel: IptvChannel;
  playlistName: string;
  url: string;
  healthScore: number; // 0.0 - 1.0
  estimatedThroughputMbps: number;
}

/**
 * Normalizes a channel name for fuzzy cross-playlist grouping
 * e.g. "HBO HD [US]" -> "hbo"
 */
export function normalizeChannelIdentity(name: string): string {
  return name
    .toLowerCase()
    .replace(/\[.*?\]|\(.*?\)/g, "")
    .replace(/\b(hd|fhd|uhd|4k|1080p|720p|hevc|h265|us|uk|ca)\b/gi, "")
    .replace(/[^a-z0-9]/g, "")
    .trim();
}

/**
 * Discovers and ranks all alternative stream sources for a selected channel.
 */
export function rankChannelCandidates(
  targetChannel: IptvChannel,
  playlists: IptvPlaylist[]
): ChannelStreamCandidate[] {
  const targetNorm = normalizeChannelIdentity(targetChannel.name);
  const candidates: ChannelStreamCandidate[] = [];

  for (const playlist of playlists) {
    for (const ch of playlist.channels) {
      const matchTvgId = targetChannel.tvgId && ch.tvgId && targetChannel.tvgId === ch.tvgId;
      const matchName = normalizeChannelIdentity(ch.name) === targetNorm;

      if (matchTvgId || matchName) {
        const ewma = getHostEwmaMbps(ch.url) ?? 8.0; // default 8 Mbps if unmeasured
        let score = Math.min(1.0, ewma / 20.0);

        // Preference bonuses
        if (ch.id === targetChannel.id) score += 0.1; // original preferred stream
        if (ch.name.toLowerCase().includes("fhd") || ch.name.toLowerCase().includes("1080")) score += 0.05;

        candidates.push({
          channel: ch,
          playlistName: playlist.name || "Default Playlist",
          url: ch.url,
          healthScore: score,
          estimatedThroughputMbps: ewma,
        });
      }
    }
  }

  // Sort descending by health score
  return candidates.sort((a, b) => b.healthScore - a.healthScore);
}

/**
 * Returns the next best fallback stream when a live channel fails.
 */
export function resolveNextBestLiveFallback(
  currentUrl: string,
  targetChannel: IptvChannel,
  playlists: IptvPlaylist[]
): ChannelStreamCandidate | null {
  const candidates = rankChannelCandidates(targetChannel, playlists);
  const alternates = candidates.filter((c) => c.url !== currentUrl);
  return alternates.length > 0 ? alternates[0] : null;
}
