/**
 * Core BTR Daily "Volatile Drip" Spaced Repetition (FSRS) Engine
 * Implements spaced intervals (1, 3, 7, 14, 30, 60 days) to keep super-volatiles
 * permanently in working memory leading up to NEET-PG 2027 and INI-CET May 2027.
 */

import { CORE_BTR_SUPER_VOLATILES, type BTRVolatileCard } from "./corebtr-schedule";

export type FSRSRating = 1 | 2 | 3 | 4; // 1 = Again, 2 = Hard, 3 = Good, 4 = Easy

export interface FSRSCardState {
  cardId: string;
  intervalDays: number;
  repetitionCount: number;
  lastReviewedAt: string; // YYYY-MM-DD
  dueAt: string; // YYYY-MM-DD
  easeFactor: number; // starts at 2.5
}

export interface FSRSSummary {
  dueTodayCount: number;
  totalCardsTracked: number;
  retentionRatePercentage: number;
  streakDays: number;
}

const STORAGE_KEY_FSRS = "argus_corebtr_fsrs_state_v1";
const STORAGE_KEY_STREAK = "argus_corebtr_fsrs_streak_v1";

let memoryFSRSState: Record<string, FSRSCardState> | null = null;
let memoryStreak: { streak: number; lastActiveDate: string } | null = null;

export function loadFSRSCardStates(): Record<string, FSRSCardState> {
  try {
    if (typeof localStorage === "undefined" || !localStorage?.getItem) {
      return memoryFSRSState || (memoryFSRSState = {});
    }
    const raw = localStorage.getItem(STORAGE_KEY_FSRS);
    if (!raw) return memoryFSRSState || (memoryFSRSState = {});
    return JSON.parse(raw);
  } catch {
    return memoryFSRSState || (memoryFSRSState = {});
  }
}

export function saveFSRSCardStates(state: Record<string, FSRSCardState>): void {
  memoryFSRSState = state;
  try {
    if (typeof localStorage !== "undefined" && localStorage?.setItem) {
      localStorage.setItem(STORAGE_KEY_FSRS, JSON.stringify(state));
    }
  } catch {
    // ignore
  }
}

export function calculateNextFSRSInterval(
  current: FSRSCardState | undefined,
  rating: FSRSRating
): FSRSCardState {
  const todayStr = new Date().toISOString().slice(0, 10);
  const prevInterval = current?.intervalDays || 0;
  const prevRep = current?.repetitionCount || 0;
  const prevEase = current?.easeFactor || 2.5;

  let nextInterval = 1;
  let nextRep = prevRep + 1;
  let nextEase = prevEase;

  if (rating === 1) {
    // Again: Reset to 1 day
    nextInterval = 1;
    nextRep = 0;
    nextEase = Math.max(1.3, prevEase - 0.2);
  } else if (rating === 2) {
    // Hard: 1.2x
    nextInterval = Math.max(1, Math.round((prevInterval || 1) * 1.2));
    nextEase = Math.max(1.3, prevEase - 0.15);
  } else if (rating === 3) {
    // Good: standard 2.5x jump
    if (prevRep === 0) nextInterval = 1;
    else if (prevRep === 1) nextInterval = 3;
    else nextInterval = Math.round(prevInterval * prevEase);
  } else {
    // Easy: bonus 1.3x on top of ease
    if (prevRep === 0) nextInterval = 3;
    else if (prevRep === 1) nextInterval = 7;
    else nextInterval = Math.round(prevInterval * prevEase * 1.3);
    nextEase = Math.min(3.0, prevEase + 0.15);
  }

  // Calculate due date
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + nextInterval);
  const dueAtStr = dueDate.toISOString().slice(0, 10);

  return {
    cardId: current?.cardId || "",
    intervalDays: nextInterval,
    repetitionCount: nextRep,
    lastReviewedAt: todayStr,
    dueAt: dueAtStr,
    easeFactor: Number(nextEase.toFixed(2)),
  };
}

export function reviewFSRSCard(cardId: string, rating: FSRSRating): FSRSCardState {
  const states = loadFSRSCardStates();
  const current = states[cardId] || {
    cardId,
    intervalDays: 0,
    repetitionCount: 0,
    lastReviewedAt: "",
    dueAt: new Date().toISOString().slice(0, 10),
    easeFactor: 2.5,
  };

  const updated = calculateNextFSRSInterval(current, rating);
  updated.cardId = cardId;
  states[cardId] = updated;
  saveFSRSCardStates(states);

  // Update streak
  updateDailyStreak();

  return updated;
}

export function getDailyDripQueue(
  cards: BTRVolatileCard[] = CORE_BTR_SUPER_VOLATILES,
  limit: number = 10
): BTRVolatileCard[] {
  const states = loadFSRSCardStates();
  const todayStr = new Date().toISOString().slice(0, 10);

  // Sort: due cards first, then unreviewed cards, then lowest interval
  const sorted = [...cards].sort((a, b) => {
    const stateA = states[a.id];
    const stateB = states[b.id];

    // Due today or earlier has top priority
    const isDueA = !stateA || stateA.dueAt <= todayStr;
    const isDueB = !stateB || stateB.dueAt <= todayStr;

    if (isDueA && !isDueB) return -1;
    if (!isDueA && isDueB) return 1;

    // Highest yield score first
    return b.highYieldScore - a.highYieldScore;
  });

  return sorted.slice(0, limit);
}

function updateDailyStreak(): void {
  const todayStr = new Date().toISOString().slice(0, 10);
  let streakObj = memoryStreak;

  try {
    if (typeof localStorage !== "undefined" && localStorage?.getItem) {
      const raw = localStorage.getItem(STORAGE_KEY_STREAK);
      if (raw) streakObj = JSON.parse(raw);
    }
  } catch {
    // ignore
  }

  if (!streakObj) {
    streakObj = { streak: 1, lastActiveDate: todayStr };
  } else if (streakObj.lastActiveDate !== todayStr) {
    const lastDate = new Date(streakObj.lastActiveDate);
    const currentDate = new Date(todayStr);
    const diffDays = Math.round((currentDate.getTime() - lastDate.getTime()) / (1000 * 3600 * 24));

    if (diffDays === 1) {
      streakObj.streak += 1;
    } else if (diffDays > 1) {
      streakObj.streak = 1;
    }
    streakObj.lastActiveDate = todayStr;
  }

  memoryStreak = streakObj;
  try {
    if (typeof localStorage !== "undefined" && localStorage?.setItem) {
      localStorage.setItem(STORAGE_KEY_STREAK, JSON.stringify(streakObj));
    }
  } catch {
    // ignore
  }
}

export function getFSRSSummary(cards: BTRVolatileCard[] = CORE_BTR_SUPER_VOLATILES): FSRSSummary {
  const states = loadFSRSCardStates();
  const todayStr = new Date().toISOString().slice(0, 10);
  let dueCount = 0;
  let rememberedCount = 0;

  for (const card of cards) {
    const st = states[card.id];
    if (!st || st.dueAt <= todayStr) {
      dueCount += 1;
    }
    if (st && st.repetitionCount >= 2) {
      rememberedCount += 1;
    }
  }

  const streak = memoryStreak?.streak || 1;
  const retention = cards.length === 0 ? 0 : Math.round((rememberedCount / cards.length) * 100);

  return {
    dueTodayCount: dueCount,
    totalCardsTracked: cards.length,
    retentionRatePercentage: retention,
    streakDays: streak,
  };
}
