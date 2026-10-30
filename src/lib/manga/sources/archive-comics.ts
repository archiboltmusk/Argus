/**
 * Internet Archive & Open Comic Vault Native Provider for Argus
 *
 * Provides native access to digitized Indian comics (Amar Chitra Katha, Raj Comics, Tinkle),
 * European BDs (Tintin, Asterix preservation vaults), and Golden Age open-domain comics
 * directly through the Internet Archive open API without requiring external daemons.
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

function mapArchiveDoc(doc: ArchiveDoc): MangaSummary | null {
  if (!doc?.identifier) return null;
  const id = doc.identifier;
  const title = doc.title || id.replace(/[_-]+/g, " ");
  const cover = `https://archive.org/services/img/${encodeURIComponent(id)}`;

  return {
    id,
    title,
    cover,
    author: doc.creator,
    description: doc.description?.replace(/<[^>]*>/g, ""),
    status: "completed",
  };
}

export const archiveComicsProvider: MangaProvider = {
  id: "archive_comics",
  name: "Archive Comic Vault",

  async popular(offset = 0): Promise<MangaSummary[]> {
    const page = Math.floor(offset / 30) + 1;
    const query = "(collection:comic_books OR collection:amar-chitra-katha OR collection:comicbookplus OR title:Nagraj OR title:Tinkle)";
    const url = `${SEARCH_API}?q=${encodeURIComponent(query)}&fl[]=identifier,title,creator,description,downloads,year&sort[]=downloads+desc&rows=30&page=${page}&output=json`;

    const data = await fetchJson<{ response?: { docs?: ArchiveDoc[] } }>(url);
    const docs = data?.response?.docs ?? [];
    return docs.map(mapArchiveDoc).filter((m): m is MangaSummary => m != null);
  },

  async search(query: string, offset = 0): Promise<MangaSummary[]> {
    const q = query.trim();
    if (!q) return this.popular(offset);
    const page = Math.floor(offset / 30) + 1;
    const archiveQuery = `(${q}) AND (mediatype:texts OR collection:comic_books OR collection:amar-chitra-katha)`;
    const url = `${SEARCH_API}?q=${encodeURIComponent(archiveQuery)}&fl[]=identifier,title,creator,description,downloads,year&sort[]=downloads+desc&rows=30&page=${page}&output=json`;

    const data = await fetchJson<{ response?: { docs?: ArchiveDoc[] } }>(url);
    const docs = data?.response?.docs ?? [];
    return docs.map(mapArchiveDoc).filter((m): m is MangaSummary => m != null);
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
      author: data.metadata.creator,
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
        title: "Complete Issue / Volume",
        pages: 36,
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

    const imageCount = parseInt(data?.metadata?.imagecount || "32", 10);
    const pages: string[] = [];

    // Check if direct single-page images are declared in metadata
    const files = data?.files ?? [];
    const directImages = files.filter(
      (f) =>
        f.name &&
        !f.name.endsWith("_thumb.jpg") &&
        /\.(jpe?g|png|webp)$/i.test(f.name) &&
        f.source !== "derivative",
    );

    if (directImages.length > 5) {
      return directImages.map((f) => `https://archive.org/download/${encodeURIComponent(cleanId)}/${f.name}`);
    }

    // Default: use the standard Internet Archive page-service stream
    const total = Math.min(Math.max(imageCount, 12), 120);
    for (let i = 0; i < total; i++) {
      pages.push(`https://archive.org/download/${encodeURIComponent(cleanId)}/page/n${i}.jpg`);
    }
    return pages;
  },
};
