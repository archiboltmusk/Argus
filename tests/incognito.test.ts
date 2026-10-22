import assert from "node:assert/strict";
import test from "node:test";
import { isIncognito, setIncognito } from "../src/lib/incognito";

test("incognito toggles in memory even without storage", () => {
  assert.equal(isIncognito(), false);
  setIncognito(true);
  assert.equal(isIncognito(), true);
  setIncognito(false);
  assert.equal(isIncognito(), false);
});
