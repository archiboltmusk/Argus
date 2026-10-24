import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";
import { matchEpisodeFileIndex } from "../src/lib/streams/episode-file.ts";
import { hashFromMagnet, magnetFromHash } from "../src/lib/debrid/types.ts";

function loadModule(file: string, fetchImpl: (url: string, init?: any) => Promise<any>) {
  const mocks: Record<string, unknown> = {
    "@/lib/debug": { dlog() {}, dwarn() {} },
    "@/lib/streams/episode-file": { matchEpisodeFileIndex },
    "./types": { hashFromMagnet, magnetFromHash },
    "@/lib/safe-fetch": { safeFetch: fetchImpl },
  };
  const code = readFileSync(file, "utf8");
  const compiled = ts.transpileModule(code, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
  }).outputText;
  const exports: Record<string, any> = {};
  new Function("require", "exports", compiled)((id: string) => {
    assert.ok(Object.hasOwn(mocks, id), `Unexpected dependency: ${id}`);
    return mocks[id];
  }, exports);
  return exports;
}

test("Real-Debrid cacheCheck batches up to 100 hashes per request and parses results", async () => {
  const requestedUrls: string[] = [];

  const h1 = "1111111111111111111111111111111111111111";
  const h2 = "2222222222222222222222222222222222222222";

  const fetchMock = async (url: string) => {
    requestedUrls.push(url);
    if (url.includes("/torrents/instantAvailability")) {
      return {
        ok: true,
        status: 200,
        json: async () => ({
          [h1]: {
            rd: [{ filename: "movie.mkv", filesize: 2000000000 }],
          },
          [h2]: {}, // empty: uncached
        }),
      };
    }
    return { ok: false, status: 404 };
  };

  const rdModule = loadModule("src/lib/debrid/realdebrid.ts", fetchMock);
  const rd = rdModule.createRealDebrid("mock_api_key");
  const result = await rd.cacheCheck([h1, h2], new AbortController().signal);

  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.data[h1], true);
    assert.equal(result.data[h2], undefined);
  }
  assert.equal(requestedUrls.length, 1);
  assert.ok(requestedUrls[0].includes(`/torrents/instantAvailability/${h1}/${h2}`));
});

test("Real-Debrid cacheCheck splits 150 hashes into 2 batches of at most 100", async () => {
  const requestedUrls: string[] = [];

  const hashes: string[] = [];
  for (let i = 0; i < 150; i++) {
    hashes.push(i.toString().padStart(40, "0"));
  }

  const fetchMock = async (url: string) => {
    requestedUrls.push(url);
    return {
      ok: true,
      status: 200,
      json: async () => ({}),
    };
  };

  const rdModule = loadModule("src/lib/debrid/realdebrid.ts", fetchMock);
  const rd = rdModule.createRealDebrid("mock_api_key");
  const result = await rd.cacheCheck(hashes, new AbortController().signal);

  assert.equal(result.ok, true);
  assert.equal(requestedUrls.length, 2);
  // First batch has 100 hashes
  const batch1Hashes = requestedUrls[0].split("/torrents/instantAvailability/")[1].split("/");
  assert.equal(batch1Hashes.length, 100);
  // Second batch has 50 hashes
  const batch2Hashes = requestedUrls[1].split("/torrents/instantAvailability/")[1].split("/");
  assert.equal(batch2Hashes.length, 50);
});

test("TorBox cacheCheck batches and parses cached hashes", async () => {
  const h1 = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";

  const fetchMock = async (url: string) => {
    if (url.includes("/torrents/checkcached")) {
      return {
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          data: {
            [h1]: { name: "test.mkv", size: 1000 },
          },
        }),
      };
    }
    return { ok: false, status: 404 };
  };

  const tbModule = loadModule("src/lib/debrid/torbox.ts", fetchMock);
  const tb = tbModule.createTorbox("mock_token");
  const result = await tb.cacheCheck([h1], new AbortController().signal);
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.data[h1], true);
  }
});

test("AllDebrid cacheCheck batches and parses instant magnets", async () => {
  const h1 = "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";

  const fetchMock = async (url: string) => {
    if (url.includes("/magnet/instant")) {
      return {
        ok: true,
        status: 200,
        json: async () => ({
          status: "success",
          data: {
            magnets: [{ hash: h1, instant: true }],
          },
        }),
      };
    }
    return { ok: false, status: 404 };
  };

  const adModule = loadModule("src/lib/debrid/alldebrid.ts", fetchMock);
  const ad = adModule.createAllDebrid("mock_token");
  const result = await ad.cacheCheck([h1], new AbortController().signal);
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.data[h1], true);
  }
});
