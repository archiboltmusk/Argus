/**
 * Spoiler Shield (Episode Thumbnail & Synopsis Blurring)
 *
 * Protects viewers from accidental plot reveals by intelligently applying
 * frosted-glass blur to thumbnails and redacting synopses for unwatched upcoming episodes.
 */

export interface SpoilerShieldSettings {
  enabled: boolean;
  blurThumbnails: boolean;
  redactSynopses: boolean;
  allowPeekOnHover: boolean;
}

const STORAGE_SETTINGS_KEY = "argus.spoiler_shield.settings.v1";
const revealedEpisodeKeys = new Set<string>();

const DEFAULT_SETTINGS: SpoilerShieldSettings = {
  enabled: true,
  blurThumbnails: true,
  redactSynopses: true,
  allowPeekOnHover: true,
};

let settingsCache: SpoilerShieldSettings | null = null;

export function getSpoilerShieldSettings(): SpoilerShieldSettings {
  if (settingsCache) return settingsCache;
  try {
    const raw = localStorage.getItem(STORAGE_SETTINGS_KEY);
    settingsCache = raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : { ...DEFAULT_SETTINGS };
  } catch {
    settingsCache = { ...DEFAULT_SETTINGS };
  }
  return settingsCache ?? DEFAULT_SETTINGS;
}

export function updateSpoilerShieldSettings(
  patch: Partial<SpoilerShieldSettings>,
): SpoilerShieldSettings {
  const current = getSpoilerShieldSettings();
  settingsCache = { ...current, ...patch };
  try {
    localStorage.setItem(STORAGE_SETTINGS_KEY, JSON.stringify(settingsCache));
  } catch {}
  return settingsCache;
}

/**
 * Checks whether an episode should have its thumbnail and synopsis blurred.
 * An episode is considered a spoiler if it is strictly greater than the user's
 * current watch frontier (highest watched episode + 1).
 */
export function isEpisodeSpoiler(params: {
  seriesId: string;
  season: number;
  episode: number;
  highestWatchedSeason?: number;
  highestWatchedEpisode?: number;
}): boolean {
  const settings = getSpoilerShieldSettings();
  if (!settings.enabled) return false;

  const key = `${params.seriesId}:s${params.season}:e${params.episode}`;
  if (revealedEpisodeKeys.has(key)) return false;

  const currentS = params.highestWatchedSeason ?? 0;
  const currentE = params.highestWatchedEpisode ?? 0;

  // If user hasn't started the show, episode 1 is the next up (not spoiled)
  if (currentS === 0 && currentE === 0) {
    return params.season > 1 || params.episode > 1;
  }

  if (params.season > currentS) return true;
  if (params.season === currentS && params.episode > currentE + 1) return true;

  return false;
}

/**
 * Manually reveals a blurred episode (persisted until next full refresh).
 */
export function revealSpoiler(seriesId: string, season: number, episode: number): void {
  revealedEpisodeKeys.add(`${seriesId}:s${season}:e${episode}`);
}

export function resetRevealedSpoilers(): void {
  revealedEpisodeKeys.clear();
}

/**
 * Redacts synopsis text if spoiler shield is active for this episode.
 */
export function formatSynopsisWithShield(
  synopsis: string,
  isSpoiler: boolean,
): { text: string; isRedacted: boolean } {
  const settings = getSpoilerShieldSettings();
  if (settings.enabled && settings.redactSynopses && isSpoiler) {
    return {
      text: "Synopsis hidden to prevent spoilers. Click to reveal.",
      isRedacted: true,
    };
  }

  return { text: synopsis, isRedacted: false };
}
