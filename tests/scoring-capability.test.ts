// @ts-expect-error Node test types are intentionally outside the browser-only tsconfig.
import assert from "node:assert/strict";
// @ts-expect-error Node test types are intentionally outside the browser-only tsconfig.
import test from "node:test";
import { capabilityAdjust } from "../src/lib/streams/scoring/scoring-capability.ts";

const stream = (hdrFormat: string | null) => ({ hdrFormat }) as never;

test("no capabilities or no HDR leaves the score alone", () => {
  assert.equal(capabilityAdjust(stream("HDR10"), undefined), null);
  assert.equal(capabilityAdjust(stream(null), { hdrDisplay: false, engine: "mpv" }), null);
});

test("SDR display cancels the HDR bonus and a little more", () => {
  const r = capabilityAdjust(stream("HDR10"), { hdrDisplay: false, engine: "mpv" });
  assert.ok(r && r.delta < -5);
});

test("HDR display on mpv keeps the bonus", () => {
  assert.equal(capabilityAdjust(stream("DV+HDR10"), { hdrDisplay: true, engine: "mpv" }), null);
  assert.equal(capabilityAdjust(stream("DV"), { hdrDisplay: true, engine: "mpv" }), null);
});

test("profile 5 style DV is demoted hard on the web engine only", () => {
  const web = capabilityAdjust(stream("DV"), { hdrDisplay: true, engine: "html5" });
  assert.ok(web && web.delta <= -16);
  assert.equal(capabilityAdjust(stream("DV+HDR10"), { hdrDisplay: true, engine: "html5" }), null);
});
