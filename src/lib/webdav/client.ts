import { safeFetchLocal } from "@/lib/safe-fetch";

export type WebDavConfig = { url: string; user: string; password: string };

export type WebDavEntry = {
  name: string;
  /** Absolute URL of the entry. */
  url: string;
  isDir: boolean;
  size?: number;
};

const VIDEO_EXT = /\.(mkv|mp4|m4v|avi|mov|webm|ts|m2ts|wmv|flv|mpg|mpeg|ogv)$/i;

export function isVideoName(name: string): boolean {
  return VIDEO_EXT.test(name);
}

export function webDavHeaders(cfg: WebDavConfig): Record<string, string> {
  if (!cfg.user && !cfg.password) return {};
  const bytes = new TextEncoder().encode(`${cfg.user}:${cfg.password}`);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return { Authorization: `Basic ${btoa(bin)}` };
}

const BODY =
  '<?xml version="1.0"?><d:propfind xmlns:d="DAV:"><d:prop><d:resourcetype/><d:getcontentlength/></d:prop></d:propfind>';

/** Parses a PROPFIND multistatus body into entries below `base`, skipping the folder itself. */
export function parseMultistatus(xml: string, base: string): WebDavEntry[] {
  const doc = new DOMParser().parseFromString(xml, "application/xml");
  if (doc.getElementsByTagName("parsererror").length > 0) return [];
  const self = new URL(base);
  const selfPath = decodeURIComponent(self.pathname).replace(/\/+$/, "");
  const out: WebDavEntry[] = [];
  for (const res of Array.from(doc.getElementsByTagNameNS("*", "response"))) {
    const href = res.getElementsByTagNameNS("*", "href")[0]?.textContent?.trim();
    if (!href) continue;
    let abs: URL;
    try {
      abs = new URL(href, self);
    } catch {
      continue;
    }
    const path = decodeURIComponent(abs.pathname).replace(/\/+$/, "");
    if (path === selfPath) continue;
    const isDir = res.getElementsByTagNameNS("*", "collection").length > 0;
    const len = Number(res.getElementsByTagNameNS("*", "getcontentlength")[0]?.textContent);
    const name = path.split("/").pop() || path;
    out.push({
      name,
      url: abs.href,
      isDir,
      size: Number.isFinite(len) && len > 0 ? len : undefined,
    });
  }
  return out.sort((a, b) => Number(b.isDir) - Number(a.isDir) || a.name.localeCompare(b.name));
}

export async function listWebDav(cfg: WebDavConfig, url: string): Promise<WebDavEntry[]> {
  const dir = url.endsWith("/") ? url : `${url}/`;
  const r = await safeFetchLocal(dir, {
    method: "PROPFIND",
    headers: { ...webDavHeaders(cfg), Depth: "1", "Content-Type": "application/xml" },
    body: BODY,
  });
  if (r.status === 401 || r.status === 403) throw new Error("Wrong username or password.");
  if (!r.ok && r.status !== 207) throw new Error(`Server answered ${r.status}.`);
  return parseMultistatus(await r.text(), dir);
}
