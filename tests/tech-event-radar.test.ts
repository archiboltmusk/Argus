import assert from "node:assert/strict";
import test from "node:test";
import {
  TechEventRadarEngine,
  CURATED_KOLKATA_TECH_RADAR,
} from "../src/lib/community/tech-event-radar";

test("TechEventRadar: loads curated Kolkata tech events including DevFest and Cloud Community Day", () => {
  const engine = new TechEventRadarEngine();
  const events = engine.getUpcomingEvents();

  assert.ok(events.length >= 3, "Expected at least 3 curated tech events");

  const devfest = events.find((e) => e.id === "gdg-kolkata-devfest-2026");
  assert.ok(devfest, "DevFest Kolkata 2026 should be registered in radar");
  assert.equal(devfest?.community, "GDG Kolkata");
  assert.equal(devfest?.city, "Kolkata");
  assert.equal(devfest?.status, "tickets-live");
  assert.ok(devfest?.rsvpUrl.includes("gdg.community.dev"));
});

test("TechEventRadar: registers custom local developer events with unique IDs", () => {
  const engine = new TechEventRadarEngine();
  const custom = engine.registerCustomEvent({
    title: "Kolkata AI Hackathon 2026",
    community: "Kolkata Tech Network",
    category: "hackathon",
    dateDisplay: "January 2027",
    startDateIso: "2027-01-15T09:00:00+05:30",
    venue: "Biswa Bangla Gate, Kolkata",
    city: "Kolkata",
    rsvpUrl: "https://lu.ma/kolkata-ai-2027",
    status: "early-bird",
    description: "48-hour generative AI hackathon building local-first models.",
  });

  assert.ok(custom.id.startsWith("event_"));
  assert.equal(custom.notified, false);

  const all = engine.getUpcomingEvents();
  assert.ok(all.some((e) => e.id === custom.id));
});

test("TechEventRadar: prevents notification spam by marking events as notified", () => {
  const engine = new TechEventRadarEngine();
  const eventId = "gdg-kolkata-devfest-2026";

  engine.markNotified(eventId);

  const events = engine.getUpcomingEvents();
  const devfest = events.find((e) => e.id === eventId);
  assert.equal(devfest?.notified, true);
});
