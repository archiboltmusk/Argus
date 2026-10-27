import { safeFetch } from "@/lib/safe-fetch";
import { isAdultManga, isAdultTag } from "../model";
import {
  MANGA_PAGE,
  mangaThrottle,
  type MangaChapter,
  type MangaProvider,
  type MangaSummary,
  type MangaTag,
} from "../types";

const API_BASE = "https://api.mangadex.org";
const COVER_BASE = "https://uploads.mangadex.org/covers";
const SAFE_RATINGS = "contentRating[]=safe&contentRating[]=suggestive";
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const gate = mangaThrottle(220);

type MdLocalized = Record<string, string | undefined>;

type MdRelationship = {
  id: string;
  type: string;
  attributes?: Record<string, unknown>;
};

type MdTag = {
  id: string;
  attributes?: {
    name?: MdLocalized;
    group?: string;
  };
};

type MdManga = {
  id: string;
  attributes?: {
    title?: MdLocalized;
    altTitles?: MdLocalized[];
    description?: MdLocalized;
    status?: string;
    year?: number | null;
    contentRating?: string;
    lastChapter?: string | null;
    tags?: MdTag[];
  };
  relationships?: MdRelationship[];
};

function pickText(map?: MdLocalized | null): string | undefined {
  if (!map) return undefined;
  return (
    map.en ??
    map["en-us"] ??
    map["ja-ro"] ??
    map["ko-ro"] ??
    map["zh-ro"] ??
    Object.values(map).find((v) => typeof v === "string" && v.trim().length > 0)
  )?.trim();
}

function pickAltTitle(title: string, alts?: MdLocalized[]): string | undefined {
  if (!Array.isArray(alts)) return undefined;
  const preferredKeys = ["en", "ja-ro", "ja", "ko", "zh"];
  for (const key of preferredKeys) {
    for (const entry of alts) {
      const val = entry?.[key]?.trim();
      if (val && val.toLowerCase() !== title.toLowerCase()) return val;
    }
  }
  for (const entry of alts) {
    const val = pickText(entry);
    if (val && val.toLowerCase() !== title.toLowerCase()) return val;
  }
  return undefined;
}

function mapMangaDexItem(raw: MdManga): MangaSummary | null {
  if (!raw?.id || !raw.attributes) return null;
  const attr = raw.attributes;
  const rating = (attr.contentRating ?? "safe").toLowerCase();
  if (rating !== "safe" && rating !== "suggestive") return null;

  const title = pickText(attr.title);
  if (!title) return null;

  const genres = (attr.tags ?? [])
    .map((t) => pickText(t.attributes?.name))
    .filter((n): n is string => !!n);

  const altTitle = pickAltTitle(title, attr.altTitles);

  if (
    isAdultManga({
      title,
      altTitle,
      contentRating: rating,
      genres,
    })
  ) {
    return null;
  }

  let coverFile: string | undefined;
  let authorName: string | undefined;
  for (const rel of raw.relationships ?? []) {
    if (rel.type === "cover_art" && typeof rel.attributes?.fileName === "string") {
      coverFile = rel.attributes.fileName;
    } else if (
      (rel.type === "author" || rel.type === "artist") &&
      !authorName &&
      typeof rel.attributes?.name === "string"
    ) {
      authorName = rel.attributes.name;
    }
  }

  const cover = coverFile ? `${COVER_BASE}/${raw.id}/${coverFile}.512.jpg` : undefined;
  const description = pickText(attr.description);

  return {
    id: raw.id,
    title,
    altTitle,
    cover,
    year: typeof attr.year === "number" ? attr.year : undefined,
    status: attr.status ?? undefined,
    description,
    contentRating: rating,
    lastChapter: attr.lastChapter || undefined,
    author: authorName,
  };
}

async function fetchJson<T>(url: string): Promise<T | null> {
  try {
    const res = await gate(() => safeFetch(url));
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export const mangadexProvider: MangaProvider = {
  id: "mangadex",
  name: "MangaDex",

  async popular(offset = 0, tagId?: string): Promise<MangaSummary[]> {
    const limit = Math.min(MANGA_PAGE, 48);
    const tagParam = tagId && UUID_RE.test(tagId) ? `&includedTags[]=${encodeURIComponent(tagId)}` : "";
    const url = `${API_BASE}/manga?limit=${limit}&offset=${offset}&includes[]=cover_art&includes[]=author&${SAFE_RATINGS}&order[followedCount]=desc&hasAvailableChapters=true${tagParam}`;
    const data = await fetchJson<{ data?: MdManga[] }>(url);
    return (data?.data ?? []).map(mapMangaDexItem).filter((m): m is MangaSummary => m != null);
  },

  async search(query: string, offset = 0, tagId?: string): Promise<MangaSummary[]> {
    const q = query.trim();
    if (!q) return this.popular(offset, tagId);
    const limit = Math.min(MANGA_PAGE, 48);
    const tagParam = tagId && UUID_RE.test(tagId) ? `&includedTags[]=${encodeURIComponent(tagId)}` : "";
    const url = `${API_BASE}/manga?limit=${limit}&offset=${offset}&title=${encodeURIComponent(q)}&includes[]=cover_art&includes[]=author&${SAFE_RATINGS}&order[relevance]=desc${tagParam}`;
    const data = await fetchJson<{ data?: MdManga[] }>(url);
    return (data?.data ?? []).map(mapMangaDexItem).filter((m): m is MangaSummary => m != null);
  },

  async detail(id: string): Promise<MangaSummary | null> {
    const cleanId = id.trim();
    if (!cleanId) return null;
    const url = `${API_BASE}/manga/${encodeURIComponent(cleanId)}?includes[]=cover_art&includes[]=author`;
    const data = await fetchJson<{ data?: MdManga }>(url);
    return data?.data ? mapMangaDexItem(data.data) : null;
  },

  async chapters(id: string): Promise<MangaChapter[]> {
    const cleanId = id.trim();
    if (!cleanId) return [];
    const out: MangaChapter[] = [];
    const limit = 500;
    for (let page = 0; page < 3; page++) {
      const offset = page * limit;
      const url = `${API_BASE}/manga/${encodeURIComponent(cleanId)}/feed?limit=${limit}&offset=${offset}&${SAFE_RATINGS}&order[chapter]=asc&includes[]=scanlation_group&includeExternalUrl=0`;
      const res = await fetchJson<{
        data?: Array<{
          id: string;
          attributes?: {
            chapter?: string | null;
            title?: string | null;
            volume?: string | null;
            pages?: number;
            translatedLanguage?: string;
            publishAt?: string;
            externalUrl?: string | null;
          };
          relationships?: MdRelationship[];
        }>;
        total?: number;
      }>(url);
      const list = res?.data ?? [];
      if (list.length === 0) break;
      for (const ch of list) {
        const attr = ch.attributes;
        if (!ch.id || !attr || attr.externalUrl) continue;
        const pages = typeof attr.pages === "number" ? attr.pages : 0;
        if (pages <= 0) continue;
        const groupRel = (ch.relationships ?? []).find((r) => r.type === "scanlation_group");
        const group =
          typeof groupRel?.attributes?.name === "string" ? groupRel.attributes.name : undefined;
        out.push({
          id: ch.id,
          chapter: attr.chapter != null && attr.chapter !== "" ? String(attr.chapter) : null,
          title: attr.title?.trim() || undefined,
          volume: attr.volume != null && attr.volume !== "" ? String(attr.volume) : null,
          pages,
          language: (attr.translatedLanguage ?? "en").toLowerCase(),
          group,
          publishAt: attr.publishAt ?? undefined,
        });
      }
      if (res?.total == null || offset + list.length >= res.total) break;
    }
    return out;
  },

  async pageUrls(chapterId: string): Promise<string[]> {
    const cleanId = chapterId.trim();
    if (!cleanId) return [];
    const data = await fetchJson<{
      baseUrl?: string;
      chapter?: { hash?: string; data?: string[]; dataSaver?: string[] };
    }>(`${API_BASE}/at-home/server/${encodeURIComponent(cleanId)}`);
    const baseUrl = data?.baseUrl;
    const hash = data?.chapter?.hash;
    const files = data?.chapter?.data;
    if (!baseUrl || !hash || !Array.isArray(files) || files.length === 0) return [];
    return files.map((file) => `${baseUrl}/data/${hash}/${file}`);
  },

  async tags(): Promise<MangaTag[]> {
    const data = await fetchJson<{ data?: MdTag[] }>(`${API_BASE}/manga/tag`);
    const out: MangaTag[] = [];
    for (const tag of data?.data ?? []) {
      const name = pickText(tag.attributes?.name);
      if (!tag.id || !name) continue;
      if (isAdultTag({ id: tag.id, name })) continue;
      const rawGroup = tag.attributes?.group ?? "genre";
      const group = rawGroup.charAt(0).toUpperCase() + rawGroup.slice(1);
      out.push({ id: tag.id, name, group });
    }
    return out.sort((a, b) => a.name.localeCompare(b.name));
  },
};
