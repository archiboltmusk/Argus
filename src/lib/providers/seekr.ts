/**
 * Seekr.tv Video Preview Thumbnails Integration
 * Provides high-speed video scrub frame thumbnails for movies and episodes.
 */

export type SeekrCue = {
  startSec: number;
  endSec: number;
  url: string;
  x?: number;
  y?: number;
  w?: number;
  h?: number;
};

export type SeekrThumbnailResult = {
  cues: SeekrCue[];
  baseUrl: string;
};

const SEEKR_API_BASE = "https://api.seekr.tv/v1";
const cache = new Map<string, SeekrThumbnailResult | null>();

function parseVttTimestamp(raw: string): number {
  const parts = raw.trim().split(":");
  if (parts.length === 3) {
    const h = parseFloat(parts[0]) || 0;
    const m = parseFloat(parts[1]) || 0;
    const s = parseFloat(parts[2]) || 0;
    return h * 3600 + m * 60 + s;
  }
  if (parts.length === 2) {
    const m = parseFloat(parts[0]) || 0;
    const s = parseFloat(parts[1]) || 0;
    return m * 60 + s;
  }
  return parseFloat(raw) || 0;
}

export function parseSeekrVtt(vttText: string, baseUrl: string): SeekrCue[] {
  const lines = vttText.split(/\r?\n/);
  const cues: SeekrCue[] = [];
  const cueTimeRegex = /((?:\d+:)?\d+:\d+(?:\.\d+)?)\s*-->\s*((?:\d+:)?\d+:\d+(?:\.\d+)?)/;

  let currentStart = -1;
  let currentEnd = -1;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("WEBVTT") || trimmed.startsWith("NOTE")) continue;

    const match = cueTimeRegex.exec(trimmed);
    if (match) {
      currentStart = parseVttTimestamp(match[1]);
      currentEnd = parseVttTimestamp(match[2]);
      continue;
    }

    if (currentStart >= 0 && currentEnd >= 0) {
      // Line contains image url, potentially with sprite hash: e.g. "sprite.jpg#xywh=0,0,160,90"
      const [urlPart, hashPart] = trimmed.split("#xywh=");
      const fullUrl = urlPart.startsWith("http") ? urlPart : `${baseUrl.replace(/\/+$/, "")}/${urlPart.replace(/^\/+/, "")}`;

      let x: number | undefined;
      let y: number | undefined;
      let w: number | undefined;
      let h: number | undefined;

      if (hashPart) {
        const coords = hashPart.split(",").map((v) => parseInt(v, 10));
        if (coords.length === 4) {
          [x, y, w, h] = coords;
        }
      }

      cues.push({
        startSec: currentStart,
        endSec: currentEnd,
        url: fullUrl,
        x,
        y,
        w,
        h,
      });

      currentStart = -1;
      currentEnd = -1;
    }
  }

  return cues.sort((a, b) => a.startSec - b.startSec);
}

export function findSeekrThumbnailCue(cues: SeekrCue[], timeSec: number): SeekrCue | null {
  if (!cues.length || timeSec < 0) return null;
  let low = 0;
  let high = cues.length - 1;

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    const cue = cues[mid];
    if (timeSec >= cue.startSec && timeSec < cue.endSec) {
      return cue;
    }
    if (timeSec < cue.startSec) {
      high = mid - 1;
    } else {
      low = mid + 1;
    }
  }

  // Fallback to closest boundary cue
  if (low >= cues.length) return cues[cues.length - 1];
  return cues[Math.max(0, low)];
}

export async function fetchSeekrThumbnails(params: {
  imdbId?: string | null;
  season?: number | null;
  episode?: number | null;
  apiKey?: string | null;
}): Promise<SeekrThumbnailResult | null> {
  const { imdbId, season, episode, apiKey } = params;
  if (!imdbId || !apiKey?.trim()) return null;

  const key = `${imdbId}:${season ?? ""}:${episode ?? ""}`;
  if (cache.has(key)) return cache.get(key) ?? null;

  try {
    const url = new URL(`${SEEKR_API_BASE}/thumbnails`);
    url.searchParams.set("imdbId", imdbId);
    if (season != null && season > 0) url.searchParams.set("season", season.toString());
    if (episode != null && episode > 0) url.searchParams.set("episode", episode.toString());

    const res = await fetch(url.toString(), {
      headers: {
        Accept: "text/vtt, application/json, text/plain",
        "x-api-key": apiKey.trim(),
      },
    });

    if (!res.ok) {
      cache.set(key, null);
      return null;
    }

    const contentType = res.headers.get("content-type") || "";
    if (contentType.includes("json")) {
      const data = await res.json();
      if (Array.isArray(data.cues)) {
        const result: SeekrThumbnailResult = { cues: data.cues, baseUrl: data.baseUrl || "" };
        cache.set(key, result);
        return result;
      }
    }

    const text = await res.text();
    const cues = parseSeekrVtt(text, url.origin);
    const result: SeekrThumbnailResult = { cues, baseUrl: url.origin };
    cache.set(key, result);
    return result;
  } catch {
    cache.set(key, null);
    return null;
  }
}
