// Streams this device gave up on within seconds are demoted so the next play
// does not pick the same broken release first. Local only, nothing is sent.

const KEY = "argus:dead-links:v1";
const VERIFIED_KEY = "argus:verified-links:v1";
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

export function markHashAsDead(
  infoHash: string | null | undefined,
  kv: KV | null = defaultKv(),
  now = Date.now(),
) {
  if (!infoHash || !kv) return;
  const h = infoHash.toLowerCase();
  const store = read(kv, now);
  store[h] = { count: Math.max(THRESHOLD, (store[h]?.count ?? 0) + THRESHOLD), at: now };
  write(kv, store);
}

export function unmarkHashDead(
  infoHash: string | null | undefined,
  kv: KV | null = defaultKv(),
  now = Date.now(),
) {
  if (!infoHash || !kv) return;
  const h = infoHash.toLowerCase();
  const store = read(kv, now);
  if (store[h]) {
    delete store[h];
    write(kv, store);
  }
}

export function demotedHashes(kv: KV | null = defaultKv(), now = Date.now()): string[] {
  if (!kv) return [];
  return Object.entries(read(kv, now))
    .filter(([, e]) => e.count >= THRESHOLD)
    .map(([h]) => h);
}

export function markHashAsCorrect(
  infoHash: string | null | undefined,
  kv: KV | null = defaultKv(),
  now = Date.now(),
) {
  if (!infoHash || !kv) return;
  const h = infoHash.toLowerCase();
  unmarkHashDead(h, kv, now);
  try {
    const raw = JSON.parse(kv.getItem(VERIFIED_KEY) ?? "{}") as Store;
    raw[h] = { count: (raw[h]?.count ?? 0) + 1, at: now };
    kv.setItem(VERIFIED_KEY, JSON.stringify(raw));
  } catch {}
}

export function unmarkHashCorrect(
  infoHash: string | null | undefined,
  kv: KV | null = defaultKv(),
) {
  if (!infoHash || !kv) return;
  const h = infoHash.toLowerCase();
  try {
    const raw = JSON.parse(kv.getItem(VERIFIED_KEY) ?? "{}") as Store;
    if (raw[h]) {
      delete raw[h];
      kv.setItem(VERIFIED_KEY, JSON.stringify(raw));
    }
  } catch {}
}

export function verifiedCorrectHashes(
  kv: KV | null = defaultKv(),
  now = Date.now(),
): string[] {
  if (!kv) return [];
  try {
    const raw = JSON.parse(kv.getItem(VERIFIED_KEY) ?? "{}") as Store;
    return Object.entries(raw)
      .filter(([, e]) => e && typeof e.count === "number" && now - e.at < TTL_MS)
      .map(([h]) => h);
  } catch {
    return [];
  }
}

export function parseGroupList(raw: string): string[] {
  return raw
    .split(/[,\n]/)
    .map((g) => g.trim().toUpperCase())
    .filter(Boolean);
}

/** Lower-case host names from a comma/newline list; scheme, path and "www." are dropped. */
export function parseHostList(raw: string): string[] {
  return raw
    .split(/[,\n]/)
    .map((h) =>
      h
        .trim()
        .toLowerCase()
        .replace(/^[a-z]+:\/\//, "")
        .replace(/^www\./, "")
        .split(/[/?#:]/)[0],
    )
    .filter(Boolean);
}

/** Key identifying a stream across torrents, URLs or addon payloads. */
export function streamTargetKey(stream: {
  infoHash?: string | null;
  url?: string | null;
  addonId?: string | null;
  title?: string | null;
  name?: string | null;
} | null | undefined): string | null {
  if (!stream) return null;
  if (stream.infoHash) return stream.infoHash.toLowerCase();
  if (stream.url) {
    try {
      const u = new URL(stream.url);
      return `u:${u.hostname}${u.pathname}`.toLowerCase();
    } catch {
      return `u:${stream.url.toLowerCase()}`;
    }
  }
  const addon = stream.addonId ? `${stream.addonId}:` : "";
  const label = stream.title || stream.name;
  if (label) return `t:${addon}${label}`.toLowerCase();
  return null;
}

export function isStreamTargetVerified(
  stream: {
    infoHash?: string | null;
    url?: string | null;
    addonId?: string | null;
    title?: string | null;
    name?: string | null;
  } | null | undefined,
  kv: KV | null = defaultKv(),
  now = Date.now(),
): boolean {
  const key = streamTargetKey(stream);
  if (!key) return false;
  return verifiedCorrectHashes(kv, now).includes(key);
}

export function isStreamTargetDead(
  stream: {
    infoHash?: string | null;
    url?: string | null;
    addonId?: string | null;
    title?: string | null;
    name?: string | null;
  } | null | undefined,
  kv: KV | null = defaultKv(),
  now = Date.now(),
): boolean {
  const key = streamTargetKey(stream);
  if (!key) return false;
  return demotedHashes(kv, now).includes(key);
}

export function markStreamAsCorrect(
  stream: {
    infoHash?: string | null;
    url?: string | null;
    addonId?: string | null;
    title?: string | null;
    name?: string | null;
  } | null | undefined,
  kv: KV | null = defaultKv(),
  now = Date.now(),
) {
  const key = streamTargetKey(stream);
  if (key) markHashAsCorrect(key, kv, now);
}

export function unmarkStreamCorrect(
  stream: {
    infoHash?: string | null;
    url?: string | null;
    addonId?: string | null;
    title?: string | null;
    name?: string | null;
  } | null | undefined,
  kv: KV | null = defaultKv(),
) {
  const key = streamTargetKey(stream);
  if (key) unmarkHashCorrect(key, kv);
}

export function markStreamAsDead(
  stream: {
    infoHash?: string | null;
    url?: string | null;
    addonId?: string | null;
    title?: string | null;
    name?: string | null;
  } | null | undefined,
  kv: KV | null = defaultKv(),
  now = Date.now(),
) {
  const key = streamTargetKey(stream);
  if (key) markHashAsDead(key, kv, now);
}
export function streamHost(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    return u.protocol === "http:" || u.protocol === "https:" ? u.hostname.toLowerCase() : null;
  } catch {
    return null;
  }
}
