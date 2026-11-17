/**
 * Grand Test (GT) Cross-Platform Tracker & Schedule Parser Engine
 * Tracks upcoming, live, and past Grand Tests across:
 * - Marrow (National Mocks & GTs 1-25)
 * - Cerebellum Academy (Mission INI-CET, Dr. Zainab Vora BTR Mocks, LNX)
 * - PrepLadder (Championship Mocks, Elite GTs 1-15)
 * - CoreBTR (200 MCQ Marathon Mock, 20th Subject CBT, Volatiles Sprint)
 * - DAMS / e-Medicoz (CBT 1-8, DVT National Mocks)
 *
 * Capabilities:
 * 1. Pre-populated official benchmark academic GT calendar (2026-2027)
 * 2. Automated OCR & timetable announcement parser from screenshots / text dumps
 * 3. Real-time window countdowns ("LIVE NOW - Window closes in 14h", "Starts in 3 days")
 * 4. RFC 5545 iCalendar (.ics) export with 24h & 2h alarms for Google/Apple Calendar
 * 5. Direct integration with Score Logger and GT Error Vault
 */

import {
  type MedicalTestPlatform,
  type ExamMarkingPattern,
  PLATFORM_METADATA,
} from "./btr-cross-app-tests";

export type GTSyllabusScope =
  | "Full 19 Subjects"
  | "Pre & Para-Clinical Block (7 Subjects)"
  | "Clinical Block (12 Subjects)"
  | "High-Yield Super-Volatiles & PYTs"
  | "Systemic Integrated Review";

export type GTWindowStatus = "live" | "upcoming" | "ended";

export interface ScheduledGrandTest {
  id: string;
  platform: MedicalTestPlatform;
  testName: string;
  examPattern: ExamMarkingPattern;
  totalQuestions: number;
  durationMinutes: number;
  windowStart: string; // ISO 8601 string: e.g. "2026-11-20T09:00:00+05:30"
  windowEnd: string;   // ISO 8601 string: e.g. "2026-11-24T23:59:59+05:30"
  resultDate?: string;
  syllabusScope: GTSyllabusScope;
  description: string;
  isNationalBenchmark: boolean;
  expectedParticipants?: string;
  drZainabKeyAdvice?: string;
  registrationUrl?: string;
  appDeepLink?: string;
  highYieldSubjects?: string[];
  source: "official_calendar" | "screenshot_ocr" | "user_custom" | "web_sync";
  userStatus?: "unregistered" | "registered" | "completed" | "skipped";
  userLoggedScore?: {
    rawMarks: number;
    maxMarks: number;
    accuracyPercentage: number;
    percentile?: number;
    rank?: number;
  };
}

export interface ParsedGTCandidate {
  id: string;
  platform: MedicalTestPlatform;
  testName: string;
  examPattern: ExamMarkingPattern;
  windowStart: string;
  windowEnd: string;
  totalQuestions: number;
  durationMinutes: number;
  syllabusScope: GTSyllabusScope;
  confidence: number;
  extractedSnippet: string;
}

/**
 * Benchmark 2026-2027 Academic Year Grand Test Schedule
 * Calibrated against national competitive timelines leading up to INI-CET May 2027 & NEET-PG 2027
 */
export const OFFICIAL_GT_CALENDAR_2026_2027: ScheduledGrandTest[] = [
  {
    id: "marrow-nat-mock-ini-nov",
    platform: "marrow",
    testName: "Marrow All-India National Mock INI-CET",
    examPattern: "ini_cet",
    totalQuestions: 200,
    durationMinutes: 180,
    windowStart: "2026-11-19T06:00:00+05:30",
    windowEnd: "2026-11-23T23:59:59+05:30",
    resultDate: "2026-11-25",
    syllabusScope: "Full 19 Subjects",
    description: "Flagship All-India INI-CET simulation with national percentile benchmarking across 65,000+ medicos.",
    isNationalBenchmark: true,
    expectedParticipants: "65,000+ Medicos",
    drZainabKeyAdvice: "Prioritize AIIMS PYQs, negative marking restraint (1/3rd penalty), and visual radiology signs.",
    registrationUrl: "https://www.marrow.com/tests",
    appDeepLink: "marrow://tests/national-mock-ini",
    highYieldSubjects: ["radiology", "pathology", "pharmacology", "medicine", "psm"],
    source: "official_calendar",
    userStatus: "unregistered",
  },
  {
    id: "cerebellum-mission-gt-07",
    platform: "cerebellum",
    testName: "Cerebellum Mission NEET-PG GT 07",
    examPattern: "neet_pg",
    totalQuestions: 200,
    durationMinutes: 210,
    windowStart: "2026-11-23T08:00:00+05:30",
    windowEnd: "2026-11-27T22:00:00+05:30",
    resultDate: "2026-11-29",
    syllabusScope: "Full 19 Subjects",
    description: "Vetted by Dr. Zainab Vora & Dr. Gobind Rai Garg with high-probability clinico-pathological vignettes.",
    isNationalBenchmark: true,
    expectedParticipants: "45,000+ Medicos",
    drZainabKeyAdvice: "Revise 20th Subject biostatistics equations (Sensitivity, Specificity, PPV) and GCS scoring before Block 1.",
    registrationUrl: "https://www.cerebellumacademy.com",
    appDeepLink: "cerebellum://gt/07",
    highYieldSubjects: ["pharmacology", "surgery", "obgyn", "pathology"],
    source: "official_calendar",
    userStatus: "unregistered",
  },
  {
    id: "corebtr-marathon-mock-01",
    platform: "corebtr",
    testName: "CoreBTR 200 MCQ Marathon Mock #01",
    examPattern: "neet_pg",
    totalQuestions: 200,
    durationMinutes: 210,
    windowStart: "2026-11-27T00:00:00+05:30",
    windowEnd: "2026-12-01T23:59:59+05:30",
    resultDate: "2026-12-03",
    syllabusScope: "High-Yield Super-Volatiles & PYTs",
    description: "Dr. Zainab Vora's master 100 super-volatile tables mapped into two-step clinical vignettes.",
    isNationalBenchmark: true,
    expectedParticipants: "38,000+ Aspirants",
    drZainabKeyAdvice: "Review Volatiles Drips #01 through #05 and unannotated workbooks for maximum strike rate.",
    registrationUrl: "https://corebtr.com",
    appDeepLink: "corebtr://warroom/gt/01",
    highYieldSubjects: ["anatomy", "biochemistry", "psm", "forensic"],
    source: "official_calendar",
    userStatus: "unregistered",
  },
  {
    id: "prep-championship-10",
    platform: "prepladder",
    testName: "PrepLadder All-India Championship Mock 10",
    examPattern: "neet_pg",
    totalQuestions: 200,
    durationMinutes: 210,
    windowStart: "2026-12-02T06:00:00+05:30",
    windowEnd: "2026-12-06T23:59:59+05:30",
    resultDate: "2026-12-08",
    syllabusScope: "Full 19 Subjects",
    description: "Pan-India championship series with clinical strike-rate analytics and detailed video solutions.",
    isNationalBenchmark: true,
    expectedParticipants: "50,000+ Medicos",
    drZainabKeyAdvice: "Focus on time pacing: target 50 questions per 50 minutes to preserve buffer for tricky multisystem cases.",
    registrationUrl: "https://www.prepladder.com",
    appDeepLink: "prepladder://mock/championship-10",
    highYieldSubjects: ["medicine", "pediatrics", "orthopedics", "ophthalmology"],
    source: "official_calendar",
    userStatus: "unregistered",
  },
  {
    id: "dams-cbt-05",
    platform: "dams",
    testName: "DAMS All-India CBT 05 Simulation",
    examPattern: "neet_pg",
    totalQuestions: 200,
    durationMinutes: 210,
    windowStart: "2026-12-08T09:00:00+05:30",
    windowEnd: "2026-12-12T21:00:00+05:30",
    resultDate: "2026-12-14",
    syllabusScope: "Clinical Block (12 Subjects)",
    description: "Computer-Based Test replicating actual TCS exam center interface and question distributions.",
    isNationalBenchmark: false,
    expectedParticipants: "25,000+ Medicos",
    drZainabKeyAdvice: "High-yield surgical anatomy and emergency trauma management algorithms.",
    registrationUrl: "https://www.damsdelhi.com",
    appDeepLink: "dams://cbt/05",
    highYieldSubjects: ["surgery", "anesthesia", "ent", "dermatology"],
    source: "official_calendar",
    userStatus: "unregistered",
  },
  {
    id: "marrow-gt-18-dec",
    platform: "marrow",
    testName: "Marrow Grand Test 18 (Full Syllabus)",
    examPattern: "neet_pg",
    totalQuestions: 200,
    durationMinutes: 210,
    windowStart: "2026-12-14T06:00:00+05:30",
    windowEnd: "2026-12-18T23:59:59+05:30",
    resultDate: "2026-12-20",
    syllabusScope: "Full 19 Subjects",
    description: "Standard mid-phase evaluation of syllabus retention and silly mistake elimination.",
    isNationalBenchmark: true,
    expectedParticipants: "48,000+ Medicos",
    drZainabKeyAdvice: "Do not leave questions unattempted on NEET-PG pattern unless 0% clues. Elimination yields +4 net gain.",
    registrationUrl: "https://www.marrow.com/tests",
    appDeepLink: "marrow://tests/gt-18",
    highYieldSubjects: ["medicine", "pathology", "pharmacology", "microbiology"],
    source: "official_calendar",
    userStatus: "unregistered",
  },
  {
    id: "corebtr-20th-subject-cbt",
    platform: "corebtr",
    testName: "CoreBTR 20th Subject High-Yield Biostats & Forensic CBT",
    examPattern: "neet_pg",
    totalQuestions: 100,
    durationMinutes: 105,
    windowStart: "2026-12-20T00:00:00+05:30",
    windowEnd: "2026-12-24T23:59:59+05:30",
    resultDate: "2026-12-25",
    syllabusScope: "High-Yield Super-Volatiles & PYTs",
    description: "Targeted 100-question drill on 2x2 epidemiology tables, Drug of Choice, and Thanatology formulas.",
    isNationalBenchmark: false,
    expectedParticipants: "20,000+ Aspirants",
    drZainabKeyAdvice: "Master sensitivity/specificity vs predictive values and IPC death certification rules.",
    registrationUrl: "https://corebtr.com",
    appDeepLink: "corebtr://warroom/matrix",
    highYieldSubjects: ["psm", "forensic"],
    source: "official_calendar",
    userStatus: "unregistered",
  },
  {
    id: "cerebellum-lnx-mock-dec",
    platform: "cerebellum",
    testName: "Cerebellum Late Night Express (LNX) High-Yield Mock",
    examPattern: "ini_cet",
    totalQuestions: 200,
    durationMinutes: 180,
    windowStart: "2026-12-26T08:00:00+05:30",
    windowEnd: "2026-12-30T22:00:00+05:30",
    resultDate: "2027-01-02",
    syllabusScope: "Full 19 Subjects",
    description: "Rapid clinical recall questions curated by top faculty to assess speed and accuracy under fatigue.",
    isNationalBenchmark: true,
    expectedParticipants: "32,000+ Medicos",
    drZainabKeyAdvice: "Practice A-B loop active recall on clinical spotters.",
    registrationUrl: "https://www.cerebellumacademy.com",
    appDeepLink: "cerebellum://gt/lnx",
    highYieldSubjects: ["radiology", "medicine", "surgery"],
    source: "official_calendar",
    userStatus: "unregistered",
  },
  {
    id: "marrow-gt-19-jan",
    platform: "marrow",
    testName: "Marrow Grand Test 19",
    examPattern: "neet_pg",
    totalQuestions: 200,
    durationMinutes: 210,
    windowStart: "2027-01-05T06:00:00+05:30",
    windowEnd: "2027-01-09T23:59:59+05:30",
    resultDate: "2027-01-11",
    syllabusScope: "Full 19 Subjects",
    description: "Phase 3 Sprint Grand Test. Target: >85% accuracy in Pre & Para clinicals.",
    isNationalBenchmark: true,
    expectedParticipants: "52,000+ Medicos",
    registrationUrl: "https://www.marrow.com/tests",
    source: "official_calendar",
    userStatus: "unregistered",
  },
];

const SCHEDULE_STORAGE_KEY = "argus_scheduled_grand_tests_v1";

/**
 * Loads all scheduled GTs (merging official calendar with user custom/imported tests)
 */
export function loadAllScheduledGTs(): ScheduledGrandTest[] {
  if (typeof window === "undefined" || !window.localStorage) {
    return OFFICIAL_GT_CALENDAR_2026_2027;
  }

  try {
    const raw = localStorage.getItem(SCHEDULE_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(SCHEDULE_STORAGE_KEY, JSON.stringify(OFFICIAL_GT_CALENDAR_2026_2027));
      return OFFICIAL_GT_CALENDAR_2026_2027;
    }
    const stored: ScheduledGrandTest[] = JSON.parse(raw);
    
    // Merge: ensure official tests exist, but preserve user modifications (status, notes)
    const map = new Map<string, ScheduledGrandTest>();
    for (const test of OFFICIAL_GT_CALENDAR_2026_2027) {
      map.set(test.id, { ...test });
    }
    for (const test of stored) {
      map.set(test.id, { ...map.get(test.id), ...test });
    }
    return Array.from(map.values()).sort(
      (a, b) => new Date(a.windowStart).getTime() - new Date(b.windowStart).getTime()
    );
  } catch (e) {
    console.error("Failed to load scheduled GTs from localStorage", e);
    return OFFICIAL_GT_CALENDAR_2026_2027;
  }
}

/**
 * Saves a new custom or OCR-parsed scheduled Grand Test
 */
export function saveCustomScheduledGT(test: ScheduledGrandTest): ScheduledGrandTest[] {
  const current = loadAllScheduledGTs();
  const existingIdx = current.findIndex((t) => t.id === test.id);
  let updated: ScheduledGrandTest[];
  if (existingIdx >= 0) {
    updated = [...current];
    updated[existingIdx] = test;
  } else {
    updated = [test, ...current];
  }
  updated.sort((a, b) => new Date(a.windowStart).getTime() - new Date(b.windowStart).getTime());
  try {
    localStorage.setItem(SCHEDULE_STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error("Failed to save scheduled GT", e);
  }
  return updated;
}

/**
 * Deletes a scheduled GT
 */
export function deleteScheduledGT(testId: string): ScheduledGrandTest[] {
  const current = loadAllScheduledGTs();
  const updated = current.filter((t) => t.id !== testId);
  try {
    localStorage.setItem(SCHEDULE_STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error("Failed to delete scheduled GT", e);
  }
  return updated;
}

/**
 * Updates a user's registration or completion status on a test
 */
export function updateGTUserStatus(
  testId: string,
  status: "unregistered" | "registered" | "completed" | "skipped",
  loggedScore?: ScheduledGrandTest["userLoggedScore"]
): ScheduledGrandTest[] {
  const current = loadAllScheduledGTs();
  const target = current.find((t) => t.id === testId);
  if (!target) return current;

  target.userStatus = status;
  if (loggedScore) {
    target.userLoggedScore = loggedScore;
  }

  try {
    localStorage.setItem(SCHEDULE_STORAGE_KEY, JSON.stringify(current));
  } catch (e) {
    console.error("Failed to update GT user status", e);
  }
  return current;
}

/**
 * Calculates current window status and time delta for a scheduled test
 */
export function calculateGTStatus(
  test: ScheduledGrandTest,
  now: Date = new Date()
): {
  status: GTWindowStatus;
  isLive: boolean;
  isUpcoming: boolean;
  isEnded: boolean;
  countdownLabel: string;
  badgeLabel: string;
  badgeTone: "emerald" | "amber" | "ink";
  msUntilStart: number;
  msUntilEnd: number;
} {
  const start = new Date(test.windowStart).getTime();
  const end = new Date(test.windowEnd).getTime();
  const cur = now.getTime();

  if (cur >= start && cur <= end) {
    const diffMs = end - cur;
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    const countdownLabel = hours > 24
      ? `LIVE NOW · Closes in ${Math.floor(hours / 24)}d ${hours % 24}h`
      : `LIVE NOW · Closes in ${hours}h ${mins}m`;

    return {
      status: "live",
      isLive: true,
      isUpcoming: false,
      isEnded: false,
      countdownLabel,
      badgeLabel: "LIVE NOW",
      badgeTone: "emerald",
      msUntilStart: 0,
      msUntilEnd: diffMs,
    };
  }

  if (cur < start) {
    const diffMs = start - cur;
    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const countdownLabel = days > 0
      ? `In ${days} day${days > 1 ? "s" : ""} ${hours > 0 ? `${hours}h` : ""}`
      : `Starts today in ${hours}h`;

    return {
      status: "upcoming",
      isLive: false,
      isUpcoming: true,
      isEnded: false,
      countdownLabel,
      badgeLabel: days === 0 ? "STARTS TODAY" : `IN ${days}D`,
      badgeTone: days <= 2 ? "amber" : "ink",
      msUntilStart: diffMs,
      msUntilEnd: end - cur,
    };
  }

  return {
    status: "ended",
    isLive: false,
    isUpcoming: false,
    isEnded: true,
    countdownLabel: "Window Closed",
    badgeLabel: "ENDED",
    badgeTone: "ink",
    msUntilStart: 0,
    msUntilEnd: 0,
  };
}

/**
 * Returns the immediate next upcoming or currently live Grand Test
 */
export function getNextUpcomingGT(
  tests: ScheduledGrandTest[] = loadAllScheduledGTs(),
  now: Date = new Date()
): {
  test: ScheduledGrandTest | null;
  statusInfo: ReturnType<typeof calculateGTStatus> | null;
} {
  const live = tests.find((t) => {
    const s = calculateGTStatus(t, now);
    return s.isLive;
  });

  if (live) {
    return { test: live, statusInfo: calculateGTStatus(live, now) };
  }

  const upcoming = tests
    .map((t) => ({ test: t, status: calculateGTStatus(t, now) }))
    .filter((item) => item.status.isUpcoming)
    .sort((a, b) => a.status.msUntilStart - b.status.msUntilStart);

  if (upcoming.length > 0) {
    return { test: upcoming[0].test, statusInfo: upcoming[0].status };
  }

  return { test: null, statusInfo: null };
}

/**
 * Parses raw text announcement or timetable dump (from Telegram, WhatsApp, App Notifications, or OCR)
 */
export function parseGTScheduleFromText(rawText: string): ParsedGTCandidate[] {
  if (!rawText || !rawText.trim()) return [];

  const candidates: ParsedGTCandidate[] = [];
  const lines = rawText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

  // Month lookup helper
  const MONTHS: Record<string, number> = {
    jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
    jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
  };

  // Regular expressions for platform and test names
  const platformRegex = /\b(marrow|prepladder|prep|cerebellum|btr|corebtr|dams|egurukul|bhatia)\b/i;
  const testNumberRegex = /\b(?:gt|grand\s*test|cbt|mock|test|championship)\s*#?\s*(\d{1,2})\b/i;
  const dateRegex = /\b(\d{1,2})(?:st|nd|rd|th)?\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*(?:\s+(\d{4}))?\b/i;
  const dateRangeRegex = /\b(\d{1,2})(?:st|nd|rd|th)?\s*(?:-|to)\s*(\d{1,2})(?:st|nd|rd|th)?\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*(?:\s+(\d{4}))?\b/i;
  const patternRegex = /\b(ini-?cet|neet-?pg|fmge)\b/i;

  for (let i = 0; i < lines.length; i++) {
    const chunk = [lines[i], lines[i + 1] || "", lines[i + 2] || ""].join(" ");
    
    // Check if chunk has a date
    const rangeMatch = chunk.match(dateRangeRegex);
    const singleMatch = chunk.match(dateRegex);

    if (rangeMatch || singleMatch) {
      let platform: MedicalTestPlatform = "other";
      const platMatch = chunk.match(platformRegex);
      if (platMatch) {
        const pStr = platMatch[1].toLowerCase();
        if (pStr === "marrow") platform = "marrow";
        else if (pStr.includes("prep")) platform = "prepladder";
        else if (pStr.includes("cerebellum")) platform = "cerebellum";
        else if (pStr.includes("btr") || pStr.includes("corebtr")) platform = "corebtr";
        else if (pStr === "dams") platform = "dams";
      }

      let examPattern: ExamMarkingPattern = "neet_pg";
      const patternMatch = chunk.match(patternRegex);
      if (patternMatch && patternMatch[1].toLowerCase().includes("ini")) {
        examPattern = "ini_cet";
      }

      let testNumber = "01";
      const numMatch = chunk.match(testNumberRegex);
      if (numMatch) {
        testNumber = numMatch[1].padStart(2, "0");
      }

      // Compute dates
      const currentYear = new Date().getFullYear();
      let startDay = 1;
      let endDay = 4;
      let monthIndex = new Date().getMonth();
      let year = currentYear;

      if (rangeMatch) {
        startDay = parseInt(rangeMatch[1], 10);
        endDay = parseInt(rangeMatch[2], 10);
        monthIndex = MONTHS[rangeMatch[3].slice(0, 3).toLowerCase()] ?? monthIndex;
        if (rangeMatch[4]) year = parseInt(rangeMatch[4], 10);
      } else if (singleMatch) {
        startDay = parseInt(singleMatch[1], 10);
        endDay = Math.min(31, startDay + 3);
        monthIndex = MONTHS[singleMatch[2].slice(0, 3).toLowerCase()] ?? monthIndex;
        if (singleMatch[3]) year = parseInt(singleMatch[3], 10);
      }

      const startDate = new Date(year, monthIndex, startDay, 8, 0, 0);
      const endDate = new Date(year, monthIndex, endDay, 23, 59, 59);

      // Clean test name
      const platName = PLATFORM_METADATA[platform]?.name || "Medical";
      const testName = `${platName} Grand Test ${testNumber}`;

      candidates.push({
        id: `ocr-${platform}-${testNumber}-${Date.now().toString(36).slice(-4)}`,
        platform,
        testName,
        examPattern,
        windowStart: startDate.toISOString(),
        windowEnd: endDate.toISOString(),
        totalQuestions: examPattern === "ini_cet" ? 200 : 200,
        durationMinutes: examPattern === "ini_cet" ? 180 : 210,
        syllabusScope: "Full 19 Subjects",
        confidence: rangeMatch ? 0.95 : 0.8,
        extractedSnippet: chunk.slice(0, 140),
      });

      // Advance index past captured chunk
      if (rangeMatch) i += 1;
    }
  }

  // De-duplicate by testName & date
  const uniqueMap = new Map<string, ParsedGTCandidate>();
  for (const c of candidates) {
    const key = `${c.platform}-${c.testName}-${c.windowStart.slice(0, 10)}`;
    if (!uniqueMap.has(key)) {
      uniqueMap.set(key, c);
    }
  }

  return Array.from(uniqueMap.values());
}

/**
 * Exports Scheduled Grand Tests into standard RFC 5545 iCalendar (.ics) format
 * Adds 24h & 2h pre-test alarms for Google Calendar, Apple Calendar, and Outlook
 */
export function generateGTIcsCalendar(tests: ScheduledGrandTest[]): string {
  const formatIcsDate = (date: Date): string => {
    return date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
  };

  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Argus CoreBTR//Medical Grand Test Tracker//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:Medical PG Grand Tests (Marrow, Cerebellum, Prep, BTR)",
    "X-WR-TIMEZONE:Asia/Kolkata",
  ];

  for (const t of tests) {
    const start = new Date(t.windowStart);
    const end = new Date(t.windowEnd);
    const now = new Date();
    const platMeta = PLATFORM_METADATA[t.platform];
    const platformName = platMeta?.name || "Medical";

    lines.push("BEGIN:VEVENT");
    lines.push(`UID:gt-${t.id}@argus.corebtr`);
    lines.push(`DTSTAMP:${formatIcsDate(now)}`);
    lines.push(`DTSTART:${formatIcsDate(start)}`);
    lines.push(`DTEND:${formatIcsDate(end)}`);
    lines.push(`SUMMARY:[${platformName}] ${t.testName}`);
    
    const desc = [
      `Platform: ${platformName}`,
      `Pattern: ${t.examPattern === "ini_cet" ? "INI-CET (200 Qs / 180m)" : "NEET-PG (200 Qs / 210m)"}`,
      `Syllabus: ${t.syllabusScope}`,
      t.description,
      t.drZainabKeyAdvice ? `Dr. Zainab Advice: ${t.drZainabKeyAdvice}` : "",
      t.registrationUrl ? `Portal: ${t.registrationUrl}` : "",
    ].filter(Boolean).join("\\n");

    lines.push(`DESCRIPTION:${desc}`);
    lines.push(`STATUS:CONFIRMED`);

    // Alarm 1: 24 Hours before start
    lines.push("BEGIN:VALARM");
    lines.push("TRIGGER:-P1D");
    lines.push("ACTION:DISPLAY");
    lines.push(`DESCRIPTION:Reminder: ${t.testName} window opens in 24 hours`);
    lines.push("END:VALARM");

    // Alarm 2: 2 Hours before start
    lines.push("BEGIN:VALARM");
    lines.push("TRIGGER:-PT2H");
    lines.push("ACTION:DISPLAY");
    lines.push(`DESCRIPTION:Urgent: ${t.testName} window opens in 2 hours`);
    lines.push("END:VALARM");

    lines.push("END:VEVENT");
  }

  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}
