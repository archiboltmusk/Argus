/**
 * Neural Audio Novel & Multi-Character Voice Synthesizer for Argus Books
 *
 * Deconstructs book prose into expressive audio performance:
 * 1. Distinguishes Narrative Prose from Character Dialogue
 * 2. Assigns Distinct Neural Voice Personas (Narrator, Protagonist, Antagonist)
 * 3. Formats synthesis jobs with pacing and emotional inflection cues
 */

export interface SpeechSegment {
  speakerRole: "narrator" | "protagonist" | "antagonist" | "companion";
  speakerName: string;
  voiceId: string;
  text: string;
  estimatedDurationSec: number;
  pitchMultiplier: number;
  rateMultiplier: number;
}

export interface AudioNovelChapterScript {
  bookTitle: string;
  chapterIndex: number;
  totalDurationSeconds: number;
  segments: SpeechSegment[];
}

export class NeuralAudioNovel {
  private static instance: NeuralAudioNovel;

  public static getInstance(): NeuralAudioNovel {
    if (!NeuralAudioNovel.instance) {
      NeuralAudioNovel.instance = new NeuralAudioNovel();
    }
    return NeuralAudioNovel.instance;
  }

  /**
   * Parse chapter text into attributed spoken segments
   */
  public generateScriptFromText(
    text: string,
    bookTitle = "Indic Classic",
    chapterIndex = 1,
  ): AudioNovelChapterScript {
    const rawParagraphs = text.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
    const segments: SpeechSegment[] = [];
    let totalSec = 0;

    for (const para of rawParagraphs) {
      // Check if paragraph contains dialogue quotes (", “)
      const quoteRegex = /["“]([^"”]+)["”]/g;
      let lastIdx = 0;
      let match;

      while ((match = quoteRegex.exec(para)) !== null) {
        // Prose before quote (Narrator)
        const narrativePre = para.slice(lastIdx, match.index).trim();
        if (narrativePre) {
          const dur = this.estimateDuration(narrativePre, 1.0);
          segments.push({
            speakerRole: "narrator",
            speakerName: "Narrator",
            voiceId: "voice-narrator-bengal-deep",
            text: narrativePre,
            estimatedDurationSec: dur,
            pitchMultiplier: 1.0,
            rateMultiplier: 1.0,
          });
          totalSec += dur;
        }

        // Spoken dialogue
        const dialogue = match[1].trim();
        if (dialogue) {
          const isQuestion = dialogue.includes("?");
          const isExclamation = dialogue.includes("!");
          const dur = this.estimateDuration(dialogue, 1.1);

          segments.push({
            speakerRole: isQuestion ? "companion" : "protagonist",
            speakerName: isQuestion ? "Topshe" : "Prodosh Mitter",
            voiceId: isQuestion ? "voice-young-curious" : "voice-baritone-sharp",
            text: dialogue,
            estimatedDurationSec: dur,
            pitchMultiplier: isQuestion ? 1.15 : isExclamation ? 1.08 : 1.0,
            rateMultiplier: 1.05,
          });
          totalSec += dur;
        }

        lastIdx = match.index + match[0].length;
      }

      // Remaining prose after last quote
      const narrativePost = para.slice(lastIdx).trim();
      if (narrativePost) {
        const dur = this.estimateDuration(narrativePost, 1.0);
        segments.push({
          speakerRole: "narrator",
          speakerName: "Narrator",
          voiceId: "voice-narrator-bengal-deep",
          text: narrativePost,
          estimatedDurationSec: dur,
          pitchMultiplier: 1.0,
          rateMultiplier: 1.0,
        });
        totalSec += dur;
      }
    }

    return {
      bookTitle,
      chapterIndex,
      totalDurationSeconds: Math.round(totalSec),
      segments,
    };
  }

  private estimateDuration(text: string, rate: number): number {
    const words = text.split(/\s+/).length;
    // Standard speaking rate: 150 words per minute (2.5 words per sec)
    return Math.max(1, Math.round((words / (2.5 * rate)) * 10) / 10);
  }
}
