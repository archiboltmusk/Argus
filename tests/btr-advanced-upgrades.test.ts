import test from "node:test";
import assert from "node:assert/strict";

import {
  estimateQuestionIRT,
  generateIRTRankSimulation,
  computeCandidateTheta,
  thetaToProjectedAIR,
} from "../src/lib/education/btr-irt-rank-simulator";

import {
  decodeCognitiveBias,
  aggregateSessionBiases,
  type CandidateResponseTelemetry,
} from "../src/lib/education/btr-cognitive-decoder";

import {
  generateMicroSurgicalDrill,
  initBTRBackendDatabase,
} from "../src/lib/education/btr-backend-service";

import type { ClinicalQuestion } from "../src/lib/education/qbank-types";

test("IRT Rank Simulator: estimates question parameters and computes projected AIR accurately", () => {
  // 1. Cardinal Sin Repeat question
  const cardinalRepeatParam = estimateQuestionIRT({
    id: "q-repeat",
    vignette: "A 45-year-old male presents with classic features. What is the DOC?",
    highYieldTags: ["cardinal_repeat", "must_know"],
  });

  assert.ok(cardinalRepeatParam.isCardinalRepeat, "High-yield repeat should be flagged as Cardinal Repeat");
  assert.ok(cardinalRepeatParam.historicalPassRateP >= 0.70, "Cardinal repeat historical pass rate should be >= 0.70");

  // 2. Frontier Decider question with trap
  const frontierParam = estimateQuestionIRT({
    id: "q-frontier",
    vignette:
      "A 62-year-old female with FIGO 2023 endometrial carcinoma staging undergoing molecular testing shows POLE mutation. According to revised FIGO criteria, what is the stage adjustment?",
    examinerTrap: "Do not upstage stage I POLE mut regardless of deep myometrial invasion.",
    highYieldTags: ["frontier", "guideline_2024"],
  });

  assert.ok(frontierParam.isFrontierDecider, "High discrimination item should be flagged as Frontier Decider");
  assert.ok(frontierParam.discriminationA >= 1.5, "Frontier decider discrimination index should be >= 1.5");

  // 3. Exam Simulation: Top Performer (Rank < 100)
  const simulatedQuestions = [
    {
      questionId: "q1",
      isCorrect: true,
      vignette: "Vignette 1",
      highYieldTags: ["cardinal_repeat"],
    },
    {
      questionId: "q2",
      isCorrect: true,
      vignette: "Vignette 2",
      examinerTrap: "Trap 2",
      highYieldTags: ["frontier"],
    },
    {
      questionId: "q3",
      isCorrect: true,
      vignette: "Vignette 3",
      highYieldTags: ["cardinal_repeat"],
    },
    {
      questionId: "q4",
      isCorrect: true,
      vignette: "Vignette 4",
      examinerTrap: "Trap 4",
      highYieldTags: ["frontier"],
    },
    {
      questionId: "q5",
      isCorrect: true,
      vignette: "Vignette 5",
      highYieldTags: ["cardinal_repeat"],
    },
  ];

  const report = generateIRTRankSimulation(simulatedQuestions);

  assert.ok(report.thetaAbility >= 1.5, `Theta should be >= 1.5 for 100% correct, got ${report.thetaAbility}`);
  assert.ok(report.projectedAIRRange.median <= 1000, `Projected median AIR should be <= 1000, got ${report.projectedAIRRange.median}`);
  assert.equal(report.cardinalRepeatsMissed, 0, "No cardinal repeats should be missed");
  assert.ok(report.frontierDecidersSecured >= 1, "Should secure frontier deciders");
  assert.ok(report.projectedNeetPercentile >= 95, `Projected percentile should be >= 95%, got ${report.projectedNeetPercentile}`);
});

test("Socratic Cognitive Decoder: detects NegativeBlindness, PrematureClosure, and Overthinking traps", () => {
  const mockBaseQuestion: ClinicalQuestion = {
    id: "diag-q1",
    subject: "Pharmacology",
    topic: "Autonomic Nervous System",
    vignette: "All of the following are indications for atropine EXCEPT:",
    options: ["Organophosphate poisoning", "Symptomatic bradycardia", "Angle-closure glaucoma", "Pre-anesthetic medication"],
    correctIndex: 2,
    explanation: {
      bottomLine: "Angle-closure glaucoma is a strict contraindication for atropine.",
      whyCorrect: {
        mechanism: "Atropine causes mydriasis which blocks the iridocorneal angle.",
        clinicalRule: "Atropine is contraindicated in glaucoma.",
      },
    },
  };

  // Case 1: Negative Stem Polarity Blindness
  const negTelemetry: CandidateResponseTelemetry = {
    question: mockBaseQuestion,
    selectedIndex: 0, // Picked OP poisoning (which is a valid indication, missing the EXCEPT)
    timeSpentSeconds: 40,
    changedMind: false,
  };
  const negDiag = decodeCognitiveBias(negTelemetry);
  assert.equal(negDiag.biasType, "NegativeBlindness", "Should detect NegativeBlindness for missed EXCEPT stem");
  assert.ok(negDiag.summary.includes("EXCEPT"), "Summary should highlight EXCEPT");

  // Case 2: Premature Closure (< 18 seconds on long stem)
  const speedQuestion: ClinicalQuestion = {
    ...mockBaseQuestion,
    vignette:
      "A 54-year-old male presents with 3 weeks of progressive exertional dyspnea, dry cough, and bilateral basilar end-inspiratory crackles. Chest radiograph reveals subpleural reticular opacities with honeycombing at the lung bases.",
  };
  const speedTelemetry: CandidateResponseTelemetry = {
    question: speedQuestion,
    selectedIndex: 1,
    timeSpentSeconds: 12, // 12 seconds on a 220-char vignette!
    changedMind: false,
  };
  const speedDiag = decodeCognitiveBias(speedTelemetry);
  assert.equal(speedDiag.biasType, "PrematureClosure", "Should detect PrematureClosure on rushed clinical vignette");

  // Case 3: Overthinking Trap (changed mind on a classic repeat)
  const repeatQuestion: ClinicalQuestion = {
    ...mockBaseQuestion,
    vignette: "A 45-year-old male with classic acute organophosphate poisoning presents to casualty. What is the definitive first-line pharmacological antidote?",
    highYieldTags: ["cardinal_repeat", "must_know"],
  };
  const overthinkTelemetry: CandidateResponseTelemetry = {
    question: repeatQuestion,
    selectedIndex: 3,
    timeSpentSeconds: 45,
    changedMind: true, // Changed mind!
  };
  const overthinkDiag = decodeCognitiveBias(overthinkTelemetry);
  assert.equal(overthinkDiag.biasType, "OverthinkingTrap", "Should detect OverthinkingTrap on changed answer for cardinal repeat");

  // Case 4: Aggregate session biases
  const sessionSummary = aggregateSessionBiases([negTelemetry, speedTelemetry, overthinkTelemetry]);
  assert.equal(sessionSummary.totalErrors, 3, "Total errors should be 3");
  assert.ok(sessionSummary.executiveActionPlan.length > 20, "Should have actionable executive plan");
});

test("Micro-Surgical Drill Healer: generates focused remediations for weak subjects", async () => {
  await initBTRBackendDatabase();

  const drillQs = await generateMicroSurgicalDrill({
    weakSubject: "Radiology",
    count: 10,
    prioritizeTrapsAndMissed: true,
  });

  assert.ok(Array.isArray(drillQs), "Should return array of questions");
  assert.ok(drillQs.length > 0, "Should return at least 1 question for weak subject");

  // Verify that all returned questions are valid ClinicalQuestions
  for (const q of drillQs) {
    assert.ok(q.id, "Question must have an id");
    assert.ok(q.vignette, "Question must have a vignette");
    assert.ok(q.options.length >= 4, "Question must have at least 4 options");
    assert.ok(q.correctIndex >= 0 && q.correctIndex < q.options.length, "Question must have valid correctIndex");
  }
});
