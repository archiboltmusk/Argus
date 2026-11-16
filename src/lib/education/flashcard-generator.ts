/**
 * Argus Spaced Repetition & Flashcard Generator
 * Automatically creates active recall cards with KaTeX math rendering
 * from Scratchpad derivations, blackboard OCR captures, and lecture transcripts.
 * Implements FSRS-inspired interval calculation and Anki deck packaging.
 */

export interface DerivationStep {
  id: string;
  timestampSec: number;
  timestamp?: string;
  title?: string;
  latex?: string;
  notes?: string;
  explanation?: string;
}

export type CardRating = 1 | 2 | 3 | 4; // 1 = Again, 2 = Hard, 3 = Good, 4 = Easy

export interface Flashcard {
  id: string;
  front: string;
  back: string;
  formulaLatex?: string;
  timestampSec: number;
  timestampLabel: string;
  sourceLectureTitle: string;
  tags: string[];
  repetition: number;
  intervalDays: number;
  easeFactor: number; // default 2.5
  stability: number;  // FSRS stability (days)
  difficulty: number; // FSRS difficulty (1 - 10)
  lastReviewedAt?: number;
  nextDueAt: number;
}

export function formatTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

/**
 * Generate high-yield flashcards from Scratchpad derivations.
 */
export function generateFlashcardsFromDerivations(
  lectureTitle: string,
  derivations: DerivationStep[],
): Flashcard[] {
  const cards: Flashcard[] = [];
  const now = Date.now();

  derivations.forEach((d, idx) => {
    const cardId = `fc-${lectureTitle.toLowerCase().replace(/[^a-z0-9]/g, "-")}-${d.id}`;
    const timestampLabel = d.timestamp || formatTime(d.timestampSec);
    const expl = d.explanation || d.notes || d.title || "Mathematical derivation step";

    // Front: Context prompt + question
    const front = `In **${lectureTitle}** at [${timestampLabel}], explain the theoretical rationale and step:\n\n*${expl}*`;

    // Back: Mathematical derivation step with KaTeX formula
    const back = d.latex
      ? `**Mathematical Formulation:**\n$$${d.latex}$$\n\n**Key Takeaway:** ${expl}`
      : `**Key Concept:**\n${expl}`;

    cards.push({
      id: cardId,
      front,
      back,
      formulaLatex: d.latex,
      timestampSec: d.timestampSec,
      timestampLabel,
      sourceLectureTitle: lectureTitle,
      tags: ["Argus-Masterclass", lectureTitle.split(":")[0]?.trim() || "Courseware", `Step-${idx + 1}`],
      repetition: 0,
      intervalDays: 1,
      easeFactor: 2.5,
      stability: 1.0,
      difficulty: 5.0,
      nextDueAt: now,
    });
  });

  return cards;
}

/**
 * Updates card memory state using an FSRS-inspired algorithm.
 */
export function reviewFlashcard(card: Flashcard, rating: CardRating): Flashcard {
  const now = Date.now();
  let { repetition, intervalDays, easeFactor, stability, difficulty } = card;

  // Rating effect on Ease Factor / Difficulty
  switch (rating) {
    case 1: // Again (Lapse)
      repetition = 0;
      intervalDays = 1;
      difficulty = Math.min(10, difficulty + 1.0);
      stability = Math.max(0.4, stability * 0.5);
      easeFactor = Math.max(1.3, easeFactor - 0.2);
      break;

    case 2: // Hard
      repetition += 1;
      intervalDays = Math.max(1, Math.round(intervalDays * 1.2));
      difficulty = Math.min(10, difficulty + 0.3);
      stability = stability * 1.2;
      easeFactor = Math.max(1.3, easeFactor - 0.15);
      break;

    case 3: // Good
      repetition += 1;
      if (repetition === 1) {
        intervalDays = 1;
      } else if (repetition === 2) {
        intervalDays = 3;
      } else {
        intervalDays = Math.round(intervalDays * easeFactor);
      }
      stability = stability * 2.0;
      break;

    case 4: // Easy
      repetition += 1;
      if (repetition === 1) {
        intervalDays = 3;
      } else if (repetition === 2) {
        intervalDays = 7;
      } else {
        intervalDays = Math.round(intervalDays * easeFactor * 1.3);
      }
      difficulty = Math.max(1, difficulty - 0.5);
      stability = stability * 2.8;
      easeFactor += 0.15;
      break;
  }

  const nextDueAt = now + intervalDays * 24 * 60 * 60 * 1000;

  return {
    ...card,
    repetition,
    intervalDays,
    easeFactor: Math.round(easeFactor * 100) / 100,
    stability: Math.round(stability * 100) / 100,
    difficulty: Math.round(difficulty * 100) / 100,
    lastReviewedAt: now,
    nextDueAt,
  };
}

/**
 * Exports cards to an Anki importable tab-separated text format with HTML & KaTeX math wrappers.
 */
export function exportFlashcardsToAnkiText(
  deckName: string,
  cards: readonly Flashcard[],
): { filename: string; textData: string } {
  const safeDeckName = deckName.replace(/["\t\r\n]/g, " ").trim() || "Argus Masterclass Recall";
  const header = [
    "#separator:tab",
    "#html:true",
    `#deck:${safeDeckName}`,
    "#notetype:Argus Academic Recall",
    "#tags column:3",
  ];

  const rows = cards.map((c) => {
    const frontHtml = `<div style="font-family: system-ui, sans-serif; font-size: 15px;">` +
      `<div style="font-size: 11px; color: #f59e0b; font-weight: 600; text-transform: uppercase; margin-bottom: 6px;">${escapeHtml(c.sourceLectureTitle)} &bull; ${escapeHtml(c.timestampLabel)}</div>` +
      `<div>${escapeHtml(c.front).replace(/\n/g, "<br/>")}</div>` +
      `</div>`;

    let backHtml = `<div style="font-family: system-ui, sans-serif; font-size: 15px; margin-top: 10px;">` +
      `<div>${escapeHtml(c.back).replace(/\n/g, "<br/>")}</div>`;

    if (c.formulaLatex) {
      backHtml += `<div style="margin-top: 12px; padding: 10px; background: #0f111a; border-radius: 6px; color: #34d399; font-family: 'KaTeX_Math', monospace;">\\[${escapeHtml(c.formulaLatex)}\\]</div>`;
    }

    backHtml += `</div>`;

    const tagsStr = c.tags.map((t) => t.replace(/\s+/g, "_")).join(" ");
    return `${frontHtml}\t${backHtml}\t${tagsStr}`;
  });

  const textData = [...header, ...rows].join("\n");
  const filename = `${safeDeckName.toLowerCase().replace(/[^a-z0-9]/g, "-")}-anki.txt`;

  return { filename, textData };
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
