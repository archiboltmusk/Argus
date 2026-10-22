export type BookFormat = "epub" | "pdf";

export type BookmarkEntry = {
  id: string;
  label: string;
  progress: number;
  chapter: number;
  fraction: number;
  createdAt: number;
};

export type BookRecord = {
  id: string;
  path: string;
  format: BookFormat;
  title: string;
  author: string;
  addedAt: number;
  openedAt: number;
  /** 0..1 across the whole book. */
  progress: number;
  /** EPUB: spine index. PDF: zero-based page. */
  chapter: number;
  /** EPUB: position inside the chapter (0..1). */
  fraction: number;
  pages?: number;
  hasCover: boolean;
  bookmarks: BookmarkEntry[];
};

export const BOOK_EXTENSIONS = ["epub", "pdf"] as const;

export function formatFromPath(path: string): BookFormat | null {
  const ext = path.slice(path.lastIndexOf(".") + 1).toLowerCase();
  return ext === "epub" || ext === "pdf" ? ext : null;
}

export function bookId(path: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < path.length; i++) {
    h ^= path.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(36);
}

export function titleFromPath(path: string): string {
  const name = path.split(/[\\/]/).pop() ?? path;
  return (
    name
      .replace(/\.[^.]+$/, "")
      .replace(/[_]+/g, " ")
      .trim() || name
  );
}

export type LibrarySort = "recent" | "title" | "author" | "added";

export function sortBooks(books: BookRecord[], sort: LibrarySort): BookRecord[] {
  const copy = [...books];
  const text = (a: string, b: string) =>
    a.localeCompare(b, undefined, { sensitivity: "base", numeric: true });
  if (sort === "title") return copy.sort((a, b) => text(a.title, b.title));
  if (sort === "author") {
    return copy.sort(
      (a, b) =>
        Number(!a.author) - Number(!b.author) || text(a.author, b.author) || text(a.title, b.title),
    );
  }
  if (sort === "added") return copy.sort((a, b) => b.addedAt - a.addedAt);
  return copy.sort((a, b) => b.openedAt - a.openedAt || b.addedAt - a.addedAt);
}

export type ReadingShelf = "all" | "reading" | "unread" | "finished";

export function shelfOf(book: Pick<BookRecord, "progress">): Exclude<ReadingShelf, "all"> {
  if (book.progress >= 0.97) return "finished";
  return book.progress > 0.005 ? "reading" : "unread";
}

export function filterBooks(books: BookRecord[], shelf: ReadingShelf, query: string): BookRecord[] {
  const q = query.trim().toLowerCase();
  return books.filter(
    (b) =>
      (shelf === "all" || shelfOf(b) === shelf) &&
      (!q || `${b.title} ${b.author}`.toLowerCase().includes(q)),
  );
}

export type ReaderTheme = "light" | "sepia" | "dark";
export type ReaderLayout = "scroll" | "paged";

export type ReaderPrefs = {
  theme: ReaderTheme;
  layout: ReaderLayout;
  font: "serif" | "sans";
  fontSize: number;
  lineHeight: number;
  margin: number;
  publisherStyles: boolean;
};

export const DEFAULT_PREFS: ReaderPrefs = {
  theme: "dark",
  layout: "scroll",
  font: "serif",
  fontSize: 19,
  lineHeight: 1.65,
  margin: 56,
  publisherStyles: false,
};

const clamp = (v: unknown, min: number, max: number, fallback: number) =>
  typeof v === "number" && Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : fallback;

export function normalizePrefs(raw: unknown): ReaderPrefs {
  const r = (raw && typeof raw === "object" ? raw : {}) as Partial<
    Record<keyof ReaderPrefs, unknown>
  >;
  return {
    theme:
      r.theme === "light" || r.theme === "sepia" || r.theme === "dark"
        ? r.theme
        : DEFAULT_PREFS.theme,
    layout: r.layout === "paged" || r.layout === "scroll" ? r.layout : DEFAULT_PREFS.layout,
    font: r.font === "sans" || r.font === "serif" ? r.font : DEFAULT_PREFS.font,
    fontSize: clamp(r.fontSize, 12, 36, DEFAULT_PREFS.fontSize),
    lineHeight: clamp(r.lineHeight, 1.2, 2.2, DEFAULT_PREFS.lineHeight),
    margin: clamp(r.margin, 8, 160, DEFAULT_PREFS.margin),
    publisherStyles: r.publisherStyles === true,
  };
}

/** Normalizes anything read back from storage into valid records. */
export function normalizeBooks(raw: unknown): BookRecord[] {
  if (!Array.isArray(raw)) return [];
  const out: BookRecord[] = [];
  const seen = new Set<string>();
  for (const el of raw) {
    if (!el || typeof el !== "object") continue;
    const b = el as Partial<BookRecord>;
    if (typeof b.path !== "string" || !formatFromPath(b.path)) continue;
    const id = bookId(b.path);
    if (seen.has(id)) continue;
    seen.add(id);
    out.push({
      id,
      path: b.path,
      format: formatFromPath(b.path)!,
      title: typeof b.title === "string" && b.title ? b.title : titleFromPath(b.path),
      author: typeof b.author === "string" ? b.author : "",
      addedAt: clamp(b.addedAt, 0, Number.MAX_SAFE_INTEGER, 0),
      openedAt: clamp(b.openedAt, 0, Number.MAX_SAFE_INTEGER, 0),
      progress: clamp(b.progress, 0, 1, 0),
      chapter: Math.max(0, Math.floor(clamp(b.chapter, 0, 1e6, 0))),
      fraction: clamp(b.fraction, 0, 1, 0),
      pages: typeof b.pages === "number" ? b.pages : undefined,
      hasCover: b.hasCover === true,
      bookmarks: Array.isArray(b.bookmarks)
        ? b.bookmarks.filter(
            (m): m is BookmarkEntry =>
              !!m && typeof m.id === "string" && typeof m.label === "string",
          )
        : [],
    });
  }
  return out;
}
