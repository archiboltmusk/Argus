/**
 * Unified Cross-Platform Cloud Sync Service
 * Coordinates bi-directional synchronization of watch history, continue watching,
 * library items, addons, and profiles across iOS, Android TV/Projector, macOS, Windows, and Web.
 */

import { useSyncExternalStore } from "react";
import { isNuvioSignedIn, loadNuvioState } from "@/lib/nuvio/nuvio-client";
import { fetchNuvioProfiles, signOutNuvio } from "@/lib/nuvio/nuvio-auth";
import { pullAddonsFromNuvio, pullWatchProgressFromNuvio, resolveNuvioProfileIndex } from "@/lib/nuvio/nuvio-sync";
import { pullNuvioLibrarySnapshot } from "@/lib/nuvio/nuvio-library";
import { readActiveStremioAuthKey } from "@/lib/auth";

export type CloudSyncProvider = "nuvio" | "stremio" | "none";

export interface CloudSyncState {
  provider: CloudSyncProvider;
  isConnected: boolean;
  userEmail: string | null;
  lastSyncedAt: number | null;
  isSyncing: boolean;
  itemsCount: number;
  error: string | null;
}

const CLOUD_SYNC_TIMESTAMP_KEY = "argus.cloud-sync.last_synced_at";

let activeState: CloudSyncState = {
  provider: "none",
  isConnected: false,
  userEmail: null,
  lastSyncedAt: null,
  isSyncing: false,
  itemsCount: 0,
  error: null,
};

const listeners = new Set<() => void>();

function notify(): void {
  for (const listener of listeners) {
    try {
      listener();
    } catch (e) {
      console.warn("[cloud-sync] listener error", e);
    }
  }
}

export function getCloudSyncSnapshot(): CloudSyncState {
  const nuvio = isNuvioSignedIn();
  const nuvioState = loadNuvioState();
  const stremioKey = readActiveStremioAuthKey();

  let provider: CloudSyncProvider = "none";
  let isConnected = false;
  let userEmail: string | null = null;

  if (nuvio && nuvioState.session) {
    provider = "nuvio";
    isConnected = true;
    userEmail = nuvioState.session.user?.email || nuvioState.session.user?.id || "Nuvio User";
  } else if (stremioKey) {
    provider = "stremio";
    isConnected = true;
    userEmail = "Stremio Cloud User";
  }

  let storedLastSync: number | null = null;
  try {
    const raw = localStorage.getItem(CLOUD_SYNC_TIMESTAMP_KEY);
    if (raw) storedLastSync = parseInt(raw, 10);
  } catch {}

  activeState = {
    ...activeState,
    provider,
    isConnected,
    userEmail,
    lastSyncedAt: storedLastSync || activeState.lastSyncedAt,
  };

  return activeState;
}

export function subscribeCloudSync(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/**
 * Executes a full cloud sync across all services (watch history, library, addons, profiles).
 */
export async function syncAllCloudData(): Promise<{ ok: boolean; count: number; error?: string }> {
  const current = getCloudSyncSnapshot();
  if (!current.isConnected) {
    return { ok: true, count: 0 };
  }

  activeState = { ...activeState, isSyncing: true, error: null };
  notify();

  let totalItems = 0;

  try {
    if (current.provider === "nuvio") {
      const nuvioState = loadNuvioState();
      const slot = resolveNuvioProfileIndex(nuvioState.activeProfileIndex);

      // 1. Refresh profiles
      await fetchNuvioProfiles().catch((e) => console.warn("[cloud-sync] profiles error", e));

      // 2. Pull watch progress & reconcile local continue watching
      const cw = await pullWatchProgressFromNuvio(slot);
      totalItems += cw.length;

      // 3. Pull library bookmarks
      await pullNuvioLibrarySnapshot(slot).catch((e) => console.warn("[cloud-sync] library error", e));

      // 4. Pull addons
      const addons = await pullAddonsFromNuvio(String(slot));
      totalItems += addons.length;

      // Mark Nuvio as the active account provider
      try {
        localStorage.setItem("argus.account-provider", "nuvio");
      } catch {}
    }

    const now = Date.now();
    try {
      localStorage.setItem(CLOUD_SYNC_TIMESTAMP_KEY, String(now));
    } catch {}

    activeState = {
      ...activeState,
      isSyncing: false,
      lastSyncedAt: now,
      itemsCount: totalItems,
      error: null,
    };
    notify();

    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("argus:cloud-sync-complete", {
          detail: { provider: current.provider, itemsCount: totalItems, timestamp: now },
        }),
      );
    }

    return { ok: true, count: totalItems };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Sync failed";
    activeState = { ...activeState, isSyncing: false, error: msg };
    notify();
    return { ok: false, count: totalItems, error: msg };
  }
}

/**
 * Initializes automatic background cloud sync runner.
 * Listens for app launch, visibility changes, and runs every 5 minutes.
 */
let runnerStarted = false;
export function initUnifiedCloudSyncRunner(): () => void {
  if (runnerStarted || typeof window === "undefined") return () => {};
  runnerStarted = true;

  // Immediate sync on startup
  void syncAllCloudData();

  // Periodic interval: every 5 minutes
  const intervalId = window.setInterval(() => {
    void syncAllCloudData();
  }, 5 * 60 * 1000);

  const onVisibility = () => {
    if (document.visibilityState === "visible") {
      void syncAllCloudData();
    }
  };

  const onAccountChange = () => {
    void syncAllCloudData();
  };

  window.addEventListener("visibilitychange", onVisibility);
  window.addEventListener("argus:account-provider-changed", onAccountChange);
  window.addEventListener("argus:nuvio-state-changed", onAccountChange);

  return () => {
    runnerStarted = false;
    window.clearInterval(intervalId);
    window.removeEventListener("visibilitychange", onVisibility);
    window.removeEventListener("argus:account-provider-changed", onAccountChange);
    window.removeEventListener("argus:nuvio-state-changed", onAccountChange);
  };
}

/**
 * React hook to observe and trigger Cloud Sync across any view.
 */
export function useCloudSync() {
  const state = useSyncExternalStore(subscribeCloudSync, getCloudSyncSnapshot, getCloudSyncSnapshot);

  return {
    ...state,
    syncNow: syncAllCloudData,
    signOutCloud: async () => {
      if (state.provider === "nuvio") {
        await signOutNuvio();
      }
      activeState = {
        provider: "none",
        isConnected: false,
        userEmail: null,
        lastSyncedAt: null,
        isSyncing: false,
        itemsCount: 0,
        error: null,
      };
      notify();
    },
  };
}
