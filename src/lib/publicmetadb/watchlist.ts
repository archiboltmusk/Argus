import { activeProfileId } from "@/lib/active-profile-id";
import { getSession, isAuthenticated } from "./session";
import {
  capturePmdbListOwner,
  changePmdbList,
  clearPmdbListsCache,
  fetchPmdbListItems,
  getPmdbDefaultListId,
  resolvePmdbList,
  subscribePmdbLists,
  type PmdbListOptions,
} from "./lists";
import type { Meta } from "@/lib/cinemeta";
import type {
  PmdbListItem,
  PmdbTarget,
} from "./types";

// Shared details-page status reads, independent of authoritative mutation
// reads. The cache never stores errors or crosses a profile, account or list.
const MEMBERSHIP_TTL_MS = 15_000;
const membershipCache = new Map<string, { at: number; items: PmdbListItem[] }>();
const membershipPending = new Map<string, Promise<PmdbListItem[]>>();
const sessionIds = new WeakMap<object, number>();
let nextSessionId = 0;
let membershipGeneration = 0;

function invalidateMembershipCache(): void {
  membershipGeneration++;
  membershipCache.clear();
  membershipPending.clear();
}

subscribePmdbLists(invalidateMembershipCache);

export function clearPmdbWatchlistCache(): void {
  invalidateMembershipCache();
  clearPmdbListsCache();
}

function membershipKey(listId: string | null | undefined): string {
  const session = getSession();
  if (!session) throw new DOMException("PublicMetaDB disconnected.", "AbortError");
  let id = sessionIds.get(session);
  if (id == null) {
    id = ++nextSessionId;
    sessionIds.set(session, id);
  }
  const selectedId = listId === undefined ? getPmdbDefaultListId() : listId;
  return [activeProfileId(), id, selectedId ?? "watchlist"].join(":");
}

type WatchlistReadOptions = PmdbListOptions & {
  /** Reuse validated membership for detail hero/overflow; not for writes. */
  cacheForStatus?: boolean;
};

export async function fetchPmdbWatchlist(
  options: WatchlistReadOptions = {},
): Promise<PmdbListItem[]> {
  // Only strict, validated status reads are eligible for reuse.
  if (!options.cacheForStatus || !options.strict)
    return fetchPmdbWatchlistUncached(options);
  options.assertCurrent?.();
  if (!isAuthenticated()) {
    if (options.strict) throw new Error("PublicMetaDB is disconnected.");
    return [];
  }
  const guard = capturePmdbListOwner(options.assertCurrent);
  guard();
  const key = membershipKey(options.listId);
  const hit = membershipCache.get(key);
  if (hit && Date.now() - hit.at < MEMBERSHIP_TTL_MS) {
    guard();
    return hit.items.slice();
  }

  let request = membershipPending.get(key);
  const generation = membershipGeneration;
  if (!request) {
    // Strict validation happens on the first read; subsequent status checks
    // reuse only that verified result. Each mutation still reads fresh data.
    request = fetchPmdbWatchlistUncached({
      listId: options.listId,
      strict: options.strict,
    }).then((items) => {
      if (generation === membershipGeneration &&
          membershipPending.get(key) === request) {
        membershipCache.set(key, { at: Date.now(), items });
        if (membershipCache.size > 64)
          membershipCache.delete(membershipCache.keys().next().value!);
      }
      return items;
    }).finally(() => {
      if (membershipPending.get(key) === request) membershipPending.delete(key);
    });
    membershipPending.set(key, request);
  }
  const items = await request;
  guard();
  if (generation !== membershipGeneration)
    throw new DOMException("PublicMetaDB list changed during status lookup.", "AbortError");
  return items.slice();
}

async function fetchPmdbWatchlistUncached(
  options: PmdbListOptions = {},
): Promise<PmdbListItem[]> {
  options.assertCurrent?.();
  if (!isAuthenticated()) {
    if (options.strict) throw new Error("PublicMetaDB is disconnected.");
    return [];
  }
  const guard = capturePmdbListOwner(options.assertCurrent);
  try {
    const list = await resolvePmdbList({ ...options, assertCurrent: guard });
    guard();
    return list ? await fetchPmdbListItems(list.id, guard) : [];
  } catch (error) {
    guard();
    if (options.strict) throw error;
    return [];
  }
}

export function pmdbWatchlistContains(
  items: PmdbListItem[],
  target: PmdbTarget,
): PmdbListItem | null {
  if (target.tmdb_id == null) return null;
  return (
    items.find((i) => i.tmdb_id === target.tmdb_id && i.media_type === target.media_type) ?? null
  );
}

/**
 * Maps a watchlist item to a Argus Meta for grid rendering. The poster
 * field shape is unverified (full URL vs TMDB path vs absent), so all three
 * are handled and title-only cards remain renderable.
 */
export function pmdbWatchlistItemToMeta(item: PmdbListItem): Meta | null {
  if (item.tmdb_id == null) return null;
  const isMovie = item.media_type === "movie";
  let poster: string | undefined;
  const raw = typeof item.poster === "string" ? item.poster.trim() : "";
  if (raw.startsWith("http://") || raw.startsWith("https://")) {
    poster = raw;
  } else if (raw.startsWith("/") && raw.length > 1) {
    poster = `https://image.tmdb.org/t/p/w500${raw}`;
  }
  return {
    id: isMovie ? `tmdb:movie:${item.tmdb_id}` : `tmdb:tv:${item.tmdb_id}`,
    type: isMovie ? "movie" : "series",
    name: item.title || (isMovie ? `Movie (${item.tmdb_id})` : `Series (${item.tmdb_id})`),
    releaseInfo: item.year != null ? String(item.year) : undefined,
    poster,
  };
}

export async function addToPmdbWatchlist(
  target: PmdbTarget,
  options: PmdbListOptions = {},
): Promise<boolean> {
  options.assertCurrent?.();
  if (!isAuthenticated()) return false;
  // Add-to-list takes tmdb_id + media_type only; resolve first, never send
  // ID-only targets the server must reject.
  if (target.tmdb_id == null) return false;
  const guard = capturePmdbListOwner(options.assertCurrent);
  try {
    await changePmdbList(target, true, { ...options, assertCurrent: guard });
    return true;
  } catch (error) {
    guard();
    if (options.strict) throw error;
    return false;
  }
}

export async function removeFromPmdbWatchlist(
  target: PmdbTarget,
  options: PmdbListOptions = {},
): Promise<boolean> {
  options.assertCurrent?.();
  if (!isAuthenticated()) return false;
  if (target.tmdb_id == null) return false;
  const guard = capturePmdbListOwner(options.assertCurrent);
  try {
    await changePmdbList(target, false, { ...options, assertCurrent: guard });
    return true;
  } catch (error) {
    guard();
    if (options.strict) throw error;
    return false;
  }
}
