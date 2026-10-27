import type { Meta } from "../cinemeta";
import { groupMediaServerTitles } from "./selectors";
import type { MediaServerConnection, MediaServerItem } from "./types";

function normalize(value: string): string {
  return value
    .normalize("NFKD")
    .toLowerCase()
    .replace(/\p{M}/gu, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

/** Search the existing index using only the caller's captured profile connections. */
export function searchMediaServerMetas(
  query: string,
  items: MediaServerItem[],
  connections: MediaServerConnection[],
): { movies: Meta[]; series: Meta[] } {
  const movies: Meta[] = [];
  const series: Meta[] = [];
  const normalized = normalize(query);
  if (normalized.length < 2) return { movies, series };
  const enabled = new Set(connections.filter((connection) => connection.enabled).map(({ id }) => id));
  if (enabled.size === 0) return { movies, series };
  const titles = groupMediaServerTitles(items.filter((item) => enabled.has(item.connectionId)));
  const seen = new Set<string>();
  for (const title of titles) {
    if (!normalize(title.fallbackTitle).includes(normalized)) continue;
    const identity = title.identity;
    const id = identity.tmdbId != null
      ? `tmdb:${title.kind === "movie" ? "movie" : "tv"}:${identity.tmdbId}`
      : identity.imdbId
        ? identity.imdbId.toLowerCase()
        : identity.tvdbId != null
          ? `tvdb:${title.kind}:${identity.tvdbId}`
          : `home-server:${title.kind}:${title.key}`;
    const key = `${title.kind}:${id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    // Indexed server image paths may contain authentication parameters. Search
    // exposes metadata only; existing detail/playback paths resolve server media.
    const meta: Meta = {
      id,
      type: title.kind,
      name: title.fallbackTitle,
      releaseInfo: title.year == null ? undefined : String(title.year),
    };
    (title.kind === "movie" ? movies : series).push(meta);
  }
  return { movies, series };
}
