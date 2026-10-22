import { useSyncExternalStore } from "react";

const BOOT_KEY = "argus.selfheal.boot";
const SAFE_KEY = "argus.selfheal.safe";
const LOOP_AT = 3;
const LOOP_WINDOW_MS = 10 * 60 * 1000;
export const HEALTHY_AFTER_MS = 30_000;

type Boot = { streak: number; at: number; healthy: boolean };

const listeners = new Set<() => void>();

function readBoot(): Boot | null {
  try {
    const raw = localStorage.getItem(BOOT_KEY);
    return raw ? (JSON.parse(raw) as Boot) : null;
  } catch {
    return null;
  }
}

function writeBoot(b: Boot) {
  try {
    localStorage.setItem(BOOT_KEY, JSON.stringify(b));
  } catch {
    /* storage unavailable */
  }
}

/** Pure: the next boot record given the previous one. */
export function nextBoot(prev: Boot | null, now: number): Boot {
  const looping = prev && !prev.healthy && now - prev.at < LOOP_WINDOW_MS;
  return { streak: looping ? prev.streak + 1 : 1, at: now, healthy: false };
}

export function isCrashLoop(b: Boot | null): boolean {
  return !!b && !b.healthy && b.streak >= LOOP_AT;
}

export function isSafeMode(): boolean {
  try {
    return localStorage.getItem(SAFE_KEY) === "1";
  } catch {
    return false;
  }
}

export function setSafeMode(on: boolean) {
  try {
    if (on) localStorage.setItem(SAFE_KEY, "1");
    else localStorage.removeItem(SAFE_KEY);
  } catch {
    /* storage unavailable */
  }
  for (const l of listeners) l();
}

/** Call once at startup. Enters safe mode when the last few launches never got healthy. */
export function recordBoot(now = Date.now()): () => void {
  const boot = nextBoot(readBoot(), now);
  writeBoot(boot);
  if (isCrashLoop(boot)) setSafeMode(true);
  const timer = window.setTimeout(() => writeBoot({ ...boot, healthy: true }), HEALTHY_AFTER_MS);
  return () => window.clearTimeout(timer);
}

export function useSafeMode(): boolean {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    isSafeMode,
    () => false,
  );
}
