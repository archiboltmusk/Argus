import type { Stream } from "./types";

export type Indexer = {
  id: string;
  name: string;
  kind: "torznab" | "newznab";
  url: string;
  apiKey: string;
  enabled: boolean;
};

export type IndexerQuery = {
  type: "movie" | "series";
  imdbId: string;
  title: string;
  year?: number;
  season?: number;
  episode?: number;
};

function decode(s: string): string {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

function tag(item: string, name: string): string | null {
  const m = item.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`, "i"));
  return m ? decode(m[1]).trim() : null;
}

function attrs(item: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const m of item.matchAll(/<(?:torznab|newznab):attr\s+name="([^"]+)"\s+value="([^"]*)"/gi)) {
    out[m[1].toLowerCase()] = decode(m[2]);
  }
  return out;
}

function hashFromMagnet(magnet: string | null | undefined): string | null {
  const m = magnet?.match(/btih:([a-f0-9]{40}|[A-Z2-7]{32})/i);
  return m && m[1].length === 40 ? m[1].toLowerCase() : null;
}

// Torznab/Newznab RSS into Stremio-shaped streams. Results without an info
// hash (torrent) or NZB link (usenet) are skipped: nothing to hand a debrid.
export function parseFeed(xml: string, indexer: Indexer): Stream[] {
  const out: Stream[] = [];
  for (const m of xml.matchAll(/<item>([\s\S]*?)<\/item>/gi)) {
    const item = m[1];
    const title = tag(item, "title");
    if (!title) continue;
    const a = attrs(item);
    const enclosure = decode(item.match(/<enclosure[^>]*\burl="([^"]+)"/i)?.[1] ?? "");
    const link = tag(item, "link") ?? "";
    const size = Number(a.size ?? item.match(/<enclosure[^>]*\blength="(\d+)"/i)?.[1] ?? 0) || undefined;
    const base = {
      name: indexer.name,
      title,
      addonId: `indexer:${indexer.id}`,
      addonName: indexer.name,
      behaviorHints: { filename: title, ...(size ? { videoSize: size } : {}) },
    };
    if (indexer.kind === "newznab") {
      const nzb = enclosure || link;
      if (nzb) out.push({ ...base, nzbUrl: nzb });
      continue;
    }
    const infoHash =
      (a.infohash && /^[a-f0-9]{40}$/i.test(a.infohash) ? a.infohash.toLowerCase() : null) ??
      hashFromMagnet(a.magneturl) ??
      hashFromMagnet(enclosure) ??
      hashFromMagnet(link);
    if (!infoHash) continue;
    const seeders = a.seeders ? ` 👤 ${a.seeders}` : "";
    out.push({ ...base, title: `${title}${seeders}`, infoHash });
  }
  return out;
}

export function buildSearchUrl(indexer: Indexer, q: IndexerQuery, mode: "id" | "text"): string {
  const base = indexer.url.replace(/\/+$/, "");
  const u = new URL(base.includes("?") || base.endsWith("/api") ? base : `${base}/api`);
  const set = (k: string, v: string | number | undefined) => v != null && u.searchParams.set(k, String(v));
  set("apikey", indexer.apiKey);
  set("extended", 1);
  if (mode === "id" && q.imdbId.startsWith("tt")) {
    set("t", q.type === "movie" ? "movie" : "tvsearch");
    set("imdbid", q.imdbId);
  } else {
    set("t", q.type === "movie" ? "movie" : "tvsearch");
    set("q", q.type === "movie" && q.year ? `${q.title} ${q.year}` : q.title);
  }
  if (q.type === "series") {
    set("season", q.season);
    set("ep", q.episode);
  }
  return u.toString();
}
