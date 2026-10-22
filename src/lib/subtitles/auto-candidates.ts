import { useSyncExternalStore } from "react";
import type { SubResult } from "./types";

export type AutoSubState = {
  label: string;
  matchScore: number | null;
  index: number;
  total: number;
  /** Loads the next-best candidate; resolves false when none are left. */
  tryNext: (() => Promise<boolean>) | null;
};

const EMPTY: AutoSubState = { label: "", matchScore: null, index: 0, total: 0, tryNext: null };

let state: AutoSubState = EMPTY;
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

export function setAutoSub(next: AutoSubState): void {
  state = next;
  emit();
}

export function clearAutoSub(): void {
  if (state === EMPTY) return;
  state = EMPTY;
  emit();
}

export function describeAutoSub(r: SubResult): string {
  return r.title || r.release || r.source;
}

export function useAutoSub(): AutoSubState {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => state,
    () => state,
  );
}
