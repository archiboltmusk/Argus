import type { ClinicalQuestion, QBankSessionState } from "./qbank-types";
import { cwProfileScope } from "../cw-profile";

export function attemptKey(
  questions: ClinicalQuestion[],
  examMode: boolean,
  durationMinutes?: number,
): string {
  // The full manifest lives beside the snapshot: a hash collision cannot restore another test.
  const manifest = JSON.stringify(
    questions.map((q) => [q.id, q.vignette, q.options, q.answerSpec ?? q.correctIndex]),
  );
  let hash = 2166136261;
  for (let i = 0; i < manifest.length; i++)
    hash = Math.imul(hash ^ manifest.charCodeAt(i), 16777619);
  return `argus.education.attempt.v1.${encodeURIComponent(cwProfileScope().profileId || "local")}.${examMode ? "exam" : "practice"}.${hash >>> 0}${durationMinutes ? `.minutes-${durationMinutes}` : ""}`;
}
function manifest(questions: ClinicalQuestion[]): string {
  return JSON.stringify(
    questions.map((q) => [q.id, q.vignette, q.options, q.answerSpec ?? q.correctIndex]),
  );
}
export function newAttempt(now = Date.now()): QBankSessionState {
  return {
    activeSince: now,
    startedAt: now,
    activeQuestionIndex: 0,
    selectedAnswers: {},
    eliminatedOptions: {},
    isSubmitted: {},
    bookmarks: [],
    timeSpentSec: {},
    guessedQuestions: {},
    markedForReview: [],
    confidence: {},
    mistakes: {},
  };
}
export function loadAttempt(
  key: string,
  questions: ClinicalQuestion[],
  now = Date.now(),
): QBankSessionState {
  try {
    const stored = JSON.parse(localStorage.getItem(key) ?? "null");
    const state = stored?.state;
    if (
      stored?.manifest === manifest(questions) &&
      state &&
      Number.isFinite(state.startedAt) &&
      Number.isInteger(state.activeQuestionIndex) &&
      state.activeQuestionIndex >= 0 &&
      state.activeQuestionIndex < questions.length &&
      state.selectedAnswers &&
      state.eliminatedOptions &&
      state.isSubmitted &&
      Array.isArray(state.bookmarks) &&
      state.timeSpentSec
    )
      return state;
  } catch {
    /* A corrupt snapshot must not stop a new session. */
  }
  return newAttempt(now);
}
export function saveAttempt(
  key: string,
  questions: ClinicalQuestion[],
  state: QBankSessionState,
): void {
  localStorage.setItem(key, JSON.stringify({ manifest: manifest(questions), state }));
}
export function elapsedSeconds(state: QBankSessionState, now = Date.now()): number {
  return Math.max(0, Math.floor(((state.finishedAt ?? now) - (state.startedAt ?? now)) / 1000));
}

export function reportQuestion(questionId: string, reason: string): void {
  if (!reason.trim()) throw new Error("Describe the issue before saving.");
  const key = `argus.education.disputes.v1.${encodeURIComponent(cwProfileScope().profileId || "local")}`;
  const existing = JSON.parse(localStorage.getItem(key) ?? "[]");
  localStorage.setItem(
    key,
    JSON.stringify([
      ...existing,
      { questionId, reason: reason.trim(), reportedAt: Date.now(), status: "open" },
    ]),
  );
}

export function listAttempts(): QBankSessionState[] {
  const prefix = `argus.education.attempt.v1.${encodeURIComponent(cwProfileScope().profileId || "local")}.`;
  const attempts: QBankSessionState[] = [];
  try {
    for (let index = 0; index < localStorage.length; index++) {
      const key = localStorage.key(index);
      if (!key?.startsWith(prefix)) continue;
      try {
        const state = JSON.parse(localStorage.getItem(key) ?? "null")?.state;
        if (state?.selectedAnswers && state.isSubmitted) attempts.push(state);
      } catch {
        /* Ignore a corrupt journal without hiding other attempts. */
      }
    }
  } catch {
    /* The caller can still build a new offline plan. */
  }
  return attempts;
}
