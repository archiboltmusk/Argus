import type { Stream } from "./types";

export type ArchiveDoc = { identifier: string; title?: string; year?: string | number };
export type ArchiveFile = { name: string; format?: string; size?: string | number };

const VIDEO_FORMATS = new Set(["h.264", "mpeg4", "512kb mpeg4", "matroska", "ogg video", "h.264 hd"]);
const VIDEO_EXT = /\.(mp4|m4v|mkv|ogv|webm)$/i;

export function searchUrl(title: string): string {
  const safe = title.replace(/["\\]/g, " ").trim();
  const u = new URL("https://archive.org/advancedsearch.php");
  u.searchParams.set("q", `title:("${safe}") AND mediatype:movies`);
  for (const f of ["identifier", "title", "year"]) u.searchParams.append("fl[]", f);
  u.searchParams.set("rows", "6");
  u.searchParams.set("output", "json");
  return u.toString();
}

export function parseSearch(json: unknown): ArchiveDoc[] {
  const docs = (json as { response?: { docs?: ArchiveDoc[] } } | null)?.response?.docs;
  return Array.isArray(docs) ? docs.filter((d) => typeof d?.identifier === "string") : [];
}

export function docYearMatches(doc: ArchiveDoc, year?: number): boolean {
  if (!year) return true;
  const y = Number(doc.year);
  return Number.isFinite(y) && Math.abs(y - year) <= 1;
}

// One stream per playable file, biggest first so the best encode leads.
export function filesToStreams(id: string, title: string, files: ArchiveFile[]): Stream[] {
  return files
    .filter((f) => VIDEO_EXT.test(f.name) && (!f.format || VIDEO_FORMATS.has(f.format.toLowerCase())))
    .map((f) => ({ f, size: Number(f.size) || 0 }))
    .sort((a, b) => b.size - a.size)
    .slice(0, 3)
    .map(({ f, size }) => ({
      name: "Internet Archive",
      title: `${title} · ${f.name}`,
      url: `https://archive.org/download/${encodeURIComponent(id)}/${f.name.split("/").map(encodeURIComponent).join("/")}`,
      addonId: "builtin:internet-archive",
      addonName: "Internet Archive",
      behaviorHints: { filename: f.name, ...(size ? { videoSize: size } : {}) },
    }));
}
