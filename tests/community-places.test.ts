import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  COMMUNITY_ADAPTERS,
  manualCommunityPlace,
  parsePlaces,
  placeLinks,
  searchCommunityPlaces,
} from "../src/lib/community/places.ts";

const fixture = () =>
  JSON.parse(
    readFileSync(new URL("./fixtures/community/global-places.json", import.meta.url), "utf8"),
  );

test("worldwide places preserve small Slovak towns, New York, same-name distinctions and provenance", () => {
  const places = parsePlaces(fixture());
  assert.equal(places[0].name, "Banská Štiavnica");
  assert.equal(places[0].countryCode, "SK");
  assert.equal(places[0].source, "geonames");
  const nyc = places.find((p) => p.id === "geonames:5128581")!;
  assert.equal(nyc.countryCode, "US");
  assert.ok(placeLinks(nyc).every((link) => link.url.startsWith("https://")));
  const adapters = (p: typeof nyc) =>
    COMMUNITY_ADAPTERS.filter((a) => a.supports(p)).map((a) => a.id);
  assert.deepEqual(adapters(places[0]), ["slovakia"]);
  assert.deepEqual(adapters(nyc), ["nyc"]);
  assert.deepEqual(adapters(places.find((p) => p.name === "York")!), []);
  assert.deepEqual(adapters({ ...nyc, countryCode: "GB" }), []);
});

test("any unlisted place has an offline workspace without guessed services, coordinates or population", () => {
  const place = manualCommunityPlace("A small village", "Slovakia");
  assert.equal(place.countryCode, null);
  assert.equal(place.population, null);
  assert.equal(place.latitude, null);
  assert.deepEqual(placeLinks(place), []);
  assert.ok(COMMUNITY_ADAPTERS.every((adapter) => !adapter.supports(place)));
  assert.throws(() => manualCommunityPlace("", "Slovakia"));
  assert.throws(() => manualCommunityPlace("A".repeat(121), "Slovakia"));
});

test("malformed coordinates, URLs, arbitrary fields and duplicate results cannot become service destinations", () => {
  const data = fixture();
  const row = data.results[0];
  data.results.push({ ...row, id: 999, latitude: 999, website: "javascript:alert(1)" });
  data.results.push(row);
  data.results[0].private_note = "DO NOT FORWARD";
  const result = parsePlaces(data);
  assert.equal(result.length, fixture().results.length);
  assert.doesNotMatch(JSON.stringify(result), /DO NOT FORWARD|javascript:/);
  assert.deepEqual(placeLinks({ ...result[0], latitude: Infinity }), []);
  assert.deepEqual(parsePlaces({}), []);
  assert.throws(() => parsePlaces({ results: {} }));
  assert.throws(() => parsePlaces({ error: true, reason: "Private provider detail" }));
});

test("search encodes public place text, filters countries and fails closed without explicit consent", async () => {
  let requests = 0;
  const fetcher = (async (raw, options) => {
    requests++;
    const url = new URL(String(raw));
    assert.equal(url.origin, "https://geocoding-api.open-meteo.com");
    assert.equal(url.searchParams.get("name"), "Banská Štiavnica");
    assert.equal(url.searchParams.get("countryCode"), "SK");
    assert.equal(url.searchParams.get("count"), "10");
    assert.equal(options?.credentials, "omit");
    assert.equal(options?.referrerPolicy, "no-referrer");
    assert.equal(options?.headers, undefined);
    return new Response(JSON.stringify(fixture()));
  }) as typeof fetch;
  await assert.rejects(
    searchCommunityPlaces("Banská Štiavnica", "SK", { consent: false, fetcher }),
  );
  await assert.rejects(searchCommunityPlaces("x", "SK", { consent: true, fetcher }));
  await assert.rejects(
    searchCommunityPlaces("New York", "US&token=private", { consent: true, fetcher }),
  );
  assert.equal(requests, 0);
  assert.equal(
    (await searchCommunityPlaces("Banská Štiavnica", "sk", { consent: true, fetcher })).length,
    4,
  );
  assert.equal(requests, 1);
});
