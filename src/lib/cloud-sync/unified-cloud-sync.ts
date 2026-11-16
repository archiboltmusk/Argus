/**
 * Unified Cross-Platform Cloud Sync Service
 * Coordinates provider refreshes and status across platforms. Provider-specific
 * writers retain ownership of edits, conflict resolution, and durable queues.
 */

import { useSyncExternalStore } from "react";
import { isNuvioSignedIn, loadNuvioState } from "@/lib/nuvio/nuvio-client";
import { fetchNuvioProfiles, signOutNuvio } from "@/lib/nuvio/nuvio-auth";
import { pullAddonsFromNuvio, pullWatchProgressFromNuvio, resolveNuvioProfileIndex } from "@/lib/nuvio/nuvio-sync";
import { pullNuvioLibrarySnapshot } from "@/lib/nuvio/nuvio-library";
import { library, invalidateLibraryCache } from "@/lib/stremio";
import { flushWriteQueue } from "@/lib/stremio-write-queue";
import { cwProfileScope } from "@/lib/cw-profile";
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
let stateOwner = "";
let pending: { owner: string; promise: Promise<{ ok: boolean; count: number; error?: string }> } | null = null;

function syncOwner(): string {
  const nuvio = loadNuvioState();
  return JSON.stringify([cwProfileScope().profileId, isNuvioSignedIn() ? nuvio.session?.user?.id : null,
    nuvio.activeProfileIndex, readActiveStremioAuthKey()]);
}

function timestampKey(): string | null {
  const nuvio = loadNuvioState();
  const scope = cwProfileScope();
  let accountId = isNuvioSignedIn() ? nuvio.session?.user?.id : null;
  if (!accountId) {
    try { accountId = JSON.parse(localStorage.getItem(`argus.auth.${scope.sharedId}`) ?? "null")?.user?._id; }
    catch { /* Do not reuse another account's timestamp when identity is unavailable. */ }
  }
  if (!accountId) return null;
  return `${CLOUD_SYNC_TIMESTAMP_KEY}.${JSON.stringify([scope.profileId, accountId, nuvio.activeProfileIndex])}`;
}

const CLOUD_SYNC_REVISION_KEY = "argus.cloud-sync.revision.v1";

let memRevision: number | null = null;

export function getSyncRevision(): number {
  if (memRevision !== null) return memRevision;
  try {
    const raw = localStorage.getItem(CLOUD_SYNC_REVISION_KEY);
    memRevision = raw ? parseInt(raw, 10) || 0 : 0;
  } catch {
    memRevision = 0;
  }
  return memRevision;
}

export function bumpSyncRevision(): number {
  const next = getSyncRevision() + 1;
  memRevision = next;
  try {
    localStorage.setItem(CLOUD_SYNC_REVISION_KEY, String(next));
  } catch {}
  return next;
}

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
  const owner = syncOwner();
  if (owner !== stateOwner) {
    stateOwner = owner;
    activeState = { provider: "none", isConnected: false, userEmail: null, lastSyncedAt: null,
      isSyncing: false, itemsCount: 0, error: null };
  }
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
    const key = timestampKey();
    const raw = key ? localStorage.getItem(key) : null;
    if (raw) storedLastSync = parseInt(raw, 10);
  } catch {}

  const lastSyncedAt = Number.isFinite(storedLastSync) && storedLastSync! > 0 ? storedLastSync : activeState.lastSyncedAt;
  if (activeState.provider !== provider || activeState.isConnected !== isConnected ||
      activeState.userEmail !== userEmail || activeState.lastSyncedAt !== lastSyncedAt) {
    activeState = { ...activeState, provider, isConnected, userEmail, lastSyncedAt };
  }

  return activeState;
}

export function subscribeCloudSync(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/**
 * Executes a full cloud sync across all services (watch history, library, addons, profiles).
 */
export function syncAllCloudData(): Promise<{ ok: boolean; count: number; error?: string }> {
  const owner = syncOwner();
  if (pending?.owner === owner) return pending.promise;
  const promise = runCloudSync(owner);
  pending = { owner, promise };
  void promise.finally(() => { if (pending?.promise === promise) pending = null; });
  return promise;
}

async function runCloudSync(owner: string): Promise<{ ok: boolean; count: number; error?: string }> {
  const current = getCloudSyncSnapshot();
  const assertOwner = () => {
    if (syncOwner() !== owner) throw new Error("Account or profile changed during sync");
  };
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
      await fetchNuvioProfiles({ strict: true });
      assertOwner();

      // 2. Pull watch progress & reconcile local continue watching
      const cw = await pullWatchProgressFromNuvio(slot, { strict: true });
      assertOwner();
      totalItems += cw.length;

      // 3. Pull library bookmarks
      await pullNuvioLibrarySnapshot(slot, { strict: true });
      assertOwner();

      // 4. Pull addons
      const addons = await pullAddonsFromNuvio(String(slot), { strict: true });
      assertOwner();
      totalItems += addons.length;

      // Mark Nuvio as the active account provider
      try {
        localStorage.setItem("argus.account-provider", "nuvio");
      } catch {}
    }

    if (current.provider === "stremio") {
      const key = readActiveStremioAuthKey();
      if (!key) throw new Error("Stremio account disconnected");
      await flushWriteQueue();
      assertOwner();
      invalidateLibraryCache();
      const items = await library(key);
      assertOwner();
      totalItems = items.length;
    }
    assertOwner();
    const now = Date.now();
    const revision = bumpSyncRevision();
    try {
      const key = timestampKey();
      if (key) localStorage.setItem(key, String(now));
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
          detail: { provider: current.provider, itemsCount: totalItems, timestamp: now, revision },
        }),
      );
    }

    return { ok: true, count: totalItems };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Sync failed";
    // A departed account must not publish status into the new account's UI.
    if (syncOwner() === owner) {
      activeState = { ...activeState, isSyncing: false, error: msg };
      notify();
    }
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

  document.addEventListener("visibilitychange", onVisibility);
  window.addEventListener("online", onAccountChange);
  window.addEventListener("argus:account-provider-changed", onAccountChange);
  window.addEventListener("argus:nuvio-state-changed", onAccountChange);

  return () => {
    runnerStarted = false;
    window.clearInterval(intervalId);
    document.removeEventListener("visibilitychange", onVisibility);
    window.removeEventListener("online", onAccountChange);
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
