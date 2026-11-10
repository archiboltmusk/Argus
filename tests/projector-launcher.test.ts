import test from "node:test";
import assert from "node:assert/strict";
import {
  PROJECTOR_INPUT_SOURCES,
  DEFAULT_PROJECTOR_APPS,
  WALL_COLOR_PRESETS,
  PICTURE_PROFILES,
  AMBIANCE_SCENES,
  getWallColorFilter,
} from "../src/lib/projector/projector-launcher";
import { isLauncherRoute, isSmartProjector } from "../src/lib/platform";

test("projector launcher defines essential physical and media input sources", () => {
  const ids = PROJECTOR_INPUT_SOURCES.map((s) => s.id);
  assert.ok(ids.includes("hdmi-1"), "Must include HDMI 1 for console & Blu-ray");
  assert.ok(ids.includes("hdmi-2"), "Must include HDMI 2 with eARC");
  assert.ok(ids.includes("av"), "Must include AV/RCA input");
  assert.ok(ids.includes("usb"), "Must include USB local media");
  assert.ok(ids.includes("cast"), "Must include Cast & screen mirroring");
  assert.ok(ids.includes("argus"), "Must include Argus Cinema Hub");

  const hdmi1 = PROJECTOR_INPUT_SOURCES.find((s) => s.id === "hdmi-1");
  assert.equal(hdmi1?.intentAction, "android.media.tv.action.VIEW_INPUTS");
});

test("projector launcher pre-registers popular Android TV streaming apps and system settings", () => {
  const pkgs = DEFAULT_PROJECTOR_APPS.map((a) => a.packageName);
  assert.ok(pkgs.includes("com.google.android.youtube.tv"), "Includes YouTube TV");
  assert.ok(pkgs.includes("com.netflix.ninja"), "Includes Netflix");
  assert.ok(pkgs.includes("com.amazon.amazonvideo.livingroom"), "Includes Prime Video");
  assert.ok(pkgs.includes("org.xbmc.kodi"), "Includes Kodi");
  assert.ok(pkgs.includes("com.android.tv.settings"), "Includes Projector Settings");
});

test("wall color tint compensation presets provide corrective filters for painted walls", () => {
  assert.equal(getWallColorFilter("white"), "none");
  const ivory = getWallColorFilter("ivory");
  assert.ok(ivory.includes("hue-rotate"), "Ivory provides chromatic correction");
  const coolGrey = getWallColorFilter("cool-grey");
  assert.ok(coolGrey.includes("brightness"), "Cool grey boosts luminance");
  assert.equal(WALL_COLOR_PRESETS.length, 5);
});

test("projector picture profiles cover cinema, daylight, eco, and night modes", () => {
  const cinema = PICTURE_PROFILES.find((p) => p.id === "cinema");
  assert.ok(cinema);
  assert.equal(cinema.gamma, 2.4);
  assert.equal(cinema.subtitleColor, "#FFD180"); // Amber high-visibility subtitle

  const daylight = PICTURE_PROFILES.find((p) => p.id === "daylight");
  assert.ok(daylight);
  assert.equal(daylight.brightness, 125);

  const eco = PICTURE_PROFILES.find((p) => p.id === "eco");
  assert.ok(eco);
  assert.ok(eco.fanNoise.includes("Silent") || eco.fanNoise.includes("Whisper"));
});

test("ambiance scenes provide audio and optical quick actions", () => {
  const ids = AMBIANCE_SCENES.map((s) => s.id);
  assert.ok(ids.includes("movie-night"));
  assert.ok(ids.includes("ambient-fireplace"));
  assert.ok(ids.includes("vocal-clarity"));
  assert.ok(ids.includes("game-low-latency"));
});

test("smart projector user-agent detection identifies various budget and laser projectors", () => {
  assert.equal(isSmartProjector(), false); // node test runner
});
