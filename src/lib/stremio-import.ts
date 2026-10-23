import { getUserAddonsRaw } from "@/lib/addons";
import { installFromUrl, loadInstalled } from "@/lib/addon-store";
import { runLanes } from "@/lib/run-lanes";
import { saveResumeBatch } from "@/lib/resume";
import {
  CLOUD_OK,
  episodeFromVideoId,
  library as fetchLibrary,
  login,
  logout,
  type LibraryItem,
} from "@/lib/stremio";
import { addManyToWatchlist, type WatchlistInput } from "@/lib/watchlist";

const INSTALL_LANES = 4;
const FINISHED_RATIO = 0.9;

export type ImportAddon = { transportUrl: string; id: string; name: string };

export type StremioExport = { addons: ImportAddon[]; library: LibraryItem[] };

export type ResumeImport = {
  id: string;
  ms: number;
  season?: number;
  episode?: number;
  t?: number;
  pct?: number;
};

export type ImportSelection = {
  addons: ImportAddon[];
  watchlist: boolean;
  progress: boolean;
};

export type ImportResult = {
  addonsInstalled: number;
  addonsFailed: number;
  watchlist: number;
  progress: number;
};

function str(v: unknown): string {
  return typeof v === "string" ? v : "";
}

/**
 * Reads an addon collection defensively: the api is unofficial, so a malformed
 * entry is skipped rather than failing the import.
 */
export function parseStremioAddons(raw: unknown): ImportAddon[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const out: ImportAddon[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== "object") continue;
    const e = entry as { transportUrl?: unknown; manifest?: unknown };
    const transportUrl = str(e.transportUrl).trim();
    if (!/^https?:\/\//i.test(transportUrl) || seen.has(transportUrl)) continue;
    seen.add(transportUrl);
    const manifest = (e.manifest && typeof e.manifest === "object" ? e.manifest : {}) as {
      id?: unknown;
      name?: unknown;
    };
    out.push({ transportUrl, id: str(manifest.id), name: str(manifest.name) || "Addon" });
  }
  return out;
}

/** Host only: the path of a transport url often carries the user's debrid key. */
export function addonHostLabel(transportUrl: string): string {
  try {
    return new URL(transportUrl).host;
  } catch {
    return "";
  }
}

/** Addons not already installed locally, matched by url or manifest id. */
export function newAddons(addons: ImportAddon[]): ImportAddon[] {
  const installed = loadInstalled();
  const urls = new Set(installed.map((a) => a.transportUrl));
  const ids = new Set(installed.map((a) => a.id));
  return addons.filter((a) => !urls.has(a.transportUrl) && !(a.id && ids.has(a.id)));
}

function isLive(i: LibraryItem): boolean {
  return !!i && typeof i._id === "string" && CLOUD_OK.test(i._id) && i.removed !== true;
}

/** Saved titles: Stremio marks items it only tracked from playback as `temp`. */
export function libraryToWatchlist(items: LibraryItem[]): WatchlistInput[] {
  const out: WatchlistInput[] = [];
  for (const i of items) {
    if (!isLive(i) || i.temp === true) continue;
    out.push({
      id: i._id,
      type: i.type,
      name: str(i.name),
      poster: str(i.poster) || undefined,
      imdbId: i._id.startsWith("tt") ? i._id : null,
    });
  }
  return out;
}

/** Unfinished watch positions only; a finished title must not reappear in Continue Watching. */
export function libraryToResume(items: LibraryItem[]): ResumeImport[] {
  const out: ResumeImport[] = [];
  for (const i of items) {
    if (!isLive(i) || !i.state) continue;
    const offset = Number(i.state.timeOffset);
    const duration = Number(i.state.duration);
    if (!Number.isFinite(offset) || offset <= 0) continue;
    const ratio = Number.isFinite(duration) && duration > 0 ? offset / duration : undefined;
    if (ratio !== undefined && ratio >= FINISHED_RATIO) continue;
    const vid = i.state.video_id ?? "";
    const kitsuThreeSeg = /^(kitsu|mal|anilist|anidb):/.test(i._id) && vid.split(":").length === 3;
    const se = kitsuThreeSeg ? null : episodeFromVideoId(vid);
    const season = i.state.season ?? (kitsuThreeSeg ? 1 : se?.season);
    const episode = i.state.episode ?? (kitsuThreeSeg ? Number(vid.split(":")[2]) : se?.episode);
    const seen = Date.parse(i.state.lastWatched ?? "") || Date.parse(String(i._mtime ?? ""));
    out.push({
      id: i._id,
      ms: offset,
      season,
      episode,
      ...(Number.isFinite(seen) ? { t: seen } : {}),
      ...(ratio !== undefined ? { pct: ratio } : {}),
    });
  }
  return out;
}

/**
 * Signs in once, reads the account's addons and library, and signs the session
 * out again. The password and the auth key never leave this function.
 */
export async function fetchStremioExport(email: string, password: string): Promise<StremioExport> {
  const session = await login(email.trim(), password);
  const authKey = session?.authKey;
  if (!authKey) throw new Error("Stremio did not return a session. Check your email and password.");
  try {
    const rawAddons = await getUserAddonsRaw(authKey);
    if (!rawAddons) throw new Error("Couldn't read your Stremio addons. Try again.");
    const library = await fetchLibrary(authKey);
    return {
      addons: parseStremioAddons(rawAddons),
      library: Array.isArray(library) ? library : [],
    };
  } finally {
    await logout(authKey).catch(() => {});
  }
}

export async function applyStremioImport(sel: ImportSelection, exp: StremioExport): Promise<ImportResult> {
  let addonsInstalled = 0;
  let addonsFailed = 0;
  // Each manifest is fetched and validated by the normal install path before it is saved.
  await runLanes(sel.addons, INSTALL_LANES, async (a) => {
    try {
      await installFromUrl(a.transportUrl, { skipStremioSync: true });
      addonsInstalled += 1;
    } catch {
      addonsFailed += 1;
    }
  });
  const watchlist = sel.watchlist ? libraryToWatchlist(exp.library) : [];
  if (watchlist.length > 0) addManyToWatchlist(watchlist);
  const progress = sel.progress ? libraryToResume(exp.library) : [];
  if (progress.length > 0) saveResumeBatch(progress);
  return { addonsInstalled, addonsFailed, watchlist: watchlist.length, progress: progress.length };
}
