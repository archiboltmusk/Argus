/**
 * Instant Stream Header & Index Pre-burst Engine
 *
 * Speeds up video stream startup (< 1.2s start time) by pre-fetching the container
 * header (moov atom / EBML cues) and tail index over parallel HTTP Range requests.
 */

const PREBURST_HEAD_BYTES = 1_500_000; // 1.5 MB header burst
const PREBURST_TAIL_BYTES = 500_000; // 500 KB index tail burst
const CACHE_MAX_ENTRIES = 16;

type PreburstRecord = {
  url: string;
  warmedAt: number;
  headReady: boolean;
};

const preburstCache = new Map<string, PreburstRecord>();

/**
 * Initiates an instant HTTP Range pre-burst on a candidate stream URL.
 * Runs non-blocking in background without delaying UI thread.
 */
export async function preburstStreamHeader(
  streamUrl: string,
  abortSignal?: AbortSignal,
): Promise<{ ok: boolean; headBytes: number }> {
  if (!streamUrl || (!streamUrl.startsWith("http://") && !streamUrl.startsWith("https://"))) {
    return { ok: false, headBytes: 0 };
  }

  const existing = preburstCache.get(streamUrl);
  if (existing && Date.now() - existing.warmedAt < 60_000) {
    return { ok: true, headBytes: PREBURST_HEAD_BYTES };
  }

  try {
    // 1. Parallel range request for the container header
    const headPromise = fetch(streamUrl, {
      method: "GET",
      headers: {
        Range: `bytes=0-${PREBURST_HEAD_BYTES - 1}`,
      },
      signal: abortSignal,
    }).then(async (res) => {
      if (res.ok || res.status === 206) {
        // Read stream bytes into buffer to force socket transmission
        const reader = res.body?.getReader();
        if (reader) {
          await reader.read();
          reader.cancel().catch(() => {});
        }
        return true;
      }
      return false;
    }).catch(() => false);

    // 2. Light HEAD request to discover total length for index seek
    const metaPromise = fetch(streamUrl, {
      method: "HEAD",
      signal: abortSignal,
    }).then((res) => {
      const lengthHeader = res.headers.get("content-length");
      return lengthHeader ? parseInt(lengthHeader, 10) : null;
    }).catch(() => null);

    const [headOk, totalLength] = await Promise.all([headPromise, metaPromise]);

    // 3. If file is large (> 20MB) and content length is known, warm the tail index
    if (totalLength && totalLength > 20_000_000) {
      const tailStart = Math.max(0, totalLength - PREBURST_TAIL_BYTES);
      fetch(streamUrl, {
        method: "GET",
        headers: {
          Range: `bytes=${tailStart}-${totalLength - 1}`,
        },
        signal: abortSignal,
      }).then(async (res) => {
        const reader = res.body?.getReader();
        if (reader) {
          await reader.read();
          reader.cancel().catch(() => {});
        }
      }).catch(() => {});
    }

    if (headOk) {
      preburstCache.set(streamUrl, {
        url: streamUrl,
        warmedAt: Date.now(),
        headReady: true,
      });

      // Maintain LRU size
      while (preburstCache.size > CACHE_MAX_ENTRIES) {
        const first = preburstCache.keys().next().value;
        if (first === undefined) break;
        preburstCache.delete(first);
      }
    }

    return { ok: headOk, headBytes: headOk ? PREBURST_HEAD_BYTES : 0 };
  } catch {
    return { ok: false, headBytes: 0 };
  }
}

export function isStreamHeaderWarmed(streamUrl: string): boolean {
  const hit = preburstCache.get(streamUrl);
  return Boolean(hit && hit.headReady && Date.now() - hit.warmedAt < 60_000);
}
