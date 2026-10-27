import assert from "node:assert/strict";
import test from "node:test";
import { classifyInicetQuestion } from "../src/lib/education/inicet-classifier";

test("identifies factual single-liner as Level 1 Recall", () => {
  const q = "Which of the following is true regarding spinal and epidural anesthesia?";
  const opts = ["Option A", "Option B", "Option C", "Option D"];
  const res = classifyInicetQuestion(q, opts, false);

  assert.equal(res.depthLevel, "L1_Recall");
  assert.equal(res.format, "SingleBestAnswer");
  assert.equal(res.isVignette, false);
});

test("identifies complex clinical patient presentation as Level 3 Multi-Step Vignette", () => {
  const q =
    "A 45-year-old male with a history of hypertension presents with severe crushing retrosternal chest pain radiating to the left jaw. On examination, BP is 90/60 mmHg and pulse is 110/min. ECG shows ST elevation in leads II, III, and aVF. What is the most appropriate next step in management?";
  const opts = ["Primary PCI", "Thrombolysis with Streptokinase", "IV Beta blockers", "Sublingual Nitrates"];
  const res = classifyInicetQuestion(q, opts, false);

  assert.equal(res.depthLevel, "L3_MultiStepClinical");
  assert.equal(res.isVignette, true);
  assert.ok(res.clinicalKeywordsFound.includes("year-old"));
  assert.ok(res.clinicalKeywordsFound.includes("on examination"));
});

test("identifies Assertion-Reasoning format as Level 4 INICET Trap", () => {
  const q =
    "Assertion (A): Ketamine is preferred in asthmatic patients undergoing general anesthesia. Reason (R): Ketamine causes bronchodilation via sympathomimetic release of endogenous catecholamines.";
  const opts = [
    "Both (A) and (R) are true and (R) is correct explanation of (A)",
    "Both (A) and (R) are true but (R) is not correct explanation",
    "(A) is true but (R) is false",
    "(A) is false but (R) is true",
  ];
  const res = classifyInicetQuestion(q, opts, false);

  assert.equal(res.depthLevel, "L4_InicetTrap");
  assert.equal(res.format, "AssertionReasoning");
});

test("identifies question with image as Level 2 Spotter", () => {
  const q = "Identify the histopathological finding marked by the arrow:";
  const opts = ["Aschoff body", "Reed-Sternberg cell", "Psammoma body", "Councilman body"];
  const res = classifyInicetQuestion(q, opts, true);

  assert.equal(res.depthLevel, "L2_ImageSpotter");
  assert.equal(res.format, "ImageSpotter");
});
