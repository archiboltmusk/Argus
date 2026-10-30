/**
 * Universal Shadow Libraries & Mega-Catalogs Resolver for Argus Books
 *
 * Integrates:
 * - Anna's Archive (35M+ books, papers, and comics indexing LibGen, Z-Library, Internet Archive)
 * - Library Genesis (LibGen) multi-mirror resolver (.is, .rs, .li)
 * - Standard Ebooks (Curated typography, fine-art public domain masterpieces)
 * - National Digital Library of India (NDLI) & Bengal Literary Vault
 * - AudioBookBay (ABB) audiobook stream & magnet resolver
 */

export interface RemoteBookResult {
  id: string;
  title: string;
  author: string;
  year?: number;
  extension: "epub" | "pdf" | "mobi" | "cbz" | "m4b" | "mp3";
  sizeMb?: number;
  coverUrl?: string;
  source: "annas-archive" | "libgen" | "standard-ebooks" | "indic-library" | "audiobookbay" | "torrent";
  downloadUrl?: string;
  magnetUri?: string;
  ipfsCid?: string;
  language?: string;
  description?: string;
}

const ANNAS_ARCHIVE_MIRRORS = [
  "https://annas-archive.org",
  "https://annas-archive.se",
  "https://annas-archive.li",
];

const LIBGEN_MIRRORS = [
  "https://libgen.is",
  "https://libgen.rs",
  "https://libgen.li",
];

export const STANDARD_EBOOKS_OPDS = "https://standardebooks.org/opds/all";
export const OPEN_LIBRARY_API = "https://openlibrary.org";
export const NDLI_PORTAL = "https://ndl.iitkgp.ac.in";

/** Search Anna's Archive for books by title, author, or ISBN */
export async function searchAnnasArchive(query: string, lang = "all"): Promise<RemoteBookResult[]> {
  const clean = encodeURIComponent(query.trim());
  if (!clean) return [];

  const base = ANNAS_ARCHIVE_MIRRORS[0];
  const url = `${base}/search?q=${clean}&ext=epub&sort=`;

  try {
    const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)" } });
    if (!res.ok) return [];
    const html = await res.text();

    const matches: RemoteBookResult[] = [];
    // Fast regex extraction of book cards from Anna's archive search HTML
    const cardRegex = /<a href="\/md5\/([a-f0-9]{32})"[\s\S]*?<h3[^>]*>([\s\S]*?)<\/h3>[\s\S]*?<div class="truncate text-xs text-gray-500">([\s\S]*?)<\/div>/gi;
    let match;
    while ((match = cardRegex.exec(html)) !== null && matches.length < 20) {
      const md5 = match[1];
      const title = match[2].replace(/<[^>]+>/g, "").trim();
      const metadataLine = match[3].replace(/<[^>]+>/g, "").trim();

      matches.push({
        id: `anna-${md5}`,
        title,
        author: metadataLine.split("·")[0]?.trim() || "Unknown Author",
        extension: "epub",
        source: "annas-archive",
        downloadUrl: `${base}/md5/${md5}`,
        coverUrl: `https://covers.openlibrary.org/b/isbn/${md5}-M.jpg`,
      });
    }
    return matches;
  } catch (err) {
    console.warn("[annas-archive] search failed:", err);
    return [];
  }
}

/** Search Library Genesis mirrors by keyword or ISBN */
export async function searchLibGen(query: string): Promise<RemoteBookResult[]> {
  const clean = encodeURIComponent(query.trim());
  if (!clean) return [];

  const base = LIBGEN_MIRRORS[0];
  const searchUrl = `${base}/search.php?req=${clean}&open=0&res=25&view=simple&phrase=1&column=def`;

  try {
    const res = await fetch(searchUrl);
    if (!res.ok) return [];
    const html = await res.text();

    const items: RemoteBookResult[] = [];
    const rowRegex = /<tr valign="top">[\s\S]*?<td>(\d+)<\/td>[\s\S]*?<td>(.*?)<\/td>[\s\S]*?<a href="book\/index\.php\?md5=([a-f0-9]{32})" id="\d+">(.*?)<\/a>[\s\S]*?<td>(.*?)<\/td>[\s\S]*?<td>(.*?)<\/td>[\s\S]*?<td>(.*?)<\/td>/gi;
    let m;
    while ((m = rowRegex.exec(html)) !== null && items.length < 20) {
      const author = m[2].replace(/<[^>]+>/g, "").trim();
      const md5 = m[3];
      const title = m[4].replace(/<[^>]+>/g, "").trim();
      const year = parseInt(m[5].trim(), 10) || undefined;
      const sizeStr = m[6].trim();
      const ext = m[7].toLowerCase().trim();

      items.push({
        id: `libgen-${md5}`,
        title,
        author,
        year,
        extension: ext.includes("epub") ? "epub" : ext.includes("pdf") ? "pdf" : "epub",
        source: "libgen",
        downloadUrl: `http://library.lol/main/${md5}`,
        coverUrl: `${base}/covers/${md5.slice(0, 4)}/${md5}-d.jpg`,
      });
    }
    return items;
  } catch (err) {
    console.warn("[libgen] search error:", err);
    return [];
  }
}

/** Pre-curated Bengali & Indic digital library metadata collections */
export const INDIC_LITERARY_VAULT: RemoteBookResult[] = [
  {
    id: "indic-tagore-gitanjali",
    title: "Gitanjali (Song Offerings)",
    author: "Rabindranath Tagore",
    year: 1912,
    extension: "epub",
    source: "indic-library",
    downloadUrl: "https://www.gutenberg.org/ebooks/7164.epub.images",
    coverUrl: "https://www.gutenberg.org/cache/epub/7164/pg7164.cover.medium.jpg",
    language: "bn/en",
    description: "Nobel Prize winning poetry collection with introduction by W.B. Yeats.",
  },
  {
    id: "indic-tagore-gora",
    title: "Gora (গোরা)",
    author: "Rabindranath Tagore",
    year: 1910,
    extension: "epub",
    source: "indic-library",
    downloadUrl: "https://www.gutenberg.org/ebooks/47376.epub.images",
    coverUrl: "https://covers.openlibrary.org/b/id/8315186-L.jpg",
    language: "bn/en",
    description: "Epic sociological novel examining identity, religion, and freedom in colonial Bengal.",
  },
  {
    id: "indic-chattopadhyay-anandamath",
    title: "Anandamath (আনন্দমঠ - Dawn of Freedom)",
    author: "Bankim Chandra Chattopadhyay",
    year: 1882,
    extension: "epub",
    source: "indic-library",
    downloadUrl: "https://archive.org/download/anandamath_bengali_classic/anandamath.epub",
    coverUrl: "https://covers.openlibrary.org/b/id/8231451-L.jpg",
    language: "bn",
    description: "Iconic historical novel set during the Sannyasi Rebellion; origin of 'Vande Mataram'.",
  },
  {
    id: "indic-chattopadhyay-devdas",
    title: "Devdas (দেবদাস)",
    author: "Sarat Chandra Chattopadhyay",
    year: 1917,
    extension: "epub",
    source: "indic-library",
    downloadUrl: "https://archive.org/download/devdas_bengali_novel/devdas.epub",
    coverUrl: "https://covers.openlibrary.org/b/id/7981242-L.jpg",
    language: "bn",
    description: "Timeless classic of tragic romance and social hierarchy in rural Bengal.",
  },
  {
    id: "indic-bandyopadhyay-pather-panchali",
    title: "Pather Panchali (পথের পাঁচালী - Song of the Road)",
    author: "Bibhutibhushan Bandyopadhyay",
    year: 1929,
    extension: "epub",
    source: "indic-library",
    downloadUrl: "https://archive.org/download/pather_panchali_bibhutibhushan/pather_panchali.epub",
    coverUrl: "https://covers.openlibrary.org/b/id/8212456-L.jpg",
    language: "bn",
    description: "The seminal coming-of-age masterpiece that inspired Satyajit Ray's cinematic landmark.",
  },
  {
    id: "indic-ray-feluda-complete",
    title: "The Complete Feluda Adventures ( ফেলুদা সমগ্র )",
    author: "Satyajit Ray",
    year: 1965,
    extension: "epub",
    source: "indic-library",
    downloadUrl: "https://archive.org/download/feluda_samagra_satyajit_ray/feluda_samagra.epub",
    coverUrl: "https://covers.openlibrary.org/b/id/8412903-L.jpg",
    language: "bn/en",
    description: "All 35 classic detective adventures featuring Prodosh C. Mitter, Topshe, and Lalmohan Ganguly (Jatayu).",
  },
  {
    id: "indic-sukumar-ray-abol-tabol",
    title: "Abol Tabol (আবোল তাবোল - Rhymes of Fancy)",
    author: "Sukumar Ray",
    year: 1923,
    extension: "epub",
    source: "indic-library",
    downloadUrl: "https://archive.org/download/abol_tabol_sukumar_ray/abol_tabol.epub",
    coverUrl: "https://covers.openlibrary.org/b/id/8119042-L.jpg",
    language: "bn",
    description: "Classic Bengali nonsense verse and satirical illustrated whimsy.",
  },
];

/** Search AudioBookBay (ABB) for spoken literature and audiobooks */
export async function searchAudioBookBay(query: string): Promise<RemoteBookResult[]> {
  const clean = encodeURIComponent(query.trim());
  if (!clean) return [];

  // Scrapes ABB torrent feed
  const url = `https://audiobookbay.lu/?s=${clean}`;
  try {
    const res = await fetch(url);
    if (!res.ok) return [];
    const html = await res.text();

    const items: RemoteBookResult[] = [];
    const postRegex = /<div class="post">[\s\S]*?<div class="postTitle"><h2><a href="([^"]+)">([^<]+)<\/a>[\s\S]*?<img src="([^"]+)"[\s\S]*?<p class="postInfo">[\s\S]*?Format:<\/b>\s*([^<]+)[\s\S]*?<\/div>/gi;
    let m;
    while ((m = postRegex.exec(html)) !== null && items.length < 15) {
      const detailPath = m[1];
      const title = m[2].trim();
      const coverUrl = m[3];
      const format = m[4].trim().toLowerCase();

      items.push({
        id: `abb-${encodeURIComponent(detailPath)}`,
        title,
        author: "Audiobook Edition",
        extension: format.includes("m4b") ? "m4b" : "mp3",
        source: "audiobookbay",
        downloadUrl: `https://audiobookbay.lu${detailPath}`,
        coverUrl,
      });
    }
    return items;
  } catch (err) {
    console.warn("[audiobookbay] search error:", err);
    return [];
  }
}
