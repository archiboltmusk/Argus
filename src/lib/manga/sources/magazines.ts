/**
 * Magazines & Periodicals Native Provider for Argus
 *
 * Provides native, zero-friction access to millions of digitized magazine issues:
 * - Indian & Bengali Classics: Anandamela, Sandesh, Desh, India Today, Frontline, Chandamama, Outlook
 * - Science, Nature & Tech: National Geographic, Wired, Scientific American, Popular Mechanics, Byte
 * - Global News & Culture: Time, The New Yorker, Life, Rolling Stone, Vogue, Newsweek
 * - Retro Gaming & Tech: Nintendo Power, Retro Gamer, Edge, PC Gamer, Compute!
 *
 * Streamed directly from open digital preservation archives into Argus's dual-page & 3D flipbook reader.
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

function mapArchiveMagazine(doc: ArchiveDoc): MangaSummary | null {
  if (!doc?.identifier) return null;
  const id = doc.identifier;
  const title = doc.title || id.replace(/[_-]+/g, " ");
  const cover = `https://archive.org/services/img/${encodeURIComponent(id)}`;

  return {
    id,
    title,
    cover,
    author: doc.creator || "Editorial Board",
    description: doc.description?.replace(/<[^>]*>/g, ""),
    status: "completed",
    year: doc.year ? parseInt(doc.year, 10) : undefined,
  };
}

export const magazinesProvider: MangaProvider = {
  id: "magazines",
  name: "Magazines & Periodicals",

  async popular(offset = 0): Promise<MangaSummary[]> {
    const page = Math.floor(offset / 30) + 1;
    const query =
      "(collection:magazine_rack OR collection:computermagazines OR collection:nationalgeographic OR title:Anandamela OR title:\"Time Magazine\" OR title:Wired OR title:\"National Geographic\" OR title:Desh OR title:\"India Today\" OR title:\"Nintendo Power\")";
    const url = `${SEARCH_API}?q=${encodeURIComponent(query)}&fl[]=identifier,title,creator,description,downloads,year&sort[]=downloads+desc&rows=30&page=${page}&output=json`;

    const data = await fetchJson<{ response?: { docs?: ArchiveDoc[] } }>(url);
    const docs = data?.response?.docs ?? [];
    return docs.map(mapArchiveMagazine).filter((m): m is MangaSummary => m != null);
  },

  async search(query: string, offset = 0): Promise<MangaSummary[]> {
    const q = query.trim();
    if (!q) return this.popular(offset);
    const page = Math.floor(offset / 30) + 1;
    const archiveQuery = `(${q}) AND (collection:magazine_rack OR collection:computermagazines OR collection:inlibrary OR mediatype:texts)`;
    const url = `${SEARCH_API}?q=${encodeURIComponent(archiveQuery)}&fl[]=identifier,title,creator,description,downloads,year&sort[]=downloads+desc&rows=30&page=${page}&output=json`;

    const data = await fetchJson<{ response?: { docs?: ArchiveDoc[] } }>(url);
    const docs = data?.response?.docs ?? [];
    return docs.map(mapArchiveMagazine).filter((m): m is MangaSummary => m != null);
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
      author: data.metadata.creator || "Editorial Board",
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
        title: "Full Magazine Issue",
        pages: 64,
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

    const imageCount = parseInt(data?.metadata?.imagecount || "64", 10);

    // Direct image check if single-page scans are stored as loose images
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
    const total = Math.min(Math.max(imageCount, 16), 180);
    const pages: string[] = [];
    for (let i = 0; i < total; i++) {
      pages.push(`https://archive.org/download/${encodeURIComponent(cleanId)}/page/n${i}.jpg`);
    }
    return pages;
  },
};
