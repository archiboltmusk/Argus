import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";
function run(sourceSwitching) {
  const effects = [];
  let timers = 0;
  const noop = () => {};
  const mocks = {
    react: {
      useCallback: (fn) => fn,
      useEffect: (fn) => effects.push(fn),
      useRef: (current) => ({ current }),
      useState: (value) => [value, noop],
    },
    "@/lib/settings": { useSettings: () => ({ settings: { streamMirrorFailover: true } }) },
    "@/lib/player/local-url": { isLocalUrl: () => false },
    "@/lib/picker-cache": { peekPickerCache: () => null },
    "@/lib/debrid/playback-preparation": { prepareCachedDebridStreams: noop },
    "@/lib/streams/prewarm-candidate": { prewarmCandidateStream: noop },
    "@/lib/streams/host-health": { recordHostFailure: noop, recordHostThroughput: noop },
    "@/lib/dead-streams": { markStreamDead: noop, SOFT_STALL_TTL_MS: 90000 },
    "@/lib/player/stall-fallback": {
      evaluateStallStatus: () => ({ isStalled: false }),
      findNextFallbackStream: () => null,
    },
  };
  const source = readFileSync(
    new URL("../src/views/player/hooks/use-stall-fallback.ts", import.meta.url),
    "utf8",
  );
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
  });
  const module = { exports: {} };
  new Function("require", "module", "exports", "window", outputText)(
    (name) => {
      assert.ok(name in mocks, name);
      return mocks[name];
    },
    module,
    module.exports,
    {
      setInterval: () => {
        timers++;
        return 1;
      },
      clearInterval: noop,
    },
  );
  module.exports.useStallFallback({
    src: { url: "https://example.com/movie.mp4", meta: { id: "movie", type: "movie" } },
    snap: { status: "loading", positionSec: 0, bufferedSec: 0, buffering: true },
    debrids: [],
    autoSwitchEnabled: true,
    sourceSwitching,
    onSwitchStream: noop,
    openSwitcher: noop,
  });
  for (const effect of effects) {
    const cleanup = effect();
    if (typeof cleanup === "function") cleanup();
  }
  return timers;
}
test("a pending source transaction prevents a competing automatic fallback", () => {
  assert.equal(run(true), 0);
  assert.equal(run(false), 1);
});
