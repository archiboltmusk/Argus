/**
 * Cross-App Test Series Ingestion & Normalizer Engine
 * Supports mock tests & grand tests from:
 * - Marrow (GTs 1-25, Mini Tests, Custom Modules)
 * - Prepladder (GTs 1-15, Treasures Drills, QBank Next)
 * - DAMS (CBT 1-8, DVT Drills)
 * - Cerebellum Academy (Mission INI-CET, BTR Mock Tests, LNX)
 * - Generic NEET-PG / INI-CET Mock Tests
 */

export type MedicalTestPlatform = "marrow" | "prepladder" | "dams" | "cerebellum" | "corebtr" | "other";
export type ExamMarkingPattern = "neet_pg" | "ini_cet" | "custom";

export interface CrossAppMistakeItem {
  id: string;
  questionSnippet: string;
  subjectId: string;
  topic: string;
  errorType: "silly_mistake" | "knowledge_gap" | "recall_failure" | "confused_options";
  drZainabKeyPearl?: string;
}

export interface CrossAppTestRecord {
  id: string;
  platform: MedicalTestPlatform;
  testName: string; // e.g. "Marrow National Mock GT 14"
  examPattern: ExamMarkingPattern;
  date: string;
  totalQuestions: number;
  correctCount: number;
  incorrectCount: number;
  unattemptedCount: number;
  rawMarks: number;
  maxMarks: number;
  normalizedPercentage: number;
  accuracyPercentage: number;
  percentile?: number;
  rank?: number;
  totalCandidates?: number;
  sillyMistakesCount: number;
  knowledgeGapsCount: number;
  timeManagementLossCount: number;
  weakSubjects: string[];
  notes?: string;
  mistakeItems?: CrossAppMistakeItem[];
}

export const PLATFORM_METADATA: Record<
  MedicalTestPlatform,
  {
    name: string;
    brandColor: string;
    badgeBg: string;
    badgeText: string;
    tagline: string;
    commonTestTypes: string[];
  }
> = {
  marrow: {
    name: "Marrow",
    brandColor: "#059669", // Emerald
    badgeBg: "bg-emerald-500/15 border-emerald-500/30",
    badgeText: "text-emerald-400",
    tagline: "Marrow Grand Tests & Scheme of Marking",
    commonTestTypes: ["Grand Test (GT 1-25)", "Mini Test", "Subject Test", "Custom Module Sprint"],
  },
  prepladder: {
    name: "Prepladder",
    brandColor: "#6366f1", // Indigo
    badgeBg: "bg-indigo-500/15 border-indigo-500/30",
    badgeText: "text-indigo-400",
    tagline: "PrepLadder All India Mock & Treasures Drills",
    commonTestTypes: ["Prepladder GT (1-15)", "Treasures Review Test", "QBank Next Sprint"],
  },
  dams: {
    name: "DAMS / e-Medicoz",
    brandColor: "#f59e0b", // Amber
    badgeBg: "bg-amber-500/15 border-amber-500/30",
    badgeText: "text-amber-400",
    tagline: "DAMS Computer Based Test (CBT) & DVT",
    commonTestTypes: ["DAMS CBT (1-8)", "Daily Video Test (DVT)", "Specialty Mock"],
  },
  cerebellum: {
    name: "Cerebellum Academy",
    brandColor: "#ef4444", // Red/Rose
    badgeBg: "bg-red-500/15 border-red-500/30",
    badgeText: "text-red-400",
    tagline: "Cerebellum Mission Tests, BTR Mocks & LNX",
    commonTestTypes: ["BTR Grand Test", "Mission INI-CET Mock", "Late Night Express (LNX) Test"],
  },
  corebtr: {
    name: "CoreBTR / Dr. Zainab Vora",
    brandColor: "#0ea5e9", // Sky Blue
    badgeBg: "bg-sky-500/15 border-sky-500/30",
    badgeText: "text-sky-400",
    tagline: "CoreBTR 200 MCQ Marathon, Volatiles Sprint & 20th Subject Mock",
    commonTestTypes: ["CoreBTR National Mock", "Volatiles Sprint GT", "20th Subject CBT", "T&D Integrated Paper"],
  },
  other: {
    name: "Other Mock Exam",
    brandColor: "#06b6d4", // Cyan
    badgeBg: "bg-cyan-500/15 border-cyan-500/30",
    badgeText: "text-cyan-400",
    tagline: "Institutional Mock, Bhatia, DocTutorials, or Self-Created",
    commonTestTypes: ["All-India Open Mock", "Institutional Paper", "Diagnostic Assessment"],
  },
};

/**
 * Calculates raw marks, percentage, and accuracy based on pattern
 */
export function calculateNormalizedTestMetrics(params: {
  examPattern: ExamMarkingPattern;
  totalQuestions: number;
  correctCount: number;
  incorrectCount: number;
  unattemptedCount: number;
  sillyMistakesCount?: number;
}): {
  rawMarks: number;
  maxMarks: number;
  normalizedPercentage: number;
  accuracyPercentage: number;
  potentialMarks: number;
  marksLostToSillyMistakes: number;
} {
  const {
    examPattern,
    totalQuestions,
    correctCount,
    incorrectCount,
    sillyMistakesCount = 0,
  } = params;

  let positiveMark = 4;
  let negativeMark = 1;

  if (examPattern === "ini_cet") {
    positiveMark = 1;
    negativeMark = 1 / 3;
  } else if (examPattern === "custom") {
    positiveMark = 1;
    negativeMark = 0.25;
  }

  const maxMarks = totalQuestions * positiveMark;
  const rawMarks = Number(
    Math.max(0, correctCount * positiveMark - incorrectCount * negativeMark).toFixed(2)
  );
  const attempted = correctCount + incorrectCount;
  const accuracyPercentage =
    attempted > 0 ? Number(((correctCount / attempted) * 100).toFixed(1)) : 0;
  const normalizedPercentage =
    maxMarks > 0 ? Number(((rawMarks / maxMarks) * 100).toFixed(1)) : 0;

  // Marks lost specifically due to silly mistakes (+ positive mark gained + avoided negative mark)
  const marksLostToSillyMistakes = Number(
    (sillyMistakesCount * (positiveMark + negativeMark)).toFixed(2)
  );
  const potentialMarks = Number(Math.min(maxMarks, rawMarks + marksLostToSillyMistakes).toFixed(2));

  return {
    rawMarks,
    maxMarks,
    normalizedPercentage,
    accuracyPercentage,
    potentialMarks,
    marksLostToSillyMistakes,
  };
}

const STORAGE_KEY = "argus_btr_cross_app_tests_v1";

const DEFAULT_SAMPLE_TESTS: CrossAppTestRecord[] = [
  {
    id: "marrow-gt-14",
    platform: "marrow",
    testName: "Marrow All India National GT 14",
    examPattern: "neet_pg",
    date: new Date(Date.now() - 6 * 86400000).toISOString().slice(0, 10),
    totalQuestions: 200,
    correctCount: 144,
    incorrectCount: 46,
    unattemptedCount: 10,
    rawMarks: 530,
    maxMarks: 800,
    normalizedPercentage: 66.3,
    accuracyPercentage: 75.8,
    percentile: 88.4,
    rank: 4210,
    totalCandidates: 36300,
    sillyMistakesCount: 14,
    knowledgeGapsCount: 22,
    timeManagementLossCount: 10,
    weakSubjects: ["Pharmacology", "Microbiology", "Obstetrics"],
    notes: "Rushed the last 20 questions in Block 4. High strike rate in Pathology BTR tables.",
  },
  {
    id: "prep-gt-09",
    platform: "prepladder",
    testName: "PrepLadder Championship GT 09",
    examPattern: "neet_pg",
    date: new Date(Date.now() - 14 * 86400000).toISOString().slice(0, 10),
    totalQuestions: 200,
    correctCount: 139,
    incorrectCount: 51,
    unattemptedCount: 10,
    rawMarks: 505,
    maxMarks: 800,
    normalizedPercentage: 63.1,
    accuracyPercentage: 73.2,
    percentile: 84.1,
    rank: 5620,
    totalCandidates: 35300,
    sillyMistakesCount: 18,
    knowledgeGapsCount: 24,
    timeManagementLossCount: 9,
    weakSubjects: ["Biochemistry", "Forensic Medicine", "Ophthalmology"],
    notes: "Confused inborn errors of metabolism. Need to review Dr. Zainab's Glycogen Storage Diseases pyramid.",
  },
  {
    id: "dams-cbt-04",
    platform: "dams",
    testName: "DAMS All India CBT Mock 04",
    examPattern: "neet_pg",
    date: new Date(Date.now() - 22 * 86400000).toISOString().slice(0, 10),
    totalQuestions: 200,
    correctCount: 135,
    incorrectCount: 55,
    unattemptedCount: 10,
    rawMarks: 485,
    maxMarks: 800,
    normalizedPercentage: 60.6,
    accuracyPercentage: 71.1,
    percentile: 81.5,
    rank: 6100,
    totalCandidates: 33000,
    sillyMistakesCount: 20,
    knowledgeGapsCount: 26,
    timeManagementLossCount: 9,
    weakSubjects: ["Pediatrics", "Surgery", "Dermatology"],
    notes: "Severe negative marking in DAMS surgery traps. Must adhere to rule of eliminating 2 choices first.",
  },
  {
    id: "cerebellum-mission-inicet-02",
    platform: "cerebellum",
    testName: "Cerebellum Mission INI-CET Grand Mock 02",
    examPattern: "ini_cet",
    date: new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10),
    totalQuestions: 200,
    correctCount: 148,
    incorrectCount: 42,
    unattemptedCount: 10,
    rawMarks: 134,
    maxMarks: 200,
    normalizedPercentage: 67.0,
    accuracyPercentage: 77.9,
    percentile: 92.1,
    rank: 980,
    totalCandidates: 12400,
    sillyMistakesCount: 11,
    knowledgeGapsCount: 21,
    timeManagementLossCount: 10,
    weakSubjects: ["Radiology", "Orthopedics", "Psychiatry"],
    notes: "Excellent strike on Zainab Ma'am's INI-CET direct recall topics. 20th Subject Biostats scored 100%.",
  },
];

export function loadCrossAppTestRecords(): CrossAppTestRecord[] {
  if (typeof window === "undefined" || !window.localStorage) {
    return DEFAULT_SAMPLE_TESTS;
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_SAMPLE_TESTS));
      return DEFAULT_SAMPLE_TESTS;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_SAMPLE_TESTS;
  } catch {
    return DEFAULT_SAMPLE_TESTS;
  }
}

export function saveCrossAppTestRecord(record: CrossAppTestRecord): CrossAppTestRecord[] {
  const current = loadCrossAppTestRecords();
  const index = current.findIndex((r) => r.id === record.id);
  let updated: CrossAppTestRecord[];
  if (index >= 0) {
    updated = [...current];
    updated[index] = record;
  } else {
    updated = [record, ...current];
  }

  // Sort by date descending
  updated.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  if (typeof window !== "undefined" && window.localStorage) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch {
      // storage unavailable
    }
  }
  return updated;
}

export function deleteCrossAppTestRecord(id: string): CrossAppTestRecord[] {
  const current = loadCrossAppTestRecords();
  const updated = current.filter((r) => r.id !== id);
  if (typeof window !== "undefined" && window.localStorage) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch {
      // storage unavailable
    }
  }
  return updated;
}

export interface CrossAppAnalyticsSummary {
  totalTestsLogged: number;
  latestScore: number;
  latestPercentile: number;
  averageAccuracy: number;
  totalSillyMistakes: number;
  marksLostToSillyTotal: number;
  platformStats: Record<
    MedicalTestPlatform,
    {
      testCount: number;
      averageAccuracy: number;
      averagePercentile: number;
      bestScore: number;
    }
  >;
  topWeakSubjects: Array<{ subject: string; count: number }>;
}

export function calculateCrossAppAnalytics(records: CrossAppTestRecord[]): CrossAppAnalyticsSummary {
  if (records.length === 0) {
    return {
      totalTestsLogged: 0,
      latestScore: 0,
      latestPercentile: 0,
      averageAccuracy: 0,
      totalSillyMistakes: 0,
      marksLostToSillyTotal: 0,
      platformStats: {
        marrow: { testCount: 0, averageAccuracy: 0, averagePercentile: 0, bestScore: 0 },
        prepladder: { testCount: 0, averageAccuracy: 0, averagePercentile: 0, bestScore: 0 },
        dams: { testCount: 0, averageAccuracy: 0, averagePercentile: 0, bestScore: 0 },
        cerebellum: { testCount: 0, averageAccuracy: 0, averagePercentile: 0, bestScore: 0 },
        corebtr: { testCount: 0, averageAccuracy: 0, averagePercentile: 0, bestScore: 0 },
        other: { testCount: 0, averageAccuracy: 0, averagePercentile: 0, bestScore: 0 },
      },
      topWeakSubjects: [],
    };
  }

  let totalAccuracySum = 0;
  let totalSillyMistakes = 0;
  let marksLostToSillyTotal = 0;

  const platforms: Record<MedicalTestPlatform, { accuracies: number[]; percentiles: number[]; bestScore: number }> = {
    marrow: { accuracies: [], percentiles: [], bestScore: 0 },
    prepladder: { accuracies: [], percentiles: [], bestScore: 0 },
    dams: { accuracies: [], percentiles: [], bestScore: 0 },
    cerebellum: { accuracies: [], percentiles: [], bestScore: 0 },
    corebtr: { accuracies: [], percentiles: [], bestScore: 0 },
    other: { accuracies: [], percentiles: [], bestScore: 0 },
  };

  const weakSubjectFrequency: Record<string, number> = {};

  for (const r of records) {
    totalAccuracySum += r.accuracyPercentage;
    totalSillyMistakes += r.sillyMistakesCount;

    const positiveMark = r.examPattern === "ini_cet" ? 1 : 4;
    const negativeMark = r.examPattern === "ini_cet" ? 0.33 : 1;
    marksLostToSillyTotal += r.sillyMistakesCount * (positiveMark + negativeMark);

    const p = platforms[r.platform];
    if (p) {
      p.accuracies.push(r.accuracyPercentage);
      if (r.percentile) p.percentiles.push(r.percentile);
      if (r.rawMarks > p.bestScore) p.bestScore = r.rawMarks;
    }

    if (r.weakSubjects) {
      for (const subj of r.weakSubjects) {
        weakSubjectFrequency[subj] = (weakSubjectFrequency[subj] || 0) + 1;
      }
    }
  }

  const platformStats: CrossAppAnalyticsSummary["platformStats"] = {
    marrow: formatPlatformStat(platforms.marrow),
    prepladder: formatPlatformStat(platforms.prepladder),
    dams: formatPlatformStat(platforms.dams),
    cerebellum: formatPlatformStat(platforms.cerebellum),
    corebtr: formatPlatformStat(platforms.corebtr),
    other: formatPlatformStat(platforms.other),
  };

  const topWeakSubjects = Object.entries(weakSubjectFrequency)
    .map(([subject, count]) => ({ subject, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return {
    totalTestsLogged: records.length,
    latestScore: records[0].rawMarks,
    latestPercentile: records[0].percentile ?? 0,
    averageAccuracy: Number((totalAccuracySum / records.length).toFixed(1)),
    totalSillyMistakes,
    marksLostToSillyTotal: Number(marksLostToSillyTotal.toFixed(0)),
    platformStats,
    topWeakSubjects,
  };
}

function formatPlatformStat(data: { accuracies: number[]; percentiles: number[]; bestScore: number }) {
  const testCount = data.accuracies.length;
  const averageAccuracy =
    testCount > 0 ? Number((data.accuracies.reduce((a, b) => a + b, 0) / testCount).toFixed(1)) : 0;
  const averagePercentile =
    data.percentiles.length > 0
      ? Number((data.percentiles.reduce((a, b) => a + b, 0) / data.percentiles.length).toFixed(1))
      : 0;
  return {
    testCount,
    averageAccuracy,
    averagePercentile,
    bestScore: data.bestScore,
  };
}
