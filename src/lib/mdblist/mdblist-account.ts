import { safeFetch as fetch } from "@/lib/safe-fetch";
import type { Meta } from "@/lib/cinemeta";
import type { HomeRow } from "@/views/home/home-types";

export interface MdblistUserList {
  id: number | string;
  name: string;
  slug?: string;
  description?: string;
  items?: number;
  likes?: number;
  is_owner?: boolean;
  user_name?: string;
  mediatype?: "movie" | "show" | "all";
  dynamic?: boolean;
}

export interface MdblistItem {
  id: number;
  imdb_id?: string;
  tmdb_id?: number;
  title: string;
  year?: number;
  mediatype: "movie" | "show";
  score?: number;
  poster?: string;
  backdrop?: string;
  description?: string;
}

const MDBLIST_API = "https://api.mdblist.com";

export async function fetchMdblistUserLists(apiKey: string): Promise<MdblistUserList[]> {
  const cleanKey = apiKey.trim();
  if (!cleanKey) return [];

  try {
    const res = await fetch(`${MDBLIST_API}/lists/user?apikey=${encodeURIComponent(cleanKey)}`);
    if (!res.ok) return [];
    const data = (await res.json()) as MdblistUserList[] | { lists?: MdblistUserList[] };
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.lists)) return data.lists;
    return [];
  } catch {
    return [];
  }
}

export async function fetchMdblistListItems(
  apiKey: string,
  listId: number | string,
  limit = 40,
): Promise<MdblistItem[]> {
  const cleanKey = apiKey.trim();
  if (!cleanKey) return [];

  try {
    const res = await fetch(
      `${MDBLIST_API}/lists/${encodeURIComponent(listId)}/items?apikey=${encodeURIComponent(cleanKey)}&limit=${limit}`,
    );
    if (!res.ok) return [];
    const data = (await res.json()) as MdblistItem[] | { items?: MdblistItem[] };
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.items)) return data.items;
    return [];
  } catch {
    return [];
  }
}

export function mdblistItemToArgusMeta(item: MdblistItem): Meta {
  const isShow = item.mediatype === "show";
  const id = item.imdb_id || (item.tmdb_id ? `tmdb:${item.tmdb_id}` : `mdblist:${item.id}`);

  return {
    id,
    type: isShow ? "series" : "movie",
    name: item.title,
    releaseInfo: item.year != null ? String(item.year) : undefined,
    description: item.description,
    poster: item.poster,
    background: item.backdrop,
    imdbRating: item.score != null ? (item.score / 10).toFixed(1) : undefined,
  };
}

export function mdblistListToHomeRow(
  list: MdblistUserList,
  items: MdblistItem[] = [],
): HomeRow {
  const metas = items.map(mdblistItemToArgusMeta);
  return {
    key: `mdblist-list-${list.id}`,
    type: list.mediatype === "show" ? "series" : "movie",
    name: list.name,
    metas,
    page: 1,
    hasMore: false,
  };
}
