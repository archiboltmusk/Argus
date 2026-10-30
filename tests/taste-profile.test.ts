import test from "node:test";
import assert from "node:assert/strict";
import { mergeTaste, tasteFromAffinity } from "../src/lib/discover/taste-profile";

test("cloud taste excludes raw viewing events and title identifiers", () => {
  const taste = tasteFromAffinity({
    totalEvents: 2,
    genres: { Drama: 4 },
    decades: { "1990s": 2 },
    languages: { en: 1 },
    cast: { 42: 9 },
    directors: { 8: 3 },
    creators: {},
    keywords: { 7: 2 },
    lastUpdated: 1,
  });
  assert.deepEqual(taste, { version: 1, genres: { Drama: 4 }, decades: { "1990s": 2 }, languages: { en: 1 } });
  assert.equal(JSON.stringify(taste).includes("42"), false);
});

test("cloud taste merge preserves the stronger local preference", () => {
  const merged = mergeTaste({ genres: { Drama: 2 } }, { genres: { Drama: 5, Comedy: 1 } });
  assert.deepEqual(merged.genres, { Drama: 5, Comedy: 1 });
});
