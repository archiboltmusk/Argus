import { safeFetch } from "@/lib/safe-fetch";

export type ArchiveItem = { identifier: string; title: string; year?: string; creator?: string };
export type ArchiveFile = { name: string; title: string; url: string; sizeBytes?: number };

const OPEN_LICENSE = "(licenseurl:*creativecommons* OR licenseurl:*publicdomain*)";
const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: "base" });

/** Only openly licensed or public-domain video, optionally narrowed by the user's words. */
export function archiveQuery(search: string): string {
  const words = search.replace(/["():\\]/g, " ").replace(/\s+/g, " ").trim();
  const text = words ? ` AND (title:(${words}) OR subject:(${words}))` : "";
  return `mediatype:movies AND ${OPEN_LICENSE}${text}`;
}

export function parseSearch(json: unknown): ArchiveItem[] {
  const docs = (json as { response?: { docs?: unknown[] } })?.response?.docs;
  if (!Array.isArray(docs)) return [];
  const one = (v: unknown) => (Array.isArray(v) ? v[0] : v);
  return docs.flatMap((d) => {
    const doc = d as Record<string, unknown>;
    const identifier = one(doc.identifier);
    if (typeof identifier !== "string" || !/^[\w.-]+$/.test(identifier)) return [];
    const title = one(doc.title);
    const year = one(doc.year);
    const creator = one(doc.creator);
    return [
      {
        identifier,
        title: typeof title === "string" ? title : identifier,
        year: year != null ? String(year) : undefined,
        creator: typeof creator === "string" ? creator : undefined,
      },
    ];
  });
}

/** Playable derivatives of an item, in natural filename order (01, 02, …, 10). */
export function parseFiles(identifier: string, json: unknown): ArchiveFile[] {
  const files = (json as { files?: Array<Record<string, unknown>> })?.files;
  if (!Array.isArray(files)) return [];
  return files
    .filter((f) => {
      const name = String(f.name ?? "");
      const format = String(f.format ?? "");
      return /\.(mp4|m4v|webm)$/i.test(name) && !/^(thumbnail|metadata)/i.test(format);
    })
    .map((f) => {
      const name = String(f.name);
      const size = Number(f.size);
      return {
        name,
        title: String(f.title ?? name.replace(/\.[^.]+$/, "")),
        url: `https://archive.org/download/${encodeURIComponent(identifier)}/${name
          .split("/")
          .map(encodeURIComponent)
          .join("/")}`,
        sizeBytes: Number.isFinite(size) && size > 0 ? size : undefined,
      };
    })
    .sort((a, b) => collator.compare(a.name, b.name));
}

export async function searchArchive(search: string, page = 1): Promise<ArchiveItem[]> {
  const params = new URLSearchParams({ q: archiveQuery(search), rows: "30", page: String(page), output: "json" });
  for (const f of ["identifier", "title", "year", "creator"]) params.append("fl[]", f);
  params.append("sort[]", "downloads desc");
  const r = await safeFetch(`https://archive.org/advancedsearch.php?${params}`);
  if (!r.ok) throw new Error(`Internet Archive answered ${r.status}.`);
  return parseSearch(await r.json());
}

export async function archiveFiles(identifier: string): Promise<ArchiveFile[]> {
  const r = await safeFetch(`https://archive.org/metadata/${encodeURIComponent(identifier)}`);
  if (!r.ok) throw new Error(`Internet Archive answered ${r.status}.`);
  return parseFiles(identifier, await r.json());
}
