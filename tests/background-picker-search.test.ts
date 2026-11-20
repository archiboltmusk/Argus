// @ts-expect-error Node types are outside the browser tsconfig.
import assert from "node:assert/strict";
// @ts-expect-error Node types are outside the browser tsconfig.
import test from "node:test";
import {
  keepPickerSearch,
  cancelPickerSearch,
} from "../src/lib/player/background-picker-search.ts";

test("retained searches are canceled by replacement or their owning player", () => {
  const first = new AbortController();
  const second = new AbortController();
  keepPickerSearch("first", first);
  keepPickerSearch("second", second);
  assert.equal(first.signal.aborted, true);
  cancelPickerSearch("first");
  assert.equal(second.signal.aborted, false);
  cancelPickerSearch("second");
  assert.equal(second.signal.aborted, true);
});
