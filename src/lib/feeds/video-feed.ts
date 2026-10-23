import { safeFetchLocal } from "@/lib/safe-fetch";

export type VideoFeedConfig = { id: string; name: string; url: string };

export type VideoFeedItem = {
  id: string;
  title: string;
  /** Playable URL: an RSS enclosure, or a YouTube watch page for official YouTube feeds. */
  url: string;
  published?: number;
  durationSec?: number;
  thumbnail?: string;
};

const VIDEO_ENCLOSURE = /^video\/|\.(mp4|m4v|mov|webm|mkv|m3u8)(\?|$)/i;

function text(parent: Element, tag: string): string | undefined {
  return parent.getElementsByTagNameNS("*", tag)[0]?.textContent?.trim() || undefined;
}

function seconds(raw: string | undefined): number | undefined {
  if (!raw) return undefined;
  if (/^\d+$/.test(raw)) return Number(raw);
  const parts = raw.split(":").map(Number);
  if (parts.some((n) => !Number.isFinite(n))) return undefined;
  return parts.reduce((total, n) => total * 60 + n, 0);
}

/**
 * Parses an RSS 2.0 video podcast or an Atom feed, including YouTube's official
 * channel/playlist feeds (youtube.com/feeds/videos.xml). Items without a video
 * to play are dropped. Order is the feed's own order.
 */
export function parseVideoFeed(xml: string): { title: string; items: VideoFeedItem[] } {
  const doc = new DOMParser().parseFromString(xml, "application/xml");
  if (doc.getElementsByTagName("parsererror").length > 0) return { title: "", items: [] };
  const root = doc.documentElement;
  const channel = root.getElementsByTagName("channel")[0] ?? root;
  const feedTitle = Array.from(channel.children).find((c) => c.localName === "title")?.textContent;
  const items: VideoFeedItem[] = [];
  const entries = [
    ...Array.from(doc.getElementsByTagName("item")),
    ...Array.from(doc.getElementsByTagNameNS("*", "entry")),
  ];
  for (const entry of entries) {
    const title = text(entry, "title") ?? "Untitled";
    const published = Date.parse(text(entry, "pubDate") ?? text(entry, "published") ?? "") || undefined;
    const ytId = text(entry, "videoId");
    let url: string | undefined;
    if (ytId && /^[\w-]{6,20}$/.test(ytId)) {
      url = `https://www.youtube.com/watch?v=${ytId}`;
    } else {
      const enclosure = Array.from(entry.getElementsByTagName("enclosure")).find((e) =>
        VIDEO_ENCLOSURE.test(e.getAttribute("type") ?? e.getAttribute("url") ?? ""),
      );
      const content = Array.from(entry.getElementsByTagNameNS("*", "content")).find((e) =>
        VIDEO_ENCLOSURE.test(e.getAttribute("type") ?? e.getAttribute("url") ?? ""),
      );
      url = enclosure?.getAttribute("url") ?? content?.getAttribute("url") ?? undefined;
    }
    if (!url || !/^https?:\/\//i.test(url)) continue;
    const thumb =
      entry.getElementsByTagNameNS("*", "thumbnail")[0]?.getAttribute("url") ??
      entry.getElementsByTagNameNS("*", "image")[0]?.getAttribute("href") ??
      undefined;
    items.push({
      id: text(entry, "guid") ?? text(entry, "id") ?? url,
      title,
      url,
      published,
      durationSec: seconds(text(entry, "duration")),
      thumbnail: thumb,
    });
  }
  return { title: feedTitle?.trim() ?? "", items };
}

/** Lectures numbered in their titles ("Lecture 2") read in order; otherwise the feed's own order stands. */
export function orderLectures(items: VideoFeedItem[]): VideoFeedItem[] {
  const collator = new Intl.Collator(undefined, { numeric: true });
  const numbered = items.filter((i) => /\d/.test(i.title)).length === items.length;
  if (!numbered || items.length < 2) return items;
  return [...items].sort((a, b) => collator.compare(a.title, b.title));
}

export async function fetchVideoFeed(url: string) {
  const r = await safeFetchLocal(url, { headers: { Accept: "application/rss+xml, application/atom+xml, text/xml" } });
  if (!r.ok) throw new Error(`Feed answered ${r.status}.`);
  return parseVideoFeed(await r.text());
}
