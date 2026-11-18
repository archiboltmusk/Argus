import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  ECG_RHYTHM_PRESETS,
  sampleECGVoltage,
  type ECGRhythmType,
} from "../src/lib/education/btr-ecg-simulator";
import {
  formatErrorVaultForAnki,
} from "../src/lib/education/btr-anki-exporter";
import type { GTErrorItem } from "../src/lib/education/btr-error-vault";
import { BRANCHING_CLINICAL_SCENARIOS } from "../src/lib/education/btr-branching-tree";
import {
  playClinicalSuccessChime,
  playExaminerTrapAlert,
  playNavBlip,
} from "../src/lib/education/btr-sound-effects";

describe("BTR Clinical Lab Upgrades & Diagnostic Simulator Suite", () => {
  it("generates mathematically consistent ECG waveforms across all clinical presets", () => {
    const rhythms: ECGRhythmType[] = [
      "normal_sinus",
      "stemi",
      "hyperkalemia",
      "vtach",
      "afib",
      "complete_heart_block",
    ];

    for (const rType of rhythms) {
      const preset = ECG_RHYTHM_PRESETS[rType];
      assert.ok(preset, `Preset definition should exist for ${rType}`);
      assert.ok(preset.heartRateBpm > 0, `Heart rate should be positive for ${rType}`);
      assert.ok(preset.highYieldClue.length > 10, `High yield pearl must be defined for ${rType}`);

      // Sample 50 points over 2 seconds
      for (let t = 0; t <= 2.0; t += 0.04) {
        const v = sampleECGVoltage(t, rType);
        assert.ok(!Number.isNaN(v), `Voltage must not be NaN at t=${t} for ${rType}`);
        assert.ok(v >= -2.0 && v <= 3.5, `Voltage ${v} must stay within physiological bounds for ${rType}`);
      }
    }
  });

  it("STEMI preset demonstrates significant ST elevation compared to normal baseline", () => {
    const stemiPreset = ECG_RHYTHM_PRESETS.stemi;
    const normalPreset = ECG_RHYTHM_PRESETS.normal_sinus;

    assert.ok(stemiPreset.stElevationMm >= 2.0, "STEMI must define significant ST elevation (>= 2mm)");
    assert.strictEqual(normalPreset.stElevationMm, 0, "Normal sinus rhythm has 0mm ST elevation");
  });

  it("formats Error Vault items into clean tab-delimited Anki flashcards", () => {
    const mockErrors: GTErrorItem[] = [
      {
        id: "err-mock-1",
        gtTitle: "Grand Test 08",
        subjectId: "medicine",
        subjectName: "General Medicine",
        questionStem: "A 55yo male presents with inferior MI and hypotension. Which drug is contraindicated?",
        myChosenAnswer: "Nitroglycerin",
        correctAnswer: "Nitroglycerin (Preload dependent RV infarct)",
        takeawayFact: "RV infarction requires preload; nitrates precipitate acute cardiovascular collapse.",
        category: "examiner_trap",
        dateLogged: "2026-11-17",
        reviewedCount: 1,
        isResolved: false,
      },
    ];

    const ankiText = formatErrorVaultForAnki(mockErrors);
    assert.ok(ankiText.includes("#separator:tab"), "Must declare Anki tab separator header");
    assert.ok(ankiText.includes("#deck:Core BTR NEET-PG 2027 Error Vault Mistake Blitz"), "Must declare deck name");
    assert.ok(ankiText.includes("General Medicine"), "Must embed subject name");
    assert.ok(ankiText.includes("Nitroglycerin"), "Must embed answer");
    assert.ok(ankiText.includes("examiner_trap"), "Must embed error category tag");

    // Must be valid tab-delimited row
    const lines = ankiText.trim().split("\n");
    const cardLine = lines[lines.length - 1];
    const columns = cardLine.split("\t");
    assert.strictEqual(columns.length, 3, "Anki card row must have exactly 3 columns (Front, Back, Tags)");
  });

  it("includes Lethal Hyperkalemia branching clinical scenario with calcium membrane shield", () => {
    const hkCase = BRANCHING_CLINICAL_SCENARIOS.find((s) => s.id === "branch-hyperkalemia-03");
    assert.ok(hkCase, "Case 3 for Hyperkalemia must exist in branching trees");
    assert.strictEqual(hkCase.stages[0].ecgRhythm, "hyperkalemia", "Stage 1 must link to hyperkalemia ECG rhythm");

    // Optimal option must be IV Calcium Gluconate
    const optimalOpt = hkCase.stages[0].options.find((o) => o.isOptimal);
    assert.ok(optimalOpt?.label.includes("Calcium Gluconate"), "Optimal action must be Calcium Gluconate");

    // Fatal trap must catch insulin or kayexalate without prior calcium membrane shield
    const fatalTraps = hkCase.stages[0].options.filter((o) => o.isFatalTrap);
    assert.ok(fatalTraps.length >= 2, "Must include at least 2 fatal traps for emergency hyperkalemia");
  });

  it("safely executes clinical sound effect calls without throwing in non-browser environment", () => {
    assert.doesNotThrow(() => playClinicalSuccessChime());
    assert.doesNotThrow(() => playExaminerTrapAlert());
    assert.doesNotThrow(() => playNavBlip());
  });
});
