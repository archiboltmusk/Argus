import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const at = (path: string) => new URL(`../${path}`, import.meta.url);
const read = (path: string) => readFileSync(at(path), "utf8");

test("YouTube pro keyboard shortcuts (J-K-L, frame step, 0-9 jumps, speed) are wired", () => {
  const file = read("src/views/player/hooks/use-keyboard-shortcuts.ts");

  // 1. J (-10s), K (play/pause), L (+10s)
  assert.match(file, /keyLower === "j"/);
  assert.match(file, /seekStep\(-10\)/);
  assert.match(file, /keyLower === "k"/);
  assert.match(file, /keyLower === "l"/);
  assert.match(file, /seekStep\(10\)/);

  // 2. Single frame stepping on , and .
  assert.match(file, /e\.key === "," && onFrameStep/);
  assert.match(file, /onFrameStep\(-1\)/);
  assert.match(file, /e\.key === "\." && onFrameStep/);
  assert.match(file, /onFrameStep\(1\)/);

  // 3. YouTube 0-9 percentage seek jumps
  assert.match(file, /e\.key >= "0" && e\.key <= "9"/);
  assert.match(file, /\(Number\(e\.key\) \/ 10\) \* snap\.durationSec/);

  // 4. Fine-grained 0.05x speed adjustment
  assert.match(file, /snap\.rate \+ 0\.05/);
  assert.match(file, /snap\.rate - 0\.05/);
});

test("YouTube hold speed HUD renders cinematic 2x speed badge", () => {
  const stageOverlays = read("src/views/player/stage-overlays.tsx");
  assert.match(stageOverlays, /⚡/);
  assert.match(stageOverlays, /holdSpeedActive && !pipMode/);
});

test("YouTube end of video sleep timer includes gentle volume fade", () => {
  const sleepTimer = read("src/views/player/hooks/use-sleep-timer.ts");
  assert.match(sleepTimer, /mode\.kind === "end_episode" && durationSec > 0/);
  assert.match(sleepTimer, /FADE_SEC = 30/);
});
