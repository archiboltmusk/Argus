/**
 * ComicK Native Provider for Argus
 *
 * Provides native, zero-friction access to Western comics, graphic novels,
 * and manga directly through ComicK's open API without requiring external daemons.
 */

import { safeFetch } from "@/lib/safe-fetch";
import { mangaThrottle, type MangaChapter, type MangaProvider, type MangaSummary } from "../types";
import { isAdultManga } from "../model";

const API_BASE = "https://api.comick.fun";
const CDN_BASE = "https://meo.comick.pictures";

const gate = mangaThrottle(250);

interface ComickSearchItem {
  id: number;
  hid: string;
  slug: string;
  title: string;
  country?: string;
  status?: number;
  last_chapter?: string;
  desc?: string;
  md_covers?: Array<{ bkey: string }>;
  rating?: string;
  content_rating?: string;
}

interface ComickChapterItem {
  id: number;
  hid: string;
  chap?: string;
  vol?: string;
  title?: string;
  lang?: string;
  created_at?: string;
  group_name?: string[];
}

async function fetchJson<T>(url: string): Promise<T | null> {
  try {
    const res = await gate(() =>
      safeFetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        },
      }),
    );
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

function mapComicItem(item: ComickSearchItem): MangaSummary | null {
  if (!item || !item.hid || !item.title) return null;

  const coverFile = item.md_covers?.[0]?.bkey;
  const cover = coverFile ? `${CDN_BASE}/${coverFile}` : undefined;

  const summary: MangaSummary = {
    id: item.hid,
    title: item.title,
    cover,
    status: item.status === 1 ? "ongoing" : item.status === 2 ? "completed" : undefined,
    description: item.desc?.replace(/<[^>]*>/g, ""),
    lastChapter: item.last_chapter,
  };

  if (isAdultManga(summary)) return null;
  return summary;
}

export const comickProvider: MangaProvider = {
  id: "comick",
  name: "ComicK",

  async popular(offset = 0): Promise<MangaSummary[]> {
    const page = Math.floor(offset / 30) + 1;
    const url = `${API_BASE}/v1.0/search?sort=view&page=${page}&limit=30`;
    const data = await fetchJson<ComickSearchItem[]>(url);
    if (!Array.isArray(data)) return [];
    return data.map(mapComicItem).filter((m): m is MangaSummary => m != null);
  },

  async search(query: string, offset = 0): Promise<MangaSummary[]> {
    const q = query.trim();
    if (!q) return this.popular(offset);
    const page = Math.floor(offset / 30) + 1;
    const url = `${API_BASE}/v1.0/search?q=${encodeURIComponent(q)}&page=${page}&limit=30`;
    const data = await fetchJson<ComickSearchItem[]>(url);
    if (!Array.isArray(data)) return [];
    return data.map(mapComicItem).filter((m): m is MangaSummary => m != null);
  },

  async detail(id: string): Promise<MangaSummary | null> {
    const cleanId = id.trim();
    if (!cleanId) return null;
    const url = `${API_BASE}/comic/${encodeURIComponent(cleanId)}`;
    const data = await fetchJson<{ comic?: ComickSearchItem; authors?: Array<{ name: string }> }>(url);
    if (!data?.comic) return null;

    const mapped = mapComicItem(data.comic);
    if (!mapped) return null;

    if (data.authors?.length) {
      mapped.author = data.authors.map((a) => a.name).join(", ");
    }
    return mapped;
  },

  async chapters(id: string): Promise<MangaChapter[]> {
    const cleanId = id.trim();
    if (!cleanId) return [];
    const url = `${API_BASE}/comic/${encodeURIComponent(cleanId)}/chapters?lang=en&limit=150`;
    const data = await fetchJson<{ chapters?: ComickChapterItem[] }>(url);
    const list = data?.chapters ?? [];

    return list.map((c) => ({
      id: c.hid,
      chapter: c.chap ?? null,
      volume: c.vol ?? null,
      title: c.title || undefined,
      pages: 1,
      language: c.lang || "en",
      group: c.group_name?.[0],
      publishAt: c.created_at,
    }));
  },

  async pageUrls(chapterId: string): Promise<string[]> {
    const cleanId = chapterId.trim();
    if (!cleanId) return [];
    const url = `${API_BASE}/chapter/${encodeURIComponent(cleanId)}`;
    const data = await fetchJson<{ chapter?: { images?: Array<{ bkey: string }> } }>(url);
    const images = data?.chapter?.images ?? [];

    return images
      .filter((img) => typeof img.bkey === "string" && img.bkey.length > 0)
      .map((img) => `${CDN_BASE}/${img.bkey}`);
  },
};
