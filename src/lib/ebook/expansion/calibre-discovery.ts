/**
 * Calibre & Self-Hosted Mesh Discovery for Argus Books
 *
 * Automatically detects:
 * - Calibre Content Server (default: http://127.0.0.1:8080/opds)
 * - Calibre-Web (default: http://127.0.0.1:8083/opds)
 * - Kavita Manga/Book Server (default: http://127.0.0.1:5000/api/opds)
 * - Audiobookshelf OPDS (default: http://127.0.0.1:13378/opds)
 * - Komga Library Server (default: http://127.0.0.1:25600/opds/v1.2/catalog)
 */

export interface DiscoveredLibrary {
  name: string;
  type: "calibre" | "calibre-web" | "kavita" | "standard-ebooks" | "audiobookshelf" | "komga";
  url: string;
  isOnline: boolean;
  bookCount?: number;
}

const COMMON_LOCAL_PORTS = [
  { name: "Calibre Content Server", type: "calibre" as const, url: "http://127.0.0.1:8080/opds" },
  { name: "Calibre-Web Server", type: "calibre-web" as const, url: "http://127.0.0.1:8083/opds" },
  { name: "Kavita Library Server", type: "kavita" as const, url: "http://127.0.0.1:5000/api/opds" },
  { name: "Audiobookshelf OPDS", type: "audiobookshelf" as const, url: "http://127.0.0.1:13378/opds" },
  { name: "Komga Library Server", type: "komga" as const, url: "http://127.0.0.1:25600/opds/v1.2/catalog" },
];

/** Probes local network ports for active OPDS library servers */
export async function probeLocalBookLibraries(): Promise<DiscoveredLibrary[]> {
  const results: DiscoveredLibrary[] = [];

  for (const item of COMMON_LOCAL_PORTS) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 600);
      const res = await fetch(item.url, { method: "HEAD", signal: controller.signal });
      clearTimeout(timer);

      if (res.ok || res.status === 401) {
        // 401 means server is active but authenticated
        results.push({
          ...item,
          isOnline: true,
        });
      }
    } catch {
      // offline
    }
  }

  return results;
}
