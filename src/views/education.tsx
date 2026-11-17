import { useState, useMemo, useCallback, useRef, type ChangeEvent } from "react";
import { createPortal } from "react-dom";
import {
  GraduationCap,
  FolderPlus,
  Rss,
  FileText,
  Play,
  BookOpen,
  Share2,
  Check,
  Search,
  ExternalLink,
  Trash2,
  Copy,
  Sparkles,
  Upload,
  AlertCircle,
  Zap,
  Database,
  Layers,
  Activity,
  Flame,
  Stethoscope,
  Target,
  BrainCircuit,
  SlidersHorizontal,
  CheckCircle2,
  Clock,
  Eye,
  EyeOff,
  GitBranch,
  Award,
  ChevronRight,
  ChevronLeft,
} from "lucide-react";
import { useT } from "@/lib/i18n";
import { useView } from "@/lib/view";
import { useSettings } from "@/lib/settings";
import { useLocalLibrary, type LocalEntry } from "@/lib/local-library";
import { localPlayerSrc } from "@/lib/local-library/player-src";
import { CURATED_COURSES } from "@/lib/education/catalogs";
import type { CourseCategory, CuratedCourse, StudyNote } from "@/lib/education/types";
import {
  useStudyNotes,
  deleteStudyNote,
  exportNotesAsMarkdown,
  exportNotesAsJson,
  getDueStudyNotes,
} from "@/lib/education/notes";
import { importEducationalFile } from "@/lib/education/json-gz-importer";
import { registerCourseShare } from "@/lib/local-library/course-share";
import { generateAnkiDeckPackage } from "@/lib/education/anki-exporter";
import { InicetWarRoomBanner } from "./education/inicet-war-room-banner";
import { CoreBTRWarRoom } from "./education/corebtr-war-room";
import { DailyWateringDeck } from "./education/daily-watering-deck";
import { QBankRunner } from "./education/qbank-drill";
import { QBankManager } from "./education/qbank-manager";
import { PatientCaseSimulator } from "./education/patient-case-simulator";
import { getAllQuestions, getInicetHighYieldQuestions } from "@/lib/education/qbank-store";
import { CLINICAL_QBANK_STARTER } from "@/lib/education/qbank-data";
import type { ClinicalQuestion } from "@/lib/education/qbank-types";
import {
  getBackendTests,
  getQuestionsForTest,
  getQuestionsForSubject,
  saveExamResult,
} from "@/lib/education/btr-backend-service";
import {
  CURATED_COURSE_CHECKPOINTS,
  type LectureCheckpoint,
} from "@/lib/education/interactive-checkpoints";
import {
  FOUNDATIONAL_CONCEPT_GRAPH,
  loadAllConceptStats,
  recordConceptAttempt,
} from "@/lib/education/prerequisite-graph";
import { InteractiveCheckpointOverlay } from "./player/interactive-checkpoint-overlay";
import { Row } from "@/components/row";
import { USER_LOCAL_BTR_MANIFEST } from "@/lib/education/btr-library-manifest";
import { resolveBTRPlayableUrl } from "@/lib/education/btr-local-library";
import "./education/education-hub.css";

const BTR_19_SUBJECTS_CATALOG = [
  { id: "anatomy", name: "Anatomy", yieldTopic: "Brachial Plexus, Cranial Nerves & Embryology", duration: "18h 30m", lessons: 4, thumbnail: "https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?w=800&auto=format&fit=crop&q=80" },
  { id: "physiology", name: "Physiology", yieldTopic: "Cardiac Output, Frank-Starling & Action Potentials", duration: "14h 15m", lessons: 3, thumbnail: "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=800&auto=format&fit=crop&q=80" },
  { id: "biochemistry", name: "Biochemistry", yieldTopic: "Inborn Errors, Enzyme Kinetics & Vitamins", duration: "12h 45m", lessons: 3, thumbnail: "https://images.unsplash.com/photo-1507668077129-56e32842fceb?w=800&auto=format&fit=crop&q=80" },
  { id: "pathology", name: "Pathology", yieldTopic: "Hematopathology, Neoplasia & Amyloidosis", duration: "22h 00m", lessons: 5, thumbnail: "https://images.unsplash.com/photo-1579154204601-01588f351e67?w=800&auto=format&fit=crop&q=80" },
  { id: "pharmacology", name: "Pharmacology", yieldTopic: "Autonomic Nervous System & Antimicrobials", duration: "19h 20m", lessons: 4, thumbnail: "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=800&auto=format&fit=crop&q=80" },
  { id: "microbiology", name: "Microbiology", yieldTopic: "Bacteriology Culture Media & Virology PCR", duration: "15h 10m", lessons: 3, thumbnail: "https://images.unsplash.com/photo-1583912267670-6575ad4736f8?w=800&auto=format&fit=crop&q=80" },
  { id: "forensic", name: "Forensic Medicine", yieldTopic: "Toxicology Antidotes & Thanatology Rules", duration: "8h 40m", lessons: 2, thumbnail: "https://images.unsplash.com/photo-1516549655169-df83a0774514?w=800&auto=format&fit=crop&q=80" },
  { id: "psm", name: "Community Medicine (PSM)", yieldTopic: "Biostatistics 2x2, Vaccines & National Health", duration: "16h 00m", lessons: 4, thumbnail: "https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=800&auto=format&fit=crop&q=80" },
  { id: "medicine", name: "General Medicine", yieldTopic: "Cardiology ECGs, Neurology & Rheumatology", duration: "32h 40m", lessons: 7, thumbnail: "https://images.unsplash.com/photo-1582719508461-905c673771fd?w=800&auto=format&fit=crop&q=80" },
  { id: "surgery", name: "General Surgery", yieldTopic: "Trauma ATLS, Breast & Thyroid Carcinomas", duration: "24h 10m", lessons: 5, thumbnail: "https://images.unsplash.com/photo-1551076805-e1869033e561?w=800&auto=format&fit=crop&q=80" },
  { id: "obgyn", name: "Obstetrics & Gynecology", yieldTopic: "CTG Interpretations, High-Risk Labor & Cervix", duration: "21h 30m", lessons: 5, thumbnail: "https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?w=800&auto=format&fit=crop&q=80" },
  { id: "pediatrics", name: "Pediatrics", yieldTopic: "Developmental Milestones & Neonatal Resuscitation", duration: "13h 50m", lessons: 3, thumbnail: "https://images.unsplash.com/photo-1502086223501-7ea6ecd79368?w=800&auto=format&fit=crop&q=80" },
  { id: "orthopedics", name: "Orthopedics", yieldTopic: "Eponymous Fractures & Pediatric Limp", duration: "9h 20m", lessons: 2, thumbnail: "https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?w=800&auto=format&fit=crop&q=80" },
  { id: "dermatology", name: "Dermatology", yieldTopic: "Blistering Disorders & Leprosy Classification", duration: "7h 30m", lessons: 2, thumbnail: "https://images.unsplash.com/photo-1616394584738-fc6e612e71b9?w=800&auto=format&fit=crop&q=80" },
  { id: "psychiatry", name: "Psychiatry", yieldTopic: "Psychopharmacology & Schizophrenia Criteria", duration: "6h 45m", lessons: 2, thumbnail: "https://images.unsplash.com/photo-1527137342181-19aab11a8ee8?w=800&auto=format&fit=crop&q=80" },
  { id: "radiology", name: "Radiology", yieldTopic: "Chest X-Ray Signs & Contrast CT Imaging", duration: "11h 15m", lessons: 3, thumbnail: "https://images.unsplash.com/photo-1516549655169-df83a0774514?w=800&auto=format&fit=crop&q=80" },
  { id: "ent", name: "ENT", yieldTopic: "Audiometry Tuning Fork Tests & Stridor", duration: "8h 10m", lessons: 2, thumbnail: "https://images.unsplash.com/photo-1579684385127-1ef15d508118?w=800&auto=format&fit=crop&q=80" },
  { id: "ophthalmology", name: "Ophthalmology", yieldTopic: "Diabetic Retinopathy & Glaucoma Fields", duration: "9h 00m", lessons: 2, thumbnail: "https://images.unsplash.com/photo-1584017911766-d451b3d0e843?w=800&auto=format&fit=crop&q=80" },
  { id: "anesthesia", name: "Anesthesia", yieldTopic: "Difficult Airway Algorithm & Local Anesthetics", duration: "7h 50m", lessons: 2, thumbnail: "https://images.unsplash.com/photo-1579684385127-1ef15d508118?w=800&auto=format&fit=crop&q=80" },
];

export function EducationView() {
  const t = useT();
  const { openPlayer, openSettings } = useView();
  const { settings, update } = useSettings();
  const localEntries = useLocalLibrary();
  const notes = useStudyNotes();

  const [tab, setTab] = useState<"courses" | "btr" | "checkpoints" | "qbank" | "simulator" | "notes">("btr");
  const [activeDrillCheckpoint, setActiveDrillCheckpoint] = useState<LectureCheckpoint | null>(null);
  const [activeCategory, setActiveCategory] = useState<CourseCategory>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showNotesDrawer, setShowNotesDrawer] = useState(false);
  const [showWateringDeck, setShowWateringDeck] = useState(false);
  const [showQBank, setShowQBank] = useState(false);
  const [showSimulator, setShowSimulator] = useState(false);
  const [activeDrillQuestions, setActiveDrillQuestions] = useState<import("@/lib/education/qbank-types").ClinicalQuestion[] | undefined>();
  const [showQBankManager, setShowQBankManager] = useState(false);
  const [sharedTokens, setSharedTokens] = useState<Record<string, string>>({});
  const [copiedShareFolder, setCopiedShareFolder] = useState<string | null>(null);
  const [importNotice, setImportNotice] = useState<{ success: boolean; message: string } | null>(null);
  const [showToolsMenu, setShowToolsMenu] = useState(false);
  const [heroIndex, setHeroIndex] = useState(0);
  const [selectedBtrSubject, setSelectedBtrSubject] = useState<string | undefined>();
  const [selectedBtrDestination, setSelectedBtrDestination] = useState<any>("today");
  const [revealedConcepts, setRevealedConcepts] = useState<Record<string, boolean>>({});
  const [conceptStats, setConceptStats] = useState<Record<string, any>>(() => loadAllConceptStats());
  const [conceptSystemFilter, setConceptSystemFilter] = useState<"all" | "cardio" | "neuro" | "renal">("all");
  const globalFileInputRef = useRef<HTMLInputElement>(null);

  const toggleConceptReveal = useCallback((conceptId: string) => {
    setRevealedConcepts((prev) => ({ ...prev, [conceptId]: !prev[conceptId] }));
  }, []);

  const handleRateConcept = useCallback((conceptId: string, passed: boolean) => {
    recordConceptAttempt(conceptId, passed);
    setConceptStats(loadAllConceptStats());
  }, []);

  const launchConceptMicroQuiz = useCallback((conceptId: string) => {
    const node = FOUNDATIONAL_CONCEPT_GRAPH[conceptId];
    if (!node) return;
    const questionsMap: Record<string, LectureCheckpoint> = {
      "cardiac-output": {
        id: "concept-co",
        timestampSec: 120,
        title: "Cardiac Output Determinants",
        question: "Which physiological variables directly dictate Cardiac Output in the hemodynamic formula?",
        type: "multiple-choice",
        options: ["Heart Rate and Stroke Volume (CO = HR × SV)", "Systemic Vascular Resistance only", "Left Atrial Mean Pressure only", "Pulmonary Artery Wedge Pressure only"],
        correctIndex: 0,
        explanation: "Cardiac Output (CO) is the product of Heart Rate (HR) and Stroke Volume (SV). Any factor altering either will directly shift total organ perfusion.",
        rewindOnFailSec: 30,
        prerequisiteId: "stroke-volume",
        conceptLabel: "Cardiovascular Physiology",
      },
      "stroke-volume": {
        id: "concept-sv",
        timestampSec: 150,
        title: "Stroke Volume Mechanics",
        question: "What are the three core determinants that modulate ventricular stroke volume?",
        type: "multiple-choice",
        options: ["Preload, Afterload, and Inotropy (Contractility)", "Blood Viscosity, Vessel Length, and Arteriolar Radius", "Heart Rate, Respiratory Rate, and PaO2", "Renal Blood Flow, GFR, and Aldosterone"],
        correctIndex: 0,
        explanation: "Stroke volume is governed by Preload (end-diastolic filling), Afterload (ejection resistance), and Contractility (myocardial squeeze).",
        rewindOnFailSec: 30,
        prerequisiteId: "frank-starling",
        conceptLabel: "Cardiovascular Physiology",
      },
      "frank-starling": {
        id: "concept-fs",
        timestampSec: 210,
        title: "Frank-Starling Relationship",
        question: "In your own words, explain how stretching cardiac myocytes by increasing venous return elevates contractile force.",
        type: "explain-it",
        expectedKeywords: ["stretch", "sarcomere", "length", "calcium", "troponin", "sensitivity", "force"],
        explanation: "Myocardial stretch optimizes sarcomere length (toward 2.2 µm) and increases Troponin C calcium affinity, generating stronger tension without adrenergic stimulation.",
        rewindOnFailSec: 45,
        prerequisiteId: "sarcomere-structure",
        conceptLabel: "Myocardial Biophysics",
      },
      "sarcomere-structure": {
        id: "concept-sarcomere",
        timestampSec: 90,
        title: "Sarcomere & Actin-Myosin Crossbridge",
        question: "Which regulatory protein binds calcium to uncover actin binding sites during cardiac and skeletal muscle contraction?",
        type: "multiple-choice",
        options: ["Troponin C", "Tropomyosin", "Myosin Light Chain", "Calmodulin"],
        correctIndex: 0,
        explanation: "Intracellular Ca²⁺ binds Troponin C, shifting tropomyosin out of the groove to expose actin-myosin crossbridge binding sites.",
        rewindOnFailSec: 30,
        conceptLabel: "Cellular Physiology",
      },
      "brachial-plexus-roots": {
        id: "concept-bp",
        timestampSec: 180,
        title: "Brachial Plexus Superior Trunk",
        question: "Which cervical ventral rami unite to form the superior trunk, damaged in Erb-Duchenne palsy?",
        type: "multiple-choice",
        options: ["C5 and C6", "C7 only", "C8 and T1", "C3 and C4"],
        correctIndex: 0,
        explanation: "C5 and C6 ventral rami form the superior trunk. Damage paralyzes the deltoid, supraspinatus, infraspinatus, and biceps (waiter's tip posture).",
        rewindOnFailSec: 30,
        prerequisiteId: "spinal-nerve-roots",
        conceptLabel: "Neuroanatomy",
      },
      "spinal-nerve-roots": {
        id: "concept-snr",
        timestampSec: 140,
        title: "Spinal Nerve Root Exit Anatomy",
        question: "Where does the C8 spinal nerve exit the neural canal in relation to the vertebral pedicles?",
        type: "multiple-choice",
        options: ["Between C7 and T1 vertebrae", "Above C7 vertebra", "Between T1 and T2 vertebrae", "Above C1 vertebra"],
        correctIndex: 0,
        explanation: "Cervical nerves C1-C7 exit ABOVE their numbered vertebrae; C8 exits below C7 and above T1. Thoracic and lumbar nerves exit BELOW their corresponding vertebrae.",
        rewindOnFailSec: 30,
        conceptLabel: "Gross Anatomy",
      },
      "metabolic-acidosis": {
        id: "concept-ma",
        timestampSec: 200,
        title: "Serum Anion Gap Calculation",
        question: "What is the standard formula used at the bedside to calculate serum Anion Gap in metabolic acidosis?",
        type: "multiple-choice",
        options: ["Na⁺ - (Cl⁻ + HCO₃⁻)", "(Na⁺ + K⁺) / (Cl⁻ + HCO₃⁻)", "2×Na⁺ + Glucose/18 + BUN/2.8", "PaCO₂ - 0.7 × (24 - HCO₃⁻)"],
        correctIndex: 0,
        explanation: "Serum Anion Gap = Na⁺ - (Cl⁻ + HCO₃⁻). Normal is 10-12 mEq/L. Elevated anion gap indicates unmeasured organic acids (MUDPILES).",
        rewindOnFailSec: 30,
        prerequisiteId: "henderson-hasselbalch",
        conceptLabel: "Renal & Acid-Base",
      },
      "henderson-hasselbalch": {
        id: "concept-hh",
        timestampSec: 160,
        title: "Henderson-Hasselbalch Ratio",
        question: "In the carbonic acid-bicarbonate buffer system, which organ systems independently regulate the numerator and denominator?",
        type: "multiple-choice",
        options: ["Kidneys regulate numerator (HCO₃⁻), Lungs regulate denominator (PaCO₂)", "Lungs regulate numerator (PaCO₂), Kidneys regulate denominator (HCO₃⁻)", "Liver regulates both numerator and denominator", "GI tract regulates numerator, Spleen regulates denominator"],
        correctIndex: 0,
        explanation: "pH = 6.1 + log([HCO₃⁻] / (0.03 × PaCO₂)). Kidneys balance the metabolic component ([HCO₃⁻]), while lungs dynamically modulate PaCO₂ via ventilation.",
        rewindOnFailSec: 30,
        conceptLabel: "Physiological Chemistry",
      },
    };

    const checkpoint = questionsMap[conceptId];
    if (checkpoint) {
      setActiveDrillCheckpoint(checkpoint);
    }
  }, []);

  const handleGlobalFileUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const res = await importEducationalFile(file);
      if (res.success) {
        setImportNotice({
          success: true,
          message:
            res.type === "qbank"
              ? `Successfully imported QBank Pack "${res.title}" with ${res.count} questions!`
              : `Successfully imported ${res.count} study cards and notes into your deck!`,
        });
      } else {
        setImportNotice({
          success: false,
          message: res.error || "Failed to parse educational JSON / GZ file.",
        });
      }
    } catch (err: unknown) {
      setImportNotice({
        success: false,
        message: err instanceof Error ? err.message : "Error reading file.",
      });
    }

    if (globalFileInputRef.current) globalFileInputRef.current.value = "";
    setTimeout(() => setImportNotice(null), 5000);
  };

  const dueNotes = useMemo(() => {
    return getDueStudyNotes();
  }, [notes]);

  // Group local course lectures by course title/folder
  const localCourseFolders = useMemo(() => {
    const courses = localEntries.filter((e) => e.source === "courses");
    const map = new Map<string, { folder: string; title: string; lessons: LocalEntry[] }>();
    for (const entry of courses) {
      const folderPath = entry.folder ?? "";
      const key = folderPath || entry.title;
      const existing = map.get(key);
      if (existing) {
        existing.lessons.push(entry);
      } else {
        map.set(key, {
          folder: folderPath,
          title: entry.title,
          lessons: [entry],
        });
      }
    }
    // Sort lessons inside each folder by episode
    for (const group of map.values()) {
      group.lessons.sort((a, b) => (a.episode ?? 0) - (b.episode ?? 0));
    }
    return Array.from(map.values());
  }, [localEntries]);

  // Video feeds configured in settings
  const subscribedFeeds = useMemo(() => {
    return settings.videoFeeds || [];
  }, [settings.videoFeeds]);

  // Filter curated courses
  const filteredCurated = useMemo(() => {
    return CURATED_COURSES.filter((course) => {
      const matchCat = activeCategory === "all" || course.category === activeCategory;
      const matchQuery =
        !searchQuery.trim() ||
        course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        course.provider.toLowerCase().includes(searchQuery.toLowerCase()) ||
        course.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchCat && matchQuery;
    });
  }, [activeCategory, searchQuery]);

  // Handle LAN Stremio share
  const handleToggleShare = useCallback(
    async (folder: string, title: string) => {
      if (sharedTokens[folder]) {
        const manifestUrl = sharedTokens[folder];
        void navigator.clipboard.writeText(manifestUrl);
        setCopiedShareFolder(folder);
        setTimeout(() => setCopiedShareFolder(null), 2500);
        return;
      }
      try {
        const token = `edu_${Math.random().toString(36).slice(2, 9)}`;
        const manifestUrl = await registerCourseShare({ token, folder, name: title });
        setSharedTokens((prev) => ({ ...prev, [folder]: manifestUrl }));
        void navigator.clipboard.writeText(manifestUrl);
        setCopiedShareFolder(folder);
        setTimeout(() => setCopiedShareFolder(null), 2500);
      } catch (e) {
        console.error("Failed to share course folder", e);
      }
    },
    [sharedTokens],
  );

  // Subscribe curated course as video feed
  const handleSubscribeFeed = useCallback(
    (course: CuratedCourse) => {
      const exists = (settings.videoFeeds || []).some((f) => f.url === course.feedUrl);
      if (exists) {
        openSettings("streaming");
        return;
      }
      const newFeed = {
        id: `course_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        name: `${course.provider}: ${course.title}`,
        url: course.feedUrl,
      };
      update({
        videoFeedsEnabled: true,
        videoFeeds: [...(settings.videoFeeds || []), newFeed],
      });
      openSettings("streaming");
    },
    [settings.videoFeeds, update, openSettings],
  );

  const [activeTestId, setActiveTestId] = useState<string | undefined>(undefined);

  const startQBankDrill = useCallback(async (testTitleOrSubject?: string | boolean, questionsOverride?: ClinicalQuestion[]) => {
    if (questionsOverride && questionsOverride.length > 0) {
      setActiveDrillQuestions(questionsOverride);
      setActiveTestId(typeof testTitleOrSubject === "string" ? testTitleOrSubject : undefined);
      setShowQBank(true);
      return;
    }
    if (typeof testTitleOrSubject === "string" && testTitleOrSubject.trim()) {
      try {
        const tests = await getBackendTests();
        const test = tests.find(
          (t) => t.title.toLowerCase() === testTitleOrSubject.toLowerCase() || t.id === testTitleOrSubject
        );
        if (test) {
          const qs = await getQuestionsForTest(test.id);
          if (qs.length > 0) {
            setActiveDrillQuestions(qs);
            setActiveTestId(test.id);
            setShowQBank(true);
            return;
          }
        }
        const subjQs = await getQuestionsForSubject(testTitleOrSubject);
        if (subjQs.length > 0) {
          setActiveDrillQuestions(subjQs);
          setActiveTestId(undefined);
          setShowQBank(true);
          return;
        }
      } catch (err) {
        console.warn("[education] Failed to load backend questions, falling back to starter pack", err);
      }
    }
    if (testTitleOrSubject === true) {
      const highYield = getInicetHighYieldQuestions();
      setActiveDrillQuestions(highYield.length > 0 ? highYield : CLINICAL_QBANK_STARTER);
    } else {
      const allImported = getAllQuestions();
      setActiveDrillQuestions(allImported.length > 0 ? allImported : CLINICAL_QBANK_STARTER);
    }
    setActiveTestId(undefined);
    setShowQBank(true);
  }, []);

  return (
    <main className="edu-hub" aria-label={t("Education Hub")}>
      {/* 1. Masthead matching Argus Sports Standard */}
      <header className="edu-masthead">
        <div>
          <div className="edu-eyebrow">
            <GraduationCap size={15} />
            <span>ARGUS EDUCATION</span>
            <span className="edu-eyebrow-badge">Open Masterclasses</span>
          </div>
          <h1>{t("Knowledge without gates. Your curriculum.")}</h1>
          <p>
            {t(
              "Democratizing education with clinical vignette simulations, high-yield university lecture series, and active recall spaced repetition.",
            )}
          </p>
        </div>

        {/* Action Dock */}
        <div className="edu-actions-dock">
          <button
            type="button"
            onClick={() => setShowWateringDeck(true)}
            disabled={dueNotes.length === 0}
            className="edu-pill-button"
            title={t("Daily Active Recall Spaced Repetition Session")}
          >
            <Sparkles size={15} className="text-accent" />
            <span>{t("Water the Tree")}</span>
            {dueNotes.length > 0 && (
              <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-accent text-canvas px-1.5 text-[10px] font-black">
                {dueNotes.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => startQBankDrill(true)}
            className="edu-pill-button primary"
            title={t("Launch High-Yield Clinical Vignette QBank Drill")}
          >
            <Zap size={15} className="fill-canvas text-canvas" />
            <span>{t("Clinical QBank Drill")}</span>
          </button>

          <div className="relative">
            <button
              type="button"
              onClick={() => setShowToolsMenu((v) => !v)}
              className="edu-pill-button"
              title={t("More Educational Tools")}
              aria-expanded={showToolsMenu}
            >
              <SlidersHorizontal size={15} />
              <span>{t("Tools")}</span>
            </button>

            {showToolsMenu && (
              <div
                className="absolute end-0 top-full mt-2 w-56 rounded-xl border border-edge bg-elevated/95 p-1.5 shadow-xl backdrop-blur-xl z-50 flex flex-col gap-0.5 animate-in fade-in slide-in-from-top-1 duration-150"
                onMouseLeave={() => setShowToolsMenu(false)}
              >
                <button
                  type="button"
                  onClick={() => {
                    setShowToolsMenu(false);
                    setShowQBankManager(true);
                  }}
                  className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-semibold text-ink hover:bg-raised transition text-start"
                >
                  <Database size={14} className="text-accent" />
                  <span>{t("Manage QBank Packs")}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowToolsMenu(false);
                    globalFileInputRef.current?.click();
                  }}
                  className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-semibold text-ink hover:bg-raised transition text-start"
                >
                  <Upload size={14} className="text-accent" />
                  <span>{t("Import .json / .json.gz")}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowToolsMenu(false);
                    openSettings("library");
                  }}
                  className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-semibold text-ink hover:bg-raised transition text-start"
                >
                  <FolderPlus size={14} className="text-ink-muted" />
                  <span>{t("Scan Local Course")}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowToolsMenu(false);
                    openSettings("streaming");
                  }}
                  className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-semibold text-ink hover:bg-raised transition text-start"
                >
                  <Rss size={14} className="text-ink-muted" />
                  <span>{t("Configure Feeds")}</span>
                </button>
              </div>
            )}
          </div>

          <input
            type="file"
            ref={globalFileInputRef}
            accept=".json,.jsonl,.gz,.txt"
            onChange={handleGlobalFileUpload}
            className="hidden"
          />
        </div>
      </header>

      {/* 2. Standardized View Tabs Rail */}
      <nav className="edu-view-tabs" aria-label={t("Education sub-navigation")}>
        {[
          { key: "courses", label: "Courses & Catalogs", icon: BookOpen },
          { key: "btr", label: "Core BTR NEET-PG 2027", icon: Flame, badge: "PRO" },
          { key: "checkpoints", label: "Checkpoints", icon: Target },
          { key: "qbank", label: "Clinical QBank", icon: Zap },
          { key: "simulator", label: "Emergency Simulator", icon: Stethoscope },
          { key: "notes", label: "Study Deck & Notes", icon: FileText },
        ].map((item) => {
          const Icon = item.icon;
          const isSelected = tab === item.key;
          return (
            <button
              key={item.key}
              type="button"
              aria-pressed={isSelected}
              onClick={() => setTab(item.key as typeof tab)}
              className="flex items-center gap-2"
            >
              <Icon size={14} className={isSelected ? "text-ink" : "text-ink-muted"} />
              <span>{t(item.label)}</span>
              {item.badge && (
                <span className="edu-tab-badge">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Import Notification Banner */}
      {importNotice && (
        <div className="mx-10 mb-6 flex items-center justify-between gap-3 rounded-2xl p-4 text-xs font-medium border shadow-lg bg-surface/90 border-edge backdrop-blur-md">
          <div className="flex items-center gap-2.5">
            {importNotice.success ? (
              <Check size={16} className="text-accent" />
            ) : (
              <AlertCircle size={16} className="text-danger" />
            )}
            <span className="text-[13px] text-ink">{importNotice.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setImportNotice(null)}
            className="rounded-lg p-1 text-ink-subtle hover:text-ink transition"
          >
            ✕
          </button>
        </div>
      )}

      {/* Main Tab Content */}
      <div className="edu-body">
        {/* TAB: CORE BTR NEET-PG 2027 STRATEGIC WAR ROOM */}
        {tab === "btr" && (
          <CoreBTRWarRoom
            onStartQBankDrill={(target, questions) => {
              startQBankDrill(target, questions);
            }}
            onOpenNotes={() => setTab("notes")}
            initialDestination={selectedBtrDestination}
            initialSubjectId={selectedBtrSubject}
          />
        )}

        {/* TAB 1: COURSES & CATALOGS */}
        {tab === "courses" && (
          <>
            {/* Cinematic CoreBTR Brand Hero (matching corebtr.com standard) */}
            {(() => {
              const hasBtrLocal = localCourseFolders.some((f) => f.folder.includes("BTR") || f.title.toLowerCase().includes("btr"));
              const featuredList = CURATED_COURSES.slice(0, 4);
              const activeHeroCourse = featuredList[heroIndex] || featuredList[0];
              if (!activeHeroCourse) return null;

              return (
                <div className="edu-cinematic-hero group">
                  <img
                    src={hasBtrLocal && heroIndex === 0 ? "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=1200&auto=format&fit=crop&q=80" : activeHeroCourse.thumbnail}
                    alt={activeHeroCourse.title}
                    className="edu-cinematic-hero-bg"
                  />
                  <div className="edu-cinematic-hero-overlay" />

                  <div className="edu-hero-content">
                    <div className="edu-hero-badge-ribbon">
                      <span className="edu-hero-kicker">
                        <Flame size={13} className="text-amber-400" />
                        <span>CoreBTR • Dr. Zainab Vora</span>
                      </span>
                      <span className="rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold text-white/90 border border-white/15">
                        NEET-PG • INI-CET • FMGE
                      </span>
                      {hasBtrLocal && (
                        <span className="rounded-full bg-white/10 px-3 py-1 text-[11px] font-bold text-white/90 border border-white/15">
                          61 Videos Indexed in /Downloads/BTR
                        </span>
                      )}
                    </div>

                    <h2 className="edu-hero-title">
                      {hasBtrLocal && heroIndex === 0
                        ? "Rapid Concept Revision for Medical PG Success"
                        : activeHeroCourse.title}
                    </h2>
                    <p className="edu-hero-desc">
                      {hasBtrLocal && heroIndex === 0
                        ? "High-yield topic synthesis, integrated clinical systems, and 19-subject rapid recall engineered for NEET-PG, INI-CET & FMGE aspirants."
                        : activeHeroCourse.description}
                    </p>

                    <div className="edu-hero-actions">
                      <button
                        type="button"
                        onClick={() => setTab("btr")}
                        className="edu-hero-btn-primary"
                      >
                        <Flame size={16} fill="currentColor" />
                        <span>{t("Launch CoreBTR War Room")}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setTab("checkpoints")}
                        className="edu-hero-btn-secondary"
                      >
                        <Target size={15} className="text-white/80" />
                        <span>{t("Socratic Checkpoints")}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => startQBankDrill(true)}
                        className="edu-hero-btn-secondary"
                      >
                        <Zap size={15} className="text-white/80" />
                        <span>{t("Clinical Drill")}</span>
                      </button>
                    </div>
                  </div>

                  {/* Hero Carousel Navigation Dots */}
                  <div className="edu-hero-nav-dots">
                    <button
                      type="button"
                      onClick={() => setHeroIndex((prev) => (prev > 0 ? prev - 1 : featuredList.length - 1))}
                      className="rounded-full bg-white/10 hover:bg-white/20 p-1.5 text-white backdrop-blur-md transition"
                      aria-label="Previous featured course"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    {featuredList.map((c, idx) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setHeroIndex(idx)}
                        className={`edu-hero-dot ${idx === heroIndex ? "active" : ""}`}
                        aria-label={`Jump to course ${idx + 1}`}
                      />
                    ))}
                    <button
                      type="button"
                      onClick={() => setHeroIndex((prev) => (prev < featuredList.length - 1 ? prev + 1 : 0))}
                      className="rounded-full bg-white/10 hover:bg-white/20 p-1.5 text-white backdrop-blur-md transition"
                      aria-label="Next featured course"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              );
            })()}

            {/* Section 1: Local Scanned Courses - Pick up where you left off */}
            {localCourseFolders.length > 0 && (
              <section className="flex flex-col gap-4">
                <div className="edu-section-head flex-col sm:flex-row sm:items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2 text-accent text-[11px] font-extrabold uppercase tracking-widest">
                      <Clock size={13} />
                      <span>{t("Pick up where you left off")}</span>
                    </div>
                    <h2 className="text-xl font-black tracking-tight text-white mt-0.5">
                      {t("Continue Local Curriculum")}
                    </h2>
                  </div>
                  <span className="text-xs text-ink-muted">
                    {localCourseFolders.length} {t("course libraries indexed")}
                  </span>
                </div>

                <div className="-mx-2">
                  <Row min={320} shape="landscape" alwaysActive scrollKey="education:local">
                    {localCourseFolders.map((course) => {
                      const firstLesson = course.lessons[0];
                      const isShared = !!sharedTokens[course.folder];
                      const isCopied = copiedShareFolder === course.folder;
                      const isBtr = course.folder.includes("BTR") || course.title.toLowerCase().includes("btr");

                      return (
                        <div
                          key={course.folder}
                          className="edu-obsidian-card group/card flex flex-col justify-between overflow-hidden p-0 transition-all duration-300 hover:scale-[1.02] border border-white/10 hover:border-accent/40 shadow-xl"
                        >
                          <div className="relative h-36 w-full overflow-hidden bg-gradient-to-br from-indigo-950/60 to-purple-950/60">
                            {/* Ambient Artwork */}
                            <img
                              src={isBtr ? "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=800&auto=format&fit=crop&q=80" : "https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?w=800&auto=format&fit=crop&q=80"}
                              alt={course.title}
                              className="h-full w-full object-cover transition duration-500 group-hover/card:scale-105 filter brightness-60"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />

                            <div className="absolute start-3.5 top-3.5 flex items-center gap-2">
                              {isBtr ? (
                                <span className="rounded-md bg-accent/90 px-2 py-0.5 text-[10px] font-black text-canvas shadow-md uppercase tracking-wider">
                                  CoreBTR 2027
                                </span>
                              ) : (
                                <span className="rounded-md bg-black/60 px-2 py-0.5 text-[10px] font-bold text-accent border border-accent/30 backdrop-blur-md uppercase tracking-wider">
                                  Local
                                </span>
                              )}
                              <span className="rounded-md bg-black/60 px-2 py-0.5 text-[10px] font-semibold text-white/90 backdrop-blur-md border border-white/10">
                                {course.lessons.length} {t("videos")}
                              </span>
                            </div>

                            {/* Floating Play Button Overlay */}
                            <button
                              type="button"
                              onClick={() => firstLesson && openPlayer(localPlayerSrc(firstLesson))}
                              className="absolute inset-0 m-auto flex h-12 w-12 items-center justify-center rounded-full bg-accent/90 text-canvas shadow-xl backdrop-blur-md transition transform group-hover/card:scale-110 group-hover/card:bg-accent"
                              title={t("Resume Lecture")}
                            >
                              <Play size={20} fill="currentColor" className="translate-x-0.5" />
                            </button>

                            <div className="absolute bottom-2.5 start-3.5 end-3.5">
                              <h3 className="text-sm font-extrabold text-white truncate drop-shadow">
                                {course.title}
                              </h3>
                              <p className="text-[10.5px] font-mono text-white/60 truncate mt-0.5">
                                {course.folder}
                              </p>
                            </div>
                          </div>

                          <div className="p-3.5 flex flex-col gap-2.5 bg-surface/90">
                            {/* Progress bar simulation */}
                            <div className="w-full bg-white/[0.08] h-1.5 rounded-full overflow-hidden">
                              <div className="bg-gradient-to-r from-accent to-indigo-400 h-full rounded-full w-[42%]" />
                            </div>

                            <div className="flex items-center justify-between pt-1">
                              {isBtr ? (
                                <button
                                  type="button"
                                  onClick={() => setTab("btr")}
                                  className="flex items-center gap-1.5 rounded-xl bg-accent px-3 py-1.5 text-[11.5px] font-bold text-canvas hover:brightness-110 transition shadow-sm"
                                >
                                  <Flame size={13} />
                                  <span>{t("Launch War Room")}</span>
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => firstLesson && openPlayer(localPlayerSrc(firstLesson))}
                                  className="flex items-center gap-1.5 rounded-xl bg-accent px-3 py-1.5 text-[11.5px] font-bold text-canvas hover:brightness-110 transition shadow-sm"
                                >
                                  <Play size={13} fill="currentColor" />
                                  <span>{t("Resume Lecture")}</span>
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={() => handleToggleShare(course.folder, course.title)}
                                className={`flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-[11px] font-semibold transition ${
                                  isCopied
                                    ? "bg-accent-soft text-accent font-bold"
                                    : isShared
                                    ? "bg-surface border border-edge text-ink"
                                    : "text-ink-muted hover:bg-white/5 hover:text-white"
                                }`}
                                title={t("Stream over LAN to Stremio or TV")}
                              >
                                {isCopied ? <Check size={13} /> : <Share2 size={13} />}
                                <span>{isCopied ? t("Copied!") : isShared ? t("Copy Feed") : t("Share LAN")}</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </Row>
                </div>
              </section>
            )}

            {/* Section 1.5: CoreBTR High-Yield 19-Subject Curriculum */}
            <section className="flex flex-col gap-4">
              <div className="edu-section-head flex-col sm:flex-row sm:items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 text-ink-muted text-[11px] font-extrabold uppercase tracking-widest">
                    <Flame size={13} className="text-amber-400" />
                    <span>{t("CoreBTR 19-Subject Integrated System")}</span>
                  </div>
                  <h2 className="text-xl font-black tracking-tight text-white mt-0.5">
                    {t("High-Yield PG Board Curriculum")}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setTab("btr")}
                  className="text-xs font-bold text-ink-muted hover:text-white flex items-center gap-1 transition"
                >
                  <span>{t("Open 19-Subject Studio")}</span>
                  <ChevronRight size={14} />
                </button>
              </div>

              <div className="-mx-2">
                <Row min={280} shape="landscape" alwaysActive scrollKey="education:btr-19-subjects">
                  {BTR_19_SUBJECTS_CATALOG.map((subject) => (
                    <div
                      key={subject.id}
                      onClick={() => {
                        setSelectedBtrSubject(subject.id);
                        setSelectedBtrDestination("subjects");
                        setTab("btr");
                      }}
                      className="edu-obsidian-card group/sub flex flex-col justify-between overflow-hidden p-0 transition-all duration-300 hover:scale-[1.02] border border-edge hover:border-white/20 shadow-xl cursor-pointer"
                    >
                      <div className="relative h-32 w-full overflow-hidden bg-surface">
                        <img
                          src={subject.thumbnail}
                          alt={subject.name}
                          className="h-full w-full object-cover transition duration-500 group-hover/sub:scale-105 filter brightness-65"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
                        
                        <div className="absolute top-2.5 start-2.5 flex items-center gap-1.5">
                          <span className="rounded-md bg-white/15 px-2 py-0.5 text-[9.5px] font-bold text-white shadow-md uppercase tracking-wider border border-white/20">
                            {subject.lessons} Lectures
                          </span>
                          <span className="rounded-md bg-black/60 px-2 py-0.5 text-[9.5px] font-semibold text-white/90 backdrop-blur-md border border-white/10">
                            {subject.duration}
                          </span>
                        </div>

                        <div className="absolute bottom-2 start-2.5 end-2.5">
                          <h4 className="text-sm font-extrabold text-white truncate drop-shadow">
                            {subject.name}
                          </h4>
                        </div>
                      </div>

                      <div className="p-3 flex flex-col gap-2 bg-surface/90">
                        <p className="text-[11px] text-white/70 line-clamp-1 leading-snug">
                          {subject.yieldTopic}
                        </p>
                        <div className="flex items-center justify-between pt-1 border-t border-white/[0.06]">
                          <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">
                            Dr. Zainab Vora
                          </span>
                          <span className="text-[11px] font-bold text-ink-muted group-hover/sub:text-white group-hover/sub:translate-x-0.5 transition flex items-center gap-0.5">
                            <span>Explore Studio</span>
                            <ChevronRight size={12} />
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </Row>
              </div>
            </section>

            {/* Section 1.6: CoreBTR Master Volumes & Question Vault (eBook-Grade Visuals) */}
            <section className="flex flex-col gap-4">
              <div className="edu-section-head flex-col sm:flex-row sm:items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 text-ink-muted text-[11px] font-extrabold uppercase tracking-widest">
                    <BookOpen size={13} className="text-amber-400" />
                    <span>{t("CoreBTR Master Volumes & Active Recall Workbooks")}</span>
                  </div>
                  <h2 className="text-xl font-black tracking-tight text-white mt-0.5">
                    {t("High-Yield Master Textbooks & QBank Vault")}
                  </h2>
                </div>
                <span className="text-xs text-ink-muted">
                  4 Master Volumes + 128 Local Workbooks Indexed
                </span>
              </div>

              <div className="-mx-2">
                <Row min={260} shape="landscape" alwaysActive scrollKey="education:btr-master-volumes">
                  {USER_LOCAL_BTR_MANIFEST.masterPdfs.map((pdf) => {
                    const sizeMb = (pdf.sizeBytes / (1024 * 1024)).toFixed(1);
                    return (
                      <div
                        key={pdf.id}
                        className="edu-obsidian-card group/vol flex flex-col justify-between overflow-hidden p-0 transition-all duration-300 hover:scale-[1.02] border border-edge hover:border-white/20 shadow-xl"
                      >
                        <div className="relative h-36 w-full overflow-hidden bg-surface p-4 flex flex-col justify-between">
                          <div className="flex items-center justify-between">
                            <span className="rounded-md bg-white/10 px-2.5 py-0.5 text-[9.5px] font-semibold text-white/90 border border-white/10 uppercase tracking-wider">
                              Master Edition
                            </span>
                            <span className="rounded-md bg-white/10 px-2 py-0.5 text-[10px] font-mono text-white/80 border border-white/10">
                              {sizeMb} MB
                            </span>
                          </div>

                          <div className="my-auto text-center py-2">
                            <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-white/5 text-white border border-white/10 mb-1 group-hover/vol:scale-110 transition">
                              <BookOpen size={22} />
                            </div>
                            <h4 className="text-sm font-extrabold text-white truncate drop-shadow px-2">
                              {pdf.title}
                            </h4>
                          </div>

                          <div className="flex items-center justify-between text-[10px] text-white/60">
                            <span>Dr. Zainab Vora</span>
                            <span className="text-emerald-400 font-bold">✓ Offline Verified</span>
                          </div>
                        </div>

                        <div className="p-3.5 flex flex-col gap-2.5 bg-surface/90">
                          <p className="text-[11px] font-mono text-white/60 truncate">
                            {pdf.filename}
                          </p>
                          <button
                            type="button"
                            onClick={() => {
                              const url = resolveBTRPlayableUrl(pdf.fullPath);
                              window.open(url, "_blank");
                            }}
                            className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-white hover:bg-white/90 px-3 py-2 text-xs font-bold text-black shadow-md transition"
                          >
                            <FileText size={13} />
                            <span>{t("Open Master Document")}</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </Row>
              </div>
            </section>

            {/* Section 1.7: Official Grand Tests & CBT Mock Exams */}
            <section className="flex flex-col gap-4">
              <div className="edu-section-head flex-col sm:flex-row sm:items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 text-ink-muted text-[11px] font-extrabold uppercase tracking-widest">
                    <Target size={13} className="text-amber-400" />
                    <span>{t("Official Grand Tests & CBT Exam Simulators")}</span>
                  </div>
                  <h2 className="text-xl font-black tracking-tight text-white mt-0.5">
                    {t("NEET-PG & INI-CET Grand Tests Suite")}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedBtrDestination("tests");
                    setTab("btr");
                  }}
                  className="text-xs font-bold text-ink-muted hover:text-white flex items-center gap-1 transition"
                >
                  <span>{t("Open Full Test Center")}</span>
                  <ChevronRight size={14} />
                </button>
              </div>

              <div className="-mx-2">
                <Row min={270} shape="landscape" alwaysActive scrollKey="education:btr-grand-tests">
                  {USER_LOCAL_BTR_MANIFEST.grandTests.map((gt) => {
                    const isHtml = gt.kind === "html_test";
                    return (
                      <div
                        key={gt.id}
                        className="edu-obsidian-card group/gt flex flex-col justify-between overflow-hidden p-0 transition-all duration-300 hover:scale-[1.02] border border-edge hover:border-white/20 shadow-xl"
                      >
                        <div className="relative h-32 w-full overflow-hidden bg-surface p-3.5 flex flex-col justify-between">
                          <div className="flex items-center justify-between">
                            <span className={`rounded-md px-2 py-0.5 text-[9.5px] font-black uppercase tracking-wider ${
                              isHtml
                                ? "bg-amber-500/15 text-amber-300 border border-amber-500/30"
                                : "bg-white/10 text-white/90 border border-white/10"
                            }`}>
                              {isHtml ? "Interactive CBT" : "Annotated Solutions"}
                            </span>
                            <span className="rounded-md bg-white/10 px-2 py-0.5 text-[9.5px] font-mono text-white/80 border border-white/10">
                              {(gt.sizeBytes / (1024 * 1024)).toFixed(1)} MB
                            </span>
                          </div>

                          <div>
                            <h4 className="text-sm font-extrabold text-white truncate drop-shadow">
                              {gt.title}
                            </h4>
                            <p className="text-[10px] text-white/60 truncate mt-0.5">
                              {gt.filename}
                            </p>
                          </div>
                        </div>

                        <div className="p-3 bg-surface/90 flex items-center justify-between gap-2 border-t border-white/[0.06]">
                          <button
                            type="button"
                            onClick={() => {
                              const url = resolveBTRPlayableUrl(gt.fullPath);
                              window.open(url, "_blank");
                            }}
                            className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-white hover:bg-white/90 px-3 py-1.5 text-xs font-bold text-black shadow-sm transition"
                          >
                            {isHtml ? <Play size={12} fill="currentColor" /> : <FileText size={12} />}
                            <span>{isHtml ? t("Launch CBT Simulation") : t("View Solutions")}</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </Row>
              </div>
            </section>

            {/* Section 2: Subscribed Feeds */}
            {subscribedFeeds.length > 0 && (
              <section className="flex flex-col gap-3">
                <div className="edu-section-head">
                  <div>
                    <h2>
                      <Rss size={20} className="text-accent" />
                      <span>{t("Subscribed Channels & Playlists")}</span>
                    </h2>
                    <p>{t("RSS feeds and YouTube playlist feeds synced into your player.")}</p>
                  </div>
                </div>

                <div className="-mx-2">
                  <Row min={250} shape="landscape" alwaysActive scrollKey="education:feeds">
                    {subscribedFeeds.map((feed) => (
                      <div
                        key={feed.id}
                        onClick={() => openSettings("streaming")}
                        className="edu-course-card group/card flex flex-col justify-between p-5"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-soft text-accent border border-accent/20 shrink-0">
                            <Rss size={18} />
                          </div>
                          <div className="min-w-0">
                            <h4 className="text-[14px] font-bold text-ink truncate">{feed.name}</h4>
                            <p className="text-[11px] font-mono text-ink-subtle truncate max-w-[180px]">{feed.url}</p>
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-3 border-t border-edge-soft text-xs text-ink-muted group-hover/card:text-ink">
                          <span>{t("Configure in Streaming Settings")}</span>
                          <ExternalLink size={14} className="text-ink-subtle shrink-0" />
                        </div>
                      </div>
                    ))}
                  </Row>
                </div>
              </section>
            )}

            {/* Section 3: Curated Open Courses Catalog */}
            <section className="flex flex-col gap-4">
              <div className="edu-section-head flex-col md:flex-row md:items-center">
                <div>
                  <h2>
                    <GraduationCap size={22} className="text-accent" />
                    <span>{t("Curated University & Faculty Series")}</span>
                  </h2>
                  <p>{t("Comprehensive masterclasses from open universities and medical faculties.")}</p>
                </div>

                {/* Filter Pills & Search */}
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="relative">
                    <Search size={14} className="absolute start-3 top-2.5 text-ink-subtle" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder={t("Filter by topic or university…")}
                      className="rounded-xl border border-edge bg-surface/80 ps-8 pe-3 py-1.5 text-[12.5px] text-ink placeholder:text-ink-subtle outline-none focus:border-accent"
                    />
                  </div>

                  <div className="flex items-center rounded-xl border border-edge-soft bg-surface/60 p-1 gap-1">
                    {(
                      [
                        { id: "all", label: t("All") },
                        { id: "medical", label: t("Medical (NEET-PG/MBBS)") },
                        { id: "engineering", label: t("Engineering & CS") },
                        { id: "science", label: t("Sciences") },
                        { id: "humanities", label: t("Civil Services") },
                      ] as const
                    ).map((cat) => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setActiveCategory(cat.id)}
                        className={`rounded-lg px-2.5 py-1 text-[11.5px] font-semibold transition ${
                          activeCategory === cat.id
                            ? "bg-accent text-canvas shadow-sm"
                            : "text-ink-muted hover:text-ink hover:bg-raised"
                        }`}
                      >
                        {cat.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Course Cards Carousel */}
              <div className="-mx-2">
                <Row
                  min={290}
                  shape="landscape"
                  alwaysActive
                  scrollKey={`education:courses:${activeCategory}`}
                >
                  {filteredCurated.map((course) => {
                    const isSubscribed = (settings.videoFeeds || []).some((f) => f.url === course.feedUrl);

                    return (
                      <div
                        key={course.id}
                        className="edu-course-card group/card"
                      >
                        <img
                          src={course.thumbnail}
                          alt={course.title}
                          loading="lazy"
                          draggable={false}
                          className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover/card:scale-105"
                        />
                        <div className="edu-card-overlay">
                          {/* Top Badges */}
                          <div className="absolute start-3.5 top-3.5 flex items-center gap-1.5">
                            <span className="edu-card-badge">
                              <Layers size={11} strokeWidth={2.4} />
                              <span>{course.provider}</span>
                            </span>
                            {course.totalLessons && (
                              <span className="edu-card-badge text-accent border-accent/25">
                                {course.totalLessons} {t("Lectures")}
                              </span>
                            )}
                          </div>

                          <h3 className="text-[14.5px] font-bold text-white line-clamp-1 leading-snug drop-shadow-md">
                            {course.title}
                          </h3>
                          <p className="text-[12px] text-white/70 line-clamp-2 leading-relaxed drop-shadow">
                            {course.description}
                          </p>

                          <div className="mt-2 flex items-center justify-between pt-2 border-t border-white/10">
                            <div className="flex items-center gap-1.5">
                              {course.tags.slice(0, 2).map((tag) => (
                                <span
                                  key={tag}
                                  className="rounded-md bg-white/10 px-2 py-0.5 text-[10px] font-medium text-white/80 backdrop-blur-sm"
                                >
                                  #{tag}
                                </span>
                              ))}
                            </div>

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSubscribeFeed(course);
                              }}
                              className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-semibold transition ${
                                isSubscribed
                                  ? "bg-white/20 text-white backdrop-blur-md"
                                  : "bg-accent hover:brightness-110 text-canvas shadow-sm"
                              }`}
                            >
                              <Rss size={12} />
                              <span>{isSubscribed ? t("Subscribed") : t("Add to Library")}</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </Row>
              </div>
            </section>
          </>
        )}

        {/* TAB: INTERACTIVE CHECKPOINTS & SOCRATIC AUTO-PAUSE (REDESIGNED) */}
        {tab === "checkpoints" && (
          <div className="flex flex-col gap-9">
            {/* 1. Mastery Status & Progress HUD Ribbon */}
            <div className="edu-hud-glass p-6 shadow-2xl">
              <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                <div className="flex flex-col gap-2 max-w-2xl">
                  <div className="flex items-center gap-2">
                    <span className="flex items-center gap-1.5 rounded-full bg-accent/15 px-3 py-0.5 text-[11px] font-extrabold uppercase tracking-widest text-accent border border-accent/25">
                      <Sparkles size={12} />
                      {t("Active Learning Engine")}
                    </span>
                    <span className="flex items-center gap-1 text-[11px] font-bold text-amber-300 bg-amber-500/15 px-2.5 py-0.5 rounded-full border border-amber-500/30">
                      <Flame size={12} className="text-amber-400" />
                      5 Day Retention Streak
                    </span>
                  </div>
                  <h3 className="text-2xl font-black tracking-tight text-white">
                    {t("Socratic Video Checkpoints & Root-Cause Mesh")}
                  </h3>
                  <p className="text-xs text-white/70 leading-relaxed">
                    {t(
                      "Lectures automatically pause at conceptual inflection points. Test your understanding on the spot or trace clinical errors down to cellular mechanisms.",
                    )}
                  </p>
                </div>

                {/* Quick Stats Pill */}
                <div className="flex items-center gap-3 shrink-0">
                  <div className="flex items-center gap-3 rounded-2xl bg-white/[0.04] border border-white/10 px-4 py-3 backdrop-blur-xl">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/15 text-accent border border-accent/25">
                      <Award size={20} />
                    </div>
                    <div>
                      <div className="text-[11px] uppercase font-bold text-white/50 tracking-wider">{t("Checkpoints")}</div>
                      <div className="text-lg font-black text-white">3 / 4 <span className="text-xs font-semibold text-ink-muted">(75%)</span></div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      const firstCourse = CURATED_COURSES[0];
                      if (firstCourse) openPlayer(localPlayerSrc(firstCourse as any));
                    }}
                    className="flex items-center gap-2 rounded-2xl bg-white hover:bg-white/90 px-5 py-3 text-xs font-bold text-black shadow-lg shadow-white/10 transition transform hover:-translate-y-0.5"
                  >
                    <Play size={15} fill="currentColor" />
                    <span>{t("Launch Socratic Player")}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* 2. High-Yield Course Checkpoint Decks */}
            <div className="flex flex-col gap-5">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-base font-extrabold text-white tracking-tight flex items-center gap-2">
                    <Target size={18} className="text-accent" />
                    <span>{t("High-Yield Course Checkpoint Decks")}</span>
                  </h4>
                  <p className="text-xs text-ink-muted mt-0.5">
                    {t("Interactive inflection points embedded directly inside university lectures.")}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {Object.entries(CURATED_COURSE_CHECKPOINTS).map(([courseKey, checkpoints]) => {
                  const course = CURATED_COURSES.find((c) => c.id === courseKey);
                  return (
                    <div
                      key={courseKey}
                      className="edu-obsidian-card p-5 flex flex-col justify-between gap-5 group"
                    >
                      {/* Course Cover Banner Header */}
                      <div className="flex flex-col gap-3">
                        <div className="relative h-28 w-full overflow-hidden rounded-xl border border-white/10">
                          <img
                            src={course?.thumbnail || "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=800"}
                            alt={course?.title || courseKey}
                            className="h-full w-full object-cover transition duration-500 group-hover:scale-105 filter brightness-75"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
                          <div className="absolute top-2.5 start-2.5 flex items-center gap-1.5">
                            <span className="rounded-md bg-black/60 px-2 py-0.5 text-[10px] font-bold text-accent border border-accent/30 backdrop-blur-md uppercase tracking-wider">
                              {course?.category || "Medical"}
                            </span>
                            <span className="rounded-md bg-black/60 px-2 py-0.5 text-[10px] font-medium text-white/80 backdrop-blur-md border border-white/10">
                              {checkpoints.length} {t("Checkpoints")}
                            </span>
                          </div>
                          <div className="absolute bottom-2 start-2.5 end-2.5">
                            <h5 className="font-bold text-white text-sm line-clamp-1 drop-shadow">
                              {course?.title || courseKey}
                            </h5>
                          </div>
                        </div>

                        <p className="text-[11.5px] text-ink-muted line-clamp-2 leading-relaxed">
                          {course?.description || t("Interactive checkpoints linked with video timestamps.")}
                        </p>
                      </div>

                      {/* Interactive Timeline Track */}
                      <div className="relative space-y-3 pt-2">
                        <div className="edu-timeline-connector" />
                        {checkpoints.map((cp, idx) => (
                          <div
                            key={cp.id}
                            className="edu-checkpoint-row"
                          >
                            <div className={`edu-timeline-dot ${idx === 0 ? "mastered" : "review"}`} />
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between gap-1">
                                <span className="font-bold text-white text-xs truncate">
                                  {cp.title}
                                </span>
                                <span className="rounded bg-white/[0.06] px-1.5 py-0.5 text-[9.5px] font-mono text-ink-subtle">
                                  {Math.floor(cp.timestampSec / 60)}:
                                  {String(cp.timestampSec % 60).padStart(2, "0")}
                                </span>
                              </div>
                              <p className="text-[11px] text-ink-muted line-clamp-1 mt-0.5">
                                {cp.question}
                              </p>
                              <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-white/[0.04]">
                                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-accent capitalize">
                                  {cp.type === "multiple-choice" ? <Zap size={11} /> : <BrainCircuit size={11} />}
                                  {cp.type.replace("-", " ")}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => setActiveDrillCheckpoint(cp)}
                                  className="flex items-center gap-1 rounded-lg bg-accent/20 hover:bg-accent text-accent hover:text-canvas px-2.5 py-1 text-[11px] font-bold transition border border-accent/30 shadow-sm"
                                >
                                  <Play size={10} fill="currentColor" />
                                  <span>{t("Drill")}</span>
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 3. Root-Cause Prerequisite Concept Mesh (Clinical Knowledge Graph) */}
            <div className="edu-hud-glass p-7 flex flex-col gap-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/[0.06] pb-5">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent/15 text-accent border border-accent/25">
                      <GitBranch size={16} />
                    </span>
                    <h4 className="font-extrabold text-white text-lg">
                      {t("Root-Cause Prerequisite Concept Mesh")}
                    </h4>
                  </div>
                  <p className="text-xs text-white/60 mt-1 max-w-xl">
                    {t(
                      "When you make repeated errors on an advanced concept, Argus traces the dependency chain backwards to diagnose and fix foundational gaps.",
                    )}
                  </p>
                </div>

                {/* Filter System Pills */}
                <div className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-black/40 p-1">
                  {[
                    { id: "all", label: t("All Systems") },
                    { id: "cardio", label: t("Cardiovascular") },
                    { id: "neuro", label: t("Neuroanatomy") },
                    { id: "renal", label: t("Acid-Base & Renal") },
                  ].map((sys) => (
                    <button
                      key={sys.id}
                      type="button"
                      onClick={() => setConceptSystemFilter(sys.id as any)}
                      className={`rounded-lg px-3 py-1 text-[11.5px] font-bold transition ${
                        conceptSystemFilter === sys.id
                          ? "bg-white text-black shadow-sm"
                          : "text-white/60 hover:text-white hover:bg-white/5"
                      }`}
                    >
                      {sys.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* System Knowledge Tracks */}
              <div className="flex flex-col gap-6">
                {/* TRACK 1: Cardiovascular Hemodynamics */}
                {(conceptSystemFilter === "all" || conceptSystemFilter === "cardio") && (
                  <div className="edu-knowledge-track flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-accent" />
                        <h5 className="text-sm font-extrabold text-white uppercase tracking-wider">
                          Cardiovascular Hemodynamics & Mechanics
                        </h5>
                      </div>
                      <span className="text-[11px] font-mono text-white/40">4 Nodes • Root-Cause Trail</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      {["cardiac-output", "stroke-volume", "frank-starling", "sarcomere-structure"].map((conceptId, idx) => {
                        const concept = FOUNDATIONAL_CONCEPT_GRAPH[conceptId];
                        if (!concept) return null;
                        const isRevealed = !!revealedConcepts[conceptId];
                        const stats = conceptStats[conceptId];

                        return (
                          <div
                            key={concept.id}
                            className="relative rounded-2xl border border-edge bg-surface p-4 flex flex-col justify-between gap-3 shadow-xl hover:border-white/20 transition group"
                          >
                            <div className="flex flex-col gap-1.5">
                              <div className="flex items-center justify-between">
                                <span className="rounded bg-white/10 border border-white/15 px-2 py-0.5 text-[9.5px] font-bold text-white/90 uppercase">
                                  {idx === 0 ? "Level 3: Target" : idx === 1 ? "Level 2: Mechanism" : idx === 2 ? "Level 1: Law" : "Root Cause"}
                                </span>
                                {stats?.mastered ? (
                                  <span className="text-emerald-400 text-[10px] font-bold flex items-center gap-1">
                                    <CheckCircle2 size={12} /> Mastered
                                  </span>
                                ) : (
                                  <span className="text-white/50 text-[10px] font-medium">
                                    Needs Drill
                                  </span>
                                )}
                              </div>
                              <h6 className="font-extrabold text-white text-xs leading-snug">
                                {concept.title}
                              </h6>
                              <p className="text-[11px] text-white/70 line-clamp-2 leading-relaxed">
                                {concept.description}
                              </p>
                            </div>

                            {/* Active Recall Occlusion Key Box */}
                            <div className="edu-occlusion-card bg-elevated border border-edge">
                              <div className="flex items-center justify-between mb-1">
                                <strong className="text-[9.5px] uppercase font-bold text-ink-muted">
                                  {t("Foundational Key")}
                                </strong>
                                <button
                                  type="button"
                                  onClick={() => toggleConceptReveal(concept.id)}
                                  className="text-white/60 hover:text-white transition"
                                  title={isRevealed ? "Hide Key" : "Reveal Key (Active Recall)"}
                                >
                                  {isRevealed ? <EyeOff size={12} /> : <Eye size={12} />}
                                </button>
                              </div>
                              <p className={`text-[11px] text-white/90 leading-snug ${isRevealed ? "" : "edu-occlusion-blurred"}`}>
                                {concept.refresherTip}
                              </p>
                              {!isRevealed && (
                                <button
                                  type="button"
                                  onClick={() => toggleConceptReveal(concept.id)}
                                  className="mt-1 w-full text-center text-[10px] font-bold text-ink hover:text-white transition"
                                >
                                  {t("👁 Reveal Active Recall Key")}
                                </button>
                              )}
                            </div>

                            {/* Self-Rating & Micro-Drill CTA */}
                            <div className="flex items-center justify-between pt-1 border-t border-white/[0.06]">
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleRateConcept(concept.id, true)}
                                  className="rounded px-2 py-0.5 text-[10px] font-bold bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 transition"
                                >
                                  ✓ Got It
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleRateConcept(concept.id, false)}
                                  className="rounded px-2 py-0.5 text-[10px] font-bold bg-white/5 hover:bg-white/10 text-white/70 border border-white/10 transition"
                                >
                                  ✕ Weak
                                </button>
                              </div>

                              <button
                                type="button"
                                onClick={() => launchConceptMicroQuiz(concept.id)}
                                className="flex items-center gap-1 rounded-lg bg-white hover:bg-white/90 text-black px-2.5 py-1 text-[10px] font-bold transition shadow-xs"
                              >
                                <Zap size={10} fill="currentColor" />
                                <span>Quiz</span>
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* TRACK 2: Upper Limb Neuroanatomy */}
                {(conceptSystemFilter === "all" || conceptSystemFilter === "neuro") && (
                  <div className="edu-knowledge-track flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-accent" />
                        <h5 className="text-sm font-extrabold text-white uppercase tracking-wider">
                          Upper Limb Neuroanatomy & Palsy Localization
                        </h5>
                      </div>
                      <span className="text-[11px] font-mono text-white/40">2 Nodes • Anatomical Trail</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {["brachial-plexus-roots", "spinal-nerve-roots"].map((conceptId, idx) => {
                        const concept = FOUNDATIONAL_CONCEPT_GRAPH[conceptId];
                        if (!concept) return null;
                        const isRevealed = !!revealedConcepts[conceptId];
                        const stats = conceptStats[conceptId];

                        return (
                          <div
                            key={concept.id}
                            className="relative rounded-2xl border border-edge bg-surface p-4 flex flex-col justify-between gap-3 shadow-xl hover:border-white/20 transition group"
                          >
                            <div className="flex flex-col gap-1.5">
                              <div className="flex items-center justify-between">
                                <span className="rounded bg-white/10 border border-white/15 px-2 py-0.5 text-[9.5px] font-bold text-white/90 uppercase">
                                  {idx === 0 ? "Clinical Syndrome" : "Root Anatomical Basis"}
                                </span>
                                {stats?.mastered ? (
                                  <span className="text-emerald-400 text-[10px] font-bold flex items-center gap-1">
                                    <CheckCircle2 size={12} /> Mastered
                                  </span>
                                ) : (
                                  <span className="text-white/50 text-[10px] font-medium">
                                    Needs Drill
                                  </span>
                                )}
                              </div>
                              <h6 className="font-extrabold text-white text-xs leading-snug">
                                {concept.title}
                              </h6>
                              <p className="text-[11px] text-white/60 line-clamp-2 leading-relaxed">
                                {concept.description}
                              </p>
                            </div>

                            <div className="edu-occlusion-card bg-elevated border border-edge">
                              <div className="flex items-center justify-between mb-1">
                                <strong className="text-[9.5px] uppercase font-bold text-ink-muted">
                                  {t("Foundational Key")}
                                </strong>
                                <button
                                  type="button"
                                  onClick={() => toggleConceptReveal(concept.id)}
                                  className="text-white/60 hover:text-white transition"
                                >
                                  {isRevealed ? <EyeOff size={12} /> : <Eye size={12} />}
                                </button>
                              </div>
                              <p className={`text-[11px] text-white/90 leading-snug ${isRevealed ? "" : "edu-occlusion-blurred"}`}>
                                {concept.refresherTip}
                              </p>
                              {!isRevealed && (
                                <button
                                  type="button"
                                  onClick={() => toggleConceptReveal(concept.id)}
                                  className="mt-1 w-full text-center text-[10px] font-bold text-ink-muted hover:text-white transition"
                                >
                                  {t("👁 Reveal Active Recall Key")}
                                </button>
                              )}
                            </div>

                            <div className="flex items-center justify-between pt-1 border-t border-white/[0.06]">
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleRateConcept(concept.id, true)}
                                  className="rounded px-2 py-0.5 text-[10px] font-bold bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 transition"
                                >
                                  ✓ Got It
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleRateConcept(concept.id, false)}
                                  className="rounded px-2 py-0.5 text-[10px] font-bold bg-white/5 hover:bg-white/10 text-white/70 border border-white/10 transition"
                                >
                                  ✕ Weak
                                </button>
                              </div>

                              <button
                                type="button"
                                onClick={() => launchConceptMicroQuiz(concept.id)}
                                className="flex items-center gap-1 rounded-lg bg-white hover:bg-white/90 text-black px-2.5 py-1 text-[10px] font-bold transition shadow-xs"
                              >
                                <Zap size={10} fill="currentColor" />
                                <span>Quiz</span>
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* TRACK 3: Renal, Acid-Base & Physicochemical Buffers */}
                {(conceptSystemFilter === "all" || conceptSystemFilter === "renal") && (
                  <div className="edu-knowledge-track flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-accent" />
                        <h5 className="text-sm font-extrabold text-ink-muted uppercase tracking-wider">
                          Renal, Acid-Base & Physicochemical Buffers
                        </h5>
                      </div>
                      <span className="text-[11px] font-mono text-white/40">2 Nodes • Equilibrium Trail</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {["metabolic-acidosis", "henderson-hasselbalch"].map((conceptId, idx) => {
                        const concept = FOUNDATIONAL_CONCEPT_GRAPH[conceptId];
                        if (!concept) return null;
                        const isRevealed = !!revealedConcepts[conceptId];
                        const stats = conceptStats[conceptId];

                        return (
                          <div
                            key={concept.id}
                            className="relative rounded-2xl border border-edge bg-surface p-4 flex flex-col justify-between gap-3 shadow-xl hover:border-white/20 transition group"
                          >
                            <div className="flex flex-col gap-1.5">
                              <div className="flex items-center justify-between">
                                <span className="rounded bg-white/10 border border-white/15 px-2 py-0.5 text-[9.5px] font-bold text-white/90 uppercase">
                                  {idx === 0 ? "Clinical Disturbance" : "Physicochemical Buffer Law"}
                                </span>
                                {stats?.mastered ? (
                                  <span className="text-emerald-400 text-[10px] font-bold flex items-center gap-1">
                                    <CheckCircle2 size={12} /> Mastered
                                  </span>
                                ) : (
                                  <span className="text-white/50 text-[10px] font-medium">
                                    Needs Drill
                                  </span>
                                )}
                              </div>
                              <h6 className="font-extrabold text-white text-xs leading-snug">
                                {concept.title}
                              </h6>
                              <p className="text-[11px] text-white/60 line-clamp-2 leading-relaxed">
                                {concept.description}
                              </p>
                            </div>

                            <div className="edu-occlusion-card bg-elevated border border-edge">
                              <div className="flex items-center justify-between mb-1">
                                <strong className="text-[9.5px] uppercase font-bold text-ink-muted">
                                  {t("Foundational Key")}
                                </strong>
                                <button
                                  type="button"
                                  onClick={() => toggleConceptReveal(concept.id)}
                                  className="text-white/60 hover:text-white transition"
                                >
                                  {isRevealed ? <EyeOff size={12} /> : <Eye size={12} />}
                                </button>
                              </div>
                              <p className={`text-[11px] text-white/90 leading-snug ${isRevealed ? "" : "edu-occlusion-blurred"}`}>
                                {concept.refresherTip}
                              </p>
                              {!isRevealed && (
                                <button
                                  type="button"
                                  onClick={() => toggleConceptReveal(concept.id)}
                                  className="mt-1 w-full text-center text-[10px] font-bold text-ink-muted hover:text-white transition"
                                >
                                  {t("👁 Reveal Active Recall Key")}
                                </button>
                              )}
                            </div>

                            <div className="flex items-center justify-between pt-1 border-t border-white/[0.06]">
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleRateConcept(concept.id, true)}
                                  className="rounded px-2 py-0.5 text-[10px] font-bold bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 transition"
                                >
                                  ✓ Got It
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleRateConcept(concept.id, false)}
                                  className="rounded px-2 py-0.5 text-[10px] font-bold bg-white/5 hover:bg-white/10 text-white/70 border border-white/10 transition"
                                >
                                  ✕ Weak
                                </button>
                              </div>

                              <button
                                type="button"
                                onClick={() => launchConceptMicroQuiz(concept.id)}
                                className="flex items-center gap-1 rounded-lg bg-white hover:bg-white/90 text-black px-2.5 py-1 text-[10px] font-bold transition shadow-xs"
                              >
                                <Zap size={10} fill="currentColor" />
                                <span>Quiz</span>
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: CLINICAL QBANK & VAULT */}
        {tab === "qbank" && (
          <div className="flex flex-col gap-6">
            <InicetWarRoomBanner onOpenBtrWarRoom={() => setTab("btr")} />

            {/* QBank Launch Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="p-6 rounded-2xl bg-surface/70 border border-edge-soft flex flex-col justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent-soft text-accent border border-accent/25 shrink-0">
                    <Flame size={20} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-ink">INICET High-Yield Drill</h3>
                    <p className="text-xs text-ink-muted">Examiner trap questions & multi-step clinical vignettes</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => startQBankDrill(true)}
                  className="edu-pill-button primary w-full justify-center"
                >
                  <Zap size={14} className="fill-canvas text-canvas" />
                  <span>Start High-Yield Sprint</span>
                </button>
              </div>

              <div className="p-6 rounded-2xl bg-surface/70 border border-edge-soft flex flex-col justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent-soft text-accent border border-accent/25 shrink-0">
                    <Database size={20} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-ink">Complete Question Bank</h3>
                    <p className="text-xs text-ink-muted">All installed packs across Medicine, Surgery, OBG & Pedia</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => startQBankDrill(false)}
                  className="edu-pill-button w-full justify-center"
                >
                  <Play size={14} />
                  <span>Drill All Questions</span>
                </button>
              </div>

              <div className="p-6 rounded-2xl bg-surface/70 border border-edge-soft flex flex-col justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent-soft text-accent border border-accent/25 shrink-0">
                    <SlidersHorizontal size={20} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-ink">Manage QBank Packs</h3>
                    <p className="text-xs text-ink-muted">Import, export, and review installed specialty packs</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowQBankManager(true)}
                  className="edu-pill-button w-full justify-center"
                >
                  <Database size={14} />
                  <span>Open Pack Manager</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: CLINICAL EMERGENCY SIMULATOR */}
        {tab === "simulator" && (
          <div className="edu-hero-spotlight">
            <div className="flex flex-col gap-3 max-w-xl">
              <div className="inline-flex items-center gap-2 rounded-full bg-accent-soft px-3 py-1 text-xs font-bold text-accent border border-accent/20 w-max">
                <Stethoscope size={14} />
                <span>Resident Emergency Department</span>
              </div>
              <h2 className="text-2xl font-bold text-ink tracking-tight">
                Interactive Patient Case & ER Resident Simulator
              </h2>
              <p className="text-sm text-ink-muted leading-relaxed">
                Step into the shoes of an on-call emergency physician. Manage acute coronary syndromes, anaphylactic shock, septicemia, and traumatic head injuries under real-time hemodynamic monitoring and diagnostic investigations.
              </p>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setShowSimulator(true)}
                  className="edu-pill-button primary"
                >
                  <Activity size={16} />
                  <span>Launch Emergency Case Simulator</span>
                </button>
              </div>
            </div>

            <div className="flex items-center justify-center p-6 rounded-2xl bg-elevated/60 border border-edge shrink-0">
              <BrainCircuit size={64} className="text-accent opacity-80" />
            </div>
          </div>
        )}

        {/* TAB 4: STUDY DECK & NOTES */}
        {tab === "notes" && (
          <div className="flex flex-col gap-6">
            <div className="edu-hero-spotlight">
              <div className="flex flex-col gap-2">
                <h3 className="text-xl font-bold text-ink">Spaced Repetition Flashcard Engine</h3>
                <p className="text-xs text-ink-muted max-w-lg">
                  Every note captured while watching lectures (press &apos;N&apos; during playback) enters your daily spaced repetition watering queue.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setShowWateringDeck(true)}
                  disabled={dueNotes.length === 0}
                  className="edu-pill-button primary"
                >
                  <Sparkles size={14} />
                  <span>Water Daily Cards ({dueNotes.length} Due)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowNotesDrawer(true)}
                  className="edu-pill-button"
                >
                  <FileText size={14} />
                  <span>Browse All Notes ({notes.length})</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modals & Overlays */}
      {showQBankManager && createPortal(
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-canvas/80 backdrop-blur-md p-4">
          <QBankManager
            onStartPackDrill={(pack, filterLevel) => {
              let qs = pack.questions;
              if (filterLevel === "high-yield") {
                qs = pack.questions.filter(
                  (q) => q.depthLevel === "L3_MultiStepClinical" || q.depthLevel === "L4_InicetTrap",
                );
                if (qs.length === 0) qs = pack.questions;
              }
              setActiveDrillQuestions(qs);
              setShowQBankManager(false);
              setShowQBank(true);
            }}
            onClose={() => setShowQBankManager(false)}
          />
        </div>,
        document.body,
      )}

      {showQBank && createPortal(
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-canvas/80 backdrop-blur-md p-4">
          <QBankRunner
            questions={activeDrillQuestions}
            onFinish={(result) => {
              saveExamResult(result, activeTestId);
            }}
            onClose={() => {
              setShowQBank(false);
              setActiveDrillQuestions(undefined);
              setActiveTestId(undefined);
            }}
          />
        </div>,
        document.body,
      )}

      {showWateringDeck && (
        <DailyWateringDeck
          notes={notes}
          onClose={() => setShowWateringDeck(false)}
        />
      )}

      {showNotesDrawer && (
        <NotesDrawer
          notes={notes}
          onClose={() => setShowNotesDrawer(false)}
        />
      )}

      {showSimulator && (
        <PatientCaseSimulator onClose={() => setShowSimulator(false)} />
      )}

      {activeDrillCheckpoint && (
        <InteractiveCheckpointOverlay
          checkpoint={activeDrillCheckpoint}
          onContinue={() => setActiveDrillCheckpoint(null)}
          onRewind={() => setActiveDrillCheckpoint(null)}
        />
      )}
    </main>
  );
}

function NotesDrawer({
  notes,
  onClose,
}: {
  notes: StudyNote[];
  onClose: () => void;
}) {
  const t = useT();
  const [copiedAll, setCopiedAll] = useState(false);
  const [downloadedAnki, setDownloadedAnki] = useState(false);
  const [downloadedJson, setDownloadedJson] = useState(false);
  const [drawerNotice, setDrawerNotice] = useState<{ success: boolean; message: string } | null>(null);
  const drawerFileInputRef = useRef<HTMLInputElement>(null);

  const handleExportAll = () => {
    const md = exportNotesAsMarkdown(notes);
    void navigator.clipboard.writeText(md);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2000);
  };

  const handleExportJson = () => {
    const jsonStr = exportNotesAsJson(notes);
    const blob = new Blob([jsonStr], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `argus-notes-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setDownloadedJson(true);
    setTimeout(() => setDownloadedJson(false), 2000);
  };

  const handleDrawerFileUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const res = await importEducationalFile(file);
      if (res.success) {
        setDrawerNotice({
          success: true,
          message: `Imported ${res.count} cards / questions (${res.type})!`,
        });
      } else {
        setDrawerNotice({
          success: false,
          message: res.error || "Failed to import JSON file.",
        });
      }
    } catch (err: unknown) {
      setDrawerNotice({
        success: false,
        message: err instanceof Error ? err.message : "File processing error.",
      });
    }

    if (drawerFileInputRef.current) drawerFileInputRef.current.value = "";
    setTimeout(() => setDrawerNotice(null), 4000);
  };

  const handleExportAnki = () => {
    const pkg = generateAnkiDeckPackage(notes, "Argus Study Mode Deck");
    const blob = new Blob([pkg.textData], { type: "text/tab-separated-values;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = pkg.filename;
    a.click();
    URL.revokeObjectURL(url);
    setDownloadedAnki(true);
    setTimeout(() => setDownloadedAnki(false), 2000);
  };

  return createPortal(
    <div className="fixed inset-0 z-[200] flex justify-end bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative flex h-full w-full max-w-md flex-col bg-surface border-s border-edge shadow-2xl animate-in slide-in-from-end duration-300">
        {/* Drawer Header */}
        <div className="flex flex-col gap-3 p-6 border-b border-edge">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText size={18} className="text-accent" />
              <h3 className="text-base font-bold text-ink">{t("Captured Study Notes")}</h3>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1 text-ink-subtle hover:text-ink hover:bg-raised transition"
            >
              ✕
            </button>
          </div>

          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => drawerFileInputRef.current?.click()}
                className="flex items-center gap-1 text-[11.5px] font-medium text-ink-muted hover:text-ink px-2 py-1 rounded bg-elevated border border-edge-soft"
                title="Import notes or questions from JSON"
              >
                <Upload size={12} />
                <span>{t("Import")}</span>
              </button>
              <input
                type="file"
                ref={drawerFileInputRef}
                accept=".json,.jsonl,.gz"
                onChange={handleDrawerFileUpload}
                className="hidden"
              />

              <button
                type="button"
                onClick={handleExportJson}
                disabled={notes.length === 0}
                className="flex items-center gap-1 text-[11.5px] font-medium text-ink-muted hover:text-ink px-2 py-1 rounded bg-elevated border border-edge-soft disabled:opacity-40"
              >
                {downloadedJson ? <Check size={12} /> : <FileText size={12} />}
                <span>{downloadedJson ? t("Saved!") : t("JSON")}</span>
              </button>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleExportAnki}
                disabled={notes.length === 0}
                className="flex items-center gap-1 text-[11.5px] font-medium text-accent hover:underline disabled:opacity-40"
              >
                {downloadedAnki ? <Check size={12} /> : <FileText size={12} />}
                <span>{downloadedAnki ? t("Downloaded Anki!") : t("Anki .tsv")}</span>
              </button>
              <button
                type="button"
                onClick={handleExportAll}
                disabled={notes.length === 0}
                className="flex items-center gap-1 text-[11.5px] font-medium text-accent hover:underline disabled:opacity-40"
              >
                {copiedAll ? <Check size={12} /> : <Copy size={12} />}
                <span>{copiedAll ? t("Copied!") : t("Markdown")}</span>
              </button>
            </div>
          </div>

          {drawerNotice && (
            <div
              className={`flex items-center gap-2 p-2 rounded-lg text-[11.5px] font-medium border ${
                drawerNotice.success
                  ? "bg-accent-soft text-accent border-accent/20"
                  : "bg-danger/10 text-danger border-danger/20"
              }`}
            >
              {drawerNotice.success ? <Check size={13} /> : <AlertCircle size={13} />}
              <span>{drawerNotice.message}</span>
            </div>
          )}
        </div>

        {/* Notes List */}
        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-4">
          {notes.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-center text-ink-subtle gap-2">
              <FileText size={32} strokeWidth={1.5} />
              <p className="text-[13px]">{t("No study notes captured yet.")}</p>
              <p className="text-[11.5px] max-w-[280px]">
                {t("Press 'N' while watching any lecture to freeze the frame and create a timestamped note.")}
              </p>
            </div>
          ) : (
            notes.map((note) => (
              <div
                key={note.id}
                className="flex flex-col gap-2.5 rounded-xl border border-edge bg-canvas/50 p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="text-[13.5px] font-semibold text-ink leading-tight">
                      {note.itemTitle}
                    </h4>
                    <span className="text-[11px] font-mono text-accent">
                      {note.timestampLabel}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => deleteStudyNote(note.id)}
                    className="text-ink-subtle hover:text-danger p-1 transition"
                    title={t("Delete note")}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>

                {note.snapshotDataUrl && (
                  <div className="overflow-hidden rounded-lg border border-edge/60 max-h-[120px] bg-canvas">
                    <img
                      src={note.snapshotDataUrl}
                      alt="Lecture snapshot"
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}

                <p className="text-[12.5px] text-ink-muted whitespace-pre-wrap font-sans leading-relaxed">
                  {note.markdown}
                </p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
