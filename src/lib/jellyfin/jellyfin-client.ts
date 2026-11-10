import { safeFetch as fetch } from "@/lib/safe-fetch";
import type { Meta } from "@/lib/cinemeta";
import type { HomeRow } from "@/views/home/home-types";
import type {
  JellyfinLibrary,
  JellyfinItem,
} from "./jellyfin-types";

function normalizeUrl(url: string): string {
  return url.replace(/\/+$/, "");
}

export function authHeader(apiKey: string): Record<string, string> {
  const cleanKey = apiKey.trim();
  return {
    "X-Emby-Token": cleanKey,
    "Authorization": `MediaBrowser Client="Argus", Device="Argus", DeviceId="argus-player", Version="3.0.0", Token="${cleanKey}"`,
    "Accept": "application/json",
  };
}

export async function testJellyfinConnection(
  serverUrl: string,
  apiKey: string,
): Promise<{ ok: boolean; serverName?: string; version?: string; error?: string }> {
  try {
    const base = normalizeUrl(serverUrl);
    const res = await fetch(`${base}/System/Info/Public`, {
      headers: authHeader(apiKey),
    });
    if (!res.ok) {
      return { ok: false, error: `Server returned HTTP ${res.status}` };
    }
    const info = (await res.json()) as { ServerName?: string; Version?: string; ProductName?: string };
    return {
      ok: true,
      serverName: info.ServerName || info.ProductName || "Jellyfin Media Server",
      version: info.Version,
    };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function fetchJellyfinLibraries(
  serverUrl: string,
  apiKey: string,
  userId?: string,
): Promise<JellyfinLibrary[]> {
  try {
    const base = normalizeUrl(serverUrl);
    const endpoint = userId
      ? `${base}/Users/${encodeURIComponent(userId)}/Views`
      : `${base}/Library/MediaFolders`;
    const res = await fetch(endpoint, {
      headers: authHeader(apiKey),
    });
    if (!res.ok) return [];
    const data = (await res.json()) as { Items?: JellyfinLibrary[] };
    return data.Items || [];
  } catch {
    return [];
  }
}

export async function fetchJellyfinItems(
  serverUrl: string,
  apiKey: string,
  userId?: string,
  parentId?: string,
  limit = 50,
): Promise<JellyfinItem[]> {
  try {
    const base = normalizeUrl(serverUrl);
    const params = new URLSearchParams({
      Limit: String(limit),
      Recursive: "true",
      IncludeItemTypes: "Movie,Series",
      SortBy: "DateCreated,SortName",
      SortOrder: "Descending",
      Fields: "Overview,ProductionYear,CommunityRating,PremiereDate,RunTimeTicks,UserData",
    });
    if (parentId) params.set("ParentId", parentId);

    const endpoint = userId
      ? `${base}/Users/${encodeURIComponent(userId)}/Items?${params}`
      : `${base}/Items?${params}`;

    const res = await fetch(endpoint, {
      headers: authHeader(apiKey),
    });
    if (!res.ok) return [];
    const data = (await res.json()) as { Items?: JellyfinItem[] };
    return data.Items || [];
  } catch {
    return [];
  }
}

export function getJellyfinImageUrl(
  serverUrl: string,
  itemId: string,
  type: "Primary" | "Backdrop" | "Thumb" = "Primary",
  maxDim = 600,
): string {
  const base = normalizeUrl(serverUrl);
  return `${base}/Items/${encodeURIComponent(itemId)}/Images/${type}?maxWidth=${maxDim}&quality=90`;
}

export function getJellyfinStreamUrl(
  serverUrl: string,
  itemId: string,
  apiKey: string,
): string {
  const base = normalizeUrl(serverUrl);
  return `${base}/Videos/${encodeURIComponent(itemId)}/stream?static=true&api_key=${encodeURIComponent(apiKey.trim())}`;
}

export async function reportJellyfinProgress(
  serverUrl: string,
  apiKey: string,
  itemId: string,
  positionMs: number,
  isPaused: boolean,
): Promise<void> {
  try {
    const base = normalizeUrl(serverUrl);
    const ticks = Math.round(positionMs * 10000); // 1 tick = 100 nanoseconds
    const endpoint = isPaused
      ? `${base}/Sessions/Playing/Progress`
      : `${base}/Sessions/Playing/Progress`;
    await fetch(endpoint, {
      method: "POST",
      headers: {
        ...authHeader(apiKey),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ItemId: itemId,
        PositionTicks: ticks,
        IsPaused: isPaused,
        PlayMethod: "DirectPlay",
      }),
    });
  } catch {}
}

export function jellyfinItemToArgusMeta(serverUrl: string, item: JellyfinItem): Meta {
  const isSeries = item.Type === "Series";
  const poster = getJellyfinImageUrl(serverUrl, item.Id, "Primary", 500);
  const background = getJellyfinImageUrl(serverUrl, item.Id, "Backdrop", 1280);

  return {
    id: `jellyfin:${item.Id}`,
    type: isSeries ? "series" : "movie",
    name: item.Name,
    releaseInfo: item.ProductionYear != null ? String(item.ProductionYear) : undefined,
    releaseDate: item.PremiereDate,
    description: item.Overview,
    poster,
    background,
    imdbRating: item.CommunityRating != null ? item.CommunityRating.toFixed(1) : undefined,
    runtime: item.RunTimeTicks != null ? Math.round(item.RunTimeTicks / 600000000) + " min" : undefined,
  };
}

export const jellyfinItemToMeta = (item: JellyfinItem, serverUrl: string): Meta =>
  jellyfinItemToArgusMeta(serverUrl, item);

export function jellyfinItemToStream(
  item: JellyfinItem,
  serverUrl: string,
  apiKey: string,
): { name: string; url: string } {
  return {
    name: "Jellyfin Direct Play",
    url: getJellyfinStreamUrl(serverUrl, item.Id, apiKey),
  };
}

export function jellyfinLibraryToHomeRow(
  serverUrl: string,
  library: JellyfinLibrary,
  items: JellyfinItem[],
): HomeRow {
  const metas = items.map((i) => jellyfinItemToArgusMeta(serverUrl, i));
  return {
    key: `jellyfin-lib-${library.Id}`,
    type: library.CollectionType === "tvshows" ? "series" : "movie",
    name: `Jellyfin: ${library.Name}`,
    metas,
    page: 1,
    hasMore: false,
  };
}
