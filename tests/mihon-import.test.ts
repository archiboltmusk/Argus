import "./_localstorage-stub.ts";
import test from "node:test";
import assert from "node:assert/strict";
import { importMihonRepo } from "../src/lib/manga/sources/mihon/repo.ts";

test("importMihonRepo extracts and registers manga sources into catalog", async () => {
  // Mock fetch for Mihon index.min.json
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input: RequestInfo | URL) => {
    const urlStr = String(input);
    if (urlStr.includes("index.min.json") || urlStr.includes("index.json")) {
      const mockIndex = [
        {
          name: "Flame Comics",
          pkg: "eu.kanade.tachiyomi.extension.en.flamecomics",
          apk: "flamecomics.apk",
          lang: "en",
          code: 1,
          version: "1.0",
          sources: [
            {
              name: "Flame Comics",
              lang: "en",
              id: "flame-src-1",
              baseUrl: "https://flamecomics.xyz",
            },
          ],
        },
        {
          name: "Asura Scans",
          pkg: "eu.kanade.tachiyomi.extension.en.asurascans",
          apk: "asurascans.apk",
          lang: "en",
          code: 2,
          version: "1.1",
          sources: [
            {
              name: "Asura Scans",
              lang: "en",
              id: "asura-src-1",
              baseUrl: "https://asuracomic.net",
            },
          ],
        },
      ];
      return new Response(JSON.stringify(mockIndex), { status: 200 });
    }
    return originalFetch(input);
  };

  try {
    const result = await importMihonRepo("https://example.com/mihon/index.min.json");
    assert.ok(result.installed >= 2, "Must import at least 2 Mihon sources");
    assert.equal(result.failed, 0);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
