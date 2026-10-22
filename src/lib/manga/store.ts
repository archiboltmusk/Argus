import { useSyncExternalStore } from "react";
import {
  type ChapterProgress,
  type LibraryEntry,
  type MangaSource,
  type ReaderPrefs,
  type SeriesProgress,
} from "./types";

type PersistedStore<T> = {
  get: () => T;
  set: (next: T) => void;
  use: () => T;
};

function persisted<T>(key: string, initial: T, valid: (v: unknown) => v is T): PersistedStore<T> {
  let cache: T | null = null;
  const listeners = new Set<() => void>();
  const get = (): T => {
    if (cache !== null) return cache;
    try {
      const raw = localStorage.getItem(key);
      const parsed = raw ? JSON.parse(raw) : null;
      cache = valid(parsed) ? parsed : initial;
    } catch {
      cache = initial;
    }
    return cache;
  };
  const set = (next: T) => {
    cache = next;
    try {
      localStorage.setItem(key, JSON.stringify(next));
    } catch {
      /* storage unavailable */
    }
    for (const l of listeners) l();
  };
  const subscribe = (cb: () => void) => {
    listeners.add(cb);
    return () => listeners.delete(cb);
  };
  return { get, set, use: () => useSyncExternalStore(subscribe, get, () => initial) };
}

const isArray = (v: unknown): v is unknown[] => Array.isArray(v);
const isObject = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === "object" && !Array.isArray(v);

const sources = persisted<MangaSource[]>("argus.manga.sources.v1", [], (v): v is MangaSource[] =>
  isArray(v),
);
const library = persisted<LibraryEntry[]>("argus.manga.library.v1", [], (v): v is LibraryEntry[] =>
  isArray(v),
);
const progress = persisted<Record<string, SeriesProgress>>(
  "argus.manga.progress.v1",
  {},
  (v): v is Record<string, SeriesProgress> => isObject(v),
);

export const DEFAULT_PREFS: ReaderPrefs = {
  mode: "paged",
  direction: "ltr",
  fit: "both",
  spread: false,
};
const prefs = persisted<ReaderPrefs>(
  "argus.manga.prefs.v1",
  DEFAULT_PREFS,
  (v): v is ReaderPrefs => isObject(v),
);

export const useMangaSources = sources.use;
export const useMangaLibrary = library.use;
export const useMangaProgress = progress.use;
export const useReaderPrefs = (): ReaderPrefs => ({ ...DEFAULT_PREFS, ...prefs.use() });
export const setReaderPrefs = (patch: Partial<ReaderPrefs>) =>
  prefs.set({ ...DEFAULT_PREFS, ...prefs.get(), ...patch });

export const entryKey = (sourceId: string, seriesId: string) => `${sourceId}::${seriesId}`;

export function getSource(id: string): MangaSource | undefined {
  return sources.get().find((s) => s.id === id);
}

export function addSource(source: Omit<MangaSource, "id" | "enabled">): MangaSource {
  const existing = sources.get().find((s) => s.baseUrl === source.baseUrl);
  if (existing) return existing;
  const added: MangaSource = { ...source, id: crypto.randomUUID(), enabled: true };
  sources.set([...sources.get(), added]);
  return added;
}

export function updateSource(id: string, patch: Partial<MangaSource>) {
  sources.set(sources.get().map((s) => (s.id === id ? { ...s, ...patch } : s)));
}

export function removeSource(id: string) {
  sources.set(sources.get().filter((s) => s.id !== id));
}

export function inLibrary(key: string): boolean {
  return library.get().some((e) => e.key === key);
}

export function addToLibrary(entry: Omit<LibraryEntry, "key" | "addedAt">) {
  const key = entryKey(entry.sourceId, entry.seriesId);
  if (inLibrary(key)) return;
  library.set([{ ...entry, key, addedAt: Date.now() }, ...library.get()]);
}

export function removeFromLibrary(key: string) {
  library.set(library.get().filter((e) => e.key !== key));
}

export function getProgress(key: string): SeriesProgress | undefined {
  return progress.get()[key];
}

export function saveProgress(key: string, chapter: ChapterProgress) {
  const all = progress.get();
  const prev = all[key] ?? { last: null, read: [] };
  const finished = chapter.total > 0 && chapter.page >= chapter.total - 1;
  const read =
    finished && !prev.read.includes(chapter.chapterId)
      ? [...prev.read, chapter.chapterId]
      : prev.read;
  progress.set({ ...all, [key]: { last: chapter, read } });
}

export function setChapterRead(key: string, chapterId: string, read: boolean) {
  const all = progress.get();
  const prev = all[key] ?? { last: null, read: [] };
  const has = prev.read.includes(chapterId);
  if (read === has) return;
  progress.set({
    ...all,
    [key]: { ...prev, read: read ? [...prev.read, chapterId] : prev.read.filter((c) => c !== chapterId) },
  });
}

export function clearProgress(key: string) {
  const { [key]: _drop, ...rest } = progress.get();
  progress.set(rest);
}
