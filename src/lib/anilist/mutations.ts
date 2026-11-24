import { anilistRequest } from "./client";
import { activeProfileId } from "@/lib/active-profile-id";
import { getSession, subscribeSession } from "./session";
import type { MediaListStatus } from "./types";

// The detail button, episode progress and overflow menu often request the
// same entry simultaneously. Share those reads and briefly reuse the result,
// but never cache strict verification or writes.
const ENTRY_CACHE_MS = 15_000;
const entryCache = new Map<string, { at: number; info: ListEntryInfo }>();
const entryPending = new Map<string, Promise<ListEntryInfo>>();
let entryGeneration = 0;

function clearEntryCache(): void {
  entryGeneration++;
  entryCache.clear();
  entryPending.clear();
}
subscribeSession(clearEntryCache);

function entryKey(mediaId: number): string {
  return [activeProfileId(), getSession()?.userId ?? "anonymous", mediaId].join(":");
}

const SAVE_ENTRY = `mutation ($mediaId: Int, $status: MediaListStatus, $progress: Int, $private: Boolean, $customLists: [String]) {
  SaveMediaListEntry(mediaId: $mediaId, status: $status, progress: $progress, private: $private, customLists: $customLists) {
    id
    status
    progress
    private
    customLists
  }
}`;

const DELETE_ENTRY = `mutation ($id: Int) {
  DeleteMediaListEntry(id: $id) { deleted }
}`;

const LIST_ENTRY = `query ($mediaId: Int) {
  Media(id: $mediaId, type: ANIME) {
    episodes
    mediaListEntry { id status progress private customLists }
  }
  Viewer { mediaListOptions { animeList { customLists } } }
}`;

export type SavedEntry = {
  id: number;
  status: MediaListStatus;
  progress: number;
  private?: boolean;
  customLists?: unknown;
};

export type ListEntry = {
  id: number;
  status: MediaListStatus;
  progress: number;
  private: boolean;
  customLists: string[];
};

export type ListEntryInfo = {
  episodes: number | null;
  entry: ListEntry | null;
  /** The viewer's own custom list names, in their configured order. */
  customLists: string[];
};

/**
 * AniList returns an entry's list names as JSON and stores the viewer's list names as a JSON
 * string, so one reader covers both without trusting either shape.
 */
export function parseAnilistListNames(value: unknown): string[] {
  let source: unknown = value;
  if (typeof source === "string") {
    if (!source.trim()) return [];
    try {
      source = JSON.parse(source) as unknown;
    } catch {
      return [];
    }
  }
  if (!Array.isArray(source)) return [];
  return source.filter(
    (name): name is string => typeof name === "string" && name.trim().length > 0,
  );
}

export async function saveListEntry(input: {
  mediaId: number;
  status?: MediaListStatus;
  progress?: number;
  private?: boolean;
  customLists?: string[];
}): Promise<SavedEntry> {
  const data = await anilistRequest<{ SaveMediaListEntry: SavedEntry }>(SAVE_ENTRY, input);
  clearEntryCache();
  return data.SaveMediaListEntry;
}

export async function deleteListEntry(id: number): Promise<boolean> {
  const data = await anilistRequest<{ DeleteMediaListEntry: { deleted: boolean } }>(DELETE_ENTRY, {
    id,
  });
  const deleted = data.DeleteMediaListEntry?.deleted ?? false;
  if (deleted) clearEntryCache();
  return deleted;
}

async function fetchListEntryUncached(mediaId: number, strict = false): Promise<ListEntryInfo> {
  const data = await anilistRequest<{
    Media: {
      episodes: number | null;
      mediaListEntry: {
        id: number;
        status: MediaListStatus;
        progress: number;
        private: boolean;
        customLists: unknown;
      } | null;
    } | null;
    Viewer: { mediaListOptions: { animeList: { customLists: unknown } | null } | null } | null;
  }>(LIST_ENTRY, { mediaId });
  const media = data?.Media;
  if (
    strict &&
    (!media ||
      !Object.hasOwn(media, "mediaListEntry") ||
      (media.episodes !== null && (!Number.isInteger(media.episodes) || media.episodes < 0)) ||
      (media.mediaListEntry !== null &&
        (!media.mediaListEntry ||
          !["CURRENT", "PLANNING", "COMPLETED", "DROPPED", "PAUSED", "REPEATING"].includes(
            media.mediaListEntry.status,
          ) ||
          !Number.isInteger(media.mediaListEntry.progress) ||
          media.mediaListEntry.progress < 0)))
  )
    throw new Error("The current AniList watched state could not be read safely.");
  const raw = media?.mediaListEntry;
  return {
    episodes: data.Media?.episodes ?? null,
    entry: raw
      ? {
          id: raw.id,
          status: raw.status,
          progress: raw.progress,
          private: raw.private === true,
          customLists: parseAnilistListNames(raw.customLists),
        }
      : null,
    customLists: parseAnilistListNames(data.Viewer?.mediaListOptions?.animeList?.customLists),
  };
}

export function fetchListEntry(mediaId: number, strict = false): Promise<ListEntryInfo> {
  if (strict) return fetchListEntryUncached(mediaId, true);
  const key = entryKey(mediaId);
  const cached = entryCache.get(key);
  if (cached && Date.now() - cached.at < ENTRY_CACHE_MS) return Promise.resolve(cached.info);
  const pending = entryPending.get(key);
  if (pending) return pending;
  const generation = entryGeneration;
  const request = fetchListEntryUncached(mediaId).then((info) => {
    if (generation === entryGeneration && entryPending.get(key) === request) {
      entryCache.set(key, { at: Date.now(), info });
      if (entryCache.size > 128) entryCache.delete(entryCache.keys().next().value!);
    }
    return info;
  }).finally(() => {
    if (entryPending.get(key) === request) entryPending.delete(key);
  });
  entryPending.set(key, request);
  return request;
}
