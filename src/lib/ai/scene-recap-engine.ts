/**
 * "Catch Me Up" AI Scene Recap & Anti-Spoiler Memory Engine
 *
 * Provides spoiler-free plot recaps and character relationship summaries
 * strictly constrained to the viewer's current playback timestamp.
 */

export interface NarrativeMilestone {
  id: string;
  timestampSec: number;
  headline: string;
  summary: string;
  characters: string[];
  isCrucialPlotPoint: boolean;
}

export interface CatchMeUpRecap {
  mediaId: string;
  upToTimestampSec: number;
  timecode: string;
  summaryParagraph: string;
  milestones: NarrativeMilestone[];
  knownCharacters: string[];
  spoilerGuardActive: boolean;
}

export interface EpisodicRecap {
  seriesId: string;
  seasonNumber: number;
  episodeNumber: number;
  storySoFarBullets: string[];
  keyCharacterStatus: Record<string, string>;
}

export class SceneRecapManager {
  private mediaMilestones = new Map<string, NarrativeMilestone[]>();
  private seriesRecaps = new Map<string, EpisodicRecap[]>();

  public registerMilestones(mediaId: string, milestones: NarrativeMilestone[]): void {
    const sorted = [...milestones].sort((a, b) => a.timestampSec - b.timestampSec);
    this.mediaMilestones.set(mediaId, sorted);
  }

  public registerEpisodicRecaps(seriesId: string, recaps: EpisodicRecap[]): void {
    this.seriesRecaps.set(seriesId, recaps);
  }

  /**
   * Generates a strictly spoiler-safe recap of all events occurring up to currentSec.
   */
  public generateCatchMeUp(mediaId: string, currentSec: number): CatchMeUpRecap {
    const all = this.mediaMilestones.get(mediaId) ?? [];
    // Strict Anti-Spoiler Filter: NEVER include anything past currentSec
    const pastMilestones = all.filter((m) => m.timestampSec <= currentSec);

    const charactersSet = new Set<string>();
    for (const m of pastMilestones) {
      for (const char of m.characters) {
        charactersSet.add(char);
      }
    }

    const m = Math.floor(currentSec / 60);
    const s = Math.floor(currentSec % 60);
    const timecode = `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;

    let summary = "";
    if (pastMilestones.length === 0) {
      summary = `The story has just begun at [${timecode}]. No major events have unfolded yet.`;
    } else {
      summary = pastMilestones
        .filter((p) => p.isCrucialPlotPoint)
        .map((p) => p.summary)
        .join(" ");
      if (!summary) {
        summary = pastMilestones.map((p) => p.summary).join(" ");
      }
    }

    return {
      mediaId,
      upToTimestampSec: currentSec,
      timecode,
      summaryParagraph: summary,
      milestones: pastMilestones,
      knownCharacters: Array.from(charactersSet),
      spoilerGuardActive: true,
    };
  }

  /**
   * Retrieves previous episode recaps to generate a "The Story So Far" montage.
   */
  public getStorySoFar(
    seriesId: string,
    season: number,
    episode: number,
  ): EpisodicRecap | null {
    const list = this.seriesRecaps.get(seriesId) ?? [];
    // Find recap for the immediate previous episode
    const prev = list.find((r) => r.seasonNumber === season && r.episodeNumber === episode - 1);
    return prev ?? null;
  }
}

export const globalSceneRecapManager = new SceneRecapManager();
