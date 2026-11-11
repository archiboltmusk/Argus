import { test } from "node:test";
import assert from "node:assert/strict";
import "./_localstorage-stub.ts";

// 1. Cinema Experience Presets
import {
  applyCinemaPreset,
  getActiveCinemaPresetId,
  getActiveCinemaPreset,
  CINEMA_PRESETS,
  subscribeCinemaPreset,
  type CinemaPresetDefinition,
} from "../src/lib/cinema/cinema-experience-presets";
import { getFrameInterpolationConfig } from "../src/lib/player/frame-interpolation";
import { getSuperResolutionConfig } from "../src/lib/shaders/neural-super-resolution";
import { getSafeCinemaConfig } from "../src/lib/player/safe-cinema-shield";
import { getDanmakuConfig } from "../src/lib/danmaku/danmaku-engine";
import { getChameleonConfig } from "../src/lib/theme/chameleon-palette";

// 2. TV Remote & Gamepad Navigation
import {
  handleTVRemoteKey,
  mapGamepadButtonIndex,
  dispatchTVAction,
  subscribeTVRemoteActions,
  type TVActionEvent,
} from "../src/lib/tv/tv-remote-gamepad-engine";

// 3. QR Beam Handoff
import {
  generateBeamPayload,
  decodeAndValidateBeamPayload,
} from "../src/lib/handoff/qr-beam-handoff";

// --- 1. CINEMA PRESETS TESTS ---
test("Cinema Presets: holistic orchestration across interpolation, shaders, audio DSP, and theme", () => {
  // 1. Apply Anime Otaku Preset
  const animePreset = applyCinemaPreset("anime-otaku");
  assert.equal(animePreset.id, "anime-otaku");
  assert.equal(getActiveCinemaPresetId(), "anime-otaku");

  assert.equal(getFrameInterpolationConfig().profile, "anime-motion");
  assert.equal(getSuperResolutionConfig().profile, "anime4k-reconstruct");
  assert.equal(getDanmakuConfig().displayMode, "dense");
  assert.equal(getSafeCinemaConfig().epilepsyShieldEnabled, true);
  assert.equal(getChameleonConfig().saturationBoost, 1.4);

  // 2. Apply Late Night Silent Cinema Preset
  const silentPreset = applyCinemaPreset("late-night-silent");
  assert.equal(silentPreset.id, "late-night-silent");
  assert.equal(getFrameInterpolationConfig().profile, "off");
  assert.equal(getSuperResolutionConfig().profile, "off");
  assert.equal(getDanmakuConfig().displayMode, "off");
  assert.equal(getSafeCinemaConfig().jumpScareRadarEnabled, true);

  // 3. Apply Couch Cinema (10-ft TV)
  let notified: CinemaPresetDefinition | null = null;
  const unsub = subscribeCinemaPreset((p) => {
    notified = p;
  });

  applyCinemaPreset("couch-cinema");
  assert.equal(getActiveCinemaPreset().id, "couch-cinema");
  assert.equal(notified?.id, "couch-cinema");
  unsub();
});

// --- 2. TV REMOTE & GAMEPAD NAVIGATION TESTS ---
test("TV Remote & Gamepad: keyboard, D-pad, face buttons, and variable trigger mapping", () => {
  // Keyboard / IR Remote mappings
  assert.equal(handleTVRemoteKey({ key: "ArrowUp" })?.type, "NAV_UP");
  assert.equal(handleTVRemoteKey({ key: "ArrowDown" })?.type, "NAV_DOWN");
  assert.equal(handleTVRemoteKey({ key: "ArrowLeft" })?.type, "NAV_LEFT");
  assert.equal(handleTVRemoteKey({ key: "ArrowRight" })?.type, "NAV_RIGHT");
  assert.equal(handleTVRemoteKey({ key: "Enter" })?.type, "ACTION_SELECT");
  assert.equal(handleTVRemoteKey({ key: "Escape" })?.type, "ACTION_BACK");
  assert.equal(handleTVRemoteKey({ key: "MediaPlayPause" })?.type, "PLAY_PAUSE");
  assert.equal(handleTVRemoteKey({ key: "m" })?.type, "ACTION_MENU");
  assert.equal(handleTVRemoteKey({ key: "/" })?.type, "ACTION_SEARCH");

  // Gamepad button mappings
  assert.equal(mapGamepadButtonIndex(0, true)?.type, "ACTION_SELECT"); // A / Cross
  assert.equal(mapGamepadButtonIndex(1, true)?.type, "ACTION_BACK"); // B / Circle
  assert.equal(mapGamepadButtonIndex(2, true)?.type, "ACTION_MENU"); // X / Square
  assert.equal(mapGamepadButtonIndex(3, true)?.type, "ACTION_SEARCH"); // Y / Triangle
  assert.equal(mapGamepadButtonIndex(4, true)?.type, "CHAPTER_PREV"); // L1
  assert.equal(mapGamepadButtonIndex(5, true)?.type, "CHAPTER_NEXT"); // R1

  // Analog triggers (L2/R2)
  const l2Action = mapGamepadButtonIndex(6, false, 0.75);
  assert.equal(l2Action?.type, "VARIABLE_REWIND");
  assert.equal(l2Action?.magnitude, 0.75);

  const r2Action = mapGamepadButtonIndex(7, false, 0.95);
  assert.equal(r2Action?.type, "VARIABLE_FORWARD");
  assert.equal(r2Action?.magnitude, 0.95);

  // D-Pad buttons (12 to 15)
  assert.equal(mapGamepadButtonIndex(12, true)?.type, "NAV_UP");
  assert.equal(mapGamepadButtonIndex(13, true)?.type, "NAV_DOWN");
  assert.equal(mapGamepadButtonIndex(14, true)?.type, "NAV_LEFT");
  assert.equal(mapGamepadButtonIndex(15, true)?.type, "NAV_RIGHT");

  // Dispatch & Subscription
  let received: TVActionEvent | null = null;
  const unsubActions = subscribeTVRemoteActions((e) => {
    received = e;
  });

  dispatchTVAction({ type: "ACTION_SELECT", source: "cec" });
  assert.equal(received?.type, "ACTION_SELECT");
  assert.equal(received?.source, "cec");
  unsubActions();
});

// --- 3. QR BEAM HANDOFF TESTS ---
test("QR Beam Handoff: encoding, URL generation, decoding, TTL validation, and corruption resistance", () => {
  const session = {
    mediaKey: "movie:tmdb:550",
    title: "Fight Club",
    streamUrl: "https://debrid-cdn.example.org/fightclub.1080p.mkv",
    positionSec: 1420.5,
    totalDurationSec: 8340,
    audioLanguage: "en",
    subtitleLanguage: "es",
  };

  const { payload, beamUrl, deepLink } = generateBeamPayload(session);
  assert.ok(payload.length > 20);
  assert.ok(beamUrl.startsWith("https://argus.app/beam#"));
  assert.ok(deepLink.startsWith("argus://beam?data="));

  // Decode valid payload
  const result = decodeAndValidateBeamPayload(payload);
  assert.equal(result.valid, true);
  assert.equal(result.session?.mediaKey, "movie:tmdb:550");
  assert.equal(result.session?.title, "Fight Club");
  assert.equal(result.session?.positionSec, 1420.5);
  assert.equal(result.session?.audioLanguage, "en");
  assert.equal(result.session?.subtitleLanguage, "es");

  // Rejects expired token (> 10m TTL)
  const expiredSession = {
    ...session,
    timestampMs: Date.now() - 15 * 60 * 1000, // 15 mins ago
  };
  const expiredBase64 = Buffer.from(JSON.stringify(expiredSession)).toString("base64");
  const expiredResult = decodeAndValidateBeamPayload(expiredBase64);
  assert.equal(expiredResult.valid, false);
  assert.ok(expiredResult.error?.includes("expired"));

  // Rejects malformed payload
  const badResult = decodeAndValidateBeamPayload("not-valid-base64!!!");
  assert.equal(badResult.valid, false);
});
