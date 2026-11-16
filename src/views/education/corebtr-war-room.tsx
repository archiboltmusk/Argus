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
  BarChart2,
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
} from "lucide-react";
import { useView } from "@/lib/view";
import { BTRSplitWorkstation } from "@/components/education/btr-split-workstation";
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
  type BTRLocalLibraryState,
  type BTRLocalMediaFile,
} from "@/lib/education/btr-local-library";

interface CoreBTRWarRoomProps {
  onStartQBankDrill?: (subjectName?: string) => void;
  onOpenNotes?: () => void;
}

export function CoreBTRWarRoom({ onStartQBankDrill, onOpenNotes }: CoreBTRWarRoomProps = {}) {
  const { openPlayer } = useView();

  const [activeView, setActiveView] = useState<
    "timeline" | "medialibrary" | "volatiles" | "gt_analytics" | "strategy"
  >("timeline");
  const [progressMap, setProgressMap] = useState<Record<string, BTRSubjectProgress>>({});
  const [gtRecords, setGtRecords] = useState<BTRGrandTestRecord[]>([]);
  const [libraryState, setLibraryState] = useState<BTRLocalLibraryState>(loadBTRLocalLibrary());
  const [categoryFilter, setCategoryFilter] = useState<BTRSubjectCategory | "ALL">("ALL");
  const [searchQuery, setSearchQuery] = useState("");

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
      const matchCat = categoryFilter === "ALL" || s.category === categoryFilter;
      const matchQuery =
        !searchQuery.trim() ||
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.mustKnowTopics.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchCat && matchQuery;
    });
  }, [categoryFilter, searchQuery]);

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

  // Folder Upload Handler
  const handleFolderSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const fileList: Array<{ name: string; fullPath?: string; relativePath?: string; size?: number }> = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      // webkitRelativePath gives folder hierarchy e.g. "BTR 2027/Anatomy/Lecture 01.mp4"
      const relative = file.webkitRelativePath || file.name;
      fileList.push({
        name: file.name,
        fullPath: (file as any).path || relative,
        relativePath: relative,
        size: file.size,
      });
    }

    const state = indexBTRFiles(fileList, "Local BTR Folder");
    setLibraryState(state);
    setScanNotice(
      `Indexed ${state.totalVideosFound} lecture videos and ${state.totalPdfsFound} PDF workbooks across ${state.subjectsWithVideosCount} subjects!`
    );
    setTimeout(() => setScanNotice(null), 6000);
  };

  // Play a BTR video lecture
  const handlePlayLecture = (video: BTRLocalMediaFile, subject: BTRSubject) => {
    const companionPdf =
      libraryState.mappings[subject.id]?.unannotatedPdf?.fullPath ||
      libraryState.mappings[subject.id]?.annotatedPdf?.fullPath;

    const src = createBTRVideoPlayerSrc(video, subject, companionPdf);
    openPlayer(src);
  };

  // Open PDF workbook in browser/new tab
  const handleOpenPdf = (pdf: BTRLocalMediaFile) => {
    const url = pdf.fullPath.startsWith("file://") ? pdf.fullPath : `file://${pdf.fullPath}`;
    window.open(url, "_blank");
  };

  return (
    <div className="flex flex-col gap-6 text-ink animate-in fade-in duration-200">
      {/* 1. Header Mission Control & Exam Countdowns */}
      <div className="relative overflow-hidden rounded-3xl border border-edge-soft bg-gradient-to-br from-surface/90 via-surface/60 to-elevated/40 p-6 md:p-8 shadow-sm backdrop-blur-xl">
        <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-accent/15 blur-3xl pointer-events-none" />
        <div className="absolute -left-16 -bottom-16 h-64 w-64 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex flex-wrap items-center gap-2.5 mb-2">
              <span className="flex items-center gap-1.5 rounded-full bg-accent/20 px-3 py-1 text-xs font-bold text-accent border border-accent/30 tracking-wide">
                <Flame size={14} className="fill-accent text-accent" />
                CORE BTR NEET-PG 2027
              </span>
              <span className="rounded-full bg-elevated px-3 py-1 text-xs font-semibold text-ink-muted border border-edge-soft">
                Dr. Zainab Vora Curriculum
              </span>
              <span className="rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 px-3 py-1 text-xs font-semibold">
                19 Subjects Integrated
              </span>
              {libraryState.totalVideosFound > 0 && (
                <span className="rounded-full bg-accent/15 text-accent border border-accent/30 px-3 py-1 text-xs font-bold flex items-center gap-1">
                  <FolderCheck size={13} />
                  {libraryState.totalVideosFound} Videos Linked
                </span>
              )}
            </div>
            <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight text-ink">
              NEET-PG 2027 Strategic Command & War Room
            </h2>
            <p className="mt-1 text-sm text-ink-muted max-w-2xl leading-relaxed">
              Phased syllabus execution, unannotated workbooks, 100 super-volatile tables, and synced local video lecture playback.
            </p>
          </div>

          {/* Dual Exam Countdowns & Quick Link Folder Button */}
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
          </div>
        </div>

        {/* Scan / Link Notice */}
        {scanNotice && (
          <div className="mt-4 rounded-2xl bg-accent/15 border border-accent/30 p-3.5 text-xs font-semibold text-accent flex items-center justify-between">
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

        {/* Readiness Meter */}
        <div className="mt-6 pt-6 border-t border-edge-soft grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium text-ink-muted">Mastery Readiness</span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-ink">{readiness.completionPercentage}%</span>
              <span className="text-xs text-ink-muted">target &gt;85%</span>
            </div>
            <div className="h-1.5 w-full bg-elevated rounded-full overflow-hidden mt-1">
              <div
                className="h-full bg-accent rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, readiness.completionPercentage)}%` }}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium text-ink-muted">Mastered / Annotated</span>
            <div className="flex items-baseline gap-1.5 text-2xl font-black text-emerald-400">
              {readiness.masteredCount + readiness.annotatedCount}
              <span className="text-xs font-semibold text-ink-muted">/ 19 subjects</span>
            </div>
            <span className="text-[11px] text-ink-muted">{readiness.masteredCount} fully mastered</span>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium text-ink-muted">Local BTR Files</span>
            <div className="flex items-baseline gap-1.5 text-2xl font-black text-amber-400">
              {libraryState.totalVideosFound}
              <span className="text-xs font-semibold text-ink-muted">videos</span>
            </div>
            <span className="text-[11px] text-ink-muted">
              {libraryState.totalPdfsFound} PDF workbooks indexed
            </span>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium text-ink-muted">Grand Tests Logged</span>
            <div className="flex items-baseline gap-1.5 text-2xl font-black text-ink">
              {gtRecords.length}
              <span className="text-xs font-semibold text-ink-muted">tests</span>
            </div>
            <span className="text-[11px] text-ink-muted">
              Latest: {gtRecords[0]?.percentile ?? 0}%ile
            </span>
          </div>
        </div>
      </div>

      {/* 2. Elite Power Hub: Official Broadcasts, 20th Subject, Mega BTR, Spotters & Advanced Suites */}
      <div className="flex flex-wrap items-center gap-2.5">
        <button
          type="button"
          onClick={() => setShowDripModal(true)}
          className="flex items-center gap-2 rounded-2xl bg-cyan-600/15 border border-cyan-500/30 px-3.5 py-2 text-xs font-bold text-cyan-300 hover:bg-cyan-600/25 transition shadow-xs"
        >
          <Droplets size={14} className="text-cyan-400" />
          <span>Daily Volatile Drip (FSRS)</span>
        </button>

        <button
          type="button"
          onClick={() => setShowBroadcastsModal(true)}
          className="flex items-center gap-2 rounded-2xl bg-red-600/15 border border-red-500/30 px-3.5 py-2 text-xs font-bold text-red-400 hover:bg-red-600/25 transition shadow-xs"
        >
          <Radio size={14} className="animate-pulse text-red-500" />
          <span>Core Drops (@corebtrbyzainabvora)</span>
        </button>

        <button
          type="button"
          onClick={() => setShowTwentyModal(true)}
          className="flex items-center gap-2 rounded-2xl bg-amber-500/15 border border-amber-500/30 px-3.5 py-2 text-xs font-bold text-amber-300 hover:bg-amber-500/25 transition shadow-xs"
        >
          <Layers size={14} className="text-amber-400" />
          <span>&quot;20th Subject&quot; Matrix</span>
        </button>

        <button
          type="button"
          onClick={() => setShowPyramidsModal(true)}
          className="flex items-center gap-2 rounded-2xl bg-amber-500/15 border border-amber-500/30 px-3.5 py-2 text-xs font-bold text-amber-300 hover:bg-amber-500/25 transition shadow-xs"
        >
          <Triangle size={14} className="text-amber-400" />
          <span>3-Tier Pyramids</span>
        </button>

        <button
          type="button"
          onClick={() => setShowTnDModal(true)}
          className="flex items-center gap-2 rounded-2xl bg-emerald-600/15 border border-emerald-500/30 px-3.5 py-2 text-xs font-bold text-emerald-400 hover:bg-emerald-600/25 transition shadow-xs"
        >
          <Target size={14} className="text-emerald-400" />
          <span>T&D Simulator (17 Papers)</span>
        </button>

        <button
          type="button"
          onClick={() => setShowMarathonModal(true)}
          className="flex items-center gap-2 rounded-2xl bg-emerald-600/15 border border-emerald-500/30 px-3.5 py-2 text-xs font-bold text-emerald-400 hover:bg-emerald-600/25 transition shadow-xs"
        >
          <Zap size={14} className="text-emerald-400" />
          <span>Mega BTR 72h Blitz</span>
        </button>

        <button
          type="button"
          onClick={() => setShowSpotterModal(true)}
          className="flex items-center gap-2 rounded-2xl bg-purple-600/15 border border-purple-500/30 px-3.5 py-2 text-xs font-bold text-purple-300 hover:bg-purple-600/25 transition shadow-xs"
        >
          <Eye size={14} className="text-purple-400" />
          <span>Spotter Image Bank</span>
        </button>

        <button
          type="button"
          onClick={() => setShowPdfSearchModal(true)}
          className="flex items-center gap-2 rounded-2xl bg-blue-600/15 border border-blue-500/30 px-3.5 py-2 text-xs font-bold text-blue-300 hover:bg-blue-600/25 transition shadow-xs"
        >
          <Search size={14} className="text-blue-400" />
          <span>Cross-PDF Search</span>
        </button>

        <button
          type="button"
          onClick={() => setShowVignetteModal(true)}
          className="flex items-center gap-2 rounded-2xl bg-teal-600/15 border border-teal-500/30 px-3.5 py-2 text-xs font-bold text-teal-300 hover:bg-teal-600/25 transition shadow-xs"
        >
          <Stethoscope size={14} className="text-teal-400" />
          <span>Two-Step Clinical Cases</span>
        </button>
      </div>

      {/* 3. Sub-Navigation Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-edge-soft pb-4">
        <div className="flex items-center gap-1.5 rounded-2xl bg-surface/80 p-1.5 border border-edge-soft">
          {[
            { id: "timeline", label: "19-Subject Master Tracker", icon: Target },
            { id: "medialibrary", label: "My BTR Videos & PDFs", icon: FolderCheck },
            { id: "volatiles", label: "Super-Volatiles Vault", icon: Zap },
            { id: "gt_analytics", label: "GT Calibrator & Strike Rate", icon: BarChart2 },
            { id: "strategy", label: "4-Phase BTR Strategy", icon: BookOpen },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeView === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveView(tab.id as typeof activeView)}
                className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition ${
                  isActive
                    ? "bg-accent text-white shadow-sm"
                    : "text-ink-muted hover:text-ink hover:bg-elevated"
                }`}
              >
                <Icon size={14} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Global Search / Folder Link Controls */}
        <div className="flex items-center gap-2.5">
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

          <button
            type="button"
            onClick={() => folderInputRef.current?.click()}
            className="flex items-center gap-1.5 rounded-xl bg-accent px-3 py-2 text-xs font-bold text-white shadow-sm hover:brightness-110 transition"
          >
            <FolderPlus size={14} />
            <span>Link BTR Folder</span>
          </button>

          {onStartQBankDrill && (
            <button
              type="button"
              onClick={() => onStartQBankDrill()}
              className="hidden sm:flex items-center gap-1.5 rounded-xl bg-elevated border border-edge-soft px-3 py-2 text-xs font-semibold text-ink hover:bg-raised transition"
            >
              <Zap size={14} className="text-accent" />
              <span>QBank Sprint</span>
            </button>
          )}

          {onOpenNotes && (
            <button
              type="button"
              onClick={onOpenNotes}
              className="hidden sm:flex items-center gap-1.5 rounded-xl bg-elevated border border-edge-soft px-3 py-2 text-xs font-semibold text-ink hover:bg-raised transition"
            >
              <FileText size={14} className="text-ink-muted" />
              <span>My Notes</span>
            </button>
          )}

          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
            <input
              type="text"
              placeholder="Search topics, drugs, bodies..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9 w-44 md:w-56 rounded-xl bg-surface border border-edge-soft pl-9 pr-3 text-xs text-ink placeholder:text-ink-muted focus:border-accent focus:outline-none transition"
            />
          </div>

          <div className="hidden lg:flex items-center gap-1 rounded-xl bg-surface border border-edge-soft p-1 text-xs">
            {(["ALL", "Pre-Clinical", "Para-Clinical", "Short Clinical", "Long Clinical"] as const).map(
              (cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategoryFilter(cat)}
                  className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold transition ${
                    categoryFilter === cat
                      ? "bg-elevated text-ink shadow-xs border border-edge"
                      : "text-ink-muted hover:text-ink"
                  }`}
                >
                  {cat === "ALL" ? "All Blocks" : cat.replace(" Clinical", "")}
                </button>
              )
            )}
          </div>
        </div>
      </div>

      {/* 3. TAB CONTENT */}

      {/* VIEW 1: 19-SUBJECT MASTER TRACKER */}
      {activeView === "timeline" && (
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
                in_progress: "bg-amber-500/15 text-amber-400 border-amber-500/30",
                btr_annotated: "bg-blue-500/15 text-blue-400 border-blue-500/30",
                td_completed: "bg-purple-500/15 text-purple-400 border-purple-500/30",
                mastered: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
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

                    <h3 className="text-base font-bold text-ink leading-snug group-hover:text-accent transition">
                      {subj.name}
                    </h3>
                    <p className="text-xs text-ink-muted leading-relaxed line-clamp-2">
                      {subj.description}
                    </p>

                    {/* Local Media Indicators */}
                    <div className="flex flex-wrap items-center gap-1.5 mt-1">
                      {videosCount > 0 ? (
                        <span className="text-[10.5px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-lg flex items-center gap-1">
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
                        <span className="text-[10px] font-semibold text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded-md">
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
                            className="flex items-center gap-1 rounded-lg bg-emerald-600 px-2 py-1 text-[11px] font-bold text-white shadow-xs hover:brightness-110 transition"
                          >
                            <Layers size={11} />
                            <span>Dual</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handlePlayLecture(media.videos[0], subj)}
                            className="flex items-center gap-1 rounded-lg bg-accent px-2 py-1 text-[11px] font-bold text-white shadow-xs hover:brightness-110 transition"
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
                      <select
                        aria-label={`Update progress status for ${subj.name}`}
                        value={currentStatus}
                        onChange={(e) =>
                          handleStatusChange(subj.id, e.target.value as BTRProgressStatus)
                        }
                        className="rounded-lg bg-elevated border border-edge-soft text-[11px] font-medium text-ink px-2 py-1 focus:outline-none focus:border-accent"
                      >
                        <option value="unread">Unread</option>
                        <option value="in_progress">In Progress</option>
                        <option value="btr_annotated">BTR Annotated</option>
                        <option value="td_completed">T&D Complete</option>
                        <option value="mastered">Mastered</option>
                      </select>

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
      )}

      {/* VIEW 2: BTR MEDIA & PDF LIBRARY */}
      {activeView === "medialibrary" && (
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
              onClick={() => folderInputRef.current?.click()}
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
                <Flame size={16} className="text-accent fill-accent" />
                <h4 className="text-sm font-bold text-ink">Mega BTR & INI-CET Rapid Revisions</h4>
                <span className="text-[11px] font-semibold text-emerald-400 rounded-full bg-emerald-500/15 px-2 py-0.5 border border-emerald-500/25">
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
                <span className="text-[11px] font-semibold text-purple-400 rounded-full bg-purple-500/15 px-2 py-0.5 border border-purple-500/25">
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
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-500/15 text-purple-400 border border-purple-500/25 shrink-0">
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

      {/* VIEW 3: SUPER-VOLATILES VAULT (ACTIVE RECALL BLUR MASK) */}
      {activeView === "volatiles" && (
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

      {/* Advanced BTR Modals: Split-Screen Workstation, Anki Exporter, and GT Error Vault */}
      {workstationSession && (
        <BTRSplitWorkstation
          open={true}
          onClose={() => setWorkstationSession(null)}
          video={workstationSession.video}
          subject={workstationSession.subject}
          unannotatedPdf={workstationSession.unannotatedPdf}
          annotatedPdf={workstationSession.annotatedPdf}
        />
      )}
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
            const url = matchedPdf.fullPath.startsWith("file://")
              ? matchedPdf.fullPath
              : `file://${matchedPdf.fullPath}`;
            window.open(`${url}#page=${pageNumber}`, "_blank");
          }
        }}
      />

      {/* Two-Step Clinical Case Drill */}
      <BTRVignetteModal open={showVignetteModal} onClose={() => setShowVignetteModal(false)} />
    </div>
  );
}
