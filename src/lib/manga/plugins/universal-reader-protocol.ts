/**
 * Universal Polyglot Reader Protocol for Argus
 *
 * Implements a unified abstraction over diverse extension formats:
 * - LNReader (JavaScript/TypeScript Web Novel Scrapers)
 * - Mangayomi (JavaScript/WASM Manga Scrapers)
 * - Paperback (TypeScript Mobile Scrapers)
 * - Legado / 阅读 (Declarative XPath & CSS Rule Trees)
 * - Stremio Addon Protocol (REST Stream Manifests)
 */

export interface UniversalMediaSummary {
  id: string;
  title: string;
  author?: string;
  coverUrl?: string;
  description?: string;
  mediaType: "manga" | "webnovel" | "ebook" | "comic";
  sourceName: string;
  sourceId: string;
}

export interface UniversalChapter {
  id: string;
  title: string;
  chapterNumber?: number;
  releaseDate?: string;
  sourceUrl: string;
}

export type UniversalChapterContent =
  | { type: "pages"; pages: Array<{ url: string; headers?: Record<string, string> }> }
  | { type: "text"; html: string; wordCount: number }
  | { type: "stream"; url: string };

export interface UniversalReaderPlugin {
  id: string;
  name: string;
  mediaType: "manga" | "webnovel" | "ebook" | "comic";
  formatType: "lnreader" | "mangayomi" | "paperback" | "legado" | "stremio";
  search(query: string, page?: number): Promise<UniversalMediaSummary[]>;
  getPopular(page?: number): Promise<UniversalMediaSummary[]>;
  getChapters(itemId: string): Promise<UniversalChapter[]>;
  getContent(chapterId: string): Promise<UniversalChapterContent>;
}

export class UniversalProtocolRegistry {
  private static instance: UniversalProtocolRegistry;
  private plugins: Map<string, UniversalReaderPlugin> = new Map();

  public static getInstance(): UniversalProtocolRegistry {
    if (!UniversalProtocolRegistry.instance) {
      UniversalProtocolRegistry.instance = new UniversalProtocolRegistry();
    }
    return UniversalProtocolRegistry.instance;
  }

  public registerPlugin(plugin: UniversalReaderPlugin): void {
    this.plugins.set(plugin.id, plugin);
  }

  public getPlugin(pluginId: string): UniversalReaderPlugin | undefined {
    return this.plugins.get(pluginId);
  }

  public listPlugins(mediaType?: UniversalMediaSummary["mediaType"]): UniversalReaderPlugin[] {
    const all = Array.from(this.plugins.values());
    if (!mediaType) return all;
    return all.filter((p) => p.mediaType === mediaType);
  }

  /**
   * Sniff raw plugin content or manifest and determine the correct adapter
   */
  public sniffPluginType(raw: string | Record<string, unknown>): UniversalReaderPlugin["formatType"] {
    const str = typeof raw === "string" ? raw : JSON.stringify(raw);

    if (str.includes("popularNovels") || str.includes("@libs/") || str.includes("lnreader")) {
      return "lnreader";
    }
    if (str.includes("sourceCodeUrl") || str.includes("mangayomiSources") || str.includes("itemType")) {
      return "mangayomi";
    }
    if (str.includes("bookSourceUrl") || str.includes("ruleSearch") || str.includes("ruleBookInfo")) {
      return "legado";
    }
    if (str.includes("resources") && str.includes("catalogs")) {
      return "stremio";
    }
    return "mangayomi";
  }
}
