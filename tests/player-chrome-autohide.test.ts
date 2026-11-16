import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const at = (path: string) => new URL(`../${path}`, import.meta.url);
const read = (path: string) => readFileSync(at(path), "utf8");

test("player chrome visibility correctly differentiates between seek scrubbing and hover", () => {
  const playbackClock = read("src/lib/player/playback-clock.ts");
  const chromeVisibility = read("src/views/player/hooks/use-chrome-visibility.ts");
  const seekBar = read("src/components/player/transport/seek-bar.tsx");

  // 1. playback-clock exposes scrubbing state distinct from hover
  assert.match(playbackClock, /export function setSeekScrubbing/);
  assert.match(playbackClock, /export function getSeekScrubbing/);

  // 2. seek-bar sets seek scrubbing only when scrub != null
  assert.match(seekBar, /setSeekScrubbing\(scrub != null\)/);

  // 3. use-chrome-visibility only prevents hide when user is actively scrubbing (not mere stationary hover)
  assert.match(chromeVisibility, /getSeekScrubbing\(\)/);
  assert.doesNotMatch(chromeVisibility, /if \(resizingUiRef\.current \|\| anyMenuOpenRef\.current \|\| getSeekHovering\(\)\) return;/);

  // 4. use-chrome-visibility dispatches argus:clear-player-hover when hiding
  assert.match(chromeVisibility, /window\.dispatchEvent\(new Event\("argus:clear-player-hover"\)\)/);

  // 5. seek-bar listens for argus:clear-player-hover to drop hover state
  assert.match(seekBar, /window\.addEventListener\("argus:clear-player-hover", handleClear\)/);
});

test("player chrome ignores synthetic mousemove events without real coordinate delta", () => {
  const chromeVisibility = read("src/views/player/hooks/use-chrome-visibility.ts");
  const hdrOverlay = read("src/views/hdr-overlay-app.tsx");

  // Synthetic mousemove protection in use-chrome-visibility
  assert.match(chromeVisibility, /lastPointerPosRef/);
  assert.match(chromeVisibility, /dx < 2 && dy < 2/);

  // Synthetic pointermove protection in HDR overlay stage
  assert.match(hdrOverlay, /dx < 2 && dy < 2/);

  // Ensure root player main element does not bypass coordinate delta checking with raw onMouseMove/onMouseEnter
  const playerView = read("src/views/player.tsx");
  assert.doesNotMatch(playerView, /onMouseMove=\{wakeChrome\}/);
  assert.doesNotMatch(playerView, /onMouseEnter=\{wakeChrome\}/);
});
