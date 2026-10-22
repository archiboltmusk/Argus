import { useSyncExternalStore } from "react";

export type SharedMark = { sec: number; name: string; note: string };

const EMPTY: SharedMark[] = [];
let marks: SharedMark[] = EMPTY;
const listeners = new Set<() => void>();

export function setSharedMarks(next: SharedMark[]): void {
  if (next.length === 0 && marks === EMPTY) return;
  marks = next.length === 0 ? EMPTY : next;
  listeners.forEach((l) => l());
}

function subscribe(l: () => void): () => void {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function useSharedMarks(): SharedMark[] {
  return useSyncExternalStore(subscribe, () => marks, () => EMPTY);
}
