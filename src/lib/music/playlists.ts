import { useSyncExternalStore } from "react";
import type { Playlist } from "./types";

const KEY = "argus.music.playlists.v1";

function load(): Playlist[] {
  try {
    const arr = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    return Array.isArray(arr) ? (arr as Playlist[]) : [];
  } catch {
    return [];
  }
}

let items: Playlist[] = load();
const listeners = new Set<() => void>();

function commit(next: Playlist[]): void {
  items = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(items));
  } catch {
    /* storage unavailable; keep in memory */
  }
  listeners.forEach((l) => l());
}

export function usePlaylists(): Playlist[] {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => items,
  );
}

function rid(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

function patch(id: string, fn: (p: Playlist) => Playlist): void {
  commit(items.map((p) => (p.id === id ? { ...fn(p), updatedAt: Date.now() } : p)));
}

export function createPlaylist(name: string, trackIds: string[] = []): Playlist {
  const now = Date.now();
  const p: Playlist = { id: rid(), name: name.trim() || "Untitled", trackIds, createdAt: now, updatedAt: now };
  commit([...items, p]);
  return p;
}

export function renamePlaylist(id: string, name: string): void {
  const next = name.trim();
  if (next) patch(id, (p) => ({ ...p, name: next }));
}

export function deletePlaylist(id: string): void {
  commit(items.filter((p) => p.id !== id));
}

export function addToPlaylist(id: string, trackIds: string[]): void {
  patch(id, (p) => ({
    ...p,
    trackIds: [...p.trackIds, ...trackIds.filter((t) => !p.trackIds.includes(t))],
  }));
}

export function removeFromPlaylist(id: string, trackId: string): void {
  patch(id, (p) => ({ ...p, trackIds: p.trackIds.filter((t) => t !== trackId) }));
}

export function moveInPlaylist(id: string, from: number, to: number): void {
  patch(id, (p) => {
    if (to < 0 || to >= p.trackIds.length) return p;
    const ids = [...p.trackIds];
    const [moved] = ids.splice(from, 1);
    ids.splice(to, 0, moved);
    return { ...p, trackIds: ids };
  });
}

/** M3U8 text for export; paths come from the library so the file works in other players. */
export function toM3u(name: string, paths: string[]): string {
  return `#EXTM3U\n#PLAYLIST:${name}\n${paths.join("\n")}\n`;
}
