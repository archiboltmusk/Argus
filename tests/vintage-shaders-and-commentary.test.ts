import test from "node:test";
import assert from "node:assert/strict";
import { VINTAGE_CINEMA_PRESETS, getVintagePresetMpvArgs } from "../src/lib/player/vintage-cinema-shaders";
import { COMMENTARY_CHOICES, getCommentaryChoice, formatCommentaryMpvLoadArgs } from "../src/lib/sports/multi-commentary-switcher";
import { getTurboStreamerMpvArgs, calculateSeekRanges } from "../src/lib/streams/multi-chunk-turbo-streamer";
import { isNightCinemaActive, getNightCinemaAudioFilter, getNightCinemaSubStyle } from "../src/lib/player/night-cinema-mode";
import { shaderEntry } from "../src/lib/player/shader-catalog";

test("vintage cinema AI shader suite provides Ray 35mm B&W and Eastmancolor presets", () => {
  assert.equal(VINTAGE_CINEMA_PRESETS.length >= 4, true);

  const rayPreset = VINTAGE_CINEMA_PRESETS.find((p) => p.id === "ray-35mm-bw");
  assert.ok(rayPreset);
  assert.equal(rayPreset?.filmType, "black_and_white");

  const rayArgs = getVintagePresetMpvArgs("ray-35mm-bw");
  assert.ok(rayArgs.some((arg) => arg.name === "deband" && arg.value === "yes"));
  assert.ok(rayArgs.some((arg) => arg.name === "saturation" && arg.value === "-100"));

  const catalogEntry = shaderEntry("vintage-cinema-ray");
  assert.ok(catalogEntry);
  assert.equal(catalogEntry?.name, "Satyajit Ray 35mm Master");
});

test("multi-commentary instant switcher supports Bangla, Hindi, and English", () => {
  assert.equal(COMMENTARY_CHOICES.length >= 4, true);

  const banglaChoice = getCommentaryChoice("bengali");
  assert.equal(banglaChoice.badge, "বাংলা");
  assert.ok(banglaChoice.feedUrl?.includes("air.pc.cdn.bitgravity.com"));

  const loadArgs = formatCommentaryMpvLoadArgs(banglaChoice, 0.5);
  assert.equal(loadArgs.audioUrl, banglaChoice.feedUrl);
  assert.equal(loadArgs.delaySec, 2.0); // 1.5 default + 0.5 offset

  const tvChoice = getCommentaryChoice("broadcast_original");
  const tvLoadArgs = formatCommentaryMpvLoadArgs(tvChoice);
  assert.equal(tvLoadArgs.audioUrl, undefined);
  assert.equal(tvLoadArgs.delaySec, 0);
});

test("multi-chunk turbo streamer generates 4GB demuxer cache and range splits", () => {
  const mpvArgs = getTurboStreamerMpvArgs({ enabled: true, isUnlimitedBroadband: true });
  assert.ok(mpvArgs.includes("demuxer-max-bytes=4096MiB"));
  assert.ok(mpvArgs.includes("demuxer-readahead-secs=3600"));

  // Empty when broadband is metered
  const meteredArgs = getTurboStreamerMpvArgs({ enabled: true, isUnlimitedBroadband: false });
  assert.equal(meteredArgs.length, 0);

  // 50 GB 4K movie, seeking to 3600s in 7200s total
  const fiftyGbBytes = 50 * 1024 * 1024 * 1024;
  const ranges = calculateSeekRanges(fiftyGbBytes, 3600, 7200, 32);
  assert.equal(ranges.length, 1);
  assert.ok(ranges[0].startByte > 0);
  assert.ok(ranges[0].endByte > ranges[0].startByte);
});

test("night-owl cinema mode generates DRC filter and warm dimmed subtitle style", () => {
  assert.equal(isNightCinemaActive({ enabled: true, autoNightWindow: false }), true);
  assert.equal(isNightCinemaActive({ enabled: false }), false);

  const filterStr = getNightCinemaAudioFilter(5);
  assert.ok(filterStr.includes("acompressor=threshold=-24dB:ratio=7"));
  assert.ok(filterStr.includes("loudnorm=I=-24:LRA=6:TP=-2.0"));
  assert.ok(filterStr.includes("equalizer=f=2500"));

  const subStyle = getNightCinemaSubStyle();
  assert.equal(subStyle.color, "#FFD7A0"); // warm amber
  assert.equal(subStyle.opacity, 0.75);
});
