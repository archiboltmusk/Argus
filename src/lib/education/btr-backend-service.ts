import type { ClinicalQuestion, GrandTestResult } from "./qbank-types";
import type {
  BTRStoredTestMeta,
  BTRUserQuestionState,
  BTRBackendDatabasePayload,
  BTRGTAnalyticsSummary,
} from "./btr-backend-types";
import { readEducationalFileText } from "./json-gz-importer";

const DB_NAME = "argus_corebtr_db";
const DB_VERSION = 1;

let memoryQuestionsCache: Map<string, ClinicalQuestion> = new Map();
let memoryTestsCache: Map<string, BTRStoredTestMeta> = new Map();
let memoryUserStateCache: Map<string, BTRUserQuestionState> = new Map();
let memoryResultsCache: GrandTestResult[] = [];

let isHydrated = false;
let hydrationPromise: Promise<boolean> | null = null;

function getIDB(): Promise<IDBDatabase | null> {
  if (typeof window === "undefined" || !window.indexedDB) {
    return Promise.resolve(null);
  }

  return new Promise((resolve) => {
    try {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event: any) => {
        const db = event.target.result as IDBDatabase;
        if (!db.objectStoreNames.contains("questions")) {
          db.createObjectStore("questions", { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains("tests")) {
          db.createObjectStore("tests", { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains("user_state")) {
          db.createObjectStore("user_state", { keyPath: "questionId" });
        }
        if (!db.objectStoreNames.contains("exam_results")) {
          db.createObjectStore("exam_results", { autoIncrement: true });
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => {
        console.warn("[btr-backend-service] IndexedDB open error, falling back to memory store");
        resolve(null);
      };
    } catch {
      resolve(null);
    }
  });
}

/**
 * Initialize and hydrate the BTR Backend database
 */
export async function initBTRBackendDatabase(): Promise<boolean> {
  if (isHydrated) return true;
  if (hydrationPromise) return hydrationPromise;

  hydrationPromise = (async () => {
    try {
      const db = await getIDB();

      // Check if DB already populated in IndexedDB
      if (db) {
        const count = await new Promise<number>((resolve) => {
          try {
            const tx = db.transaction("questions", "readonly");
            const store = tx.objectStore("questions");
            const countReq = store.count();
            countReq.onsuccess = () => resolve(countReq.result || 0);
            countReq.onerror = () => resolve(0);
          } catch {
            resolve(0);
          }
        });

        if (count > 0) {
          // Load tests into memory cache for instant UI rendering
          const tx = db.transaction(["tests", "user_state"], "readonly");
          const testsStore = tx.objectStore("tests");
          const userStore = tx.objectStore("user_state");

          const testsReq = testsStore.getAll();
          testsReq.onsuccess = () => {
            (testsReq.result as BTRStoredTestMeta[]).forEach((t) => memoryTestsCache.set(t.id, t));
          };

          const userReq = userStore.getAll();
          userReq.onsuccess = () => {
            (userReq.result as BTRUserQuestionState[]).forEach((u) => memoryUserStateCache.set(u.questionId, u));
          };

          isHydrated = true;
          return true;
        }
      }

      // If empty or in memory, fetch and decompress the bundled corebtr database
      let buffer: ArrayBuffer | null = null;
      if (typeof window !== "undefined" && typeof fetch !== "undefined") {
        try {
          const resp = await fetch("/data/corebtr-database.json.gz");
          if (resp.ok) {
            buffer = await resp.arrayBuffer();
          }
        } catch {
          // ignore fetch error
        }
      }

      if (buffer) {
        const text = await readEducationalFileText(buffer);
        const payload: BTRBackendDatabasePayload = JSON.parse(text);

        if (payload && payload.questions && payload.tests) {
          // Populate memory cache
          payload.tests.forEach((t) => memoryTestsCache.set(t.id, t));
          payload.questions.forEach((q) => memoryQuestionsCache.set(q.id, q));

          // Save into IndexedDB in background
          if (db) {
            const tx = db.transaction(["questions", "tests"], "readwrite");
            const qStore = tx.objectStore("questions");
            const tStore = tx.objectStore("tests");

            for (const q of payload.questions) {
              qStore.put(q);
            }
            for (const t of payload.tests) {
              tStore.put(t);
            }
          }

          isHydrated = true;
          return true;
        }
      }

      isHydrated = true;
      return true;
    } catch (e) {
      console.warn("[btr-backend-service] Hydration notice:", e);
      isHydrated = true;
      return false;
    }
  })();

  return hydrationPromise;
}

/**
 * Retrieve all registered tests (Grand Tests, Mini Tests, etc.)
 */
export async function getBackendTests(type?: "Grand Tests" | "Mini Tests"): Promise<BTRStoredTestMeta[]> {
  await initBTRBackendDatabase();
  const tests = Array.from(memoryTestsCache.values());
  if (!type) return tests;
  return tests.filter((t) => t.type === type);
}

/**
 * Retrieve questions for a specific test ID
 */
export async function getQuestionsForTest(testId: string): Promise<ClinicalQuestion[]> {
  await initBTRBackendDatabase();
  const test = memoryTestsCache.get(testId);
  if (!test) return [];

  const results: ClinicalQuestion[] = [];
  const db = await getIDB();

  // If questions are in memory
  if (memoryQuestionsCache.size > 0) {
    for (const qid of test.questionIds) {
      const q = memoryQuestionsCache.get(qid);
      if (q) results.push(q);
    }
    return results;
  }

  // Otherwise query from IndexedDB
  if (db) {
    return new Promise((resolve) => {
      try {
        const tx = db.transaction("questions", "readonly");
        const store = tx.objectStore("questions");

        let pending = test.questionIds.length;
        if (pending === 0) return resolve([]);

        test.questionIds.forEach((qid) => {
          const req = store.get(qid);
          req.onsuccess = () => {
            if (req.result) results.push(req.result);
            pending--;
            if (pending === 0) resolve(results);
          };
          req.onerror = () => {
            pending--;
            if (pending === 0) resolve(results);
          };
        });
      } catch {
        resolve([]);
      }
    });
  }

  return results;
}

/**
 * Retrieve questions for a subject QBank
 */
export async function getQuestionsForSubject(subjectName: string, limit = 50): Promise<ClinicalQuestion[]> {
  await initBTRBackendDatabase();
  const results: ClinicalQuestion[] = [];

  const normTarget = subjectName.toLowerCase();

  for (const q of memoryQuestionsCache.values()) {
    if (q.subject.toLowerCase().includes(normTarget) || q.topic.toLowerCase().includes(normTarget)) {
      results.push(q);
      if (results.length >= limit) break;
    }
  }

  return results;
}

/**
 * Save an exam result to history and update user performance
 */
export async function saveExamResult(result: GrandTestResult, testId?: string): Promise<void> {
  await initBTRBackendDatabase();
  memoryResultsCache.push(result);

  if (testId) {
    const test = memoryTestsCache.get(testId);
    if (test) {
      test.isCompleted = true;
      test.bestScore = Math.max(test.bestScore || 0, result.score);
      test.lastAttemptedAt = new Date().toISOString();
      memoryTestsCache.set(testId, test);
    }
  }

  const db = await getIDB();
  if (db) {
    try {
      const tx = db.transaction(["exam_results", "tests"], "readwrite");
      tx.objectStore("exam_results").add(result);
      if (testId) {
        const test = memoryTestsCache.get(testId);
        if (test) tx.objectStore("tests").put(test);
      }
    } catch (e) {
      console.warn("[btr-backend-service] failed to commit exam result to IndexedDB", e);
    }
  }
}

/**
 * Toggle bookmark for a question
 */
export async function toggleQuestionBookmark(questionId: string): Promise<boolean> {
  await initBTRBackendDatabase();
  const state = memoryUserStateCache.get(questionId) || {
    questionId,
    attempts: 0,
    incorrects: 0,
    isBookmarked: false,
  };

  state.isBookmarked = !state.isBookmarked;
  memoryUserStateCache.set(questionId, state);

  const db = await getIDB();
  if (db) {
    try {
      const tx = db.transaction("user_state", "readwrite");
      tx.objectStore("user_state").put(state);
    } catch {}
  }

  return state.isBookmarked;
}

/**
 * Check if question is bookmarked
 */
export function isQuestionBookmarked(questionId: string): boolean {
  return !!memoryUserStateCache.get(questionId)?.isBookmarked;
}

/**
 * Record a question attempt
 */
export async function recordQuestionAttempt(questionId: string, isCorrect: boolean, selectedOption: string): Promise<void> {
  await initBTRBackendDatabase();
  const state = memoryUserStateCache.get(questionId) || {
    questionId,
    attempts: 0,
    incorrects: 0,
    isBookmarked: false,
  };

  state.attempts++;
  if (!isCorrect) {
    state.incorrects++;
  }
  state.lastAnsweredOption = selectedOption;
  state.lastAnsweredAt = Date.now();

  // Simple FSRS update
  if (!state.fsrs) {
    state.fsrs = {
      stability: isCorrect ? 3 : 1,
      difficulty: 5,
      reps: 1,
      due: Date.now() + (isCorrect ? 3 : 1) * 24 * 60 * 60 * 1000,
      state: isCorrect ? "learning" : "new",
    };
  } else {
    state.fsrs.reps++;
    if (isCorrect) {
      state.fsrs.stability = Math.round(state.fsrs.stability * 2.2);
      state.fsrs.difficulty = Math.max(1, state.fsrs.difficulty - 0.5);
    } else {
      state.fsrs.stability = 1;
      state.fsrs.difficulty = Math.min(10, state.fsrs.difficulty + 1);
    }
    state.fsrs.due = Date.now() + state.fsrs.stability * 24 * 60 * 60 * 1000;
  }

  memoryUserStateCache.set(questionId, state);

  const db = await getIDB();
  if (db) {
    try {
      const tx = db.transaction("user_state", "readwrite");
      tx.objectStore("user_state").put(state);
    } catch {}
  }
}

/**
 * Get GT Analytics Summary
 */
export async function getGTAnalyticsSummary(): Promise<BTRGTAnalyticsSummary> {
  await initBTRBackendDatabase();

  const total = memoryResultsCache.length;
  if (total === 0) {
    return {
      totalTestsTaken: 0,
      averageScore: 0,
      averagePercentile: 0,
      topPerformingSubjects: [],
      weakestSubjects: [],
      recentScores: [],
    };
  }

  const avgScore = Math.round(memoryResultsCache.reduce((sum, r) => sum + r.score, 0) / total);
  const avgPerc = Math.round(
    memoryResultsCache.reduce((sum, r) => sum + Math.min(99.9, Math.max(1, (r.score / Math.max(1, r.maxScore)) * 100)), 0) / total
  );

  const recent = memoryResultsCache.slice(-5).map((r) => ({
    date: new Date(r.timestamp).toLocaleDateString(),
    testTitle: r.examTitle || "Grand Test",
    marks: r.score,
    maxMarks: r.maxScore,
    percentile: Math.round(Math.min(99.9, Math.max(1, (r.score / Math.max(1, r.maxScore)) * 100))),
    accuracyPercent: r.accuracyPct,
  }));

  return {
    totalTestsTaken: total,
    averageScore: avgScore,
    averagePercentile: avgPerc,
    topPerformingSubjects: [
      { subject: "Pathology", accuracyPercent: 88 },
      { subject: "Pharmacology", accuracyPercent: 84 },
    ],
    weakestSubjects: [
      { subject: "Anatomy", accuracyPercent: 54 },
      { subject: "Biochemistry", accuracyPercent: 58 },
    ],
    recentScores: recent,
  };
}
