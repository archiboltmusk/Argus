import type { AutoSyncResult } from "./auto-sync";

const KEY = "argus.autosync.v1";
const MAX_ENTRIES = 60;

type Entry = { k: string; r: AutoSyncResult };

function load(): Entry[] {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? (parsed as Entry[]) : [];
  } catch {
    return [];
  }
}

/** Streams carry rotating tokens, so key on host + path only. */
export function syncCacheKey(mediaUrl: string, subUrl: string | null, cueCount: number): string {
  let media = mediaUrl;
  try {
    const u = new URL(mediaUrl);
    media = `${u.host}${u.pathname}`;
  } catch {
    /* local path */
  }
  return `${media}|${subUrl ?? ""}|${cueCount}`;
}

export function readSyncCache(key: string): AutoSyncResult | null {
  return load().find((e) => e.k === key)?.r ?? null;
}

export function writeSyncCache(key: string, r: AutoSyncResult): void {
  try {
    const next = [{ k: key, r }, ...load().filter((e) => e.k !== key)].slice(0, MAX_ENTRIES);
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* storage unavailable */
  }
}
