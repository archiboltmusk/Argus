import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { Meta } from "../src/lib/cinemeta";
import type { Profile } from "../src/lib/profiles";
import {
  extractContentVector,
  cosineSimilarity,
  generateDailyMixes,
} from "../src/lib/algo/content-dna";
import {
  recordImpression,
  getImpressionFatigueDiscount,
  recordTrailerProgress,
} from "../src/lib/algo/implicit-tracker";
import {
  rankNextUpCandidates,
  getCurrentDaypart,
} from "../src/lib/algo/session-transition";
import { computeTasteBlend } from "../src/lib/algo/taste-blend";

const sampleActionMovie: Meta = {
  id: "m_action_1",
  name: "Cyber Strike: Neo Tokyo",
  type: "movie",
  genres: ["Action", "Sci-Fi", "Thriller"],
  description: "A cyberpunk detective in a dystopian futuristic city.",
  releaseInfo: "2024",
  runtime: "110 min",
};

const sampleComfortComedy: Meta = {
  id: "m_comedy_1",
  name: "Wholesome Family Roadtrip",
  type: "movie",
  genres: ["Comedy", "Family"],
  description: "A feel-good heartwarming adventure across the countryside.",
  releaseInfo: "2021",
  runtime: "92 min",
};

const sampleHeavyDrama: Meta = {
  id: "m_drama_1",
  name: "Dark Shadows of War",
  type: "movie",
  genres: ["War", "Drama", "History"],
  description: "A brutal, visceral and tragic account of battle.",
  releaseInfo: "1998",
  runtime: "170 min",
};

describe("Content DNA Vector Engine (Spotify Grade)", () => {
  it("extracts 8-dimensional vectors accurately based on genres and keywords", () => {
    const actionVec = extractContentVector(sampleActionMovie);
    const comedyVec = extractContentVector(sampleComfortComedy);

    // Cyberpunk action movie should have high adrenaline and pacing
    assert.ok(actionVec.adrenaline > 0.6);
    assert.ok(actionVec.pacing > 0.6);

    // Wholesome comedy should have high valence and tone
    assert.ok(comedyVec.valence > 0.7);
    assert.ok(comedyVec.tone > 0.7);
    assert.ok(comedyVec.violence < 0.3);
  });

  it("calculates cosine similarity correctly", () => {
    const actionVec = extractContentVector(sampleActionMovie);
    const comedyVec = extractContentVector(sampleComfortComedy);

    const selfSim = cosineSimilarity(actionVec, actionVec);
    assert.ok(Math.abs(selfSim - 1.0) < 0.001);

    const crossSim = cosineSimilarity(actionVec, comedyVec);
    assert.ok(crossSim < 1.0);
    assert.ok(crossSim > 0.0);
  });

  it("generates Daily Mix taste avenues with K-Means clustering", () => {
    const pool = [sampleActionMovie, sampleComfortComedy, sampleHeavyDrama];
    const mixes = generateDailyMixes(pool, pool, 3, 0.2);

    assert.equal(mixes.length, 3);
    for (const mix of mixes) {
      assert.match(mix.name, /Daily Mix/);
      assert.ok(mix.gradient);
      assert.ok(mix.items.length > 0);
      assert.ok(mix.matchScore >= 60);
    }
  });
});

describe("Implicit Behavioral Tracker (Instagram / TikTok Grade)", () => {
  it("calculates YouTube-grade impression fatigue penalties", () => {
    const testId = "test_item_fatigue_" + Math.random().toString(36);
    assert.equal(getImpressionFatigueDiscount(testId), 1.0);

    recordImpression(testId);
    recordImpression(testId);
    recordImpression(testId);
    recordImpression(testId);

    const discounted = getImpressionFatigueDiscount(testId);
    assert.ok(discounted < 1.0);
  });

  it("records trailer progress without throwing", () => {
    assert.doesNotThrow(() => {
      recordTrailerProgress(sampleActionMovie, 0.85);
    });
  });
});

describe("Session Transition & Palate Cleanser Engine (YouTube Grade)", () => {
  it("identifies daypart correctly", () => {
    const night = new Date("2026-11-10T23:30:00");
    assert.equal(getCurrentDaypart(night), "late_night");

    const prime = new Date("2026-11-10T20:00:00");
    assert.equal(getCurrentDaypart(prime), "prime_time");
  });

  it("applies Palate Cleanser rule after heavy visceral drama", () => {
    const candidates = [sampleActionMovie, sampleComfortComedy, sampleHeavyDrama];
    const ranked = rankNextUpCandidates(candidates, {
      lastWatchedMeta: sampleHeavyDrama,
      timeOfDay: "late_night",
    });

    // The comedy should be prioritized as palate cleanser over repeating dark war
    assert.equal(ranked[0].id, sampleComfortComedy.id);
  });
});

describe("Social Taste Blend Engine (Spotify Blend)", () => {
  it("calculates compatibility percentage and zero-conflict recommendations", () => {
    const profileA: Profile = {
      id: "p1",
      name: "Alex",
      color: "#06b6d4",
    };
    const profileB: Profile = {
      id: "p2",
      name: "Jordan",
      color: "#ec4899",
    };

    const blend = computeTasteBlend(
      profileA,
      [sampleActionMovie],
      profileB,
      [sampleComfortComedy],
      [sampleActionMovie, sampleComfortComedy, sampleHeavyDrama],
    );

    assert.ok(blend.compatibilityPercentage >= 60);
    assert.ok(blend.sharedDNAHighlights.length > 0);
    assert.equal(blend.profileA.name, "Alex");
    assert.equal(blend.profileB.name, "Jordan");
  });
});
