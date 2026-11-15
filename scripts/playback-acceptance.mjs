// Real Chromium decoding through the production HTML5 bridge. Native mpv and
// physical device certification require their own run; this is never a substitute.
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";
import { rmSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const require = createRequire(`${process.env.PLAYWRIGHT_DIR ?? process.cwd()}/`);
const { chromium } = require("playwright");
const base = process.argv[2] ?? "http://127.0.0.1:1420";
if (!["127.0.0.1", "localhost"].includes(new URL(base).hostname))
  throw new Error("Run against a local Vite development server only");
const fixture = resolve("public/argus-acceptance-fixture.webm");
execFileSync("ffmpeg", [
  "-hide_banner",
  "-loglevel",
  "error",
  "-y",
  "-f",
  "lavfi",
  "-i",
  "testsrc2=size=320x180:rate=24",
  "-t",
  "12",
  "-c:v",
  "libvpx",
  "-pix_fmt",
  "yuv420p",
  "-deadline",
  "realtime",
  fixture,
]);
let browser;
const results = [];
const errors = [];
try {
  browser = await chromium.launch({
    ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}),
    args: ["--autoplay-policy=no-user-gesture-required"],
  });
  const context = await browser.newContext();
  const page = await context.newPage();
  page.on("pageerror", (error) => errors.push(error.message));
  // Isolated fixture page, real application modules; never mount a test hook in the product.
  await page.route("**/__argus_acceptance", (route) =>
    route.fulfill({
      contentType: "text/html",
      body: '<!doctype html><div id="player" style="width:640px;height:360px"></div>',
    }),
  );
  for (let run = 0; run < 20; run++) {
    await page.goto(`${base}/__argus_acceptance`);
    const result = await page.evaluate(async () => {
      const { createHtml5Bridge } = await import("/src/lib/player/html5/bridge.ts");
      const { transitionStream } = await import("/src/lib/player/stream-transition.ts");
      const { saveResumeMs, readResumeMs } = await import("/src/lib/resume.ts");
      const { beginPlaybackTrace } = await import("/src/lib/perf/playback-trace.ts");
      const bridge = createHtml5Bridge();
      bridge.attach(document.getElementById("player"));
      bridge.setMuted(true);
      let snapshot;
      const unsubscribe = bridge.subscribe((value) => {
        snapshot = value;
      });
      async function until(predicate) {
        const deadline = performance.now() + 10000;
        while (!predicate()) {
          if (performance.now() > deadline)
            throw new Error(`Playback timed out: ${snapshot?.status}: ${snapshot?.errorMessage ?? "no error detail"}`);
          await new Promise((resolve) => setTimeout(resolve, 25));
        }
      }
      const source = {
        url: `${location.origin}/argus-acceptance-fixture.webm`,
        startAtSec: readResumeMs("acceptance-fixture") / 1000,
      };
      const start = performance.now();
      await bridge.load({ ...source, traceId: beginPlaybackTrace("direct") });
      bridge.setMuted(true);
      await bridge.play({ reason: "acceptance" });
      await until(() => snapshot?.firstFrameReady && snapshot.status === "playing");
      const firstFrameMs = performance.now() - start;
      if (source.startAtSec > 0 && Math.abs(snapshot.positionSec - source.startAtSec) > 0.5)
        throw new Error("Reload did not restore saved progress");
      bridge.seek(6);
      await until(() => Math.abs(snapshot.positionSec - 6) < 0.5);
      bridge.pause("acceptance");
      const position = snapshot.positionSec;
      const fallback = { ...source, startAtSec: position, startPaused: true };
      let failed = false;
      try {
        await transitionStream(
          bridge,
          { url: `${location.origin}/missing-acceptance.mp4` },
          fallback,
          snapshot,
          new AbortController().signal,
          1500,
        );
      } catch {
        failed = true;
      }
      if (!failed) throw new Error("Deliberately broken source was accepted");
      await until(
        () => snapshot.firstFrameReady && Math.abs(snapshot.positionSec - position) < 0.5,
      );
      saveResumeMs("acceptance-fixture", snapshot.positionSec * 1000);
      const savedMs = readResumeMs("acceptance-fixture");
      unsubscribe();
      bridge.detach();
      return { firstFrameMs, savedMs, fallbackRestored: true };
    });
    assert.ok(
      result.firstFrameMs <= Number(process.env.ARGUS_FIRST_FRAME_BUDGET_MS ?? 3000),
      "first-frame performance budget exceeded",
    );
    assert.ok(Math.abs(result.savedMs - 6000) < 500, "resume position lost");
    results.push(result);
    console.log(`journey ${run + 1}/20 passed`);
  }
  assert.equal(errors.length, 0, errors.join("\n"));
  const times = results.map((r) => r.firstFrameMs).sort((a, b) => a - b);
  writeFileSync(
    "playback-acceptance.json",
    JSON.stringify(
      {
        environment:
          "Chromium HTML5 bridge; controlled local VP8 fixture; not native/device certification",
        journeys: results.length,
        p95FirstFrameMs: times[Math.ceil(times.length * 0.95) - 1],
        results,
      },
      null,
      2,
    ),
  );
} finally {
  await browser?.close();
  rmSync(fixture, { force: true });
}
