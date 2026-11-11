import { test } from "node:test";
import assert from "node:assert/strict";
import {
  isBudgetProjectorDevice,
  getProjectorMpvProperties,
  getProjectorCssFilter,
  getProjectorKeystoneInsets,
  getProjectorHlsOptions,
} from "../src/lib/player/projector-mode.ts";
import { buildAndroidIntentUri } from "../src/lib/player/android-external-players.ts";

test("Projector Mode: Device Detection identifies smart projectors", () => {
  assert.equal(
    isBudgetProjectorDevice("Mozilla/5.0 (Linux; Android 11; Portronics Beem 470)"),
    true,
  );
  assert.equal(
    isBudgetProjectorDevice("Mozilla/5.0 (Linux; Android 10; Wanbo T2 Max)"),
    true,
  );
  assert.equal(
    isBudgetProjectorDevice("Mozilla/5.0 (Linux; Android 12; Magcubic HY300 Build/SP1A)"),
    true,
  );
  assert.equal(
    isBudgetProjectorDevice("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)"),
    false,
  );
});

test("Projector Mode: MPV Properties outputs contrast, gamma, and warm amber subtitles", () => {
  const props = getProjectorMpvProperties({
    enabled: true,
    contrastBoost: 10,
    gammaLift: 3,
  });

  assert.equal(props.contrast, "10");
  assert.equal(props.gamma, "3");
  assert.equal(props.deband, "yes");
  assert.equal(props["sub-color"], "#FFF8E7");
  assert.equal(props["sub-outline-color"], "#000000");
});

test("Projector Mode: CSS Filters computes wall contrast compensation", () => {
  const filter = getProjectorCssFilter({
    enabled: true,
    contrastBoost: 8,
    gammaLift: 2,
    wallColorTint: "ivory",
  });

  assert.ok(filter.includes("contrast(1.20)"));
  assert.ok(filter.includes("brightness(1.04)"));
  assert.ok(filter.includes("hue-rotate(-5deg)"));
});

test("Projector Mode: Keystone Insets safeguards display margins", () => {
  const insets = getProjectorKeystoneInsets(6);
  assert.equal(insets.paddingTop, "6vh");
  assert.equal(insets.paddingBottom, "6vh");
  assert.equal(insets.paddingLeft, "6vw");
  assert.equal(insets.paddingRight, "6vw");
});

test("Projector Mode: Low-RAM Hls buffer options prevent Android OOM crashes", () => {
  const hlsOpts = getProjectorHlsOptions();
  assert.equal(hlsOpts.maxBufferSize, 24 * 1024 * 1024);
  assert.equal(hlsOpts.maxBufferLength, 20);
  assert.equal(hlsOpts.backBufferLength, 8);
  assert.equal(hlsOpts.enableWorker, true);
});

test("Android External Players: Intent builder creates valid View intent", () => {
  const intent = buildAndroidIntentUri(
    "https://stream.example.com/movie.mkv",
    "com.brouken.player",
    {
      title: "Inception (2010)",
      startPositionMs: 45000,
      subtitleUrl: "https://subs.example.com/en.vtt",
    },
  );

  assert.ok(intent.startsWith("intent:#Intent;action=android.intent.action.VIEW"));
  assert.ok(intent.includes("package=com.brouken.player"));
  assert.ok(intent.includes("i.position=45000"));
  assert.ok(intent.includes("S.title=Inception%20(2010)"));
  assert.ok(intent.endsWith(";end"));
});

test("Smart Projector Boot: GamepadRunner avoids unpolyfilled replaceAll for Chrome 74-84 compatibility", async () => {
  const fs = await import("node:fs");
  const code = fs.readFileSync(new URL("../src/components/gamepad-runner.tsx", import.meta.url), "utf8");
  assert.equal(code.includes(".replaceAll("), false, "GamepadRunner must not use .replaceAll() directly");
  assert.ok(code.includes(".replace(/:hover/g"), "GamepadRunner must use RegExp replacement");
});

test("Smart Projector Boot: index-tv.html includes runtime polyfills for legacy Android WebViews", async () => {
  const fs = await import("node:fs");
  const html = fs.readFileSync(new URL("../index-tv.html", import.meta.url), "utf8");
  assert.ok(html.includes("String.prototype.replaceAll"));
  assert.ok(html.includes("Array.prototype.at"));
  assert.ok(html.includes("Object.hasOwn"));
  assert.ok(html.includes("Promise.allSettled"));
  assert.ok(html.includes("structuredClone"));
  assert.ok(html.includes("crypto.randomUUID"));
  assert.ok(html.includes("__argusBootErrors"));
});
