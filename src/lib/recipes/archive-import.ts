import { RECIPE_SCHEMA, type Recipe, type RecipeKind, type Parsed } from "./schema";

const IA_ID_FROM_URL = /archive\.org\/(?:details|download|embed)\/([A-Za-z0-9][A-Za-z0-9._-]{0,99})/i;
const BARE_ID = /^[A-Za-z0-9][A-Za-z0-9._-]{0,99}$/;
const PD_MARK = /publicdomain\/(mark|zero)/i;
const CC_URL = /creativecommons\.org\/(licenses\/(by|by-sa|by-nc|by-nc-sa|by-nd|by-nc-nd)|publicdomain)\//i;
const PLAYABLE = /\.(mp4|m4v|mkv|webm|ogv|mp3|m4a|ogg|flac|pdf|epub|djvu)$/i;

export function parseArchiveId(input: string): string | undefined {
  const s = input.trim();
  return IA_ID_FROM_URL.exec(s)?.[1] ?? (BARE_ID.test(s) ? s : undefined);
}

type IaMeta = {
  metadata?: Record<string, unknown>;
  files?: { name: string; format?: string; size?: string | number }[];
};

const first = (v: unknown): string | undefined => {
  const x = Array.isArray(v) ? v[0] : v;
  return typeof x === "string" && x.trim() ? x.trim() : undefined;
};

// Items without an explicit open license are refused: IA hosts plenty of in-copyright uploads.
export function archiveLicense(m: Record<string, unknown>): string | undefined {
  const url = first(m.licenseurl);
  return url && (PD_MARK.test(url) || CC_URL.test(url)) ? url : undefined;
}

function kindOf(mediatype: string | undefined): RecipeKind {
  if (mediatype === "texts") return "book";
  if (mediatype === "audio" || mediatype === "etree") return "audio";
  return "film";
}

export function recipeFromArchive(id: string, json: unknown, now = new Date()): Parsed<Recipe> {
  const meta = (json as IaMeta | null)?.metadata;
  if (!meta || typeof meta !== "object") return { ok: false, error: "item not found on archive.org" };
  const licenseUrl = archiveLicense(meta);
  if (!licenseUrl) return { ok: false, error: "item has no public-domain or Creative Commons license field" };
  const files = ((json as IaMeta).files ?? [])
    .filter((f) => PLAYABLE.test(f.name))
    .sort((a, b) => (Number(b.size) || 0) - (Number(a.size) || 0));
  if (files.length === 0) return { ok: false, error: "no playable or readable files in item" };
  const title = first(meta.title) ?? id;
  const year = Number.parseInt(first(meta.date) ?? first(meta.year) ?? "", 10);
  const creator = first(meta.creator);
  return {
    ok: true,
    value: {
      schema: RECIPE_SCHEMA,
      id: `recipe:archive:${id}`,
      kind: kindOf(first(meta.mediatype)),
      title,
      ...(Number.isInteger(year) && year > 0 ? { year } : {}),
      ...(first(meta.language) ? { language: first(meta.language) } : {}),
      creators: creator ? [{ role: "creator", name: creator }] : [],
      ...(first(meta.description) ? { synopsis: first(meta.description)?.replace(/<[^>]*>/g, "").slice(0, 2000) } : {}),
      poster: `https://archive.org/services/img/${encodeURIComponent(id)}`,
      license: { id: licenseUrl, evidenceUrl: `https://archive.org/details/${encodeURIComponent(id)}` },
      parts: [{ title, sources: [{ type: "archive_org", id, file: files[0].name, priority: 1 }] }],
      updated: now.toISOString(),
    },
  };
}
