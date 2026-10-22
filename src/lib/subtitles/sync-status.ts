import { useSyncExternalStore } from "react";

export type SyncStatus = "idle" | "analyzing" | "synced" | "declined" | "error";

let status: SyncStatus = "idle";
const listeners = new Set<() => void>();

export function setSyncStatus(next: SyncStatus): void {
  if (status === next) return;
  status = next;
  for (const l of listeners) l();
}

export function useSyncStatus(): SyncStatus {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => status,
    () => status,
  );
}
