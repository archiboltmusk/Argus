import { test } from "node:test";
import assert from "node:assert";
import {
  getQuestionPhase,
  getQuestionSystem,
  inferQuestionAttributes,
  enrichQuestionWithTaxonomy,
} from "../src/lib/education/btr-taxonomy.ts";
import {
  resolveQuestionSynapse,
  SYNAPSE_KNOWLEDGE_NODES,
} from "../src/lib/education/btr-synapse.ts";
import type { ClinicalQuestion } from "../src/lib/education/qbank-types.ts";

const MOCK_QUESTION: ClinicalQuestion = {
  id: "test_q_01",
  subject: "Medicine",
  topic: "Rheumatic Mitral Stenosis",
  vignette: "A 28-year-old pregnant woman at 30 weeks gestation presents with sudden-onset dyspnea, orthopnea, and palpitations. On auscultation, a loud S1 and mid-diastolic rumbling murmur with an opening snap are heard at the apex. ECG shows notched P waves (P-mitrale). Which of the following is the most appropriate initial management?",
  options: [
    "Intravenous Furosemide and Beta-blocker rate control",
    "Immediate emergency Cesarean delivery under general anesthesia",
    "High-dose Digoxin monotherapy",
    "Warfarin anticoagulation targeting INR 3.0",
  ],
  correctIndex: 0,
  examinerTrap: "Warfarin is teratogenic in pregnancy (especially 1st trimester and near term, risking fetal intracerebral hemorrhage). Avoid Warfarin near term; use Heparin/LMWH.",
  explanation: {
    correctRationale: "Mitral stenosis decompensates characteristically between 28-32 weeks of gestation due to 50% increase in circulating blood volume and physiological tachycardia shortening diastolic filling time.",
    distractorBreakdown: [
      {
        option: "A",
        reason: "Correct: Diuretics decrease pulmonary venous congestion, and beta-blockers slow HR to prolong diastolic filling.",
      },
      {
        option: "B",
        reason: "Incorrect: Acute pulmonary edema must be stabilized medically before any obstetric intervention.",
        inversionScenario: "Would be indicated if there was refractory catastrophic maternal hemodynamic collapse with a viable fetus.",
      },
      {
        option: "C",
        reason: "Incorrect: Digoxin is inadequate for rapid rate control during hyperdynamic gestational surges.",
        inversionScenario: "Would be an adjunct in patients with concomitant left ventricular systolic dysfunction.",
      },
      {
        option: "D",
        reason: "Incorrect: Warfarin crosses placenta and causes fetal embryopathy and bleeding.",
        inversionScenario: "Would be the standard DOC in non-pregnant mechanical valve recipients.",
      },
    ],
    bottomLine: "Mitral stenosis in pregnancy decompensates at 28-32 weeks. Initial therapy is IV diuretics and beta-blockers. Warfarin is contraindicated near term.",
    whyCorrect: {
      mechanism: "Tachycardia impairs diastolic filling across the narrowed mitral orifice, leading to retrograde hydrostatic pulmonary congestion.",
      clinicalRule: "Target maternal resting heart rate between 70-80 bpm using cardioselective beta-1 blockers (e.g. Metoprolol).",
    },
    comparisonTable: {
      title: "Valvular Lesions in Pregnancy Risk Matrix",
      headers: ["Lesion", "Maternal Risk", "Pathophysiology", "Management"],
      rows: [
        ["Mitral Stenosis", "High (Class IV)", "Tachycardia reduces diastolic filling", "Beta-blocker + Diuretic"],
        ["Aortic Stenosis", "High (Class IV)", "Fixed cardiac output", "Activity restriction + Valve repair"],
        ["Mitral Regurgitation", "Low / Well Tolerated", "Decreased SVR favors forward flow", "Conservative"],
      ],
    },
    citations: [
      { textbook: "Harrison's Principles of Internal Medicine", chapter: "Valvular Heart Disease", edition: "21st" },
      { textbook: "Dutta's Textbook of Obstetrics", chapter: "Heart Disease in Pregnancy", edition: "10th" },
    ],
  },
  highYieldTags: ["#Cardiology", "#OBGYN_CrossLink", "#HighYieldRepeat", "#ClinicalVignette"],
  imagingMeta: {
    normalCaption: "Normal left atrial and ventricular contours on chest radiograph",
    abnormalCaption: "Straightening of left heart border and double contour due to left atrial enlargement",
    annotations: [
      { id: "a1", label: "Left Atrial Border", x: 45, y: 52, description: "Straightening of left cardiac border" },
      { id: "a2", label: "Carinal Widening", x: 50, y: 38, description: "Subcarinal angle > 90 degrees" },
    ],
  },
};

test("Phase 1: 4-Tier Medical Taxonomy Engine classifies phases, systems and attributes correctly", () => {
  // Phase mapping
  assert.strictEqual(getQuestionPhase("Anatomy"), "Pre-Clinical");
  assert.strictEqual(getQuestionPhase("Pathology"), "Para-Clinical");
  assert.strictEqual(getQuestionPhase("Medicine"), "Clinical-2");
  assert.strictEqual(getQuestionPhase("Integrated CVS"), "Integrated");

  // System mapping
  assert.strictEqual(getQuestionSystem("Medicine", "Rheumatic Mitral Stenosis", MOCK_QUESTION.vignette), "Cardiovascular");
  assert.strictEqual(getQuestionSystem("Pathology", "Epidural Hematoma", "Presents with lucid interval and CT biconvex hyperdensity"), "Central Nervous");
  assert.strictEqual(getQuestionSystem("Medicine", "COPD Exacerbation", "GOLD 2024 Group E classification"), "Respiratory");

  // Attribute inference
  const attrs = inferQuestionAttributes(MOCK_QUESTION);
  assert.ok(attrs.includes("ClinicalVignette"), "Should identify clinical vignette structure");
  assert.ok(attrs.includes("ExaminerTrap"), "Should identify examiner trap");
  assert.ok(attrs.includes("HighYieldRepeat"), "Should identify high yield repeat tag");

  // Enrichment
  const enriched = enrichQuestionWithTaxonomy(MOCK_QUESTION);
  assert.strictEqual(enriched.taxonomy.phase, "Clinical-2");
  assert.strictEqual(enriched.taxonomy.system, "Cardiovascular");
  assert.strictEqual(enriched.taxonomy.subject, "Medicine");
});

test("Phase 2: 5-Tier Clinical Autopsy schema preserves mechanism, distractor inversions and citations", () => {
  const exp = MOCK_QUESTION.explanation;
  assert.ok(exp.bottomLine.length > 20, "Must have bottomLine");
  assert.ok(exp.whyCorrect?.mechanism, "Must have mechanism rationale");
  assert.ok(exp.whyCorrect?.clinicalRule, "Must have clinical pearl rule");

  // Distractor Inversion verification
  assert.strictEqual(exp.distractorBreakdown.length, 4);
  const optB = exp.distractorBreakdown.find((d) => d.option === "B");
  assert.ok(optB?.inversionScenario, "Distractor B must have an inversion scenario");
  assert.ok(optB?.inversionScenario?.includes("hemodynamic collapse"));

  // Comparison Table
  assert.ok(exp.comparisonTable?.headers.length === 4);
  assert.ok(exp.comparisonTable?.rows.length === 3);

  // Textbook Citations
  assert.strictEqual(exp.citations?.length, 2);
  assert.strictEqual(exp.citations?.[0].textbook, "Harrison's Principles of Internal Medicine");
});

test("Phase 3: Interactive Imaging metadata contains normal comparative view and annotations", () => {
  const meta = MOCK_QUESTION.imagingMeta;
  assert.ok(meta, "Imaging metadata must exist");
  assert.ok(meta?.normalCaption, "Must have normal comparative caption");
  assert.ok(meta?.abnormalCaption, "Must have abnormal lesion caption");
  assert.strictEqual(meta?.annotations?.length, 2, "Must contain labeled annotations");
  assert.strictEqual(meta?.annotations?.[0].label, "Left Atrial Border");
});

test("Phase 4: Argus Synapse Knowledge Graph resolves video lecture timestamps and cross-links", () => {
  const synapse = resolveQuestionSynapse(MOCK_QUESTION);
  assert.ok(synapse.btrVideo, "Should resolve a BTR lecture link");
  assert.ok(synapse.btrVideo?.timestampSeconds >= 0, "Should specify a valid timestamp");
  assert.ok(synapse.btrVideo?.title.includes("CVS"), "Should map to CVS high-yield lecture");

  // Test other disease nodes in Synapse graph
  assert.ok(SYNAPSE_KNOWLEDGE_NODES["mitral_stenosis"]);
  assert.strictEqual(SYNAPSE_KNOWLEDGE_NODES["mitral_stenosis"].docOrAntidote?.doc.includes("Penicillin"), true);
  assert.ok(SYNAPSE_KNOWLEDGE_NODES["apml_leukemia"]);
  assert.strictEqual(SYNAPSE_KNOWLEDGE_NODES["apml_leukemia"].primaryPill.includes("t(15;17)"), true);
});
