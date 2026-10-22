import type { Meta } from "@/lib/cinemeta";
import type { PlayEpisode } from "@/lib/view";

const ILLEGAL = /[<>:"/\\|?*\x00-\x1F]/g;
const TRAILING = /[. ]+$/g;

export function sanitizeName(name: string): string {
  return name.replace(ILLEGAL, "").replace(TRAILING, "").trim().slice(0, 180);
}

export function extensionFromUrl(url: string): string {
  try {
    const path = new URL(url).pathname;
    const m = path.match(/\.([a-z0-9]{2,5})(?:$|\?)/i);
    if (m) {
      const ext = m[1].toLowerCase();
      if (["mkv", "mp4", "webm", "avi", "mov", "ts", "m4v"].includes(ext)) {
        return ext;
      }
    }
  } catch {
    return "mkv";
  }
  return "mkv";
}

export function buildDefaultFilename(
  meta: Meta,
  episode: PlayEpisode | undefined,
  url: string,
  streamLabel?: string | null,
): string {
  const ext = extensionFromUrl(url);
  const title = sanitizeName(meta.name || "video");
  const tag = qualityTag(streamLabel);
  if (episode) {
    const s = String(episode.season).padStart(2, "0");
    const e = String(episode.episode).padStart(2, "0");
    return `${title} - S${s}E${e}${tag}.${ext}`;
  }
  if (meta.releaseInfo) {
    return `${title} (${sanitizeName(meta.releaseInfo)})${tag}.${ext}`;
  }
  return `${title}${tag}.${ext}`;
}

function qualityTag(streamLabel?: string | null): string {
  if (!streamLabel) return "";
  const cleaned = sanitizeName(streamLabel).replace(/\s+/g, " ").trim().slice(0, 40);
  return cleaned ? ` [${cleaned}]` : "";
}

function releaseYear(meta: Meta): string | null {
  const m = /\b(19|20)\d{2}\b/.exec(meta.releaseInfo ?? "");
  return m ? m[0] : null;
}

/**
 * Plex and Kodi both read `Show (Year)/Season 01/Show - S01E02 - Title.ext` and
 * `Movie (Year)/Movie (Year).ext`, so a finished download scans without renaming.
 */
export function buildPlexLayout(
  meta: Meta,
  episode: PlayEpisode | undefined,
  url: string,
): { folders: string[]; filename: string } {
  const ext = extensionFromUrl(url);
  const base = sanitizeName(meta.name || "video");
  const year = releaseYear(meta);
  const withYear = year ? `${base} (${year})` : base;
  if (!episode) return { folders: [withYear], filename: `${withYear}.${ext}` };
  const season = episode.imdbSeason ?? episode.season;
  const number = episode.imdbEpisode ?? episode.episode;
  const s = String(season).padStart(2, "0");
  const e = String(number).padStart(2, "0");
  const title = episode.name ? sanitizeName(episode.name) : "";
  return {
    folders: [withYear, `Season ${s}`],
    filename: `${base} - S${s}E${e}${title ? ` - ${title}` : ""}.${ext}`,
  };
}
