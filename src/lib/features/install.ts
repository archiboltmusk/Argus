import { invoke } from "@tauri-apps/api/core";
import { useMemo, useSyncExternalStore } from "react";
import { useSettings } from "@/lib/settings";

export type InstallFeatureKey = "plugins" | "games" | "music" | "ebook" | "manga";
export type InstallFeatures = Record<InstallFeatureKey, boolean>;

/** The Games module (user-added download-source catalogs and file-host automation) is not
 * shipped in this build; re-enable only after legal review. */
export const GAMES_SHIPPED = false;

const ALL_ON: InstallFeatures = {
  plugins: true,
  games: GAMES_SHIPPED,
  music: true,
  ebook: true,
  manga: true,
};

let snapshot: InstallFeatures = ALL_ON;
let loading: Promise<void> | null = null;
const listeners = new Set<() => void>();

export async function readInstallFeatures(): Promise<InstallFeatures> {
  const value = await invoke<Partial<InstallFeatures>>("install_features");
  return { ...ALL_ON, ...value, games: GAMES_SHIPPED };
}

export function getInstallFeatures(): InstallFeatures {
  ensureLoaded();
  return snapshot;
}

function publish(next: InstallFeatures) {
  snapshot = next;
  listeners.forEach((listener) => listener());
}

/** One read per session. A missing marker (dev builds, NSIS installs, other platforms) keeps
 * every feature on, so gating only ever removes what the installer was told to remove. */
function ensureLoaded() {
  if (loading) return;
  loading = readInstallFeatures()
    .then(publish)
    .catch(() => {
      loading = null; // web preview or an older build: let the next mount try again
    });
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  ensureLoaded();
  return () => {
    listeners.delete(listener);
  };
}

/** The installer's choice, narrowed further by the module toggles in Settings. */
export function useInstallFeatures(): InstallFeatures {
  const installed = useSyncExternalStore(subscribe, () => snapshot, () => ALL_ON);
  const { settings } = useSettings();
  return useMemo(
    () => ({
      ...installed,
      games: GAMES_SHIPPED && installed.games && settings.gamesEnabled,
      music: installed.music && settings.musicEnabled,
      ebook: installed.ebook && settings.ebookEnabled,
    }),
    [installed, settings.gamesEnabled, settings.musicEnabled, settings.ebookEnabled],
  );
}
