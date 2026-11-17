/**
 * Argus CoreBTR AIR < 100 Rank Maximization Engine
 *
 * Engineered to eliminate the 50-mark gap between Rank 2,500 and Top 100:
 * 1. Zero-Silly-Mistake Radar (Negative keyword highlighter & Second-guess telemetry)
 * 2. 50:50 Guess Expected Value (EV) Risk/Reward Engine
 * 3. 8-Block Cognitive Fatigue & Pacing Analyzer (3.5-hour endurance curve)
 * 4. Autonomous "Today's Prescription" Sequence
 */

export interface AnswerChangeRecord {
  questionId: string;
  initialOption: string;
  finalOption: string;
  initialWasCorrect: boolean;
  finalWasCorrect: boolean;
  timeOfChangeSeconds: number;
}

export interface GuessRecord {
  questionId: string;
  subject: string;
  eliminatedOptions: string[];
  selectedOption: string;
  isCorrect: boolean;
}

export interface CognitiveBlockStats {
  blockNumber: number; // 1 to 8
  label: string; // e.g. "Q1 - Q25 (Hour 0-0.5)"
  totalQuestions: number;
  correct: number;
  incorrect: number;
  accuracyPct: number;
  avgTimePerQuestionSec: number;
}

export interface AIR100ExamTelemetry {
  examId: string;
  examTitle: string;
  timestamp: number;
  totalMarks: number;
  marksLostToSillyErrors: number;
  answerChanges: AnswerChangeRecord[];
  intuitionRatio: number; // > 1 means trust first instinct
  intuitionNetGainMarks: number;
  guessStats: {
    totalGuesses: number;
    correctGuesses: number;
    strikeRatePct: number;
    neetExpectedValueMarks: number;
    inicetExpectedValueMarks: number;
    subjectGuidance: Array<{
      subject: string;
      strikeRatePct: number;
      action: "ALWAYS_ATTEMPT" | "CALCULATED_RISK" | "AVOID_SKIP";
      netPoints: number;
    }>;
  };
  cognitiveFatigueBlocks: CognitiveBlockStats[];
  fatigueSlumpDetected: boolean;
  fatigueSlumpBlock?: number;
}

const STORAGE_KEY = "argus.btr.rank_telemetry.v1";

export function loadRankTelemetryHistory(): AIR100ExamTelemetry[] {
  if (typeof localStorage === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as AIR100ExamTelemetry[]) : [];
  } catch {
    return [];
  }
}

export function saveRankTelemetry(telemetry: AIR100ExamTelemetry): void {
  if (typeof localStorage === "undefined") return;
  try {
    const history = loadRankTelemetryHistory();
    history.unshift(telemetry);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history.slice(0, 30)));
  } catch (e) {
    console.warn("[btr-rank-optimizer] failed to save rank telemetry", e);
  }
}

/**
 * Regex for detecting negative and discriminator keywords in medical question stems
 */
export const NEGATIVE_KEYWORD_REGEX = /\b(NOT|EXCEPT|FALSE|LEAST\s+LIKELY|INCORRECT|CONTRAINDICATED|NEVER|UNLIKELY|AVOID|CANNOT)\b/gi;

/**
 * Highlights negative keywords in question stems with high-visibility formatting
 */
export function highlightStemKeywords(stemText: string): Array<{ text: string; isNegativeKeyword: boolean }> {
  if (!stemText) return [];
  const parts: Array<{ text: string; isNegativeKeyword: boolean }> = [];
  let lastIndex = 0;

  const regex = new RegExp(NEGATIVE_KEYWORD_REGEX);
  let match: RegExpExecArray | null;

  while ((match = regex.exec(stemText)) !== null) {
    if (match.index > lastIndex) {
      parts.push({
        text: stemText.slice(lastIndex, match.index),
        isNegativeKeyword: false,
      });
    }
    parts.push({
      text: match[0],
      isNegativeKeyword: true,
    });
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < stemText.length) {
    parts.push({
      text: stemText.slice(lastIndex),
      isNegativeKeyword: false,
    });
  }

  return parts;
}

/**
 * Computes the 50:50 Expected Value (EV) and per-subject risk recommendations
 */
export function computeGuessEVReport(guesses: GuessRecord[]): {
  totalGuesses: number;
  correctGuesses: number;
  strikeRatePct: number;
  neetExpectedValueMarks: number;
  inicetExpectedValueMarks: number;
  subjectGuidance: Array<{
    subject: string;
    strikeRatePct: number;
    action: "ALWAYS_ATTEMPT" | "CALCULATED_RISK" | "AVOID_SKIP";
    netPoints: number;
  }>;
} {
  const total = guesses.length;
  if (total === 0) {
    return {
      totalGuesses: 0,
      correctGuesses: 0,
      strikeRatePct: 50,
      neetExpectedValueMarks: 0,
      inicetExpectedValueMarks: 0,
      subjectGuidance: [],
    };
  }

  const correct = guesses.filter((g) => g.isCorrect).length;
  const incorrect = total - correct;
  const strikeRatePct = Math.round((correct / total) * 100);

  // NEET-PG: +4 for correct, -1 for incorrect
  const neetEV = correct * 4 - incorrect * 1;
  // INI-CET: +1 for correct, -0.33 for incorrect
  const iniEV = Math.round((correct * 1.0 - incorrect * 0.33) * 10) / 10;

  // Group by subject
  const subjectMap: Record<string, { correct: number; total: number }> = {};
  for (const g of guesses) {
    if (!subjectMap[g.subject]) {
      subjectMap[g.subject] = { correct: 0, total: 0 };
    }
    subjectMap[g.subject].total++;
    if (g.isCorrect) subjectMap[g.subject].correct++;
  }

  const guidance = Object.entries(subjectMap).map(([subject, stats]) => {
    const sRate = Math.round((stats.correct / stats.total) * 100);
    const net = stats.correct * 4 - (stats.total - stats.correct) * 1;
    let action: "ALWAYS_ATTEMPT" | "CALCULATED_RISK" | "AVOID_SKIP" = "CALCULATED_RISK";
    if (sRate >= 60) action = "ALWAYS_ATTEMPT";
    else if (sRate < 40) action = "AVOID_SKIP";

    return {
      subject,
      strikeRatePct: sRate,
      action,
      netPoints: net,
    };
  });

  return {
    totalGuesses: total,
    correctGuesses: correct,
    strikeRatePct,
    neetExpectedValueMarks: neetEV,
    inicetExpectedValueMarks: iniEV,
    subjectGuidance: guidance,
  };
}

/**
 * Computes 8-block cognitive fatigue profile across an exam session
 */
export function computeCognitiveFatigueBlocks(
  questionResults: Array<{
    questionIndex: number;
    isCorrect: boolean;
    timeSpentSeconds: number;
  }>,
  totalQuestions = 200
): {
  blocks: CognitiveBlockStats[];
  slumpDetected: boolean;
  slumpBlock?: number;
} {
  const blockSize = Math.max(10, Math.ceil(totalQuestions / 8));
  const blocks: CognitiveBlockStats[] = [];

  for (let b = 0; b < 8; b++) {
    const startIdx = b * blockSize;
    const endIdx = Math.min(totalQuestions, (b + 1) * blockSize);
    const slice = questionResults.slice(startIdx, endIdx);

    if (slice.length === 0) continue;

    const correct = slice.filter((s) => s.isCorrect).length;
    const accuracy = Math.round((correct / slice.length) * 100);
    const avgTime = Math.round(slice.reduce((acc, s) => acc + s.timeSpentSeconds, 0) / slice.length);

    blocks.push({
      blockNumber: b + 1,
      label: `Q${startIdx + 1} - Q${endIdx} (Block #${b + 1})`,
      totalQuestions: slice.length,
      correct,
      incorrect: slice.length - correct,
      accuracyPct: accuracy,
      avgTimePerQuestionSec: avgTime,
    });
  }

  // Detect slump: accuracy drop of > 15% between block 1-3 average and block 5-7
  let slumpDetected = false;
  let slumpBlock: number | undefined;

  if (blocks.length >= 6) {
    const earlyAvg = (blocks[0].accuracyPct + blocks[1].accuracyPct + blocks[2].accuracyPct) / 3;
    for (let i = 3; i < blocks.length; i++) {
      if (earlyAvg - blocks[i].accuracyPct >= 18) {
        slumpDetected = true;
        slumpBlock = blocks[i].blockNumber;
        break;
      }
    }
  }

  return { blocks, slumpDetected, slumpBlock };
}
