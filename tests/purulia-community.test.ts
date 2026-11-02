import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  COMMUNITY_RESOURCES,
  PURULIA_DATA_URL,
  PURULIA_SITE,
  communityResourceUrl,
  loadCommunityFacts,
  parseCommunityFacts,
} from "../src/lib/community/purulia.ts";

const fixture = () =>
  JSON.parse(
    readFileSync(new URL("./fixtures/community/purulia-facts.json", import.meta.url), "utf8"),
  );

test("adapts the upstream district schema, dates, NFHS alias, and parent survey geography", () => {
  const facts = parseCommunityFacts(fixture());
  const purulia = facts.districts.find((item) => item.slug === "purulia")!;
  assert.equal(facts.generated, "2026-10-03");
  assert.equal(purulia.metrics[0].value, 2930115);
  assert.equal(purulia.metrics[1].value, 32.45);
  assert.equal(purulia.metrics[2].value, 87.6);
  assert.equal(purulia.metrics[2].period, "NFHS-5 (2019–21)");
  assert.equal(purulia.metrics[2].source?.read, "2026-10-03");
  assert.equal(purulia.surveyScope, "Puruliya");
  assert.equal(facts.districts[0].surveyScope, "Jalpaiguri");
});

test("zero is evidence; missing, malformed, unsourced, and out-of-range values stay unknown", () => {
  const data = fixture();
  data.districts.purulia.census2011.population = "2930115";
  data.districts.purulia.jjm.pct = 0;
  data.nfhs.districts.Puruliya.water = [null, 99];
  data.nfhs.districts.Puruliya.sanitation = [101, 12];
  data.nfhs.districts.Puruliya.electricity = [Infinity, 90];
  let district = parseCommunityFacts(data).districts[1];
  assert.deepEqual(
    district.metrics.map((item) => item.value),
    [null, 0, null, null, null],
  );
  delete data.sources.jjm;
  data.generated = "2026-02-30";
  data.sources.nfhs.read = "tomorrow";
  district = parseCommunityFacts(data).districts[1];
  assert.equal(district.metrics[1].value, null);
  assert.equal(district.metrics[2].source?.read, null);
  assert.equal(parseCommunityFacts(data).generated, null);
});

test("projects aggregate fields only and never trusts upstream links or arbitrary district keys", () => {
  const data = fixture();
  data.districts.purulia.reporter_email = "private@example.invalid";
  data.districts.purulia.website = "javascript:alert(1)";
  data.sources.nfhs.url = "https://untrusted.invalid/";
  data.districts["../../admin"] = data.districts.purulia;
  const facts = parseCommunityFacts(data);
  assert.equal(facts.districts.length, 2);
  assert.doesNotMatch(JSON.stringify(facts), /private@|javascript:|untrusted/);
  assert.throws(() => parseCommunityFacts(null));
  assert.throws(() => parseCommunityFacts({ districts: Array(101).fill({}) }));
});

test("all community destinations stay on Parishkar and receive only supported district context", () => {
  for (const resource of COMMUNITY_RESOURCES) {
    const url = new URL(communityResourceUrl(resource.id, "north-24-parganas"));
    assert.ok(url.href.startsWith(PURULIA_SITE));
    assert.equal(url.search, resource.district ? "?d=north-24-parganas" : "");
    assert.equal(url.hash, "");
  }
  assert.throws(() => communityResourceUrl("reports", "purulia&token=secret"));
  assert.throws(() => communityResourceUrl("admin" as never, "purulia"));
});

test("fetch is fail-closed, pinned, credential-free, and requires a new explicit action", async () => {
  let calls = 0;
  const fetcher = (async (url, options) => {
    calls++;
    assert.equal(url, PURULIA_DATA_URL);
    assert.equal(options?.method, "GET");
    assert.equal(options?.credentials, "omit");
    assert.equal(options?.referrerPolicy, "no-referrer");
    assert.equal(options?.redirect, "error");
    assert.equal(options?.cache, "no-store");
    assert.equal(options?.body, undefined);
    assert.equal(options?.headers, undefined);
    return new Response(JSON.stringify(fixture()));
  }) as typeof fetch;
  await assert.rejects(loadCommunityFacts({ consent: false, fetcher }));
  await assert.rejects(loadCommunityFacts({ consent: "true" as never, fetcher }));
  assert.equal(calls, 0);
  await loadCommunityFacts({ consent: true, fetcher });
  assert.equal(calls, 1);
});

test("cancellation, transport errors, and invalid payloads fail without retrying", async () => {
  const controller = new AbortController();
  let received: AbortSignal | undefined;
  let calls = 0;
  const fetcher = (async (_url, options) => {
    calls++;
    received = options?.signal as AbortSignal;
    controller.abort();
    return new Response(JSON.stringify(fixture()));
  }) as typeof fetch;
  await assert.rejects(loadCommunityFacts({ consent: true, signal: controller.signal, fetcher }));
  assert.equal(received?.aborted, true);
  await assert.rejects(loadCommunityFacts({ consent: true, signal: controller.signal, fetcher }));
  assert.equal(calls, 1);
  for (const response of [
    new Response("{}", { status: 503 }),
    new Response("not json"),
    new Response("x".repeat(256001)),
  ]) {
    await assert.rejects(
      loadCommunityFacts({ consent: true, fetcher: (async () => response) as typeof fetch }),
    );
  }
});
