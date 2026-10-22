import { useSyncExternalStore } from "react";
import { setItemWithRecovery } from "@/lib/storage-recovery";
import {
  bookId,
  formatFromPath,
  normalizeBooks,
  normalizePrefs,
  titleFromPath,
  type BookRecord,
  type BookmarkEntry,
  type ReaderPrefs,
} from "./books-core";

const BOOKS_KEY = "argus.books.v1";
const PREFS_KEY = "argus.books.prefs.v1";
const COVER_KEY = "argus.books.cover.";

let books: BookRecord[] | null = null;
let prefs: ReaderPrefs | null = null;
const subs = new Set<() => void>();

function load<T>(key: string): unknown {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function persist(key: string, value: unknown) {
  try {
    setItemWithRecovery(key, JSON.stringify(value));
  } catch {}
}

function emit() {
  for (const fn of subs) fn();
}

function snapshot(): BookRecord[] {
  if (!books) books = normalizeBooks(load(BOOKS_KEY));
  return books;
}

function commit(next: BookRecord[]) {
  books = next;
  persist(BOOKS_KEY, next);
  emit();
}

function subscribe(fn: () => void) {
  subs.add(fn);
  return () => {
    subs.delete(fn);
  };
}

export function useBooks(): BookRecord[] {
  return useSyncExternalStore(subscribe, snapshot, snapshot);
}

export function useBook(id: string | null): BookRecord | null {
  const all = useBooks();
  return id ? (all.find((b) => b.id === id) ?? null) : null;
}

export function getBook(id: string): BookRecord | null {
  return snapshot().find((b) => b.id === id) ?? null;
}

export type NewBook = { path: string; title?: string; author?: string; pages?: number };

/** Adds a book unless its path is already in the library. Returns the record either way. */
export function addBook(input: NewBook): BookRecord | null {
  const format = formatFromPath(input.path);
  if (!format) return null;
  const id = bookId(input.path);
  const existing = snapshot().find((b) => b.id === id);
  if (existing) return existing;
  const now = Date.now();
  const record: BookRecord = {
    id,
    path: input.path,
    format,
    title: input.title?.trim() || titleFromPath(input.path),
    author: input.author?.trim() ?? "",
    addedAt: now,
    openedAt: 0,
    progress: 0,
    chapter: 0,
    fraction: 0,
    pages: input.pages,
    hasCover: false,
    bookmarks: [],
  };
  commit([...snapshot(), record]);
  return record;
}

export function updateBook(id: string, patch: Partial<Omit<BookRecord, "id" | "path" | "format">>) {
  const all = snapshot();
  if (!all.some((b) => b.id === id)) return;
  commit(all.map((b) => (b.id === id ? { ...b, ...patch } : b)));
}

export function removeBook(id: string) {
  commit(snapshot().filter((b) => b.id !== id));
  try {
    localStorage.removeItem(COVER_KEY + id);
  } catch {}
}

export function addBookmark(id: string, mark: Omit<BookmarkEntry, "id" | "createdAt">) {
  const book = getBook(id);
  if (!book) return;
  const entry: BookmarkEntry = {
    ...mark,
    id: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
    createdAt: Date.now(),
  };
  updateBook(id, { bookmarks: [...book.bookmarks, entry].slice(-200) });
}

export function removeBookmark(id: string, markId: string) {
  const book = getBook(id);
  if (book) updateBook(id, { bookmarks: book.bookmarks.filter((m) => m.id !== markId) });
}

export function setCover(id: string, dataUrl: string) {
  if (setItemWithRecovery(COVER_KEY + id, dataUrl)) updateBook(id, { hasCover: true });
}

export function readCover(id: string): string | null {
  try {
    return localStorage.getItem(COVER_KEY + id);
  } catch {
    return null;
  }
}

export function getPrefs(): ReaderPrefs {
  if (!prefs) prefs = normalizePrefs(load(PREFS_KEY));
  return prefs;
}

export function setPrefs(patch: Partial<ReaderPrefs>) {
  prefs = normalizePrefs({ ...getPrefs(), ...patch });
  persist(PREFS_KEY, prefs);
  emit();
}

export function usePrefs(): ReaderPrefs {
  return useSyncExternalStore(subscribe, getPrefs, getPrefs);
}
