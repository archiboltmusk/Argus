import { test } from "node:test";
import assert from "node:assert";
import {
  highlightStemKeywords,
  computeGuessEVReport,
  computeCognitiveFatigueBlocks,
  NEGATIVE_KEYWORD_REGEX,
} from "../src/lib/education/btr-rank-optimizer.ts";
import { TOP_100_FRONTIER_VAULT } from "../src/lib/education/btr-frontier-vault.ts";
import { generateAIR100Prescription } from "../src/lib/education/btr-backend-service.ts";

test("AIR < 100 Rank Optimizer: highlights negative keywords in question stems", () => {
  const stem = "Which of the following is NOT a feature of MEN2A EXCEPT in cases of medullary thyroid carcinoma?";
  const parts = highlightStemKeywords(stem);

  assert.ok(parts.length > 1, "Should split stem into multiple parts");
  const negativeParts = parts.filter((p) => p.isNegativeKeyword);
  assert.ok(negativeParts.length >= 2, "Should identify NOT and EXCEPT as negative keywords");
  assert.strictEqual(negativeParts[0].text, "NOT");
  assert.strictEqual(negativeParts[1].text, "EXCEPT");
});

test("AIR < 100 Rank Optimizer: computes 50:50 guess expected value (EV) and recommendations", () => {
  const guesses = [
    { questionId: "q1", subject: "OBGYN", eliminatedOptions: ["A", "B"], selectedOption: "C", isCorrect: true },
    { questionId: "q2", subject: "OBGYN", eliminatedOptions: ["A", "C"], selectedOption: "B", isCorrect: true },
    { questionId: "q3", subject: "OBGYN", eliminatedOptions: ["B", "D"], selectedOption: "A", isCorrect: false },
    { questionId: "q4", subject: "Dermatology", eliminatedOptions: ["A", "B"], selectedOption: "C", isCorrect: false },
    { questionId: "q5", subject: "Dermatology", eliminatedOptions: ["B", "C"], selectedOption: "D", isCorrect: false },
  ];

  const report = computeGuessEVReport(guesses);
  assert.strictEqual(report.totalGuesses, 5);
  assert.strictEqual(report.correctGuesses, 2);
  assert.strictEqual(report.strikeRatePct, 40);

  // NEET EV: 2*4 - 3*1 = 5
  assert.strictEqual(report.neetExpectedValueMarks, 5);

  const obgynGuidance = report.subjectGuidance.find((g) => g.subject === "OBGYN");
  assert.ok(obgynGuidance, "Should provide guidance for OBGYN");
  assert.strictEqual(obgynGuidance?.strikeRatePct, 67);
  assert.strictEqual(obgynGuidance?.action, "ALWAYS_ATTEMPT");

  const dermGuidance = report.subjectGuidance.find((g) => g.subject === "Dermatology");
  assert.ok(dermGuidance, "Should provide guidance for Dermatology");
  assert.strictEqual(dermGuidance?.action, "AVOID_SKIP");
});

test("AIR < 100 Rank Optimizer: computes 8-block cognitive fatigue profile and detects slumps", () => {
  // Create 80 questions: early blocks high accuracy (80%), block 6 low accuracy (40%)
  const results = [];
  for (let i = 0; i < 80; i++) {
    const isBlock6 = i >= 50 && i < 60;
    results.push({
      questionIndex: i,
      isCorrect: isBlock6 ? i % 3 === 0 : i % 5 !== 0,
      timeSpentSeconds: isBlock6 ? 75 : 45,
    });
  }

  const fatigue = computeCognitiveFatigueBlocks(results, 80);
  assert.strictEqual(fatigue.blocks.length, 8, "Should produce exactly 8 blocks");
  assert.strictEqual(fatigue.slumpDetected, true, "Should detect a cognitive slump in later blocks");
  assert.strictEqual(fatigue.slumpBlock, 6, "Slump block should be block 6");
});

test("Top-100 Frontier Tie-Breakers Vault: contains curated rank-deciders across all categories", () => {
  assert.ok(TOP_100_FRONTIER_VAULT.length >= 25, "Vault should contain frontier facts");

  const categories = new Set(TOP_100_FRONTIER_VAULT.map((f) => f.category));
  assert.ok(categories.has("Guidelines_2024"), "Must have Guidelines_2024 category");
  assert.ok(categories.has("Biostatistics"), "Must have Biostatistics category");
  assert.ok(categories.has("Cytogenetics"), "Must have Cytogenetics category");
  assert.ok(categories.has("Antidotes_DOC"), "Must have Antidotes_DOC category");
  assert.ok(categories.has("Scores_Thresholds"), "Must have Scores_Thresholds category");

  // Every fact must have valid fields
  for (const f of TOP_100_FRONTIER_VAULT) {
    assert.ok(f.title, "Must have title");
    assert.ok(f.mustKnowPill, "Must have mustKnowPill");
    assert.ok(f.examinerTrap, "Must have examinerTrap");
    assert.ok(f.tags.length > 0, "Must have tags");
  }
});

test("CoreBTR Prescription Engine: generates mixed daily AIR < 100 queue", async () => {
  const prescription = await generateAIR100Prescription();
  assert.ok(prescription.length > 0, "Should generate non-empty prescription queue");
  // Check that frontier questions are present
  const frontierItem = prescription.find((q) => q.id.startsWith("prescription_frontier_"));
  assert.ok(frontierItem, "Prescription should include Top-100 Frontier tie-breaker items");
});
