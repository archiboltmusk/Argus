import assert from "node:assert/strict";
import test from "node:test";
import { DEFAULT } from "../src/lib/settings/defaults";
import { passthroughMpvLines, sanitizePassthroughCodecs } from "../src/lib/player/passthrough";
import { compileMpvOptions, zeroCopyHwdecLines } from "../src/lib/player/mpv-tuning";

test("passthrough is off by default and adds nothing", () => {
  assert.deepEqual(passthroughMpvLines(DEFAULT), []);
  assert.equal(compileMpvOptions(DEFAULT).includes("audio-spdif"), false);
});

test("passthrough lists only the chosen codecs, in a fixed order", () => {
  const lines = passthroughMpvLines({ mpvPassthrough: true, mpvPassthroughCodecs: ["truehd", "ac3", "bogus" as never] });
  assert.deepEqual(lines, ["audio-spdif=ac3,truehd"]);
  assert.deepEqual(passthroughMpvLines({ mpvPassthrough: true, mpvPassthroughCodecs: [] }), []);
  assert.deepEqual(sanitizePassthroughCodecs("nope"), ["ac3", "eac3", "dts-hd", "truehd"]);
});

test("passthrough reaches the compiled mpv options when enabled", () => {
  const out = compileMpvOptions({ ...DEFAULT, mpvPassthrough: true });
  assert.match(out, /audio-spdif=ac3,eac3,dts-hd,truehd/);
});

test("zero-copy picks direct VideoToolbox on a Mac and the non-copy list elsewhere", () => {
  const on = { mpvZeroCopy: true, mpvHwdec: "auto" } as const;
  assert.deepEqual(zeroCopyHwdecLines(on, true), ["hwdec=videotoolbox"]);
  assert.deepEqual(zeroCopyHwdecLines(on, false), ["hwdec=auto-safe"]);
  assert.deepEqual(zeroCopyHwdecLines({ mpvZeroCopy: true, mpvHwdec: "off" }, true), []);
  assert.deepEqual(zeroCopyHwdecLines({ mpvZeroCopy: false, mpvHwdec: "auto" }, true), []);
});
