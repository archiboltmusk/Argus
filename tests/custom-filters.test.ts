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

import { activeCustomFilter, applyCustomFilter } from "../src/lib/streams/custom-filters.ts";

const stream = (resolution: string) => ({ resolution }) as never;

test("active filter is ignored when empty or unknown", () => {
  const empty = newCustomFilter("e");
  assert.equal(activeCustomFilter([empty], empty.id), null);
  assert.equal(activeCustomFilter([empty], "nope"), null);
});

test("applyCustomFilter narrows to matches and falls back when none match", () => {
  const f = { ...newCustomFilter("4k"), resolution: ["4K" as const] };
  const list = [stream("4K"), stream("1080p")];
  const hit = applyCustomFilter(list, f);
  assert.deepEqual(hit.streams, [list[0]]);
  assert.equal(hit.fellBack, false);
  const miss = applyCustomFilter([list[1]], f);
  assert.deepEqual(miss.streams, [list[1]]);
  assert.equal(miss.fellBack, true);
  assert.equal(applyCustomFilter(list, null).streams, list);
});
