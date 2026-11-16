import assert from "node:assert/strict";
import test from "node:test";
import {
  BTR_TND_PAPERS,
  buildErrorItemFromTnD,
} from "../src/lib/education/btr-tnd-engine";
import {
  BTR_PYRAMID_CATALOG,
  togglePyramidTopic,
  calculatePyramidProgress,
  loadCheckedPyramidTopics,
} from "../src/lib/education/btr-pyramids-engine";
import {
  calculateNextFSRSInterval,
  getDailyDripQueue,
  getFSRSSummary,
  reviewFSRSCard,
  type FSRSCardState,
} from "../src/lib/education/btr-fsrs-engine";
import {
  searchBTRPdfs,
  BTR_PDF_TOPIC_INDEX,
} from "../src/lib/education/btr-pdf-search-index";
import {
  BTR_CLINICAL_VIGNETTES,
} from "../src/lib/education/btr-clinical-vignettes";

test("T&D Engine: indexes Test & Discussion papers and formats Error Vault items", () => {
  assert.ok(BTR_TND_PAPERS.length >= 4, "Expected at least 4 indexed T&D subject papers");

  const anat = BTR_TND_PAPERS.find((p) => p.subjectId === "anatomy");
  assert.ok(anat);
  assert.equal(anat?.targetVideoFileName, "TND Anatomy.mp4");
  assert.ok(anat?.sampleQuestions.length >= 2);

  // Test converting a missed T&D question to a GTErrorItem
  const sampleQ = anat.sampleQuestions[0];
  const errorItem = buildErrorItemFromTnD(anat, sampleQ, 0); // chose option A instead of B
  assert.ok(errorItem.id.startsWith("err-tnd-"));
  assert.equal(errorItem.subjectId, "anatomy");
  assert.ok(errorItem.correctAnswer.includes("Axillary"));
  assert.equal(errorItem.isResolved, false);
});

test("Pyramid Engine: manages 3-tier subject breakdowns & progress calculations", () => {
  const anatPyramid = BTR_PYRAMID_CATALOG.anatomy;
  assert.ok(anatPyramid);
  assert.ok(anatPyramid.tier1MustKnow.length >= 5);
  assert.ok(anatPyramid.tier2Volatiles.length >= 4);
  assert.ok(anatPyramid.tier3TieBreakers.length >= 3);

  // Initial progress should be calculable
  const checkedSet = new Set<string>();
  checkedSet.add("anatomy-t1-0"); // check first tier 1 item
  checkedSet.add("anatomy-t2-0"); // check first tier 2 item

  const progress = calculatePyramidProgress(anatPyramid, checkedSet);
  assert.ok(progress.tier1Percentage > 0);
  assert.ok(progress.tier2Percentage > 0);
  assert.equal(progress.tier3Percentage, 0);
  assert.ok(progress.totalPercentage > 0);

  // Toggle topic
  const key = "test-topic-1";
  const firstToggle = togglePyramidTopic(key);
  assert.equal(firstToggle, true);
  const secondToggle = togglePyramidTopic(key);
  assert.equal(secondToggle, false);
});

test("FSRS Engine: computes spaced repetition intervals & daily queue", () => {
  const initial: FSRSCardState = {
    cardId: "card-test",
    intervalDays: 0,
    repetitionCount: 0,
    lastReviewedAt: "2026-11-16",
    dueAt: "2026-11-16",
    easeFactor: 2.5,
  };

  // Rating 1 (Again) -> 1 day interval
  const againState = calculateNextFSRSInterval(initial, 1);
  assert.equal(againState.intervalDays, 1);
  assert.equal(againState.repetitionCount, 0);

  // Rating 3 (Good) on first review -> 1 day, second review -> 3 days
  const good1 = calculateNextFSRSInterval(initial, 3);
  assert.equal(good1.intervalDays, 1);
  assert.equal(good1.repetitionCount, 1);

  const good2 = calculateNextFSRSInterval(good1, 3);
  assert.equal(good2.intervalDays, 3);
  assert.equal(good2.repetitionCount, 2);

  // Rating 4 (Easy) -> fast forward
  const easy = calculateNextFSRSInterval(good2, 4);
  assert.ok(easy.intervalDays >= 7);

  // Daily queue test
  const queue = getDailyDripQueue(undefined, 10);
  assert.equal(queue.length, 10);

  // Summary test
  const summary = getFSRSSummary();
  assert.ok(summary.dueTodayCount >= 0);
  assert.ok(summary.streakDays >= 1);
});

test("Cross-PDF Search Engine: queries across 32 BTR PDF workbooks", () => {
  assert.ok(BTR_PDF_TOPIC_INDEX.length >= 10);

  const brachialSearch = searchBTRPdfs("Brachial");
  assert.ok(brachialSearch.length >= 1);
  assert.equal(brachialSearch[0].pdfFileName, "Anatomy.pdf");
  assert.equal(brachialSearch[0].pageNumber, 1);

  const bmwSearch = searchBTRPdfs("BMW");
  assert.ok(bmwSearch.length >= 1);
  assert.equal(bmwSearch[0].pdfFileName, "PSM.pdf");

  const vol3Search = searchBTRPdfs("Volume 3");
  assert.ok(vol3Search.length >= 1);
  assert.equal(vol3Search[0].pdfFileName, "Volume 3.pdf");
});

test("Clinical Vignettes Engine: validates two-step board reasoning cases", () => {
  assert.ok(BTR_CLINICAL_VIGNETTES.length >= 4);

  // Pheochromocytoma case
  const pheo = BTR_CLINICAL_VIGNETTES.find((v) => v.step1ImplicitDiagnosis === "Pheochromocytoma");
  assert.ok(pheo);
  assert.ok(pheo?.options[pheo.correctOptionIndex].includes("Phenoxybenzamine"));
  assert.ok(pheo?.examinerTrapBreakdown.includes("lethal examiner trap"));

  // WPW with AF case
  const wpw = BTR_CLINICAL_VIGNETTES.find((v) => v.step1ImplicitDiagnosis.includes("Wolff-Parkinson-White"));
  assert.ok(wpw);
  assert.ok(wpw?.options[wpw.correctOptionIndex].includes("Adenosine"));
  assert.ok(wpw?.detailedRationale.includes("ABCD"));
});
