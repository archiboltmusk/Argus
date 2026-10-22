import { openZip, type ZipArchive } from "./zip.ts";
import { find, findAll, parseXml, textOf, type XNode } from "./xml.ts";

export type TocEntry = { label: string; href: string; children: TocEntry[] };
export type SpineItem = { id: string; path: string; mediaType: string };
export type EpubMeta = { title: string; author: string; language: string; publisher: string };

export type EpubBook = {
  zip: ZipArchive;
  meta: EpubMeta;
  spine: SpineItem[];
  /** Cumulative share of the book (0..1) at the start of each spine item, weighted by file size. */
  spineStart: number[];
  toc: TocEntry[];
  coverPath: string | null;
  mediaTypes: Map<string, string>;
};

export function dirOf(path: string): string {
  const i = path.lastIndexOf("/");
  return i < 0 ? "" : path.slice(0, i + 1);
}

export function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export function splitHref(href: string): { path: string; fragment: string } {
  const i = href.indexOf("#");
  return i < 0
    ? { path: href, fragment: "" }
    : { path: href.slice(0, i), fragment: href.slice(i + 1) };
}

/** Resolve an href found in a file inside `baseDir` to an archive path, dropping any fragment. */
export function resolveEpubPath(baseDir: string, href: string): string {
  const { path } = splitHref(href);
  const parts: string[] = [];
  const joined = path.startsWith("/") ? path.slice(1) : baseDir + safeDecode(path);
  for (const seg of joined.split("/")) {
    if (seg === "" || seg === ".") continue;
    if (seg === "..") parts.pop();
    else parts.push(seg);
  }
  return parts.join("/");
}

const attr = (node: XNode | null | undefined, name: string) => node?.attrs[name] ?? "";

function parseNavList(ol: XNode, baseDir: string): TocEntry[] {
  const out: TocEntry[] = [];
  for (const li of ol.children.filter((c) => c.name === "li")) {
    const a = li.children.find((c) => c.name === "a") ?? li.children.find((c) => c.name === "span");
    const sub = li.children.find((c) => c.name === "ol");
    const rawHref = attr(a, "href");
    const { path, fragment } = splitHref(rawHref);
    const target = rawHref ? resolveEpubPath(baseDir, path || "") : "";
    const href = rawHref ? (fragment ? `${target}#${fragment}` : target) : "";
    const label = a ? textOf(a) : "";
    const children = sub ? parseNavList(sub, baseDir) : [];
    if (label || children.length > 0) out.push({ label: label || "…", href, children });
  }
  return out;
}

export function parseNavToc(xhtml: string, navPath: string): TocEntry[] {
  const root = parseXml(xhtml);
  const navs = findAll(root, "nav");
  const nav = navs.find((n) => (n.attrs.type ?? "").split(/\s+/).includes("toc")) ?? navs[0];
  const ol = nav ? find(nav, "ol") : null;
  return ol ? parseNavList(ol, dirOf(navPath)) : [];
}

function parseNavPoints(parent: XNode, baseDir: string): TocEntry[] {
  const out: TocEntry[] = [];
  for (const point of parent.children.filter((c) => c.name === "navPoint")) {
    const label = textOf(find(point, "text") ?? point);
    const src = attr(find(point, "content"), "src");
    const { path, fragment } = splitHref(src);
    const target = src ? resolveEpubPath(baseDir, path) : "";
    out.push({
      label: label || "…",
      href: src ? (fragment ? `${target}#${fragment}` : target) : "",
      children: parseNavPoints(point, baseDir),
    });
  }
  return out;
}

export function parseNcxToc(ncx: string, ncxPath: string): TocEntry[] {
  const map = find(parseXml(ncx), "navMap");
  return map ? parseNavPoints(map, dirOf(ncxPath)) : [];
}

export function flattenToc(toc: TocEntry[], depth = 0): Array<TocEntry & { depth: number }> {
  return toc.flatMap((e) => [{ ...e, depth }, ...flattenToc(e.children, depth + 1)]);
}

/** Plain text of an XHTML chapter, good enough for in-book search. */
export function htmlToText(html: string): string {
  const body = html.match(/<body[^>]*>([\s\S]*)<\/body>/i)?.[1] ?? html;
  return body
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m) => {
      const decoded = parseXml(`<a>${m}</a>`).text;
      return decoded || " ";
    })
    .replace(/\s+/g, " ")
    .trim();
}

export async function openEpub(bytes: Uint8Array): Promise<EpubBook> {
  const zip = openZip(bytes);
  const container = await zip.readText("META-INF/container.xml");
  if (!container) throw new Error("Missing container.xml");
  const opfPath = attr(find(parseXml(container), "rootfile"), "full-path");
  const opfText = opfPath ? await zip.readText(safeDecode(opfPath)) : null;
  if (!opfText) throw new Error("Missing package document");
  const opf = parseXml(opfText);
  const opfDir = dirOf(opfPath);

  const manifest = new Map<string, { path: string; type: string; props: string[] }>();
  const mediaTypes = new Map<string, string>();
  for (const item of findAll(opf, "item")) {
    const id = attr(item, "id");
    const href = attr(item, "href");
    if (!id || !href) continue;
    const path = resolveEpubPath(opfDir, href);
    const type = attr(item, "media-type");
    manifest.set(id, { path, type, props: attr(item, "properties").split(/\s+/) });
    mediaTypes.set(path, type);
  }

  const spineNode = find(opf, "spine");
  const spine: SpineItem[] = [];
  for (const ref of spineNode ? spineNode.children.filter((c) => c.name === "itemref") : []) {
    if (attr(ref, "linear") === "no") continue;
    const item = manifest.get(attr(ref, "idref"));
    if (item && zip.has(item.path))
      spine.push({ id: attr(ref, "idref"), path: item.path, mediaType: item.type });
  }
  if (spine.length === 0) throw new Error("Book has no readable chapters");

  const metadata = find(opf, "metadata");
  const first = (name: string) =>
    metadata ? textOf(find(metadata, name) ?? { name, attrs: {}, children: [], text: "" }) : "";
  const authors = metadata ? findAll(metadata, "creator").map(textOf).filter(Boolean) : [];

  let coverPath: string | null = null;
  for (const item of manifest.values())
    if (item.props.includes("cover-image")) coverPath = item.path;
  if (!coverPath && metadata) {
    const coverId = findAll(metadata, "meta").find((m) => attr(m, "name") === "cover")?.attrs
      .content;
    if (coverId) coverPath = manifest.get(coverId)?.path ?? null;
  }
  if (!coverPath) {
    const guess = [...manifest.entries()].find(
      ([id, v]) => /^cover(-image)?$/i.test(id) && v.type.startsWith("image/"),
    );
    coverPath = guess?.[1].path ?? null;
  }

  let toc: TocEntry[] = [];
  const navItem = [...manifest.values()].find((v) => v.props.includes("nav"));
  if (navItem) {
    const text = await zip.readText(navItem.path);
    if (text) toc = parseNavToc(text, navItem.path);
  }
  if (toc.length === 0) {
    const ncxId = attr(spineNode, "toc");
    const ncx =
      (ncxId && manifest.get(ncxId)) ||
      [...manifest.values()].find((v) => v.type === "application/x-dtbncx+xml");
    const text = ncx ? await zip.readText(ncx.path) : null;
    if (ncx && text) toc = parseNcxToc(text, ncx.path);
  }

  const total = spine.reduce((sum, s) => sum + Math.max(1, zip.size(s.path)), 0);
  let acc = 0;
  const spineStart = spine.map((s) => {
    const start = acc / total;
    acc += Math.max(1, zip.size(s.path));
    return start;
  });

  return {
    zip,
    meta: {
      title: first("title") || "Untitled",
      author: authors.join(", "),
      language: first("language"),
      publisher: first("publisher"),
    },
    spine,
    spineStart,
    toc,
    coverPath,
    mediaTypes,
  };
}

/** Overall progress (0..1) for a position inside a spine item. */
export function overallProgress(
  book: Pick<EpubBook, "spine" | "spineStart">,
  chapter: number,
  fraction: number,
): number {
  const i = Math.min(Math.max(0, chapter), book.spine.length - 1);
  const end = i + 1 < book.spine.length ? book.spineStart[i + 1] : 1;
  return Math.min(
    1,
    book.spineStart[i] + (end - book.spineStart[i]) * Math.min(1, Math.max(0, fraction)),
  );
}

/** Spine index and in-chapter fraction for an overall progress value. */
export function locateProgress(
  book: Pick<EpubBook, "spine" | "spineStart">,
  progress: number,
): { chapter: number; fraction: number } {
  const p = Math.min(1, Math.max(0, progress));
  let i = 0;
  while (i + 1 < book.spine.length && book.spineStart[i + 1] <= p) i++;
  const end = i + 1 < book.spine.length ? book.spineStart[i + 1] : 1;
  const span = end - book.spineStart[i];
  return { chapter: i, fraction: span > 0 ? Math.min(1, (p - book.spineStart[i]) / span) : 0 };
}

export function spineIndexForHref(book: Pick<EpubBook, "spine">, href: string): number {
  const { path } = splitHref(href);
  return book.spine.findIndex((s) => s.path === path);
}
