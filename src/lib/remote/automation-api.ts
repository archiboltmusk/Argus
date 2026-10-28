/**
 * Argus Automation & Remote Control API
 *
 * Lightweight, secure, developer-friendly interface for external home automations:
 * - Siri & Apple Shortcuts
 * - Home Assistant (rest_command)
 * - Android Tasker & Scriptable
 * - Local REST / HTTP & WebSocket tools (curl, Python, Node.js)
 */

import { watchlistHas, toggleWatchlist, readLocalEntries, type LocalEntry } from "@/lib/watchlist";
import {
  addNuvioLibraryItem,
  removeNuvioLibraryItem,
  readCachedNuvioLibrary,
  type NuvioLibraryItem,
} from "@/lib/nuvio/nuvio-library";
import { resolveNuvioProfileIndex } from "@/lib/nuvio/nuvio-sync";
import { readActiveProfileIdentity, readAllProfilesIdentity } from "@/lib/profiles";
import { isBigPictureActive, pushBigPicture } from "@/lib/big-picture";
import { requestBpPlay } from "@/views/big-picture/bp-play-request";
import { detectExtendedPlatform } from "@/lib/platform";
import { renderCompanionRemoteHtml } from "./companion-remote-html";

declare const __APP_VERSION__: string | undefined;
export const appVersion = typeof __APP_VERSION__ === "string" ? __APP_VERSION__ : "1.0.339";

export interface AutomationPlaybackState {
  status: "playing" | "paused" | "buffering" | "idle";
  mediaId: string | null;
  mediaType: string | null;
  title: string | null;
  positionSec: number;
  durationSec: number;
  volume: number;
  muted: boolean;
  rate: number;
}

export interface AutomationSystemStatus {
  ok: boolean;
  app: string;
  version: string;
  platform: string;
  bigPicture: boolean;
  profile: {
    id: string;
    name: string;
    slot: number;
  };
  playback: AutomationPlaybackState;
}

export interface AutomationOpenRequest {
  id: string;
  type?: "movie" | "series" | "anime";
  name?: string;
  poster?: string;
  season?: number;
  episode?: number;
  autoplay?: boolean;
  resume?: boolean;
}

export interface AutomationLibraryItemRequest {
  id: string;
  type?: "movie" | "series";
  name?: string;
  poster?: string;
  description?: string;
  releaseInfo?: string;
  imdbRating?: number;
  genres?: string[];
  slot?: number;
}

/**
 * Validates external authorization header against configured API key.
 * If no key is set in settings, access on local network is open for community integrations.
 */
export function verifyAutomationKey(authHeader: string | null, configuredKey?: string): boolean {
  if (!configuredKey || !configuredKey.trim()) return true;
  if (!authHeader) return false;
  const cleanKey = configuredKey.trim();
  if (authHeader === cleanKey) return true;
  if (authHeader.startsWith("Bearer ") && authHeader.slice(7).trim() === cleanKey) return true;
  return false;
}

/**
 * Checks whether an item exists in the user's Watchlist or Nuvio library.
 */
export function hasLibraryItem(id: string, type = "movie", slot?: number): boolean {
  if (!id) return false;
  const cleanId = id.trim();
  if (watchlistHas(cleanId)) return true;
  const targetSlot = slot ?? resolveNuvioProfileIndex();
  const nuvioItems = readCachedNuvioLibrary(targetSlot);
  return nuvioItems.some(
    (item) => item.content_id === cleanId && (item.content_type === type || !type),
  );
}

/**
 * Adds an item to the library (both local watchlist and Nuvio cloud sync) idempotently.
 * Preserves existing metadata and tags without duplicates.
 */
export function addLibraryItem(item: AutomationLibraryItemRequest): { ok: boolean; added: boolean; id: string } {
  if (!item || !item.id) {
    throw new Error("Missing required 'id' parameter (IMDb or TMDB ID).");
  }
  const cleanId = item.id.trim();
  const type = item.type || (cleanId.startsWith("tt") ? "movie" : "movie");
  const targetSlot = item.slot ?? resolveNuvioProfileIndex();

  // 1. Add to local Watchlist
  if (!watchlistHas(cleanId)) {
    toggleWatchlist({
      id: cleanId,
      type,
      name: item.name || cleanId,
      poster: item.poster,
    });
  }

  // 2. Add to Nuvio synced library
  const nuvioItem: NuvioLibraryItem = {
    content_id: cleanId,
    content_type: type,
    name: item.name || cleanId,
    poster: item.poster || null,
    poster_shape: "POSTER",
    background: null,
    logo: null,
    description: item.description || null,
    release_info: item.releaseInfo || null,
    imdb_rating: item.imdbRating || null,
    genres: Array.isArray(item.genres) ? item.genres : [],
    addon_base_url: null,
    added_at: Date.now(),
  };

  addNuvioLibraryItem(targetSlot, nuvioItem);

  return { ok: true, added: true, id: cleanId };
}

/**
 * Removes an item from the library and registers a sync tombstone.
 */
export function removeLibraryItem(id: string, type = "movie", slot?: number): { ok: boolean; removed: boolean; id: string } {
  if (!id) throw new Error("Missing required 'id' parameter.");
  const cleanId = id.trim();
  const targetSlot = slot ?? resolveNuvioProfileIndex();

  // 1. Remove from Watchlist if present
  if (watchlistHas(cleanId)) {
    toggleWatchlist({ id: cleanId, type });
  }

  // 2. Remove from Nuvio library with tombstone
  removeNuvioLibraryItem(targetSlot, cleanId, type);

  return { ok: true, removed: true, id: cleanId };
}

/**
 * Lists all library entries for the active or specified profile slot.
 */
export function listLibraryItems(slot?: number): NuvioLibraryItem[] {
  const targetSlot = slot ?? resolveNuvioProfileIndex();
  const nuvio = readCachedNuvioLibrary(targetSlot);
  if (nuvio.length > 0) return nuvio;

  // Fallback to local watchlist items converted to standard schema
  const local = readLocalEntries();
  return local.map((w: LocalEntry) => ({
    content_id: w.id,
    content_type: w.type || "movie",
    name: w.name || w.id,
    poster: w.poster || null,
    poster_shape: "POSTER" as const,
    background: null,
    logo: null,
    description: null,
    release_info: null,
    imdb_rating: null,
    genres: [],
    addon_base_url: null,
    added_at: w.addedAt || Date.now(),
  }));
}

/**
 * Remotely opens a title or directly triggers playback on the TV / screen.
 */
export function openOrPlayMedia(req: AutomationOpenRequest): { ok: boolean; status: "playback_initiated" | "detail_opened"; id: string } {
  if (!req || !req.id) throw new Error("Missing required 'id' parameter.");
  const cleanId = req.id.trim();
  const type = req.type || (cleanId.startsWith("tt") ? "movie" : "movie");

  if (isBigPictureActive()) {
    const metaId = `${type}:${cleanId}`;
    if (req.autoplay) {
      requestBpPlay(metaId);
    }
    pushBigPicture({ kind: "detail", metaId });
    return {
      ok: true,
      status: req.autoplay ? "playback_initiated" : "detail_opened",
      id: cleanId,
    };
  }

  // Standard Desktop / Tablet / Mobile route
  window.dispatchEvent(
    new CustomEvent("argus:remote-open", {
      detail: {
        action: req.autoplay ? "playMeta" : "openMeta",
        metaId: cleanId,
        metaType: type,
        name: req.name,
        poster: req.poster,
        season: req.season,
        episode: req.episode,
        resume: req.resume ?? true,
      },
    }),
  );

  return {
    ok: true,
    status: req.autoplay ? "playback_initiated" : "detail_opened",
    id: cleanId,
  };
}

/**
 * Universal JSON Request Dispatcher for Local HTTP / REST API.
 * Called by the local server or web bridge.
 */
export async function handleAutomationApiRequest(req: {
  method: string;
  path: string;
  headers: Record<string, string>;
  body?: unknown;
}): Promise<{ status: number; body: Record<string, unknown> }> {
  const method = req.method.toUpperCase();
  const urlPath = req.path.split("?")[0].replace(/\/+$/, "") || "/";
  const authHeader = req.headers["authorization"] || req.headers["x-argus-key"] || null;

  if (!verifyAutomationKey(authHeader)) {
    return { status: 401, body: { ok: false, error: "Unauthorized: Invalid or missing API key." } };
  }

  // 1. GET /api/v1/status
  if (method === "GET" && (urlPath === "/api/v1/status" || urlPath === "/api/status")) {
    const activeProfile = readActiveProfileIdentity();
    const currentSlot = resolveNuvioProfileIndex();
    return {
      status: 200,
      body: {
        ok: true,
        app: "Argus",
        version: appVersion,
        platform: detectExtendedPlatform(),
        bigPicture: isBigPictureActive(),
        profile: {
          id: activeProfile?.id || "default",
          name: activeProfile?.name || "Default Profile",
          slot: currentSlot,
        },
      },
    };
  }

  // 2. POST /api/v1/open (Open or Play movie/series)
  if (method === "POST" && (urlPath === "/api/v1/open" || urlPath === "/api/open")) {
    const data = (req.body ?? {}) as AutomationOpenRequest;
    try {
      const res = openOrPlayMedia(data);
      return { status: 200, body: { ...res } };
    } catch (e) {
      return { status: 400, body: { ok: false, error: e instanceof Error ? e.message : "Bad Request" } };
    }
  }

  // 3. GET /api/v1/library (List library)
  if (method === "GET" && (urlPath === "/api/v1/library" || urlPath === "/api/library")) {
    const items = listLibraryItems();
    return {
      status: 200,
      body: {
        ok: true,
        count: items.length,
        items,
      },
    };
  }

  // 4. POST /api/v1/library (Add item)
  if (method === "POST" && (urlPath === "/api/v1/library" || urlPath === "/api/library")) {
    const data = (req.body ?? {}) as AutomationLibraryItemRequest;
    try {
      const res = addLibraryItem(data);
      return { status: 200, body: { ...res } };
    } catch (e) {
      return { status: 400, body: { ok: false, error: e instanceof Error ? e.message : "Bad Request" } };
    }
  }

  // 5. DELETE /api/v1/library (Remove item)
  if (method === "DELETE" && (urlPath === "/api/v1/library" || urlPath === "/api/library")) {
    const data = (req.body ?? {}) as { id: string; type?: "movie" | "series"; slot?: number };
    try {
      const res = removeLibraryItem(data.id, data.type, data.slot);
      return { status: 200, body: { ...res } };
    } catch (e) {
      return { status: 400, body: { ok: false, error: e instanceof Error ? e.message : "Bad Request" } };
    }
  }

  // 6. GET /api/v1/profiles
  if (method === "GET" && (urlPath === "/api/v1/profiles" || urlPath === "/api/profiles")) {
    const profiles = readAllProfilesIdentity();
    const active = readActiveProfileIdentity();
    return {
      status: 200,
      body: {
        ok: true,
        activeProfileId: active?.id,
        profiles: profiles.map((p, idx) => ({
          id: p.id,
          name: p.name,
          slot: idx + 1,
          color: p.color,
        })),
      },
    };
  }

  // 7. GET /remote or /remote.html (Mobile Virtual Remote UI)
  if (method === "GET" && (urlPath === "/remote" || urlPath === "/remote.html")) {
    return {
      status: 200,
      body: {
        contentType: "text/html",
        html: renderCompanionRemoteHtml(appVersion),
      },
    };
  }

  // 8. POST /api/v1/remote/key (Remote D-Pad & media keys)
  if (method === "POST" && (urlPath === "/api/v1/remote/key" || urlPath === "/api/remote/key")) {
    const data = (req.body ?? {}) as { key?: string; value?: number };
    const key = data.key || "Enter";
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new KeyboardEvent("keydown", {
          key,
          code: key,
          bubbles: true,
          cancelable: true,
        }),
      );
      window.dispatchEvent(
        new KeyboardEvent("keyup", {
          key,
          code: key,
          bubbles: true,
          cancelable: true,
        }),
      );
    }
    return { status: 200, body: { ok: true, key } };
  }

  // 9. POST /api/v1/remote/text (Remote search & magnet link paste)
  if (method === "POST" && (urlPath === "/api/v1/remote/text" || urlPath === "/api/remote/text")) {
    const data = (req.body ?? {}) as { text?: string };
    const text = data.text?.trim() || "";
    if (text && typeof window !== "undefined") {
      if (/^(?:magnet:\?|https?:\/\/.*(?:\.torrent|\.mkv|\.mp4))/i.test(text)) {
        window.dispatchEvent(
          new CustomEvent("argus:remote-open-stream", {
            detail: { url: text },
          }),
        );
      } else {
        window.dispatchEvent(
          new CustomEvent("argus:remote-search", {
            detail: { query: text },
          }),
        );
      }
    }
    return { status: 200, body: { ok: true, text } };
  }

  // 10. GET /api/v1/sync (Export device session for Zero-Config QR Pairing)
  if (method === "GET" && (urlPath === "/api/v1/sync" || urlPath === "/api/sync")) {
    let settingsPayload: unknown = null;
    let profilesPayload: unknown = null;
    let addonsPayload: unknown = null;
    if (typeof localStorage !== "undefined") {
      try {
        settingsPayload = JSON.parse(localStorage.getItem("argus.settings") ?? "{}");
        profilesPayload = JSON.parse(localStorage.getItem("argus.profiles.v1") ?? "{}");
        addonsPayload = JSON.parse(localStorage.getItem("argus.installed-addons.v1") ?? "[]");
      } catch {}
    }
    return {
      status: 200,
      body: {
        ok: true,
        app: "Argus",
        timestamp: Date.now(),
        sync: {
          settings: settingsPayload,
          profiles: profilesPayload,
          addons: addonsPayload,
        },
      },
    };
  }

  // 11. POST /api/v1/sync (Import device session from paired screen)
  if (method === "POST" && (urlPath === "/api/v1/sync" || urlPath === "/api/sync")) {
    const data = (req.body ?? {}) as { sync?: { settings?: unknown; profiles?: unknown; addons?: unknown } };
    if (data.sync && typeof window !== "undefined" && typeof localStorage !== "undefined") {
      try {
        if (data.sync.settings) localStorage.setItem("argus.settings", JSON.stringify(data.sync.settings));
        if (data.sync.profiles) localStorage.setItem("argus.profiles.v1", JSON.stringify(data.sync.profiles));
        if (data.sync.addons) localStorage.setItem("argus.installed-addons.v1", JSON.stringify(data.sync.addons));
        window.dispatchEvent(new CustomEvent("argus:settings-updated"));
        window.dispatchEvent(new CustomEvent("argus:profiles-updated"));
        return { status: 200, body: { ok: true, synced: true } };
      } catch {
        return { status: 500, body: { ok: false, error: "Failed to persist synced device state." } };
      }
    }
    return { status: 400, body: { ok: false, error: "Missing sync payload." } };
  }

  return {
    status: 404,
    body: { ok: false, error: `Endpoint ${method} ${urlPath} not found.` },
  };
}
