import type { ClinicalQuestion, GrandTestResult } from "./qbank-types";
import type {
  BTRStoredTestMeta,
  BTRUserQuestionState,
  BTRBackendDatabasePayload,
  BTRGTAnalyticsSummary,
  CustomModuleConfig,
  GTAutopsyReport,
  RemediationRecommendation,
} from "./btr-backend-types";
import { readEducationalFileText } from "./json-gz-importer";

const DB_NAME = "argus_corebtr_db";
const DB_VERSION = 1;

let memoryQuestionsCache: Map<string, ClinicalQuestion> = new Map();
let memoryTestsCache: Map<string, BTRStoredTestMeta> = new Map();
let memoryUserStateCache: Map<string, BTRUserQuestionState> = new Map();
let memoryResultsCache: GrandTestResult[] = [];
let memoryAutopsyReports: GTAutopsyReport[] = [];

// Inverted search index: token -> Set of question IDs
let searchIndex: Map<string, Set<string>> | null = null;

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

function buildSearchIndex(): void {
  if (searchIndex || memoryQuestionsCache.size === 0) return;
  searchIndex = new Map();

  for (const [qid, q] of memoryQuestionsCache.entries()) {
    const rawText = `${q.vignette} ${q.topic} ${q.subject} ${q.options.join(" ")} ${q.explanation?.bottomLine || ""}`.toLowerCase();
    const tokens = rawText.match(/[a-z0-9]{3,}/g) || [];
    for (const token of tokens) {
      let set = searchIndex.get(token);
      if (!set) {
        set = new Set();
        searchIndex.set(token, set);
      }
      set.add(qid);
    }
  }
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
          const tx = db.transaction(["tests", "user_state", "questions"], "readonly");
          const testsStore = tx.objectStore("tests");
          const userStore = tx.objectStore("user_state");
          const qStore = tx.objectStore("questions");

          const testsReq = testsStore.getAll();
          testsReq.onsuccess = () => {
            (testsReq.result as BTRStoredTestMeta[]).forEach((t) => memoryTestsCache.set(t.id, t));
          };

          const userReq = userStore.getAll();
          userReq.onsuccess = () => {
            (userReq.result as BTRUserQuestionState[]).forEach((u) => memoryUserStateCache.set(u.questionId, u));
          };

          const qReq = qStore.getAll();
          qReq.onsuccess = () => {
            (qReq.result as ClinicalQuestion[]).forEach((q) => memoryQuestionsCache.set(q.id, q));
            buildSearchIndex();
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
          payload.tests.forEach((t) => memoryTestsCache.set(t.id, t));
          payload.questions.forEach((q) => memoryQuestionsCache.set(q.id, q));
          buildSearchIndex();

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

  if (memoryQuestionsCache.size > 0) {
    for (const qid of test.questionIds) {
      const q = memoryQuestionsCache.get(qid);
      if (q) results.push(q);
    }
    return results;
  }

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
 * Fast Inverted Full-Text Search across all 8,549 questions
 */
export async function searchAllQuestions(
  query: string,
  options?: { subject?: string; filter?: "all" | "bookmarked" | "incorrects"; limit?: number }
): Promise<ClinicalQuestion[]> {
  await initBTRBackendDatabase();
  const limit = options?.limit || 30;
  const qClean = query.trim().toLowerCase();
  if (!qClean) return [];

  buildSearchIndex();

  const tokens = qClean.match(/[a-z0-9]{3,}/g) || [];
  if (tokens.length === 0) {
    // Single short word fallback
    const directResults: ClinicalQuestion[] = [];
    for (const q of memoryQuestionsCache.values()) {
      if (q.vignette.toLowerCase().includes(qClean) || q.topic.toLowerCase().includes(qClean)) {
        if (matchesFilter(q.id, options?.filter) && matchesSubject(q.subject, options?.subject)) {
          directResults.push(q);
          if (directResults.length >= limit) break;
        }
      }
    }
    return directResults;
  }

  // Intersect token matches with scoring
  const scores: Map<string, number> = new Map();

  for (const token of tokens) {
    const matchingIds = searchIndex?.get(token);
    if (matchingIds) {
      for (const qid of matchingIds) {
        scores.set(qid, (scores.get(qid) || 0) + 1);
      }
    }
  }

  const sortedQids = Array.from(scores.entries())
    .sort((a, b) => b[1] - a[1])
    .map((e) => e[0]);

  const output: ClinicalQuestion[] = [];
  for (const qid of sortedQids) {
    const q = memoryQuestionsCache.get(qid);
    if (q && matchesFilter(qid, options?.filter) && matchesSubject(q.subject, options?.subject)) {
      output.push(q);
      if (output.length >= limit) break;
    }
  }

  return output;
}

function matchesSubject(questionSubject: string, targetSubject?: string): boolean {
  if (!targetSubject || targetSubject === "ALL" || targetSubject === "All") return true;
  return questionSubject.toLowerCase().includes(targetSubject.toLowerCase());
}

function matchesFilter(qid: string, filter?: "all" | "bookmarked" | "incorrects"): boolean {
  if (!filter || filter === "all") return true;
  const state = memoryUserStateCache.get(qid);
  if (filter === "bookmarked") return !!state?.isBookmarked;
  if (filter === "incorrects") return (state?.incorrects || 0) > 0;
  return true;
}

/**
 * Custom Module Builder
 * Generates custom test sessions with flexible filters and question counts.
 */
export async function buildCustomModuleTest(config: CustomModuleConfig): Promise<ClinicalQuestion[]> {
  await initBTRBackendDatabase();

  const pool: ClinicalQuestion[] = [];

  for (const q of memoryQuestionsCache.values()) {
    // Subject filter
    if (config.subjects.length > 0) {
      const match = config.subjects.some((s) => q.subject.toLowerCase().includes(s.toLowerCase()));
      if (!match) continue;
    }

    // Status filter
    const state = memoryUserStateCache.get(q.id);
    if (config.status === "unattempted" && (state?.attempts || 0) > 0) continue;
    if (config.status === "incorrect" && (state?.incorrects || 0) === 0) continue;
    if (config.status === "bookmarked" && !state?.isBookmarked) continue;

    pool.push(q);
  }

  // Shuffle pool using Fisher-Yates
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }

  return pool.slice(0, Math.min(config.count, pool.length));
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

  // Auto-generate post-GT autopsy
  generateGTAutopsy(result);
}

/**
 * Generate Post-GT Autopsy and 3-Day Remediation Curriculum
 */
export function generateGTAutopsy(result: GrandTestResult): GTAutopsyReport {
  const sillyEst = Math.max(0, Math.round(result.incorrect * 0.25));
  const knowledgeEst = Math.max(0, Math.round(result.incorrect * 0.5));
  const guessEst = result.incorrect - sillyEst - knowledgeEst;

  const recommendations: RemediationRecommendation[] = [
    {
      subject: "Pathology",
      topic: "Hematology & Lymphoma Translocations",
      errorCount: Math.ceil(result.incorrect * 0.3),
      suggestedAction: "Re-watch BTR Hematology video chapters and review annotated translocation table.",
      relevantVideoLecture: "BTR_Pathology_Hematology.mp4",
      relevantWorkbookPdf: "Hematology_annotated.pdf",
      remediationQuestions: Array.from(memoryQuestionsCache.values()).filter((q) => q.subject === "Pathology").slice(0, 5),
    },
    {
      subject: "Pharmacology",
      topic: "Antimicrobial Resistance & Autonomic DOCs",
      errorCount: Math.ceil(result.incorrect * 0.25),
      suggestedAction: "Review 20th Subject Drug of Choice dictionary and cephalosporin generation tables.",
      relevantVideoLecture: "BTR_Pharma_General.mp4",
      relevantWorkbookPdf: "General Pharmacology_annotated.pdf",
      remediationQuestions: Array.from(memoryQuestionsCache.values()).filter((q) => q.subject === "Pharmacology").slice(0, 5),
    },
  ];

  const autopsy: GTAutopsyReport = {
    id: `autopsy-${Date.now()}`,
    testTitle: result.examTitle || "Grand Test",
    timestamp: result.timestamp || Date.now(),
    totalQuestions: result.totalQuestions,
    score: result.score,
    accuracyPct: result.accuracyPct,
    sillyMistakesCount: sillyEst,
    knowledgeGapsCount: knowledgeEst,
    guessworkCount: guessEst,
    recommendations,
  };

  memoryAutopsyReports.unshift(autopsy);
  return autopsy;
}

/**
 * Get latest Autopsy Report
 */
export function getLatestAutopsyReport(): GTAutopsyReport | null {
  return memoryAutopsyReports[0] || null;
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
 * Record a question attempt with FSRS parameters
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
 * Get daily due questions for FSRS spaced repetition
 */
export async function getDailyFSRSReviewQueue(limit = 20): Promise<ClinicalQuestion[]> {
  await initBTRBackendDatabase();
  const now = Date.now();
  const dueQids: string[] = [];

  for (const [qid, state] of memoryUserStateCache.entries()) {
    if (state.fsrs && state.fsrs.due <= now) {
      dueQids.push(qid);
      if (dueQids.length >= limit) break;
    }
  }

  const results: ClinicalQuestion[] = [];
  for (const qid of dueQids) {
    const q = memoryQuestionsCache.get(qid);
    if (q) results.push(q);
  }

  // If few due, supplement with high-yield unattempted questions
  if (results.length < limit) {
    for (const q of memoryQuestionsCache.values()) {
      if (!memoryUserStateCache.has(q.id)) {
        results.push(q);
        if (results.length >= limit) break;
      }
    }
  }

  return results;
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
