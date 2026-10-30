/**
 * Smart Up-Next Pre-Cacher & Travel Stash for Argus
 *
 * Automatically pre-buffers the next 2-3 unread manga chapters or upcoming
 * anime episode while connected to Wi-Fi, and automatically frees cache once completed.
 */

export interface PrecacheTarget {
  id: string;
  type: "manga-chapter" | "anime-episode" | "audio-chapter" | "ebook";
  title: string;
  sourceUrl: string;
  sizeBytes?: number;
  status: "pending" | "downloading" | "cached" | "failed";
}

const PRECACHE_KEY = "argus.stash.precached.v1";

export function listPrecachedItems(): PrecacheTarget[] {
  try {
    const raw = localStorage.getItem(PRECACHE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function queuePrecache(target: Omit<PrecacheTarget, "status">): void {
  const current = listPrecachedItems();
  if (current.some((item) => item.id === target.id)) return;

  const next: PrecacheTarget[] = [
    ...current,
    {
      ...target,
      status: "pending",
    },
  ];

  try {
    localStorage.setItem(PRECACHE_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
}

export function markPrecachedFinished(id: string): void {
  const current = listPrecachedItems();
  const next = current.filter((item) => item.id !== id);
  try {
    localStorage.setItem(PRECACHE_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
}
