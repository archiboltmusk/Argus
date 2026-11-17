import assert from "node:assert/strict";
import test from "node:test";
import {
  buildNEETPGSectionConfigs,
  initSectionalPacingState,
  computePacingRadar,
  lockAndAdvanceSection,
} from "../src/lib/education/btr-sectional-pacing";
import {
  searchTriLinkOmni,
} from "../src/lib/education/btr-tri-link-search";
import {
  T_MINUS_7_PLANS,
  buildCountdownQuestionsForDay,
} from "../src/lib/education/btr-countdown-deck";
import {
  BRANCHING_CLINICAL_SCENARIOS,
} from "../src/lib/education/btr-branching-tree";
import {
  BTRLocalWarRoomMesh,
} from "../src/lib/education/btr-p2p-mesh";

test("BTR Sectional Pacing: builds NEET-PG 2024 4-section configs", () => {
  const configs = buildNEETPGSectionConfigs(200);
  assert.equal(configs.length, 4);
  assert.equal(configs[0].sectionId, "A");
  assert.equal(configs[0].startIndex, 0);
  assert.equal(configs[0].endIndex, 49);
  assert.equal(configs[0].totalQuestions, 50);
  assert.equal(configs[0].timeLimitSeconds, 2520); // 42 minutes

  assert.equal(configs[3].sectionId, "D");
  assert.equal(configs[3].startIndex, 150);
  assert.equal(configs[3].endIndex, 199);
  assert.equal(configs[3].totalQuestions, 50);
});

test("BTR Sectional Pacing: telemetry accurately calculates pacing drift and warning bells", () => {
  const configs = buildNEETPGSectionConfigs(200);
  const secA = configs[0];

  // At Question 10 (ideal = 10 * 50.4 = 504s), elapsed = 504s -> drift = 0s (optimal)
  const telOptimal = computePacingRadar({
    sectionConfig: secA,
    currentQuestionIndex: 9,
    sectionElapsedSeconds: 504,
  });
  assert.equal(telOptimal.pacingStatus, "optimal");
  assert.equal(telOptimal.driftSeconds, 0);

  // Behind by 60s -> falling_behind
  const telBehind = computePacingRadar({
    sectionConfig: secA,
    currentQuestionIndex: 9,
    sectionElapsedSeconds: 564,
  });
  assert.equal(telBehind.pacingStatus, "falling_behind");

  // Critical deficit (behind by 150s)
  const telCritical = computePacingRadar({
    sectionConfig: secA,
    currentQuestionIndex: 9,
    sectionElapsedSeconds: 654,
  });
  assert.equal(telCritical.pacingStatus, "critical_time_deficit");

  // 1-minute warning bell
  const telWarning = computePacingRadar({
    sectionConfig: secA,
    currentQuestionIndex: 48,
    sectionElapsedSeconds: 2470, // 50s remaining (< 60s)
  });
  assert.equal(telWarning.warningBellTriggered, "1_min_warning");
});

test("BTR Sectional Pacing: lockAndAdvanceSection irreversibly locks sections", () => {
  const configs = buildNEETPGSectionConfigs(200);
  const state0 = initSectionalPacingState();

  assert.equal(state0.currentSectionId, "A");
  assert.equal(state0.sectionStates.A.isLocked, false);
  assert.equal(state0.sectionStates.B.isLocked, true);

  // Advance from A to B
  const step1 = lockAndAdvanceSection(state0, configs);
  assert.equal(step1.nextState.currentSectionId, "B");
  assert.equal(step1.nextState.sectionStates.A.isLocked, true);
  assert.ok(step1.nextState.sectionStates.A.submittedAt);
  assert.equal(step1.nextState.sectionStates.B.isLocked, false);
  assert.equal(step1.nextQuestionIndex, 50);
  assert.equal(step1.isFinished, false);

  // Advance through C and D
  const step2 = lockAndAdvanceSection(step1.nextState, configs);
  const step3 = lockAndAdvanceSection(step2.nextState, configs);
  assert.equal(step3.nextState.currentSectionId, "D");

  // Final submission locks D and completes exam
  const stepFinal = lockAndAdvanceSection(step3.nextState, configs);
  assert.equal(stepFinal.isFinished, true);
  assert.equal(stepFinal.nextState.isExamComplete, true);
  assert.equal(stepFinal.nextState.sectionStates.D.isLocked, true);
});

test("BTR Tri-Link Multimodal Search: queries chapters, vault pearls, and questions", async () => {
  const result = await searchTriLinkOmni("syndrome", 5);
  assert.equal(result.query, "syndrome");
  assert.ok(result.totalMatches > 0);
  assert.ok(Array.isArray(result.chapters));
  assert.ok(Array.isArray(result.frontierPearls));
  assert.ok(Array.isArray(result.questions));
  assert.ok(result.executionTimeMs >= 0);
});

test("BTR T-Minus 7 Days Deck: provides 7 daily plans and builds curated question sets", () => {
  assert.equal(T_MINUS_7_PLANS.length, 7);
  const day7Plan = T_MINUS_7_PLANS.find((p) => p.dayNumber === 7);
  assert.ok(day7Plan);
  assert.ok(day7Plan.mustMemorizePills.length >= 3);

  const questionsDay7 = buildCountdownQuestionsForDay(7);
  assert.ok(questionsDay7.length > 0);
  const q0 = questionsDay7[0];
  assert.ok(q0.id.startsWith("tminus-7-"));
  assert.equal(q0.options.length, 4);
  assert.equal(q0.correctIndex, 0);
  assert.ok(q0.explanation.bottomLine);
});

test("BTR Branching Clinical Trees: defines scenarios with hemodynamic vitals and stages", () => {
  assert.ok(BRANCHING_CLINICAL_SCENARIOS.length >= 2);
  const scen = BRANCHING_CLINICAL_SCENARIOS[0];
  assert.ok(scen.stages.length >= 2);
  const stage0 = scen.stages[0];
  assert.ok(stage0.patientVitals.bp);
  assert.ok(stage0.options.length >= 2);
  const trapOpt = stage0.options.find((o) => o.isFatalTrap);
  assert.ok(trapOpt, "Scenario must contain at least one fatal trap distractor for autopsy");
});

test("BTR Local War Room Mesh: initializes peer node with local broadcast channel", () => {
  const mesh = new BTRLocalWarRoomMesh("Dr. Test Aspirant");
  assert.equal(mesh.getDisplayName(), "Dr. Test Aspirant");
  assert.ok(mesh.getLocalPlayerId().startsWith("player_"));

  const session = mesh.createSession([
    {
      id: "q-test-1",
      subject: "Medicine",
      topic: "Cardiology",
      vignette: "Test stem",
      options: ["A", "B", "C", "D"],
      correctIndex: 0,
    },
  ]);
  assert.equal(session.hostPlayerId, mesh.getLocalPlayerId());
  assert.equal(session.status, "waiting");

  mesh.recordAnswer(0, true, 12);
  mesh.destroy();
});
