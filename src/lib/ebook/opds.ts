import { isLocalNetworkHostName, isLocalNetworkUrl } from "@/lib/local-network";
import { getSecret, setSecret } from "@/lib/secret-store";
import { safeFetchBytes, safeFetchLocal } from "@/lib/safe-fetch";

export type OpdsLink = { href: string; rel: string; type: string; title?: string };

export type OpdsEntry = {
  id: string;
  title: string;
  authors: string[];
  summary: string;
  categories: string[];
  cover?: string;
  links: OpdsLink[];
};

export type OpdsFeed = {
  title: string;
  url: string;
  entries: OpdsEntry[];
  next?: string;
  search?: string;
};

export type OpdsBook = OpdsEntry & { epubUrl: string };

export type OpdsAuth = {
  username?: string;
  password?: string;
  apiKey?: string;
  apiKeyHeader?: string;
};

export type OpdsConnection = { url: string; auth?: OpdsAuth };

const MAX_FEED_BYTES = 8 * 1024 * 1024;
const MAX_ENTRIES_PER_PAGE = 300;
const MAX_EPUB_BYTES = 200 * 1024 * 1024;
const EPUB_TYPE = "application/epub+zip";
const ACQUISITION = "http://opds-spec.org/acquisition";
const IMAGE_RELS = new Set([
  "http://opds-spec.org/image",
  "http://opds-spec.org/cover",
  "http://opds-spec.org/image/thumbnail",
  "http://opds-spec.org/thumbnail",
]);

type XmlNode = { name: string; attrs: Record<string, string>; children: XmlNode[]; text: string };

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" };

function decodeEntities(value: string): string {
  return value.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, body: string) => {
    if (body[0] === "#") {
      const code =
        body[1].toLowerCase() === "x" ? parseInt(body.slice(2), 16) : Number(body.slice(1));
      return Number.isInteger(code) && code > 0 && code <= 0x10ffff
        ? String.fromCodePoint(code)
        : "";
    }
    return ENTITIES[body.toLowerCase()] ?? match;
  });
}

/**
 * Small non-validating XML reader for Atom feeds. It never resolves DOCTYPE or external
 * entities, so a hostile feed cannot trigger entity expansion or file reads.
 */
export function parseXml(source: string): XmlNode {
  const root: XmlNode = { name: "#root", attrs: {}, children: [], text: "" };
  const stack = [root];
  const token =
    /<!--[\s\S]*?-->|<!\[CDATA\[([\s\S]*?)\]\]>|<[?!][^>]*>|<(\/?)([\w:.-]+)((?:[^>"']|"[^"]*"|'[^']*')*?)(\/?)>|([^<]+)/g;
  let match: RegExpExecArray | null;
  while ((match = token.exec(source))) {
    const top = stack[stack.length - 1];
    if (match[1] !== undefined) top.text += match[1];
    else if (match[6] !== undefined) top.text += decodeEntities(match[6]);
    else if (match[3] !== undefined) {
      if (match[2]) {
        if (stack.length > 1) stack.pop();
        continue;
      }
      const attrs: Record<string, string> = {};
      for (const attr of match[4].matchAll(/([\w:.-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)) {
        attrs[attr[1].replace(/^.*:/, "")] = decodeEntities(attr[2] ?? attr[3] ?? "");
      }
      const node: XmlNode = { name: match[3].replace(/^.*:/, ""), attrs, children: [], text: "" };
      top.children.push(node);
      if (!match[5]) stack.push(node);
    }
  }
  return root;
}

function child(node: XmlNode, name: string): XmlNode | undefined {
  return node.children.find((item) => item.name === name);
}

function childText(node: XmlNode, name: string): string {
  return (child(node, name)?.text ?? "").replace(/\s+/g, " ").trim();
}

function descendantText(node: XmlNode): string {
  return (node.text + node.children.map(descendantText).join(" ")).replace(/\s+/g, " ").trim();
}

/** Only http(s) targets are followed, so a feed cannot point the app at file: or data: URLs. */
export function resolveOpdsUrl(href: string | undefined, base: string): string | undefined {
  if (!href) return undefined;
  try {
    // Braces mark URI templates (search); keep them out of URL normalisation.
    const url = new URL(href.replace(/\{/g, "LBRACE_").replace(/\}/g, "_RBRACE"), base);
    return /^https?:$/.test(url.protocol)
      ? url.href.replace(/LBRACE_/g, "{").replace(/_RBRACE/g, "}")
      : undefined;
  } catch {
    return undefined;
  }
}

function linkOf(node: XmlNode, base: string): OpdsLink | null {
  const href = resolveOpdsUrl(node.attrs.href, base);
  if (!href) return null;
  return { href, rel: node.attrs.rel ?? "", type: node.attrs.type ?? "", title: node.attrs.title };
}

function entryFromAtom(node: XmlNode, base: string): OpdsEntry {
  const links = node.children
    .filter((item) => item.name === "link")
    .map((item) => linkOf(item, base))
    .filter((item): item is OpdsLink => !!item);
  const content = child(node, "content") ?? child(node, "summary");
  return {
    id: childText(node, "id") || childText(node, "title"),
    title: childText(node, "title"),
    authors: node.children
      .filter((item) => item.name === "author")
      .map((item) => childText(item, "name"))
      .filter(Boolean),
    summary: content ? descendantText(content) : "",
    categories: node.children
      .filter((item) => item.name === "category")
      .map((item) => item.attrs.label || item.attrs.term)
      .filter(Boolean),
    cover: links.find((link) => IMAGE_RELS.has(link.rel))?.href,
    links,
  };
}

export function parseOpdsAtom(xml: string, url: string): OpdsFeed {
  const feed = child(parseXml(xml), "feed");
  if (!feed) throw new Error("This is not an OPDS catalog.");
  const links = feed.children
    .filter((item) => item.name === "link")
    .map((item) => linkOf(item, url))
    .filter((item): item is OpdsLink => !!item);
  const search = links.find(
    (link) =>
      link.rel === "search" && /atom|opds/i.test(link.type) && /searchTerms/i.test(link.href),
  );
  const description = links.find(
    (link) => link.rel === "search" && /opensearchdescription/i.test(link.type),
  );
  return {
    title: childText(feed, "title"),
    url,
    entries: feed.children
      .filter((item) => item.name === "entry")
      .slice(0, MAX_ENTRIES_PER_PAGE)
      .map((item) => entryFromAtom(item, url)),
    next: links.find((link) => link.rel === "next")?.href,
    search: search?.href ?? (description ? `opensearch:${description.href}` : undefined),
  };
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function str(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function jsonLinks(value: unknown, base: string): OpdsLink[] {
  return (Array.isArray(value) ? value : []).flatMap((item) => {
    const link = record(item);
    const href = resolveOpdsUrl(str(link.href), base);
    if (!href) return [];
    const rel = Array.isArray(link.rel) ? str(link.rel[0]) : str(link.rel);
    return [{ href, rel, type: str(link.type), title: str(link.title) || undefined }];
  });
}

function names(value: unknown): string[] {
  const list = Array.isArray(value) ? value : value ? [value] : [];
  return list
    .map((item) => (typeof item === "string" ? item.trim() : str(record(item).name)))
    .filter(Boolean);
}

/** OPDS 2.0 (readium webpub) feeds: publications are books, navigation is a list of links. */
export function parseOpds2(json: unknown, url: string): OpdsFeed {
  const root = record(json);
  const metadata = record(root.metadata);
  const links = jsonLinks(root.links, url);
  const entries: OpdsEntry[] = [];
  for (const nav of Array.isArray(root.navigation) ? root.navigation : []) {
    const link = jsonLinks([nav], url)[0];
    if (link)
      entries.push({
        id: link.href,
        title: link.title ?? "",
        authors: [],
        summary: "",
        categories: [],
        links: [{ ...link, rel: "subsection" }],
      });
  }
  for (const group of Array.isArray(root.groups) ? root.groups : []) {
    for (const nav of Array.isArray(record(group).navigation)
      ? (record(group).navigation as unknown[])
      : []) {
      const link = jsonLinks([nav], url)[0];
      if (link)
        entries.push({
          id: link.href,
          title: link.title ?? "",
          authors: [],
          summary: "",
          categories: [],
          links: [{ ...link, rel: "subsection" }],
        });
    }
  }
  for (const pub of (Array.isArray(root.publications) ? root.publications : []).slice(
    0,
    MAX_ENTRIES_PER_PAGE,
  )) {
    const item = record(pub);
    const meta = record(item.metadata);
    const acquisition = jsonLinks(item.links, url).map((link) =>
      link.type === EPUB_TYPE && !link.rel.startsWith(ACQUISITION)
        ? { ...link, rel: ACQUISITION }
        : link,
    );
    const images = jsonLinks(item.images, url);
    entries.push({
      id: str(meta.identifier) || acquisition[0]?.href || str(meta.title),
      title: str(meta.title),
      authors: names(meta.author),
      summary: str(meta.description),
      categories: names(meta.subject),
      cover: images[0]?.href,
      links: acquisition,
    });
  }
  const search = links.find(
    (link) => link.rel === "search" && /\{\?query\}|searchTerms/i.test(link.href),
  );
  return {
    title: str(metadata.title),
    url,
    entries,
    next: links.find((link) => link.rel === "next")?.href,
    search: search?.href,
  };
}

export function parseOpdsFeed(body: string, url: string): OpdsFeed {
  const trimmed = body.trimStart();
  if (trimmed.startsWith("{")) return parseOpds2(JSON.parse(trimmed), url);
  return parseOpdsAtom(body, url);
}

function isEpubLink(link: OpdsLink): boolean {
  if (/^application\/epub(\+zip)?\b/i.test(link.type)) return true;
  // Some servers label downloads octet-stream or omit the type, so the file name decides.
  if (link.type && !/octet-stream|binary/i.test(link.type)) return false;
  try {
    return /\.epub\d?$/i.test(new URL(link.href).pathname);
  } catch {
    return false;
  }
}

/**
 * The acquisition link a book can be read from. Only EPUB is readable in the reader today,
 * so mobipocket and PDF links are skipped.
 */
export function epubLink(entry: OpdsEntry): OpdsLink | undefined {
  return entry.links.find((link) => link.rel.startsWith(ACQUISITION) && isEpubLink(link));
}

export function opdsBook(entry: OpdsEntry): OpdsBook | null {
  const link = epubLink(entry);
  return link ? { ...entry, epubUrl: link.href } : null;
}

/** A navigation entry leads to another feed rather than to a file. */
export function navigationLink(entry: OpdsEntry): OpdsLink | undefined {
  if (epubLink(entry)) return undefined;
  return entry.links.find(
    (link) =>
      link.rel !== "self" &&
      !link.rel.startsWith(ACQUISITION) &&
      !IMAGE_RELS.has(link.rel) &&
      /atom\+xml|opds\+json/i.test(link.type) &&
      !/type=entry/i.test(link.type),
  );
}

export function searchUrl(template: string, query: string): string {
  const term = encodeURIComponent(query);
  return template
    .replace(/\{searchTerms\}/g, term)
    .replace(/\{\?query\}/g, `?query=${term}`)
    .replace(/\{[^}]*\}/g, "");
}

/** Reads the Atom `Url` template out of an OpenSearch description document. */
export function openSearchTemplate(xml: string, base: string): string | undefined {
  const urls = parseXml(xml).children.flatMap((root) =>
    root.children.filter((item) => item.name === "Url"),
  );
  const best =
    urls.find((item) => /atom|opds/i.test(item.attrs.type ?? "")) ??
    urls.find((item) => item.attrs.template?.includes("{searchTerms}"));
  return resolveOpdsUrl(best?.attrs.template, base);
}

function secretKey(sourceId: string): string {
  return `argus.ebook.opds.v1.${sourceId}`;
}

export function saveOpdsConnection(sourceId: string, connection: OpdsConnection): void {
  setSecret(secretKey(sourceId), JSON.stringify(connection));
}

export function loadOpdsConnection(sourceId: string): OpdsConnection | null {
  try {
    const value = JSON.parse(getSecret(secretKey(sourceId)) ?? "null") as OpdsConnection | null;
    return value && typeof value.url === "string" ? value : null;
  } catch {
    return null;
  }
}

export function deleteOpdsConnection(sourceId: string): void {
  setSecret(secretKey(sourceId), null);
}

/**
 * Credentials go only to the origin the user added. Download and cover links on other
 * hosts are fetched anonymously, so a feed cannot harvest them.
 */
export function authHeaders(connection: OpdsConnection, target: string): Record<string, string> {
  const auth = connection.auth;
  if (!auth) return {};
  try {
    if (new URL(target).origin !== new URL(connection.url).origin) return {};
  } catch {
    return {};
  }
  const headers: Record<string, string> = {};
  if (auth.username !== undefined && auth.username !== "") {
    const raw = new TextEncoder().encode(`${auth.username}:${auth.password ?? ""}`);
    headers.Authorization = `Basic ${btoa(String.fromCharCode(...raw))}`;
  }
  if (auth.apiKey) headers[auth.apiKeyHeader || "X-API-Key"] = auth.apiKey;
  return headers;
}

function isHomeHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  return (
    isLocalNetworkHostName(host) ||
    !host.includes(".") ||
    /\.(local|lan|home|home\.arpa)$/.test(host)
  );
}

/** https is required for public hosts; plain http is accepted only for LAN and localhost servers. */
export function validateOpdsUrl(value: string): string {
  const url = new URL(value.trim());
  if (!/^https?:$/.test(url.protocol)) throw new Error("The feed URL must use HTTP or HTTPS.");
  if (url.protocol === "http:" && !isHomeHost(url.hostname)) {
    throw new Error(
      "Use https:// for feeds on the internet. Plain http is only for your own network.",
    );
  }
  if (url.username || url.password) {
    throw new Error("Enter the username and password in the fields below, not in the URL.");
  }
  return url.href;
}

export async function fetchOpdsFeed(connection: OpdsConnection, url: string): Promise<OpdsFeed> {
  const response = await safeFetchLocal(url, {
    headers: {
      Accept: "application/atom+xml, application/opds+json, application/json;q=0.8, */*;q=0.5",
      ...authHeaders(connection, url),
    },
    redirect: "follow",
  });
  if (response.status === 401 || response.status === 403) {
    throw new Error("The server rejected the saved login.");
  }
  if (!response.ok) throw new Error(`OPDS server returned ${response.status}.`);
  const body = await response.text();
  if (body.length > MAX_FEED_BYTES) throw new Error("The catalog response is too large.");
  return parseOpdsFeed(body, response.url || url);
}

export async function downloadOpdsEpub(
  connection: OpdsConnection,
  url: string,
): Promise<ArrayBuffer> {
  const response = await safeFetchBytes(
    url,
    { headers: authHeaders(connection, url) },
    90_000,
    MAX_EPUB_BYTES,
    isLocalNetworkUrl(url),
  );
  if (!response.ok) throw new Error(`Download failed (${response.status}).`);
  return response.arrayBuffer();
}

export async function resolveSearchTemplate(
  connection: OpdsConnection,
  feed: OpdsFeed,
): Promise<string | undefined> {
  if (!feed.search) return undefined;
  if (!feed.search.startsWith("opensearch:")) return feed.search;
  const target = feed.search.slice("opensearch:".length);
  const response = await safeFetchLocal(target, { headers: authHeaders(connection, target) });
  if (!response.ok) return undefined;
  return openSearchTemplate(await response.text(), target);
}

/** Labelled suggestions only; nothing is added until the user taps one. All are public-domain or openly licensed. */
export const OPDS_SUGGESTIONS: { name: string; url: string; note: string }[] = [
  {
    name: "Standard Ebooks",
    url: "https://standardebooks.org/feeds/opds",
    note: "Public-domain classics, proofread",
  },
  {
    name: "Project Gutenberg",
    url: "https://m.gutenberg.org/ebooks.opds/",
    note: "Public-domain books",
  },
  {
    name: "Feedbooks public domain",
    url: "https://catalog.feedbooks.com/publicdomain/browse.atom",
    note: "Public-domain classics",
  },
];
