import type { DebridResult, DebridStore } from "./types";

// Codes that mean "this account cannot serve the request right now". A miss like
// not-cached is the same on every account of one provider, so it is not retried.
const FAILOVER_CODES = new Set([
  "rate-limited",
  "not-premium",
  "traffic-limit",
  "unauthorized",
  "upstream-unavailable",
  "timeout",
  "network-error",
]);

export function shouldFailover(result: DebridResult<unknown>): boolean {
  if (result.ok) return false;
  if (result.status === 429 || result.status === 401 || result.status === 403) return true;
  if (result.status >= 500) return true;
  return FAILOVER_CODES.has(result.code);
}

/**
 * One provider, several of the user's own accounts. Backups are tried in order
 * only after the account before them failed in a way another account can fix.
 * The wrapper keeps the provider's slug, so the rest of the app sees one store.
 */
export function withFailover(
  primary: DebridStore,
  backups: DebridStore[],
  onSwitch?: (slug: DebridStore["slug"], index: number) => void,
): DebridStore {
  if (backups.length === 0) return primary;
  const chain = [primary, ...backups];

  async function run<T>(
    signal: AbortSignal,
    call: (store: DebridStore) => Promise<DebridResult<T>>,
  ): Promise<DebridResult<T>> {
    let last: DebridResult<T> | null = null;
    for (let i = 0; i < chain.length; i++) {
      if (signal.aborted) return last ?? { ok: false, code: "aborted", status: 0 };
      const result = await call(chain[i]);
      if (!shouldFailover(result)) return result;
      last = result;
      if (i + 1 < chain.length) onSwitch?.(primary.slug, i + 1);
    }
    return last ?? { ok: false, code: "error", status: 0 };
  }

  const wrapped: DebridStore = {
    slug: primary.slug,
    name: primary.name,
    account: (signal) => run(signal, (s) => s.account(signal)),
    cacheCheck: (hashes, signal) => run(signal, (s) => s.cacheCheck(hashes, signal)),
    playableUrl: (magnet, fileIdx, signal, hint) =>
      run(signal, (s) => s.playableUrl(magnet, fileIdx, signal, hint)),
    listLibrary: (signal) => run(signal, (s) => s.listLibrary(signal)),
  };
  if (primary.queueCache) {
    wrapped.queueCache = (magnet, signal) =>
      run(signal, (s) =>
        s.queueCache ? s.queueCache(magnet, signal) : Promise.resolve({ ok: false, code: "error", status: 0 } as DebridResult<{ id: string }>),
      );
  }
  return wrapped;
}
