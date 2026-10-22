import { dirOf, resolveEpubPath, splitHref, type EpubBook } from "./epub";

export type RenderedChapter = {
  html: string;
  css: string;
  /** Blob URLs created for this chapter; revoke them when the chapter is replaced. */
  urls: string[];
};

const DROP = new Set([
  "script",
  "iframe",
  "object",
  "embed",
  "frame",
  "frameset",
  "applet",
  "base",
  "meta",
  "title",
  "form",
  "input",
  "button",
  "select",
  "textarea",
  "audio",
  "video",
  "source",
  "track",
  "foreignobject",
  "link",
  "style",
  "noscript",
  "template",
]);

const IMAGE_TYPES: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  svg: "image/svg+xml",
  avif: "image/avif",
  bmp: "image/bmp",
};

export function mimeForPath(path: string, declared?: string): string {
  if (declared && declared.startsWith("image/")) return declared;
  return (
    IMAGE_TYPES[path.slice(path.lastIndexOf(".") + 1).toLowerCase()] ?? "application/octet-stream"
  );
}

const EXTERNAL = /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i;

/** Makes publisher CSS safe to scope inside a shadow root. */
export function sanitizeCss(css: string, mapUrl: (url: string) => string): string {
  return css
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/@import[^;]*;?/gi, "")
    .replace(/@font-face\s*\{[^}]*\}/gi, "")
    .replace(/@charset[^;]*;/gi, "")
    .replace(/expression\s*\(|behavior\s*:|-moz-binding\s*:/gi, "x-blocked:")
    .replace(/position\s*:\s*(?:fixed|sticky)/gi, "position:static")
    .replace(
      /url\(\s*(['"]?)([^'")]*)\1\s*\)/gi,
      (_m, _q: string, u: string) => `url("${mapUrl(u.trim())}")`,
    )
    .replace(/(^|[\s,}{])(?:html|body)(?=[\s,{.:#[]|$)/gi, "$1.epub-body");
}

export function sanitizeInlineStyle(style: string): string {
  return style
    .split(";")
    .filter(
      (decl) =>
        !/url\(|expression\(|behavior|-moz-binding|position\s*:\s*(?:fixed|sticky)/i.test(decl),
    )
    .join(";");
}

export async function renderChapter(
  book: EpubBook,
  index: number,
  opts: { publisherStyles: boolean },
): Promise<RenderedChapter> {
  const item = book.spine[index];
  const source = (await book.zip.readText(item.path)) ?? "";
  const baseDir = dirOf(item.path);
  const urls: string[] = [];
  const cache = new Map<string, string>();

  async function blobUrl(path: string): Promise<string> {
    const hit = cache.get(path);
    if (hit !== undefined) return hit;
    const data = await book.zip.read(path);
    const url = data
      ? URL.createObjectURL(
          new Blob([data as BlobPart], { type: mimeForPath(path, book.mediaTypes.get(path)) }),
        )
      : "";
    if (url) urls.push(url);
    cache.set(path, url);
    return url;
  }

  let doc = new DOMParser().parseFromString(source, "application/xhtml+xml");
  if (doc.querySelector("parsererror")) doc = new DOMParser().parseFromString(source, "text/html");

  // Resolve every embedded image up front so sanitising stays synchronous.
  const refs = new Set<string>();
  for (const el of doc.querySelectorAll("img,image")) {
    const href = el.getAttribute("src") ?? el.getAttribute("href") ?? el.getAttribute("xlink:href");
    if (href && !EXTERNAL.test(href)) refs.add(resolveEpubPath(baseDir, href));
  }
  await Promise.all([...refs].map(blobUrl));

  let css = "";
  if (opts.publisherStyles) {
    const sheets: string[] = [];
    for (const link of doc.querySelectorAll("link[rel~='stylesheet'][href]")) {
      const href = link.getAttribute("href")!;
      if (EXTERNAL.test(href)) continue;
      const path = resolveEpubPath(baseDir, href);
      const text = await book.zip.readText(path);
      if (!text) continue;
      const sheetDir = dirOf(path);
      const urlRefs = [...text.matchAll(/url\(\s*['"]?([^'")]+)['"]?\s*\)/gi)].map((m) =>
        m[1].trim(),
      );
      await Promise.all(
        urlRefs
          .filter(
            (u) =>
              !EXTERNAL.test(u) && IMAGE_TYPES[u.split(/[?#]/)[0].split(".").pop()!.toLowerCase()],
          )
          .map((u) => blobUrl(resolveEpubPath(sheetDir, u))),
      );
      sheets.push(
        sanitizeCss(text, (u) =>
          EXTERNAL.test(u) ? "" : (cache.get(resolveEpubPath(sheetDir, u)) ?? ""),
        ),
      );
    }
    for (const style of doc.querySelectorAll("style")) {
      sheets.push(
        sanitizeCss(style.textContent ?? "", (u) =>
          EXTERNAL.test(u) ? "" : (cache.get(resolveEpubPath(baseDir, u)) ?? ""),
        ),
      );
    }
    css = sheets.join("\n");
  }

  const body = doc.body ?? doc.documentElement;
  const walk = (el: Element) => {
    for (const child of [...el.children]) {
      const tag = child.localName.toLowerCase();
      if (
        DROP.has(tag) ||
        (tag === "use" &&
          !(child.getAttribute("href") ?? child.getAttribute("xlink:href") ?? "").startsWith("#"))
      ) {
        child.remove();
        continue;
      }
      for (const a of [...child.attributes]) {
        const name = a.name.toLowerCase();
        if (name.startsWith("on") || name === "srcdoc" || name === "formaction")
          child.removeAttribute(a.name);
        else if (name === "style") {
          if (opts.publisherStyles) child.setAttribute("style", sanitizeInlineStyle(a.value));
          else child.removeAttribute("style");
        } else if (name === "class" && !opts.publisherStyles) child.removeAttribute("class");
      }
      if (tag === "img" || tag === "image") {
        const attrName = ["src", "href", "xlink:href"].find((n) => child.hasAttribute(n));
        const href = attrName ? child.getAttribute(attrName)! : "";
        const url =
          href && !EXTERNAL.test(href) ? (cache.get(resolveEpubPath(baseDir, href)) ?? "") : "";
        if (attrName) child.removeAttribute(attrName);
        if (url) child.setAttribute(tag === "img" ? "src" : "href", url);
        else child.remove();
        child.removeAttribute("srcset");
        if (!child.isConnected) continue;
      } else if (tag === "a") {
        const href = child.getAttribute("href") ?? child.getAttribute("xlink:href") ?? "";
        child.removeAttribute("href");
        child.removeAttribute("xlink:href");
        child.removeAttribute("target");
        if (/^\s*javascript:/i.test(href)) {
          // dropped
        } else if (href.startsWith("#")) child.setAttribute("data-fragment", href.slice(1));
        else if (/^(https?:|mailto:)/i.test(href)) child.setAttribute("data-external", href);
        else if (href) {
          const { path, fragment } = splitHref(href);
          const target = path ? resolveEpubPath(baseDir, path) : item.path;
          child.setAttribute("data-epub", fragment ? `${target}#${fragment}` : target);
        }
      }
      walk(child);
    }
  };
  walk(body);

  const host = document.implementation.createHTMLDocument("");
  host.body.appendChild(host.importNode(body, true));
  return { html: host.body.firstElementChild?.innerHTML ?? "", css, urls };
}

export function readerCss(p: {
  theme: "light" | "sepia" | "dark";
  font: "serif" | "sans";
  fontSize: number;
  lineHeight: number;
}): string {
  const palette = {
    light: ["#ffffff", "#1c1c1e", "#2563eb"],
    sepia: ["#f4ecd8", "#433422", "#9a5b13"],
    dark: ["#121214", "#d8d8dc", "#7aa7ff"],
  }[p.theme];
  const family =
    p.font === "serif"
      ? 'Georgia, "Iowan Old Style", "Times New Roman", serif'
      : '-apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';
  return `
.epub-body{box-sizing:border-box;background:${palette[0]};color:${palette[1]};font-family:${family};font-size:${p.fontSize}px;line-height:${p.lineHeight};overflow-wrap:break-word;hyphens:auto;margin:0;padding:0}
.epub-body *{max-width:100%;box-sizing:border-box}
.epub-body a[data-epub],.epub-body a[data-fragment],.epub-body a[data-external]{color:${palette[2]};text-decoration:underline;cursor:pointer}
.epub-body img,.epub-body svg,.epub-body image{max-width:100%;height:auto;break-inside:avoid}
.epub-body p{margin:0 0 .9em}
.epub-body h1,.epub-body h2,.epub-body h3{line-height:1.25;margin:1.2em 0 .6em}
.epub-body pre,.epub-body code{font-family:ui-monospace,Menlo,Consolas,monospace;font-size:.88em;white-space:pre-wrap}
.epub-body blockquote{margin:1em 1.5em;opacity:.9}
.epub-body table{border-collapse:collapse}
.epub-body td,.epub-body th{border:1px solid ${palette[1]}33;padding:.3em .5em}
.epub-body mark.hit{background:#facc1566;color:inherit}`;
}

export const READER_BACKGROUND = { light: "#ffffff", sepia: "#f4ecd8", dark: "#121214" } as const;
