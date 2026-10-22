export const REVS_KEY = "argus.sync.revs";
export const ACCOUNT_KEY = "argus.sync.account";
export const QUEUE_KEY = "argus.sync.queue";
export const IDMAP_KEY = "argus.sync.idmap";
export const SENT_KEY = "argus.sync.sent";
export const LAST_PULL_KEY = "argus.sync.lastPullAt";
export const PARKED_PREFIX = "argus.sync.parked.";

export const SYNC_KEY_PREFIX = "argus.sync.";

export function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as unknown;
    return parsed == null ? fallback : (parsed as T);
  } catch {
    return fallback;
  }
}

export function removeKey(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

export function syncKeys(): string[] {
  const out: string[] = [];
  try {
    for (let i = 0; i < localStorage.length; i += 1) {
      const k = localStorage.key(i);
      if (k && k.startsWith(SYNC_KEY_PREFIX)) out.push(k);
    }
  } catch {
    return out;
  }
  return out;
}
