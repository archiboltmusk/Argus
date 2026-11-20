import type { ClinicalQuestion, QBankSessionState } from "./qbank-types";
import type { StudyNote } from "./types";
import { isCorrectAnswer } from "./question-integrity";
export type StudyBudget = 10 | 25 | 60;

/** Allocate half the session to due recall, then prioritize confident mistakes and weak topics. */
export function buildStudyPlan(
  questions: ClinicalQuestion[],
  notes: StudyNote[],
  attempts: QBankSessionState[],
  minutes: StudyBudget,
  now = Date.now(),
) {
  const confidentWrong = new Set<string>();
  const missed = new Set<string>();
  const weakTopics = new Set<string>();
  for (const attempt of attempts)
    for (const question of questions) {
      if (!(attempt.isSubmitted[question.id] || attempt.result)) continue;
      if (
        attempt.selectedAnswers[question.id] !== undefined &&
        !isCorrectAnswer(question, attempt.selectedAnswers[question.id])
      ) {
        missed.add(question.id);
        weakTopics.add(question.topic);
        if (attempt.confidence?.[question.id] === "confident") confidentWrong.add(question.id);
      }
    }
  const due = notes
    .filter((note) => !note.fsrs || note.fsrs.due <= now)
    .sort((a, b) => (a.fsrs?.due ?? a.createdAt) - (b.fsrs?.due ?? b.createdAt));
  const reviews = due.slice(0, Math.floor(minutes / 2));
  const count = Math.max(1, Math.floor((minutes - reviews.length) / 2));
  const priority = (question: ClinicalQuestion) =>
    confidentWrong.has(question.id)
      ? 0
      : missed.has(question.id)
        ? 1
        : weakTopics.has(question.topic)
          ? 2
          : 3;
  return {
    minutes,
    reviews,
    questions: [...questions].sort((a, b) => priority(a) - priority(b)).slice(0, count),
    confidentWrong: [...confidentWrong],
  };
}
