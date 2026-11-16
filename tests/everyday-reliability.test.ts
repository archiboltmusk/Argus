import { movieReminderKey } from "../src/lib/movie-reminder";
import test from "node:test";
import assert from "node:assert/strict";
import { playbackAdvice } from "../src/lib/player/playback-help";
import { checkTravelItem } from "../src/lib/download/travel-readiness";
import {
  parsePlaybackHandoff,
  sendPlaybackHandoff,
  transferableUrl,
} from "../src/lib/player/household-handoff";
import {
  readSourceMemory,
  rememberWorkingSource,
  clearSourceMemory,
  sourceMemoryBonus,
} from "../src/lib/player/source-memory";
import { isIncognito, setIncognito } from "../src/lib/incognito";
import { saveResumeMs, readResumeMs } from "../src/lib/resume";
import { ACCESSIBILITY_PRESETS } from "../src/lib/player/accessibility-presets";
import type { PlayerSnapshot } from "../src/lib/player/bridge";
const now = Date.now();
const payload = {
  id: "request-123",
  title: "Film বাংলা",
  mediaId: "tt1234567",
  mediaType: "movie" as const,
  url: "https://media.example/film.mp4",
  positionMs: 120000,
  createdAt: now,
  subtitle: { off: false, lang: "hin" },
};
test("handoff rejects expired, future, malformed, credential-bearing and local-only sources", () => {
  assert.equal(parsePlaybackHandoff(payload, now)?.positionMs, 120000);
  for (const patch of [
    { createdAt: now - 61000 },
    { createdAt: now + 6000 },
    { positionMs: NaN },
    { positionMs: -1 },
    { subtitle: null },
    { url: "file:///Users/private.mp4" },
    { url: "http://localhost:11470/video" },
    { url: "https://user:password@example.org/video" },
    { audio: { id: {} } },
  ])
    assert.equal(parsePlaybackHandoff({ ...payload, ...patch }, now), null);
  assert.equal(transferableUrl("http://192.168.1.5:11470/video"), true);
});
test("a handoff resolves only after the matching positive playback receipt", async () => {
  const sent: unknown[] = [];
  let socket: {
    onopen?: () => void;
    onmessage?: (e: { data: string }) => void;
    onerror?: () => void;
    onclose?: () => void;
    send: (raw: string) => void;
    close: () => void;
  };
  const make = () => {
    socket = { send: (raw) => sent.push(JSON.parse(raw)), close: () => {} };
    return socket as unknown as WebSocket;
  };
  const pending = sendPlaybackHandoff("192.168.1.20:11471", payload, make);
  socket!.onopen?.();
  assert.equal((sent[0] as { command: { payload: unknown } }).command.payload !== undefined, true);
  let resolved = false;
  void pending.then(() => {
    resolved = true;
  });
  socket!.onmessage?.({ data: JSON.stringify({ t: "snapshot" }) });
  socket!.onmessage?.({
    data: JSON.stringify({ t: "handoff-result", id: "other-request", ok: true }),
  });
  await Promise.resolve();
  assert.equal(resolved, false);
  socket!.onmessage?.({ data: JSON.stringify({ t: "handoff-result", id: payload.id, ok: true }) });
  assert.equal(await pending, true);
});
test("unreachable handoff is a failure, never simulated success", async () => {
  let socket: WebSocket;
  const pending = sendPlaybackHandoff("192.168.1.20:11471", payload, () => {
    socket = { close() {} } as WebSocket;
    return socket;
  });
  socket!.onerror?.({} as Event);
  assert.equal(await pending, false);
});
test("offline check distinguishes missing files, unreadable storage and verified sidecars", async () => {
  const item = { id: "saved", path: "/films/bunny.mp4", status: "done" };
  assert.deepEqual(
    await checkTravelItem(item, async (path) => [item.path, "/films/bunny.srt"].includes(path)),
    { id: "saved", file: "present", subtitles: "sidecar" },
  );
  assert.equal((await checkTravelItem(item, async () => false)).file, "missing");
  assert.equal(
    (
      await checkTravelItem(item, async () => {
        throw new Error("permission");
      })
    ).file,
    "unknown",
  );
  assert.equal(
    (await checkTravelItem(item, async (path) => path === item.path)).subtitles,
    "not-found",
  );
});
test("playback help follows observed errors and does not put secrets in copy", () => {
  const state = {
    errorCode: "codec",
    status: "error",
    muted: true,
    volume: 0,
    audioTracks: [],
    subtitleTracks: [],
    firstFrameReady: false,
  } as unknown as PlayerSnapshot;
  assert.match(playbackAdvice(state, true).join(" "), /decoded/);
  assert.match(playbackAdvice(state, false).join(" "), /offline/);
  assert.match(playbackAdvice(state, true).join(" "), /muted/);
});
test("private viewing does not remember sources or write resume; source memory stays profile scoped", () => {
  const values = new Map<string, string>();
  const original = globalThis.localStorage;
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
      removeItem: (key: string) => values.delete(key),
    },
  });
  try {
    localStorage.setItem(
      "argus.profiles.v1",
      JSON.stringify({ activeId: "a", profiles: [{ id: "a", isPrimary: true }, { id: "b" }] }),
    );
    rememberWorkingSource({ addonId: "addon", resolution: "1080p", audioLanguage: "hin" });
    assert.equal(
      sourceMemoryBonus({ addonId: "addon", resolution: "1080p" }, readSourceMemory()),
      8,
    );
    setIncognito(true);
    assert.equal(isIncognito(), true);
    rememberWorkingSource({ addonId: "private", resolution: "4K" });
    saveResumeMs("private-movie", 30000);
    assert.equal(readSourceMemory(), null);
    assert.equal(readResumeMs("private-movie"), 0);
    setIncognito(false);
    assert.equal(readSourceMemory()?.addonId, "addon");
    localStorage.setItem("argus.profiles.v1", JSON.stringify({ activeId: "b" }));
    assert.equal(readSourceMemory(), null);
    clearSourceMemory();
    assert.equal(readSourceMemory(), null);
  } finally {
    setIncognito(false);
    Object.defineProperty(globalThis, "localStorage", { configurable: true, value: original });
  }
});
test("accessibility presets change bounded settings rather than replacing the profile", () => {
  assert.equal(ACCESSIBILITY_PRESETS.readable.subStyle, "box");
  assert.equal(ACCESSIBILITY_PRESETS.comfortable.reduceMotion, true);
  assert.equal(ACCESSIBILITY_PRESETS.dialogue.audioProfile, "speech-clarity");
  assert.equal("preferredAudioLangs" in ACCESSIBILITY_PRESETS.readable, false);
});

test("movie reminders notify once for a new dated release, never for unknown years or old releases", () => {
  const at = Date.parse("2026-11-16T12:00:00Z");
  const day = "2026-11-16";
  assert.equal(movieReminderKey(day, at - 86400_000, [], at), `movie:${day}`);
  assert.equal(movieReminderKey(day, at - 86400_000, [`movie:${day}`], at), null);
  assert.equal(movieReminderKey("2027-01-01", at - 86400_000, [], at), null);
  assert.equal(movieReminderKey("2026", at - 86400_000, [], at), null);
  assert.equal(movieReminderKey("2025-01-01", at - 86400_000, [], at), null);
});

test("handoff receipt requires decoding, the original position and both selected tracks", async () => {
  const { handoffPlaybackMatches } = await import("../src/lib/player/household-handoff");
  const request = { ...payload, audio: { id: "old-audio", lang: "hi", title: "Hindi" } };
  const state = {
    status: "playing",
    firstFrameReady: true,
    audioTracks: [
      {
        id: "new-audio",
        lang: "hin",
        title: "Hindi",
        label: "Hindi",
        kind: "audio",
        selected: true,
      },
    ],
    subtitleTracks: [{ id: "s", lang: "hi", kind: "subtitle", selected: true }],
    positionSec: 120,
  } as unknown as PlayerSnapshot;
  assert.equal(handoffPlaybackMatches(request, state, 120), true);
  assert.equal(handoffPlaybackMatches(request, state, 0), false);
  assert.equal(handoffPlaybackMatches(request, { ...state, firstFrameReady: false }, 120), false);
  assert.equal(handoffPlaybackMatches(request, { ...state, subtitleTracks: [] }, 120), false);
  assert.equal(
    handoffPlaybackMatches(
      request,
      { ...state, audioTracks: [{ ...state.audioTracks[0], selected: false }] },
      120,
    ),
    false,
  );
});
