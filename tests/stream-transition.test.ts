import test from "node:test";
import assert from "node:assert/strict";
import { transitionStream } from "../src/lib/player/stream-transition";
import { emptySnapshot, type PlayerBridge, type PlayerSnapshot } from "../src/lib/player/bridge";

const before: PlayerSnapshot = {
  ...emptySnapshot,
  status: "playing",
  firstFrameReady: true,
  positionSec: 123,
  rate: 1.25,
  volume: 0.7,
  subDelaySec: 0.5,
  audioTracks: [{ id: "2", label: "Hindi", lang: "hin", kind: "audio", selected: true }],
  subtitleTracks: [{ id: "4", label: "Test", lang: "eng", kind: "subtitle", selected: true }],
};
function fixture(fail = false, neverReady = false) {
  const loads: any[] = [],
    calls: any[] = [];
  let listener: ((snapshot: PlayerSnapshot) => void) | undefined;
  const bridge = {
    subscribe(fn: (snapshot: PlayerSnapshot) => void) {
      listener = fn;
      fn(before);
      return () => {
        listener = undefined;
      };
    },
    async load(source: any) {
      loads.push(source);
      queueMicrotask(() => {
        if (neverReady && source.url === "upgrade") return;
        const error = fail && source.url === "upgrade";
        listener?.({
          ...before,
          status: error ? "error" : "playing",
          errorMessage: error ? "Broken 4K source" : null,
          audioTracks: [{ ...before.audioTracks[0], id: "20" }],
          subtitleTracks: [{ ...before.subtitleTracks[0], id: "40" }],
        });
      });
    },
    async play() {},
    setAudioTrack(id: string) {
      calls.push(["audio", id]);
    },
    setSubtitleTrack(id: string | null) {
      calls.push(["subtitle", id]);
    },
    async addSubtitle(
      url: string,
      _lang: string,
      _title: string,
      _select: boolean,
      metadata: unknown,
    ) {
      calls.push(["external", url, metadata]);
      return true;
    },
    setRate(v: number) {
      calls.push(["rate", v]);
    },
    setSubDelay() {},
    setAudioDelay() {},
    setVolume() {},
    setMuted() {},
  } as unknown as PlayerBridge;
  return { bridge, loads, calls, listening: () => !!listener };
}
test("stream switches restore semantic audio/subtitle choices despite changed track IDs", async () => {
  const f = fixture();
  await transitionStream(
    f.bridge,
    { url: "upgrade", startAtSec: 123 },
    { url: "original", startAtSec: 123 },
    before,
    new AbortController().signal,
  );
  assert.deepEqual(f.calls.slice(0, 2), [
    ["audio", "20"],
    ["subtitle", "40"],
  ]);
  assert.equal(f.listening(), false);
});
test("a failed 4K source restores the original file at the exact position and track choices", async () => {
  const f = fixture(true);
  await assert.rejects(
    transitionStream(
      f.bridge,
      { url: "upgrade" },
      { url: "original", startAtSec: 123 },
      before,
      new AbortController().signal,
    ),
    /Broken 4K/,
  );
  assert.deepEqual(
    f.loads.map((source) => source.url),
    ["upgrade", "original"],
  );
  assert.equal(f.loads[1].startAtSec, 123);
  assert.deepEqual(f.calls.slice(0, 2), [
    ["audio", "20"],
    ["subtitle", "40"],
  ]);
  assert.equal(f.listening(), false);
});
test("a source which never produces a frame rolls back after a bounded wait", async () => {
  const f = fixture(false, true);
  await assert.rejects(
    transitionStream(
      f.bridge,
      { url: "upgrade" },
      { url: "original", startAtSec: 2 },
      before,
      new AbortController().signal,
      10,
    ),
    /did not start/,
  );
  assert.equal(f.loads[1].startAtSec, 2);
  assert.equal(f.listening(), false);
});
test("canceled switches never load over a new owner; subtitles-off remains off", async () => {
  const f = fixture(),
    controller = new AbortController();
  controller.abort();
  await transitionStream(f.bridge, { url: "upgrade" }, { url: "old" }, before, controller.signal);
  assert.equal(f.loads.length, 0);
  await transitionStream(
    f.bridge,
    { url: "upgrade" },
    { url: "old" },
    { ...before, subtitleTracks: [] },
    new AbortController().signal,
  );
  assert.ok(f.calls.some(([kind, id]) => kind === "subtitle" && id === null));
});

test("a hanging load cannot bypass the transition timeout", async () => {
  const f = fixture();
  const load = f.bridge.load;
  f.bridge.load = (source) => (source.url === "upgrade" ? new Promise(() => {}) : load(source));
  await assert.rejects(
    transitionStream(
      f.bridge,
      { url: "upgrade" },
      { url: "original" },
      before,
      new AbortController().signal,
      10,
    ),
    /did not start/,
  );
  assert.equal(f.loads[0].url, "original");
  assert.equal(f.listening(), false);
});

test("language aliases still preserve Hindi audio and English subtitles", async () => {
  const f = fixture();
  const aliases = {
    ...before,
    audioTracks: before.audioTracks.map((track) => ({
      ...track,
      lang: "hi",
      label: "Hindi selected",
    })),
    subtitleTracks: before.subtitleTracks.map((track) => ({
      ...track,
      lang: "en",
      label: "English selected",
    })),
  };
  await transitionStream(
    f.bridge,
    { url: "upgrade" },
    { url: "original" },
    aliases,
    new AbortController().signal,
  );
  assert.deepEqual(f.calls.slice(0, 2), [
    ["audio", "20"],
    ["subtitle", "40"],
  ]);
});

test("external local subtitles keep their file and trust metadata instead of matching an embedded language", async () => {
  const f = fixture();
  const snapshot = {
    ...before,
    subtitleTracks: [
      {
        ...before.subtitleTracks[0],
        external: true,
        url: "file:///fixture/test.srt",
        localTrusted: true,
      },
    ],
  };
  await transitionStream(
    f.bridge,
    { url: "upgrade" },
    { url: "original" },
    snapshot,
    new AbortController().signal,
  );
  const external = f.calls.find(([kind]) => kind === "external");
  assert.equal(external?.[1], "file:///fixture/test.srt");
  assert.equal(external?.[2].localTrusted, true);
});
