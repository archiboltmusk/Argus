import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";

function harness(failure: "resolve" | "redirect" | "proxy" | "load" | "result" | "none", cancelled = false) {
  const messages: string[] = [];
  const loads: unknown[] = [];
  const saved: unknown[] = [];
  const released: string[] = [];
  const state: unknown[] = [];
  let index = 0;
  const secret = "https://private.invalid/play?token=secret";
  const reject = () => { throw new Error(secret); };
  const deps: Record<string, unknown> = {
    react: {
      useCallback: (fn: unknown) => fn,
      useEffect: () => {},
      useRef: (current: unknown) => ({ current }),
      useState: (initial: unknown) => {
        const key = index++;
        state[key] = initial;
        return [initial, (value: unknown) => { state[key] = value; }];
      },
    },
    "@/lib/player/playback-clock": { getPlaybackPosition: () => 42, usePlaybackFlag: () => true },
    "@/lib/player/live-src": { isLivePlaybackSrc: () => false },
    "@/lib/picker-cache": {},
    "@/lib/debrid/playback-preparation": {},
    "@/lib/resume": { readResumeMs: () => 0 },
    "@/lib/dead-streams": { SHORT_PLAYBACK_SEC: 150 },
    "@/lib/playback-history": { savePlayback: (...args: unknown[]) => saved.push(args) },
    "@/lib/streams/resolve": {
      resolveStream: async (_stream: unknown, _debrids: unknown, signal: AbortSignal) => {
        if (cancelled) signal.dispatchEvent(new Event("abort"));
        if (failure === "resolve") reject();
        return failure === "result" ? { ok: false, code: "FAILED" } : {
          ok: true, via: "direct", data: { url: secret, headers: failure === "proxy" || failure === "load" ? { Authorization: "secret" } : undefined },
        };
      },
    },
    "@/lib/streams/playback-redirect": { resolvePlaybackRedirect: async () => failure === "redirect" ? reject() : secret },
    "@/lib/player/startup-profile": { playbackStartupProfile: () => ({}) },
    "@/lib/stream-proxy": {
      registerStreamProxy: async () => failure === "proxy" ? reject() : { url: "http://localhost/proxy", sessionId: "proxy" },
      unregisterStreamProxy: async (id: string) => { released.push(id); },
    },
    "@/lib/i18n": { t: (text: string) => text },
    "@/components/lists/list-toast": { emitListToast: (text: string) => messages.push(text) },
  };
  const source = readFileSync(new URL("../src/views/player/hooks/use-stream-switcher.ts", import.meta.url), "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
  });
  const module = { exports: {} as Record<string, any> };
  const NativeAbortController = globalThis.AbortController;
  class Controller extends NativeAbortController {
    constructor() {
      super();
      if (cancelled) this.abort();
    }
  }
  new Function("require", "module", "exports", "AbortController", outputText)(
    (name: string) => { assert.ok(name in deps, name); return deps[name]; }, module, module.exports, Controller,
  );
  const api = module.exports.useStreamSwitcher({
    bridgeRef: { current: {
      load: async (options: unknown) => { loads.push(options); if (failure === "load") reject(); },
      play: async () => {},
    } },
    src: { url: "original", meta: { id: "tt123", name: "Movie" } },
    snap: { durationSec: 3600 },
    debrids: [],
  });
  return { api, state, messages, loads, saved, released };
}

test("source switch failures are visible, sanitized and do not publish replacement state", async () => {
  for (const failure of ["resolve", "redirect", "proxy", "load", "result"] as const) {
    const h = harness(failure);
    await h.api.onSwitchStream({ url: "candidate", addonId: "fixture" });
    assert.deepEqual(h.messages, ["Could not switch sources. Try another source."]);
    assert.equal(h.state[2], null);
    assert.equal(h.state[3], "original");
    assert.equal(h.saved.length, 0);
    if (failure === "load") assert.deepEqual(h.released, ["proxy"]);
    else assert.equal(h.loads.length, 0);
  }
});

test("cancelled switches remain quiet; successful switches preserve resume and publish state", async () => {
  const cancelled = harness("resolve", true);
  await cancelled.api.onSwitchStream({ url: "candidate", addonId: "fixture" });
  assert.equal(cancelled.messages.length, 0);
  const success = harness("none");
  await success.api.onSwitchStream({ url: "candidate", addonId: "fixture" });
  assert.equal(success.messages.length, 0);
  assert.equal((success.loads[0] as { startAtSec: number }).startAtSec, 42);
  assert.equal(success.saved.length, 1);
  assert.equal(success.state[2], null);
  assert.equal(success.state[1], false);
});
