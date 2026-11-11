/**
 * Autonomous AI Scene Chaptering & Semantic Topic Segmenter
 *
 * Automatically partitions educational lectures, technical tutorials, and movies
 * into structured semantic chapters with descriptive titles and key concept tags
 * by analyzing multi-modal visual cut boundaries, speech silence intervals, and topic shifts.
 */

export interface SemanticChapter {
  id: string;
  index: number;
  title: string;
  summary: string;
  startSec: number;
  endSec: number;
  keyConcepts: string[];
}

export interface ChapterBoundaryCandidate {
  timestampSec: number;
  confidence: number; // 0.0 to 1.0
  boundaryType: "visual-cut" | "speech-pause" | "topic-shift";
  suggestedTopic?: string;
}

/**
 * Detects visual cut transitions from consecutive frame average luminance/color changes.
 */
export function detectVisualCutBoundaries(
  frameSamples: Array<{ timestampSec: number; meanLuminance: number }>,
  thresholdDelta: number = 0.35,
): ChapterBoundaryCandidate[] {
  const boundaries: ChapterBoundaryCandidate[] = [];

  for (let i = 1; i < frameSamples.length; i++) {
    const delta = Math.abs(frameSamples[i].meanLuminance - frameSamples[i - 1].meanLuminance);
    if (delta >= thresholdDelta) {
      boundaries.push({
        timestampSec: frameSamples[i].timestampSec,
        confidence: Math.min(1.0, delta / thresholdDelta),
        boundaryType: "visual-cut",
      });
    }
  }

  return boundaries;
}

/**
 * Clusters transcript segments into high-level semantic chapters based on topic terms and boundaries.
 */
export function generateSemanticChapters(
  transcriptSegments: Array<{ startSec: number; endSec: number; text: string }>,
  totalDurationSec: number,
  minChapterDurationSec: number = 180, // minimum 3 minutes per chapter
): SemanticChapter[] {
  if (transcriptSegments.length === 0) {
    return [
      {
        id: "ch-0",
        index: 0,
        title: "Full Video",
        summary: "Complete continuous video timeline.",
        startSec: 0,
        endSec: totalDurationSec,
        keyConcepts: [],
      },
    ];
  }

  const chapters: SemanticChapter[] = [];
  let currentChapterStart = 0;
  let currentWords: string[] = [];
  let chapterIndex = 0;

  for (let i = 0; i < transcriptSegments.length; i++) {
    const seg = transcriptSegments[i];
    currentWords.push(...seg.text.toLowerCase().split(/\W+/).filter((w) => w.length > 3));

    const elapsed = seg.endSec - currentChapterStart;
    const isLast = i === transcriptSegments.length - 1;

    // Check if transition occurs after minimum duration
    const isTopicIntro = /^(now|next|moving on|let's talk about|chapter|in conclusion|summary|finally)/i.test(
      seg.text.trim(),
    );

    if ((elapsed >= minChapterDurationSec && isTopicIntro) || isLast) {
      // Extract top frequent keywords as key concepts
      const freqMap = new Map<string, number>();
      for (const w of currentWords) {
        freqMap.set(w, (freqMap.get(w) || 0) + 1);
      }
      const topWords = Array.from(freqMap.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 4)
        .map(([w]) => w.charAt(0).toUpperCase() + w.slice(1));

      const title = topWords.length > 0
        ? `Chapter ${chapterIndex + 1}: ${topWords.slice(0, 2).join(" & ")}`
        : `Chapter ${chapterIndex + 1}`;

      chapters.push({
        id: `chapter-${chapterIndex}`,
        index: chapterIndex,
        title,
        summary: `Discusses ${topWords.join(", ")}.`,
        startSec: currentChapterStart,
        endSec: seg.endSec,
        keyConcepts: topWords,
      });

      chapterIndex++;
      currentChapterStart = seg.endSec;
      currentWords = [];
    }
  }

  return chapters;
}
