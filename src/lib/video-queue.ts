import { useSyncExternalStore } from "react";
import { emitListToast } from "@/components/lists/list-toast";

export type VideoQueueItem = {
  id: string;
  type: "movie" | "series";
  name: string;
  poster?: string;
  banner?: string;
  background?: string;
  releaseInfo?: string;
  imdbRating?: string;
  addedAt: number;
};

const STORAGE_KEY = "argus.video.queue.v1";
let queueSnapshot: VideoQueueItem[] = loadQueueFromStorage();
const listeners = new Set<() => void>();

function loadQueueFromStorage(): VideoQueueItem[] {
  if (typeof localStorage === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveQueueToStorage(items: VideoQueueItem[]) {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    /* ignore storage quota errors */
  }
}

function notify() {
  saveQueueToStorage(queueSnapshot);
  listeners.forEach((listener) => listener());
}

export function subscribeVideoQueue(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getVideoQueue(): VideoQueueItem[] {
  return queueSnapshot;
}

export function isInVideoQueue(id: string): boolean {
  return queueSnapshot.some((item) => item.id === id);
}

export function addToVideoQueue(
  item: Omit<VideoQueueItem, "addedAt">,
  quiet = false,
): boolean {
  if (isInVideoQueue(item.id)) return false;
  queueSnapshot = [{ ...item, addedAt: Date.now() }, ...queueSnapshot];
  notify();
  if (!quiet) {
    emitListToast(`Added "${item.name}" to Queue`);
  }
  return true;
}

export function removeFromVideoQueue(id: string, quiet = false): boolean {
  const existing = queueSnapshot.find((item) => item.id === id);
  if (!existing) return false;
  queueSnapshot = queueSnapshot.filter((item) => item.id !== id);
  notify();
  if (!quiet) {
    emitListToast(`Removed "${existing.name}" from Queue`);
  }
  return true;
}

export function toggleVideoQueue(item: Omit<VideoQueueItem, "addedAt">): boolean {
  if (isInVideoQueue(item.id)) {
    removeFromVideoQueue(item.id);
    return false;
  }
  addToVideoQueue(item);
  return true;
}

export function clearVideoQueue(): void {
  if (queueSnapshot.length === 0) return;
  queueSnapshot = [];
  notify();
  emitListToast("Queue cleared");
}

export function useVideoQueue(): {
  queue: VideoQueueItem[];
  inQueue: (id: string) => boolean;
  add: (item: Omit<VideoQueueItem, "addedAt">) => boolean;
  remove: (id: string) => boolean;
  toggle: (item: Omit<VideoQueueItem, "addedAt">) => boolean;
  clear: () => void;
} {
  const queue = useSyncExternalStore(subscribeVideoQueue, getVideoQueue, () => []);
  return {
    queue,
    inQueue: (id: string) => queue.some((item) => item.id === id),
    add: (item) => addToVideoQueue(item),
    remove: (id) => removeFromVideoQueue(id),
    toggle: (item) => toggleVideoQueue(item),
    clear: () => clearVideoQueue(),
  };
}

export function useInVideoQueue(id: string | null | undefined): boolean {
  const queue = useSyncExternalStore(subscribeVideoQueue, getVideoQueue, () => []);
  if (!id) return false;
  return queue.some((item) => item.id === id);
}
