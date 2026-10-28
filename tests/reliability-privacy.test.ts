import assert from "node:assert/strict";
import test from "node:test";
import { scrubPrivateUrlsAndPaths } from "../src/lib/diagnostics/collect-runtime.ts";
import { freeStorageSpace } from "../src/lib/storage-recovery.ts";

test("diagnostics remove configured URLs, authorization and user paths", () => {
  const output = scrubPrivateUrlsAndPaths('https://user:password@addon.example/private-token/manifest.json?key=secret Bearer abc123 C:\\Users\\Alice\\file /Users/Bob/file');
  for (const secret of ["password", "private-token", "secret", "abc123", "Alice", "Bob"]) assert.equal(output.includes(secret), false);
  assert.ok(output.includes("addon.example"));
});

test("cache eviction preserves parental controls and playback history", () => {
  const original = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  const values = new Map([
    ["argus.parental", "keep"], ["argus.playback-history.v1", "keep"],
    ["argus.playback-history.v1.profile", "keep"], ["argus.omdb.v1", "cache"],
  ]);
  Object.defineProperty(globalThis, "localStorage", { configurable: true, value: {
    get length() { return values.size; }, key: (index: number) => [...values.keys()][index] ?? null,
    getItem: (key: string) => values.get(key) ?? null, removeItem: (key: string) => values.delete(key),
  } });
  try {
    const result = freeStorageSpace();
    assert.deepEqual(result.pruned, ["argus.omdb.v1"]);
    assert.equal(values.get("argus.parental"), "keep");
    assert.equal(values.get("argus.playback-history.v1.profile"), "keep");
  } finally {
    if (original) Object.defineProperty(globalThis, "localStorage", original);
    else Reflect.deleteProperty(globalThis, "localStorage");
  }
});
