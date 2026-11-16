/**
 * Argus Highlight Reel Engine
 *
 * Allows viewers to mark, annotate, and revisit 15–45 second cinematic moments
 * ("why this part is good"), introducing human taste signals into the media library.
 *
 * Stores moments locally with zero telemetry, and allows export/sharing
 * across P2P Couch Cinema rooms or local export.
 */

export interface HighlightClip {
  id: string;
  mediaId: string;
  title: string;
  startSec: number;
  endSec: number;
  note: string; // The user's reflection on why this moment matters
  capturedAtEpochMs: number;
  thumbnailUrl?: string;
  tags?: string[];
}

const STORAGE_KEY = "argus.highlight_reel.clips";

export class HighlightReelManager {
  private clips: Map<string, HighlightClip> = new Map();

  constructor() {
    this.load();
  }

  private load(): void {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const list = JSON.parse(raw) as HighlightClip[];
        for (const c of list) {
          this.clips.set(c.id, c);
        }
      }
    } catch {}
  }

  private persist(): void {
    try {
      const list = Array.from(this.clips.values());
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    } catch {}
  }

  public saveClip(clip: Omit<HighlightClip, "id" | "capturedAtEpochMs">): HighlightClip {
    const newClip: HighlightClip = {
      ...clip,
      id: `clip_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      capturedAtEpochMs: Date.now(),
    };
    this.clips.set(newClip.id, newClip);
    this.persist();
    return newClip;
  }

  public getClipsForMedia(mediaId: string): HighlightClip[] {
    return Array.from(this.clips.values())
      .filter((c) => c.mediaId === mediaId)
      .sort((a, b) => a.startSec - b.startSec);
  }

  public getAllClips(): HighlightClip[] {
    return Array.from(this.clips.values()).sort((a, b) => b.capturedAtEpochMs - a.capturedAtEpochMs);
  }

  public deleteClip(clipId: string): boolean {
    const deleted = this.clips.delete(clipId);
    if (deleted) this.persist();
    return deleted;
  }

  public exportJson(): string {
    return JSON.stringify(Array.from(this.clips.values()), null, 2);
  }
}

export const highlightReel = new HighlightReelManager();
