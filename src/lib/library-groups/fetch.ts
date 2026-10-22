import type { Meta } from "@/lib/cinemeta";
import { safeFetch } from "@/lib/safe-fetch";
import { traktRequest } from "@/lib/trakt/client";
import { traktItemToMeta } from "@/lib/trakt/to-meta";
import type { TraktItem } from "@/lib/trakt/types";
import { parseListUrl, type ListRef } from "./urls";

type MdbItem = {
  id?: number;
  imdb_id?: string;
  ids?: { imdb?: string; tmdb?: number };
  title?: string;
  mediatype?: string;
  release_year?: number;
  rank?: number;
};

const poster = (imdb?: string) =>
  imdb ? `https://images.metahub.space/poster/medium/${imdb}/img` : undefined;

export function mdblistItemsToMetas(raw: unknown): Meta[] {
  const r = raw as { movies?: MdbItem[]; shows?: MdbItem[]; items?: MdbItem[] } | null;
  const rows: MdbItem[] = [
    ...(r?.movies ?? []).map((i) => ({ ...i, mediatype: "movie" })),
    ...(r?.shows ?? []).map((i) => ({ ...i, mediatype: "show" })),
    ...(r?.items ?? []),
  ].sort((a, b) => (a.rank ?? 0) - (b.rank ?? 0));
  const seen = new Set<string>();
  const out: Meta[] = [];
  for (const i of rows) {
    if (i.mediatype !== "movie" && i.mediatype !== "show") continue;
    const type = i.mediatype === "movie" ? "movie" : "series";
    const imdb = i.ids?.imdb ?? i.imdb_id;
    const tmdb = i.ids?.tmdb ?? i.id;
    const id = imdb && /^tt\d+$/.test(imdb)
      ? imdb
      : typeof tmdb === "number" && tmdb > 0
        ? `tmdb:${type === "movie" ? "movie" : "tv"}:${tmdb}`
        : null;
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push({
      id,
      type,
      name: i.title ?? id,
      poster: poster(imdb),
      releaseInfo: i.release_year ? String(i.release_year) : undefined,
    });
  }
  return out;
}

async function fromMdblist(ref: ListRef, apiKey: string, signal?: AbortSignal): Promise<Meta[]> {
  if (!apiKey.trim()) throw new Error("Add an MDBList API key in Settings > Library.");
  const res = await safeFetch(
    `https://api.mdblist.com/lists/${ref.path}/items?apikey=${encodeURIComponent(apiKey.trim())}&limit=100`,
    { signal },
  );
  if (!res.ok) throw new Error(`MDBList returned ${res.status}`);
  return mdblistItemsToMetas(await res.json());
}

type TraktRow = {
  type: "movie" | "show";
  movie?: { title: string; year: number; ids: TraktItem["ids"] };
  show?: { title: string; year: number; ids: TraktItem["ids"] };
};

async function fromTrakt(ref: ListRef): Promise<Meta[]> {
  const rows = await traktRequest<TraktRow[]>(`/${ref.path}/items?limit=100`, { authed: false });
  if (!Array.isArray(rows)) throw new Error("Unexpected Trakt response");
  const out: Meta[] = [];
  for (const row of rows) {
    const it = row.type === "movie" ? row.movie : row.type === "show" ? row.show : undefined;
    if (!it) continue;
    const meta = traktItemToMeta({ type: row.type, title: it.title, year: it.year, ids: it.ids });
    if (!meta) continue;
    meta.poster = poster(it.ids.imdb);
    out.push(meta);
  }
  return out;
}

export async function fetchGroupList(
  url: string,
  mdblistKey: string,
  signal?: AbortSignal,
): Promise<Meta[]> {
  const ref = parseListUrl(url);
  if (!ref) throw new Error("Not a supported MDBList or Trakt list URL.");
  return ref.source === "mdblist" ? fromMdblist(ref, mdblistKey, signal) : fromTrakt(ref);
}
