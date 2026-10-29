/**
 * Smart Highlight Reel Synthesizer for Cricket & Sports
 *
 * Translates ball-by-ball sports events (wickets, boundaries, milestones, DRS drama)
 * into smart chapter markers on the player timeline, enabling instant jump-to-event
 * or uninterrupted continuous highlights playback (auto-skipping dot balls and delays).
 */

export type SportsEventType = "wicket" | "six" | "four" | "fifty" | "century" | "drs_review" | "catch";

export interface HighlightMarker {
  id: string;
  type: SportsEventType;
  title: string;
  description: string;
  startSec: number;
  endSec: number;
  importance: number; // 1 - 5 stars
  player?: string;
  team?: string;
}

export interface HighlightReelConfig {
  minimumImportance: number; // e.g. 3 = only 6s, wickets, milestones
  preRollSec: number; // e.g. 12s before delivery
  postRollSec: number; // e.g. 10s after delivery/celebration
}

export const DEFAULT_HIGHLIGHT_CONFIG: HighlightReelConfig = {
  minimumImportance: 3,
  preRollSec: 12,
  postRollSec: 10,
};

/**
 * Parses raw ball telemetry into structured highlight segments.
 */
export function buildCricketHighlightMarkers(
  events: Array<{
    timestampSec: number;
    ballStr: string;
    description: string;
    isWicket?: boolean;
    runs?: number;
    player?: string;
    team?: string;
  }>,
  config: HighlightReelConfig = DEFAULT_HIGHLIGHT_CONFIG,
): HighlightMarker[] {
  const markers: HighlightMarker[] = [];

  for (let i = 0; i < events.length; i++) {
    const e = events[i];
    let type: SportsEventType | null = null;
    let importance = 1;
    let title = "";

    if (e.isWicket) {
      type = "wicket";
      importance = 5;
      title = `Wicket! (${e.ballStr})`;
    } else if (e.runs === 6) {
      type = "six";
      importance = 4;
      title = `SIX! Huge hit (${e.ballStr})`;
    } else if (e.runs === 4) {
      type = "four";
      importance = 3;
      title = `FOUR! Boundary (${e.ballStr})`;
    }

    if (type && importance >= config.minimumImportance) {
      markers.push({
        id: `hl_${e.ballStr}_${i}`,
        type,
        title,
        description: e.description,
        startSec: Math.max(0, e.timestampSec - config.preRollSec),
        endSec: e.timestampSec + config.postRollSec,
        importance,
        player: e.player,
        team: e.team,
      });
    }
  }

  return markers.sort((a, b) => a.startSec - b.startSec);
}

/**
 * Determines whether the current playback head should skip forward to the next highlight event.
 */
export function getNextHighlightJump(
  currentSec: number,
  markers: HighlightMarker[],
): { shouldJump: boolean; jumpToSec: number | null; marker: HighlightMarker | null } {
  // Check if current playback is inside any highlight marker
  const inside = markers.find((m) => currentSec >= m.startSec && currentSec <= m.endSec);
  if (inside) {
    return { shouldJump: false, jumpToSec: null, marker: inside };
  }

  // Find the next upcoming marker
  const upcoming = markers.find((m) => m.startSec > currentSec);
  if (upcoming) {
    return { shouldJump: true, jumpToSec: upcoming.startSec, marker: upcoming };
  }

  return { shouldJump: false, jumpToSec: null, marker: null };
}
