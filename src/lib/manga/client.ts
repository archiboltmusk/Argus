import { safeFetch } from "@/lib/safe-fetch";
import {
  parsePages,
  parseSearch,
  parseSeriesDetail,
} from "./protocol";
import type { MangaSource, SearchPage, SeriesDetail } from "./types";

const TIMEOUT_MS = 15_000;

async function getJson(source: Pick<MangaSource, "baseUrl">, path: string): Promise<unknown> {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), TIMEOUT_MS);
  try {
    const res = await safeFetch(`${source.baseUrl}${path}`, {
      headers: { accept: "application/json" },
      signal: ctl.signal,
    });
    if (!res.ok) throw new Error(`Source answered ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchManifest(baseUrl: string): Promise<{ name: string }> {
  const raw = (await getJson({ baseUrl }, "/manifest.json")) as Record<string, unknown> | null;
  const name = raw && typeof raw === "object" && typeof raw.name === "string" ? raw.name.trim() : "";
  if (!name) throw new Error("Not a manga source (manifest has no name)");
  return { name };
}

export async function searchSeries(
  source: MangaSource,
  query: string,
  page = 1,
): Promise<SearchPage> {
  const qs = new URLSearchParams({ q: query, page: String(page) });
  return parseSearch(source.baseUrl, await getJson(source, `/search?${qs}`));
}

export async function fetchSeries(source: MangaSource, id: string): Promise<SeriesDetail> {
  const detail = parseSeriesDetail(
    source.baseUrl,
    await getJson(source, `/series/${encodeURIComponent(id)}`),
  );
  if (!detail) throw new Error("Source returned an invalid series");
  return detail;
}

export async function fetchPages(source: MangaSource, chapterId: string): Promise<string[]> {
  const pages = parsePages(
    source.baseUrl,
    await getJson(source, `/chapter/${encodeURIComponent(chapterId)}`),
  );
  if (pages.length === 0) throw new Error("This chapter has no pages");
  return pages;
}
