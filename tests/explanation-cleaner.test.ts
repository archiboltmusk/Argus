import assert from "node:assert/strict";
import test from "node:test";
import { cleanExplanationPayload } from "../src/lib/education/explanation-cleaner.ts";

test("cleans HTML artifacts, telegram tags, span wrappers and separates distractors", () => {
  const rawHtml = `<p><strong>Correct answer: B. Umbilical cord compression</strong></p>
<p><strong>Correct Answer: B) <span class="customMeta" data-dictid="9cc3973459169277720194a0847477">Umbilical</span> cord compression </strong></p>
<p><strong>Explanation:</strong></p>
<ul>
  <li>Variable decelerations are abrupt drops in FHR, often "V" or "W" shaped.</li>
  <li>Occur independent of contractions and indicate umbilical cord compression.</li>
</ul>
<p><strong>Incorrect Options:</strong></p>
<ul>
  <li><strong>Option A) Fetal hypoxia:</strong> Hypoxia is a consequence, not a specific deceleration pattern.</li>
  <li><strong>Option C) Fetal head compression:</strong> Causes early decelerations mirroring contractions.</li>
  <li><strong>Option D) Uteroplacental insufficiency:</strong> Causes late decelerations.</li>
</ul>
<br/><br/><strong>Reference:</strong> <p>Williams Obstetrics, 26th Edition, Page 448 </p> <p>@neet_pg_bot</p>`;

  const result = cleanExplanationPayload(rawHtml);

  // Checks
  assert.equal(result.correctRationale.includes("<span"), false, "No customMeta spans left");
  assert.equal(result.correctRationale.includes("@neet_pg_bot"), false, "No telegram handles in rationale");
  assert.equal(result.correctRationale.includes("Variable decelerations are abrupt drops"), true);
  
  // Distractor breakdown extracted
  assert.equal(result.distractorBreakdown.length, 3, "Extracted 3 incorrect options");
  assert.equal(result.distractorBreakdown[0].option, "Option A");
  assert.equal(result.distractorBreakdown[0].reason.includes("Hypoxia is a consequence"), true);
  
  // Reference extracted
  assert.equal(result.reference?.includes("Williams Obstetrics, 26th Edition"), true);
});
