import assert from "node:assert/strict";
import test from "node:test";
import { createExperiment, exportLabState, importLabState } from "../src/lib/argus-lab.ts";

test("Lab export and import preserve only valid bounded settings", () => {
  const value = exportLabState({ mode: "reliable", contract: { "auto-switch": true, "external-ai": false, telemetry: false, "auto-install": false }, experiments: [{ id: "x", name: "Source ranking", enabled: true, createdAt: 1 }] });
  assert.deepEqual(importLabState(value)?.experiments.map((item) => item.name), ["Source ranking"]);
  assert.equal(importLabState('{"version":2}') , null);
});

test("Lab experiment names are normalized and bounded", () => {
  assert.deepEqual(createExperiment("  Safer   autoplay  ", 1), { id: "lab-1", name: "Safer autoplay", enabled: false, createdAt: 1 });
  assert.equal(createExperiment(""), null);
  assert.equal(createExperiment("x".repeat(81)), null);
});
