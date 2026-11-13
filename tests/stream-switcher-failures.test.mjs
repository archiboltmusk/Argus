import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";
function harness(failure) {
  const busy = [];
  let stateIndex = 0,
    loads = 0,
    cooled = 0;
  const noop = () => {};
  const mocks = {
    react: {
      useCallback: (fn) => fn,
      useEffect: noop,
      useRef: (current) => ({ current }),
      useState: (value) => {
        const i = stateIndex++;
        return [
          value,
          (next) => {
            if (i === 2) busy.push(next);
          },
        ];
      },
    },
    "@/lib/player/playback-clock": { getPlaybackPosition: () => 123 },
    "@/lib/player/live-src": { isLivePlaybackSrc: () => false },
    "@/lib/picker-cache": {
      peekPickerCache: () => null,
      pinPickerCache: noop,
      unpinPickerCache: noop,
    },
    "@/lib/debrid/playback-preparation": { prepareCachedDebridStreams: noop },
    "@/lib/resume": { readResumeMs: () => 0 },
    "@/lib/dead-streams": {
      SHORT_PLAYBACK_SEC: 180,
      SOFT_STALL_TTL_MS: 90000,
      markStreamDead: () => cooled++,
    },
    "@/lib/playback-history": { savePlayback: noop },
    "@/lib/streams/resolve": {
      resolveStream: async () => {
        if (failure === "resolve") throw new Error("offline");
        return { ok: true, via: "direct", data: { url: "https://fixture.invalid/movie.mp4" } };
      },
    },
    "@/lib/stream-proxy": { registerStreamProxy: noop, unregisterStreamProxy: noop },
    "@/lib/player/startup-profile": { playbackStartupProfile: () => "standard" },
    "@/lib/player/stream-transition": { transitionStream: () => loads++ },
    "@/lib/streams/playback-redirect": {
      resolvePlaybackRedirect: async () => {
        throw new Error("redirect offline");
      },
    },
  };
  const source = readFileSync(
    new URL("../src/views/player/hooks/use-stream-switcher.ts", import.meta.url),
    "utf8",
  );
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
  });
  const module = { exports: {} };
  new Function("require", "module", "exports", "console", outputText)(
    (name) => {
      assert.ok(name in mocks, name);
      return mocks[name];
    },
    module,
    module.exports,
    { warn: noop },
  );
  const hook = module.exports.useStreamSwitcher({
    bridgeRef: { current: {} },
    src: { url: "https://fixture.invalid/original.mp4", meta: { id: "movie", type: "movie" } },
    snap: { status: "playing", positionSec: 123 },
    debrids: [],
  });
  return { hook, busy, loads: () => loads, cooled: () => cooled };
}
for (const failure of ["resolve", "redirect"]) {
  test(`${failure} errors release the source-switch loader and keep the current player untouched`, async () => {
    const h = harness(failure);
    await h.hook.onSwitchStream({ url: "https://fixture.invalid/new.mp4", addonId: "fixture" });
    assert.equal(h.busy.at(-1), null);
    assert.equal(h.loads(), 0);
    assert.equal(h.cooled(), 1);
  });
}
