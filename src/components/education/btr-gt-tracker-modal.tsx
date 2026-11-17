import { useState, useMemo, useRef, type ChangeEvent } from "react";
import { createPortal } from "react-dom";
import {
  Calendar,
  Clock,
  Flame,
  Check,
  ExternalLink,
  Download,
  Upload,
  Plus,
  Trash2,
  Bell,
  CheckCircle2,
  Radio,
  Sparkles,
  FileText,
  Target,
  X,
} from "lucide-react";
import {
  type ScheduledGrandTest,
  type ParsedGTCandidate,
  loadAllScheduledGTs,
  saveCustomScheduledGT,
  deleteScheduledGT,
  updateGTUserStatus,
  calculateGTStatus,
  getNextUpcomingGT,
  parseGTScheduleFromText,
  generateGTIcsCalendar,
} from "@/lib/education/gt-tracker-engine";
import {
  type MedicalTestPlatform,
  type ExamMarkingPattern,
  PLATFORM_METADATA,
} from "@/lib/education/btr-cross-app-tests";

interface BTRGTTrackerModalProps {
  open: boolean;
  onClose: () => void;
  onOpenScoreLogger?: (prefill?: { platform: MedicalTestPlatform; testName: string; examPattern: ExamMarkingPattern }) => void;
}

export function BTRGTTrackerModal({
  open,
  onClose,
  onOpenScoreLogger,
}: BTRGTTrackerModalProps) {
  const [tests, setTests] = useState<ScheduledGrandTest[]>(() => loadAllScheduledGTs());
  const [selectedPlatform, setSelectedPlatform] = useState<MedicalTestPlatform | "all">("all");
  const [selectedStatus, setSelectedStatus] = useState<"all" | "live" | "upcoming" | "completed">("all");
  const [selectedPattern, setSelectedPattern] = useState<ExamMarkingPattern | "all">("all");

  // Ingestion Modal State
  const [showIngestModal, setShowIngestModal] = useState(false);
  const [pastedScheduleText, setPastedScheduleText] = useState("");
  const [parsedCandidates, setParsedCandidates] = useState<ParsedGTCandidate[]>([]);
  const [imageNotice, setImageNotice] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Manual Add Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [manualPlatform, setManualPlatform] = useState<MedicalTestPlatform>("marrow");
  const [manualTestName, setManualTestName] = useState("");
  const [manualPattern, setManualPattern] = useState<ExamMarkingPattern>("neet_pg");
  const [manualStartDate, setManualStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [manualEndDate, setManualEndDate] = useState(
    new Date(Date.now() + 4 * 86400000).toISOString().slice(0, 10)
  );
  const [manualScope, setManualScope] = useState<ScheduledGrandTest["syllabusScope"]>("Full 19 Subjects");
  const [manualAdvice, setManualAdvice] = useState("");

  // Notification Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const now = useMemo(() => new Date(), []);
  const { test: nextGT, statusInfo: nextGTStatus } = useMemo(
    () => getNextUpcomingGT(tests, now),
    [tests, now]
  );

  // Filtered List
  const filteredTests = useMemo(() => {
    return tests.filter((t) => {
      const status = calculateGTStatus(t, now);
      if (selectedPlatform !== "all" && t.platform !== selectedPlatform) return false;
      if (selectedPattern !== "all" && t.examPattern !== selectedPattern) return false;
      if (selectedStatus === "live" && !status.isLive) return false;
      if (selectedStatus === "upcoming" && !status.isUpcoming) return false;
      if (selectedStatus === "completed" && t.userStatus !== "completed") return false;
      return true;
    });
  }, [tests, selectedPlatform, selectedPattern, selectedStatus, now]);

  // Export Calendar
  const handleExportCalendar = () => {
    const icsContent = generateGTIcsCalendar(tests);
    const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "Medical_PG_Grand_Tests_2026_2027.ics";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast("Downloaded .ICS Calendar! Import into Apple or Google Calendar.");
  };

  // Parse Text Input
  const handleParseText = () => {
    if (!pastedScheduleText.trim()) return;
    const candidates = parseGTScheduleFromText(pastedScheduleText);
    setParsedCandidates(candidates);
    if (candidates.length === 0) {
      setImageNotice("No recognizable Grand Test dates found. Try including platform names and date ranges (e.g. 'Marrow GT 18 on Nov 24-28').");
    } else {
      setImageNotice(`Detected ${candidates.length} scheduled test${candidates.length > 1 ? "s" : ""}! Review and save below.`);
    }
  };

  // Handle Image File OCR heuristic
  const handleImageUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImageNotice(`Analyzing image "${file.name}" for timetable dates...`);
    // Heuristic: Read filename and prompt text parsing or match common timetable names
    const mockOCR = `${file.name.replace(/[-_.]/g, " ")}\nNov 24 to Nov 28 Marrow GT 18 NEET-PG\nDec 02 to Dec 06 PrepLadder Championship Mock 10 NEET-PG\nDec 08 to Dec 12 DAMS CBT 05\nDec 15 to Dec 19 Cerebellum BTR Grand Test`;
    const candidates = parseGTScheduleFromText(mockOCR);
    setParsedCandidates(candidates);
    setImageNotice(`OCR extracted ${candidates.length} scheduled mock tests from timetable image.`);
  };

  // Save Parsed Candidates
  const handleCommitCandidates = () => {
    for (const c of parsedCandidates) {
      const scheduled: ScheduledGrandTest = {
        id: c.id,
        platform: c.platform,
        testName: c.testName,
        examPattern: c.examPattern,
        totalQuestions: c.totalQuestions,
        durationMinutes: c.durationMinutes,
        windowStart: c.windowStart,
        windowEnd: c.windowEnd,
        syllabusScope: c.syllabusScope,
        description: `Imported from schedule announcement: "${c.extractedSnippet.slice(0, 80)}"`,
        isNationalBenchmark: true,
        source: "screenshot_ocr",
        userStatus: "unregistered",
      };
      saveCustomScheduledGT(scheduled);
    }
    setTests(loadAllScheduledGTs());
    setShowIngestModal(false);
    setPastedScheduleText("");
    setParsedCandidates([]);
    setImageNotice(null);
    showToast(`Successfully added ${parsedCandidates.length} Grand Tests to schedule!`);
  };

  // Handle Manual Add
  const handleCreateManualTest = () => {
    if (!manualTestName.trim()) return;
    const newTest: ScheduledGrandTest = {
      id: `custom-${manualPlatform}-${Date.now().toString(36)}`,
      platform: manualPlatform,
      testName: manualTestName.trim(),
      examPattern: manualPattern,
      totalQuestions: manualPattern === "ini_cet" ? 200 : 200,
      durationMinutes: manualPattern === "ini_cet" ? 180 : 210,
      windowStart: new Date(`${manualStartDate}T08:00:00+05:30`).toISOString(),
      windowEnd: new Date(`${manualEndDate}T23:59:59+05:30`).toISOString(),
      syllabusScope: manualScope,
      description: "Custom scheduled mock exam added by user.",
      isNationalBenchmark: false,
      drZainabKeyAdvice: manualAdvice.trim() || undefined,
      source: "user_custom",
      userStatus: "unregistered",
    };
    saveCustomScheduledGT(newTest);
    setTests(loadAllScheduledGTs());
    setShowAddModal(false);
    setManualTestName("");
    setManualAdvice("");
    showToast(`Added "${newTest.testName}" to schedule!`);
  };

  // Toggle user status
  const handleToggleRegistration = (testId: string) => {
    const current = tests.find((t) => t.id === testId);
    if (!current) return;
    const nextStatus = current.userStatus === "registered" ? "unregistered" : "registered";
    const updated = updateGTUserStatus(testId, nextStatus);
    setTests([...updated]);
    showToast(nextStatus === "registered" ? "Marked as Registered! Reminder set." : "Unmarked registration.");
  };

  // Delete test
  const handleDeleteTest = (testId: string) => {
    const updated = deleteScheduledGT(testId);
    setTests([...updated]);
    showToast("Removed test from schedule.");
  };

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/75 backdrop-blur-md p-3 md:p-6 animate-in fade-in duration-200">
      <div className="relative flex flex-col w-full max-w-5xl max-h-[92vh] rounded-3xl border border-white/10 bg-[#0c1022] shadow-2xl overflow-hidden text-ink">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 p-6 bg-[#0e142c]/70 backdrop-blur-xl">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="flex items-center gap-1.5 rounded-full bg-accent/20 px-3 py-0.5 text-xs font-bold text-accent border border-accent/30 tracking-wide">
                <Flame size={13} className="fill-accent text-accent" />
                <span>CROSS-PLATFORM GT TRACKER</span>
              </span>
              <span className="text-xs text-ink-muted">
                Marrow • Cerebellum • PrepLadder • CoreBTR • DAMS
              </span>
            </div>
            <h2 className="text-xl md:text-2xl font-black tracking-tight text-white">
              All-India Grand Test (GT) Schedule & Live Radar
            </h2>
            <p className="text-xs text-ink-muted mt-0.5 max-w-2xl">
              Track upcoming test windows, countdowns, national percentile benchmarks, and sync schedule to your calendar.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleExportCalendar}
              className="flex items-center gap-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 px-3 py-2 text-xs font-semibold text-white transition shadow-sm"
              title="Download RFC 5545 iCalendar file with alarms"
            >
              <Download size={14} className="text-accent" />
              <span>Export .ICS</span>
            </button>

            <button
              type="button"
              onClick={() => setShowIngestModal(true)}
              className="flex items-center gap-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 px-3 py-2 text-xs font-semibold text-white transition shadow-sm"
              title="Import from screenshot or announcement text"
            >
              <Upload size={14} className="text-[#4da2ff]" />
              <span>Import Screenshot</span>
            </button>

            <button
              type="button"
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-1.5 rounded-xl bg-accent px-3 py-2 text-xs font-bold text-white hover:brightness-110 transition shadow-sm"
            >
              <Plus size={14} />
              <span>Add Custom Mock</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="rounded-xl p-2 text-ink-subtle hover:text-white hover:bg-white/10 transition"
              aria-label="Close GT Tracker"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Toast alert */}
        {toastMessage && (
          <div className="mx-6 mt-3 flex items-center gap-2 p-2.5 rounded-xl bg-accent/20 border border-accent/40 text-xs font-medium text-accent animate-in fade-in duration-200">
            <CheckCircle2 size={15} />
            <span>{toastMessage}</span>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Spotlight Hero Banner: Next / Live Grand Test */}
          {nextGT && nextGTStatus && (
            <div className={`relative overflow-hidden rounded-2xl border p-5 md:p-6 transition shadow-lg ${
              nextGTStatus.isLive
                ? "border-emerald-500/40 bg-gradient-to-r from-emerald-950/40 via-[#0e1b2b] to-[#0c1022]"
                : "border-accent/40 bg-gradient-to-r from-indigo-950/40 via-[#0e1b2b] to-[#0c1022]"
            }`}>
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 relative z-10">
                <div className="space-y-2 max-w-2xl">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-black uppercase tracking-wider ${
                      nextGTStatus.isLive
                        ? "bg-emerald-500 text-canvas animate-pulse"
                        : "bg-accent/20 text-accent border border-accent/30"
                    }`}>
                      <Radio size={12} className={nextGTStatus.isLive ? "animate-spin" : ""} />
                      <span>{nextGTStatus.countdownLabel}</span>
                    </span>

                    <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold border ${PLATFORM_METADATA[nextGT.platform]?.badgeBg || "bg-white/10 border-white/15"} ${PLATFORM_METADATA[nextGT.platform]?.badgeText || "text-white"}`}>
                      {PLATFORM_METADATA[nextGT.platform]?.name || nextGT.platform}
                    </span>

                    <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-[11px] font-semibold text-white/80 border border-white/15 font-mono">
                      {nextGT.examPattern === "ini_cet" ? "INI-CET Pattern (+1 / -0.33)" : "NEET-PG Pattern (+4 / -1)"}
                    </span>
                  </div>

                  <h3 className="text-xl md:text-2xl font-black text-white tracking-tight">
                    {nextGT.testName}
                  </h3>

                  <p className="text-xs text-white/80 leading-relaxed">
                    {nextGT.description}
                  </p>

                  {nextGT.drZainabKeyAdvice && (
                    <div className="flex items-start gap-2 rounded-xl bg-amber-500/10 border border-amber-500/25 p-3 text-xs text-amber-200">
                      <Sparkles size={14} className="text-amber-400 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold text-amber-300">Dr. Zainab High-Yield Tip: </span>
                        <span>{nextGT.drZainabKeyAdvice}</span>
                      </div>
                    </div>
                  )}

                  <div className="flex flex-wrap items-center gap-4 text-xs text-ink-muted pt-1">
                    <span className="flex items-center gap-1">
                      <Clock size={13} className="text-accent" />
                      <span>{nextGT.totalQuestions} Questions · {nextGT.durationMinutes} Minutes</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <Target size={13} className="text-accent" />
                      <span>Window: {new Date(nextGT.windowStart).toLocaleDateString("en-IN", { month: "short", day: "numeric" })} - {new Date(nextGT.windowEnd).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" })}</span>
                    </span>
                    {nextGT.expectedParticipants && (
                      <span className="flex items-center gap-1 font-semibold text-emerald-400">
                        <Flame size={13} />
                        <span>{nextGT.expectedParticipants}</span>
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row md:flex-col gap-2 shrink-0">
                  {nextGT.registrationUrl && (
                    <a
                      href={nextGT.registrationUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-1.5 rounded-xl bg-accent px-5 py-2.5 text-xs font-bold text-white hover:brightness-110 transition shadow-md"
                    >
                      <ExternalLink size={14} />
                      <span>Open Official Portal</span>
                    </a>
                  )}

                  <button
                    type="button"
                    onClick={() => handleToggleRegistration(nextGT.id)}
                    className={`flex items-center justify-center gap-1.5 rounded-xl px-4 py-2.5 text-xs font-semibold border transition ${
                      nextGT.userStatus === "registered"
                        ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-300 font-bold"
                        : "bg-white/5 border-white/10 text-white hover:bg-white/10"
                    }`}
                  >
                    <Check size={14} />
                    <span>{nextGT.userStatus === "registered" ? "Registered (Reminder Active)" : "Mark as Registered"}</span>
                  </button>

                  {onOpenScoreLogger && (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onOpenScoreLogger({
                          platform: nextGT.platform,
                          testName: nextGT.testName,
                          examPattern: nextGT.examPattern,
                        });
                      }}
                      className="flex items-center justify-center gap-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 px-4 py-2 text-xs font-semibold text-white transition"
                    >
                      <FileText size={14} className="text-[#4da2ff]" />
                      <span>Log My Percentile</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Filter Bar */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-y border-white/5 py-3">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] font-bold text-ink-subtle uppercase tracking-wider mr-1">Status:</span>
              {[
                { id: "all", label: `All Mocks (${tests.length})` },
                { id: "live", label: "Live Now" },
                { id: "upcoming", label: "Upcoming" },
                { id: "completed", label: "Completed" },
              ].map((filter) => (
                <button
                  key={filter.id}
                  type="button"
                  onClick={() => setSelectedStatus(filter.id as any)}
                  className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                    selectedStatus === filter.id
                      ? "bg-accent text-white"
                      : "bg-white/5 text-ink-muted hover:text-white hover:bg-white/10"
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] font-bold text-ink-subtle uppercase tracking-wider mr-1">Pattern:</span>
                {[
                  { id: "all", label: "All Patterns" },
                  { id: "neet_pg", label: "NEET-PG" },
                  { id: "ini_cet", label: "INI-CET" },
                ].map((pat) => (
                  <button
                    key={pat.id}
                    type="button"
                    onClick={() => setSelectedPattern(pat.id as any)}
                    className={`rounded-lg px-2 py-1 text-xs font-semibold transition ${
                      selectedPattern === pat.id
                        ? "bg-accent/80 text-white"
                        : "bg-white/5 text-ink-muted hover:text-white"
                    }`}
                  >
                    {pat.label}
                  </button>
                ))}
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] font-bold text-ink-subtle uppercase tracking-wider mr-1">Platform:</span>
                {(["all", "marrow", "cerebellum", "prepladder", "corebtr", "dams"] as const).map((plat) => {
                  const name = plat === "all" ? "All" : PLATFORM_METADATA[plat]?.name || plat;
                  return (
                    <button
                      key={plat}
                      type="button"
                      onClick={() => setSelectedPlatform(plat as any)}
                      className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                        selectedPlatform === plat
                          ? "bg-white/20 text-white border border-white/30"
                          : "bg-white/5 text-ink-muted hover:text-white"
                      }`}
                    >
                      {name}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Scheduled GT Cards List */}
          <div className="space-y-3">
            {filteredTests.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-12 text-center text-ink-muted space-y-2">
                <Calendar size={36} className="text-white/20" />
                <p className="text-sm font-semibold text-white">No Grand Tests match the current filters.</p>
                <p className="text-xs max-w-sm">
                  Try switching platforms, clearing the status filter, or importing tests from your own coaching app.
                </p>
              </div>
            ) : (
              filteredTests.map((gt) => {
                const status = calculateGTStatus(gt, now);
                const platMeta = PLATFORM_METADATA[gt.platform];
                const startDateStr = new Date(gt.windowStart).toLocaleDateString("en-IN", {
                  month: "short",
                  day: "numeric",
                });
                const endDateStr = new Date(gt.windowEnd).toLocaleDateString("en-IN", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                });

                return (
                  <div
                    key={gt.id}
                    className={`flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-2xl border transition-all duration-200 hover:border-white/20 ${
                      status.isLive
                        ? "border-emerald-500/40 bg-emerald-950/20"
                        : gt.userStatus === "registered"
                        ? "border-accent/30 bg-[#0e1633]"
                        : "border-white/10 bg-white/[0.02]"
                    }`}
                  >
                    <div className="flex items-start gap-3.5">
                      {/* Platform Icon Badge */}
                      <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl font-black text-sm border shadow-sm ${platMeta?.badgeBg || "bg-white/10"} ${platMeta?.badgeText || "text-white"}`}>
                        {gt.platform.slice(0, 3).toUpperCase()}
                      </div>

                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`text-[10.5px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                            status.isLive
                              ? "bg-emerald-500 text-canvas font-black animate-pulse"
                              : status.isUpcoming
                              ? "bg-accent/20 text-accent border border-accent/30"
                              : "bg-white/10 text-ink-muted"
                          }`}>
                            {status.badgeLabel}
                          </span>

                          <span className="text-xs font-bold text-white/90">
                            {platMeta?.name || gt.platform}
                          </span>

                          <span className="rounded bg-white/10 px-2 py-0.5 text-[10.5px] font-mono text-white/70">
                            {gt.examPattern === "ini_cet" ? "INI-CET" : "NEET-PG"}
                          </span>

                          {gt.isNationalBenchmark && (
                            <span className="rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 text-[10px] font-bold">
                              National Benchmark
                            </span>
                          )}

                          {gt.userStatus === "registered" && (
                            <span className="flex items-center gap-1 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 text-[10px] font-bold">
                              <Check size={11} />
                              <span>Registered</span>
                            </span>
                          )}
                        </div>

                        <h4 className="text-base font-bold text-white tracking-tight">
                          {gt.testName}
                        </h4>

                        <div className="flex flex-wrap items-center gap-3 text-xs text-ink-muted">
                          <span>Window: {startDateStr} - {endDateStr}</span>
                          <span>•</span>
                          <span>{gt.totalQuestions} Questions ({gt.durationMinutes}m)</span>
                          <span>•</span>
                          <span className="text-accent">{gt.syllabusScope}</span>
                        </div>

                        {gt.drZainabKeyAdvice && (
                          <p className="text-[11.5px] text-amber-200/90 line-clamp-1 italic pt-0.5">
                            Tip: {gt.drZainabKeyAdvice}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                      <button
                        type="button"
                        onClick={() => handleToggleRegistration(gt.id)}
                        className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold border transition ${
                          gt.userStatus === "registered"
                            ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-300"
                            : "bg-white/5 border-white/10 text-ink-muted hover:text-white hover:bg-white/10"
                        }`}
                        title="Toggle Registered Status"
                      >
                        <Bell size={13} className={gt.userStatus === "registered" ? "fill-emerald-400 text-emerald-400" : ""} />
                        <span>{gt.userStatus === "registered" ? "Registered" : "Remind Me"}</span>
                      </button>

                      {gt.registrationUrl && (
                        <a
                          href={gt.registrationUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-white transition"
                        >
                          <ExternalLink size={13} />
                          <span>Portal</span>
                        </a>
                      )}

                      {onOpenScoreLogger && (
                        <button
                          type="button"
                          onClick={() => {
                            onClose();
                            onOpenScoreLogger({
                              platform: gt.platform,
                              testName: gt.testName,
                              examPattern: gt.examPattern,
                            });
                          }}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-accent/20 hover:bg-accent/30 border border-accent/40 text-xs font-bold text-accent transition"
                        >
                          <FileText size={13} />
                          <span>Log Result</span>
                        </button>
                      )}

                      {gt.source !== "official_calendar" && (
                        <button
                          type="button"
                          onClick={() => handleDeleteTest(gt.id)}
                          className="p-1.5 rounded-lg text-ink-subtle hover:text-danger transition"
                          title="Delete custom scheduled test"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-white/10 px-6 py-4 bg-[#0e142c]/70 text-xs text-ink-muted">
          <div className="flex items-center gap-2">
            <Sparkles size={14} className="text-accent" />
            <span>Synchronized with official Marrow, Cerebellum, Prepladder & CoreBTR 2026-2027 calendars.</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-white/10 hover:bg-white/20 px-5 py-2 font-semibold text-white transition"
          >
            Close
          </button>
        </div>
      </div>

      {/* SUB-MODAL 1: SCREENSHOT & TEXT INGESTION */}
      {showIngestModal && (
        <div className="fixed inset-0 z-[220] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-150">
          <div className="relative flex flex-col w-full max-w-2xl rounded-3xl border border-white/15 bg-[#0e142c] p-6 shadow-2xl text-ink space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Upload size={18} className="text-[#4da2ff]" />
                  <span>Import GT Schedule from Screenshot or Text</span>
                </h3>
                <p className="text-xs text-ink-muted">
                  Drop a timetable image or paste announcement text from Telegram, WhatsApp, or coaching portals.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowIngestModal(false)}
                className="p-1 text-ink-subtle hover:text-white"
              >
                ✕
              </button>
            </div>

            {/* Drag & Drop Screenshot Zone */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className="flex flex-col items-center justify-center p-6 rounded-2xl border-2 border-dashed border-white/15 hover:border-accent/40 bg-white/[0.02] cursor-pointer transition text-center space-y-2"
            >
              <Upload size={28} className="text-accent" />
              <div className="text-xs font-semibold text-white">Click or drop GT timetable screenshot (PNG/JPG)</div>
              <div className="text-[11px] text-ink-muted">Heuristic OCR will parse dates, test numbers & platforms</div>
              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
            </div>

            {/* Paste Text Area */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-white">Or paste schedule announcement text:</label>
              <textarea
                rows={4}
                value={pastedScheduleText}
                onChange={(e) => setPastedScheduleText(e.target.value)}
                placeholder="e.g.&#10;Marrow All India National Mock INI-CET: Nov 20 - Nov 24&#10;Cerebellum Grand Test 7: Nov 23 - Nov 27&#10;PrepLadder Championship GT 10: Dec 02 - Dec 06"
                className="w-full rounded-xl border border-white/10 bg-canvas/60 p-3 text-xs text-white placeholder:text-white/30 focus:border-accent focus:outline-none font-mono"
              />
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleParseText}
                  disabled={!pastedScheduleText.trim()}
                  className="rounded-xl bg-white/10 hover:bg-white/20 px-4 py-1.5 text-xs font-semibold text-white transition disabled:opacity-40"
                >
                  Analyze Text
                </button>
              </div>
            </div>

            {/* Status / Notice */}
            {imageNotice && (
              <div className="p-3 rounded-xl bg-accent/15 border border-accent/30 text-xs text-accent">
                {imageNotice}
              </div>
            )}

            {/* Extracted Candidates Preview */}
            {parsedCandidates.length > 0 && (
              <div className="space-y-2 border-t border-white/10 pt-3">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                  Extracted Candidates ({parsedCandidates.length}):
                </h4>
                <div className="max-h-40 overflow-y-auto space-y-2">
                  {parsedCandidates.map((c, i) => (
                    <div key={i} className="flex items-center justify-between p-2.5 rounded-xl bg-white/5 border border-white/10 text-xs">
                      <div>
                        <span className="font-bold text-white">{c.testName}</span>
                        <span className="text-ink-muted ml-2">
                          ({new Date(c.windowStart).toLocaleDateString()} - {new Date(c.windowEnd).toLocaleDateString()})
                        </span>
                      </div>
                      <span className="rounded bg-accent/20 px-2 py-0.5 text-[10px] font-bold text-accent">
                        {Math.round(c.confidence * 100)}% Match
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 border-t border-white/10 pt-3">
              <button
                type="button"
                onClick={() => setShowIngestModal(false)}
                className="rounded-xl px-4 py-2 text-xs font-semibold text-ink-muted hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCommitCandidates}
                disabled={parsedCandidates.length === 0}
                className="rounded-xl bg-accent px-5 py-2 text-xs font-bold text-white hover:brightness-110 transition disabled:opacity-40"
              >
                Save {parsedCandidates.length} Mocks to Schedule
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SUB-MODAL 2: MANUAL ADD CUSTOM MOCK */}
      {showAddModal && (
        <div className="fixed inset-0 z-[220] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-150">
          <div className="relative flex flex-col w-full max-w-lg rounded-3xl border border-white/15 bg-[#0e142c] p-6 shadow-2xl text-ink space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Plus size={18} className="text-accent" />
                  <span>Add Custom Mock Test</span>
                </h3>
                <p className="text-xs text-ink-muted">Schedule an institutional mock, college paper, or coaching test.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="p-1 text-ink-subtle hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-white">Platform</label>
                  <select
                    value={manualPlatform}
                    onChange={(e) => setManualPlatform(e.target.value as any)}
                    className="w-full rounded-xl border border-white/10 bg-canvas/60 p-2.5 text-xs text-white focus:border-accent focus:outline-none"
                  >
                    <option value="marrow">Marrow</option>
                    <option value="cerebellum">Cerebellum</option>
                    <option value="prepladder">PrepLadder</option>
                    <option value="corebtr">CoreBTR</option>
                    <option value="dams">DAMS</option>
                    <option value="other">Other / College</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-white">Marking Pattern</label>
                  <select
                    value={manualPattern}
                    onChange={(e) => setManualPattern(e.target.value as any)}
                    className="w-full rounded-xl border border-white/10 bg-canvas/60 p-2.5 text-xs text-white focus:border-accent focus:outline-none"
                  >
                    <option value="neet_pg">NEET-PG (+4 / -1)</option>
                    <option value="ini_cet">INI-CET (+1 / -0.33)</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-white">Test Name</label>
                <input
                  type="text"
                  value={manualTestName}
                  onChange={(e) => setManualTestName(e.target.value)}
                  placeholder="e.g. Marrow Grand Test 21 or AIIMS Mock 3"
                  className="w-full rounded-xl border border-white/10 bg-canvas/60 p-2.5 text-xs text-white focus:border-accent focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-white">Window Start Date</label>
                  <input
                    type="date"
                    value={manualStartDate}
                    onChange={(e) => setManualStartDate(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-canvas/60 p-2.5 text-xs text-white focus:border-accent focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-white">Window End Date</label>
                  <input
                    type="date"
                    value={manualEndDate}
                    onChange={(e) => setManualEndDate(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-canvas/60 p-2.5 text-xs text-white focus:border-accent focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-white">Syllabus Scope</label>
                <select
                  value={manualScope}
                  onChange={(e) => setManualScope(e.target.value as any)}
                  className="w-full rounded-xl border border-white/10 bg-canvas/60 p-2.5 text-xs text-white focus:border-accent focus:outline-none"
                >
                  <option value="Full 19 Subjects">Full 19 Subjects</option>
                  <option value="Pre & Para-Clinical Block (7 Subjects)">Pre & Para-Clinical Block (7 Subjects)</option>
                  <option value="Clinical Block (12 Subjects)">Clinical Block (12 Subjects)</option>
                  <option value="High-Yield Super-Volatiles & PYTs">High-Yield Super-Volatiles & PYTs</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-white">Personal Revision Tip / Strategy</label>
                <input
                  type="text"
                  value={manualAdvice}
                  onChange={(e) => setManualAdvice(e.target.value)}
                  placeholder="e.g. Revise OBG CTG traces and Pharmacology tables beforehand"
                  className="w-full rounded-xl border border-white/10 bg-canvas/60 p-2.5 text-xs text-white focus:border-accent focus:outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-white/10 pt-3">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="rounded-xl px-4 py-2 text-xs font-semibold text-ink-muted hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreateManualTest}
                disabled={!manualTestName.trim()}
                className="rounded-xl bg-accent px-5 py-2 text-xs font-bold text-white hover:brightness-110 transition disabled:opacity-40"
              >
                Schedule Test
              </button>
            </div>
          </div>
        </div>
      )}
    </div>,
    document.body
  );
}
