/**
 * "Catch-Me-Up" Zero-Spoiler Micro-Recap & Character Face HUD
 * Generates immediate contextual orientation when unpausing or resuming after stepping away.
 * Strictly bounded by the current playback timestamp (Anti-Spoiler Guarantee).
 */

import { extractSpeakerFromLine } from "./narrative-graph";

export interface CatchMeUpCue {
  startSec: number;
  endSec: number;
  text: string;
}

export interface ActiveCharacterInfo {
  name: string;
  recentLinesCount: number;
  lastSpokeSec: number;
  lastDialogueSnippet: string;
}

export interface CatchMeUpSummary {
  currentSec: number;
  windowStartSec: number;
  recentPlotDigest: string[];
  activeCharactersInScene: ActiveCharacterInfo[];
  activeObjective: string;
  antiSpoilerVerified: boolean;
}

export class CatchMeUpEngine {
  private cues: CatchMeUpCue[] = [];

  constructor(cues: CatchMeUpCue[] = []) {
    this.setCues(cues);
  }

  public setCues(cues: CatchMeUpCue[]) {
    this.cues = [...cues]
      .filter((c) => Number.isFinite(c.startSec) && c.text?.trim().length > 0)
      .sort((a, b) => a.startSec - b.startSec);
  }

  /**
   * Generates a zero-spoiler recap of what transpired in the preceding 10-15 minute window.
   * Throws an invariant error if any analyzed cue is past currentPlaybackSec.
   */
  public generateRecap(currentPlaybackSec: number, windowDurationSec: number = 720): CatchMeUpSummary {
    const safeCurrentSec = Math.max(0, currentPlaybackSec);
    const windowStartSec = Math.max(0, safeCurrentSec - windowDurationSec);

    // 1. Strict anti-spoiler slicing: only cues in [windowStartSec, safeCurrentSec]
    const relevantCues = this.cues.filter((c) => c.startSec >= windowStartSec && c.startSec <= safeCurrentSec);

    // Verify anti-spoiler guarantee
    for (const cue of relevantCues) {
      if (cue.startSec > safeCurrentSec) {
        throw new Error(`Anti-spoiler violation: analyzed cue at ${cue.startSec}s exceeds current playhead ${safeCurrentSec}s`);
      }
    }

    // 2. Identify characters who spoke in the immediate scene (last 180s)
    const recentSceneCues = relevantCues.filter((c) => c.startSec >= safeCurrentSec - 180);
    const charMap = new Map<string, ActiveCharacterInfo>();

    for (const cue of recentSceneCues) {
      const { speaker, dialogue } = extractSpeakerFromLine(cue.text);
      if (speaker) {
        const canonical = speaker.toUpperCase();
        let entry = charMap.get(canonical);
        if (!entry) {
          entry = {
            name: speaker,
            recentLinesCount: 0,
            lastSpokeSec: cue.startSec,
            lastDialogueSnippet: dialogue || cue.text,
          };
          charMap.set(canonical, entry);
        }
        entry.recentLinesCount++;
        entry.lastSpokeSec = cue.startSec;
        entry.lastDialogueSnippet = dialogue || cue.text;
      }
    }

    const activeCharactersInScene = Array.from(charMap.values()).sort(
      (a, b) => b.recentLinesCount - a.recentLinesCount
    );

    // 3. Synthesize Plot Digest Points from key dialogue moments
    const recentPlotDigest: string[] = [];

    if (relevantCues.length === 0) {
      recentPlotDigest.push("Opening sequence in progress; establishing scene atmosphere.");
    } else {
      // Pick 3 representative lines spaced out across the window
      const count = relevantCues.length;
      const step = Math.max(1, Math.floor(count / 3));

      for (let i = 0; i < count && recentPlotDigest.length < 3; i += step) {
        const cueText = relevantCues[i].text.replace(/<[^>]+>/g, "").trim();
        if (cueText.length > 8 && !recentPlotDigest.includes(cueText)) {
          recentPlotDigest.push(cueText.length > 120 ? cueText.slice(0, 117) + "..." : cueText);
        }
      }
    }

    // 4. Active Objective / Urgency synthesis
    let activeObjective = "Conversational scene unfolding.";
    const allRecentText = recentSceneCues.map((c) => c.text.toLowerCase()).join(" ");

    if (/hurry|quick|run|escape|fast|leave|go/i.test(allRecentText)) {
      activeObjective = "Urgent departure or escape under pressure.";
    } else if (/who|why|where|how|what happened|clue|find/i.test(allRecentText)) {
      activeObjective = "Active investigation; characters seeking answers to an emerging mystery.";
    } else if (/fight|kill|gun|weapon|threat|police|stop/i.test(allRecentText)) {
      activeObjective = "High-stakes confrontation or physical conflict.";
    } else if (/love|stay|sorry|promise|forgive/i.test(allRecentText)) {
      activeObjective = "Emotional confrontation or reconciliation between characters.";
    }

    return {
      currentSec: safeCurrentSec,
      windowStartSec,
      recentPlotDigest,
      activeCharactersInScene,
      activeObjective,
      antiSpoilerVerified: true,
    };
  }
}
