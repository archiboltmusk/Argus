import { probeStreamSpeed, getCachedProbeSpeed } from "./speed-probe";
import type { ScoredStream } from "./types";

const prewarmedUrls = new Set<string>();

/**
 * Pre-warm the top candidate stream:
 * Establishes TLS socket handshake and pre-fetches the first 1.5MB into cache
 * so pressing Play starts almost instantaneously.
 */
export function prewarmCandidateStream(stream: ScoredStream | null | undefined): void {
  if (!stream?.url) return;
  const url = stream.url;
  if (prewarmedUrls.has(url)) return;
  if (getCachedProbeSpeed(url)) return;

  prewarmedUrls.add(url);
  // Cap set size
  if (prewarmedUrls.size > 50) {
    const first = prewarmedUrls.values().next().value;
    if (first) prewarmedUrls.delete(first);
  }

  // Silently trigger background probe / warm connection (pre-buffers 2MB for instantaneous start)
  void probeStreamSpeed(url, { sampleBytes: 2_000_000 }).catch(() => {});
}

/**
 * Deep Pre-Cache ("Watch Smooth"):
 * Pulls up to 15MB into fast memory/socket cache for high-bitrate or slow networks
 */
export function deepPrecacheStream(stream: ScoredStream | null | undefined): void {
  if (!stream?.url) return;
  const url = stream.url;
  void probeStreamSpeed(url, { sampleBytes: 15_000_000 }).catch(() => {});
}

/**
 * Pre-warm the top N candidate streams (primary and hot standby runners-up)
 */
export function prewarmTopCandidates(streams: ScoredStream[], count = 2): void {
  for (let i = 0; i < Math.min(streams.length, count); i++) {
    prewarmCandidateStream(streams[i]);
  }
}
