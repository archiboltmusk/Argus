/**
 * Core BTR Grand Test (GT) Error Vault & Mistake Triaging Engine
 * Tracks incorrect questions across 4 distinct error vectors and creates
 * automated "7-Day Pre-Exam Mistake Blitz" revision decks.
 */

export type GTErrorCategory =
  | "silly_reading" // Missed EXCEPT, NOT TRUE, units, reading rush
  | "volatile_lapse" // Forgot tables, cutoff numbers, scoring formulas
  | "examiner_trap" // Fell for tempting distractor or look-alike presentation
  | "knowledge_gap"; // Completely unread or non-mastered topic

export interface GTErrorItem {
  id: string;
  gtTitle: string;
  subjectId: string;
  subjectName: string;
  questionStem: string;
  myChosenAnswer: string;
  correctAnswer: string;
  takeawayFact: string;
  category: GTErrorCategory;
  dateLogged: string;
  reviewedCount: number;
  lastReviewedAt?: string;
  isResolved: boolean;
}

const STORAGE_KEY_ERRORS = "argus_corebtr_error_vault_v1";

let memoryFallbackVault: GTErrorItem[] | null = null;

export const ERROR_CATEGORY_METADATA: Record<
  GTErrorCategory,
  { label: string; badgeColor: string; description: string; prescription: string }
> = {
  silly_reading: {
    label: "Silly / Reading Error",
    badgeColor: "text-amber-400 bg-amber-500/15 border-amber-500/30",
    description: "Rushed through question stem; missed 'EXCEPT', negative polarity, or units.",
    prescription: "Highlight stem keywords with cursor; re-read question twice before selecting.",
  },
  volatile_lapse: {
    label: "Volatile Memory Lapse",
    badgeColor: "text-red-400 bg-red-500/15 border-red-500/30",
    description: "Understood concept but forgot exact table number, drug name, or criteria cutoff.",
    prescription: "Add to daily BTR 7-Day Spaced Watering deck and review before bedtime.",
  },
  examiner_trap: {
    label: "Examiner Trap",
    badgeColor: "text-purple-400 bg-purple-500/15 border-purple-500/30",
    description: "Fell for a classic board exam look-alike distractor.",
    prescription: "Write out differentiating features between the two paired conditions.",
  },
  knowledge_gap: {
    label: "Knowledge Gap",
    badgeColor: "text-blue-400 bg-blue-500/15 border-blue-500/30",
    description: "Unseen concept or completely unfamiliar mechanism.",
    prescription: "Watch the corresponding BTR lecture section and annotate workbook page.",
  },
};

/**
 * Load Error items from local storage with memory fallback
 */
export function loadBTRErrorItems(): GTErrorItem[] {
  try {
    if (typeof localStorage === "undefined" || !localStorage?.getItem) {
      return memoryFallbackVault || (memoryFallbackVault = getStarterErrors());
    }
    const raw = localStorage.getItem(STORAGE_KEY_ERRORS);
    if (!raw) {
      return memoryFallbackVault || (memoryFallbackVault = getStarterErrors());
    }
    return JSON.parse(raw);
  } catch {
    return memoryFallbackVault || (memoryFallbackVault = getStarterErrors());
  }
}

/**
 * Save Error item to local storage
 */
export function saveBTRErrorItem(item: GTErrorItem): GTErrorItem[] {
  const current = loadBTRErrorItems();
  const filtered = current.filter((e) => e.id !== item.id);
  const updated = [item, ...filtered];
  memoryFallbackVault = updated;
  try {
    if (typeof localStorage !== "undefined" && localStorage?.setItem) {
      localStorage.setItem(STORAGE_KEY_ERRORS, JSON.stringify(updated));
    }
  } catch (e) {
    console.error("Failed to save error item", e);
  }
  return updated;
}

/**
 * Delete Error item
 */
export function deleteBTRErrorItem(id: string): GTErrorItem[] {
  const current = loadBTRErrorItems();
  const updated = current.filter((e) => e.id !== id);
  memoryFallbackVault = updated;
  try {
    if (typeof localStorage !== "undefined" && localStorage?.setItem) {
      localStorage.setItem(STORAGE_KEY_ERRORS, JSON.stringify(updated));
    }
  } catch {
    // ignore
  }
  return updated;
}

/**
 * Increment review count and update status
 */
export function markErrorReviewed(id: string, resolve: boolean = false): GTErrorItem[] {
  const current = loadBTRErrorItems();
  const updated = current.map((item) => {
    if (item.id === id) {
      return {
        ...item,
        reviewedCount: item.reviewedCount + 1,
        lastReviewedAt: new Date().toISOString().slice(0, 10),
        isResolved: resolve ? true : item.isResolved,
      };
    }
    return item;
  });
  memoryFallbackVault = updated;
  try {
    if (typeof localStorage !== "undefined" && localStorage?.setItem) {
      localStorage.setItem(STORAGE_KEY_ERRORS, JSON.stringify(updated));
    }
  } catch {
    // ignore
  }
  return updated;
}

/**
 * Starter mock error items for initial visualization
 */
function getStarterErrors(): GTErrorItem[] {
  return [
    {
      id: "err-1",
      gtTitle: "Pre-Bootcamp Baseline GT 01",
      subjectId: "pathology",
      subjectName: "Pathology",
      questionStem: "A 45-year-old male with persistent lymphadenopathy shows t(11;14) translocation. Which cyclin is overexpressed?",
      myChosenAnswer: "BCL-2 (Cyclin D2)",
      correctAnswer: "Cyclin D1 (PRAD-1)",
      takeawayFact: "t(11;14) = Mantle cell lymphoma = Cyclin D1. Don't confuse with t(14;18) Follicular = BCL-2.",
      category: "volatile_lapse",
      dateLogged: "2026-11-10",
      reviewedCount: 1,
      isResolved: false,
    },
    {
      id: "err-2",
      gtTitle: "Pre-Bootcamp Baseline GT 01",
      subjectId: "pharmacology",
      subjectName: "Pharmacology",
      questionStem: "All of the following are indicated for anaphylaxis EXCEPT:",
      myChosenAnswer: "Adrenaline 1:1000 IM",
      correctAnswer: "Adrenaline 1:1000 IV bolus (Causes fatal dysrhythmias; IV is only 1:10,000 dilute infusion)",
      takeawayFact: "Missed the word 'EXCEPT' in stem. Adrenaline in anaphylaxis is IM (1:1000), never IV bolus.",
      category: "silly_reading",
      dateLogged: "2026-11-10",
      reviewedCount: 2,
      isResolved: true,
    },
    {
      id: "err-3",
      gtTitle: "Pre-Bootcamp Baseline GT 01",
      subjectId: "surgery",
      subjectName: "Surgery",
      questionStem: "A 30-year-old male has 30% TBSA burns. Weight 60 kg. What fluid volume is required in the first 8 hours?",
      myChosenAnswer: "7200 mL",
      correctAnswer: "3600 mL (Total is 4 × 30 × 60 = 7200 mL; FIRST 8 hours receives HALF = 3600 mL)",
      takeawayFact: "Calculated 24h total but forgot question asked for first 8 hours volume.",
      category: "examiner_trap",
      dateLogged: "2026-11-10",
      reviewedCount: 1,
      isResolved: false,
    },
  ];
}
