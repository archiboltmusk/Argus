import "./_localstorage-stub.ts";
import test from "node:test";
import assert from "node:assert/strict";
import {
  LocalhostGhostHarvester,
} from "../src/lib/network/localhost-ghost-harvester.ts";

test("LocalhostGhostHarvester performs non-blocking silent probes without throwing", async () => {
  const harvester = LocalhostGhostHarvester.getInstance();

  // Probing offline ports must return quickly and cleanly without crashing or throwing
  const start = Date.now();
  const items = await harvester.probeAndHarvest();
  const elapsed = Date.now() - start;

  assert.ok(Array.isArray(items), "Must return array of harvested items");
  assert.ok(elapsed < 2000, "Probes must complete rapidly under concurrency");
});

test("LocalhostGhostHarvester filters harvested items by query and mediaType", () => {
  const harvester = LocalhostGhostHarvester.getInstance();

  const results = harvester.searchHarvested("feluda", "book");
  assert.ok(Array.isArray(results));
});
