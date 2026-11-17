import { useState, useMemo, useEffect, useRef } from "react";
import {
  Flame,
  Sparkles,
  BookOpen,
  Eye,
  EyeOff,
  Plus,
  Trash2,
  AlertTriangle,
  Check,
  Zap,
  Target,
  Search,
  Copy,
  FolderPlus,
  Play,
  FileText,
  FolderCheck,
  Layers,
  Download,
  Radio,
  Triangle,
  Droplets,
  Stethoscope,
  ChevronRight,
  ChevronDown,
  Calculator,
  ExternalLink,
  SlidersHorizontal,
  Bookmark,
  Bell,
  Tv,
  Timer,
  HelpCircle,
  Award,
  Headphones,
} from "lucide-react";
import { useView } from "@/lib/view";
import { BTRSplitWorkstation } from "@/components/education/btr-split-workstation";
import { BTRAudioPodModal } from "@/components/education/btr-audio-pod-modal";
import { BTRAnkiExportModal } from "@/components/education/btr-anki-export-modal";
import { BTRErrorLogModal } from "@/components/education/btr-error-log-modal";
import { BTRBroadcastsModal } from "@/components/education/btr-broadcasts-panel";
import { BTRTwentyMatrixModal } from "@/components/education/btr-twenty-matrix-modal";
import { BTRSpotterModal } from "@/components/education/btr-spotter-modal";
import { BTRMarathonModal } from "@/components/education/btr-marathon-modal";
import { BTRTnDModal } from "@/components/education/btr-tnd-modal";
import { BTRPyramidsModal } from "@/components/education/btr-pyramids-modal";
import { BTRDailyDripModal } from "@/components/education/btr-daily-drip-modal";
import { BTRPdfSearchModal } from "@/components/education/btr-pdf-search-modal";
import { BTRVignetteModal } from "@/components/education/btr-vignette-modal";
import { BTRCrossAppTestsModal } from "@/components/education/btr-cross-app-tests-modal";
import { BTRGTTrackerModal } from "@/components/education/btr-gt-tracker-modal";
import { getNextUpcomingGT } from "@/lib/education/gt-tracker-engine";
import { BTRCustomModuleModal } from "@/components/education/btr-custom-module-modal";
import { BTRFrontierVaultModal } from "@/components/education/btr-frontier-vault-modal";
import { BTRSubjectExplorer } from "@/components/education/btr-subject-explorer";
import { BTRPearlModal } from "@/components/education/btr-pearl-modal";
import { type BTRPearlItem } from "@/lib/education/btr-pearls-data";
import {
  BTRLiveStreamModal,
  type BTRLiveSessionData,
} from "@/components/education/btr-live-stream-modal";
import {
  BTRGoalSelectorModal,
  type BTRGoalOption,
  BTR_GOAL_PRESETS,
} from "@/components/education/btr-goal-selector-modal";
import { BTRTechIssueModal } from "@/components/education/btr-tech-issue-modal";
import { BTRBookmarksModal } from "@/components/education/btr-bookmarks-modal";
import { BTRAppDock, type BTRAppDestination } from "@/components/education/btr-app-dock";
import { BTRMiniPlayerDock } from "@/components/education/btr-mini-player-dock";
import { getFSRSSummary, reviewFSRSCard } from "@/lib/education/btr-fsrs-engine";
import { CORE_BTR_BROADCASTS } from "@/lib/education/btr-broadcasts";
import {
  getBackendTests,
  getQuestionsForTest,
  getQuestionsForSubject,
  buildCustomModuleTest,
  getLatestAutopsyReport,
  generateAIR100Prescription,
  generateMicroSurgicalDrill,
} from "@/lib/education/btr-backend-service";
import type { ClinicalQuestion } from "@/lib/education/qbank-types";
import {
  CORE_BTR_SUBJECTS,
  CORE_BTR_PHASES,
  CORE_BTR_SUPER_VOLATILES,
  loadBTRSubjectProgress,
  updateBTRSubjectStatus,
  loadBTRGrandTestRecords,
  saveBTRGrandTestRecord,
  deleteBTRGrandTestRecord,
  calculateExamCountdowns,
  calculateOverallReadiness,
  type BTRSubject,
  type BTRSubjectProgress,
  type BTRGrandTestRecord,
  type BTRSubjectCategory,
  type BTRProgressStatus,
} from "@/lib/education/corebtr-schedule";
import {
  loadBTRLocalLibrary,
  indexBTRFiles,
  createBTRVideoPlayerSrc,
  resolveBTRPlayableUrl,
  type BTRLocalLibraryState,
  type BTRLocalMediaFile,
} from "@/lib/education/btr-local-library";
import { USER_LOCAL_BTR_MANIFEST } from "@/lib/education/btr-library-manifest";

// Official CoreBTR Tests Catalog (connected to /Users/anupam/Downloads/BTR)
const COREBTR_OFFICIAL_TESTS = [
  {
    id: "gt_inicet_mock",
    title: "National INICET Mock GT",
    totalQuestions: 200,
    durationMins: 180,
    type: "Grand Tests",
    status: "Live",
    ended: true,
    competitive: true,
    solutionFile: "National_INICET_Mock_GT_annotated.pdf",
  },
  {
    id: "gt_4",
    title: "Baseline GRAND TEST - 4",
    totalQuestions: 200,
    durationMins: 210,
    type: "Grand Tests",
    status: "Live",
    ended: true,
    competitive: true,
    solutionFile: "Baseline_Grand_Test-4_annotated.pdf",
  },
  {
    id: "gt_9",
    title: "Grand Test (GT) - 9",
    totalQuestions: 200,
    durationMins: 180,
    type: "Grand Tests",
    status: "Live",
    ended: true,
    competitive: true,
    solutionFile: "CoreBTR_Grand_Test-9_non_annotated.pdf",
  },
  {
    id: "gt_8",
    title: "Grand Test (GT) - 8",
    totalQuestions: 200,
    durationMins: 180,
    type: "Grand Tests",
    status: "Live",
    ended: true,
    competitive: true,
    solutionFile: "CoreBTR_Grand_Test-8_annotated.pdf",
  },
  {
    id: "gt_7",
    title: "Grand Test (GT) - 7",
    totalQuestions: 200,
    durationMins: 180,
    type: "Grand Tests",
    status: "Live",
    ended: true,
    competitive: true,
    solutionFile: "CoreBTR_Grand_Test-7_annotated.pdf",
  },
  {
    id: "gt_6",
    title: "Grand Test (GT) - 6",
    totalQuestions: 200,
    durationMins: 180,
    type: "Grand Tests",
    status: "Live",
    ended: true,
    competitive: true,
    solutionFile: "CoreBTR_Grand_Test-6_annotated.pdf",
  },
  {
    id: "gt_5",
    title: "Grand Test (GT) - 5",
    totalQuestions: 200,
    durationMins: 180,
    type: "Grand Tests",
    status: "Live",
    ended: true,
    competitive: true,
    solutionFile: "CoreBTR_Grand_Test-5_annotated.pdf",
  },
  {
    id: "gt_3",
    title: "Grand Test (GT) - 3",
    totalQuestions: 200,
    durationMins: 180,
    type: "Grand Tests",
    status: "Live",
    ended: true,
    competitive: true,
    solutionFile: "CoreBTR_Grand_Test-3_annotated.pdf",
  },
  {
    id: "gt_2",
    title: "Grand Test (GT) - 2",
    totalQuestions: 200,
    durationMins: 180,
    type: "Grand Tests",
    status: "In Progress",
    ended: true,
    competitive: true,
    solutionFile: "CoreBTR_Grand_Test_2_Solutions_-_17.04.2026_annotated.pdf",
  },
  {
    id: "gt_1",
    title: "Grand Test (GT) - 1",
    totalQuestions: 200,
    durationMins: 180,
    type: "Grand Tests",
    status: "Not Attempted",
    ended: true,
    competitive: true,
    solutionFile: "CoreBTR_Grand_Test_1_Solutions_-_04.04.2026_annotated.pdf",
  },
  {
    id: "mini_1",
    title: "CoreBTR Mini Test - 1",
    totalQuestions: 100,
    durationMins: 90,
    type: "Mini Tests",
    status: "Live",
    ended: true,
    competitive: true,
  },
  {
    id: "mini_2",
    title: "CoreBTR Mini Test - 2",
    totalQuestions: 100,
    durationMins: 90,
    type: "Mini Tests",
    status: "Live",
    ended: true,
    competitive: true,
  },
  {
    id: "drop_6",
    title: "Core Drop - Surprise Test-6",
    totalQuestions: 25,
    durationMins: 15,
    type: "Core Drop Tests",
    status: "Live",
    ended: false,
    competitive: true,
  },
];

// Official Dr. Zainab Vora Stream Archive (from screenshot media_1794864389403)
const COREBTR_LIVE_SESSIONS: BTRLiveSessionData[] = [
  {
    id: "live_1",
    title: "Way Ahead For NEET PG with CoreBTR",
    instructor: "Dr. Zainab Vora",
    date: "25th May",
    time: "5:00 PM - 7:00 PM",
    badge: "Completed",
    topic: "Roadmap & Prioritization",
    youtubeId: "vD246f3h614",
    duration: "2h 00m",
    keyTimestamps: [
      { time: "00:00", label: "NEET PG 2026 High-Yield Roadmap", seconds: 0 },
      { time: "25:30", label: "20th Subject Strategy & Weightage", seconds: 1530 },
      { time: "58:10", label: "Daily BTR Cycles & GT Cadence", seconds: 3490 },
      { time: "1:35:00", label: "Handling Burnout & Exam Mindset", seconds: 5700 },
    ],
    takeaways: [
      "Prioritize 20th Subject and High-Yield PYQs in the last 40 days.",
      "Never miss Grand Test review; spend 2x test time on error log analysis.",
      "Active recall with unannotated workbooks yields 3x memory retention vs passive reading.",
    ],
  },
  {
    id: "live_2",
    title: "INI CET May 2026 Recall Session All 200 MCQs Discussion",
    instructor: "Dr. Zainab Vora",
    date: "17th May",
    time: "11:30 AM - 4:00 PM",
    badge: "Completed",
    topic: "200 INI-CET Recall Breakdown",
    youtubeId: "E04_O8N91fM",
    duration: "4h 30m",
    keyTimestamps: [
      { time: "00:00", label: "INI-CET Paper Pattern & Cut-off Traps", seconds: 0 },
      { time: "32:00", label: "Anatomy & Physiology Recalls (Qs 1-40)", seconds: 1920 },
      { time: "1:45:00", label: "Radiology & Pathology Spotters (Qs 41-110)", seconds: 6300 },
      { time: "3:10:00", label: "Clinical Surgery & OBGYN Recalls (Qs 111-200)", seconds: 11400 },
    ],
    takeaways: [
      "AIIMS examiners repeatedly test atypical presentations of common syndromes.",
      "Multi-step image questions often give away the answer in the second diagnostic finding.",
      "Volatiles tables accounted for 38% of direct repeat questions.",
    ],
  },
  {
    id: "live_3",
    title: "Exam Day Strategy & Aashirwad Session by Dr. Zainab Vora",
    instructor: "Dr. Zainab Vora",
    date: "15th May",
    time: "8:00 AM - 12:00 PM",
    badge: "Completed",
    topic: "Mindset & Exam Temperament",
    youtubeId: "tE1U4xW1-sQ",
    duration: "1h 45m",
    keyTimestamps: [
      { time: "00:00", label: "Pre-Exam Routine & Sleep Optimization", seconds: 0 },
      { time: "20:00", label: "Intelligent Elimination: The 50:50 Rule", seconds: 1200 },
      { time: "48:00", label: "Time Management in 200-Question Sprints", seconds: 2880 },
    ],
    takeaways: [
      "Avoid altering your first instinct unless you identify a clear trick in the stem.",
      "Mark no more than 25 questions for final review to prevent end-of-test panic.",
    ],
  },
  {
    id: "live_4",
    title: "Mega BTR for INI CET Part-2 by Dr. Zainab Vora",
    instructor: "Dr. Zainab Vora",
    date: "14th May",
    time: "8:30 AM - 3:00 PM",
    badge: "Completed",
    topic: "Volatiles & High-Yield Tables",
    youtubeId: "zV99BTR002",
    duration: "6h 30m",
    keyTimestamps: [
      { time: "00:00", label: "Radiology Classifications & CT Signs", seconds: 0 },
      { time: "1:40:00", label: "Orthopedics Fractures & Epiphyseal Injuries", seconds: 6000 },
      { time: "3:15:00", label: "Dermatology Blistering Disorders & Spotters", seconds: 11700 },
      { time: "4:50:00", label: "Biostatistics 2x2 Formulas & BMW Guidelines", seconds: 17400 },
    ],
    takeaways: [
      "Master the Gustilo-Anderson and Gartland classifications for trauma questions.",
      "Keep biostatistics PPV/NPV formulas at fingertips for instant 4 marks.",
    ],
  },
  {
    id: "live_5",
    title: "Mega BTR for INI CET Part-1 by Dr. Zainab Vora",
    instructor: "Dr. Zainab Vora",
    date: "13th May",
    time: "8:30 AM - 3:00 PM",
    badge: "Completed",
    topic: "Pre- & Para-Clinical High-Yield",
    youtubeId: "zV99BTR001",
    duration: "6h 30m",
    keyTimestamps: [
      { time: "00:00", label: "Embryology & Neuro-Anatomy High Yields", seconds: 0 },
      { time: "1:30:00", label: "Pharmacology DOCs & Antidote Tables", seconds: 5400 },
      { time: "3:10:00", label: "Microbiology Parasitology & Culture Spotters", seconds: 11400 },
      { time: "4:45:00", label: "Biochemistry Inborn Errors of Metabolism", seconds: 17100 },
    ],
    takeaways: [
      "Inborn errors of metabolism enzyme defects are guaranteed high-rank differentiators.",
      "Memorize autonomic receptor pharmacology table for 6+ direct questions.",
    ],
  },
  {
    id: "live_6",
    title: "CoreBTR Mini Test-2 Discussion by Dr. Zainab Vora",
    instructor: "Dr. Zainab Vora",
    date: "22nd April",
    time: "6:55 PM - 11:00 PM",
    badge: "Completed",
    topic: "100 Questions Analysis",
    youtubeId: "zV99BTR003",
    duration: "4h 00m",
    keyTimestamps: [
      { time: "00:00", label: "Mini Test 2 General Radiography Qs 1-25", seconds: 0 },
      { time: "1:05:00", label: "Thoracic & Neuroradiology Qs 26-60", seconds: 3900 },
      { time: "2:20:00", label: "Nuclear Medicine & Radiotherapy Qs 61-100", seconds: 8400 },
    ],
    takeaways: [
      "Distinguish between ground glass opacity and consolidation on HRCT.",
      "Nuclear medicine tracers (Tc-99m MIBI vs FDG PET) high-yield table recap.",
    ],
  },
  {
    id: "live_7",
    title: "CoreBTR: 40-day strategy for INI-CET May 2026 by Dr. Zainab Vora",
    instructor: "Dr. Zainab Vora",
    date: "17th April",
    time: "7:00 PM - 10:00 PM",
    badge: "Completed",
    topic: "40-Day Revision Strategy",
    youtubeId: "zV99BTR004",
    duration: "3h 00m",
    keyTimestamps: [
      { time: "00:00", label: "40-Day Block Schedule Structure", seconds: 0 },
      { time: "45:00", label: "Balancing Subject Marathons with Daily MCQs", seconds: 2700 },
      { time: "1:50:00", label: "FSRS Spaced Repetition for Last-Mile Recall", seconds: 6600 },
    ],
    takeaways: [
      "Divide your remaining 40 days into 25 days (Cycle 1) + 10 days (Cycle 2) + 5 days (Volatiles).",
      "Do 100 questions daily in strict exam-timed blocks.",
    ],
  },
];

const SUBJECT_METRICS_MAP: Record<
  string,
  { items: number; completed: number; category: "Short Subjects" | "Intermediate Subjects" | "Long Subjects" }
> = {
  dermatology: { items: 184, completed: 3, category: "Short Subjects" },
  radiology: { items: 171, completed: 7, category: "Short Subjects" },
  psychiatry: { items: 109, completed: 3, category: "Short Subjects" },
  orthopedics: { items: 229, completed: 5, category: "Short Subjects" },
  anesthesiology: { items: 155, completed: 2, category: "Short Subjects" },
  ent: { items: 222, completed: 4, category: "Short Subjects" },
  ophthalmology: { items: 225, completed: 2, category: "Short Subjects" },
  forensic: { items: 209, completed: 5, category: "Short Subjects" },
  biochemistry: { items: 315, completed: 9, category: "Intermediate Subjects" },
  microbiology: { items: 310, completed: 4, category: "Intermediate Subjects" },
  pathology: { items: 480, completed: 12, category: "Intermediate Subjects" },
  pharmacology: { items: 450, completed: 15, category: "Intermediate Subjects" },
  anatomy: { items: 380, completed: 10, category: "Intermediate Subjects" },
  physiology: { items: 320, completed: 8, category: "Intermediate Subjects" },
  medicine: { items: 540, completed: 18, category: "Long Subjects" },
  surgery: { items: 510, completed: 14, category: "Long Subjects" },
  obgyn: { items: 420, completed: 11, category: "Long Subjects" },
  pediatrics: { items: 390, completed: 9, category: "Long Subjects" },
  psm: { items: 460, completed: 12, category: "Long Subjects" },
};

function InstagramIcon({ size = 14, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
    </svg>
  );
}

interface CoreBTRWarRoomProps {
  onStartQBankDrill?: (subjectName?: string, questions?: ClinicalQuestion[]) => void;
  onOpenNotes?: () => void;
  initialDestination?: BTRAppDestination;
  initialSubjectId?: string;
}

export function CoreBTRWarRoom({
  onStartQBankDrill,
  onOpenNotes,
  initialDestination = "today",
  initialSubjectId,
}: CoreBTRWarRoomProps = {}) {
  const { openPlayer } = useView();

  const [activeDestination, setActiveDestination] = useState<BTRAppDestination>(initialDestination);
  const [subjectsSubTab, setSubjectsSubTab] = useState<"tracker" | "files">("tracker");
  const summary = useMemo(() => getFSRSSummary(), []);
  const activeView = activeDestination;
  const setActiveView = (v: any) => setActiveDestination(v);
  const [progressMap, setProgressMap] = useState<Record<string, BTRSubjectProgress>>({});
  const [gtRecords, setGtRecords] = useState<BTRGrandTestRecord[]>([]);
  const [libraryState, setLibraryState] = useState<BTRLocalLibraryState>(loadBTRLocalLibrary());
  const [categoryFilter] = useState<BTRSubjectCategory | "ALL">("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (initialDestination) setActiveDestination(initialDestination);
  }, [initialDestination]);

  // Folder Import state
  const folderInputRef = useRef<HTMLInputElement>(null);
  const [scanNotice, setScanNotice] = useState<string | null>(null);

  // Volatiles state
  const [revealedCards, setRevealedCards] = useState<Record<string, boolean>>({});
  const [copiedCardId, setCopiedCardId] = useState<string | null>(null);

  // Advanced Modals State
  const [workstationSession, setWorkstationSession] = useState<{
    video: BTRLocalMediaFile;
    subject: BTRSubject;
    unannotatedPdf?: BTRLocalMediaFile;
    annotatedPdf?: BTRLocalMediaFile;
  } | null>(null);
  const [showAnkiModal, setShowAnkiModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [showBroadcastsModal, setShowBroadcastsModal] = useState(false);
  const [showTwentyModal, setShowTwentyModal] = useState(false);
  const [showSpotterModal, setShowSpotterModal] = useState(false);
  const [showMarathonModal, setShowMarathonModal] = useState(false);
  const [showTnDModal, setShowTnDModal] = useState(false);
  const [showPyramidsModal, setShowPyramidsModal] = useState(false);
  const [showDripModal, setShowDripModal] = useState(false);
  const [showPdfSearchModal, setShowPdfSearchModal] = useState(false);
  const [showVignetteModal, setShowVignetteModal] = useState(false);
  const [showCrossAppModal, setShowCrossAppModal] = useState(false);
  const [showGTTrackerModal, setShowGTTrackerModal] = useState(false);

  // Live Next GT Tracker state
  const { test: nextGT, statusInfo: nextGTStatus } = useMemo(() => {
    return getNextUpcomingGT();
  }, [showGTTrackerModal]);

  // CoreBTR App Experience State (Matching Dr. Zainab Vora Official Suite)
  const [selectedSubjectDetail, setSelectedSubjectDetail] = useState<BTRSubject | null>(null);

  useEffect(() => {
    if (initialSubjectId) {
      const found = CORE_BTR_SUBJECTS.find((s) => s.id === initialSubjectId);
      if (found) setSelectedSubjectDetail(found);
    }
  }, [initialSubjectId]);
  const [testsSubTab, setTestsSubTab] = useState<"Grand Tests" | "Mini Tests" | "Core Drop Tests">("Grand Tests");
  const [testsFilter, setTestsFilter] = useState<"In Progress" | "Live" | "Upcoming" | "Not Attempted">("Live");
  const [showCustomModuleModal, setShowCustomModuleModal] = useState(false);
  const [showFrontierVaultModal, setShowFrontierVaultModal] = useState(false);
  const [showAudioPodModal, setShowAudioPodModal] = useState(false);
  const [audioPodQuestions, setAudioPodQuestions] = useState<ClinicalQuestion[]>([]);
  const [isGeneratingDrill, setIsGeneratingDrill] = useState(false);

  const handleOpenAudioPod = async (targetQuestions?: ClinicalQuestion[]) => {
    if (targetQuestions && targetQuestions.length > 0) {
      setAudioPodQuestions(targetQuestions);
    } else {
      const pool = await generateMicroSurgicalDrill({ count: 20 });
      setAudioPodQuestions(pool);
    }
    setShowAudioPodModal(true);
  };

  const handleLaunchMicroSurgicalDrill = async (weakSubject?: string) => {
    setIsGeneratingDrill(true);
    try {
      const drillQuestions = await generateMicroSurgicalDrill({
        weakSubject,
        count: 15,
        prioritizeTrapsAndMissed: true,
      });
      if (drillQuestions.length > 0) {
        onStartQBankDrill?.(
          weakSubject ? `Micro-Surgical Remediation: ${weakSubject}` : "Micro-Surgical Weakness Drill",
          drillQuestions
        );
      }
    } finally {
      setIsGeneratingDrill(false);
    }
  };
  const [selectedPearlModal, setSelectedPearlModal] = useState<BTRPearlItem | null>(null);
  const [activePearlsDeck, setActivePearlsDeck] = useState<BTRPearlItem[] | null>(null);
  const [activeLiveStreamModal, setActiveLiveStreamModal] = useState<BTRLiveSessionData | null>(null);
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [currentGoal, setCurrentGoal] = useState<BTRGoalOption>(BTR_GOAL_PRESETS[0]);
  const [showTechIssueModal, setShowTechIssueModal] = useState(false);
  const [showBookmarksModal, setShowBookmarksModal] = useState(false);
  const [libraryCategoryFilter, setLibraryCategoryFilter] = useState<
    "All Subjects" | "Short Subjects" | "Intermediate Subjects" | "Long Subjects" | "Integrated Systems"
  >("All Subjects");

  const sessionGreeting = useMemo(() => {
    const h = new Date().getHours();
    if (h >= 21 || h < 5) return "Night session, Dr. Anupam";
    if (h >= 5 && h < 12) return "Morning session, Dr. Anupam";
    if (h >= 12 && h < 17) return "Afternoon session, Dr. Anupam";
    return "Evening session, Dr. Anupam";
  }, []);

  // GT Form state
  const [showAddGtModal, setShowAddGtModal] = useState(false);
  const [newGtTitle, setNewGtTitle] = useState("");
  const [newGtDate, setNewGtDate] = useState(new Date().toISOString().slice(0, 10));
  const [newGtCorrect, setNewGtCorrect] = useState(140);
  const [newGtIncorrect, setNewGtIncorrect] = useState(48);
  const [newGtUnattempted, setNewGtUnattempted] = useState(12);
  const [newGtPercentile, setNewGtPercentile] = useState(82.5);
  const [newGtSillyMistakes, setNewGtSillyMistakes] = useState(15);
  const [newGtKnowledgeGaps, setNewGtKnowledgeGaps] = useState(33);
  const [newGtNotes, setNewGtNotes] = useState("");

  // Load progress and GTs
  useEffect(() => {
    setProgressMap(loadBTRSubjectProgress());
    setGtRecords(loadBTRGrandTestRecords());
    setLibraryState(loadBTRLocalLibrary());
  }, []);

  // Real-time countdowns
  const countdowns = useMemo(() => calculateExamCountdowns(), []);
  const readiness = useMemo(() => calculateOverallReadiness(progressMap), [progressMap]);

  // Filtered Subjects
  const filteredSubjects = useMemo(() => {
    return CORE_BTR_SUBJECTS.filter((s) => {
      if (libraryCategoryFilter !== "All Subjects" && libraryCategoryFilter !== "Integrated Systems") {
        const meta = SUBJECT_METRICS_MAP[s.id];
        if (meta && meta.category !== libraryCategoryFilter) return false;
      }
      const matchCat = categoryFilter === "ALL" || s.category === categoryFilter;
      const matchQuery =
        !searchQuery.trim() ||
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.mustKnowTopics.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchCat && matchQuery;
    });
  }, [categoryFilter, libraryCategoryFilter, searchQuery]);

  // Filtered Volatiles
  const filteredVolatiles = useMemo(() => {
    return CORE_BTR_SUPER_VOLATILES.filter((c) => {
      const matchCat = categoryFilter === "ALL" || c.category === categoryFilter;
      const matchQuery =
        !searchQuery.trim() ||
        c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.subjectName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.keyPrompt.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchCat && matchQuery;
    });
  }, [categoryFilter, searchQuery]);

  const handleStatusChange = (subjectId: string, status: BTRProgressStatus) => {
    const updated = updateBTRSubjectStatus(subjectId, {
      status,
      lastReviewedDate: new Date().toISOString().slice(0, 10),
    });
    setProgressMap({ ...updated });
  };

  const toggleRevealCard = (id: string) => {
    setRevealedCards((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const revealAllCards = () => {
    const allRevealed: Record<string, boolean> = {};
    for (const card of CORE_BTR_SUPER_VOLATILES) {
      allRevealed[card.id] = true;
    }
    setRevealedCards(allRevealed);
  };

  const hideAllCards = () => {
    setRevealedCards({});
  };

  const handleCopyCard = (card: (typeof CORE_BTR_SUPER_VOLATILES)[0]) => {
    const text = `[BTR High-Yield: ${card.subjectName}] ${card.title}\nQ: ${card.keyPrompt}\nA: ${card.maskedAnswer}\nTrap: ${card.examinerTrap}`;
    void navigator.clipboard.writeText(text);
    setCopiedCardId(card.id);
    setTimeout(() => setCopiedCardId(null), 1800);
  };

  const handleCreateGtRecord = (e: React.FormEvent) => {
    e.preventDefault();
    const marksScored = newGtCorrect * 4 - newGtIncorrect;
    const record: BTRGrandTestRecord = {
      id: `gt-${Date.now()}`,
      title: newGtTitle || `Grand Test ${gtRecords.length + 1}`,
      date: newGtDate,
      totalQuestions: newGtCorrect + newGtIncorrect + newGtUnattempted,
      correctCount: Number(newGtCorrect),
      incorrectCount: Number(newGtIncorrect),
      unattemptedCount: Number(newGtUnattempted),
      marksScored,
      percentile: Number(newGtPercentile),
      sillyMistakes: Number(newGtSillyMistakes),
      knowledgeGaps: Number(newGtKnowledgeGaps),
      weakSubjects: [],
      notes: newGtNotes,
    };
    const updated = saveBTRGrandTestRecord(record);
    setGtRecords(updated);
    setShowAddGtModal(false);
    setNewGtTitle("");
    setNewGtNotes("");
  };

  const handleDeleteGtRecord = (id: string) => {
    const updated = deleteBTRGrandTestRecord(id);
    setGtRecords(updated);
  };

  // Native Folder Picker (Tauri) or fallback to HTML file input (Web)
  const handleOpenFolderPicker = async () => {
    try {
      const { isTauri, invoke } = await import("@tauri-apps/api/core");
      if (isTauri()) {
        const { open } = await import("@tauri-apps/plugin-dialog");
        const folder = await open({
          directory: true,
          multiple: false,
          title: "Select CoreBTR Video & Notes Folder",
        });
        if (typeof folder === "string") {
          const scanned = (await invoke("argus_scan_folder", {
            folder,
            minSizeMb: 0,
          })) as Array<{ path: string; filename: string; size: number }>;

          const fileList = scanned.map((s) => ({
            name: s.filename,
            fullPath: s.path,
            relativePath: s.path.replace(folder, "").replace(/^[/\\]/, ""),
            size: s.size,
          }));

          const state = indexBTRFiles(fileList, folder);
          setLibraryState(state);
          setScanNotice(
            `Indexed ${state.totalVideosFound} lecture videos and ${state.totalPdfsFound} PDF workbooks from ${folder}!`
          );
          setTimeout(() => setScanNotice(null), 6000);
          return;
        }
      }
    } catch (e) {
      console.warn("Native folder picker fallback", e);
    }
    // Browser fallback
    folderInputRef.current?.click();
  };

  // Browser HTML Folder Selection (stores blobUrls for instant zero-latency playback)
  const handleFolderSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const fileList: Array<{
      name: string;
      fullPath?: string;
      relativePath?: string;
      size?: number;
      blobUrl?: string;
    }> = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const relative = file.webkitRelativePath || file.name;
      const blobUrl = URL.createObjectURL(file);
      fileList.push({
        name: file.name,
        fullPath: (file as any).path || blobUrl,
        relativePath: relative,
        size: file.size,
        blobUrl,
      });
    }

    const state = indexBTRFiles(fileList, "Local BTR Folder");
    setLibraryState(state);
    setScanNotice(
      `Indexed ${state.totalVideosFound} lecture videos and ${state.totalPdfsFound} PDF workbooks across ${state.subjectsWithVideosCount} subjects!`
    );
    setTimeout(() => setScanNotice(null), 6000);
  };

  // Play a BTR video lecture in Dual Workstation
  const handlePlayLecture = (video: BTRLocalMediaFile, subject: BTRSubject) => {
    const unannotated = libraryState.mappings[subject.id]?.unannotatedPdf;
    const annotated = libraryState.mappings[subject.id]?.annotatedPdf;
    setWorkstationSession({
      video,
      subject,
      unannotatedPdf: unannotated,
      annotatedPdf: annotated,
    });
    setActiveDestination("workstation");
  };

  // Open PDF workbook in browser/new tab
  const handleOpenPdf = (pdf: BTRLocalMediaFile) => {
    const url = resolveBTRPlayableUrl(pdf.fullPath);
    window.open(url, "_blank");
  };

  const handleNavigate = (dest: BTRAppDestination) => {
    if (dest === "drip") {
      setShowDripModal(true);
      return;
    }
    if (dest === "search") {
      setShowPdfSearchModal(true);
      return;
    }
    if (dest === "broadcasts") {
      setShowBroadcastsModal(true);
      return;
    }
    if (dest === "pyramids") {
      setShowPyramidsModal(true);
      return;
    }
    if (dest === "cases") {
      setShowVignetteModal(true);
      return;
    }
    if (dest === "tnd") {
      setShowTnDModal(true);
      return;
    }
    if (dest === "blitz") {
      setShowMarathonModal(true);
      return;
    }
    if (dest === "spotters") {
      setShowSpotterModal(true);
      return;
    }
    if (dest === "matrix") {
      setShowTwentyModal(true);
      return;
    }
    if (dest === "gt_tracker") {
      setShowGTTrackerModal(true);
      return;
    }
    if (dest === "cross_app_tests") {
      setShowCrossAppModal(true);
      return;
    }
    if (dest === "workstation") {
      if (!workstationSession) {
        let fallbackVideo: BTRLocalMediaFile | undefined;
        let fallbackSubject: BTRSubject = CORE_BTR_SUBJECTS[0];
        for (const subj of CORE_BTR_SUBJECTS) {
          const mapping = libraryState.mappings[subj.id];
          if (mapping && mapping.videos.length > 0) {
            fallbackVideo = mapping.videos[0];
            fallbackSubject = subj;
            break;
          }
        }
        if (fallbackVideo) {
          setWorkstationSession({
            video: fallbackVideo,
            subject: fallbackSubject,
            unannotatedPdf: libraryState.mappings[fallbackSubject.id]?.unannotatedPdf,
            annotatedPdf: libraryState.mappings[fallbackSubject.id]?.annotatedPdf,
          });
        }
      }
      setActiveDestination("workstation");
      return;
    }
    setActiveDestination(dest);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setShowPdfSearchModal(true);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <div className="flex h-[calc(100vh-4.5rem)] min-h-[720px] w-full overflow-hidden rounded-3xl border border-edge bg-canvas text-ink shadow-2xl relative select-none">
      {/* 1. Left Navigation Rail (App Dock) */}
      <BTRAppDock
        activeDestination={activeDestination}
        onNavigate={handleNavigate}
        dailyDueCount={summary.dueTodayCount}
        streakDays={summary.streakDays}
        totalFilesLinked={libraryState.totalVideosFound + libraryState.totalPdfsFound}
        onLinkFolder={handleOpenFolderPicker}
        isWorkstationActive={!!workstationSession}
      />

      {/* 2. Main Studio Viewport */}
      <div className="flex-1 flex flex-col overflow-hidden bg-canvas relative">
        {/* Top Omnibar Header (Matching Official CoreBTR Navigation) */}
        <header className="h-14 shrink-0 flex items-center justify-between border-b border-edge px-4 sm:px-6 bg-surface/80 backdrop-blur-md z-10">
          <div className="flex items-center gap-3">
            {/* Goal Selector Chip (from official app) */}
            <div
              onClick={() => setShowGoalModal(true)}
              className="flex items-center gap-1.5 rounded-xl bg-canvas border border-edge-soft px-3 py-1 text-xs font-semibold text-ink hover:border-edge cursor-pointer transition select-none"
              title="Click to switch your examination goal"
            >
              <span className="text-ink-muted font-bold max-w-[140px] sm:max-w-none truncate">{currentGoal.name}</span>
              <span className="text-[10px] text-ink-muted">| My Goal</span>
              <ChevronDown size={12} className="text-ink-muted shrink-0" />
            </div>

            {/* Doctor Greeting (from official app) */}
            <div className="hidden lg:flex flex-col">
              <span className="text-xs font-black text-ink leading-tight">{sessionGreeting}</span>
              <span className="text-[10px] text-ink-muted">No distractions. Just you.</span>
            </div>
          </div>

          {/* Right Header: Instagram @corebtr, Search, Countdowns & Avatar */}
          <div className="flex items-center gap-3">
            {/* Official Instagram @corebtr Link */}
            <a
              href="https://www.instagram.com/corebtr/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 rounded-xl bg-white/10 border border-edge px-2.5 py-1 text-xs font-bold text-ink-muted hover:border-white/20 hover:bg-white/15 transition shadow-xs"
              title="Official Dr. Zainab Vora CoreBTR Instagram (@corebtr)"
            >
              <InstagramIcon size={13} className="text-ink-muted" />
              <span className="hidden sm:inline">@corebtr</span>
              <ExternalLink size={10} className="text-ink-muted" />
            </a>

            {/* Global Search Omnibar */}
            <button
              type="button"
              onClick={() => setShowPdfSearchModal(true)}
              className="flex items-center gap-2 rounded-xl bg-canvas border border-edge-soft px-3 py-1.5 text-xs text-ink-muted hover:text-ink hover:border-edge transition shadow-xs w-36 sm:w-60"
            >
              <Search size={13} className="text-ink-muted shrink-0" />
              <span className="truncate">Search PDFs, topics...</span>
              <kbd className="ml-auto hidden sm:inline-block font-mono text-[10px] bg-elevated px-1.5 py-0.5 rounded border border-edge text-ink-muted">
                ⌘K
              </kbd>
            </button>

            {/* User Avatar ST / AM */}
            <div
              className="h-8 w-8 rounded-full bg-white text-black font-bold text-xs flex items-center justify-center ring-2 ring-white/30 shadow-xs cursor-pointer"
              title="Dr. Anupam Mahato"
            >
              AM
            </div>

            {/* Hidden file input */}
            <input
              type="file"
              ref={folderInputRef}
              // @ts-expect-error webkitdirectory is standard for folder pickers
              webkitdirectory="true"
              directory="true"
              multiple
              onChange={handleFolderSelect}
              className="hidden"
            />

            {onStartQBankDrill && (
              <button
                type="button"
                onClick={() => onStartQBankDrill()}
                className="hidden sm:flex items-center gap-1.5 rounded-xl bg-elevated border border-edge-soft px-3 py-1.5 text-xs font-semibold text-ink hover:bg-raised transition"
              >
                <Zap size={13} className="text-accent" />
                <span>QBank Sprint</span>
              </button>
            )}

            {onOpenNotes && (
              <button
                type="button"
                onClick={onOpenNotes}
                className="hidden sm:flex items-center gap-1.5 rounded-xl bg-elevated border border-edge-soft px-3 py-1.5 text-xs font-semibold text-ink hover:bg-raised transition"
              >
                <FileText size={13} className="text-ink-muted" />
                <span>Notes</span>
              </button>
            )}
          </div>
        </header>

        {/* Viewport Content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 flex flex-col gap-6 bg-canvas pb-24 select-text">
          {/* Scan Notice */}
          {scanNotice && (
            <div className="rounded-2xl bg-accent/15 border border-accent/30 p-3.5 text-xs font-semibold text-accent flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Check size={16} />
                <span>{scanNotice}</span>
              </div>
              <button
                type="button"
                onClick={() => setScanNotice(null)}
                className="text-accent hover:underline text-xs"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* VIEW: TODAY COMMAND CENTER (Matching Official CoreBTR Home Screen) */}
          {activeDestination === "today" && (
            <div className="flex flex-col gap-6 animate-in fade-in duration-200">
              {/* BTR Triad Framework Selector (Believe • Trust • Revise) & Offline Banner */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-surface/90 border border-edge shadow-md">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-ink-muted bg-white/10 px-2.5 py-1 rounded-lg border border-edge">
                    BTR Framework
                  </span>
                  <div className="flex items-center gap-1 text-xs font-bold text-white">
                    <span className="text-amber-400">Believe</span>
                    <span className="text-white/30">•</span>
                    <span className="text-ink-muted">Trust</span>
                    <span className="text-white/30">•</span>
                    <span className="text-white">Revise</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs">
                  <span className="flex items-center gap-1.5 text-white/80 bg-white/5 border border-white/10 px-3 py-1 rounded-xl font-mono text-[11px]">
                    <span className="h-2 w-2 rounded-full bg-accent animate-pulse" />
                    <span>61 Videos & 32 PDFs Offline</span>
                  </span>
                  <button
                    type="button"
                    onClick={handleOpenFolderPicker}
                    className="text-ink-muted hover:underline text-xs font-semibold"
                  >
                    /Downloads/BTR
                  </button>
                </div>
              </div>

              {/* 1. Official CoreBTR Hero Rankers Banner (from official CoreBTR App) */}
              <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-surface via-elevated to-surface p-6 md:p-8 text-white shadow-xl flex flex-col md:flex-row items-center justify-between gap-6 border border-edge">
                <div className="flex flex-col gap-2 relative z-10">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full bg-white/20 text-white font-mono text-[10px] font-extrabold uppercase tracking-wider backdrop-blur-md">
                      1/6 INI-CET RESULTS
                    </span>
                    <a
                      href="https://www.instagram.com/corebtr/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-[11px] font-bold text-white/80 hover:text-white transition"
                    >
                      <InstagramIcon size={12} />
                      <span>@corebtr</span>
                    </a>
                  </div>
                  <h2 className="text-2xl md:text-3xl font-black tracking-tight leading-tight">
                    100+ STUDENTS IN TOP 200 RANKERS
                  </h2>
                  <span className="text-sm md:text-base font-bold text-ink-muted">
                    INICET MAY 2026 are From CoreBTR
                  </span>
                  <p className="text-xs text-white/80 mt-1 max-w-lg">
                    They Revised. They Ranked. You&apos;re NEXT! High-yield 19-subject integration and active recall drills.
                  </p>
                </div>

                <div className="flex items-center gap-2 relative z-10 shrink-0">
                  <button
                    type="button"
                    onClick={() => setShowCustomModuleModal(true)}
                    className="px-5 py-2.5 rounded-2xl bg-white text-black font-extrabold text-xs shadow-lg hover:bg-white/90 transition"
                  >
                    + Create Custom Module
                  </button>
                  <button
                    type="button"
                    onClick={() => handleNavigate("subjects")}
                    className="px-4 py-2.5 rounded-2xl bg-white/15 hover:bg-white/25 text-white font-bold text-xs backdrop-blur-md transition border border-white/20"
                  >
                    Explore Library
                  </button>
                </div>
              </div>

              {/* Today's AIR < 100 Rank Maximization Prescription Card */}
              <div className="p-6 rounded-3xl bg-gradient-to-r from-amber-500/10 via-surface to-elevated border border-amber-500/30 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden">
                <div className="flex flex-col gap-2 relative z-10">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 font-mono text-[10px] font-extrabold uppercase tracking-wider">
                      Today&apos;s Prescription • AIR &lt; 100
                    </span>
                    <span className="text-[11px] font-bold text-white/60">
                      ~45 Min Precision Sprint
                    </span>
                  </div>

                  <h3 className="text-xl md:text-2xl font-black text-white tracking-tight">
                    Autonomous Rank Maximization Queue
                  </h3>

                  <div className="flex flex-wrap items-center gap-3 text-xs text-white/80 pt-1">
                    <span className="flex items-center gap-1.5 bg-white/5 border border-white/10 px-3 py-1 rounded-xl">
                      <Flame size={13} className="text-amber-400" />
                      <span>{summary.dueTodayCount > 0 ? summary.dueTodayCount : 10} FSRS Due Cards</span>
                    </span>
                    <span className="flex items-center gap-1.5 bg-white/5 border border-white/10 px-3 py-1 rounded-xl">
                      <Zap size={13} className="text-amber-400" />
                      <span>1 Mini Test (Surprise Drop)</span>
                    </span>
                    <span className="flex items-center gap-1.5 bg-white/5 border border-white/10 px-3 py-1 rounded-xl">
                      <Award size={13} className="text-amber-400" />
                      <span>5 Top-100 Frontier Tie-Breakers</span>
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 relative z-10 shrink-0 w-full md:w-auto">
                  <button
                    type="button"
                    onClick={async () => {
                      const qs = await generateAIR100Prescription();
                      onStartQBankDrill?.("Today's AIR < 100 Prescription", qs);
                    }}
                    className="w-full md:w-auto px-6 py-3 rounded-2xl bg-white hover:bg-white/90 text-black font-extrabold text-xs shadow-lg transition flex items-center justify-center gap-2"
                  >
                    <Play size={14} className="fill-black" />
                    <span>Launch Today&apos;s Prescription (25 Qs)</span>
                  </button>
                </div>
              </div>

              {/* 2. Official Quick Actions 7-Pill Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-7 gap-3">
                {[
                  {
                    id: "audio_pod",
                    label: "Audio Pod",
                    icon: Headphones,
                    action: () => handleOpenAudioPod(),
                  },
                  {
                    id: "bookmarks",
                    label: "Bookmarks",
                    icon: Bookmark,
                    action: () => setShowBookmarksModal(true),
                  },
                  {
                    id: "custom_module",
                    label: "Custom Module",
                    icon: SlidersHorizontal,
                    action: () => setShowCustomModuleModal(true),
                  },
                  {
                    id: "frontier_vault",
                    label: "Top-100 Vault",
                    icon: Award,
                    action: () => setShowFrontierVaultModal(true),
                  },
                  {
                    id: "downloads",
                    label: "Downloads",
                    icon: Download,
                    action: handleOpenFolderPicker,
                  },
                  {
                    id: "study_plan",
                    label: "Study Plan",
                    icon: Target,
                    action: () => handleNavigate("plan"),
                  },
                  {
                    id: "notifications",
                    label: "Notifications",
                    icon: Bell,
                    action: () => setShowBroadcastsModal(true),
                  },
                ].map((act) => {
                  const Icon = act.icon;
                  return (
                    <button
                      key={act.id}
                      type="button"
                      onClick={act.action}
                      className="flex flex-col items-center justify-center gap-2 p-3.5 rounded-2xl bg-elevated/70 border border-edge hover:border-white/20 hover:bg-elevated transition shadow-xs group"
                    >
                      <div className="h-9 w-9 rounded-xl bg-white/10 text-white/90 group-hover:bg-white text-black group-hover:text-white transition flex items-center justify-center">
                        <Icon size={16} />
                      </div>
                      <span className="text-xs font-bold text-white">{act.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* 3. Official What's On Cards Row (Distraction-free CoreBTR Obsidian Style) */}
              <div className="flex flex-col gap-3">
                <span className="text-xs font-bold uppercase tracking-wider text-white/60">
                  What&apos;s On
                </span>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {/* Card A: Core Drop Surprise Test-6 */}
                  <div className="p-4 rounded-2xl bg-elevated/70 border border-edge flex flex-col justify-between gap-3 shadow-xs hover:border-white/20 transition">
                    <div>
                      <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-300 border border-amber-500/30">
                        Daily 3 PM Drop
                      </span>
                      <h4 className="text-sm font-bold text-white mt-2">
                        Core Drop - Surprise Test-6
                      </h4>
                      <p className="text-xs text-white/70 mt-0.5">
                        25 Qs • 15 Minutes • with Video Solutions
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => onStartQBankDrill?.("Core Drop Surprise Test-6")}
                      className="w-full py-2 rounded-xl bg-white hover:bg-white/90 text-black font-semibold font-extrabold text-xs shadow transition flex items-center justify-center gap-1.5"
                    >
                      <Play size={12} fill="currentColor" />
                      <span>Attempt Now</span>
                    </button>
                  </div>

                  {/* Card B: Facing a Tech Issue in the App? Report Now */}
                  <div className="p-4 rounded-2xl bg-elevated/70 border border-edge flex flex-col justify-between gap-3 shadow-xs hover:border-white/20 transition">
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-md bg-white/10 text-white/90 border border-white/15">
                          Tech Support
                        </span>
                        <div className="h-6 w-6 rounded-lg bg-white/10 text-white/90 flex items-center justify-center">
                          <AlertTriangle size={13} />
                        </div>
                      </div>
                      <h4 className="text-sm font-bold text-white mt-2">
                        Facing a Tech Issue in the App?
                      </h4>
                      <p className="text-xs text-white/70 mt-0.5">
                        [This option is specifically for reporting Tech Issues in the CoreBTR App]
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowTechIssueModal(true)}
                      className="w-full py-2 rounded-xl bg-elevated hover:bg-raised text-white border border-edge font-extrabold text-xs shadow transition flex items-center justify-center gap-1.5"
                    >
                      <span>Report Now</span>
                      <ChevronRight size={13} />
                    </button>
                  </div>

                  {/* Card C: FMGE CoreBTR Plan */}
                  <div className="p-4 rounded-2xl bg-elevated/70 border border-edge flex flex-col justify-between gap-3 shadow-xs hover:border-white/20 transition">
                    <div>
                      <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-md bg-white/10 text-white/90 border border-white/15">
                        Exam Schedule
                      </span>
                      <h4 className="text-sm font-bold text-white mt-2">
                        FMGE CoreBTR Plan
                      </h4>
                      <p className="text-xs text-white/70 mt-0.5">
                        (3rd May - 14th June) • High-Yield Rapid Revision
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleNavigate("plan")}
                      className="w-full py-2 rounded-xl bg-white hover:bg-white/90 text-black font-semibold font-extrabold text-xs shadow transition flex items-center justify-center gap-1.5"
                    >
                      <span>View FMGE Plan</span>
                      <ChevronRight size={13} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Mission Control & Readiness Banner */}
              <div className="relative overflow-hidden rounded-3xl border border-edge-soft bg-gradient-to-br from-surface/90 via-surface/60 to-elevated/40 p-6 md:p-8 shadow-sm backdrop-blur-xl">
                <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-accent/15 blur-3xl pointer-events-none" />
                <div className="absolute -left-16 -bottom-16 h-64 w-64 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />

                <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative z-10">
                  <div>
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span className="flex items-center gap-1.5 rounded-full bg-accent/20 px-3 py-1 text-xs font-bold text-accent border border-accent/30 tracking-wide">
                        <Flame size={14} className="fill-accent text-accent" />
                        CORE BTR NEET-PG 2027
                      </span>
                      <span className="rounded-full bg-elevated px-3 py-1 text-xs font-semibold text-ink-muted border border-edge-soft">
                        Dr. Zainab Vora Curriculum
                      </span>
                      <span className="rounded-full bg-white/10 text-white/90 border border-white/15 px-3 py-1 text-xs font-semibold">
                        19 Subjects Integrated
                      </span>
                    </div>
                    <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight text-ink">
                      NEET-PG 2027 Strategic Command & War Room
                    </h2>
                    <p className="mt-1 text-sm text-ink-muted max-w-2xl leading-relaxed">
                      Phased syllabus execution, unannotated workbooks, 100 super-volatile tables, and synced local video lecture playback.
                    </p>
                  </div>

                  {/* Dual Countdowns */}
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex flex-col items-center justify-center rounded-2xl bg-canvas/80 border border-edge-soft px-4 py-3 min-w-[130px] shadow-sm">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-accent">INI-CET May 2027</span>
                      <div className="text-2xl font-black text-ink tracking-tight mt-0.5">
                        {countdowns.iniCetMay.days}
                        <span className="text-xs font-medium text-ink-muted ml-1">days</span>
                      </div>
                      <span className="text-[10.5px] text-ink-muted">{countdowns.iniCetMay.targetDateStr}</span>
                    </div>

                    <div className="flex flex-col items-center justify-center rounded-2xl bg-canvas/80 border border-accent/30 px-4 py-3 min-w-[130px] shadow-sm ring-1 ring-accent/20">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">NEET-PG 2027</span>
                      <div className="text-2xl font-black text-ink tracking-tight mt-0.5">
                        {countdowns.neetPg.days}
                        <span className="text-xs font-medium text-ink-muted ml-1">days</span>
                      </div>
                      <span className="text-[10.5px] text-ink-muted">{countdowns.neetPg.targetDateStr}</span>
                    </div>

                    {/* Next GT Live Radar Tracker */}
                    <button
                      type="button"
                      onClick={() => setShowGTTrackerModal(true)}
                      className="flex flex-col items-center justify-center rounded-2xl bg-canvas/80 border border-emerald-500/40 hover:border-emerald-500 px-4 py-3 min-w-[160px] shadow-sm transition hover:scale-[1.02] text-center cursor-pointer group"
                      title="Open Cross-Platform Next Grand Test Tracker"
                    >
                      <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                        <Radio size={11} className={nextGTStatus?.isLive ? "animate-pulse" : ""} />
                        <span>{nextGTStatus?.isLive ? "GT LIVE NOW" : "NEXT GT MOCK"}</span>
                      </div>
                      <div className="text-sm font-black text-ink tracking-tight mt-0.5 line-clamp-1 max-w-[150px] group-hover:text-accent transition">
                        {nextGT ? nextGT.testName.replace(/All-India|National/gi, "").trim() : "View GT Radar"}
                      </div>
                      <span className="text-[10.5px] font-semibold text-emerald-400/90 mt-0.5">
                        {nextGTStatus ? nextGTStatus.countdownLabel : "Track 5 Platforms"}
                      </span>
                    </button>
                  </div>
                </div>

                {/* Concentric Radial Mastery Rings & Telemetry HUD */}
                <div className="mt-6 pt-6 border-t border-edge-soft flex flex-col md:flex-row items-center justify-between gap-6">
                  {/* Triple Radial Progress Ring */}
                  <div className="flex items-center gap-5">
                    <div className="relative flex h-24 w-24 shrink-0 items-center justify-center">
                      <svg className="h-full w-full -rotate-90 transform" viewBox="0 0 100 100">
                        {/* Background Tracks */}
                        <circle cx="50" cy="50" r="42" fill="none" stroke="currentColor" strokeWidth="6" className="text-elevated/70" />
                        <circle cx="50" cy="50" r="32" fill="none" stroke="currentColor" strokeWidth="6" className="text-elevated/70" />
                        <circle cx="50" cy="50" r="22" fill="none" stroke="currentColor" strokeWidth="6" className="text-elevated/70" />

                        {/* Outer Ring: Overall Readiness % (Electric Blue) */}
                        <circle
                          cx="50"
                          cy="50"
                          r="42"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="6"
                          strokeLinecap="round"
                          strokeDasharray={2 * Math.PI * 42}
                          strokeDashoffset={2 * Math.PI * 42 * (1 - Math.min(100, readiness.completionPercentage) / 100)}
                          className="text-white/40 transition-all duration-1000 ease-out"
                        />

                        {/* Middle Ring: Mastered Subjects (Light Medical Blue, 19 target) */}
                        <circle
                          cx="50"
                          cy="50"
                          r="32"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="6"
                          strokeLinecap="round"
                          strokeDasharray={2 * Math.PI * 32}
                          strokeDashoffset={2 * Math.PI * 32 * (1 - Math.min(19, readiness.masteredCount + readiness.annotatedCount) / 19)}
                          className="text-accent transition-all duration-1000 ease-out"
                        />

                        {/* Inner Ring: Linked BTR Videos (Warm Gold, 61 target) */}
                        <circle
                          cx="50"
                          cy="50"
                          r="22"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="6"
                          strokeLinecap="round"
                          strokeDasharray={2 * Math.PI * 22}
                          strokeDashoffset={2 * Math.PI * 22 * (1 - Math.min(61, libraryState.totalVideosFound) / 61)}
                          className="text-amber-400 transition-all duration-1000 ease-out"
                        />
                      </svg>

                      {/* Center Gauge Telemetry */}
                      <div className="absolute flex flex-col items-center justify-center text-center">
                        <span className="text-base font-black text-ink leading-none">
                          {readiness.completionPercentage}%
                        </span>
                        <span className="text-[8.5px] font-bold uppercase tracking-wider text-ink-muted mt-0.5">
                          Readiness
                        </span>
                      </div>
                    </div>

                    {/* Ring Legend & Telemetry */}
                    <div className="flex flex-col gap-1.5 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-white text-black shrink-0" />
                        <span className="text-ink-muted">Mastery Readiness:</span>
                        <strong className="text-ink font-bold">{readiness.completionPercentage}%</strong>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-accent shrink-0" />
                        <span className="text-ink-muted">Subjects Mastered:</span>
                        <strong className="text-ink font-bold">{readiness.masteredCount + readiness.annotatedCount}/19</strong>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-[#feb122] shrink-0" />
                        <span className="text-ink-muted">Videos Linked:</span>
                        <strong className="text-ink font-bold">{libraryState.totalVideosFound}/61</strong>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-emerald-400 shrink-0" />
                        <span className="text-ink-muted">Offline Files Verified:</span>
                        <strong className="text-ink font-bold">
                          {USER_LOCAL_BTR_MANIFEST.masterPdfs.length +
                            USER_LOCAL_BTR_MANIFEST.megaBtrVideos.length +
                            USER_LOCAL_BTR_MANIFEST.tndVideos.length +
                            USER_LOCAL_BTR_MANIFEST.tndPdfs.length +
                            USER_LOCAL_BTR_MANIFEST.grandTests.length +
                            USER_LOCAL_BTR_MANIFEST.subjectFiles.length}{" "}
                          Files
                        </strong>
                      </div>
                    </div>
                  </div>

                  {/* Right Telemetry Cards */}
                  <div className="grid grid-cols-2 gap-3 w-full md:w-auto">
                    <div className="rounded-2xl bg-elevated/70 border border-edge p-3.5 min-w-[140px] flex flex-col">
                      <span className="text-[10.5px] font-medium text-white/70">Grand Tests Logged</span>
                      <div className="text-xl font-black text-white mt-0.5">{gtRecords.length} tests</div>
                      <span className="text-[10px] text-ink-muted">Latest: {gtRecords[0]?.percentile ?? 0}%ile</span>
                    </div>

                    <div className="rounded-2xl bg-elevated/70 border border-edge p-3.5 min-w-[140px] flex flex-col">
                      <span className="text-[10.5px] font-medium text-white/70">Volatiles Active</span>
                      <div className="text-xl font-black text-amber-400 mt-0.5">100 Tables</div>
                      <span className="text-[10px] text-white/60">FSRS Repetition active</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Row 1: Priority Active Learning Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Priority Card A: Daily Volatile Drip (FSRS Spaced Repetition) */}
                <div className="rounded-2xl border border-edge bg-elevated/70 backdrop-blur-md p-5 flex flex-col justify-between gap-4 shadow-sm hover:border-white/20 transition">
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-0.5 text-[11px] font-bold text-ink-muted border border-edge">
                        <Droplets size={12} className="text-ink-muted" />
                        <span>FSRS Spaced Repetition</span>
                      </span>
                      <span className="text-xs font-mono text-amber-400 font-bold">
                        {summary.streakDays} Day Streak 🔥
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-white">Daily Volatile Drip</h3>
                    <p className="text-xs text-white/70 leading-relaxed">
                      10 super-volatile cards calculated for optimal memory stability. Active recall with spaced repetition intervals.
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-edge">
                    <span className="text-xs text-white/70">
                      <strong className="text-ink-muted font-bold font-mono">{summary.dueTodayCount}</strong> cards due today
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowDripModal(true)}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white hover:bg-white/90 text-black font-semibold border border-edge text-xs font-bold transition shadow-xs"
                    >
                      <span>Start 5-Min Drip</span>
                      <ChevronRight size={13} />
                    </button>
                  </div>
                </div>

                {/* Priority Card B: Dual Split Workstation */}
                <div className="rounded-2xl border border-edge bg-elevated/70 backdrop-blur-md p-5 flex flex-col justify-between gap-4 shadow-sm hover:border-white/20 transition">
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-0.5 text-[11px] font-bold text-ink-muted border border-edge">
                        <Layers size={12} className="text-ink-muted" />
                        <span>Dual-Pane Studio</span>
                      </span>
                      {workstationSession && (
                        <span className="text-[10.5px] font-bold text-ink-muted bg-white/10 px-2 py-0.5 rounded border border-edge">
                          ACTIVE
                        </span>
                      )}
                    </div>
                    <h3 className="text-base font-bold text-white">Dual Split Workstation</h3>
                    <p className="text-xs text-white/70 leading-relaxed">
                      {workstationSession
                        ? `Loaded: ${workstationSession.subject.shortCode} • ${workstationSession.video.title || workstationSession.video.filename}`
                        : "Synchronized local video lectures with companion unannotated workbook viewing and A-B loop active recall."}
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-edge">
                    <span className="text-xs text-white/70">
                      {libraryState.totalVideosFound} local videos linked
                    </span>
                    <button
                      type="button"
                      onClick={() => handleNavigate("workstation")}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white hover:bg-white/90 text-black font-semibold border border-edge text-xs font-bold transition shadow-xs"
                    >
                      <span>{workstationSession ? "Resume Workstation" : "Launch Workstation"}</span>
                      <ChevronRight size={13} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Row 2: Official YouTube Drops & 20th Subject Matrix */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Official Broadcast Card */}
                <div className="rounded-2xl border border-edge bg-elevated/70 backdrop-blur-md p-5 flex flex-col justify-between gap-4 shadow-sm hover:border-white/20 transition">
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-0.5 text-[11px] font-bold text-ink-muted border border-edge">
                        <Radio size={12} className="animate-pulse text-ink-muted" />
                        <span>Daily 3 PM Core Drop</span>
                      </span>
                      <span className="text-[10.5px] font-semibold text-white/60">@corebtrbyzainabvora</span>
                    </div>
                    <h3 className="text-sm font-bold text-white truncate">
                      {CORE_BTR_BROADCASTS[0].title}
                    </h3>
                    <p className="text-xs text-white/70 line-clamp-2 leading-relaxed">
                      {CORE_BTR_BROADCASTS[0].description}
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-edge">
                    <span className="text-xs text-ink-muted font-semibold">
                      {CORE_BTR_BROADCASTS[0].durationLabel} • {CORE_BTR_BROADCASTS[0].categoryLabel}
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowBroadcastsModal(true)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-white/90 text-black font-semibold border border-edge text-xs font-bold transition shadow-xs"
                    >
                      <span>Channel Broadcasts</span>
                      <ChevronRight size={13} />
                    </button>
                  </div>
                </div>

                {/* 20th Subject Card */}
                <div className="rounded-2xl border border-edge bg-elevated/70 backdrop-blur-md p-5 flex flex-col justify-between gap-4 shadow-sm hover:border-white/20 transition">
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 rounded-full bg-amber-500/15 px-2.5 py-0.5 text-[11px] font-bold text-amber-400 border border-amber-500/30">
                        <Calculator size={12} className="text-amber-400" />
                        <span>&quot;20th Subject&quot; Matrix</span>
                      </span>
                      <span className="text-[10.5px] font-semibold text-amber-400">High-Yield Numbers</span>
                    </div>
                    <h3 className="text-sm font-bold text-white">
                      Biostatistics, DOCs & Bio-Medical Waste
                    </h3>
                    <p className="text-xs text-white/70 leading-relaxed">
                      Instant 2x2 Sensitivity/Specificity calculator, Drug of Choice master directory, GCS, CURB-65 & BMW 2016 rules.
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-edge">
                    <span className="text-xs text-white/70">
                      Sens, Spec, PPV, NPV formulas
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowTwentyModal(true)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-white/90 text-black font-semibold border border-edge text-xs font-bold transition shadow-xs"
                    >
                      <span>Open Matrix</span>
                      <ChevronRight size={13} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Row 3: High-Yield Tool Launchers Grid (Unified CoreBTR Obsidian Style) */}
              <div className="flex flex-col gap-3">
                <span className="text-xs font-bold uppercase tracking-wider text-white/60">
                  Interactive High-Yield Revision Drills
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                  {[
                    {
                      label: "T&D Simulator",
                      sub: "17 Exam Papers",
                      icon: Target,
                      color: "text-ink-muted border-edge bg-elevated/70 hover:border-white/20 hover:bg-elevated",
                      action: () => setShowTnDModal(true),
                    },
                    {
                      label: "3-Tier Pyramids",
                      sub: "Base to Tie-Breakers",
                      icon: Triangle,
                      color: "text-ink-muted border-edge bg-elevated/70 hover:border-white/20 hover:bg-elevated",
                      action: () => setShowPyramidsModal(true),
                    },
                    {
                      label: "Mega BTR 72h",
                      sub: "Rapid Revision Blitz",
                      icon: Zap,
                      color: "text-amber-400 border-edge bg-elevated/70 hover:border-[#feb122]/60 hover:bg-elevated",
                      action: () => setShowMarathonModal(true),
                    },
                    {
                      label: "Spotter Image Bank",
                      sub: "Active Recall Mask",
                      icon: Eye,
                      color: "text-ink-muted border-edge bg-elevated/70 hover:border-white/20 hover:bg-elevated",
                      action: () => setShowSpotterModal(true),
                    },
                    {
                      label: "Two-Step Cases",
                      sub: "Clinical Vignettes",
                      icon: Stethoscope,
                      color: "text-ink-muted border-edge bg-elevated/70 hover:border-white/20 hover:bg-elevated",
                      action: () => setShowVignetteModal(true),
                    },
                    {
                      label: "Cross-PDF Search",
                      sub: "32 Workbooks",
                      icon: Search,
                      color: "text-ink-muted border-edge bg-elevated/70 hover:border-white/20 hover:bg-elevated",
                      action: () => setShowPdfSearchModal(true),
                    },
                  ].map((drill) => {
                    const DrillIcon = drill.icon;
                    return (
                      <button
                        key={drill.label}
                        type="button"
                        onClick={drill.action}
                        className={`flex flex-col items-center justify-center p-3.5 rounded-2xl border text-center transition hover:scale-[1.02] shadow-xs ${drill.color}`}
                      >
                        <DrillIcon size={18} className="mb-1.5" />
                        <span className="text-xs font-bold text-white leading-tight">{drill.label}</span>
                        <span className="text-[10px] text-white/60 mt-0.5">{drill.sub}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* VIEW: DUAL SPLIT WORKSTATION */}
          {activeDestination === "workstation" && (
            <div className="flex-1 flex flex-col animate-in fade-in duration-150">
              {workstationSession ? (
                <BTRSplitWorkstation
                  open={true}
                  embedded={true}
                  onClose={() => setActiveDestination("today")}
                  video={workstationSession.video}
                  subject={workstationSession.subject}
                  unannotatedPdf={workstationSession.unannotatedPdf}
                  annotatedPdf={workstationSession.annotatedPdf}
                />
              ) : (
                <div className="flex flex-col items-center justify-center p-12 text-center rounded-3xl border border-edge-soft bg-surface/40 min-h-[500px]">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-accent/15 text-accent border border-accent/25 mb-4">
                    <Layers size={32} />
                  </div>
                  <h3 className="text-lg font-bold text-ink">Dual Split Workstation Ready</h3>
                  <p className="text-xs text-ink-muted max-w-md mt-1 mb-6">
                    Synchronized local video lectures with companion unannotated workbook viewing, A-B looping, and audio walk mode. Select any lecture from the 19-Subject Studio to launch.
                  </p>
                  <button
                    type="button"
                    onClick={() => setActiveDestination("subjects")}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-accent text-white text-xs font-bold hover:brightness-110 shadow-sm transition"
                  >
                    <BookOpen size={15} />
                    <span>Browse 19-Subject Studio</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* VIEW: 19-SUBJECT STUDIO & LOCAL MEDIA */}
          {activeDestination === "subjects" && (
            <div className="flex flex-col gap-6 animate-in fade-in duration-150">
              {selectedSubjectDetail ? (
                <BTRSubjectExplorer
                  subject={selectedSubjectDetail}
                  onBack={() => setSelectedSubjectDetail(null)}
                  onStartQBank={(topic) =>
                    onStartQBankDrill?.(topic ? `${selectedSubjectDetail.name}: ${topic}` : selectedSubjectDetail.name)
                  }
                  onCreateCustomModule={() => setShowCustomModuleModal(true)}
                  onPlayVideo={(vid) => handlePlayLecture(vid, selectedSubjectDetail)}
                  onLaunchWorkstation={(vid, unannotated, annotated) =>
                    setWorkstationSession({
                      video: vid,
                      subject: selectedSubjectDetail,
                      unannotatedPdf: unannotated,
                      annotatedPdf: annotated,
                    })
                  }
                  videos={libraryState.mappings[selectedSubjectDetail.id]?.videos || []}
                  unannotatedPdf={libraryState.mappings[selectedSubjectDetail.id]?.unannotatedPdf}
                  annotatedPdf={libraryState.mappings[selectedSubjectDetail.id]?.annotatedPdf}
                  onSelectPearl={(pearl) => {
                    setSelectedPearlModal(pearl);
                    setActivePearlsDeck(null);
                  }}
                  onStudyAllPearls={(pearls) => {
                    setActivePearlsDeck(pearls);
                    setSelectedPearlModal(pearls[0]);
                  }}
                />
              ) : (
                <>
                  {/* Category Pills Rail (from screenshot media_1794864389396) */}
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-edge-soft pb-4">
                    <div className="flex flex-wrap items-center gap-1.5 rounded-2xl bg-surface/80 p-1.5 border border-edge-soft">
                      {(
                        [
                          "All Subjects",
                          "Short Subjects",
                          "Intermediate Subjects",
                          "Long Subjects",
                          "Integrated Systems",
                        ] as const
                      ).map((cat) => (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => setLibraryCategoryFilter(cat)}
                          className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition ${
                            libraryCategoryFilter === cat
                              ? "bg-white text-black font-semibold shadow-sm"
                              : "text-ink-muted hover:text-ink hover:bg-elevated"
                          }`}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="relative">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
                        <input
                          type="text"
                          placeholder="Search subjects, pearls..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="h-9 w-44 md:w-56 rounded-xl bg-surface border border-edge-soft pl-9 pr-3 text-xs text-ink placeholder:text-ink-muted focus:border-edge focus:outline-none transition"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={() => setShowCustomModuleModal(true)}
                        className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/10 border border-edge text-xs font-bold text-ink-muted hover:bg-white/15 transition"
                      >
                        <Plus size={13} />
                        <span>Custom Module</span>
                      </button>
                    </div>
                  </div>

                  {/* Sub-tab switcher for Tracker vs Raw Files */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 rounded-2xl bg-surface/80 p-1.5 border border-edge-soft">
                      <button
                        type="button"
                        onClick={() => setSubjectsSubTab("tracker")}
                        className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition ${
                          subjectsSubTab === "tracker"
                            ? "bg-accent text-white shadow-sm"
                            : "text-ink-muted hover:text-ink hover:bg-elevated"
                        }`}
                      >
                        <Target size={14} />
                        <span>Subject Grid & Modules</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setSubjectsSubTab("files")}
                        className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition ${
                          subjectsSubTab === "files"
                            ? "bg-accent text-white shadow-sm"
                            : "text-ink-muted hover:text-ink hover:bg-elevated"
                        }`}
                      >
                        <FolderCheck size={14} />
                        <span>My Local Videos & PDFs ({libraryState.totalVideosFound + libraryState.totalPdfsFound})</span>
                      </button>
                    </div>
                  </div>

              {subjectsSubTab === "tracker" ? (
                <div className="flex flex-col gap-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredSubjects.map((subj) => {
              const currentStatus: BTRProgressStatus = progressMap[subj.id]?.status || "unread";
              const media = libraryState.mappings[subj.id];
              const videosCount = media?.videos.length || 0;
              const hasAnnotated = !!media?.annotatedPdf;
              const hasUnannotated = !!media?.unannotatedPdf;

              const statusColor = {
                unread: "bg-elevated text-ink-muted border-edge",
                in_progress: "bg-white/10 text-white/90 border-edge",
                btr_annotated: "bg-white/15 text-white border-edge",
                td_completed: "bg-white/15 text-white border-edge",
                mastered: "bg-white text-black font-semibold border-edge",
              }[currentStatus];

              const statusLabel = {
                unread: "Unread",
                in_progress: "In Progress",
                btr_annotated: "BTR Annotated",
                td_completed: "T&D Complete",
                mastered: "Mastered",
              }[currentStatus];

              return (
                <div
                  key={subj.id}
                  className="rounded-2xl bg-surface/70 border border-edge-soft p-5 flex flex-col justify-between gap-4 hover:border-accent/40 transition group"
                >
                  <div className="flex flex-col gap-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[10px] font-bold rounded-lg bg-elevated px-2 py-0.5 border border-edge-soft text-ink-muted">
                          {subj.shortCode}
                        </span>
                        <span className="text-[11px] font-semibold text-accent">
                          Block {subj.blockNumber} • {subj.category}
                        </span>
                      </div>
                      <span className={`text-[10px] font-bold rounded-full px-2.5 py-0.5 border ${statusColor}`}>
                        {statusLabel}
                      </span>
                    </div>

                    <div
                      onClick={() => setSelectedSubjectDetail(subj)}
                      className="cursor-pointer"
                    >
                      <h3 className="text-base font-bold text-ink leading-snug group-hover:text-ink-muted transition">
                        {subj.name}
                      </h3>
                      {SUBJECT_METRICS_MAP[subj.id] && (
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[11px] text-ink-muted font-medium">
                            {SUBJECT_METRICS_MAP[subj.id].completed}/{SUBJECT_METRICS_MAP[subj.id].items} items
                          </span>
                          <span className="text-[10px] text-ink-muted font-bold bg-white text-black/10 px-1.5 py-0.2 rounded border border-edge">
                            {Math.round((SUBJECT_METRICS_MAP[subj.id].completed / SUBJECT_METRICS_MAP[subj.id].items) * 100)}% completed
                          </span>
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-ink-muted leading-relaxed line-clamp-2">
                      {subj.description}
                    </p>

                    {/* Local Media Indicators */}
                    <div className="flex flex-wrap items-center gap-1.5 mt-1">
                      {videosCount > 0 ? (
                        <span className="text-[10.5px] font-semibold text-ink-muted bg-white/10 border border-edge px-2 py-0.5 rounded-lg flex items-center gap-1">
                          <Play size={10} fill="currentColor" /> {videosCount} Videos
                        </span>
                      ) : (
                        <span className="text-[10px] text-ink-muted bg-elevated px-2 py-0.5 rounded-md">
                          No videos linked
                        </span>
                      )}

                      {hasUnannotated && (
                        <span className="text-[10px] font-semibold text-accent bg-accent/10 border border-accent/20 px-2 py-0.5 rounded-md">
                          Unannotated PDF
                        </span>
                      )}

                      {hasAnnotated && (
                        <span className="text-[10px] font-semibold text-ink-muted bg-white/10 border border-edge px-2 py-0.5 rounded-md">
                          Annotated Notes
                        </span>
                      )}
                    </div>

                    {/* Must-Know Topics List */}
                    <div className="mt-2 flex flex-col gap-1">
                      <span className="text-[10.5px] uppercase font-bold tracking-wider text-ink-muted">
                        High-Yield Pillars ({subj.highYieldPytCount} PYTs):
                      </span>
                      <ul className="text-[11.5px] text-ink-muted flex flex-col gap-1 pl-1">
                        {subj.mustKnowTopics.slice(0, 3).map((topic, i) => (
                          <li key={i} className="flex items-center gap-1.5 truncate">
                            <span className="h-1 w-1 rounded-full bg-accent shrink-0" />
                            <span className="truncate">{topic}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Actions & Status Dropdown */}
                  <div className="pt-3 border-t border-edge-soft flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      {videosCount > 0 && media && (
                        <>
                          <button
                            type="button"
                            onClick={() =>
                              setWorkstationSession({
                                video: media.videos[0],
                                subject: subj,
                                unannotatedPdf: media.unannotatedPdf,
                                annotatedPdf: media.annotatedPdf,
                              })
                            }
                            title="Open Side-by-Side Video & PDF Workstation"
                            className="flex items-center gap-1 rounded-lg bg-white text-black px-2 py-1 text-[11px] font-bold text-white shadow-xs hover:bg-white/90 transition"
                          >
                            <Layers size={11} />
                            <span>Dual</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handlePlayLecture(media.videos[0], subj)}
                            className="flex items-center gap-1 rounded-lg bg-white text-black px-2 py-1 text-[11px] font-bold text-white shadow-xs hover:bg-white/90 transition"
                          >
                            <Play size={11} fill="currentColor" />
                            <span>Play</span>
                          </button>
                        </>
                      )}

                      {(hasUnannotated || hasAnnotated) && media && (
                        <button
                          type="button"
                          onClick={() =>
                            handleOpenPdf(media.unannotatedPdf || media.annotatedPdf!)
                          }
                          className="flex items-center gap-1 rounded-lg bg-elevated border border-edge-soft px-2 py-1 text-[11px] font-semibold text-ink hover:bg-raised transition"
                        >
                          <FileText size={11} />
                          <span>PDF</span>
                        </button>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={async () => {
                          const qs = await getQuestionsForSubject(subj.name);
                          if (qs.length > 0) {
                            onStartQBankDrill?.(subj.name, qs);
                          } else {
                            setSelectedSubjectDetail(subj);
                          }
                        }}
                        className="flex items-center gap-1 rounded-lg bg-white/10 border border-edge px-2 py-1 text-[11px] font-bold text-ink-muted hover:bg-white/15 transition"
                      >
                        <span>QBank</span>
                        <ChevronRight size={11} />
                      </button>

                      {/* Tactile Multi-State Cycle Pill */}
                      <button
                        type="button"
                        onClick={() => {
                          const order: BTRProgressStatus[] = ["unread", "in_progress", "btr_annotated", "td_completed", "mastered"];
                          const nextIdx = (order.indexOf(currentStatus) + 1) % order.length;
                          handleStatusChange(subj.id, order[nextIdx]);
                        }}
                        title={`Status: ${statusLabel}. Click to cycle.`}
                        className={`flex items-center gap-1 rounded-xl px-2.5 py-1 text-[11px] font-bold border transition shadow-xs hover:scale-[1.03] active:scale-95 cursor-pointer ${statusColor}`}
                      >
                        <span>{statusLabel}</span>
                        {currentStatus === "mastered" && <span>🏆</span>}
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setActiveView("volatiles");
                          setSearchQuery(subj.name);
                        }}
                        title="Review Volatiles"
                        className="rounded-lg p-1.5 bg-accent/10 text-accent hover:bg-accent/20 transition"
                      >
                        <Zap size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
                <div className="flex flex-col gap-6">
                  <div className="rounded-2xl bg-surface/70 border border-edge-soft p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <h3 className="text-base font-bold text-ink">BTR Local Storage & Course Mapping</h3>
                      <p className="text-xs text-ink-muted">
                        Argus automatically indexes your BTR directory into the 19 NEET-PG subjects and enables zero-latency libmpv playback with synced PDF workbooks.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={handleOpenFolderPicker}
                      className="flex items-center gap-2 rounded-xl bg-accent px-4 py-2 text-xs font-bold text-white shadow-sm hover:brightness-110 transition shrink-0"
                    >
                      <FolderPlus size={15} />
                      <span>{libraryState.totalVideosFound > 0 ? "Re-Scan BTR Directory" : "Link BTR Folder"}</span>
                    </button>
                  </div>

          {/* Master BTR Workbooks & QBanks */}
          {libraryState.masterPdfs && libraryState.masterPdfs.length > 0 && (
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <BookOpen size={16} className="text-accent" />
                <h4 className="text-sm font-bold text-ink">Master BTR Workbooks & QBank</h4>
                <span className="text-[11px] font-semibold text-accent rounded-full bg-accent/15 px-2 py-0.5 border border-accent/25">
                  Core Volumes
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {libraryState.masterPdfs.map((pdf) => (
                  <div
                    key={pdf.id}
                    className="rounded-2xl bg-surface/80 border border-edge-soft p-4 flex flex-col justify-between gap-3 shadow-xs hover:border-accent/40 transition group"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/15 text-accent border border-accent/25 shrink-0">
                        <FileText size={18} />
                      </div>
                      <div className="min-w-0">
                        <h5 className="text-xs font-bold text-ink truncate group-hover:text-accent transition">
                          {pdf.title}
                        </h5>
                        <span className="text-[10px] text-ink-muted">
                          {(pdf.sizeBytes / (1024 * 1024)).toFixed(1)} MB • Dr. Zainab Vora
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleOpenPdf({ fullPath: pdf.fullPath } as any)}
                      className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-elevated border border-edge-soft px-3 py-1.5 text-xs font-semibold text-ink hover:bg-raised transition"
                    >
                      <BookOpen size={12} />
                      <span>Open Workbook</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Mega BTR & INI-CET Revisions */}
          {libraryState.megaBtrVideos && libraryState.megaBtrVideos.length > 0 && (
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <Flame size={16} className="text-amber-400 fill-[#feb122]" />
                <h4 className="text-sm font-bold text-ink">Mega BTR & INI-CET Rapid Revisions</h4>
                <span className="text-[11px] font-semibold text-ink-muted rounded-full bg-white/10 px-2 py-0.5 border border-edge">
                  Full Marathons
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {libraryState.megaBtrVideos.map((vid) => (
                  <div
                    key={vid.id}
                    className="rounded-2xl bg-surface/80 border border-edge-soft p-4 flex flex-col justify-between gap-3 shadow-xs hover:border-accent/40 transition"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/15 text-accent border border-accent/25 shrink-0">
                        <Play size={16} fill="currentColor" />
                      </div>
                      <div className="min-w-0">
                        <h5 className="text-xs font-bold text-ink truncate">
                          {vid.title}
                        </h5>
                        <span className="text-[10px] text-ink-muted">
                          {(vid.sizeBytes / (1024 * 1024)).toFixed(0)} MB • Ultra-Rapid Marathon
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        const src = createBTRVideoPlayerSrc(
                          {
                            id: vid.id,
                            filename: vid.filename,
                            fullPath: vid.fullPath,
                            relativePath: vid.filename,
                            kind: "video",
                            matchedSubjectId: "medicine",
                            lectureNumber: 1,
                            title: vid.title,
                          },
                          {
                            id: "megabtr",
                            name: "Mega BTR Marathon",
                            shortCode: "MBTR",
                            category: "Long Clinical",
                            blockNumber: 4,
                            recommendedDays: 1,
                            highYieldPytCount: 200,
                            iconName: "Flame",
                            description: "Comprehensive 19-subject Mega BTR marathon review",
                            mustKnowTopics: [],
                            pyramidTiers: { tier1MustKnow: [], tier2Volatile: [], tier3TieBreakers: [] },
                          }
                        );
                        openPlayer(src);
                      }}
                      className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-accent px-3 py-1.5 text-xs font-bold text-white shadow-xs hover:brightness-110 transition"
                    >
                      <Play size={12} fill="currentColor" />
                      <span>Play Marathon in Argus</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Test & Discussion (T&D) Sessions */}
          {libraryState.tndVideos && libraryState.tndVideos.length > 0 && (
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <Target size={16} className="text-accent" />
                <h4 className="text-sm font-bold text-ink">Test & Discussion (T&D) Vault</h4>
                <span className="text-[11px] font-semibold text-ink-muted rounded-full bg-white/10 px-2 py-0.5 border border-edge">
                  17 Subject Sessions
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {libraryState.tndVideos.map((vid) => (
                  <div
                    key={vid.id}
                    className="rounded-2xl bg-surface/80 border border-edge-soft p-3.5 flex items-center justify-between gap-3 shadow-xs hover:border-accent/40 transition"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-white/90 border border-white/15 shrink-0">
                        <Play size={13} fill="currentColor" />
                      </div>
                      <div className="min-w-0">
                        <h5 className="text-xs font-bold text-ink truncate">
                          {vid.title}
                        </h5>
                        <span className="text-[10px] text-ink-muted">
                          {(vid.sizeBytes / (1024 * 1024)).toFixed(0)} MB • T&D Discussion
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        const src = createBTRVideoPlayerSrc(
                          {
                            id: vid.id,
                            filename: vid.filename,
                            fullPath: vid.fullPath,
                            relativePath: vid.filename,
                            kind: "video",
                            matchedSubjectId: "medicine",
                            lectureNumber: 1,
                            title: vid.title,
                          },
                          {
                            id: "tnd",
                            name: vid.title,
                            shortCode: "TND",
                            category: "Long Clinical",
                            blockNumber: 2,
                            recommendedDays: 1,
                            highYieldPytCount: 100,
                            iconName: "Target",
                            description: "Test and discussion session",
                            mustKnowTopics: [],
                            pyramidTiers: { tier1MustKnow: [], tier2Volatile: [], tier3TieBreakers: [] },
                          }
                        );
                        openPlayer(src);
                      }}
                      className="rounded-lg bg-accent px-2.5 py-1 text-[11px] font-bold text-white shadow-xs hover:brightness-110 transition shrink-0"
                    >
                      Play
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center gap-2 pt-2">
            <Layers size={16} className="text-accent" />
            <h4 className="text-sm font-bold text-ink">19-Subject Systemic Video Lectures & PDF Workbooks</h4>
          </div>

          <div className="flex flex-col gap-4">
            {CORE_BTR_SUBJECTS.map((subj) => {
              const mapping = libraryState.mappings[subj.id];
              const videos = mapping?.videos || [];
              const annotated = mapping?.annotatedPdf;
              const unannotated = mapping?.unannotatedPdf;

              return (
                <div
                  key={subj.id}
                  className="rounded-2xl bg-surface/80 border border-edge-soft p-5 flex flex-col gap-3 shadow-xs"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-edge-soft pb-3">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-xs font-bold rounded-lg bg-elevated px-2.5 py-1 border border-edge text-ink-muted">
                        {subj.shortCode}
                      </span>
                      <div>
                        <h4 className="text-sm font-bold text-ink">{subj.name}</h4>
                        <span className="text-[11px] text-accent">
                          Block {subj.blockNumber} • {subj.category}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {unannotated && (
                        <button
                          type="button"
                          onClick={() => handleOpenPdf(unannotated)}
                          className="flex items-center gap-1.5 rounded-lg bg-accent/10 border border-accent/20 px-2.5 py-1 text-xs font-semibold text-accent hover:bg-accent/20 transition"
                        >
                          <BookOpen size={12} />
                          <span>Unannotated Workbook</span>
                        </button>
                      )}

                      {annotated && (
                        <button
                          type="button"
                          onClick={() => handleOpenPdf(annotated)}
                          className="flex items-center gap-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20 px-2.5 py-1 text-xs font-semibold text-blue-400 hover:bg-blue-500/20 transition"
                        >
                          <FileText size={12} />
                          <span>Annotated Master Notes</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Video List */}
                  {videos.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-1">
                      {videos.map((vid) => (
                        <div
                          key={vid.id}
                          className="flex items-center justify-between rounded-xl bg-canvas/70 border border-edge-soft p-3 text-xs group hover:border-accent/40 transition"
                        >
                          <div className="flex items-center gap-2.5 truncate max-w-[75%]">
                            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent/15 text-accent shrink-0">
                              <Play size={12} fill="currentColor" />
                            </span>
                            <div className="truncate">
                              <span className="font-semibold text-ink truncate block">
                                {vid.title}
                              </span>
                              <span className="text-[10px] text-ink-muted">
                                Lecture {vid.lectureNumber}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={() =>
                                setWorkstationSession({
                                  video: vid,
                                  subject: subj,
                                  unannotatedPdf: unannotated,
                                  annotatedPdf: annotated,
                                })
                              }
                              title="Side-by-Side Video & PDF Workstation"
                              className="rounded-lg bg-emerald-600 px-2 py-1 text-[11px] font-bold text-white shadow-xs hover:brightness-110 transition"
                            >
                              Dual
                            </button>

                            <button
                              type="button"
                              onClick={() => handlePlayLecture(vid, subj)}
                              className="rounded-lg bg-accent px-2.5 py-1 text-[11px] font-bold text-white shadow-xs hover:brightness-110 transition"
                            >
                              Play
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-xs text-ink-muted italic py-2 flex items-center gap-2">
                      <FolderPlus size={13} className="text-ink-muted" />
                      <span>
                        No local videos currently matched for {subj.name}. Click &quot;Link BTR Folder&quot; above to select your videos directory.
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </>
  )}
</div>
)}

{/* VIEW: OFFICIAL TESTS (GRAND TESTS, MINI TESTS, CORE DROP TESTS) */}
{activeDestination === "tests" && (
  <div className="flex flex-col gap-6 animate-in fade-in duration-150">
    {/* Header & Sub-Tabs (from screenshot media_1794864389397) */}
    <div className="flex flex-wrap items-center justify-between gap-4 border-b border-edge-soft pb-4">
      <div className="flex items-center gap-1.5 rounded-2xl bg-surface/80 p-1.5 border border-edge-soft">
        {(["Grand Tests", "Mini Tests", "Core Drop Tests"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTestsSubTab(t)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
              testsSubTab === t
                ? "bg-white text-black font-semibold shadow-sm"
                : "text-ink-muted hover:text-ink hover:bg-elevated"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Filter Chips: In Progress | Live | Upcoming | Not Attempted */}
      <div className="flex items-center gap-1.5 rounded-xl bg-surface p-1 border border-edge-soft text-xs">
        {(["In Progress", "Live", "Upcoming", "Not Attempted"] as const).map((status) => (
          <button
            key={status}
            type="button"
            onClick={() => setTestsFilter(status)}
            className={`px-3 py-1 rounded-lg text-[11px] font-bold transition ${
              testsFilter === status
                ? "bg-elevated text-ink shadow-xs border border-edge"
                : "text-ink-muted hover:text-ink"
            }`}
          >
            {status}
          </button>
        ))}
      </div>
    </div>

    {/* Tests Cards List */}
    <div className="flex flex-col gap-3">
      {COREBTR_OFFICIAL_TESTS.filter((test) => testsSubTab === test.type).map((test) => (
        <div
          key={test.id}
          className="p-5 rounded-2xl bg-surface border border-edge-soft hover:border-edge hover:bg-elevated transition shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4 select-none group"
        >
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm font-bold text-ink group-hover:text-ink-muted transition">
                {test.title}
              </span>
              {test.ended && (
                <span className="text-[10px] font-bold px-2 py-0.2 rounded-md bg-elevated text-ink-muted border border-edge-soft">
                  Ended
                </span>
              )}
              {test.competitive && (
                <span className="text-[10px] font-bold px-2 py-0.2 rounded-md bg-white/10 text-white/90 border border-edge">
                  Competitive
                </span>
              )}
            </div>

            <div className="flex items-center gap-4 text-xs text-ink-muted">
              <span className="flex items-center gap-1">
                <HelpCircle size={13} className="text-ink-muted" />
                <span>{test.totalQuestions} questions</span>
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Timer size={13} className="text-amber-400" />
                <span>{test.durationMins} mins</span>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5 w-full md:w-auto">
            {test.solutionFile && (
              <button
                type="button"
                onClick={() => {
                  const fullPath = `/Users/anupam/Downloads/BTR/${test.solutionFile}`;
                  const url = resolveBTRPlayableUrl(fullPath);
                  window.open(url, "_blank");
                }}
                className="flex-1 md:flex-none px-4 py-2 rounded-xl bg-white/10 border border-edge hover:bg-white/15 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-xs"
                title="View Dr. Zainab Vora's annotated explanations and key takeaways"
              >
                <FileText size={13} className="text-ink-muted" />
                <span>Solutions PDF</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setShowCrossAppModal(true)}
              className="flex-1 md:flex-none px-4 py-2 rounded-xl bg-surface border border-edge-soft hover:bg-raised text-ink text-xs font-bold transition flex items-center justify-center gap-1.5"
            >
              <Target size={13} className="text-ink-muted" />
              <span>Calibrate Score</span>
            </button>

            <button
              type="button"
              onClick={async () => {
                const qs = await getQuestionsForTest(test.id);
                if (qs.length > 0) {
                  onStartQBankDrill?.(test.title, qs);
                } else {
                  onStartQBankDrill?.(test.title);
                }
              }}
              className="flex-1 md:flex-none px-5 py-2 rounded-xl bg-white hover:bg-white/90 text-black font-semibold text-xs font-bold shadow-md shadow-black/30 transition flex items-center justify-center gap-1.5"
            >
              <Play size={12} fill="currentColor" />
              <span>Attempt Test</span>
            </button>
          </div>
        </div>
      ))}
    </div>

    {/* Interactive Computer-Based Test (CBT) Simulators from /Downloads/BTR */}
    {testsSubTab === "Grand Tests" && (
      <div className="mt-4 flex flex-col gap-3 pt-6 border-t border-edge-soft">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-2 text-xs font-extrabold uppercase text-amber-400 tracking-wider">
              <Zap size={14} />
              <span>Interactive Computer-Based Exam (CBT) Simulators</span>
            </div>
            <h4 className="text-base font-bold text-ink mt-0.5">
              Full NEET-PG & INI-CET Interface Simulations
            </h4>
          </div>
          <span className="text-[11px] font-mono text-ink-muted">
            5 Interactive CBTs Verified in /Downloads/BTR
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-1">
          {[
            {
              id: "cbt-neet",
              title: "NEET-PG All-India Mock Grand Test CBT",
              desc: "Full 200-question timed interactive CBT simulation with question palette, review tags, and instant score analysis.",
              filename: "NEET-PG_Mock_Grand_Test (2).html",
              badge: "200 Questions • 3.5 Hours",
            },
            {
              id: "cbt-btr",
              title: "CoreBTR Grand Tests Multi-Session CBT",
              desc: "Official CoreBTR Grand Test interactive interface with real clinical vignettes and high-yield image spotters.",
              filename: "core_btr_Grand_Tests (1).html",
              badge: "Grand Tests Suite",
            },
            {
              id: "cbt-mini",
              title: "CoreBTR Mini Tests Rapid Fire CBT",
              desc: "Targeted 50-100 question mini tests across 19 subjects for rapid knowledge verification under board exam pressure.",
              filename: "core_btr_Mini_Tests.html",
              badge: "Mini Tests Suite",
            },
            {
              id: "cbt-qbank",
              title: "CoreBTR High-Yield QBank Interactive Simulator",
              desc: "Comprehensive question bank test runner with topic-wise filters and active answer triage.",
              filename: "Core btr Qbank -2.html",
              badge: "QBank Simulator",
            },
          ].map((cbt) => (
            <div
              key={cbt.id}
              className="rounded-2xl border border-edge bg-surface/90 hover:border-white/20 p-4 flex flex-col justify-between gap-3 shadow-md transition group"
            >
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <span className="rounded bg-white/10 px-2 py-0.5 text-[10px] font-bold text-ink-muted border border-edge uppercase">
                    {cbt.badge}
                  </span>
                  <span className="text-[10px] font-mono text-emerald-400 font-bold flex items-center gap-1">
                    ✓ Offline Ready
                  </span>
                </div>
                <h5 className="font-bold text-sm text-ink group-hover:text-ink-muted transition">
                  {cbt.title}
                </h5>
                <p className="text-xs text-ink-muted leading-relaxed line-clamp-2">
                  {cbt.desc}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={async () => {
                    const tests = await getBackendTests();
                    const test = tests.find((t) => cbt.title.toLowerCase().includes(t.title.toLowerCase()) || t.title.toLowerCase().includes(cbt.title.toLowerCase()));
                    if (test) {
                      const qs = await getQuestionsForTest(test.id);
                      if (qs.length > 0) {
                        onStartQBankDrill?.(test.title, qs);
                        return;
                      }
                    }
                    onStartQBankDrill?.(cbt.title);
                  }}
                  className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-white hover:bg-white/90 text-black font-semibold py-2 px-3 text-xs font-bold shadow-md transition"
                >
                  <Play size={12} fill="currentColor" />
                  <span>Start in Argus</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const fullPath = `/Users/anupam/Downloads/BTR/${cbt.filename}`;
                    const url = resolveBTRPlayableUrl(fullPath);
                    window.open(url, "_blank");
                  }}
                  className="flex items-center justify-center gap-1.5 rounded-xl bg-white/10 hover:bg-white/15 border border-edge text-white py-2 px-3 text-xs font-semibold transition"
                  title="Launch original HTML standalone simulation"
                >
                  <ExternalLink size={12} />
                  <span>HTML</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    )}
  </div>
)}

{/* VIEW: LIVE SESSIONS & RECALLS (DR. ZAINAB VORA) */}
{activeDestination === "live" && (
  <div className="flex flex-col gap-6 animate-in fade-in duration-150">
    <div className="flex items-center justify-between border-b border-edge-soft pb-4">
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-xl bg-red-500/15 text-red-400 border border-red-500/25 flex items-center justify-center font-bold">
          <Tv size={17} />
        </div>
        <div>
          <h3 className="text-base font-bold text-ink">Live Discussions & Recalls</h3>
          <span className="text-xs text-ink-muted">Official Dr. Zainab Vora Video Archive</span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-xs font-bold px-3 py-1 rounded-xl bg-white text-black font-semibold">
          Completed Archive
        </span>
      </div>
    </div>

    {/* Sessions List (from screenshot media_1794864389403) */}
    <div className="flex flex-col gap-3">
      {COREBTR_LIVE_SESSIONS.map((session) => (
        <div
          key={session.id}
          className="p-4 rounded-2xl bg-surface border border-edge-soft hover:border-edge hover:bg-elevated transition shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4 group select-none"
        >
          <div className="flex items-start gap-3.5">
            <div className="h-12 w-12 rounded-2xl bg-white/10 text-white/90 border border-edge flex items-center justify-center font-bold shrink-0">
              <Play size={18} fill="currentColor" />
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-semibold text-ink-muted">
                {session.instructor}
              </span>
              <h4 className="text-sm font-bold text-ink group-hover:text-ink-muted transition leading-snug">
                {session.title}
              </h4>
              <span className="text-xs text-ink-muted mt-1">
                📅 {session.date} • {session.time} • {session.topic}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveLiveStreamModal(session)}
              className="px-4 py-2 rounded-xl bg-white hover:bg-white/90 text-black font-semibold text-xs font-bold shadow-md transition flex items-center gap-1.5"
            >
              <Play size={12} fill="currentColor" />
              <span>Watch Discussion</span>
            </button>
            {onStartQBankDrill && (
              <button
                type="button"
                onClick={() => onStartQBankDrill(session.title)}
                className="px-3 py-2 rounded-xl bg-elevated hover:bg-raised text-ink text-xs font-semibold border border-edge-soft transition flex items-center gap-1.5"
                title="Practice MCQs for this recall session"
              >
                <span>MCQs</span>
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  </div>
)}

{/* VIEW: PLAN & CUSTOM MODULE ROADMAP */}
{activeDestination === "plan" && (
  <div className="flex flex-col gap-6 animate-in fade-in duration-150">
    {/* Custom Module Action Banner */}
    <div className="p-6 rounded-3xl bg-gradient-to-r from-elevated via-surface to-elevated border border-edge flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
      <div className="flex flex-col gap-1">
        <span className="text-[10px] font-bold uppercase tracking-wider text-ink-muted">
          High-Yield Algorithm
        </span>
        <h3 className="text-lg font-black text-ink">Custom Module Engine</h3>
        <p className="text-xs text-ink-muted max-w-lg">
          Filter by PYQs, #2VRecommended questions, attempt history, and image spotter tags.
        </p>
      </div>
      <button
        type="button"
        onClick={() => setShowCustomModuleModal(true)}
        className="px-5 py-2.5 rounded-2xl bg-white hover:bg-white/90 text-black font-semibold font-extrabold text-xs shadow-lg shadow-black/30 transition flex items-center gap-2"
      >
        <Plus size={15} />
        <span>+ Create Custom Module</span>
      </button>
    </div>

    {/* 4-Phase Strategy Breakdown */}
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {CORE_BTR_PHASES.map((phase, idx) => (
        <div
          key={phase.id}
          className="rounded-3xl bg-surface/70 border border-edge-soft p-6 flex flex-col justify-between gap-4 backdrop-blur-md relative overflow-hidden"
        >
          <div className="flex flex-col gap-2.5">
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono text-xs font-bold text-accent">
                PHASE {idx + 1}
              </span>
              <span className="text-[11px] font-semibold rounded-full bg-elevated px-3 py-0.5 border border-edge-soft text-ink-muted">
                {phase.badge}
              </span>
            </div>

            <h3 className="text-base font-bold text-ink">{phase.title}</h3>
            <div className="rounded-xl bg-accent/10 border border-accent/20 p-2.5 text-xs text-accent font-semibold">
              Core Focus: {phase.focus}
            </div>
            <p className="text-xs text-ink-muted leading-relaxed">
              {phase.strategySummary}
            </p>
          </div>

          <div className="pt-3 border-t border-edge-soft flex items-center justify-between text-xs">
            <span className="text-ink-muted">Daily MCQ Target:</span>
            <span className="font-bold text-ink">{phase.targetDailyQuestions} questions / day</span>
          </div>
        </div>
      ))}
    </div>
  </div>
)}

  {/* VIEW: SUPER-VOLATILES VAULT (ACTIVE RECALL BLUR MASK) */}
  {activeDestination === "volatiles" && (
        <div className="flex flex-col gap-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl bg-surface/50 border border-edge-soft p-4">
            <div className="flex items-center gap-2">
              <Zap size={18} className="text-accent" />
              <div>
                <h4 className="text-sm font-bold text-ink">Active Recall Blur & Reveal Mode</h4>
                <p className="text-xs text-ink-muted">
                  Test your spontaneous recall before tapping to reveal the master answer.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setShowAnkiModal(true)}
                className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl bg-accent text-white shadow-xs hover:brightness-110 transition"
                title="Export cards to Anki"
              >
                <Download size={13} />
                <span>Export to Anki</span>
              </button>

              <button
                type="button"
                onClick={revealAllCards}
                className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl bg-elevated border border-edge hover:bg-raised transition"
              >
                <Eye size={13} />
                <span>Reveal All</span>
              </button>
              <button
                type="button"
                onClick={hideAllCards}
                className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl bg-elevated border border-edge hover:bg-raised transition"
              >
                <EyeOff size={13} />
                <span>Hide All (Drill)</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredVolatiles.map((card) => {
              const isRevealed = !!revealedCards[card.id];
              const isCopied = copiedCardId === card.id;

              return (
                <div
                  key={card.id}
                  className="rounded-2xl bg-surface/80 border border-edge-soft p-5 flex flex-col justify-between gap-4 backdrop-blur-sm hover:border-accent/30 transition shadow-xs"
                >
                  <div className="flex flex-col gap-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-[10.5px] font-bold rounded-lg bg-accent/15 text-accent px-2 py-0.5 border border-accent/25">
                          {card.subjectName}
                        </span>
                        <span className="text-[10px] font-mono text-ink-muted">
                          {card.category}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        {Array.from({ length: card.highYieldScore }).map((_, i) => (
                          <Flame key={i} size={11} className="fill-accent text-accent" />
                        ))}
                      </div>
                    </div>

                    <h4 className="text-sm font-bold text-ink leading-snug">{card.title}</h4>

                    {/* Question / Key Prompt */}
                    <div className="rounded-xl bg-canvas/70 border border-edge-soft p-3 text-xs text-ink leading-relaxed font-medium">
                      <span className="text-[10px] uppercase font-bold text-accent block mb-1">
                        Active Recall Prompt:
                      </span>
                      {card.keyPrompt}
                    </div>

                    {/* Masked Master Answer with Interactive Blur */}
                    <div
                      onClick={() => toggleRevealCard(card.id)}
                      className={`relative cursor-pointer rounded-xl p-3.5 border transition select-none ${
                        isRevealed
                          ? "bg-elevated/70 border-accent/40"
                          : "bg-elevated/40 border-edge-soft hover:bg-elevated/60"
                      }`}
                    >
                      <div className="flex items-center justify-between text-[10px] uppercase font-bold text-ink-muted mb-1">
                        <span>Master Answer & Mechanism:</span>
                        <span className="text-accent flex items-center gap-1">
                          {isRevealed ? <EyeOff size={11} /> : <Eye size={11} />}
                          {isRevealed ? "Tap to mask" : "Tap to reveal"}
                        </span>
                      </div>

                      <p
                        className={`text-xs text-ink leading-relaxed transition-all duration-200 ${
                          isRevealed ? "filter-none" : "blur-sm select-none opacity-40"
                        }`}
                      >
                        {card.maskedAnswer}
                      </p>

                      {!isRevealed && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="rounded-lg bg-surface/90 border border-edge px-3 py-1 text-xs font-semibold text-accent shadow-sm backdrop-blur-md">
                            Click to Reveal Answer
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Quick FSRS Spaced Repetition Rating Buttons */}
                    {isRevealed && (
                      <div className="flex items-center justify-between gap-1.5 p-2 rounded-xl bg-canvas/60 border border-edge-soft animate-in fade-in duration-150">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-ink-muted">Rate Recall:</span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              reviewFSRSCard(card.id, 1);
                            }}
                            className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-white/5 text-white/70 border border-white/10 hover:bg-white/10 hover:text-white transition"
                            title="Forgot completely"
                          >
                            Again
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              reviewFSRSCard(card.id, 2);
                            }}
                            className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-white/10 text-white/90 border border-white/15 hover:bg-white/15 transition"
                            title="Recalled with effort"
                          >
                            Hard
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              reviewFSRSCard(card.id, 3);
                            }}
                            className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-white text-black font-semibold border border-edge hover:bg-white/90 transition"
                            title="Optimal recall"
                          >
                            Good
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              reviewFSRSCard(card.id, 4);
                            }}
                            className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-white/10 text-white/90 border border-white/15 hover:bg-white/15 transition"
                            title="Effortless recall"
                          >
                            Easy
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Examiner Trap Callout */}
                    <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 p-2.5 text-[11.5px] text-amber-300 leading-snug flex items-start gap-2">
                      <AlertTriangle size={14} className="shrink-0 text-amber-400 mt-0.5" />
                      <div>
                        <strong className="text-amber-400 font-bold block text-[10px] uppercase">
                          Examiner Trap:
                        </strong>
                        {card.examinerTrap}
                      </div>
                    </div>

                    {/* Mnemonic Pill if present */}
                    {card.mnemonic && (
                      <div className="text-[11px] text-ink-muted bg-canvas/40 border border-edge-soft px-2.5 py-1.5 rounded-lg flex items-center gap-1.5">
                        <Sparkles size={12} className="text-accent shrink-0" />
                        <span>
                          <strong className="text-ink">Mnemonic:</strong> {card.mnemonic}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="pt-3 border-t border-edge-soft flex items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-1">
                      {card.tags.map((tag) => (
                        <span
                          key={tag}
                          className="text-[10px] text-ink-muted bg-elevated px-2 py-0.5 rounded-md"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>

                    <button
                      type="button"
                      onClick={() => handleCopyCard(card)}
                      className="flex items-center gap-1 text-[11px] font-semibold text-ink-muted hover:text-ink px-2.5 py-1 rounded-lg bg-elevated border border-edge-soft transition"
                    >
                      {isCopied ? <Check size={12} className="text-accent" /> : <Copy size={12} />}
                      <span>{isCopied ? "Copied" : "Copy"}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* VIEW 4: GRAND TEST (GT) ANALYTICS & STRIKE-RATE CALIBRATOR */}
      {activeView === "gt_analytics" && (
        <div className="flex flex-col gap-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold text-ink">Grand Test (GT) Performance Log</h3>
              <p className="text-xs text-ink-muted">
                Track your percentile curve, strike rate (&gt;80% accuracy target), and eliminate silly mistakes.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowErrorModal(true)}
                className="flex items-center gap-1.5 rounded-xl bg-amber-500/15 border border-amber-500/30 px-3.5 py-2 text-xs font-bold text-amber-400 hover:bg-amber-500/25 transition"
              >
                <AlertTriangle size={14} />
                <span>GT Mistake Vault & Blitz</span>
              </button>

              <button
                type="button"
                onClick={() => setShowAddGtModal(true)}
                className="flex items-center gap-2 rounded-xl bg-accent px-4 py-2 text-xs font-bold text-white shadow-sm hover:brightness-110 transition"
              >
                <Plus size={14} />
                <span>Log New Grand Test</span>
              </button>
            </div>
          </div>

          {/* Latest Post-GT Autopsy & Remediation Curriculum */}
          {(() => {
            const autopsy = getLatestAutopsyReport();
            if (!autopsy) return null;
            return (
              <div className="rounded-2xl border border-edge bg-surface/90 p-5 flex flex-col gap-3 shadow-md">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Zap size={16} className="text-amber-400" />
                    <h4 className="font-bold text-sm text-ink">
                      Active Remediation Curriculum: {autopsy.testTitle}
                    </h4>
                  </div>
                  <span className="text-xs font-mono text-ink-muted">
                    {autopsy.accuracyPct}% Accuracy · {autopsy.sillyMistakesCount} Silly Errors
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  {autopsy.recommendations.map((rec, i) => (
                    <div key={i} className="p-3 rounded-xl bg-surface-elevated border border-edge space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-ink">{rec.subject}: {rec.topic}</span>
                        <span className="text-[10px] text-accent font-semibold">{rec.errorCount} mistakes</span>
                      </div>
                      <p className="text-[11px] text-ink-muted">{rec.suggestedAction}</p>
                      <div className="flex items-center gap-2 text-[10px] font-mono text-ink-subtle">
                        <span>📹 {rec.relevantVideoLecture}</span>
                        <span>📄 {rec.relevantWorkbookPdf}</span>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex flex-wrap items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    disabled={isGeneratingDrill}
                    onClick={() => {
                      const primaryWeakness = autopsy.recommendations[0]?.subject;
                      handleLaunchMicroSurgicalDrill(primaryWeakness);
                    }}
                    className="px-4 py-2 rounded-xl bg-accent hover:brightness-110 text-white font-semibold text-xs transition flex items-center gap-1.5 shadow-sm"
                  >
                    <Zap size={12} fill="currentColor" />
                    <span>{isGeneratingDrill ? "Synthesizing..." : "Launch Micro-Surgical Drill (15 Qs)"}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const allQs = autopsy.recommendations.flatMap((r) => r.remediationQuestions);
                      if (allQs.length > 0) {
                        onStartQBankDrill?.(`${autopsy.testTitle} Weak-Spot Remediation`, allQs);
                      }
                    }}
                    className="px-4 py-2 rounded-xl bg-white hover:bg-white/90 text-black font-semibold text-xs transition flex items-center gap-1.5 shadow-sm"
                  >
                    <Play size={12} fill="currentColor" />
                    <span>Launch 10-Question Weak-Spot Drill</span>
                  </button>
                </div>
              </div>
            );
          })()}

          {/* GT History Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {gtRecords.map((gt) => {
              const accuracy = Math.round((gt.correctCount / gt.totalQuestions) * 100);

              return (
                <div
                  key={gt.id}
                  className="rounded-2xl bg-surface/70 border border-edge-soft p-5 flex flex-col justify-between gap-4 shadow-xs"
                >
                  <div className="flex flex-col gap-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-[10.5px] font-mono text-ink-muted">{gt.date}</span>
                        <h4 className="text-sm font-bold text-ink leading-snug">{gt.title}</h4>
                      </div>
                      <div className="flex flex-col items-end">
                        <span className="text-lg font-black text-accent">{gt.percentile}%ile</span>
                        <span className="text-[10px] text-ink-muted">Score: {gt.marksScored}/800</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 rounded-xl bg-canvas/60 p-2.5 border border-edge-soft text-center">
                      <div>
                        <span className="text-[10px] font-bold text-emerald-400 block">Correct</span>
                        <span className="text-sm font-bold text-ink">{gt.correctCount}</span>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-danger block">Incorrect</span>
                        <span className="text-sm font-bold text-ink">{gt.incorrectCount}</span>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-ink-muted block">Skipped</span>
                        <span className="text-sm font-bold text-ink">{gt.unattemptedCount}</span>
                      </div>
                    </div>

                    {/* Silly Mistakes vs Knowledge Gap Triage */}
                    <div className="flex items-center justify-between text-xs px-2 py-1.5 rounded-lg bg-elevated">
                      <span className="text-amber-400 font-semibold">
                        Silly Mistakes: <strong>{gt.sillyMistakes}</strong>
                      </span>
                      <span className="text-blue-400 font-semibold">
                        Knowledge Gaps: <strong>{gt.knowledgeGaps}</strong>
                      </span>
                    </div>

                    {gt.notes && (
                      <p className="text-xs text-ink-muted italic border-l-2 border-accent/40 pl-2">
                        &quot;{gt.notes}&quot;
                      </p>
                    )}
                  </div>

                  <div className="pt-3 border-t border-edge-soft flex items-center justify-between text-xs">
                    <span className="text-[11px] text-ink-muted">
                      Strike Rate: <strong className="text-ink">{accuracy}%</strong>
                    </span>
                    <button
                      type="button"
                      onClick={() => handleDeleteGtRecord(gt.id)}
                      className="text-ink-muted hover:text-danger p-1 rounded-md transition"
                      title="Delete record"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Add GT Modal */}
          {showAddGtModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
              <div className="w-full max-w-md rounded-3xl bg-surface border border-edge p-6 shadow-2xl flex flex-col gap-4 text-ink animate-in zoom-in-95 duration-150">
                <div className="flex items-center justify-between border-b border-edge-soft pb-3">
                  <h3 className="text-base font-bold text-ink">Log Grand Test (GT) Result</h3>
                  <button
                    type="button"
                    onClick={() => setShowAddGtModal(false)}
                    className="text-ink-muted hover:text-ink text-sm"
                  >
                    ✕
                  </button>
                </div>

                <form onSubmit={handleCreateGtRecord} className="flex flex-col gap-3.5 text-xs">
                  <div>
                    <label className="font-bold text-ink-muted block mb-1">Test Title</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Core BTR Full Grand Test 04"
                      value={newGtTitle}
                      onChange={(e) => setNewGtTitle(e.target.value)}
                      className="w-full rounded-xl bg-canvas border border-edge px-3 py-2 text-ink focus:outline-none focus:border-accent"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="font-bold text-ink-muted block mb-1">Test Date</label>
                      <input
                        type="date"
                        required
                        value={newGtDate}
                        onChange={(e) => setNewGtDate(e.target.value)}
                        className="w-full rounded-xl bg-canvas border border-edge px-3 py-2 text-ink focus:outline-none focus:border-accent"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-ink-muted block mb-1">Percentile (%ile)</label>
                      <input
                        type="number"
                        step="0.1"
                        required
                        value={newGtPercentile}
                        onChange={(e) => setNewGtPercentile(Number(e.target.value))}
                        className="w-full rounded-xl bg-canvas border border-edge px-3 py-2 text-ink focus:outline-none focus:border-accent"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="font-bold text-ink-muted block mb-1">Correct</label>
                      <input
                        type="number"
                        required
                        value={newGtCorrect}
                        onChange={(e) => setNewGtCorrect(Number(e.target.value))}
                        className="w-full rounded-xl bg-canvas border border-edge px-2.5 py-1.5 text-ink focus:outline-none focus:border-accent"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-ink-muted block mb-1">Incorrect</label>
                      <input
                        type="number"
                        required
                        value={newGtIncorrect}
                        onChange={(e) => setNewGtIncorrect(Number(e.target.value))}
                        className="w-full rounded-xl bg-canvas border border-edge px-2.5 py-1.5 text-ink focus:outline-none focus:border-accent"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-ink-muted block mb-1">Skipped</label>
                      <input
                        type="number"
                        required
                        value={newGtUnattempted}
                        onChange={(e) => setNewGtUnattempted(Number(e.target.value))}
                        className="w-full rounded-xl bg-canvas border border-edge px-2.5 py-1.5 text-ink focus:outline-none focus:border-accent"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="font-bold text-amber-400 block mb-1">Silly Mistakes</label>
                      <input
                        type="number"
                        value={newGtSillyMistakes}
                        onChange={(e) => setNewGtSillyMistakes(Number(e.target.value))}
                        className="w-full rounded-xl bg-canvas border border-edge px-2.5 py-1.5 text-ink focus:outline-none focus:border-accent"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-blue-400 block mb-1">Knowledge Gaps</label>
                      <input
                        type="number"
                        value={newGtKnowledgeGaps}
                        onChange={(e) => setNewGtKnowledgeGaps(Number(e.target.value))}
                        className="w-full rounded-xl bg-canvas border border-edge px-2.5 py-1.5 text-ink focus:outline-none focus:border-accent"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="font-bold text-ink-muted block mb-1">Takeaway Notes</label>
                    <textarea
                      rows={2}
                      placeholder="e.g. Need to revise Micro culture media and Obgyn CTG"
                      value={newGtNotes}
                      onChange={(e) => setNewGtNotes(e.target.value)}
                      className="w-full rounded-xl bg-canvas border border-edge px-3 py-2 text-ink focus:outline-none focus:border-accent"
                    />
                  </div>

                  <div className="pt-2 flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setShowAddGtModal(false)}
                      className="px-3 py-1.5 rounded-xl border border-edge text-ink-muted hover:text-ink"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1.5 rounded-xl bg-accent font-bold text-white shadow-sm hover:brightness-110"
                    >
                      Save GT Record
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* VIEW 5: 4-PHASE BTR STRATEGY GUIDE */}
      {activeView === "strategy" && (
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {CORE_BTR_PHASES.map((phase, idx) => (
              <div
                key={phase.id}
                className="rounded-3xl bg-surface/70 border border-edge-soft p-6 flex flex-col justify-between gap-4 backdrop-blur-md relative overflow-hidden"
              >
                <div className="flex flex-col gap-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-xs font-bold text-accent">
                      PHASE {idx + 1}
                    </span>
                    <span className="text-[11px] font-semibold rounded-full bg-elevated px-3 py-0.5 border border-edge-soft text-ink-muted">
                      {phase.badge}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-ink">{phase.title}</h3>
                  <div className="rounded-xl bg-accent/10 border border-accent/20 p-2.5 text-xs text-accent font-semibold">
                    Core Focus: {phase.focus}
                  </div>
                  <p className="text-xs text-ink-muted leading-relaxed">
                    {phase.strategySummary}
                  </p>
                </div>

                <div className="pt-3 border-t border-edge-soft flex items-center justify-between text-xs">
                  <span className="text-ink-muted">Daily MCQ Target:</span>
                  <span className="font-bold text-ink">{phase.targetDailyQuestions} questions / day</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

        </main>

        {/* Persistent Bottom Mini-Player Dock */}
        {workstationSession && activeDestination !== "workstation" && (
          <BTRMiniPlayerDock
            session={workstationSession}
            isPlaying={true}
            onExpandWorkstation={() => setActiveDestination("workstation")}
            onCloseSession={() => setWorkstationSession(null)}
          />
        )}
      </div>

      {/* Advanced BTR Modals: Anki Exporter, and GT Error Vault */}
      <BTRAnkiExportModal open={showAnkiModal} onClose={() => setShowAnkiModal(false)} />
      <BTRErrorLogModal open={showErrorModal} onClose={() => setShowErrorModal(false)} />

      {/* Official YouTube Channel Broadcasts & 3 PM Core Drops */}
      <BTRBroadcastsModal open={showBroadcastsModal} onClose={() => setShowBroadcastsModal(false)} />

      {/* "20th Subject" Master Matrix (Biostats, DOCs, BMW 2016, Scores) */}
      <BTRTwentyMatrixModal open={showTwentyModal} onClose={() => setShowTwentyModal(false)} />

      {/* Visual Diagnostic Spotter & Image Bank Trainer */}
      <BTRSpotterModal open={showSpotterModal} onClose={() => setShowSpotterModal(false)} />

      {/* Mega BTR 72-Hour Rapid Revision Command Center */}
      <BTRMarathonModal
        open={showMarathonModal}
        onClose={() => setShowMarathonModal(false)}
        onPlayModule={(mod) => {
          setShowMarathonModal(false);
          const matched = libraryState.megaBtrVideos?.find((v) =>
            v.filename.toLowerCase().includes(mod.targetFileName.toLowerCase().replace(".mp4", ""))
          );
          if (matched) {
            const dummySubject: BTRSubject = {
              id: "mega_btr",
              name: "Mega BTR Marathon",
              shortCode: "MEGA",
              category: "Long Clinical",
              blockNumber: 4,
              recommendedDays: 3,
              highYieldPytCount: 100,
              iconName: "Zap",
              description: "Rapid 19-Subject Marathon Sweep",
              mustKnowTopics: mod.highYieldFoci,
              pyramidTiers: {
                tier1MustKnow: mod.highYieldFoci,
                tier2Volatile: mod.subjectsCovered,
                tier3TieBreakers: [],
              },
            };
            const mediaFile: BTRLocalMediaFile = {
              id: matched.id,
              filename: matched.filename,
              fullPath: matched.fullPath,
              relativePath: matched.filename,
              kind: "video",
              matchedSubjectId: "mega_btr",
              lectureNumber: 1,
              title: mod.title,
              sizeBytes: matched.sizeBytes,
            };
            setWorkstationSession({
              video: mediaFile,
              subject: dummySubject,
            });
          }
        }}
      />

      {/* Interactive T&D Exam Simulator */}
      <BTRTnDModal
        open={showTnDModal}
        onClose={() => setShowTnDModal(false)}
        onLaunchVideo={(videoName) => {
          setShowTnDModal(false);
          const matched = libraryState.tndVideos?.find((v) =>
            v.filename.toLowerCase().includes(videoName.toLowerCase().replace(".mp4", ""))
          );
          if (matched) {
            const dummySubject: BTRSubject = {
              id: "tnd_review",
              name: "Test & Discussion",
              shortCode: "TND",
              category: "Long Clinical",
              blockNumber: 4,
              recommendedDays: 1,
              highYieldPytCount: 50,
              iconName: "Target",
              description: "T&D Video Discussion",
              mustKnowTopics: ["PYQs", "Examiner Traps", "Clinical Vignettes"],
              pyramidTiers: {
                tier1MustKnow: ["T&D 1-25"],
                tier2Volatile: [],
                tier3TieBreakers: [],
              },
            };
            const mediaFile: BTRLocalMediaFile = {
              id: matched.id,
              filename: matched.filename,
              fullPath: matched.fullPath,
              relativePath: matched.filename,
              kind: "video",
              matchedSubjectId: "tnd_review",
              lectureNumber: 1,
              title: matched.title,
              sizeBytes: matched.sizeBytes,
            };
            setWorkstationSession({
              video: mediaFile,
              subject: dummySubject,
            });
          }
        }}
      />

      {/* 3-Tier Subject Pyramid Visualizer */}
      <BTRPyramidsModal open={showPyramidsModal} onClose={() => setShowPyramidsModal(false)} />

      {/* Daily Volatile Drip (FSRS) */}
      <BTRDailyDripModal open={showDripModal} onClose={() => setShowDripModal(false)} />

      {/* Cross-PDF Search Engine */}
      <BTRPdfSearchModal
        open={showPdfSearchModal}
        onClose={() => setShowPdfSearchModal(false)}
        onJumpToPdfPage={(pdfFileName, pageNumber) => {
          setShowPdfSearchModal(false);
          // Look for matching PDF in library mappings or master PDFs
          let matchedPdf: BTRLocalMediaFile | undefined;
          for (const m of Object.values(libraryState.mappings)) {
            if (m.unannotatedPdf?.filename.toLowerCase() === pdfFileName.toLowerCase()) {
              matchedPdf = m.unannotatedPdf;
              break;
            }
            if (m.annotatedPdf?.filename.toLowerCase() === pdfFileName.toLowerCase()) {
              matchedPdf = m.annotatedPdf;
              break;
            }
          }
          if (!matchedPdf && libraryState.masterPdfs) {
            const master = libraryState.masterPdfs.find(
              (p) => p.filename.toLowerCase() === pdfFileName.toLowerCase()
            );
            if (master) {
              matchedPdf = {
                id: master.id,
                filename: master.filename,
                fullPath: master.fullPath,
                relativePath: master.filename,
                kind: "pdf_unannotated",
                matchedSubjectId: "master_pdf",
                lectureNumber: 1,
                title: master.title,
                sizeBytes: master.sizeBytes,
              };
            }
          }
          if (matchedPdf) {
            const url = resolveBTRPlayableUrl(matchedPdf.fullPath);
            window.open(`${url}#page=${pageNumber}`, "_blank");
          }
        }}
      />

      {/* Two-Step Clinical Case Drill */}
      <BTRVignetteModal open={showVignetteModal} onClose={() => setShowVignetteModal(false)} />

      {/* Universal Cross-App Medical Test Center (Marrow, Prep, DAMS, Cerebellum) */}
      <BTRCrossAppTestsModal open={showCrossAppModal} onClose={() => setShowCrossAppModal(false)} />

      {/* Cross-Platform Next GT Tracker (Marrow, Cerebellum, Prep, CoreBTR, DAMS) */}
      <BTRGTTrackerModal
        open={showGTTrackerModal}
        onClose={() => setShowGTTrackerModal(false)}
        onOpenScoreLogger={(_prefill) => {
          setShowCrossAppModal(true);
        }}
      />

      {/* Create Custom Module Modal */}
      <BTRCustomModuleModal
        isOpen={showCustomModuleModal}
        onClose={() => setShowCustomModuleModal(false)}
        onStartModule={async (config) => {
          setShowCustomModuleModal(false);
          const qs = await buildCustomModuleTest({
            title: config.name,
            subjects: config.selectedSubjects || (selectedSubjectDetail?.name ? [selectedSubjectDetail.name] : []),
            status: config.bookmarksOnly ? "bookmarked" : config.attemptStatus.incorrect ? "incorrect" : "all",
            count: config.questionCount,
            mode: "exam",
          });
          if (qs.length > 0) {
            onStartQBankDrill?.(config.name, qs);
          } else {
            onStartQBankDrill?.(config.name);
          }
        }}
        subjectName={selectedSubjectDetail?.name}
      />

      {/* High-Yield Pearl Study Modal (Single Pearl or Full Deck Study Mode) */}
      <BTRPearlModal
        pearl={selectedPearlModal}
        pearls={activePearlsDeck || undefined}
        onClose={() => {
          setSelectedPearlModal(null);
          setActivePearlsDeck(null);
        }}
      />

      {/* Goal Selector Modal */}
      <BTRGoalSelectorModal
        open={showGoalModal}
        onClose={() => setShowGoalModal(false)}
        selectedGoalId={currentGoal.id}
        onSelectGoal={(goal) => setCurrentGoal(goal)}
      />

      {/* Tech Issue & Diagnostics Doctor Modal */}
      <BTRTechIssueModal
        open={showTechIssueModal}
        onClose={() => setShowTechIssueModal(false)}
        libraryState={libraryState}
        onRescanFolder={handleOpenFolderPicker}
      />

      {/* Bookmarked Questions & Pearls Modal */}
      <BTRBookmarksModal
        open={showBookmarksModal}
        onClose={() => setShowBookmarksModal(false)}
        onStartQBankDrill={onStartQBankDrill}
        onSelectPearl={(pearl) => {
          setSelectedPearlModal(pearl);
          setActivePearlsDeck(null);
        }}
      />

      {/* CoreBTR Live Discussion Player Modal */}
      <BTRLiveStreamModal
        open={!!activeLiveStreamModal}
        onClose={() => setActiveLiveStreamModal(null)}
        session={activeLiveStreamModal}
        onStartQBankDrill={onStartQBankDrill}
      />

      {/* Top-100 Frontier Tie-Breakers Vault Modal */}
      <BTRFrontierVaultModal
        isOpen={showFrontierVaultModal}
        onClose={() => setShowFrontierVaultModal(false)}
        onStartDrill={(qs) => {
          setShowFrontierVaultModal(false);
          onStartQBankDrill?.("Top-100 Frontier Tie-Breaker Drill", qs);
        }}
      />

      {/* Hands-Free Rapid-Fire Audio Pod Modal */}
      <BTRAudioPodModal
        isOpen={showAudioPodModal}
        onClose={() => setShowAudioPodModal(false)}
        questions={audioPodQuestions}
        onReviewCard={(qid, rating) => {
          const score = rating === "again" ? 1 : rating === "hard" ? 2 : rating === "good" ? 3 : 4;
          reviewFSRSCard(qid, score);
        }}
      />
    </div>
  );
}
