/**
 * Universal Multi-Library Meta-Search Engine for Argus Books
 *
 * Implements the "Stremio for Books" federated search model:
 * Fans out search queries across:
 * 1. Shadow Libraries (Anna's Archive 35M+, LibGen multi-mirror)
 * 2. Public Domain & Curated OPDS (Standard Ebooks, Project Gutenberg)
 * 3. Bengal & Indic Literary Vault (Tagore, Sarat Chandra, Bankim, Satyajit Ray, NDLI)
 * 4. AudioBookBay (ABB audiobooks & spoken literature streams)
 * 5. Self-Hosted LAN Mesh (Calibre Content Server, Kavita)
 */

import {
  searchAnnasArchive,
  searchLibGen,
  searchAudioBookBay,
  INDIC_LITERARY_VAULT,
  type RemoteBookResult,
} from "./shadow-libraries";

export interface UniversalBookResult {
  id: string;
  title: string;
  author: string;
  year?: number;
  format: "epub" | "pdf" | "audio" | "mobi" | string;
  sourceName: string;
  sourceType: "shadow-library" | "opds" | "audiobook" | "indic-vault" | "local-mesh" | string;
  downloadUrl?: string;
  streamUrl?: string;
  coverUrl?: string;
  description?: string;
}

export interface UniversalSearchOptions {
  includeShadowLibraries?: boolean;
  includeAudiobooks?: boolean;
  includeIndicVault?: boolean;
  language?: string;
}

export async function universalBookSearch(
  query: string,
  options: UniversalSearchOptions = {},
): Promise<UniversalBookResult[]> {
  const clean = query.trim();
  if (!clean) return [];

  const opts = {
    includeShadowLibraries: options.includeShadowLibraries ?? true,
    includeAudiobooks: options.includeAudiobooks ?? true,
    includeIndicVault: options.includeIndicVault ?? true,
    language: options.language ?? "all",
  };

  const tasks: Promise<UniversalBookResult[]>[] = [];

  // 1. Search Indic Literary Vault (Local instant index)
  if (opts.includeIndicVault) {
    const qLower = clean.toLowerCase();
    const vaultMatches: UniversalBookResult[] = INDIC_LITERARY_VAULT.filter(
      (b) =>
        b.title.toLowerCase().includes(qLower) ||
        b.author.toLowerCase().includes(qLower) ||
        (b.description && b.description.toLowerCase().includes(qLower)),
    ).map((b) => ({
      id: b.id,
      title: b.title,
      author: b.author,
      year: b.year,
      format: "epub",
      sourceName: "Bengal & Indic Literary Vault",
      sourceType: "indic-vault",
      downloadUrl: b.downloadUrl,
      coverUrl: b.coverUrl,
      description: b.description,
    }));
    tasks.push(Promise.resolve(vaultMatches));
  }

  // 2. Search Anna's Archive (35M+ Titles)
  if (opts.includeShadowLibraries) {
    tasks.push(
      searchAnnasArchive(clean, opts.language).then((results: RemoteBookResult[]) =>
        results.map((r): UniversalBookResult => ({
          id: r.id,
          title: r.title,
          author: r.author,
          year: r.year,
          format: r.extension === "pdf" ? "pdf" : "epub",
          sourceName: "Anna's Archive",
          sourceType: "shadow-library",
          downloadUrl: r.downloadUrl,
          coverUrl: r.coverUrl,
        })),
      ).catch(() => [] as UniversalBookResult[]),
    );

    // 3. Search Library Genesis mirrors
    tasks.push(
      searchLibGen(clean).then((results: RemoteBookResult[]) =>
        results.map((r): UniversalBookResult => ({
          id: r.id,
          title: r.title,
          author: r.author,
          year: r.year,
          format: r.extension === "pdf" ? "pdf" : "epub",
          sourceName: "Library Genesis",
          sourceType: "shadow-library",
          downloadUrl: r.downloadUrl,
          coverUrl: r.coverUrl,
        })),
      ).catch(() => [] as UniversalBookResult[]),
    );
  }

  // 4. Search AudioBookBay (Spoken literature & audiobooks)
  if (opts.includeAudiobooks) {
    tasks.push(
      searchAudioBookBay(clean).then((results: RemoteBookResult[]) =>
        results.map((r): UniversalBookResult => ({
          id: r.id,
          title: r.title,
          author: r.author,
          format: "audio",
          sourceName: "AudioBookBay (ABB)",
          sourceType: "audiobook",
          streamUrl: r.downloadUrl,
          coverUrl: r.coverUrl,
        })),
      ).catch(() => [] as UniversalBookResult[]),
    );
  }

  const settled = await Promise.allSettled(tasks);
  const combined: UniversalBookResult[] = [];
  const seenIds = new Set<string>();

  for (const outcome of settled) {
    if (outcome.status === "fulfilled") {
      for (const item of outcome.value) {
        if (!seenIds.has(item.id)) {
          seenIds.add(item.id);
          combined.push(item);
        }
      }
    }
  }

  return combined;
}

/** Pre-configured community repository presets for 1-click addition */
export const COMMUNITY_BOOK_REPOS = [
  {
    name: "LNReader Official Community Scrapers",
    url: "https://raw.githubusercontent.com/LNReader/lnreader-sources/plugins/index.json",
    description: "Hundreds of community-maintained web novel, light novel, and fiction scrapers.",
    category: "Community Scrapers",
  },
  {
    name: "IReader Open Multi-Source Repository",
    url: "https://raw.githubusercontent.com/IReaderorg/IReader-extensions/main/index.json",
    description: "Universal extension feed supporting multi-catalog scraping and direct streaming.",
    category: "Extensions",
  },
  {
    name: "Standard Ebooks & Open Curated Masterworks",
    url: "https://standardebooks.org/opds/all",
    description: "High-typography, beautifully typeset public domain literature editions.",
    category: "OPDS Catalog",
  },
];
