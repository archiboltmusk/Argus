/**
 * Scene Soundtrack Radar & Music Bridge
 *
 * Identifies background music and score tracks playing in media scenes,
 * provides deep-link dispatchers for Spotify, Apple Music, and YouTube Music,
 * and maintains timestamped soundtrack listings for movies and episodes.
 */

export interface SoundtrackTrack {
  id: string;
  title: string;
  artist: string;
  album?: string;
  albumArtUrl?: string;
  sceneTimeStartSec: number;
  sceneTimeEndSec: number;
  spotifyUri?: string;
  appleMusicUrl?: string;
  youtubeSearchUrl?: string;
  confidence: number; // 0.0 to 1.0
}

export interface SoundtrackRadarConfig {
  enabled: boolean;
  autoDisplayBadge: boolean;
  badgeDurationSec: number;
  preferredStreamingService: "spotify" | "apple-music" | "youtube";
}

const STORAGE_KEY = "argus.soundtrack.radar.v1";

const DEFAULT_CONFIG: SoundtrackRadarConfig = {
  enabled: true,
  autoDisplayBadge: true,
  badgeDurationSec: 8,
  preferredStreamingService: "spotify",
};

let configCache: SoundtrackRadarConfig | null = null;
const listeners = new Set<(track: SoundtrackTrack | null) => void>();
let activeTrack: SoundtrackTrack | null = null;

export function getSoundtrackRadarConfig(): SoundtrackRadarConfig {
  if (configCache) return configCache;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    configCache = raw ? { ...DEFAULT_CONFIG, ...JSON.parse(raw) } : { ...DEFAULT_CONFIG };
  } catch {
    configCache = { ...DEFAULT_CONFIG };
  }
  return configCache ?? DEFAULT_CONFIG;
}

export function updateSoundtrackRadarConfig(
  patch: Partial<SoundtrackRadarConfig>,
): SoundtrackRadarConfig {
  const current = getSoundtrackRadarConfig();
  configCache = { ...current, ...patch };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(configCache));
  } catch {}
  return configCache;
}

export function subscribeSoundtrackRadar(
  fn: (track: SoundtrackTrack | null) => void,
): () => void {
  listeners.add(fn);
  fn(activeTrack);
  return () => {
    listeners.delete(fn);
  };
}

/**
 * Builds search/deep-link URLs for external music services.
 */
export function buildMusicServiceUrls(title: string, artist: string): {
  spotifySearchUrl: string;
  appleMusicSearchUrl: string;
  youtubeMusicSearchUrl: string;
} {
  const query = encodeURIComponent(`${title} ${artist}`.trim());
  return {
    spotifySearchUrl: `https://open.spotify.com/search/${query}`,
    appleMusicSearchUrl: `https://music.apple.com/us/search?term=${query}`,
    youtubeMusicSearchUrl: `https://music.youtube.com/search?q=${query}`,
  };
}

/**
 * Registry holding scene soundtracks for media titles.
 */
export class MediaSoundtrackRegistry {
  private mediaTracks = new Map<string, SoundtrackTrack[]>();

  public registerTracks(mediaId: string, tracks: SoundtrackTrack[]): void {
    const sorted = [...tracks].sort((a, b) => a.sceneTimeStartSec - b.sceneTimeStartSec);
    this.mediaTracks.set(mediaId, sorted);
  }

  public getTracks(mediaId: string): SoundtrackTrack[] {
    return this.mediaTracks.get(mediaId) ?? [];
  }

  /**
   * Finds the song currently playing at the given playback position in seconds.
   */
  public findTrackAtPosition(mediaId: string, positionSec: number): SoundtrackTrack | null {
    const list = this.getTracks(mediaId);
    for (const track of list) {
      if (positionSec >= track.sceneTimeStartSec && positionSec <= track.sceneTimeEndSec) {
        return track;
      }
    }
    return null;
  }

  /**
   * Updates playback position and triggers reactive notifications when songs change.
   */
  public evaluatePlaybackPosition(mediaId: string, positionSec: number): SoundtrackTrack | null {
    const match = this.findTrackAtPosition(mediaId, positionSec);
    if (match?.id !== activeTrack?.id) {
      activeTrack = match;
      for (const fn of listeners) {
        try {
          fn(activeTrack);
        } catch {}
      }
    }
    return activeTrack;
  }

  public clear(): void {
    this.mediaTracks.clear();
    activeTrack = null;
  }
}

export const globalSoundtrackRegistry = new MediaSoundtrackRegistry();
