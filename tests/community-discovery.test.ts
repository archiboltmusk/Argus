import assert from "node:assert/strict";
import test from "node:test";
import { manualCommunityPlace } from "../src/lib/community/places.ts";
import { parseHits } from "../src/lib/jina-search.ts";
import {
  discoverPublicInformation,
  discoveryBrowserUrl,
  discoveryQuery,
  parsePublicFindings,
} from "../src/lib/community/web-discovery.ts";

// Synthetic search markup; no claim that these are actual public findings.
const markup = `## [Local public notices](https://town.example.org/notices)
## [Government public projects](https://city.example.gov/projects)
## [Local credential URL](https://user:password@town.example.org/)
## [Internal source result](https://localhost.local/)
## [Loopback address page](https://127.0.0.1/)
## [Unsafe source scheme](http://town.example.org/)
`;

test("existing media parsing retains its default while civic titles stay attached to their own heading", () => {
  const input =
    "## [Original source heading](https://one.example.org/)\n[Longer alternate search result label](https://one.example.org/)";
  assert.equal(parseHits(input)[0].title, "Longer alternate search result label");
  assert.equal(parseHits(input, true)[0].title, "Original source heading");
});

test("generic discovery supports every manual place, limits context to public fields and encodes the browser fallback", () => {
  const place = manualCommunityPlace("Unlisted village & café", "Slovakia");
  const query = discoveryQuery(place, "notices");
  assert.match(query, /Unlisted village & café, Slovakia/);
  assert.match(query, /latest local public notices/);
  const browser = new URL(discoveryBrowserUrl(place, "notices"));
  assert.equal(browser.origin, "https://duckduckgo.com");
  assert.equal(browser.searchParams.get("q"), query);
  assert.equal(browser.searchParams.get("df"), "m");
  assert.throws(() => discoveryQuery(place, "private-draft" as never));
});

test("search hits remain unverified, dates are not fabricated, and government hints are only ordering hints", () => {
  const results = parsePublicFindings(markup, "2026-11-02T12:00:00Z");
  assert.equal(results.length, 2);
  assert.equal(results[0].hostname, "city.example.gov");
  for (const result of results) {
    assert.equal(result.evidenceStatus, "unverified");
    assert.equal(result.publishedAt, null);
    assert.equal(result.retrievedAt, "2026-11-02T12:00:00Z");
  }
  assert.doesNotMatch(JSON.stringify(results), /password|127\.0\.0\.1|localhost/);
  assert.throws(() => parsePublicFindings(markup, "yesterday"));
});

test("live discovery shares the bounded public transport, never auto-fetches results, and does not use an account key", async () => {
  let calls = 0;
  const place = manualCommunityPlace("New York", "United States");
  const fetcher = (async (raw, options) => {
    calls++;
    const url = new URL(String(raw));
    assert.equal(url.hostname, "r.jina.ai");
    assert.ok(url.pathname.startsWith("/https://html.duckduckgo.com/html/"));
    assert.equal(url.searchParams.get("q"), discoveryQuery(place, "services"));
    assert.equal(options?.credentials, "omit");
    assert.equal(options?.referrerPolicy, "no-referrer");
    assert.deepEqual(options?.headers, { Accept: "text/plain", "X-No-Cache": "true", DNT: "1" });
    return new Response(markup);
  }) as typeof fetch;
  await assert.rejects(discoverPublicInformation(place, "services", { consent: false, fetcher }));
  assert.equal(calls, 0);
  assert.equal(
    (await discoverPublicInformation(place, "services", { consent: true, fetcher })).length,
    2,
  );
  assert.equal(calls, 1);
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(
    discoverPublicInformation(place, "services", {
      consent: true,
      signal: controller.signal,
      fetcher,
    }),
  );
  assert.equal(calls, 1);
});
