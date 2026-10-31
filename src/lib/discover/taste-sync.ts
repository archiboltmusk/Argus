import { getStore, subscribe } from "./store";
import { mergeTaste, normalizeTaste, tasteFromAffinity, type TasteProfile } from "./taste-profile";
import { markSectionDirty } from "@/lib/profile-sync/scheduler";
import { registerSection } from "@/lib/profile-sync/sections";

const KEY = "argus.discover.cloud-taste.v1";
let cached: TasteProfile = load();

function load(): TasteProfile {
  try {
    return normalizeTaste(JSON.parse(localStorage.getItem(KEY) ?? "null"));
  } catch {
    return normalizeTaste(null);
  }
}

export function cloudTaste(): TasteProfile {
  return cached;
}

export function currentTasteForSync(): TasteProfile {
  return mergeTaste(cached, tasteFromAffinity(getStore().affinity));
}

export function mergeCloudTaste(value: unknown): void {
  save(mergeTaste(cached, value));
}

function save(value: unknown): void {
  cached = normalizeTaste(value);
  try {
    localStorage.setItem(KEY, JSON.stringify(cached));
  } catch {}
}

registerSection("taste", {
  read: () => currentTasteForSync(),
  write: (_profileId, value) => save(value),
  merge: (local, incoming) => mergeTaste(local, incoming),
});

// Queue only the compact preference summary. The sync layer never receives events.
subscribe(() => markSectionDirty("taste"));
