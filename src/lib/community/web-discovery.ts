import { parseHits } from "../jina-search";
import { parseExternalLink } from "../social/external-link-policy";
import { readPublicText, type PublicRequest } from "./public-json";
import type { CommunityPlace } from "./places";

export const DISCOVERY_TOPICS = [
  {
    id: "services",
    label: "Official services",
    query: "official local government services public authority",
  },
  { id: "notices", label: "Latest notices and news", query: "latest local public notices news" },
  {
    id: "opportunities",
    label: "Work and learning opportunities",
    query: "current jobs training education community opportunities",
  },
  {
    id: "projects",
    label: "Public projects and spending",
    query: "official public projects budget spending progress",
  },
] as const;
export type DiscoveryTopic = (typeof DISCOVERY_TOPICS)[number]["id"];
export type PublicFinding = {
  title: string;
  url: string;
  hostname: string;
  retrievedAt: string;
  publishedAt: null;
  evidenceStatus: "unverified";
  governmentDomainHint: boolean;
};

export function discoveryQuery(place: CommunityPlace, topic: DiscoveryTopic): string {
  const selected = DISCOVERY_TOPICS.find((item) => item.id === topic);
  const context = [place.name, place.region, place.country].filter(Boolean).join(", ");
  if (!selected || !context.trim() || context.length > 400)
    throw new Error("Unsupported public search.");
  return `${context} ${selected.query}`;
}

export function discoveryBrowserUrl(place: CommunityPlace, topic: DiscoveryTopic): string {
  const url = new URL("https://duckduckgo.com/");
  url.searchParams.set("q", discoveryQuery(place, topic));
  url.searchParams.set("df", "m");
  return url.href;
}

function publicSource(raw: string): URL | null {
  const parsed = parseExternalLink(raw);
  if (!parsed.ok || parsed.link.protocol !== "https:") return null;
  const url = new URL(parsed.link.href);
  const host = url.hostname.toLowerCase();
  // Search output is untrusted. Never navigate to local services or credential-bearing URLs.
  if (
    !host.includes(".") ||
    /^[\d.]+$/.test(host) ||
    host.includes(":") ||
    /(^|\.)(localhost|local|internal|invalid|test)$/.test(host)
  )
    return null;
  return url;
}

export function parsePublicFindings(markdown: string, retrievedAt: string): PublicFinding[] {
  if (!Number.isFinite(Date.parse(retrievedAt))) throw new Error("Invalid retrieval time.");
  return parseHits(markdown, true)
    .flatMap((hit): PublicFinding[] => {
      const url = publicSource(hit.url);
      if (!url) return [];
      return [
        {
          title: hit.title.slice(0, 240),
          url: url.href,
          hostname: url.hostname,
          retrievedAt,
          publishedAt: null,
          evidenceStatus: "unverified",
          governmentDomainHint: /\.(gov|gov\.[a-z]{2}|gouv\.[a-z]{2}|govt\.[a-z]{2})$/.test(
            url.hostname,
          ),
        },
      ];
    })
    .sort((a, b) => Number(b.governmentDomainHint) - Number(a.governmentDomainHint));
}

/** Reuse Argus's search parser. Fetch only the search page, never arbitrary result URLs or private drafts. */
export async function discoverPublicInformation(
  place: CommunityPlace,
  topic: DiscoveryTopic,
  request: PublicRequest,
): Promise<PublicFinding[]> {
  const upstream = new URL("https://html.duckduckgo.com/html/");
  upstream.searchParams.set("q", discoveryQuery(place, topic));
  upstream.searchParams.set("df", "m");
  const body = await readPublicText(`https://r.jina.ai/${upstream.href}`, {
    ...request,
    headers: { Accept: "text/plain", "X-No-Cache": "true", DNT: "1" },
  });
  return parsePublicFindings(body, new Date().toISOString());
}
