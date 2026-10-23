import type { RecipeSource } from "./schema";

export const HANDSHAKE_TIMEOUT_MS = 2500;
const DOWN_TTL_MS = 5 * 60_000;

export type Probe = (source: RecipeSource, signal: AbortSignal) => Promise<boolean>;

export function sourceKey(s: RecipeSource): string {
  return s.type === "http" ? s.url : s.type === "archive_org" ? `ia:${s.id}:${s.file ?? ""}` : `ipfs:${s.cid}`;
}

const down = new Map<string, number>();

export function markSourceDown(s: RecipeSource, now = Date.now()): void {
  down.set(sourceKey(s), now);
}

export function isSourceDown(s: RecipeSource, now = Date.now()): boolean {
  const at = down.get(sourceKey(s));
  return at !== undefined && now - at < DOWN_TTL_MS;
}

export function resetDownSources(): void {
  down.clear();
}

// First source that completes its handshake within the timeout wins. Sources recently
// seen failing are tried last instead of dropped, so an all-down recipe still gets a retry.
export async function pickSource(
  sources: RecipeSource[],
  probe: Probe,
  timeoutMs = HANDSHAKE_TIMEOUT_MS,
): Promise<{ source: RecipeSource; failed: RecipeSource[] } | { source?: undefined; failed: RecipeSource[] }> {
  const ordered = [...sources].sort((a, b) => a.priority - b.priority);
  const queue = [...ordered.filter((s) => !isSourceDown(s)), ...ordered.filter(isSourceDown)];
  const failed: RecipeSource[] = [];
  for (const s of queue) {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), timeoutMs);
    let ok = false;
    try {
      ok = await Promise.race([
        probe(s, ctl.signal),
        new Promise<boolean>((resolve) => ctl.signal.addEventListener("abort", () => resolve(false), { once: true })),
      ]);
    } catch {
      ok = false;
    } finally {
      clearTimeout(timer);
      ctl.abort();
    }
    if (ok) return { source: s, failed };
    markSourceDown(s);
    failed.push(s);
  }
  return { failed };
}

// Endpoint check: needs range support and a media-ish content type.
export function endpointLooksPlayable(status: number, headers: { get(name: string): string | null }): boolean {
  if (status !== 206 && status !== 200) return false;
  const ranged = status === 206 || (headers.get("accept-ranges") ?? "").toLowerCase() === "bytes";
  const type = (headers.get("content-type") ?? "").toLowerCase();
  const mediaType = /^(video|audio)\//.test(type) || /(pdf|epub|djvu|octet-stream|matroska)/.test(type);
  return ranged && mediaType;
}
