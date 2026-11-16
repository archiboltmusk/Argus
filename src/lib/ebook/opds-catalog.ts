/**
 * OPDS Literature & Open Library Engine (Calibre + Standard Ebooks + Gutenberg Equivalent)
 * Ingests Open Publication Distribution System (OPDS) XML/Atom catalogs,
 * parses EPUB metadata, and provides Bionic Reading fixation rendering for accelerated reading.
 */

export interface OpdsBookEntry {
  id: string;
  title: string;
  authors: string[];
  summary?: string;
  coverUrl?: string;
  downloadUrl?: string;
  format: "epub" | "pdf" | "cbz" | "mobi";
  genres?: string[];
  publishedYear?: string;
  sourceFeed: "standard-ebooks" | "project-gutenberg" | "calibre" | "custom";
}

export const CURATED_OPDS_FEEDS = {
  standardEbooks: "https://standardebooks.org/opds/all",
  projectGutenberg: "https://m.gutenberg.org/ebooks.opds/",
};

// Preset Classical Literature for offline demonstration and testing
export const CURATED_CLASSIC_BOOKS: OpdsBookEntry[] = [
  {
    id: "se-crime-and-punishment",
    title: "Crime and Punishment",
    authors: ["Fyodor Dostoevsky"],
    summary: "A desperate former student in Saint Petersburg formulates a theory of extraordinary individuals and murders a pawnbroker.",
    coverUrl: "https://standardebooks.org/ebooks/fyodor-dostoevsky/crime-and-punishment/constance-garnett/downloads/cover-thumbnail.jpg",
    downloadUrl: "https://standardebooks.org/ebooks/fyodor-dostoevsky/crime-and-punishment/constance-garnett/downloads/fyodor-dostoevsky_crime-and-punishment_constance-garnett.epub",
    format: "epub",
    genres: ["Psychological Fiction", "Classics", "Philosophy"],
    publishedYear: "1866",
    sourceFeed: "standard-ebooks",
  },
  {
    id: "se-the-brothers-karamazov",
    title: "The Brothers Karamazov",
    authors: ["Fyodor Dostoevsky"],
    summary: "A passionate philosophical novel exploring morality, faith, free will, and the murder of a hedonistic father.",
    coverUrl: "https://standardebooks.org/ebooks/fyodor-dostoevsky/the-brothers-karamazov/constance-garnett/downloads/cover-thumbnail.jpg",
    downloadUrl: "https://standardebooks.org/ebooks/fyodor-dostoevsky/the-brothers-karamazov/constance-garnett/downloads/fyodor-dostoevsky_the-brothers-karamazov_constance-garnett.epub",
    format: "epub",
    genres: ["Philosophical Fiction", "Classics"],
    publishedYear: "1880",
    sourceFeed: "standard-ebooks",
  },
  {
    id: "se-the-metamorphosis",
    title: "The Metamorphosis",
    authors: ["Franz Kafka"],
    summary: "Gregor Samsa wakes up one morning to find himself transformed into a monstrous insect.",
    coverUrl: "https://standardebooks.org/ebooks/franz-kafka/the-metamorphosis/ian-johnston/downloads/cover-thumbnail.jpg",
    downloadUrl: "https://standardebooks.org/ebooks/franz-kafka/the-metamorphosis/ian-johnston/downloads/franz-kafka_the-metamorphosis_ian-johnston.epub",
    format: "epub",
    genres: ["Absurdist Fiction", "Novella"],
    publishedYear: "1915",
    sourceFeed: "standard-ebooks",
  },
  {
    id: "se-frankenstein",
    title: "Frankenstein",
    authors: ["Mary Shelley"],
    summary: "A young scientist animates a sentient creature in an unorthodox scientific experiment, with tragic consequences.",
    coverUrl: "https://standardebooks.org/ebooks/mary-shelley/frankenstein/downloads/cover-thumbnail.jpg",
    downloadUrl: "https://standardebooks.org/ebooks/mary-shelley/frankenstein/downloads/mary-shelley_frankenstein.epub",
    format: "epub",
    genres: ["Gothic Horror", "Science Fiction"],
    publishedYear: "1818",
    sourceFeed: "standard-ebooks",
  },
];

/**
 * Escapes raw text to prevent HTML injection while preserving textual characters.
 */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Bionic Reading Transformer
 * Bolds the first 40%-50% of letters in each word (fixation points)
 * to guide the eye and dramatically reduce cognitive reading fatigue.
 * Fully sanitized to eliminate XSS / HTML injection from unvalidated ebooks.
 */
export function formatBionicReading(text: string): string {
  if (!text) return "";

  return text
    .split(/\s+/)
    .map((rawWord) => {
      if (rawWord.length <= 1) return escapeHtml(rawWord);

      // Extract leading/trailing punctuation
      const match = rawWord.match(/^([^\w]*)([\w'-]+)([^\w]*)$/);
      if (!match) return escapeHtml(rawWord);

      const [, prefix, core, suffix] = match;
      const fixationLen = Math.ceil(core.length * 0.45);
      const boldPart = core.slice(0, fixationLen);
      const restPart = core.slice(fixationLen);

      return `${escapeHtml(prefix)}<b>${escapeHtml(boldPart)}</b>${escapeHtml(restPart)}${escapeHtml(suffix)}`;
    })
    .join(" ");
}

export class OpdsLiteratureEngine {
  private library: OpdsBookEntry[] = [...CURATED_CLASSIC_BOOKS];

  constructor(customBooks: OpdsBookEntry[] = []) {
    if (customBooks.length > 0) {
      this.library.push(...customBooks);
    }
  }

  public getBooks(): OpdsBookEntry[] {
    return [...this.library];
  }

  public searchBooks(term: string): OpdsBookEntry[] {
    const q = term.toLowerCase().trim();
    if (!q) return this.library;

    return this.library.filter((b) => {
      const matchTitle = b.title.toLowerCase().includes(q);
      const matchAuthor = b.authors.some((a) => a.toLowerCase().includes(q));
      const matchGenre = b.genres?.some((g) => g.toLowerCase().includes(q));
      return matchTitle || matchAuthor || matchGenre;
    });
  }

  /**
   * Parses an OPDS Atom/XML text feed into normalized book entries.
   */
  public parseOpdsXml(xmlText: string, feedType: OpdsBookEntry["sourceFeed"] = "custom"): OpdsBookEntry[] {
    const books: OpdsBookEntry[] = [];
    // Match <entry> blocks in Atom feed
    const entryRegex = /<entry[\s\S]*?<\/entry>/gi;
    const matches = xmlText.match(entryRegex) || [];

    for (const block of matches) {
      const titleMatch = block.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
      const idMatch = block.match(/<id[^>]*>([\s\S]*?)<\/id>/i);
      const authorMatch = block.match(/<author>[\s\S]*?<name[^>]*>([\s\S]*?)<\/name>[\s\S]*?<\/author>/i);
      const summaryMatch = block.match(/<summary[^>]*>([\s\S]*?)<\/summary>/i);
      const epubLinkMatch = block.match(/<link[^>]+type="application\/epub\+zip"[^>]+href="([^"]+)"/i);
      const coverMatch = block.match(/<link[^>]+rel="http:\/\/opds-spec\.org\/image"[^>]+href="([^"]+)"/i);

      if (titleMatch) {
        const title = titleMatch[1].replace(/<!\[CDATA\[|\]\]>/g, "").trim();
        const id = idMatch ? idMatch[1].trim() : `book-${Math.random().toString(36).slice(2, 9)}`;
        const author = authorMatch ? authorMatch[1].trim() : "Unknown Author";
        const summary = summaryMatch ? summaryMatch[1].replace(/<[^>]+>/g, "").trim() : undefined;

        books.push({
          id,
          title,
          authors: [author],
          summary,
          format: "epub",
          downloadUrl: epubLinkMatch ? epubLinkMatch[1] : undefined,
          coverUrl: coverMatch ? coverMatch[1] : undefined,
          sourceFeed: feedType,
        });
      }
    }

    return books;
  }
}
