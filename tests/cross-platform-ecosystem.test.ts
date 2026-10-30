import test from "node:test";
import assert from "node:assert/strict";
import { isBudgetProjectorDevice, getProjectorMpvProperties, getProjectorKeystoneInsets } from "../src/lib/player/projector-mode";
import { getRecommendedPlayerEngine } from "../src/lib/platform";

test("budget projector detection identifies Portronics Beem 470, Wanbo, and Egate", () => {
  assert.equal(isBudgetProjectorDevice("Mozilla/5.0 (Linux; Android 9; Portronics Beem 470 Build/PPR1.180610.011)"), true);
  assert.equal(isBudgetProjectorDevice("Mozilla/5.0 (Linux; Android 11; Wanbo T2 Max Build/RP1A.200720.011)"), true);
  assert.equal(isBudgetProjectorDevice("Mozilla/5.0 (Linux; Android 9; Egate O9 Pro Projector)"), true);
  assert.equal(isBudgetProjectorDevice("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)"), false);
});

test("projector mode generates contrast lift, deband, and high-visibility subtitles", () => {
  const props = getProjectorMpvProperties({ enabled: true, contrastBoost: 10, gammaLift: 3 });
  assert.equal(props.contrast, "10");
  assert.equal(props.gamma, "3");
  assert.equal(props.deband, "yes");
  assert.equal(props["sub-bold"], "yes");
  assert.equal(props["sub-outline-size"], "4");

  const insets = getProjectorKeystoneInsets(6);
  assert.equal(insets.paddingTop, "6vh");
  assert.equal(insets.paddingLeft, "6vw");
});

test("recommended player engines match platform hardware capabilities across the ecosystem", () => {
  // Apple Ecosystem (iOS, iPadOS, macOS, watchOS, tvOS, visionOS)
  assert.equal(getRecommendedPlayerEngine("macos"), "mpv");
  assert.equal(getRecommendedPlayerEngine("ios"), "avplayer");
  assert.equal(getRecommendedPlayerEngine("ipados"), "avplayer");
  assert.equal(getRecommendedPlayerEngine("tvos"), "avplayer");
  assert.equal(getRecommendedPlayerEngine("visionos"), "avplayer");
  assert.equal(getRecommendedPlayerEngine("watchos"), "avplayer");

  // Android & Projectors
  assert.equal(getRecommendedPlayerEngine("android-tv"), "exoplayer");
  assert.equal(getRecommendedPlayerEngine("android-projector"), "exoplayer");
  assert.equal(getRecommendedPlayerEngine("android-phone"), "exoplayer");

  // Smart TVs
  assert.equal(getRecommendedPlayerEngine("tizen"), "tizen-avplay"); // Samsung Tizen
  assert.equal(getRecommendedPlayerEngine("webos"), "webos-media"); // LG webOS

  // Linux Desktop
  assert.equal(getRecommendedPlayerEngine("linux"), "mpv");
});
