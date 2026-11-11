/**
 * Spaced Repetition (Anki SRS) Sentence Miner & Flashcard Generator
 *
 * Mines subtitle sentences, pronunciation audio snippets, and scene screenshots
 * directly into Anki-compatible spaced repetition flashcard decks with SM-2 scheduling.
 */

export interface AnkiFlashcard {
  id: string;
  mediaTitle: string;
  sourceText: string;
  translatedText: string;
  timecode: string;
  audioStartSec: number;
  audioEndSec: number;
  snapshotDataUrl?: string;
  notes?: string;
  repetitionCount: number;
  intervalDays: number;
  easeFactor: number; // default: 2.5
}

/**
 * SuperMemo SM-2 Spaced Repetition Algorithm.
 * Updates interval and ease factor based on user recall grade (0 = complete blackout to 5 = perfect recall).
 */
export function calculateNextSm2Interval(
  card: AnkiFlashcard,
  grade: 0 | 1 | 2 | 3 | 4 | 5,
): { intervalDays: number; easeFactor: number; repetitionCount: number } {
  let { intervalDays, easeFactor, repetitionCount } = card;

  if (grade >= 3) {
    if (repetitionCount === 0) {
      intervalDays = 1;
    } else if (repetitionCount === 1) {
      intervalDays = 6;
    } else {
      intervalDays = Math.round(intervalDays * easeFactor);
    }
    repetitionCount++;
  } else {
    repetitionCount = 0;
    intervalDays = 1;
  }

  // Update ease factor: EF' = EF + (0.1 - (5 - grade) * (0.08 + (5 - grade) * 0.02))
  easeFactor = easeFactor + (0.1 - (5 - grade) * (0.08 + (5 - grade) * 0.02));
  easeFactor = Math.max(1.3, Math.round(easeFactor * 100) / 100);

  return { intervalDays, easeFactor, repetitionCount };
}

/**
 * Creates an Anki flashcard from an active video scene subtitle line.
 */
export function createFlashcardFromSubtitle(
  mediaTitle: string,
  sourceText: string,
  translatedText: string,
  audioStartSec: number,
  audioEndSec: number,
  snapshotDataUrl?: string,
  notes?: string,
): AnkiFlashcard {
  const m = Math.floor(audioStartSec / 60);
  const s = Math.floor(audioStartSec % 60);
  const timecode = `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;

  return {
    id: `anki-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    mediaTitle,
    sourceText: sourceText.trim(),
    translatedText: translatedText.trim(),
    timecode,
    audioStartSec,
    audioEndSec,
    snapshotDataUrl,
    notes,
    repetitionCount: 0,
    intervalDays: 1,
    easeFactor: 2.5,
  };
}

/**
 * Exports cards to standard Anki TSV format (Front, Back, Context, Tags).
 */
export function exportCardsToAnkiTsv(cards: AnkiFlashcard[]): string {
  const lines: string[] = ["#separator:tab", "#html:true", "#tags column:4"];

  for (const card of cards) {
    const front = card.sourceText.replace(/\t/g, " ");
    const back = `${card.translatedText.replace(/\t/g, " ")}${card.notes ? `<br><small>${card.notes}</small>` : ""}`;
    const context = `[${card.mediaTitle} @ ${card.timecode}]`;
    const tag = `argus::${card.mediaTitle.replace(/\W+/g, "_").toLowerCase()}`;

    lines.push(`${front}\t${back}\t${context}\t${tag}`);
  }

  return lines.join("\n");
}
