// @ts-expect-error Node test types are intentionally outside the browser-only tsconfig.
import assert from "node:assert/strict";
// @ts-expect-error Node test types are intentionally outside the browser-only tsconfig.
import test from "node:test";
import {
  encodeExtra,
  parseMeta,
  parseMetas,
  parseStreams,
  parseSubtitles,
  resourceUrl,
  transportBase,
} from "../src/lib/stremio-protocol/index.ts";

test("transportBase strips manifest and trailing slashes", () => {
  assert.equal(transportBase("https://a.example/x/manifest.json"), "https://a.example/x");
  assert.equal(transportBase("https://a.example/x/"), "https://a.example/x");
});

test("catalog url puts extras in the path", () => {
  assert.equal(
    resourceUrl({
      base: "https://a.example/manifest.json",
      resource: "catalog",
      type: "movie",
      id: "top",
      extra: [
        { name: "genre", value: "Sci Fi" },
        { name: "skip", value: 20 },
      ],
    }),
    "https://a.example/catalog/movie/top/genre=Sci%20Fi&skip=20.json",
  );
});

test("stream ids keep colons, meta ids are encoded", () => {
  assert.equal(
    resourceUrl({ base: "https://a.example", resource: "stream", type: "series", id: "tt1:1:2" }),
    "https://a.example/stream/series/tt1:1:2.json",
  );
  assert.equal(
    resourceUrl({ base: "https://a.example", resource: "meta", type: "series", id: "kitsu:1" }),
    "https://a.example/meta/series/kitsu%3A1.json",
  );
});

test("empty extras add nothing", () => {
  assert.equal(encodeExtra([]), "");
  assert.equal(encodeExtra(undefined), "");
});

test("parsers tolerate missing or malformed bodies", () => {
  assert.deepEqual(parseMetas({}), []);
  assert.deepEqual(parseMetas(null), []);
  assert.deepEqual(parseStreams({ streams: "nope" }), []);
  assert.deepEqual(parseSubtitles({ subtitles: [{ id: "1" }] }), [{ id: "1" }]);
  assert.equal(parseMeta({ meta: 3 }), null);
  assert.deepEqual(parseMeta({ meta: { id: "x" } }), { id: "x" });
});
