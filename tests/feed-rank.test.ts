import test from "node:test";
import assert from "node:assert/strict";
import { explainAffinity } from "../src/lib/feed/rank";

test("recommendation explanations only report matching local affinity signals", () => {
  const explanation = explainAffinity(
    { id: "tt1", type: "movie", name: "Example", genres: ["Science Fiction"], releaseInfo: "2024" },
    {
      totalEvents: 3,
      genres: { "Science Fiction": 4 },
      decades: {},
      languages: {},
      cast: {},
      directors: {},
      creators: {},
      keywords: {},
      lastUpdated: 0,
    },
  );
  assert.equal(explanation?.label, "Because you enjoy Science Fiction");
  assert.match(explanation?.detail ?? "", /on-device/i);
});

test("recommendation explanations stay silent when no local signal matches", () => {
  const explanation = explainAffinity(
    { id: "tt2", type: "movie", name: "Example", genres: ["Drama"], releaseInfo: "2024" },
    {
      totalEvents: 2,
      genres: {},
      decades: {},
      languages: {},
      cast: {},
      directors: {},
      creators: {},
      keywords: {},
      lastUpdated: 0,
    },
  );
  assert.equal(explanation, null);
});
