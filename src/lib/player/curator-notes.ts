/**
 * Cross-Medium Curator Notes & Director Study Guides
 * Provides timed, non-intrusive annotations exploring camera techniques,
 * historical context, and directorial choices without exposing spoilers.
 */

export interface CuratorNote {
  id: string;
  startSec: number;
  endSec: number;
  category: "directorial-craft" | "historical-context" | "cinematography" | "thematic-motif";
  headline: string;
  body: string;
  directorQuote?: string;
}

export class CuratorNotesEngine {
  private notes: CuratorNote[] = [];

  constructor(initialNotes: CuratorNote[] = []) {
    this.notes = [...initialNotes].sort((a, b) => a.startSec - b.startSec);
  }

  public setNotes(notes: CuratorNote[]) {
    this.notes = [...notes].sort((a, b) => a.startSec - b.startSec);
  }

  /**
   * Retrieves any curator annotations active at the current playhead timestamp.
   */
  public getActiveNotes(currentSec: number): CuratorNote[] {
    return this.notes.filter((n) => currentSec >= n.startSec && currentSec <= n.endSec);
  }

  /**
   * Generates sample contextual notes for standard film study demonstration.
   */
  public static createSampleStudyGuide(durationSec: number): CuratorNote[] {
    const safeDur = Math.max(300, durationSec);

    return [
      {
        id: "note-1",
        startSec: 30,
        endSec: 90,
        category: "cinematography",
        headline: "Visual Framing & Aspect Ratio",
        body: "Notice the tight 1.37:1 Academy aspect ratio utilized to emphasize claustrophobia and psychological confinement.",
      },
      {
        id: "note-2",
        startSec: Math.round(safeDur * 0.40),
        endSec: Math.round(safeDur * 0.40) + 60,
        category: "directorial-craft",
        headline: "Unbroken Long Take",
        body: "Filmed in a continuous 4-minute steadicam sequence without cuts to maintain uninterrupted emotional tension.",
        directorQuote: "A cut is always an emotional interruption; avoid it until the tension demands release.",
      },
      {
        id: "note-3",
        startSec: Math.round(safeDur * 0.75),
        endSec: Math.round(safeDur * 0.75) + 60,
        category: "thematic-motif",
        headline: "Thematic Color Shift",
        body: "The recurring amber and green tinting symbolizes the protagonist's transition from innocence to moral ambiguity.",
      },
    ];
  }
}
