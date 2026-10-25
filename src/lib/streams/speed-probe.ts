import { fetch as tauriHttpFetch } from "@tauri-apps/plugin-http";
import { safeFetch } from "@/lib/safe-fetch";

const isTauri = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
const defaultFetch: typeof fetch = isTauri
  ? (tauriHttpFetch as unknown as typeof fetch)
  : safeFetch;

export type SpeedProbeResult =
  | { ok: true; latencyMs: number; mbps: number; bytes: number }
  | { ok: false; reason: "unreachable" | "http-error" | "timeout" | "aborted"; status?: number };

export type SpeedGrade = "fast" | "ok" | "slow";

const SAMPLE_BYTES = 1_500_000;
const TIMEOUT_MS = 8000;

// Global memory cache for probed URLs so repeated views do not re-probe
const probeCache = new Map<string, { result: SpeedProbeResult; timestamp: number }>();
const PROBE_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export function getCachedProbeSpeed(url: string): SpeedProbeResult | null {
  const hit = probeCache.get(url);
  if (!hit) return null;
  if (Date.now() - hit.timestamp > PROBE_CACHE_TTL_MS) {
    probeCache.delete(url);
    return null;
  }
  return hit.result;
}

const MAX_PROBE_CACHE_SIZE = 100;

export function cacheProbeSpeed(url: string, result: SpeedProbeResult): void {
  if (probeCache.size >= MAX_PROBE_CACHE_SIZE && !probeCache.has(url)) {
    const oldestKey = probeCache.keys().next().value;
    if (oldestKey) probeCache.delete(oldestKey);
  }
  probeCache.set(url, { result, timestamp: Date.now() });
}

/** Download the first ~1.5 MB of a direct link and time it. Never touches the player. */
export async function probeStreamSpeed(
  url: string,
  opts: {
    headers?: Record<string, string>;
    signal?: AbortSignal;
    fetchImpl?: typeof fetch;
    now?: () => number;
    sampleBytes?: number;
  } = {},
): Promise<SpeedProbeResult> {
  const doFetch = opts.fetchImpl ?? defaultFetch;
  const now = opts.now ?? (() => performance.now());
  const sample = opts.sampleBytes ?? SAMPLE_BYTES;
  const ctrl = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    ctrl.abort();
  }, TIMEOUT_MS);
  const onAbort = () => ctrl.abort();
  opts.signal?.addEventListener("abort", onAbort);
  try {
    const t0 = now();
    const res = await doFetch(url, {
      method: "GET",
      headers: { ...opts.headers, Range: `bytes=0-${sample - 1}` },
      signal: ctrl.signal,
    });
    const tHeaders = now();
    if (!res.ok && res.status !== 206) return { ok: false, reason: "http-error", status: res.status };
    let bytes = 0;
    const reader = res.body?.getReader();
    if (reader) {
      while (bytes < sample) {
        const { done, value } = await reader.read();
        if (done) break;
        bytes += value?.byteLength ?? 0;
      }
      void reader.cancel().catch(() => {});
    } else {
      bytes = (await res.arrayBuffer()).byteLength;
    }
    const tEnd = now();
    const seconds = Math.max((tEnd - tHeaders) / 1000, 0.001);
    const result: SpeedProbeResult = {
      ok: true,
      latencyMs: Math.max(0, Math.round(tHeaders - t0)),
      mbps: Math.round(((bytes * 8) / seconds / 1_000_000) * 10) / 10,
      bytes,
    };
    cacheProbeSpeed(url, result);
    return result;
  } catch {
    if (opts.signal?.aborted) return { ok: false, reason: "aborted" };
    return { ok: false, reason: timedOut ? "timeout" : "unreachable" };
  } finally {
    clearTimeout(timer);
    opts.signal?.removeEventListener("abort", onAbort);
  }
}

/** Compares measured speed with what the file needs, when its size and runtime are known. */
export function gradeSpeed(mbps: number, requiredMbps?: number | null): SpeedGrade {
  const need = requiredMbps && requiredMbps > 0 ? requiredMbps : 8;
  if (mbps >= need * 2) return "fast";
  if (mbps >= need * 1.2) return "ok";
  return "slow";
}
