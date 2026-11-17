import assert from "node:assert/strict";
import test from "node:test";
import {
  initBTRBackendDatabase,
  getBackendTests,
  saveExamResult,
  toggleQuestionBookmark,
  isQuestionBookmarked,
  recordQuestionAttempt,
  getGTAnalyticsSummary,
} from "../src/lib/education/btr-backend-service";
import type { GrandTestResult } from "../src/lib/education/qbank-types";

test("BTR Backend Service: initializes cleanly and exposes API", async () => {
  const ready = await initBTRBackendDatabase();
  assert.equal(ready, true);

  const tests = await getBackendTests();
  assert.ok(Array.isArray(tests));
});

test("BTR Backend Service: handles bookmarking and attempt recording", async () => {
  const qid = "test-q-12345";
  assert.equal(isQuestionBookmarked(qid), false);

  const bookmarked = await toggleQuestionBookmark(qid);
  assert.equal(bookmarked, true);
  assert.equal(isQuestionBookmarked(qid), true);

  const unbookmarked = await toggleQuestionBookmark(qid);
  assert.equal(unbookmarked, false);
  assert.equal(isQuestionBookmarked(qid), false);

  await recordQuestionAttempt(qid, true, "B");
  await recordQuestionAttempt(qid, false, "A");
});

test("BTR Backend Service: stores and aggregates exam results", async () => {
  const mockResult: GrandTestResult = {
    id: "gt-1",
    examTitle: "Baseline Grand Test 1",
    timestamp: Date.now(),
    totalQuestions: 200,
    attempted: 190,
    correct: 150,
    incorrect: 40,
    score: 560,
    maxScore: 800,
    accuracyPct: 78.9,
    timeSpentMinutes: 180,
  };

  await saveExamResult(mockResult, "gt-1");
  const analytics = await getGTAnalyticsSummary();
  assert.ok(analytics.totalTestsTaken >= 1);
  assert.ok(analytics.averageScore > 0);
});
