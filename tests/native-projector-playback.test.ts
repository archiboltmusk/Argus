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
  assert.equal(props["sub-color"], "#FFFFFF");
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

test("Phase 1 CSS Compatibility: lowerAndroidCss unwraps @layer, sets @property defaults, and converts oklch/color-mix", async () => {
  const { lowerAndroidCss } = await import("../scripts/android-css-compat.mjs");
  const sampleCss = `
    @layer theme, base, utilities;
    @layer base { :root { --color-accent: oklch(78% 0.13 60); } }
    @layer utilities { .bg-accent-soft { background: color-mix(in oklab, var(--color-accent) 20%, transparent); } }
    @property --tw-border-style { syntax: "*"; inherits: false; initial-value: solid; }
  `;
  const lowered = lowerAndroidCss(sampleCss);
  assert.equal(/@layer[\s{;]/.test(lowered), false, "@layer blocks must be unwrapped");
  assert.equal(lowered.includes("oklch("), false, "oklch() must be lowered to rgb/rgba");
  assert.equal(lowered.includes("color-mix("), false, "color-mix() must be lowered to rgba");
  assert.ok(lowered.includes("--tw-border-style:solid"), "missing @property defaults in :root");
  assert.ok(lowered.includes("rgb(") || lowered.includes("rgba("), "rgb/rgba output missing");
});

test("Phase 2 Native Android Player: Kotlin Media3 ExoPlayer + LibVLC activity and ExoPlayer bridge delegate cleanly", async () => {
  const fs = await import("node:fs");
  const ktActivity = fs.readFileSync(
    new URL("../docs/android/native-player/ArgusNativePlayerActivity.kt", import.meta.url),
    "utf8",
  );
  const ktBridge = fs.readFileSync(
    new URL("../docs/android/native-player/ArgusNativePlayerBridge.kt", import.meta.url),
    "utf8",
  );
  const patchScript = fs.readFileSync(
    new URL("../scripts/android-patch-manifest.mjs", import.meta.url),
    "utf8",
  );
  assert.ok(ktActivity.includes("ExoPlayer") && ktActivity.includes("LibVLC"));
  assert.ok(ktBridge.includes("@JavascriptInterface"));
  assert.ok(patchScript.includes("media3-exoplayer:1.5.1"));
  assert.ok(patchScript.includes("libvlc-all:3.6.0"));

  // Simulate Android WebView injected ArgusNativePlayer JS interface
  const calls: Array<{ method: string; arg?: unknown }> = [];
  const g = globalThis as unknown as {
    window?: Record<string, unknown>;
    self?: unknown;
  };
  const prevWindow = g.window;
  const prevSelf = g.self;
  try {
    if (!g.self) g.self = g;
    g.window = {
      ArgusNativePlayer: {
        isAvailable: () => true,
        play: (json: string) => {
          calls.push({ method: "play", arg: JSON.parse(json) });
          return true;
        },
        pause: () => calls.push({ method: "pause" }),
        resume: () => calls.push({ method: "resume" }),
        seekTo: (ms: number) => calls.push({ method: "seekTo", arg: ms }),
        setRate: (r: number) => calls.push({ method: "setRate", arg: r }),
        setAudioTrack: () => {},
        setSubtitleTrack: () => {},
        addSubtitle: () => {},
        stop: () => calls.push({ method: "stop" }),
        getStateJson: () => JSON.stringify({ status: "playing", positionMs: 12000, durationMs: 3600000 }),
      },
      setInterval,
      clearInterval,
    };

    const { createExoPlayerBridge, isAndroidNativePlayerAvailable } = await import(
      "../src/lib/player/engines/exoplayer-bridge.ts"
    );
    assert.equal(isAndroidNativePlayerAvailable(), true);
    const bridge = createExoPlayerBridge({ isProjector: true, isTv: true });
    let latestPos = 0;
    bridge.subscribe((s) => {
      latestPos = s.positionSec;
    });
    await bridge.load({
      url: "http://127.0.0.1:11470/movie.mkv",
      title: "Dune Part Two",
      startAtSec: 30,
      notWebReady: true,
    });
    bridge.seek(120);
    bridge.pause();
    bridge.destroy();

    const playCall = calls.find((c) => c.method === "play")?.arg as Record<string, unknown>;
    assert.equal(playCall.url, "http://127.0.0.1:11470/movie.mkv");
    assert.equal(playCall.startPositionMs, 30000);
    assert.equal(playCall.projectorMode, true);
    assert.ok(calls.some((c) => c.method === "seekTo" && c.arg === 120000));
    assert.ok(calls.some((c) => c.method === "pause"));
    assert.ok(calls.some((c) => c.method === "stop"));
    assert.equal(latestPos, 0);
  } finally {
    if (prevWindow === undefined) delete g.window;
    else g.window = prevWindow;
    if (prevSelf === undefined) delete g.self;
    else g.self = prevSelf;
  }
});

test("Cross-OS Native Playback: Tizen webapis.avplay and Apple external player URLs work cleanly", async () => {
  const g = globalThis as unknown as {
    window?: Record<string, unknown>;
    self?: unknown;
  };
  const prevWindow = g.window;
  const prevSelf = g.self;
  const avCalls: string[] = [];

  try {
    if (!g.self) g.self = g;
    g.window = {
      innerWidth: 1920,
      innerHeight: 1080,
      webapis: {
        avplay: {
          open: (u: string) => avCalls.push(`open:${u}`),
          close: () => avCalls.push("close"),
          prepareAsync: (ok: () => void) => {
            avCalls.push("prepare");
            ok();
          },
          play: () => avCalls.push("play"),
          pause: () => avCalls.push("pause"),
          stop: () => avCalls.push("stop"),
          seekTo: (ms: number) => avCalls.push(`seek:${ms}`),
          setDisplayRect: () => avCalls.push("rect"),
          setSpeed: (r: number) => avCalls.push(`rate:${r}`),
          getDuration: () => 5400000,
          setListener: () => {},
        },
      },
    };

    const { createTizenAvplayBridge } = await import(
      "../src/lib/player/engines/tizen-avplay-bridge.ts"
    );
    const { buildAppleExternalPlayerUrl } = await import(
      "../src/lib/player/engines/avplayer-bridge.ts"
    );

    const tizen = createTizenAvplayBridge();
    await tizen.load({ url: "http://192.168.1.50/movie.mkv", startAtSec: 12 });
    tizen.seek(45);
    tizen.pause();
    tizen.destroy();

    assert.ok(avCalls.includes("open:http://192.168.1.50/movie.mkv"));
    assert.ok(avCalls.includes("prepare"));
    assert.ok(avCalls.includes("play"));
    assert.ok(avCalls.includes("seek:45000"));
    assert.ok(avCalls.includes("pause"));
    assert.ok(avCalls.includes("stop"));

    const vlcUrl = buildAppleExternalPlayerUrl("vlc", "https://cdn.example/show.mkv");
    assert.ok(vlcUrl.startsWith("vlc-x-callback://x-callback-url/stream?url="));
    const infuseUrl = buildAppleExternalPlayerUrl("infuse", "https://cdn.example/show.mkv");
    assert.ok(infuseUrl.startsWith("infuse://x-callback-url/play?url="));
  } finally {
    if (prevWindow === undefined) delete g.window;
    else g.window = prevWindow;
    if (prevSelf === undefined) delete g.self;
    else g.self = prevSelf;
  }
});

test("Web Browser Playback: proxy gate requires Tauri runtime and HTML5 bridge supports Safari HLS / FLV fallbacks", async () => {
  const fs = await import("node:fs");
  const pickerCode = fs.readFileSync(
    new URL("../src/views/play-picker/use-pick-handler.ts", import.meta.url),
    "utf8",
  );
  const switcherCode = fs.readFileSync(
    new URL("../src/views/player/hooks/use-stream-switcher.ts", import.meta.url),
    "utf8",
  );
  const html5Code = fs.readFileSync(
    new URL("../src/lib/player/html5/bridge.ts", import.meta.url),
    "utf8",
  );
  assert.ok(pickerCode.includes('hasProxyHeaders && hasTauriRuntime'));
  assert.ok(switcherCode.includes('hasProxyHeaders && hasTauriRuntime'));
  assert.ok(html5Code.includes("canNativeHls"));
  assert.ok(html5Code.includes('isFlv ? "flv" : "mpegts"'));
});
