// @ts-expect-error Node test types are outside the browser tsconfig.
import assert from "node:assert/strict";
// @ts-expect-error Node test types are outside the browser tsconfig.
import { readFileSync } from "node:fs";
// @ts-expect-error Node test types are outside the browser tsconfig.
import test from "node:test";

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
test("beta 0.9.128 version metadata and offline notes agree", () => {
  const pkgVersion = JSON.parse(read("package.json")).version;
  assert.equal(JSON.parse(read("src-tauri/tauri.conf.json")).version, pkgVersion);
  const notes = JSON.parse(read("src/lib/updater/bundled-release-notes.json")).notes;
  assert.equal(notes["0.9.128"].title, "Argus Beta 0.9.128");
  assert.ok(notes["0.9.127"]);
  assert.doesNotMatch(JSON.stringify(notes["0.9.128"]), /argussystem\.online/);
});
