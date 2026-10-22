/**
 * Single seam for the Stremio addon protocol. URL shapes and response parsing live
 * here so an upstream protocol change touches one module, not every caller.
 * The tolerance rules below follow the protocol's behavior in the wild: extras go in
 * the path as `key=value&key=value`, and responses may omit the expected array.
 */

export type Resource = "catalog" | "meta" | "stream" | "subtitles" | "addon_catalog";

export type ExtraArg = { name: string; value: string | number };

export type ResourceRequest = {
  /** Addon transport URL, with or without a trailing /manifest.json. */
  base: string;
  resource: Resource;
  type: string;
  id: string;
  extra?: ExtraArg[];
};

export function transportBase(transportUrl: string): string {
  return transportUrl.replace(/\/manifest\.json(\?.*)?$/, "").replace(/\/+$/, "");
}

export function encodeExtra(extra: ExtraArg[] | undefined): string {
  if (!extra || extra.length === 0) return "";
  const parts = extra.map((e) => `${encodeURIComponent(e.name)}=${encodeURIComponent(String(e.value))}`);
  return `/${parts.join("&")}`;
}

/**
 * Ids are passed through untouched for stream and subtitles requests because addon ids such as
 * `tt0944947:1:2` contain colons that addons expect literally. Meta ids are encoded.
 */
export function resourceUrl(req: ResourceRequest): string {
  const id = req.resource === "meta" ? encodeURIComponent(req.id) : req.id;
  return `${transportBase(req.base)}/${req.resource}/${req.type}/${id}${encodeExtra(req.extra)}.json`;
}

type Obj = Record<string, unknown>;

function field<T>(json: unknown, key: string): T[] {
  if (json && typeof json === "object") {
    const v = (json as Obj)[key];
    if (Array.isArray(v)) return v as T[];
  }
  return [];
}

export function parseMetas<T = unknown>(json: unknown): T[] {
  return field<T>(json, "metas");
}

export function parseMeta<T = unknown>(json: unknown): T | null {
  if (json && typeof json === "object") {
    const m = (json as Obj).meta;
    if (m && typeof m === "object") return m as T;
  }
  return null;
}

export function parseStreams<T = unknown>(json: unknown): T[] {
  return field<T>(json, "streams");
}

export function parseSubtitles<T = unknown>(json: unknown): T[] {
  return field<T>(json, "subtitles");
}
