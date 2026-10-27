import assert from "node:assert/strict";
import test from "node:test";
import { loadSavedSearches, removeSavedSearch, saveSearch } from "../src/lib/saved-searches.ts";

function memoryStorage() {
  const values = new Map<string, string>();
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
    },
  });
  return values;
}

test("saved queries normalize whitespace and move case-insensitive repeats to the front", () => {
  memoryStorage();
  assert.deepEqual(saveSearch("a", "  Seven\n Samurai  "), ["Seven Samurai"]);
  saveSearch("a", "Amélie");
  assert.deepEqual(saveSearch("a", "seven   samurai"), ["seven samurai", "Amélie"]);
  assert.deepEqual(loadSavedSearches("a"), ["seven samurai", "Amélie"]);
});

test("captured profile IDs isolate reading, saving and removal", () => {
  memoryStorage();
  saveSearch("a", "Arrival");
  saveSearch("b", "Dune");
  removeSavedSearch("a", "ARRIVAL");
  assert.deepEqual(loadSavedSearches("a"), []);
  assert.deepEqual(loadSavedSearches("b"), ["Dune"]);
});

test("profile key encoding keeps otherwise similar IDs separate", () => {
  memoryStorage();
  saveSearch("a/b", "Arrival");
  saveSearch("a%2Fb", "Dune");
  assert.deepEqual(loadSavedSearches("a/b"), ["Arrival"]);
  assert.deepEqual(loadSavedSearches("a%2Fb"), ["Dune"]);
});

test("saved queries retain only the latest twenty entries", () => {
  memoryStorage();
  for (let index = 0; index < 25; index++) saveSearch("a", `Query ${index}`);
  const queries = loadSavedSearches("a");
  assert.equal(queries.length, 20);
  assert.equal(queries[0], "Query 24");
  assert.equal(queries.at(-1), "Query 5");
});

test("empty and oversized queries are rejected without displacing saved entries", () => {
  memoryStorage();
  saveSearch("a", "Arrival");
  assert.deepEqual(saveSearch("a", " \n "), ["Arrival"]);
  assert.deepEqual(saveSearch("a", "x".repeat(201)), ["Arrival"]);
  assert.equal(saveSearch("a", "x".repeat(200))[0].length, 200);
  assert.deepEqual(removeSavedSearch("a", " \n "), loadSavedSearches("a"));
});

test("stored entries are bounded, validated and deduplicated when loaded", () => {
  const values = memoryStorage();
  saveSearch("a", "seed");
  const key = [...values.keys()][0];
  values.set(key, JSON.stringify([null, 42, {}, "  Arrival ", "arrival", "", "x".repeat(201), ...Array.from({ length: 30 }, (_, index) => `Title ${index}`)]));
  const queries = loadSavedSearches("a");
  assert.equal(queries[0], "Arrival");
  assert.equal(queries.length, 20);
  assert.equal(queries.filter((query) => query.toLowerCase() === "arrival").length, 1);
});

test("malformed JSON and unexpected storage shapes recover to an empty list", () => {
  const values = memoryStorage();
  saveSearch("a", "seed");
  const key = [...values.keys()][0];
  for (const raw of ["{broken", "null", "{}", '"text"']) {
    values.set(key, raw);
    assert.deepEqual(loadSavedSearches("a"), []);
  }
  assert.deepEqual(saveSearch("a", "Arrival"), ["Arrival"]);
});

test("unavailable storage never throws or reports unpersisted saves as successful", () => {
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    get() { throw new Error("Storage unavailable"); },
  });
  assert.deepEqual(loadSavedSearches("a"), []);
  assert.deepEqual(saveSearch("a", "Arrival"), []);
  assert.deepEqual(removeSavedSearch("a", "Arrival"), []);
});

test("a failed write returns the previously persisted list", () => {
  const values = memoryStorage();
  saveSearch("a", "Arrival");
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: {
      getItem: (key: string) => values.get(key) ?? null,
      setItem() { throw new Error("Quota exceeded"); },
    },
  });
  assert.deepEqual(saveSearch("a", "Dune"), ["Arrival"]);
  assert.deepEqual(removeSavedSearch("a", "Arrival"), ["Arrival"]);
});
