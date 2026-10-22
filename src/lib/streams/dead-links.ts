// Streams this device gave up on within seconds are demoted so the next play
// does not pick the same broken release first. Local only, nothing is sent.

const KEY = "argus:dead-links:v1";
const QUICK_EXIT_SEC = 20;
const THRESHOLD = 2;
const TTL_MS = 7 * 24 * 3600 * 1000;

type Entry = { count: number; at: number };
type Store = Record<string, Entry>;

type KV = Pick<Storage, "getItem" | "setItem">;

function read(kv: KV, now: number): Store {
  try {
    const raw = JSON.parse(kv.getItem(KEY) ?? "{}") as Store;
    const out: Store = {};
    for (const [h, e] of Object.entries(raw)) {
      if (e && typeof e.count === "number" && now - e.at < TTL_MS) out[h] = e;
    }
    return out;
  } catch {
    return {};
  }
}

function write(kv: KV, store: Store) {
  try {
    kv.setItem(KEY, JSON.stringify(store));
  } catch {
    // storage unavailable: demotion just does not persist
  }
}

function defaultKv(): KV | null {
  try {
    return typeof localStorage === "undefined" ? null : localStorage;
  } catch {
    return null;
  }
}

/** Call when the player closes. Quick back-outs count against the hash; a real watch clears it. */
export function recordPlayOutcome(
  infoHash: string | null | undefined,
  watchedSec: number,
  kv: KV | null = defaultKv(),
  now = Date.now(),
) {
  if (!infoHash || !kv) return;
  const h = infoHash.toLowerCase();
  const store = read(kv, now);
  if (watchedSec < QUICK_EXIT_SEC) {
    store[h] = { count: (store[h]?.count ?? 0) + 1, at: now };
  } else if (store[h]) {
    delete store[h];
  } else {
    return;
  }
  write(kv, store);
}

export function demotedHashes(kv: KV | null = defaultKv(), now = Date.now()): string[] {
  if (!kv) return [];
  return Object.entries(read(kv, now))
    .filter(([, e]) => e.count >= THRESHOLD)
    .map(([h]) => h);
}

export function parseGroupList(raw: string): string[] {
  return raw
    .split(/[,\n]/)
    .map((g) => g.trim().toUpperCase())
    .filter(Boolean);
}
