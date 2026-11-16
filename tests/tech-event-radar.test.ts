import assert from "node:assert/strict";
import test from "node:test";
import {
  TechEventRadarEngine,
  CURATED_KOLKATA_RADAR,
} from "../src/lib/community/tech-event-radar";

test("TechEventRadar: loads curated multi-source Kolkata events across tech and culture", () => {
  const engine = new TechEventRadarEngine();
  const allEvents = engine.getUpcomingEvents();

  assert.ok(allEvents.length >= 6, "Expected at least 6 curated tech & cultural events");

  const devfest = allEvents.find((e) => e.id === "gdg-kolkata-devfest-2026");
  assert.ok(devfest, "DevFest Kolkata 2026 should be registered");
  assert.equal(devfest?.sourceTier, "developer_community");
  assert.equal(devfest?.domain, "tech_devfest");

  const kiff = allEvents.find((e) => e.id === "kiff-kolkata-film-festival-2026");
  assert.ok(kiff, "Kolkata Film Festival should be registered in cultural tier");
  assert.equal(kiff?.sourceTier, "cultural_ticketing");
  assert.equal(kiff?.domain, "cultural_cinema");
});

test("TechEventRadar: filters by source tier and allows noise suppression", () => {
  const engine = new TechEventRadarEngine();

  const techOnly = engine.getUpcomingEvents("developer_community");
  assert.ok(techOnly.every((e) => e.sourceTier === "developer_community"));

  const culturalOnly = engine.getUpcomingEvents("cultural_ticketing");
  assert.ok(culturalOnly.every((e) => e.sourceTier === "cultural_ticketing"));

  // Verify BookMyShow noise suppression preference
  engine.updatePreferences({ notifyCulturalPerformances: false });
  const prefs = engine.getPreferences();
  assert.equal(prefs.notifyCulturalPerformances, false);
});

test("TechEventRadar: ingests external feed (Apify / Hackathon Finder / GDG) with deduplication", () => {
  const engine = new TechEventRadarEngine();

  const count = engine.ingestExternalFeed(
    [
      {
        id: "apify_hackathon_unstop_01",
        title: "Eastern India AI Sprint 2027",
        rsvpUrl: "https://unstop.com/hackathons/kolkata-ai-2027",
        venue: "Jadavpur University, Kolkata",
        priceDisplay: "Free",
      },
      // Duplicate should be ignored
      {
        id: "apify_hackathon_unstop_01",
        title: "Eastern India AI Sprint 2027 Duplicate",
        rsvpUrl: "https://unstop.com/hackathons/kolkata-ai-2027",
        venue: "Jadavpur University, Kolkata",
      },
    ],
    "hackathon_aggregator"
  );

  assert.equal(count, 1, "Only 1 new event should be ingested");

  const ingested = engine.getUpcomingEvents().find((e) => e.id === "apify_hackathon_unstop_01");
  assert.ok(ingested);
  assert.equal(ingested?.domain, "tech_hackathon");
});
