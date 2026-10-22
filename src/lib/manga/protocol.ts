import type { Chapter, SearchPage, SeriesDetail, SeriesSummary } from "./types";

export function normalizeBaseUrl(raw: string): string | null {
  try {
    const u = new URL(raw.trim());
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    u.hash = "";
    u.search = "";
    return u.href.replace(/\/+$/, "");
  } catch {
    return null;
  }
}

function str(v: unknown): string | undefined {
  if (typeof v === "string") return v.trim() || undefined;
  if (typeof v === "number" && Number.isFinite(v)) return String(v);
  return undefined;
}

function resolveUrl(base: string, v: unknown): string | undefined {
  const s = str(v);
  if (!s) return undefined;
  try {
    const u = new URL(s, `${base}/`);
    return u.protocol === "http:" || u.protocol === "https:" || u.protocol === "data:"
      ? u.href
      : undefined;
  } catch {
    return undefined;
  }
}

export function parseChapterNumber(v: unknown): number | null {
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (typeof v !== "string") return null;
  const m = v.match(/-?\d+(?:\.\d+)?/);
  return m ? Number(m[0]) : null;
}

export function parseSeries(base: string, raw: unknown): SeriesSummary | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const id = str(o.id);
  const title = str(o.title);
  if (!id || !title) return null;
  const tags = Array.isArray(o.tags)
    ? o.tags.map(str).filter((t): t is string => !!t)
    : undefined;
  return {
    id,
    title,
    cover: resolveUrl(base, o.cover),
    description: str(o.description),
    author: str(o.author),
    status: str(o.status),
    tags: tags?.length ? tags : undefined,
  };
}

export function parseChapter(raw: unknown): Chapter | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const id = str(o.id);
  if (!id) return null;
  const number = parseChapterNumber(o.number);
  return {
    id,
    number,
    title: str(o.title) ?? (number !== null ? `Chapter ${number}` : "Chapter"),
    volume: str(o.volume),
    date: str(o.date),
    language: str(o.language),
    group: str(o.group),
  };
}

/** Oldest first. Chapters without a number keep their relative order at the end. */
export function sortChapters(chapters: Chapter[]): Chapter[] {
  return chapters
    .map((c, i) => ({ c, i }))
    .sort((a, b) => {
      const an = a.c.number;
      const bn = b.c.number;
      if (an !== null && bn !== null && an !== bn) return an - bn;
      if (an !== null && bn === null) return -1;
      if (an === null && bn !== null) return 1;
      return a.i - b.i;
    })
    .map((x) => x.c);
}

export function parseSearch(base: string, raw: unknown): SearchPage {
  const o = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const list = Array.isArray(o.results) ? o.results : Array.isArray(raw) ? (raw as unknown[]) : [];
  const results = list
    .map((r) => parseSeries(base, r))
    .filter((s): s is SeriesSummary => s !== null);
  return { results, hasMore: o.hasMore === true };
}

export function parseSeriesDetail(base: string, raw: unknown): SeriesDetail | null {
  const summary = parseSeries(base, raw);
  if (!summary) return null;
  const list = (raw as Record<string, unknown>).chapters;
  const chapters = Array.isArray(list)
    ? list.map(parseChapter).filter((c): c is Chapter => c !== null)
    : [];
  const seen = new Set<string>();
  const unique = chapters.filter((c) => (seen.has(c.id) ? false : (seen.add(c.id), true)));
  return { ...summary, chapters: sortChapters(unique) };
}

export function parsePages(base: string, raw: unknown): string[] {
  const list = (raw && typeof raw === "object" ? (raw as Record<string, unknown>).pages : null) as
    | unknown[]
    | null;
  if (!Array.isArray(list)) return [];
  return list
    .map((p) =>
      resolveUrl(base, typeof p === "object" && p ? (p as Record<string, unknown>).url : p),
    )
    .filter((u): u is string => !!u);
}
