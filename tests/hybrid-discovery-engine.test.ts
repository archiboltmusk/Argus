import { test } from "node:test";
import assert from "node:assert/strict";
import type { Meta } from "../src/lib/cinemeta";
import {
  HybridDiscoveryEngine,
  parseRuntimeToMinutes,
  VIBE_CENTROIDS,
} from "../src/lib/algo/hybrid-discovery-engine";

test("HybridDiscoveryEngine: runtime parsing", () => {
  assert.equal(parseRuntimeToMinutes("95 min"), 95);
  assert.equal(parseRuntimeToMinutes("1 h 40 min"), 100);
  assert.equal(parseRuntimeToMinutes("2h 15m"), 135);
  assert.equal(parseRuntimeToMinutes("110"), 110);
  assert.equal(parseRuntimeToMinutes(undefined), null);
});

test("HybridDiscoveryEngine: curates three distinct paths respecting constraints and taste profiles", () => {
  const dummyCatalog: Meta[] = [
    {
      id: "m-safe",
      type: "movie",
      name: "The Methodical Detective",
      genres: ["Crime", "Drama"],
      runtime: "98 min",
      imdbRating: "8.4",
      releaseInfo: "2021",
    },
    {
      id: "m-stretch",
      type: "movie",
      name: "Nebula Odyssey",
      genres: ["Sci-Fi", "Mystery"],
      runtime: "92 min",
      imdbRating: "8.1",
      releaseInfo: "2023",
    },
    {
      id: "m-wildcard",
      type: "movie",
      name: "La Nuit Silencieuse",
      genres: ["Drama", "Mystery"],
      originalLanguage: "fr",
      runtime: "94 min",
      imdbRating: "8.5",
      releaseInfo: "1978",
    },
    {
      id: "m-classic",
      type: "movie",
      name: "Chinatown Protocol",
      genres: ["Mystery", "Thriller"],
      runtime: "99 min",
      imdbRating: "8.2",
      releaseInfo: "1991",
    },
    {
      id: "m-too-long",
      type: "movie",
      name: "The 4-Hour Epic",
      genres: ["Drama"],
      runtime: "240 min",
      imdbRating: "9.0",
    },
    {
      id: "m-low-rating",
      type: "movie",
      name: "Bland Filler",
      genres: ["Crime"],
      runtime: "88 min",
      imdbRating: "4.2",
    },
  ];

  // User's history shows they frequently watch Crime / Drama
  const history = [
    {
      meta: dummyCatalog[0], // User recently completed a Crime drama
      watchedAtEpochMs: Date.now() - 86400 * 1000 * 2, // 2 days ago
      completedFraction: 1.0,
      userRating: 9,
    },
  ];

  const engine = new HybridDiscoveryEngine(history);

  // User queries for a "mind-bending" movie under 100 minutes with min IMDb 7.5
  const triad = engine.curateTriad(
    {
      mood: "mind-bending",
      maxRuntimeMinutes: 100,
      minImdbRating: 7.5,
    },
    dummyCatalog
  );

  assert.ok(triad !== null);
  // The 4-hour epic and low rating film must be excluded
  assert.ok(triad!.candidatePoolSize <= 3);

  // History item (m-safe) was already watched, so it must not be picked again
  assert.notEqual(triad!.safeBet.item.id, "m-safe");
  assert.notEqual(triad!.stretch.item.id, "m-safe");
  assert.notEqual(triad!.wildcard.item.id, "m-safe");

  // Ensure 3 distinct non-overlapping picks
  const pickedIds = new Set([
    triad!.safeBet.item.id,
    triad!.stretch.item.id,
    triad!.wildcard.item.id,
  ]);
  assert.equal(pickedIds.size, 3); // 3 eligible un-watched left in our mock pool

  // Verify paths have clear headlines and explanations
  assert.ok(triad!.safeBet.headline.includes("Safe Bet"));
  assert.ok(triad!.stretch.headline.includes("Stretch"));
  assert.ok(triad!.wildcard.headline.includes("Wildcard"));
  assert.ok(triad!.wildcard.headline.includes("International") || triad!.wildcard.headline.includes("Golden Age"));
});

test("HybridDiscoveryEngine: vibe centroids coverage", () => {
  assert.ok(VIBE_CENTROIDS["mind-bending"].complexity > 0.9);
  assert.ok(VIBE_CENTROIDS["cozy"].violence < 0.05);
  assert.ok(VIBE_CENTROIDS["high-octane"].adrenaline > 0.9);
  assert.ok(VIBE_CENTROIDS["cathartic"].valence < 0.2);
});
