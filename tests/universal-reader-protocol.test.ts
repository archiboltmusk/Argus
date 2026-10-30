import "./_localstorage-stub.ts";
import test from "node:test";
import assert from "node:assert/strict";
import { SearchThrottler } from "../src/lib/manga/plugins/search-throttler.ts";
import { FontObfuscationDecoder } from "../src/lib/ebook/expansion/font-obfuscation-decoder.ts";
import {
  UniversalProtocolRegistry,
  type UniversalReaderPlugin,
} from "../src/lib/manga/plugins/universal-reader-protocol.ts";

test("SearchThrottler enforces concurrency pooling and caches results", async () => {
  const throttler = SearchThrottler.getInstance();
  throttler.clearCache();

  let activeConcurrencies = 0;
  let maxObservedConcurrency = 0;

  const tasks = Array.from({ length: 12 }, (_, i) => ({
    id: `task-${i}`,
    sourceName: `Source ${i}`,
    execute: async () => {
      activeConcurrencies++;
      if (activeConcurrencies > maxObservedConcurrency) {
        maxObservedConcurrency = activeConcurrencies;
      }
      await new Promise((r) => setTimeout(r, 20));
      activeConcurrencies--;
      return [{ id: `item-${i}`, title: `Title ${i}` }];
    },
  }));

  const results = await throttler.executePool(tasks, "solo leveling");
  assert.equal(results.length, 12, "Must resolve all 12 tasks");
  assert.ok(maxObservedConcurrency <= 5, "Observed concurrency must never exceed pool cap of 5");

  // Verify caching on second run
  const cached = await throttler.executePool(tasks, "solo leveling");
  assert.equal(cached.length, 12, "Must return from cache instantly");
});

test("FontObfuscationDecoder strips honeypot tags, zero-width spaces, and outputs clean prose", () => {
  const decoder = FontObfuscationDecoder.getInstance();
  const rawHtml = `
    <script>window.tracker = 1;</script>
    <p>Lord\u200B of Mysteries chapter\uFEFF begins.</p>
    <span style="display: none;">Scraped from FakeNovel site trap</span>
    <p>Klein Moretti opened his eyes.</p>
  `;

  const decoded = decoder.decode(rawHtml);
  assert.ok(!decoded.cleanHtml.includes("FakeNovel"), "Must strip cloaked honeypot text");
  assert.ok(!decoded.cleanHtml.includes("\u200B"), "Must strip zero-width spaces");
  assert.ok(!decoded.cleanHtml.includes("<script>"), "Must strip script tags");
  assert.ok(decoded.cleanHtml.includes("<p>Klein Moretti opened his eyes.</p>"));
  assert.equal(decoded.strippedTrapsCount, 3, "Must record 3 stripped trap elements (1 honeypot span + 2 zero-width chars)");
  assert.ok(decoded.wordCount >= 8, "Must compute valid word count");
});

test("UniversalProtocolRegistry sniffs plugin types and normalizes registry access", () => {
  const registry = UniversalProtocolRegistry.getInstance();

  const lnreaderType = registry.sniffPluginType('export default class extends Plugin { popularNovels() {} }');
  assert.equal(lnreaderType, "lnreader");

  const mangayomiType = registry.sniffPluginType({ mangayomiSources: [{ name: "Asura", sourceCodeUrl: "..." }] });
  assert.equal(mangayomiType, "mangayomi");

  const legadoType = registry.sniffPluginType({ bookSourceUrl: "https://example.com", ruleSearch: "$.data[*]" });
  assert.equal(legadoType, "legado");

  const mockPlugin: UniversalReaderPlugin = {
    id: "royalroad-mock",
    name: "Royal Road",
    mediaType: "webnovel",
    formatType: "lnreader",
    search: async () => [],
    getPopular: async () => [],
    getChapters: async () => [],
    getContent: async () => ({ type: "text", html: "<p>Sample</p>", wordCount: 1 }),
  };

  registry.registerPlugin(mockPlugin);
  const found = registry.getPlugin("royalroad-mock");
  assert.ok(found);
  assert.equal(found?.name, "Royal Road");

  const webnovels = registry.listPlugins("webnovel");
  assert.ok(webnovels.some((p) => p.id === "royalroad-mock"));
});
