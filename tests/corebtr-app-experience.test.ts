import test from "node:test";
import assert from "node:assert/strict";
import {
  BTR_TOPIC_WISE_QBANK,
  BTR_PEARLS_DATABASE,
} from "../src/lib/education/btr-pearls-data";
import { BTR_GOAL_PRESETS } from "../src/components/education/btr-goal-selector-modal";

test("CoreBTR App Look & Structure: verifies topic-wise QBank and high-yield pearls", () => {
  // Radiology topics
  const radTopics = BTR_TOPIC_WISE_QBANK["radiology"];
  assert.ok(Array.isArray(radTopics), "Radiology topics must be indexed");
  assert.ok(radTopics.length >= 6, "Must contain all 6 core radiology topic modules");
  assert.equal(radTopics[0].name, "General Radiology");

  // Orthopedics high-yield pearls
  const orthoPearls = BTR_PEARLS_DATABASE["orthopedics"];
  assert.ok(Array.isArray(orthoPearls), "Orthopedics pearls must be indexed");
  assert.ok(orthoPearls.length >= 10, "Must contain comprehensive ortho pearls matching app");
  assert.match(orthoPearls[0].code, /^P-\d+$/, "Pearl code must match official P-XXXXXXXX format");
  assert.equal(orthoPearls[0].title, "Special Tests for Knee Ligament and Meniscal Injuries");

  // Goal Selector presets
  assert.ok(BTR_GOAL_PRESETS.length >= 4, "Must cover Combined, INI-CET, NEET-PG, and FMGE");
  const inicet = BTR_GOAL_PRESETS.find((g) => g.id === "inicet");
  assert.ok(inicet, "INI-CET preset must be present");
  assert.equal(inicet?.markingScheme, "+1 Correct, -0.33 Negative");
});
