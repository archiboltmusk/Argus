import type { SkipSegment } from "./types";

/**
 * SponsorBlock API Client for YouTube/Web Streams
 * Public community API: https://sponsor.ajay.app
 */
export async function fetchSponsorBlockSegments(videoId: string): Promise<SkipSegment[]> {
  if (!videoId || videoId.length < 5) return [];

  const url = `https://sponsor.ajay.app/api/skipSegments?videoID=${encodeURIComponent(videoId)}&categories=["sponsor","selfpromo","interaction"]`;

  try {
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(3500),
    });

    if (res.status === 404) {
      // 404 indicates no sponsor segments reported for this video
      return [];
    }

    if (!res.ok) {
      return [];
    }

    const data = (await res.json()) as Array<{
      category: string;
      segment: [number, number];
      actionType?: string;
    }>;

    if (!Array.isArray(data)) return [];

    const segments: SkipSegment[] = [];
    for (const item of data) {
      if (item.actionType && item.actionType !== "skip") continue;
      if (!Array.isArray(item.segment) || item.segment.length < 2) continue;
      const [startSec, endSec] = item.segment;
      if (typeof startSec !== "number" || typeof endSec !== "number") continue;
      if (endSec <= startSec) continue;

      segments.push({
        kind: "ad", // Map sponsor & self-promo to standard ad-skip handler
        startSec,
        endSec,
        source: "adcorpus",
      });
    }

    return segments;
  } catch {
    return [];
  }
}
