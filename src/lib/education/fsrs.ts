import { createEmptyCard, fsrs, Rating, State, type Card } from "ts-fsrs";
import type { FSRSCardData, FSRSRating, FSRSState } from "./types";

// Pin the synchronous FSRS-6 implementation; opening an existing deck never reschedules it.
const scheduler = fsrs({ request_retention: 0.9, maximum_interval: 365, enable_fuzz: false });
const states: Record<FSRSState, State> = {
  new: State.New,
  learning: State.Learning,
  review: State.Review,
  relearning: State.Relearning,
};
const stateNames: FSRSState[] = ["new", "learning", "review", "relearning"];
const ratings = {
  again: Rating.Again,
  hard: Rating.Hard,
  good: Rating.Good,
  easy: Rating.Easy,
} as const;
export const FSRS_ENGINE = "ts-fsrs@6.0.0";

export function fromCard(card: Card): FSRSCardData {
  return {
    due: card.due.getTime(),
    stability: card.stability,
    difficulty: card.difficulty,
    elapsedDays: 0,
    scheduledDays: card.scheduled_days,
    learningSteps: card.learning_steps,
    reps: card.reps,
    lapses: card.lapses,
    state: stateNames[card.state],
    lastReview: card.last_review?.getTime(),
  };
}
export function toCard(card: FSRSCardData): Card {
  if (
    ![card.due, card.stability, card.difficulty, card.reps, card.lapses].every(Number.isFinite) ||
    !(card.state in states)
  ) {
    throw new Error("Invalid review card. Restore it from an exported deck before reviewing.");
  }
  return {
    due: new Date(card.due),
    stability: card.stability,
    difficulty: card.difficulty,
    scheduled_days: card.scheduledDays,
    learning_steps: card.learningSteps ?? 0,
    reps: card.reps,
    lapses: card.lapses,
    state: states[card.state],
    last_review: card.lastReview !== undefined ? new Date(card.lastReview) : undefined,
  };
}
export function createInitialCard(now = Date.now()): FSRSCardData {
  return fromCard(createEmptyCard(new Date(now)));
}
export function scheduleReview(
  card: FSRSCardData,
  rating: FSRSRating,
  now = Date.now(),
): FSRSCardData {
  if (card.lastReview !== undefined && now < card.lastReview)
    throw new Error("Review time is before the previous review.");
  return fromCard(scheduler.next(toCard(card), new Date(now), ratings[rating]).card);
}
export function isCardDue(card?: FSRSCardData, now = Date.now()): boolean {
  return !card || card.due <= now;
}
