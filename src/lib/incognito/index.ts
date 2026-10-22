import { useSyncExternalStore } from "react";

// Session-only on purpose: a restart always returns to normal tracking.
const KEY = "argus.incognito";
const listeners = new Set<() => void>();
let active = readInitial();

function readInitial(): boolean {
  try {
    return sessionStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

export function isIncognito(): boolean {
  return active;
}

export function setIncognito(next: boolean): void {
  if (active === next) return;
  active = next;
  try {
    if (next) sessionStorage.setItem(KEY, "1");
    else sessionStorage.removeItem(KEY);
  } catch {
    // Storage can be unavailable; the in-memory flag still holds for this run.
  }
  listeners.forEach((l) => l());
}

function subscribe(l: () => void): () => void {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function useIncognito(): boolean {
  return useSyncExternalStore(subscribe, isIncognito, () => false);
}
