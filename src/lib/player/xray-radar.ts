/**
 * X-Ray Cast & Soundtrack Radar (Instant Scene Metadata)
 *
 * Provides real-time scene context: actors currently on screen, background OST
 * tracks with Spotify/Apple Music deep links, and verified film trivia.
 */

export interface XRayActor {
  id: string;
  name: string;
  character: string;
  avatarUrl?: string;
  imdbId?: string;
}

export interface XRayMusic {
  id: string;
  title: string;
  artist: string;
  album?: string;
  coverUrl?: string;
  spotifyUrl?: string;
  appleMusicUrl?: string;
  startSec: number;
  endSec: number;
}

export interface XRayTrivia {
  id: string;
  text: string;
  category: "behind_the_scenes" | "cameo" | "soundtrack" | "continuity";
}

export interface XRayScene {
  startSec: number;
  endSec: number;
  actors: XRayActor[];
  music?: XRayMusic;
  trivia?: XRayTrivia[];
}

export interface XRayTimeline {
  mediaId: string;
  title: string;
  scenes: XRayScene[];
  allCast: XRayActor[];
}

export interface ActiveXRayState {
  hasData: boolean;
  activeScene: XRayScene | null;
  actorsOnScreen: XRayActor[];
  currentTrack: XRayMusic | null;
  activeTrivia: XRayTrivia[];
  totalCastCount: number;
}

/**
 * Finds the scene matching the current video playback position.
 */
export function getActiveScene(
  timeline: XRayTimeline | null,
  currentTimeSec: number,
): XRayScene | null {
  if (!timeline || !timeline.scenes || timeline.scenes.length === 0) return null;

  return (
    timeline.scenes.find(
      (s) => currentTimeSec >= s.startSec && currentTimeSec < s.endSec,
    ) ?? null
  );
}

/**
 * Evaluates the full X-Ray radar state for a given playback position.
 */
export function evaluateXRayRadar(
  timeline: XRayTimeline | null,
  currentTimeSec: number,
): ActiveXRayState {
  if (!timeline) {
    return {
      hasData: false,
      activeScene: null,
      actorsOnScreen: [],
      currentTrack: null,
      activeTrivia: [],
      totalCastCount: 0,
    };
  }

  const activeScene = getActiveScene(timeline, currentTimeSec);

  // If a specific scene is matched, use its actors; otherwise fallback to top billed cast
  const actorsOnScreen = activeScene ? activeScene.actors : timeline.allCast.slice(0, 5);

  let currentTrack: XRayMusic | null = null;
  if (activeScene?.music) {
    currentTrack = activeScene.music;
  } else if (timeline.scenes) {
    // Check if any music cue overlaps currentTimeSec
    for (const s of timeline.scenes) {
      if (s.music && currentTimeSec >= s.music.startSec && currentTimeSec <= s.music.endSec) {
        currentTrack = s.music;
        break;
      }
    }
  }

  const activeTrivia = activeScene?.trivia ?? [];

  return {
    hasData: true,
    activeScene,
    actorsOnScreen,
    currentTrack,
    activeTrivia,
    totalCastCount: timeline.allCast.length,
  };
}
