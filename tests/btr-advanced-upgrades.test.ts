import assert from "node:assert/strict";
import test from "node:test";
import {
  getChaptersForVideo,
} from "../src/lib/education/btr-chapters-engine";
import {
  formatCardsForAnki,
} from "../src/lib/education/btr-anki-exporter";
import {
  saveBTRErrorItem,
  markErrorReviewed,
  deleteBTRErrorItem,
  ERROR_CATEGORY_METADATA,
  type GTErrorItem,
} from "../src/lib/education/btr-error-vault";
import type { BTRVolatileCard } from "../src/lib/education/corebtr-schedule";

test("BTR Chapters Engine: maps known BTR videos to high-yield lecture chapters", () => {
  const anatomyChapters = getChaptersForVideo("Anatomy_1of2.mp4");
  assert.ok(anatomyChapters.length >= 5, "Expected at least 5 chapters in Anatomy Part 1");
  assert.equal(anatomyChapters[0].timestampSec, 0);
  assert.ok(anatomyChapters[0].title.includes("Brachial Plexus"));
  assert.ok(anatomyChapters[0].mustKnowConcept.includes("Erb's"));

  const surgeryChapters = getChaptersForVideo("Surgery_1of2.mp4");
  assert.ok(surgeryChapters.length >= 4, "Expected chapters for Surgery Part 1");
  assert.ok(surgeryChapters.some((c) => c.title.toLowerCase().includes("thyroid")));
  assert.ok(surgeryChapters.some((c) => c.title.toLowerCase().includes("breast")));
});

test("BTR Chapters Engine: synthesizes fallback BTR chapters for unknown videos", () => {
  const fallback = getChaptersForVideo("Miscellaneous_Lecture.mp4");
  assert.equal(fallback.length, 4);
  assert.equal(fallback[0].title, "Core Introduction & High-Yield Blueprint");
  assert.equal(fallback[3].title, "Rapid 5-Minute Volatile Recap");
});

test("BTR Anki Exporter: exports flashcards to standard Anki TSV format with styling", () => {
  const sampleCards: BTRVolatileCard[] = [
    {
      id: "card-anat-1",
      subjectId: "anatomy",
      subjectName: "Anatomy",
      category: "Pre-Clinical Foundations",
      title: "Erb's Duchenne vs Klumpke's Roots",
      keyPrompt: "Roots for Erb's vs Klumpke's palsy",
      maskedAnswer: "Erb's: Upper trunk (C5-C6). Klumpke's: Lower trunk (C8-T1).",
      examinerTrap: "Horner syndrome is seen in Klumpke's, never in Erb's.",
      mnemonic: "Upper = Erb's (policeman's tip); Lower = Klumpke's (claw hand).",
      highYieldScore: 5,
      tags: ["brachial_plexus", "nerves"],
    },
    {
      id: "card-path-1",
      subjectId: "pathology",
      subjectName: "Pathology",
      category: "Para-Clinical Systems",
      title: "Reed-Sternberg Cells Marker Profile",
      keyPrompt: "Immunohistochemistry markers for classic Hodgkin lymphoma",
      maskedAnswer: "CD15+, CD30+, CD45- in classical Hodgkin Lymphoma.",
      examinerTrap: "Nodular lymphocyte predominant Hodgkin is CD20+ CD45+ (L&H cells).",
      highYieldScore: 5,
      tags: ["lymphoma", "markers"],
    },
  ];

  const tsv = formatCardsForAnki(sampleCards, {
    tagPrefix: "NEETPG2027::CoreBTR",
    includeExaminerTraps: true,
    includeMnemonics: true,
  });

  assert.ok(tsv.includes("#separator:tab"), "Expected Anki TSV separator declaration");
  assert.ok(tsv.includes("#html:true"), "Expected Anki html true declaration");
  assert.ok(tsv.includes("#tags column:3"), "Expected tags column declaration");

  const lines = tsv.trim().split("\n").filter((l) => !l.startsWith("#"));
  assert.equal(lines.length, 2, "Expected 2 exported flashcard lines");

  // First line should have tabs and contains trap + mnemonic
  const [f1, b1, t1] = lines[0].split("\t");
  assert.ok(f1.includes("Erb's Duchenne"));
  assert.ok(b1.includes("Upper trunk"));
  assert.ok(b1.includes("Examiner Trap"));
  assert.ok(b1.includes("Memory Hook"));
  assert.ok(t1.includes("NEETPG2027::CoreBTR::Anatomy"));

  // Test excluding traps
  const tsvNoTraps = formatCardsForAnki(sampleCards, {
    tagPrefix: "Test",
    includeExaminerTraps: false,
    includeMnemonics: false,
  });
  assert.ok(!tsvNoTraps.includes("Examiner Trap"));
  assert.ok(!tsvNoTraps.includes("Memory Hook"));
});

test("BTR Error Vault: creates, filters, and manages GT mistakes across 4 core categories", () => {
  // Test metadata coverage
  assert.ok(ERROR_CATEGORY_METADATA.silly_reading.label.includes("Silly"));
  assert.ok(ERROR_CATEGORY_METADATA.volatile_lapse.label.includes("Volatile"));
  assert.ok(ERROR_CATEGORY_METADATA.examiner_trap.label.includes("Trap"));
  assert.ok(ERROR_CATEGORY_METADATA.knowledge_gap.label.includes("Gap"));

  const testItem: GTErrorItem = {
    id: `err-test-${Date.now()}`,
    gtTitle: "NEET PG Mock GT 01",
    subjectId: "surgery",
    subjectName: "Surgery",
    questionStem: "A 45-year-old female presents with solitary thyroid nodule...",
    myChosenAnswer: "B) Right hemithyroidectomy",
    correctAnswer: "A) FNAC (Fine Needle Aspiration Cytology)",
    takeawayFact: "Always investigate solitary thyroid nodule with FNAC before jumping to surgical resection.",
    category: "silly_reading",
    dateLogged: "2026-11-17",
    reviewedCount: 0,
    isResolved: false,
  };

  const savedList = saveBTRErrorItem(testItem);
  assert.ok(Array.isArray(savedList));
  assert.ok(savedList.some((e) => e.id === testItem.id));

  // Mark reviewed
  const reviewedList = markErrorReviewed(testItem.id);
  const found = reviewedList.find((e) => e.id === testItem.id);
  assert.ok(found);
  assert.equal(found.reviewedCount, 1);

  // Delete
  const afterDelete = deleteBTRErrorItem(testItem.id);
  assert.ok(!afterDelete.some((e) => e.id === testItem.id));
});
