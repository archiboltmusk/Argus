import { isMacDesktop, isWindowsDesktop, isLinuxDesktop } from "@/lib/platform";
import { safeFetch } from "@/lib/safe-fetch";

import { githubReleaseHistory } from "./release-history";

const INDEX_URL = "https://github.com/archiboltmusk/Argus/releases/latest/download/versions.json";

export type VersionEntry = {
  version: string;
  date?: string;
  notes?: string;
  win?: string;
  mac?: string;
  linux?: string;
  channel?: "beta" | "stable";
};

export const currentVersion = __APP_VERSION__;

let historyCache: { at: number; entries: VersionEntry[] } | null = null;

export async function fetchVersionHistory(): Promise<VersionEntry[]> {
  if (historyCache && Date.now() - historyCache.at < 10 * 60_000) return historyCache.entries;
  let list: VersionEntry[] = [];
  try {
    const res = await safeFetch(INDEX_URL, { cache: "no-store" });
    if (res.ok) {
      const data = (await res.json()) as { versions?: VersionEntry[] };
      list = Array.isArray(data.versions)
        ? data.versions.filter((v) => v && typeof v.version === "string")
        : [];
    }
  } catch {
    /* Older deployments may not publish the history index. */
  }
  if (!list.length) {
    const res = await safeFetch(
      "https://api.github.com/repos/archiboltmusk/Argus/releases?per_page=30",
      { cache: "no-store" },
    );
    if (!res.ok) throw new Error(`release history ${res.status}`);
    list = githubReleaseHistory(await res.json());
  }
  historyCache = { at: Date.now(), entries: list };
  return list;
}

export function installerUrl(entry: VersionEntry): string | null {
  if (isWindowsDesktop()) return entry.win ?? null;
  if (isMacDesktop()) return entry.mac ?? null;
  if (isLinuxDesktop()) return entry.linux ?? null;
  return null;
}
