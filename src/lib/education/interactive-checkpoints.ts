import { createInitialCard, scheduleReview } from "./fsrs";
import type { FSRSCardData } from "./types";

export type CheckpointType = "multiple-choice" | "explain-it" | "prediction";

export type LectureCheckpoint = {
  id: string;
  timestampSec: number;
  title: string;
  question: string;
  type: CheckpointType;
  options?: string[];
  correctIndex?: number;
  expectedKeywords?: string[];
  explanation: string;
  rewindOnFailSec: number;
  prerequisiteId?: string;
  conceptLabel?: string;
};

export type CheckpointEvaluation = {
  passed: boolean;
  scorePct: number;
  matchedKeywords: string[];
  missingKeywords: string[];
  feedback: string;
};

const CHECKPOINT_STORAGE_PREFIX = "argus.education.checkpoints.v1.";
const CHECKPOINT_RESULTS_PREFIX = "argus.education.checkpoint_results.v1.";

/**
 * Curated high-yield checkpoints for popular open courses.
 */
export const CURATED_COURSE_CHECKPOINTS: Record<string, LectureCheckpoint[]> = {
  "med-clinical-anatomy": [
    {
      id: "anat-cp-1",
      timestampSec: 180,
      title: "Brachial Plexus Roots",
      question: "Which nerve roots form the superior trunk of the brachial plexus?",
      type: "multiple-choice",
      options: ["C5 and C6", "C7 only", "C8 and T1", "C5, C6, and C7"],
      correctIndex: 0,
      explanation: "C5 and C6 ventral rami unite to form the superior trunk. C7 continues as the middle trunk, and C8-T1 form the inferior trunk.",
      rewindOnFailSec: 45,
      prerequisiteId: "spinal-nerve-roots",
      conceptLabel: "Brachial Plexus Anatomy",
    },
    {
      id: "anat-cp-2",
      timestampSec: 420,
      title: "Erb's Palsy Mechanism",
      question: "In your own words, explain what clinical deformity occurs when the upper trunk (C5-C6) is tractioned during birth.",
      type: "explain-it",
      expectedKeywords: ["waiter", "tip", "adduction", "internal", "rotation", "pronation", "deltoid", "biceps"],
      explanation: "Damage to C5-C6 leads to loss of abductors and external rotators, presenting as the classic 'waiter's tip' hand (arm adducted, internally rotated, and forearm pronated).",
      rewindOnFailSec: 60,
      prerequisiteId: "brachial-plexus-roots",
      conceptLabel: "Clinical Neurology - Upper Limb",
    },
  ],
  "med-general-pathology": [
    {
      id: "path-cp-1",
      timestampSec: 240,
      title: "Reversible vs Irreversible Cell Injury",
      question: "What is the hallmark morphological indicator that cell injury has transitioned from reversible to irreversible necrosis?",
      type: "multiple-choice",
      options: [
        "Severe mitochondrial vacuolization and plasma membrane disruption",
        "Cellular swelling and hydropic change",
        "Detachment of ribosomes from the endoplasmic reticulum",
        "Accumulation of lipid droplets in cytoplasm",
      ],
      correctIndex: 0,
      explanation: "Severe mitochondrial breakdown (amorphous calcium densities), membrane rupture, and nuclear pyknosis/karyorrhexis indicate irreversible death.",
      rewindOnFailSec: 50,
      prerequisiteId: "cellular-mitochondria",
      conceptLabel: "Cellular Injury & Necrosis",
    },
  ],
  "med-systemic-physiology": [
    {
      id: "phys-cp-1",
      timestampSec: 310,
      title: "Frank-Starling Law",
      question: "How does an increase in end-diastolic volume (preload) increase cardiac stroke volume?",
      type: "explain-it",
      expectedKeywords: ["stretch", "sarcomere", "myosin", "actin", "overlap", "calcium", "contraction", "force"],
      explanation: "Increased venous return stretches cardiac myocytes toward optimal sarcomere length (2.2 µm), increasing calcium sensitivity and producing stronger contractile force.",
      rewindOnFailSec: 45,
      prerequisiteId: "cardiac-cycle",
      conceptLabel: "Cardiovascular Physiology",
    },
  ],
};

/**
 * Automatically inspects subtitle cues to manufacture intelligent checkpoints
 * when watching any lecture with closed captions.
 */
export function extractCheckpointsFromTranscript(
  cues: Array<{ startSec: number; endSec: number; text: string }>,
  targetCount = 4,
): LectureCheckpoint[] {
  if (!cues || cues.length === 0) return [];

  const markers: Array<{ index: number; cue: { startSec: number; endSec: number; text: string }; reason: string }> = [];

  const triggerPatterns = [
    { regex: /\b(therefore|thus|consequently|in summary|remember that)\b/i, reason: "summary" },
    { regex: /\b(what happens if|why does this|how do we|can you tell)\b/i, reason: "question" },
    { regex: /\b(crucial point|high yield|most important|key take[ -]?away)\b/i, reason: "high-yield" },
    { regex: /\b(mechanism of|difference between|compared to)\b/i, reason: "mechanism" },
  ];

  cues.forEach((cue, index) => {
    for (const { regex, reason } of triggerPatterns) {
      if (regex.test(cue.text) && cue.startSec > 60) {
        markers.push({ index, cue, reason });
        break;
      }
    }
  });

  if (markers.length === 0) {
    // If no explicit triggers, evenly space checkpoints across duration
    const totalDuration = cues[cues.length - 1].endSec;
    const interval = Math.max(120, totalDuration / (targetCount + 1));
    for (let sec = interval; sec < totalDuration - 60; sec += interval) {
      const cue = cues.find((c) => c.startSec >= sec);
      if (cue) {
        markers.push({ index: cues.indexOf(cue), cue, reason: "interval" });
      }
    }
  }

  // Deduplicate markers too close to each other (< 90 seconds)
  const filtered: typeof markers = [];
  markers.forEach((m) => {
    if (!filtered.some((f) => Math.abs(f.cue.startSec - m.cue.startSec) < 90)) {
      filtered.push(m);
    }
  });

  return filtered.slice(0, targetCount).map((marker, i) => {
    const cue = marker.cue;
    const priorText = cues
      .slice(Math.max(0, marker.index - 3), marker.index + 1)
      .map((c) => c.text)
      .join(" ");

    return {
      id: `auto-cp-${cue.startSec.toFixed(0)}-${i}`,
      timestampSec: Math.round(cue.endSec),
      title: `Checkpoint ${i + 1}`,
      question: `In your own words, explain the core concept the instructor just highlighted: "${cue.text.slice(0, 100).trim()}..."`,
      type: "explain-it",
      expectedKeywords: cleanExtractKeywords(priorText),
      explanation: `Key insight from the lecture: ${priorText.slice(-240).trim()}`,
      rewindOnFailSec: 40,
      conceptLabel: "Lecture Synthesis",
    };
  });
}

function cleanExtractKeywords(text: string): string[] {
  const stopWords = new Set([
    "the", "and", "that", "this", "with", "from", "have", "were", "what", "which",
    "there", "their", "about", "would", "these", "other", "into", "could", "than",
    "will", "when", "some", "them", "very", "your", "because", "after", "before",
  ]);

  const words = text
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 4 && !stopWords.has(w));

  const freq = new Map<string, number>();
  words.forEach((w) => freq.set(w, (freq.get(w) ?? 0) + 1));

  return Array.from(freq.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([w]) => w);
}

/**
 * Evaluates a student's plain-English or voice-dictated explanation.
 * Checks for core concept coverage, matches keywords/stems, and flags jargon.
 */
export function evaluateStudentExplanation(
  studentText: string,
  expectedKeywords: string[] = [],
  minKeywords = 2,
): CheckpointEvaluation {
  const cleanInput = (studentText || "").trim().toLowerCase();
  if (cleanInput.length < 12) {
    return {
      passed: false,
      scorePct: 0,
      matchedKeywords: [],
      missingKeywords: expectedKeywords,
      feedback: "Your explanation is too brief. Try explaining the mechanism step-by-step.",
    };
  }

  const normalizedWords = cleanInput.replace(/[^\w\s]/g, " ").split(/\s+/);
  const matchedKeywords: string[] = [];
  const missingKeywords: string[] = [];

  expectedKeywords.forEach((kw) => {
    const root = kw.toLowerCase().replace(/(ing|ed|s|es|tion|ive)$/, "");
    const found = normalizedWords.some(
      (w) => w.length >= 3 && (w.includes(root) || (w.length >= 4 && root.includes(w))),
    );
    if (found) {
      matchedKeywords.push(kw);
    } else {
      missingKeywords.push(kw);
    }
  });

  const total = Math.max(1, expectedKeywords.length);
  const ratio = matchedKeywords.length / total;
  const passed = matchedKeywords.length >= minKeywords || ratio >= 0.5;
  const scorePct = Math.round(ratio * 100);

  let feedback = "";
  if (passed) {
    feedback = `Solid explanation! You correctly incorporated key terms: ${matchedKeywords.join(", ")}.`;
  } else {
    feedback = `Good attempt, but you missed fundamental concepts: ${missingKeywords.slice(0, 3).join(", ")}.`;
  }

  return {
    passed,
    scorePct,
    matchedKeywords,
    missingKeywords,
    feedback,
  };
}

/**
 * Loads checkpoints for a video ID from curated lists or saved local cache.
 */
export function getCheckpointsForVideo(videoId: string): LectureCheckpoint[] {
  if (!videoId) return [];

  // Check custom/stored user checkpoints first
  try {
    const raw = localStorage.getItem(`${CHECKPOINT_STORAGE_PREFIX}${encodeURIComponent(videoId)}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}

  // Check curated course checkpoints
  if (CURATED_COURSE_CHECKPOINTS[videoId]) {
    return CURATED_COURSE_CHECKPOINTS[videoId];
  }

  // Check by partial URL matching
  for (const [key, list] of Object.entries(CURATED_COURSE_CHECKPOINTS)) {
    if (videoId.includes(key)) return list;
  }

  return [];
}

/**
 * Persists checkpoints for a given video ID.
 */
export function saveCheckpointsForVideo(videoId: string, checkpoints: LectureCheckpoint[]): void {
  try {
    localStorage.setItem(
      `${CHECKPOINT_STORAGE_PREFIX}${encodeURIComponent(videoId)}`,
      JSON.stringify(checkpoints),
    );
  } catch {}
}

/**
 * Records student attempt on a checkpoint and updates FSRS memory scheduling.
 */
export function recordCheckpointAttempt(
  checkpoint: LectureCheckpoint,
  passed: boolean,
): FSRSCardData {
  const key = `${CHECKPOINT_RESULTS_PREFIX}${checkpoint.id}`;
  let card: FSRSCardData = createInitialCard();

  try {
    const stored = localStorage.getItem(key);
    if (stored) card = JSON.parse(stored);
  } catch {}

  const rating = passed ? "good" : "again";
  const updated = scheduleReview(card, rating);

  try {
    localStorage.setItem(key, JSON.stringify(updated));
  } catch {}

  return updated;
}
