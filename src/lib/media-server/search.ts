import type { Meta } from "@/lib/cinemeta";
import { groupMediaServerTitles } from "@/lib/media-server/selectors";
import type { MediaServerConnection, MediaServerItem } from "@/lib/media-server/types";

function normalize(value: string): string {
  return value.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
}

/** Convert matching titles from enabled home-server libraries into the existing search result shape. */
export function searchMediaServerMetas(
  query: string,
  items: MediaServerItem[],
  connections: MediaServerConnection[],
): { movies: Meta[]; series: Meta[] } {
  const q = normalize(query);
  if (q.length < 2) return { movies: [], series: [] };
  const enabled = new Map(connections.filter((connection) => connection.enabled).map((connection) => [connection.id, connection]));
  if (enabled.size === 0) return { movies: [], series: [] };

  const titles = groupMediaServerTitles(items.filter((item) => enabled.has(item.connectionId)));
  const movies: Meta[] = [];
  const series: Meta[] = [];
  const seen = new Set<string>();
  for (const title of titles) {
    if (!normalize(title.fallbackTitle).includes(q)) continue;
    const connectionsForTitle = title.connectionIds.map((id) => enabled.get(id)).filter((x): x is MediaServerConnection => !!x);
    if (connectionsForTitle.length === 0) continue;

    const identity = title.identity;
    const id = identity.tmdbId != null
      ? `tmdb:${title.kind === "movie" ? "movie" : "tv"}:${identity.tmdbId}`
      : identity.imdbId
        ? identity.imdbId
        : identity.tvdbId != null
          ? `tvdb:${title.kind}:${identity.tvdbId}`
          : `home-server:${title.kind}:${title.key}`;
    const dedupeKey = `${title.kind}:${id}`;
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);
    const meta: Meta = {
      id,
      type: title.kind,
      name: title.fallbackTitle,
      releaseInfo: title.year == null ? undefined : String(title.year),
      description: undefined,
    };
    (title.kind === "movie" ? movies : series).push(meta);
  }
  return { movies, series };
}
