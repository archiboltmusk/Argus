// @ts-expect-error Node test types are outside the browser tsconfig.
import assert from "node:assert/strict";
// @ts-expect-error Node test types are outside the browser tsconfig.
import { test } from "node:test";
import {
  addonHostLabel,
  libraryToResume,
  libraryToWatchlist,
  parseStremioAddons,
} from "../src/lib/stremio-import.ts";

const base = { removed: false, temp: false, _ctime: "", _mtime: "2026-01-02T00:00:00.000Z" };
const item = (over: Record<string, unknown>) =>
  ({ _id: "tt1", type: "movie", name: "A", ...base, ...over }) as never;

test("parseStremioAddons skips malformed entries and duplicates", () => {
  const out = parseStremioAddons([
    { transportUrl: "https://t.example/realdebrid=KEY/manifest.json", manifest: { id: "x", name: "T" } },
    { transportUrl: "https://t.example/realdebrid=KEY/manifest.json", manifest: { id: "x" } },
    { transportUrl: "file:///etc/passwd" },
    { manifest: {} },
    null,
    "nope",
  ]);
  assert.equal(out.length, 1);
  assert.equal(out[0].name, "T");
  assert.deepEqual(parseStremioAddons({ not: "an array" }), []);
});

test("addonHostLabel never exposes the path", () => {
  assert.equal(addonHostLabel("https://t.example/realdebrid=KEY/manifest.json"), "t.example");
});

test("libraryToWatchlist keeps saved titles only", () => {
  const out = libraryToWatchlist([
    item({ _id: "tt1" }),
    item({ _id: "tt2", temp: true }),
    item({ _id: "tt3", removed: true }),
    item({ _id: "weird:1" }),
    item({ _id: "kitsu:5", type: "series" }),
  ]);
  assert.deepEqual(out.map((e) => e.id), ["tt1", "kitsu:5"]);
  assert.equal(out[0].imdbId, "tt1");
  assert.equal(out[1].imdbId, null);
});

test("libraryToResume maps unfinished positions with episodes", () => {
  const out = libraryToResume([
    item({ _id: "tt1", state: { timeOffset: 600000, duration: 7200000 } }),
    item({ _id: "tt2", state: { timeOffset: 7000000, duration: 7200000 } }),
    item({ _id: "tt3", type: "series", state: { timeOffset: 90000, duration: 1800000, video_id: "tt3:2:5", lastWatched: "2026-03-01T00:00:00.000Z" } }),
    item({ _id: "tt4", state: { timeOffset: 0, duration: 100 } }),
    item({ _id: "tt5" }),
  ]);
  assert.deepEqual(out.map((e) => e.id), ["tt1", "tt3"]);
  assert.equal(out[0].ms, 600000);
  assert.equal(out[1].season, 2);
  assert.equal(out[1].episode, 5);
  assert.equal(out[1].t, Date.parse("2026-03-01T00:00:00.000Z"));
});
