// @ts-expect-error Node test types are intentionally outside the browser-only tsconfig.
import assert from "node:assert/strict";
// @ts-expect-error Node test types are intentionally outside the browser-only tsconfig.
import test from "node:test";
import { isNzbLink } from "../src/lib/debrid/torbox-cloud.ts";

test("only http and https links are accepted for NZB downloads", () => {
  assert.equal(isNzbLink("https://example.test/get/abc.nzb"), true);
  assert.equal(isNzbLink("  http://example.test/a.nzb  "), true);
  assert.equal(isNzbLink("file:///etc/passwd"), false);
  assert.equal(isNzbLink("magnet:?xt=urn:btih:abc"), false);
  assert.equal(isNzbLink("not a link"), false);
  assert.equal(isNzbLink(""), false);
});
