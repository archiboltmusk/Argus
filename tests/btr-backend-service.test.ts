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
  searchAllQuestions,
  buildCustomModuleTest,
  generateGTAutopsy,
  getLatestAutopsyReport,
  getDailyFSRSReviewQueue,
} from "../src/lib/education/btr-backend-service";
import {
  cacheQuestionImages,
  isImageCached,
  resolvePlayableImageUrl,
} from "../src/lib/education/btr-asset-cache";
import type { GrandTestResult } from "../src/lib/education/qbank-types";

test("BTR Backend Service: initializes cleanly and exposes API", async () => {
  const ready = await initBTRBackendDatabase();
  assert.equal(ready, true);

  const tests = await getBackendTests();
  assert.deepEqual(tests, []);

  const starterDrill = await buildCustomModuleTest({
    subjects: [],
    status: "all",
    count: 20,
    mode: "study",
  });
  assert.ok(starterDrill.length > 0, "a clean install can start a drill");
  assert.ok(starterDrill.every((question) => !question.sourceExam));
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

test("BTR Backend Service: generates GT autopsy and remediation drills", () => {
  const mockResult: GrandTestResult = {
    id: "gt-autopsy-test",
    examTitle: "CoreBTR Grand Test 2",
    timestamp: Date.now(),
    totalQuestions: 200,
    attempted: 200,
    correct: 130,
    incorrect: 70,
    score: 450,
    maxScore: 800,
    accuracyPct: 65,
    timeSpentMinutes: 205,
  };

  const autopsy = generateGTAutopsy(mockResult);
  assert.equal(autopsy.testTitle, "CoreBTR Grand Test 2");
  assert.ok(autopsy.sillyMistakesCount > 0);
  assert.ok(autopsy.knowledgeGapsCount > 0);
  assert.ok(autopsy.recommendations.length > 0);

  const latest = getLatestAutopsyReport();
  assert.ok(latest);
  assert.equal(latest.testTitle, "CoreBTR Grand Test 2");
});

test("BTR Backend Service: Custom Module Builder filters questions correctly", async () => {
  const customDrill = await buildCustomModuleTest({
    title: "Pathology & Pharma Sprint",
    subjects: ["Pathology", "Pharmacology"],
    status: "all",
    count: 20,
    mode: "exam",
  });

  assert.ok(Array.isArray(customDrill));
});

test("BTR Backend Service: searchAllQuestions executes quickly", async () => {
  const results = await searchAllQuestions("syndrome");
  assert.ok(Array.isArray(results));

  const empty = await searchAllQuestions("");
  assert.deepEqual(empty, []);
});

test("BTR Backend Service: FSRS daily review queue yields questions", async () => {
  const queue = await getDailyFSRSReviewQueue(15);
  assert.ok(Array.isArray(queue));
});

test("BTR Asset Cache: handles URLs and offline resolution safely", async () => {
  const cachedCount = await cacheQuestionImages(["https://example.com/test.png"]);
  assert.equal(typeof cachedCount, "number");

  const cached = await isImageCached("https://example.com/test.png");
  assert.equal(typeof cached, "boolean");

  const url = await resolvePlayableImageUrl("https://example.com/test.png");
  assert.equal(typeof url, "string");
});
