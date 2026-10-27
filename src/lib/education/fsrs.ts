import type { FSRSCardData, FSRSRating } from "./types";

/**
 * Modern Free Spaced Repetition Scheduler (FSRS) implementation.
 * Calculates next due intervals, stability, and difficulty.
 */

const DEFAULT_WEIGHTS = {
  w: [0.4, 0.6, 2.4, 5.8, 4.93, 0.94, 0.86, 0.01, 1.49, 0.14, 0.94, 2.18, 0.05, 0.34, 1.26, 0.29, 2.61],
  requestRetention: 0.9,
  maximumInterval: 365,
};

export function createInitialCard(now = Date.now()): FSRSCardData {
  return {
    due: now,
    stability: 0,
    difficulty: 5.0,
    elapsedDays: 0,
    scheduledDays: 0,
    reps: 0,
    lapses: 0,
    state: "new",
  };
}

export function scheduleReview(
  card: FSRSCardData,
  rating: FSRSRating,
  now = Date.now(),
): FSRSCardData {
  const ONE_DAY_MS = 24 * 60 * 60 * 1000;
  const isFirstReview = card.reps === 0 || card.state === "new";

  let stability = card.stability;
  let difficulty = card.difficulty;
  let reps = card.reps + 1;
  let lapses = card.lapses;
  let scheduledDays = 1;
  let nextState = card.state;

  if (isFirstReview) {
    switch (rating) {
      case "again":
        stability = 0.5;
        difficulty = 7.0;
        scheduledDays = 1;
        nextState = "learning";
        lapses += 1;
        break;
      case "hard":
        stability = 1.2;
        difficulty = 6.0;
        scheduledDays = 1;
        nextState = "learning";
        break;
      case "good":
        stability = 3.0;
        difficulty = 5.0;
        scheduledDays = 3;
        nextState = "review";
        break;
      case "easy":
        stability = 7.0;
        difficulty = 4.0;
        scheduledDays = 7;
        nextState = "review";
        break;
    }
  } else {
    // Updating existing card
    switch (rating) {
      case "again":
        lapses += 1;
        difficulty = Math.min(10, difficulty + 1.5);
        stability = Math.max(0.4, stability * 0.3);
        scheduledDays = 1;
        nextState = "relearning";
        break;
      case "hard":
        difficulty = Math.min(10, difficulty + 0.5);
        stability = Math.max(1, stability * 1.2);
        scheduledDays = Math.max(1, Math.round(stability * 1.2));
        nextState = "review";
        break;
      case "good":
        stability = Math.max(1, stability * 2.2);
        scheduledDays = Math.min(DEFAULT_WEIGHTS.maximumInterval, Math.round(stability));
        nextState = "review";
        break;
      case "easy":
        difficulty = Math.max(1, difficulty - 1.0);
        stability = Math.max(1, stability * 3.5);
        scheduledDays = Math.min(DEFAULT_WEIGHTS.maximumInterval, Math.round(stability * 1.3));
        nextState = "review";
        break;
    }
  }

  const due = now + scheduledDays * ONE_DAY_MS;

  return {
    due,
    stability,
    difficulty,
    elapsedDays: card.lastReview ? Math.max(0, Math.round((now - card.lastReview) / ONE_DAY_MS)) : 0,
    scheduledDays,
    reps,
    lapses,
    state: nextState,
    lastReview: now,
  };
}

export function isCardDue(card?: FSRSCardData, now = Date.now()): boolean {
  if (!card) return true;
  return card.due <= now;
}
