// @ts-expect-error Node test types are intentionally outside the browser-only tsconfig.
import assert from "node:assert/strict";
// @ts-expect-error Node test types are intentionally outside the browser-only tsconfig.
import test from "node:test";
import { countsAsOutcome, testAddon, type TestDeps } from "../src/lib/addon-health/test-addon.ts";

const manifest = {
  id: "org.example.addon",
  version: "1.0.0",
  name: "Example",
  resources: ["catalog", "stream"],
  types: ["movie"],
  catalogs: [
    { id: "search-only", type: "movie", extra: [{ name: "search", isRequired: true }] },
    { id: "top", type: "movie" },
  ],
};

const ok = (body: unknown) => ({ status: 200, text: JSON.stringify(body) });

function deps(routes: Record<string, () => Promise<{ status: number; text: string }>>): TestDeps & { urls: string[] } {
  const urls: string[] = [];
  return {
    urls,
    accepts: (_m, resource) => resource === "stream",
    fetchText: async (url) => {
      urls.push(url);
      const route = Object.entries(routes).find(([suffix]) => url.endsWith(suffix));
      if (!route) throw new TypeError("Failed to fetch");
      return route[1]();
    },
  };
}

const streams = { streams: [{ url: "https://example.org/a.mp4" }] };

test("a healthy addon passes and only plain catalogs are requested", async () => {
  const d = deps({
    "/manifest.json": async () => ok(manifest),
    "/catalog/movie/top.json": async () => ok({ metas: [{ id: "tt1", type: "movie", name: "A" }] }),
    "/stream/movie/tt0063350.json": async () => ok(streams),
  });
  const result = await testAddon("https://a.example/manifest.json", d);
  assert.equal(result.status, "pass");
  assert.deepEqual(result.steps.map((s) => s.name), ["manifest", "catalog", "stream"]);
  assert.ok(!d.urls.some((u) => u.includes("search-only")));
});

test("an empty stream list fails with no-streams but is not scored", async () => {
  const d = deps({
    "/manifest.json": async () => ok(manifest),
    "/catalog/movie/top.json": async () => ok({ metas: [] }),
    "/stream/movie/tt0063350.json": async () => ok({ streams: [] }),
  });
  const result = await testAddon("https://a.example/manifest.json", d);
  assert.equal(result.status, "fail");
  assert.equal(result.reason, "no-streams");
  assert.equal(countsAsOutcome(result), false);
});

test("bad JSON, HTTP errors and network errors are classified", async () => {
  const bad = await testAddon("https://a.example/manifest.json", deps({ "/manifest.json": async () => ({ status: 200, text: "<html>" }) }));
  assert.equal(bad.reason, "bad-json");
  const http = await testAddon("https://a.example/manifest.json", deps({ "/manifest.json": async () => ({ status: 503, text: "" }) }));
  assert.equal(http.reason, "http");
  assert.equal(http.detail, "HTTP 503");
  const net = await testAddon("https://a.example/manifest.json", deps({}));
  assert.equal(net.reason, "network");
  assert.equal(countsAsOutcome(net), true);
});

test("a manifest that breaks the protocol stops the test", async () => {
  const d = deps({ "/manifest.json": async () => ok({ id: "x" }) });
  const result = await testAddon("https://a.example/manifest.json", d);
  assert.equal(result.reason, "schema");
  assert.equal(result.steps.length, 1);
});

test("a hung request times out", async () => {
  const d: TestDeps = {
    accepts: () => false,
    fetchText: (_url, signal) =>
      new Promise((_resolve, reject) => signal.addEventListener("abort", () => reject(new Error("aborted")))),
  };
  const started = Date.now();
  const timers = globalThis.setTimeout;
  globalThis.setTimeout = ((fn: () => void) => timers(fn, 5)) as typeof setTimeout;
  try {
    const result = await testAddon("https://a.example/manifest.json", d);
    assert.equal(result.reason, "timeout");
  } finally {
    globalThis.setTimeout = timers;
  }
  assert.ok(Date.now() - started < 1000);
});
