// @ts-expect-error Node test types are intentionally outside the browser-only tsconfig.
import assert from "node:assert/strict";
// @ts-expect-error Node test types are intentionally outside the browser-only tsconfig.
import { readFileSync } from "node:fs";
// @ts-expect-error Node test types are intentionally outside the browser-only tsconfig.
import test from "node:test";
import { PHONE_CANVAS, PHONE_SHORT_SIDE, usesPhoneLayout } from "../src/lib/phone-layout.ts";

const phone = { android: true, tv: false, shortSide: 393, enabled: true };

test("phones get the phone layout, televisions and tablets do not", () => {
  assert.equal(usesPhoneLayout(phone), true);
  assert.equal(usesPhoneLayout({ ...phone, tv: true }), false);
  assert.equal(usesPhoneLayout({ ...phone, shortSide: 800 }), false);
  assert.equal(usesPhoneLayout({ ...phone, android: false }), false);
});

test("the setting turns it off", () => {
  assert.equal(usesPhoneLayout({ ...phone, enabled: false }), false);
});

test("index-tv.html uses the same canvas, threshold and setting name", () => {
  const html = readFileSync(new URL("../index-tv.html", import.meta.url), "utf8");
  assert.ok(html.includes(`width=${PHONE_CANVAS}`));
  assert.ok(html.includes(`< ${PHONE_SHORT_SIDE}`));
  assert.ok(html.includes("androidPhoneLayout"));
});
