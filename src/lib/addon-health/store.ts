import { useSyncExternalStore } from "react";
import { pushOutcome, statusOf, type AddonHealth, type HealthStatus } from "./health";

const KEY = "argus.addonHealth.v1";

type All = Record<string, AddonHealth>;

let cache: All | null = null;
const listeners = new Set<() => void>();

function load(): All {
  if (cache) return cache;
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    cache = parsed && typeof parsed === "object" ? (parsed as All) : {};
  } catch {
    cache = {};
  }
  return cache;
}

function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify(cache ?? {}));
  } catch {
    /* storage unavailable */
  }
  for (const l of listeners) l();
}

export function recordAddonOutcome(addonId: string, ok: boolean, ms: number, reason?: string) {
  if (!addonId) return;
  const all = load();
  cache = { ...all, [addonId]: pushOutcome(all[addonId], { ok, ms, at: Date.now(), reason }) };
  persist();
}

export function addonStatus(addonId: string): HealthStatus {
  return statusOf(load()[addonId]);
}

export function clearAddonHealth(addonId: string) {
  const all = { ...load() };
  delete all[addonId];
  cache = all;
  persist();
}

export function useAddonStatus(addonId: string): HealthStatus {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => addonStatus(addonId),
    () => "unknown" as HealthStatus,
  );
}
