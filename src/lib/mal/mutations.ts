import { malRequest } from "./client";
import { activeProfileId } from "@/lib/active-profile-id";
import { getSession, subscribeSession } from "./session";
import type { MalListStatus } from "./types";

// Share list-status reads across the details button, overflow menu and
// episode-progress hooks. Failed reads are never cached.
const STATUS_CACHE_TTL_MS = 15_000;
const statusCache = new Map<string, { at: number; info: ListEntryInfo }>();
const statusPending = new Map<string, Promise<ListEntryInfo>>();
let statusGeneration = 0;

function invalidateStatusCache(): void {
  statusGeneration++;
  statusCache.clear();
  statusPending.clear();
}
subscribeSession(invalidateStatusCache);

function statusKey(malId: number): string {
  return [activeProfileId(), getSession()?.userName ?? "anonymous", malId].join(":");
}

export type SavedEntry = {
  status: MalListStatus;
  numEpisodesWatched: number;
};

export type ListEntryInfo = {
  numEpisodes: number | null;
  entry: { status: MalListStatus; numEpisodesWatched: number } | null;
};

type RawStatus = {
  status: string;
  score: number;
  num_episodes_watched: number;
  is_rewatching: boolean;
  updated_at: string;
};

function leadingInt(value: string): number | null {
  const n = Number(value.split(":")[0]);
  return Number.isFinite(n) ? n : null;
}

async function anilistToMal(anilistId: number): Promise<number | null> {
  try {
    const res = await fetch("https://graphql.anilist.co", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        query: "query ($id: Int) { Media(id: $id, type: ANIME) { idMal } }",
        variables: { id: anilistId },
      }),
    });
    if (!res.ok) return null;
    const json: unknown = await res.json();
    return (json as { data?: { Media?: { idMal: number | null } } })?.data?.Media?.idMal ?? null;
  } catch {
    return null;
  }
}

export async function resolveMalMediaId(argusId: string): Promise<number | null> {
  if (argusId.startsWith("mal:")) return leadingInt(argusId.slice(4));
  if (argusId.startsWith("anilist:")) {
    const id = leadingInt(argusId.slice(8));
    if (id == null) return null;
    const { anilistToMal: mappedAnilistToMal } = await import("@/lib/providers/anime-mapping");
    const viaMap = await mappedAnilistToMal(id).catch(() => null);
    return viaMap ?? anilistToMal(id);
  }
  if (argusId.startsWith("kitsu:")) {
    const id = leadingInt(argusId.slice(6));
    if (id == null) return null;
    const { kitsuToMal, kitsuToAnilist } = await import("@/lib/providers/anime-mapping");
    const direct = await kitsuToMal(id).catch(() => null);
    if (direct != null) return direct;
    const anilistId = await kitsuToAnilist(id).catch(() => null);
    return anilistId != null ? anilistToMal(anilistId) : null;
  }
  return null;
}

async function fetchListEntryUncached(malId: number, strict = false): Promise<ListEntryInfo> {
  const data = await malRequest<{
    id: number;
    num_episodes: number | null;
    my_list_status?: RawStatus | null;
  }>(`/anime/${malId}?fields=num_episodes,my_list_status`);
  if (
    strict &&
    (!data ||
      data.id !== malId ||
      (data.num_episodes !== null &&
        (!Number.isInteger(data.num_episodes) || data.num_episodes < 0)) ||
      (data.my_list_status != null &&
        (!data.my_list_status ||
          !["watching", "completed", "on_hold", "dropped", "plan_to_watch"].includes(
            data.my_list_status.status,
          ) ||
          !Number.isInteger(data.my_list_status.num_episodes_watched) ||
          data.my_list_status.num_episodes_watched < 0)))
  )
    throw new Error("The current MyAnimeList watched state could not be read safely.");
  return {
    numEpisodes: data.num_episodes ?? null,
    entry: data.my_list_status
      ? {
          status: data.my_list_status.status as MalListStatus,
          numEpisodesWatched: data.my_list_status.num_episodes_watched,
        }
      : null,
  };
}

export function fetchListEntry(malId: number, strict = false): Promise<ListEntryInfo> {
  // Strict verification always reaches MAL; it must not accept cached state.
  if (strict) return fetchListEntryUncached(malId, true);
  const key = statusKey(malId);
  const hit = statusCache.get(key);
  if (hit && Date.now() - hit.at < STATUS_CACHE_TTL_MS)
    return Promise.resolve(hit.info);
  const inflight = statusPending.get(key);
  if (inflight) return inflight;

  const generation = statusGeneration;
  const request = fetchListEntryUncached(malId).then((info) => {
    if (generation === statusGeneration && statusPending.get(key) === request) {
      statusCache.set(key, { at: Date.now(), info });
      if (statusCache.size > 128) statusCache.delete(statusCache.keys().next().value!);
    }
    return info;
  }).finally(() => {
    if (statusPending.get(key) === request) statusPending.delete(key);
  });
  statusPending.set(key, request);
  return request;
}

export async function saveListEntry(input: {
  malId: number;
  status?: MalListStatus;
  numEpisodesWatched?: number;
}): Promise<SavedEntry> {
  const params = new URLSearchParams();
  if (input.status) params.set("status", input.status);
  if (input.numEpisodesWatched != null)
    params.set("num_watched_episodes", String(input.numEpisodesWatched));
  const data = await malRequest<RawStatus>(`/anime/${input.malId}/my_list_status`, {
    method: "PATCH",
    body: params,
  });
  invalidateStatusCache();
  return {
    status: data.status as MalListStatus,
    numEpisodesWatched: data.num_episodes_watched,
  };
}

export async function deleteListEntry(malId: number): Promise<boolean> {
  try {
    await malRequest(`/anime/${malId}/my_list_status`, { method: "DELETE" });
    invalidateStatusCache();
    return true;
  } catch {
    return false;
  }
}
