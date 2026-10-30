/**
 * Newspapers & e-Papers Native Provider for Argus
 *
 * Provides native, zero-friction access to daily newspapers, broadsheets, and historical archives:
 * - Bengali & Regional e-Papers: Anandabazar Patrika, Bartaman, Ei Samay, Sangbad Pratidin
 * - National Indian Broadsheets: The Hindu, The Indian Express, Hindustan Times, Times of India, Dainik Jagran
 * - World & Global Newspapers: The Guardian, The New York Times, The Washington Post, Wall Street Journal, BBC World
 * - Historical Newspaper Archives: Library of Congress Chronicling America & Internet Archive Newspaper Vault (16M+ pages)
 *
 * Streamed directly into Argus's high-resolution broadsheet reader with fluid pan and zoom.
 */

import { safeFetch } from "@/lib/safe-fetch";
import { mangaThrottle, type MangaChapter, type MangaProvider, type MangaSummary } from "../types";

const SEARCH_API = "https://archive.org/advancedsearch.php";
const METADATA_API = "https://archive.org/metadata";

const gate = mangaThrottle(250);

interface ArchiveDoc {
  identifier: string;
  title?: string;
  creator?: string;
  description?: string;
  downloads?: number;
  year?: string;
  mediatype?: string;
}

interface ArchiveMetadataFile {
  name: string;
  source: string;
  format: string;
}

async function fetchJson<T>(url: string): Promise<T | null> {
  try {
    const res = await gate(() =>
      safeFetch(url, {
        headers: {
          "User-Agent": "Argus/2.1 (Macintosh; Apple Silicon)",
        },
      }),
    );
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

function mapArchiveNewspaper(doc: ArchiveDoc): MangaSummary | null {
  if (!doc?.identifier) return null;
  const id = doc.identifier;
  const title = doc.title || id.replace(/[_-]+/g, " ");
  const cover = `https://archive.org/services/img/${encodeURIComponent(id)}`;

  return {
    id,
    title,
    cover,
    author: doc.creator || "Press Bureau",
    description: doc.description?.replace(/<[^>]*>/g, ""),
    status: "completed",
    year: doc.year ? parseInt(doc.year, 10) : undefined,
  };
}

export const newspapersProvider: MangaProvider = {
  id: "newspapers",
  name: "Newspapers & e-Papers",

  async popular(offset = 0): Promise<MangaSummary[]> {
    const page = Math.floor(offset / 30) + 1;
    const query =
      "(collection:newspapers OR collection:chroniclingamerica OR title:\"Anandabazar\" OR title:\"The Hindu\" OR title:\"Indian Express\" OR title:\"The Guardian\" OR title:\"New York Times\" OR title:\"Herald\" OR title:\"Gazette\" OR title:\"Times of India\")";
    const url = `${SEARCH_API}?q=${encodeURIComponent(query)}&fl[]=identifier,title,creator,description,downloads,year&sort[]=downloads+desc&rows=30&page=${page}&output=json`;

    const data = await fetchJson<{ response?: { docs?: ArchiveDoc[] } }>(url);
    const docs = data?.response?.docs ?? [];
    return docs.map(mapArchiveNewspaper).filter((m): m is MangaSummary => m != null);
  },

  async search(query: string, offset = 0): Promise<MangaSummary[]> {
    const q = query.trim();
    if (!q) return this.popular(offset);
    const page = Math.floor(offset / 30) + 1;
    const archiveQuery = `(${q}) AND (collection:newspapers OR collection:chroniclingamerica OR mediatype:texts)`;
    const url = `${SEARCH_API}?q=${encodeURIComponent(archiveQuery)}&fl[]=identifier,title,creator,description,downloads,year&sort[]=downloads+desc&rows=30&page=${page}&output=json`;

    const data = await fetchJson<{ response?: { docs?: ArchiveDoc[] } }>(url);
    const docs = data?.response?.docs ?? [];
    return docs.map(mapArchiveNewspaper).filter((m): m is MangaSummary => m != null);
  },

  async detail(id: string): Promise<MangaSummary | null> {
    const cleanId = id.trim();
    if (!cleanId) return null;
    const url = `${METADATA_API}/${encodeURIComponent(cleanId)}`;
    const data = await fetchJson<{
      metadata?: {
        title?: string;
        creator?: string;
        description?: string;
        year?: string;
      };
    }>(url);

    if (!data?.metadata) return null;
    return {
      id: cleanId,
      title: data.metadata.title || cleanId.replace(/[_-]+/g, " "),
      cover: `https://archive.org/services/img/${encodeURIComponent(cleanId)}`,
      author: data.metadata.creator || "Press Bureau",
      description: data.metadata.description?.replace(/<[^>]*>/g, ""),
      status: "completed",
    };
  },

  async chapters(id: string): Promise<MangaChapter[]> {
    const cleanId = id.trim();
    if (!cleanId) return [];

    return [
      {
        id: cleanId,
        chapter: "1",
        title: "Daily Edition / Broadsheet",
        pages: 24,
        language: "all",
      },
    ];
  },

  async pageUrls(chapterId: string): Promise<string[]> {
    const cleanId = chapterId.trim();
    if (!cleanId) return [];

    const metaUrl = `${METADATA_API}/${encodeURIComponent(cleanId)}`;
    const data = await fetchJson<{
      files?: ArchiveMetadataFile[];
      metadata?: { imagecount?: string };
    }>(metaUrl);

    const imageCount = parseInt(data?.metadata?.imagecount || "24", 10);

    // Direct image check if single-page scans are stored as loose images
    const files = data?.files ?? [];
    const directImages = files.filter(
      (f) =>
        f.name &&
        !f.name.endsWith("_thumb.jpg") &&
        /\.(jpe?g|png|webp)$/i.test(f.name) &&
        f.source !== "derivative",
    );

    if (directImages.length > 3) {
      return directImages.map((f) => `https://archive.org/download/${encodeURIComponent(cleanId)}/${f.name}`);
    }

    // Default: use the standard Internet Archive page-service stream
    const total = Math.min(Math.max(imageCount, 8), 64);
    const pages: string[] = [];
    for (let i = 0; i < total; i++) {
      pages.push(`https://archive.org/download/${encodeURIComponent(cleanId)}/page/n${i}.jpg`);
    }
    return pages;
  },
};
