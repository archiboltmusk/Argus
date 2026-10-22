import assert from "node:assert/strict";
import test from "node:test";
import { newCustomFilter, resolveFilterName } from "../src/lib/streams/custom-filters.ts";

test("unnamed filter is saved under a summary of its criteria", () => {
  const f = { ...newCustomFilter(""), resolution: ["4K" as const], source: ["BluRay" as const] };
  assert.equal(resolveFilterName(f), "4K / BluRay");
});

test("explicit name wins and empty filters get a default name", () => {
  assert.equal(resolveFilterName(newCustomFilter("  Mine ")), "Mine");
  assert.equal(resolveFilterName(newCustomFilter("")), "My filter");
});
