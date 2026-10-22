// @ts-expect-error Node test types are intentionally outside the browser-only tsconfig.
import assert from "node:assert/strict";
// @ts-expect-error Node test types are intentionally outside the browser-only tsconfig.
import test from "node:test";
import { checkConformance } from "../src/lib/addon-health/conformance.ts";

const manifest = {
  id: "org.example.addon",
  version: "1.0.0",
  name: "Example",
  resources: ["stream", { name: "meta", types: ["movie"], idPrefixes: ["tt"] }],
  types: ["movie"],
  catalogs: [{ id: "top", type: "movie" }],
};

test("a well-formed manifest conforms", () => {
  assert.deepEqual(checkConformance("manifest", manifest), []);
});

test("a manifest missing its resources is reported", () => {
  const { resources: _resources, ...rest } = manifest;
  assert.deepEqual(checkConformance("manifest", rest), ["manifest.resources is not an array"]);
});

test("a manifest resource object without a name is reported", () => {
  const issues = checkConformance("manifest", { ...manifest, resources: [{ types: ["movie"] }] });
  assert.deepEqual(issues, ["resources[0] has no name"]);
});

test("streams need a source", () => {
  assert.deepEqual(checkConformance("stream", { streams: [{ url: "https://x.test/a.mkv" }] }), []);
  assert.deepEqual(checkConformance("stream", { streams: [{ infoHash: "abc" }] }), []);
  assert.deepEqual(checkConformance("stream", { streams: [{ nzbUrl: "https://x.test/a.nzb" }] }), []);
  assert.deepEqual(checkConformance("stream", { streams: [{ name: "no source" }] }), [
    "streams[0] has no source",
  ]);
  assert.deepEqual(checkConformance("stream", { streams: [] }), []);
  assert.deepEqual(checkConformance("stream", { error: "nope" }), ["response has no streams array"]);
});

test("catalog and meta responses need id, type and name", () => {
  assert.deepEqual(
    checkConformance("catalog", { metas: [{ id: "tt1", type: "movie", name: "A" }] }),
    [],
  );
  assert.deepEqual(checkConformance("catalog", { metas: [{ id: "tt1" }] }), [
    "metas[0] needs an id, a type and a name",
  ]);
  assert.deepEqual(checkConformance("meta", { meta: { id: "tt1", type: "movie", name: "A" } }), []);
  assert.deepEqual(checkConformance("meta", {}), ["response has no meta object"]);
});

test("subtitles need a url and a language", () => {
  assert.deepEqual(
    checkConformance("subtitles", { subtitles: [{ id: "1", url: "https://x.test/a.srt", lang: "eng" }] }),
    [],
  );
  assert.deepEqual(checkConformance("subtitles", { subtitles: [{ id: "1" }] }), [
    "subtitles[0] needs a url and a lang",
  ]);
});

test("non-object bodies never throw", () => {
  for (const kind of ["manifest", "stream", "catalog", "meta", "subtitles"] as const)
    for (const body of [null, undefined, 3, "x", []])
      assert.ok(checkConformance(kind, body).length > 0);
});
