import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";

function loadFeed(hosted, responses) {
  const urls = [];
  const source = readFileSync(new URL("../src/lib/argus-rank.ts", import.meta.url), "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
  });
  const mocks = {
    "@/lib/idb-cache": {
      evictLocalPrefix() {},
      async idbCacheSet() {},
      async idbCacheGet() {
        return null;
      },
    },
    "./config/endpoints": {
      ARGUS_API_BASE: hosted ? "https://custom.example" : "https://argus.invalid",
      ARGUS_HOSTED: hosted,
      HARBOR_FALLBACK_BASE: "https://harborcommunity.site",
    },
    "./safe-fetch": {
      async safeFetch(url) {
        urls.push(url);
        const body = responses.shift();
        return new Response(JSON.stringify(body), {
          headers: { "content-type": "application/json" },
        });
      },
    },
  };
  const module = { exports: {} };
  new Function("require", "module", "exports", "localStorage", outputText)(
    (name) => {
      assert.ok(name in mocks, name);
      return mocks[name];
    },
    module,
    module.exports,
    {
      getItem() {
        return null;
      },
      setItem() {},
    },
  );
  return { feed: module.exports, urls };
}

test("standalone people rankings use the public feed and map its source filename", async () => {
  const person = { id: 5064, name: "Meryl Streep", rank: 1, components: { quality: 0.3 } };
  const { feed, urls } = loadFeed(false, [
    { sources: ["harbor", "tmdb", "unknown"], departments: ["Acting"], countries: [] },
    [person],
    [],
    [],
  ]);
  assert.equal(feed.RANK_FEED_PROVIDER, "Harbor");
  assert.deepEqual((await feed.fetchRankManifest()).sources, ["argus", "tmdb"]);
  assert.deepEqual(await feed.fetchRankList("argus", "Acting", null), {
    source: "argus",
    list: [person],
  });
  await feed.fetchRankList("trending", "Directing", null);
  await feed.fetchRankList("argus", "Writing", "in");
  assert.deepEqual(urls, [
    "https://harborcommunity.site/rank/manifest.json",
    "https://harborcommunity.site/rank/harbor-acting-all.json",
    "https://harborcommunity.site/rank/trending-directing-all.json",
    "https://harborcommunity.site/rank/harbor-writing-in.json",
  ]);
});

test("configured Argus deployments retain their own ranking feed and source names", async () => {
  const { feed, urls } = loadFeed(true, [
    { sources: ["argus", "imdb"], departments: ["Acting"], countries: [] },
    [],
  ]);
  assert.equal(feed.RANK_FEED_PROVIDER, null);
  assert.deepEqual((await feed.fetchRankManifest()).sources, ["argus", "imdb"]);
  await feed.fetchRankList("argus", "Acting", null);
  assert.deepEqual(urls, [
    "https://custom.example/rank/manifest.json",
    "https://custom.example/rank/argus-acting-all.json",
  ]);
});
