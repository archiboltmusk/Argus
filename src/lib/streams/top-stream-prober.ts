import {
  probeStreamSpeed,
  getCachedProbeSpeed,
  gradeSpeed,
  type SpeedProbeResult,
} from "./speed-probe";
import type { ScoredStream, Stream } from "./types";

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
        }
      } catch {}
    }),
  );

  return results;
}

/**
 * Re-ranks candidates taking measured CDN speed into account.
 * Fast links receive a score boost; unreachably slow or timed-out links are penalized.
 */
export function applySpeedProbeBonuses(
  streams: ScoredStream[],
  probes: Map<string, SpeedProbeResult>,
): ScoredStream[] {
  return streams.slice().sort((a, b) => {
    const probeA = a.url ? probes.get(a.url) : undefined;
    const probeB = b.url ? probes.get(b.url) : undefined;

    let scoreA = a.score;
    let scoreB = b.score;

    if (probeA?.ok) {
      const grade = gradeSpeed(probeA.mbps);
      if (grade === "fast") scoreA += 25;
      else if (grade === "slow") scoreA -= 40;
    } else if (probeA && !probeA.ok) {
      scoreA -= 80;
    }

    if (probeB?.ok) {
      const grade = gradeSpeed(probeB.mbps);
      if (grade === "fast") scoreB += 25;
      else if (grade === "slow") scoreB -= 40;
    } else if (probeB && !probeB.ok) {
      scoreB -= 80;
    }

    return scoreB - scoreA;
  });
}
