import { test } from "node:test";
import assert from "node:assert/strict";
import {
  calculateNormalizedTestMetrics,
  calculateCrossAppAnalytics,
  PLATFORM_METADATA,
  loadCrossAppTestRecords,
} from "../src/lib/education/btr-cross-app-tests";

test("Cross-App Tests: calculates NEET-PG (+4/-1) normalized metrics accurately", () => {
  const metrics = calculateNormalizedTestMetrics({
    examPattern: "neet_pg",
    totalQuestions: 200,
    correctCount: 150,
    incorrectCount: 40,
    unattemptedCount: 10,
    sillyMistakesCount: 10,
  });

  // 150 * 4 = 600; 40 * -1 = -40; raw = 560
  assert.equal(metrics.rawMarks, 560);
  assert.equal(metrics.maxMarks, 800);
  assert.equal(metrics.normalizedPercentage, 70.0);
  // Attempted = 190. Accuracy = 150 / 190 = 78.9%
  assert.equal(metrics.accuracyPercentage, 78.9);
  // Silly mistakes penalty: 10 * 5 = 50 marks lost
  assert.equal(metrics.marksLostToSillyMistakes, 50);
  assert.equal(metrics.potentialMarks, 610);
});

test("Cross-App Tests: calculates INI-CET (+1/-0.33) normalized metrics accurately", () => {
  const metrics = calculateNormalizedTestMetrics({
    examPattern: "ini_cet",
    totalQuestions: 200,
    correctCount: 140,
    incorrectCount: 50,
    unattemptedCount: 10,
    sillyMistakesCount: 12,
  });

  assert.equal(metrics.maxMarks, 200);
  // 140 - (50 * 0.33333) = ~123.33
  assert.ok(metrics.rawMarks >= 123.0 && metrics.rawMarks <= 124.0);
  // Attempted = 190. Accuracy = 140 / 190 = 73.7%
  assert.equal(metrics.accuracyPercentage, 73.7);
});

test("Cross-App Tests: aggregates cross-platform metrics across Marrow, Prep, DAMS & Cerebellum", () => {
  const sampleRecords = loadCrossAppTestRecords();
  assert.ok(sampleRecords.length >= 4, "Should have default mock records for 4 platforms");

  const analytics = calculateCrossAppAnalytics(sampleRecords);
  assert.ok(analytics.totalTestsLogged >= 4);
  assert.ok(analytics.averageAccuracy > 65);
  assert.ok(analytics.platformStats.marrow.testCount >= 1);
  assert.ok(analytics.platformStats.prepladder.testCount >= 1);
  assert.ok(analytics.platformStats.dams.testCount >= 1);
  assert.ok(analytics.platformStats.cerebellum.testCount >= 1);

  assert.ok(PLATFORM_METADATA.marrow.name === "Marrow");
  assert.ok(PLATFORM_METADATA.cerebellum.name.includes("Cerebellum"));
});
