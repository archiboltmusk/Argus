import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex } from "@noble/hashes/utils.js";
import type { ClinicalQuestion, QBankSessionState } from "./qbank-types";
import { cwProfileScope } from "../cw-profile";

export function attemptKey(
  questions: ClinicalQuestion[],
  examMode: boolean,
  durationMinutes?: number,
): string {
  // Per-question fingerprints avoid duplicating an entire question bank in every attempt.
  const signature = manifest(questions);
  let hash = 2166136261;
  for (let i = 0; i < signature.length; i++)
    hash = Math.imul(hash ^ signature.charCodeAt(i), 16777619);
  return `argus.education.attempt.v1.${encodeURIComponent(cwProfileScope().profileId || "local")}.${examMode ? "exam" : "practice"}.${hash >>> 0}${durationMinutes ? `.minutes-${durationMinutes}` : ""}`;
}
function questionIdentity(question: ClinicalQuestion) {
  const content = JSON.stringify([
    question.id,
    question.vignette,
    question.imageUrl ?? null,
    question.assertionReason ?? null,
    question.options,
    question.answerSpec ?? question.correctIndex,
  ]);
  return [question.id, bytesToHex(sha256(new TextEncoder().encode(content)))];
}
const manifests = new WeakMap<ClinicalQuestion[], string>();
function manifest(questions: ClinicalQuestion[]): string {
  // Question updates replace their containing array throughout the QBank store.
  const cached = manifests.get(questions);
  if (cached) return cached;
  const signature = JSON.stringify(questions.map(questionIdentity));
  manifests.set(questions, signature);
  return signature;
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
  const previousRaw = localStorage.getItem(key);
  if (previousRaw) {
    let previous;
    try {
      previous = JSON.parse(previousRaw);
    } catch {
      previous = null;
    }
    if (previous?.state?.result && previous.state.startedAt !== state.startedAt) {
      // Archive before replacing; a failed write leaves the durable completed attempt intact.
      localStorage.setItem(`${key}.history.${previous.state.startedAt}`, previousRaw);
    }
  }
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

export function listAttempts(questions?: ClinicalQuestion[]): QBankSessionState[] {
  const prefix = `argus.education.attempt.v1.${encodeURIComponent(cwProfileScope().profileId || "local")}.`;
  const attempts: QBankSessionState[] = [];
  try {
    for (let index = 0; index < localStorage.length; index++) {
      const key = localStorage.key(index);
      if (!key?.startsWith(prefix)) continue;
      try {
        const stored = JSON.parse(localStorage.getItem(key) ?? "null");
        const state = stored?.state;
        if (state?.selectedAnswers && state.isSubmitted) {
          if (!questions) attempts.push(state);
          else {
            const current = new Map(
              questions.map((question) => [
                question.id,
                JSON.stringify(questionIdentity(question)),
              ]),
            );
            const valid = new Set(
              (JSON.parse(stored.manifest) as unknown[][])
                .filter((entry) => current.get(String(entry[0])) === JSON.stringify(entry))
                .map((entry) => String(entry[0])),
            );
            attempts.push({
              ...state,
              selectedAnswers: Object.fromEntries(
                Object.entries(state.selectedAnswers).filter(([id]) => valid.has(id)),
              ),
            });
          }
        }
      } catch {
        /* Ignore a corrupt journal without hiding other attempts. */
      }
    }
  } catch {
    /* The caller can still build a new offline plan. */
  }
  return attempts;
}

export function findResumableAttempt(available: ClinicalQuestion[]) {
  const byId = new Map(available.map((question) => [question.id, question]));
  const prefix = `argus.education.attempt.v1.${encodeURIComponent(cwProfileScope().profileId || "local")}.`;
  let latest: {
    questions: ClinicalQuestion[];
    examMode: boolean;
    durationMinutes?: number;
    updatedAt: number;
  } | undefined;
  try {
    for (let index = 0; index < localStorage.length; index++) {
      const key = localStorage.key(index);
      if (!key?.startsWith(prefix)) continue;
      const match = /^(exam|practice)\.\d+(?:\.minutes-(\d+(?:\.\d+)?))?$/.exec(key.slice(prefix.length));
      if (!match) continue;
      try {
        const saved = JSON.parse(localStorage.getItem(key) ?? "null");
        if (!saved?.state || saved.state.finishedAt || saved.state.result) continue;
        const ids = JSON.parse(saved.manifest) as Array<[string, string]>;
        const questions = ids.flatMap(([id]) => {
          const question = byId.get(id);
          return question ? [question] : [];
        });
        if (!questions.length || questions.length !== ids.length || manifest(questions) !== saved.manifest) continue;
        const examMode = match[1] === "exam";
        const durationMinutes = match[2] === undefined ? undefined : Number(match[2]);
        if (attemptKey(questions, examMode, durationMinutes) !== key) continue;
        const state = loadAttempt(key, questions, -1);
        const updatedAt = state.activeSince ?? state.startedAt ?? -1;
        if (state.startedAt === -1 || updatedAt <= (latest?.updatedAt ?? -1)) continue;
        latest = { questions, examMode, durationMinutes, updatedAt };
      } catch {
        // One corrupt attempt must not hide other saved sessions.
      }
    }
  } catch {
    // Storage can be disabled. The starter drill remains available.
  }
  return latest;
}
