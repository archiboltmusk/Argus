import {
  probeStreamSpeed,
  getCachedProbeSpeed,
  type SpeedProbeResult,
} from "./speed-probe";
import type { ScoredStream, Stream } from "./types";
import { recordHostThroughput, recordHostFailure, getHostScoreBonus, getHostEwmaMbps } from "./host-health";

function headersOf(stream: Stream): Record<string, string> | undefined {
  const hints = stream.behaviorHints;
  const h = hints?.proxyHeaders as { request?: Record<string, string> } | undefined;
  return h?.request ?? hints?.headers;
}

/**
 * Probes the top N candidate direct HTTP streams concurrently with a micro 500KB sample.
 * Caches the probe results so UI badges and scoring reflect live verified CDN throughput.
 */
export async function probeTopStreams(
  streams: ScoredStream[],
  maxProbeCount = 3,
  signal?: AbortSignal,
): Promise<Map<string, SpeedProbeResult>> {
  const results = new Map<string, SpeedProbeResult>();
  const candidates: ScoredStream[] = [];

  for (const s of streams) {
    if (s.url && /^https?:/i.test(s.url)) {
      candidates.push(s);
      if (candidates.length >= maxProbeCount) break;
    }
  }

  if (candidates.length === 0) return results;

  await Promise.allSettled(
    candidates.map(async (s) => {
      if (signal?.aborted || !s.url) return;
      const cached = getCachedProbeSpeed(s.url);
      if (cached) {
        results.set(s.url, cached);
        return;
      }
      try {
        const res = await probeStreamSpeed(s.url, {
          headers: headersOf(s),
          sampleBytes: 500_000,
          signal,
        });
        if (res.ok) {
          results.set(s.url, res);
          recordHostThroughput(s.url, res.mbps, res.latencyMs);
        } else {
          recordHostFailure(s.url);
        }
      } catch {}
    }),
  );

  return results;
}

function estimateStreamRequiredMbps(s: ScoredStream): number {
  if (s.size && s.size > 0) {
    // Assume 90 minutes average runtime = 5400s
    return (s.size * 8) / (5400 * 1_000_000);
  }
  if (s.resolution === "4K") return 22;
  if (s.resolution === "1080p") return s.codec === "AV1" || s.codec === "HEVC" ? 3.5 : 7.0;
  if (s.resolution === "720p") return 2.0;
  return 1.5;
}

function calculateProbeAdjustment(s: ScoredStream, probe: SpeedProbeResult | undefined): number {
  const required = estimateStreamRequiredMbps(s);

  // If live probe is not available, check historical host EWMA throughput
  const measuredMbps = probe && probe.ok ? probe.mbps : (s.url ? getHostEwmaMbps(s.url) : null);

  if (measuredMbps != null) {
    const ratio = measuredMbps / Math.max(required, 0.5);
    if (ratio >= 2.0) {
      // Verified CDN delivery with >= 2x playback headroom: seamless streaming guaranteed
      return 35;
    }
    if (ratio >= 1.2) {
      // Solid headroom
      return 15;
    }
    if (ratio < 0.85) {
      // Insufficient throughput to sustain playback: will inevitably buffer
      return -60;
    }
    return 0;
  }

  if (probe && !probe.ok) return -80;
  return 0;
}

/**
 * Re-ranks candidates taking measured CDN throughput and required stream bitrate into account.
 * Links with proven >=2x bandwidth headroom are promoted; links that cannot sustain bitrate are demoted.
 */
export function applySpeedProbeBonuses(
  streams: ScoredStream[],
  probes: Map<string, SpeedProbeResult>,
): ScoredStream[] {
  return streams.slice().sort((a, b) => {
    const probeA = a.url ? probes.get(a.url) : undefined;
    const probeB = b.url ? probes.get(b.url) : undefined;

    const hostBonusA = getHostScoreBonus(a.url);
    const hostBonusB = getHostScoreBonus(b.url);

    const scoreA = a.score + calculateProbeAdjustment(a, probeA) + hostBonusA;
    const scoreB = b.score + calculateProbeAdjustment(b, probeB) + hostBonusB;

    return scoreB - scoreA;
  });
}
