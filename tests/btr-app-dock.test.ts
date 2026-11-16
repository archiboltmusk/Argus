import { test } from "node:test";
import assert from "node:assert/strict";
import { getFSRSSummary, getDailyDripQueue } from "../src/lib/education/btr-fsrs-engine";
import { calculateExamCountdowns, calculateOverallReadiness, CORE_BTR_SUBJECTS, type BTRSubjectProgress } from "../src/lib/education/corebtr-schedule";
import { CORE_BTR_BROADCASTS } from "../src/lib/education/btr-broadcasts";
import { BTR_PDF_TOPIC_INDEX } from "../src/lib/education/btr-pdf-search-index";

test("CoreBTR Studio Shell: validates FSRS summary and daily queue for App Dock", () => {
  const summary = getFSRSSummary();
  assert.ok(summary, "FSRS summary should be generated");
  assert.ok(summary.dueTodayCount >= 10, "Daily due count should be at least 10 volatiles");
  assert.ok(summary.streakDays >= 1, "Streak should be at least 1 day");

  const queue = getDailyDripQueue(undefined, 10);
  assert.equal(queue.length, 10, "Queue should contain exactly 10 cards");
  assert.ok(queue[0].title.length > 0, "Queue cards must have titles");
});

test("CoreBTR Studio Shell: validates dual exam countdowns and readiness gauge", () => {
  const countdowns = calculateExamCountdowns();
  assert.ok(countdowns.iniCetMay.days > 0, "INI-CET May 2027 countdown must be positive");
  assert.ok(countdowns.neetPg.days > 0, "NEET-PG 2027 countdown must be positive");
  assert.ok(countdowns.neetPg.days >= countdowns.iniCetMay.days, "NEET-PG should be on or after INI-CET");

  const sampleProgress: Record<string, BTRSubjectProgress> = {
    pathology: { subjectId: "pathology", status: "mastered", btrAnnotated: true, tdCompleted: true, revisionCount: 3, mistakeCardCount: 4 },
    pharmacology: { subjectId: "pharmacology", status: "btr_annotated", btrAnnotated: true, tdCompleted: false, revisionCount: 1, mistakeCardCount: 2 },
  };
  const readiness = calculateOverallReadiness(sampleProgress);
  assert.equal(readiness.masteredCount, 1, "Should count 1 mastered subject");
  assert.equal(readiness.annotatedCount, 1, "Should count 1 annotated subject");
  assert.ok(readiness.completionPercentage > 0, "Readiness percentage should be computed");
});

test("CoreBTR Studio Shell: ensures broadcast feed & PDF search omnibus readiness", () => {
  assert.ok(CORE_BTR_BROADCASTS.length >= 3, "Broadcasts feed must have at least 3 broadcasts");
  assert.ok(CORE_BTR_BROADCASTS[0].title.includes("Core Drop"), "Top broadcast should be Daily Core Drop");
  assert.ok(CORE_BTR_BROADCASTS[0].description.length > 10, "Broadcast must have description");

  assert.ok(BTR_PDF_TOPIC_INDEX.length >= 10, "Cross-PDF omnibus index must index at least 10 topics");
  assert.ok(CORE_BTR_SUBJECTS.length === 19, "Must maintain all 19 NEET-PG core curriculum subjects");
});
