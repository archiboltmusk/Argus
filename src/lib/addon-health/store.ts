import { useSyncExternalStore } from "react";
import {
  lastSuccessAt,
  medianMs,
  pushOutcome,
  recommendAction,
  reliabilityScore,
  statusOf,
  type AddonHealth,
  type AddonRecommendation,
  type HealthStatus,
} from "./health";

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

export function addonHealth(addonId: string): AddonHealth | undefined {
  return load()[addonId];
}

export function addonStatus(addonId: string): HealthStatus {
  return statusOf(load()[addonId]);
}

export function addonScore(addonId: string): number | null {
  return reliabilityScore(load()[addonId]);
}

export function addonMedianMs(addonId: string): number | null {
  return medianMs(load()[addonId]);
}

export function addonLastSuccess(addonId: string): number | null {
  return lastSuccessAt(load()[addonId]);
}

export function useAddonHealth(addonId: string): AddonHealth | undefined {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => addonHealth(addonId),
    () => undefined,
  );
}

export function useAddonScore(addonId: string): number | null {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => addonScore(addonId),
    () => null,
  );
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

export function useAddonMedianMs(addonId: string): number | null {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => addonMedianMs(addonId),
    () => null,
  );
}

export function useAddonLastSuccess(addonId: string): number | null {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => addonLastSuccess(addonId),
    () => null,
  );
}

export function useAddonRecommendation(addonId: string, enabled: boolean): AddonRecommendation {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => recommendAction(load()[addonId], enabled),
    () => "needs-data" as AddonRecommendation,
  );
}

export function clearAddonHealth(addonId: string) {
  const all = { ...load() };
  delete all[addonId];
  cache = all;
  persist();
}
