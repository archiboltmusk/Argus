import test from "node:test";
import assert from "node:assert/strict";
import {
  OFFICIAL_GT_CALENDAR_2026_2027,
  calculateGTStatus,
  getNextUpcomingGT,
  parseGTScheduleFromText,
  generateGTIcsCalendar,
  type ScheduledGrandTest,
} from "../src/lib/education/gt-tracker-engine.ts";

test("GT Tracker: Official benchmark calendar covers all 5 major platforms", () => {
  assert.ok(OFFICIAL_GT_CALENDAR_2026_2027.length >= 8);

  const platforms = new Set(OFFICIAL_GT_CALENDAR_2026_2027.map((t) => t.platform));
  assert.ok(platforms.has("marrow"), "Must cover Marrow GTs");
  assert.ok(platforms.has("cerebellum"), "Must cover Cerebellum Mocks");
  assert.ok(platforms.has("prepladder"), "Must cover PrepLadder Championship Mocks");
  assert.ok(platforms.has("corebtr"), "Must cover CoreBTR Mocks");
  assert.ok(platforms.has("dams"), "Must cover DAMS CBT Mocks");

  for (const t of OFFICIAL_GT_CALENDAR_2026_2027) {
    const start = new Date(t.windowStart).getTime();
    const end = new Date(t.windowEnd).getTime();
    assert.ok(start < end, `Test ${t.testName} windowStart must be before windowEnd`);
    assert.ok(t.totalQuestions > 0);
    assert.ok(t.durationMinutes > 0);
  }
});

test("GT Tracker: calculateGTStatus computes live, upcoming, and ended windows accurately", () => {
  const sampleTest: ScheduledGrandTest = {
    id: "test-gt-status",
    platform: "marrow",
    testName: "Sample Benchmark Mock",
    examPattern: "neet_pg",
    totalQuestions: 200,
    durationMinutes: 210,
    windowStart: "2026-11-20T08:00:00+05:30",
    windowEnd: "2026-11-24T23:59:59+05:30",
    syllabusScope: "Full 19 Subjects",
    description: "Sample test description",
    isNationalBenchmark: true,
    source: "official_calendar",
  };

  // 1. Before start -> Upcoming
  const beforeTime = new Date("2026-11-17T12:00:00+05:30");
  const upcomingStatus = calculateGTStatus(sampleTest, beforeTime);
  assert.equal(upcomingStatus.status, "upcoming");
  assert.equal(upcomingStatus.isUpcoming, true);
  assert.equal(upcomingStatus.isLive, false);
  assert.ok(upcomingStatus.countdownLabel.includes("day"));

  // 2. In window -> Live Now
  const duringTime = new Date("2026-11-21T14:00:00+05:30");
  const liveStatus = calculateGTStatus(sampleTest, duringTime);
  assert.equal(liveStatus.status, "live");
  assert.equal(liveStatus.isLive, true);
  assert.equal(liveStatus.badgeLabel, "LIVE NOW");
  assert.ok(liveStatus.countdownLabel.includes("LIVE NOW"));

  // 3. After window -> Ended
  const afterTime = new Date("2026-11-26T12:00:00+05:30");
  const endedStatus = calculateGTStatus(sampleTest, afterTime);
  assert.equal(endedStatus.status, "ended");
  assert.equal(endedStatus.isEnded, true);
  assert.equal(endedStatus.countdownLabel, "Window Closed");
});

test("GT Tracker: getNextUpcomingGT prioritizes currently live tests then nearest upcoming", () => {
  const tests: ScheduledGrandTest[] = [
    {
      id: "gt-1",
      platform: "cerebellum",
      testName: "Upcoming Later Mock",
      examPattern: "neet_pg",
      totalQuestions: 200,
      durationMinutes: 210,
      windowStart: "2026-12-01T08:00:00+05:30",
      windowEnd: "2026-12-04T23:59:59+05:30",
      syllabusScope: "Full 19 Subjects",
      description: "Test 1",
      isNationalBenchmark: false,
      source: "official_calendar",
    },
    {
      id: "gt-2",
      platform: "marrow",
      testName: "Currently Live Mock",
      examPattern: "ini_cet",
      totalQuestions: 200,
      durationMinutes: 180,
      windowStart: "2026-11-15T08:00:00+05:30",
      windowEnd: "2026-11-19T23:59:59+05:30",
      syllabusScope: "Full 19 Subjects",
      description: "Test 2",
      isNationalBenchmark: true,
      source: "official_calendar",
    },
  ];

  const currentTime = new Date("2026-11-17T12:00:00+05:30");
  const next = getNextUpcomingGT(tests, currentTime);
  assert.ok(next.test);
  assert.equal(next.test.id, "gt-2");
  assert.equal(next.statusInfo?.isLive, true);
});

test("GT Tracker: parseGTScheduleFromText parses timetable dumps and announcements", () => {
  const rawAnnouncement = `
    Upcoming Medical PG Mocks Schedule:
    1. Marrow Grand Test 18 (NEET-PG): 24 Nov - 28 Nov 2026
    2. PrepLadder Championship Mock 10: 2 Dec to 6 Dec 2026
    3. Cerebellum BTR Grand Test 08: 12 Dec - 16 Dec 2026
  `;

  const parsed = parseGTScheduleFromText(rawAnnouncement);
  assert.equal(parsed.length, 3);

  const marrow = parsed.find((p) => p.platform === "marrow");
  assert.ok(marrow);
  assert.ok(marrow.testName.includes("Grand Test 18"));
  assert.equal(marrow.examPattern, "neet_pg");
  assert.ok(marrow.confidence >= 0.8);

  const prep = parsed.find((p) => p.platform === "prepladder");
  assert.ok(prep);
  assert.ok(prep.testName.includes("Grand Test 10"));

  const cerebellum = parsed.find((p) => p.platform === "cerebellum" || p.platform === "corebtr");
  assert.ok(cerebellum);
});

test("GT Tracker: generateGTIcsCalendar outputs RFC 5545 valid calendar with alarms", () => {
  const ics = generateGTIcsCalendar(OFFICIAL_GT_CALENDAR_2026_2027.slice(0, 3));
  assert.ok(ics.includes("BEGIN:VCALENDAR"));
  assert.ok(ics.includes("END:VCALENDAR"));
  assert.ok(ics.includes("BEGIN:VEVENT"));
  assert.ok(ics.includes("BEGIN:VALARM"));
  assert.ok(ics.includes("TRIGGER:-P1D")); // 24h alarm
  assert.ok(ics.includes("TRIGGER:-PT2H")); // 2h alarm
  assert.ok(ics.includes("SUMMARY:[Marrow]"));
});
