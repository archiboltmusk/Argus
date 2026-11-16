import assert from "node:assert/strict";
import test from "node:test";
import {
  CORE_BTR_OFFICIAL_CHANNEL,
  CORE_BTR_BROADCASTS,
} from "../src/lib/education/btr-broadcasts";
import {
  calculateBiostats,
  BTR_DRUG_OF_CHOICE_CATALOG,
  BMW_2016_RULES,
  calculateGCS,
  calculateCURB65,
} from "../src/lib/education/btr-twenty-engine";
import {
  MEGA_BTR_MARATHON_CATALOG,
  calculateMarathonPacing,
} from "../src/lib/education/btr-marathon-engine";
import {
  BTR_HIGH_YIELD_SPOTTERS,
} from "../src/lib/education/btr-spotter-engine";

test("Core BTR Official Broadcasts: covers @corebtrbyzainabvora channel & 3 PM Core Drops", () => {
  assert.equal(CORE_BTR_OFFICIAL_CHANNEL.handle, "@corebtrbyzainabvora");
  assert.ok(CORE_BTR_OFFICIAL_CHANNEL.url.includes("youtube.com/@corebtrbyzainabvora"));

  assert.ok(CORE_BTR_BROADCASTS.length >= 5, "Expected at least 5 curated broadcasts");

  // Daily 3 PM Core Drop
  const dailyDrop = CORE_BTR_BROADCASTS.find((b) => b.isDailyCoreDrop);
  assert.ok(dailyDrop, "Expected daily 3 PM core drop in catalog");
  assert.ok(dailyDrop?.keyPearls.length && dailyDrop.keyPearls.length >= 2);

  // INI-CET Recall
  const inicetRecall = CORE_BTR_BROADCASTS.find((b) => b.category === "inicet_recall");
  assert.ok(inicetRecall, "Expected INI-CET recall video in catalog");

  // Topper Blueprint
  const topper = CORE_BTR_BROADCASTS.find((b) => b.category === "topper_blueprint");
  assert.ok(topper, "Expected topper blueprint in catalog");
});

test("20th Subject Engine: calculates 2x2 biostatistics metrics accurately", () => {
  // Test case: TP=80, FP=20, FN=10, TN=90
  const metrics = calculateBiostats({ tp: 80, fp: 20, fn: 10, tn: 90 });

  // Sensitivity = 80 / (80 + 10) = 88.9%
  assert.equal(metrics.sensitivity, 88.9);

  // Specificity = 90 / (90 + 20) = 81.8%
  assert.equal(metrics.specificity, 81.8);

  // PPV = 80 / (80 + 20) = 80%
  assert.equal(metrics.ppv, 80);

  // NPV = 90 / (90 + 10) = 90%
  assert.equal(metrics.npv, 90);

  // Odds Ratio = (80 * 90) / (20 * 10) = 7200 / 200 = 36.0
  assert.equal(metrics.oddsRatio, 36);

  // NNT calculation
  assert.ok(metrics.nnt > 0);
});

test("20th Subject Engine: validates Drug of Choice (DOC) dictionary & examiner traps", () => {
  assert.ok(BTR_DRUG_OF_CHOICE_CATALOG.length >= 10);

  // Anaphylaxis
  const anaphylaxis = BTR_DRUG_OF_CHOICE_CATALOG.find((d) => d.condition.includes("Anaphylactic"));
  assert.ok(anaphylaxis);
  assert.ok(anaphylaxis?.drugOfChoice.includes("Adrenaline"));
  assert.ok(anaphylaxis?.drugOfChoice.includes("1:1000 IM"));
  assert.ok(anaphylaxis?.examinerTrap?.includes("Do NOT give 1:1000 IV"));

  // AF with WPW
  const afWpw = BTR_DRUG_OF_CHOICE_CATALOG.find((d) => d.condition.includes("WPW"));
  assert.ok(afWpw);
  assert.ok(afWpw?.drugOfChoice.includes("Procainamide"));
  assert.ok(afWpw?.examinerTrap?.includes("ABCD"));

  // Status Epilepticus
  const statusEp = BTR_DRUG_OF_CHOICE_CATALOG.find((d) => d.condition.includes("Status Epilepticus"));
  assert.ok(statusEp);
  assert.ok(statusEp?.drugOfChoice.includes("Lorazepam"));
});

test("20th Subject Engine: validates Glasgow Coma Scale (GCS) and CURB-65 pneumonia scores", () => {
  // GCS Normal (E4 V5 M6) = 15
  const gcsNormal = calculateGCS({ eye: 4, verbal: 5, motor: 6 });
  assert.equal(gcsNormal.total, 15);
  assert.equal(gcsNormal.intubationIndicated, false);
  assert.equal(gcsNormal.severity, "Minor Head Injury (GCS 13-15)");

  // GCS Comatose (E1 V1 M3) = 5 -> intubation indicated
  const gcsSevere = calculateGCS({ eye: 1, verbal: 1, motor: 3 });
  assert.equal(gcsSevere.total, 5);
  assert.equal(gcsSevere.intubationIndicated, true);
  assert.equal(gcsSevere.severity, "Severe Head Injury (GCS 3-8)");

  // CURB-65: Confusion + Age 70 = 2 -> Intermediate Risk
  const curb2 = calculateCURB65({
    confusion: true,
    ureaOver7mmol: false,
    respiratoryRateGe30: false,
    bloodPressureLow: false,
    ageGe65: true,
  });
  assert.equal(curb2.score, 2);
  assert.ok(curb2.recommendation.includes("Inpatient hospital ward"));

  // CURB-65: Low risk (score 0)
  const curb0 = calculateCURB65({
    confusion: false,
    ureaOver7mmol: false,
    respiratoryRateGe30: false,
    bloodPressureLow: false,
    ageGe65: false,
  });
  assert.equal(curb0.score, 0);
  assert.ok(curb0.recommendation.includes("outpatient"));
});

test("20th Subject Engine: Bio-Medical Waste (BMW 2016) categories are complete", () => {
  assert.equal(BMW_2016_RULES.length, 4);

  const yellow = BMW_2016_RULES.find((r) => r.color === "YELLOW");
  assert.ok(yellow?.treatmentMethod.includes("Incineration"));
  assert.ok(yellow?.wasteTypes.some((w) => w.toLowerCase().includes("anatomical")));

  const red = BMW_2016_RULES.find((r) => r.color === "RED");
  assert.ok(red?.treatmentMethod.includes("Autoclaving"));
  assert.ok(red?.wasteTypes.some((w) => w.toLowerCase().includes("catheter")));

  const white = BMW_2016_RULES.find((r) => r.color.includes("WHITE"));
  assert.ok(white?.wasteTypes.some((w) => w.toLowerCase().includes("sharps")));

  const blue = BMW_2016_RULES.find((r) => r.color.includes("BLUE"));
  assert.ok(blue?.wasteTypes.some((w) => w.toLowerCase().includes("glassware")));
});

test("Mega BTR Marathon Engine: paces 6 marathons across 72-hour revision window", () => {
  assert.equal(MEGA_BTR_MARATHON_CATALOG.length, 6);

  const pacing = calculateMarathonPacing(MEGA_BTR_MARATHON_CATALOG);
  assert.ok(pacing.totalRuntimeHours >= 20, "Total runtime should be >= 20 hours");
  assert.ok(pacing.hoursAt1_75x < pacing.hoursAt1_0x);
  assert.ok(pacing.dailyHoursAt1_75xOver3Days <= 6, "Expected manageable daily pace <= 6 hrs at 1.75x");
});

test("High-Yield Spotter Engine: indexes pathognomonic visual spotters with distractors", () => {
  assert.ok(BTR_HIGH_YIELD_SPOTTERS.length >= 8);

  // Sigmoid Volvulus
  const sigmoid = BTR_HIGH_YIELD_SPOTTERS.find((s) => s.diagnosis === "Sigmoid Volvulus");
  assert.ok(sigmoid);
  assert.ok(sigmoid?.pathognomonicSign.includes("Coffee Bean"));
  assert.ok(sigmoid?.distractorLookAlikes.includes("Cecal Volvulus"));

  // Burkitt Lymphoma
  const burkitt = BTR_HIGH_YIELD_SPOTTERS.find((s) => s.diagnosis === "Burkitt Lymphoma");
  assert.ok(burkitt);
  assert.ok(burkitt?.pathognomonicSign.includes("Starry Sky"));
  assert.ok(burkitt?.associatedGeneOrOrganism?.includes("t(8;14)"));

  // Achalasia
  const achalasia = BTR_HIGH_YIELD_SPOTTERS.find((s) => s.diagnosis.includes("Achalasia"));
  assert.ok(achalasia);
  assert.ok(achalasia?.pathognomonicSign.includes("Bird's Beak"));
});
