import { useState, useMemo } from "react";
import {
  X,
  Target,
  Plus,
  Trash2,
  Check,
  AlertTriangle,
  BarChart2,
  Brain,
} from "lucide-react";
import {
  PLATFORM_METADATA,
  calculateNormalizedTestMetrics,
  loadCrossAppTestRecords,
  saveCrossAppTestRecord,
  deleteCrossAppTestRecord,
  calculateCrossAppAnalytics,
  type CrossAppTestRecord,
  type MedicalTestPlatform,
  type ExamMarkingPattern,
} from "@/lib/education/btr-cross-app-tests";
import { saveBTRErrorItem } from "@/lib/education/btr-error-vault";

interface BTRCrossAppTestsModalProps {
  open: boolean;
  onClose: () => void;
  onNavigateToVault?: () => void;
}

export function BTRCrossAppTestsModal({
  open,
  onClose,
  onNavigateToVault,
}: BTRCrossAppTestsModalProps) {
  const [records, setRecords] = useState<CrossAppTestRecord[]>(() => loadCrossAppTestRecords());
  const [selectedPlatformFilter, setSelectedPlatformFilter] = useState<MedicalTestPlatform | "all">("all");
  const [activeTab, setActiveTab] = useState<"records" | "log" | "analytics">("records");
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  // Form State
  const [formPlatform, setFormPlatform] = useState<MedicalTestPlatform>("marrow");
  const [formPattern, setFormPattern] = useState<ExamMarkingPattern>("neet_pg");
  const [formTestName, setFormTestName] = useState("");
  const [formDate, setFormDate] = useState(new Date().toISOString().slice(0, 10));
  const formTotalQuestions = 200;
  const [formCorrect, setFormCorrect] = useState(142);
  const [formIncorrect, setFormIncorrect] = useState(48);
  const [formUnattempted, setFormUnattempted] = useState(10);
  const [formPercentile, setFormPercentile] = useState(87.5);
  const [formRank, setFormRank] = useState<number | undefined>(4500);
  const [formCandidates, setFormCandidates] = useState<number | undefined>(36000);
  const [formSillyMistakes, setFormSillyMistakes] = useState(14);
  const [formKnowledgeGaps, setFormKnowledgeGaps] = useState(24);
  const [formWeakSubjects, setFormWeakSubjects] = useState("Pharmacology, Microbiology");
  const [formNotes, setFormNotes] = useState("");

  const analytics = useMemo(() => calculateCrossAppAnalytics(records), [records]);

  // Live Metrics Preview
  const liveMetrics = useMemo(() => {
    return calculateNormalizedTestMetrics({
      examPattern: formPattern,
      totalQuestions: formTotalQuestions,
      correctCount: formCorrect,
      incorrectCount: formIncorrect,
      unattemptedCount: formUnattempted,
      sillyMistakesCount: formSillyMistakes,
    });
  }, [formPattern, formTotalQuestions, formCorrect, formIncorrect, formUnattempted, formSillyMistakes]);

  const filteredRecords = useMemo(() => {
    if (selectedPlatformFilter === "all") return records;
    return records.filter((r) => r.platform === selectedPlatformFilter);
  }, [records, selectedPlatformFilter]);

  if (!open) return null;

  const handleSaveTest = () => {
    const calculated = calculateNormalizedTestMetrics({
      examPattern: formPattern,
      totalQuestions: formTotalQuestions,
      correctCount: formCorrect,
      incorrectCount: formIncorrect,
      unattemptedCount: formUnattempted,
      sillyMistakesCount: formSillyMistakes,
    });

    const newRecord: CrossAppTestRecord = {
      id: `test-${Date.now()}`,
      platform: formPlatform,
      testName: formTestName.trim() || `${PLATFORM_METADATA[formPlatform].name} Mock Test`,
      examPattern: formPattern,
      date: formDate,
      totalQuestions: formTotalQuestions,
      correctCount: formCorrect,
      incorrectCount: formIncorrect,
      unattemptedCount: formUnattempted,
      rawMarks: calculated.rawMarks,
      maxMarks: calculated.maxMarks,
      normalizedPercentage: calculated.normalizedPercentage,
      accuracyPercentage: calculated.accuracyPercentage,
      percentile: formPercentile ? Number(formPercentile) : undefined,
      rank: formRank ? Number(formRank) : undefined,
      totalCandidates: formCandidates ? Number(formCandidates) : undefined,
      sillyMistakesCount: formSillyMistakes,
      knowledgeGapsCount: formKnowledgeGaps,
      timeManagementLossCount: Math.max(0, formTotalQuestions - (formCorrect + formIncorrect + formUnattempted)),
      weakSubjects: formWeakSubjects
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      notes: formNotes.trim(),
    };

    const updated = saveCrossAppTestRecord(newRecord);
    setRecords(updated);
    setActiveTab("records");
    setActionNotice(`Logged ${newRecord.testName} (${calculated.rawMarks}/${calculated.maxMarks} marks, ${calculated.accuracyPercentage}% accuracy)!`);
    setTimeout(() => setActionNotice(null), 5000);

    // Reset some form fields
    setFormTestName("");
    setFormNotes("");
  };

  const handleDelete = (id: string) => {
    const updated = deleteCrossAppTestRecord(id);
    setRecords(updated);
  };

  const handlePushToErrorVault = (record: CrossAppTestRecord) => {
    for (const weak of record.weakSubjects) {
      saveBTRErrorItem({
        id: `err-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        gtTitle: `${record.platform.toUpperCase()} ${record.testName}`,
        subjectId: weak.toLowerCase().replace(/\s+/g, "_"),
        subjectName: weak,
        questionStem: `[${record.platform.toUpperCase()} ${record.testName}] Weakness identified in ${weak}.`,
        myChosenAnswer: "Look-alike distractor trap",
        correctAnswer: "Core BTR Rule / Fact",
        takeawayFact: `Review Dr. Zainab Vora's core PYT tables for ${weak}. Silly mistakes identified: ${record.sillyMistakesCount}.`,
        category: "knowledge_gap",
        dateLogged: new Date().toISOString().slice(0, 10),
        reviewedCount: 0,
        isResolved: false,
      });
    }
    setActionNotice(`Pushed ${record.weakSubjects.length} high-yield mistake topics from ${record.testName} into the BTR Error Vault!`);
    setTimeout(() => setActionNotice(null), 5000);
    if (onNavigateToVault) onNavigateToVault();
  };

  return (
    <div className="fixed inset-0 z-[260] flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl max-h-[90vh] flex flex-col rounded-3xl border border-edge bg-surface shadow-2xl overflow-hidden text-ink">
        {/* Header */}
        <header className="flex h-16 items-center justify-between border-b border-edge px-6 bg-surface/90 backdrop-blur-md shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10 text-white/90 border border-white/15">
              <Target size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-ink">
                  Universal Medical Test Ingestion & Calibrator
                </h2>
                <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-400 border border-emerald-500/25">
                  Marrow • Prep • DAMS • Cerebellum
                </span>
              </div>
              <p className="text-xs text-ink-muted">
                Cross-platform Grand Test calibration, normalized NEET-PG & INI-CET scoring, and error ingestion.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-xl bg-elevated hover:bg-raised text-ink-muted hover:text-ink transition border border-edge"
          >
            <X size={16} />
          </button>
        </header>

        {/* Tab Switcher & Quick Notice */}
        <div className="flex items-center justify-between border-b border-edge px-6 py-2.5 bg-surface/60 shrink-0">
          <div className="flex items-center gap-1.5 rounded-xl bg-canvas p-1 border border-edge-soft text-xs">
            <button
              type="button"
              onClick={() => setActiveTab("records")}
              className={`rounded-lg px-3 py-1.5 font-bold transition ${
                activeTab === "records" ? "bg-accent text-white shadow-xs" : "text-ink-muted hover:text-ink"
              }`}
            >
              Test Log ({records.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("log")}
              className={`flex items-center gap-1 rounded-lg px-3 py-1.5 font-bold transition ${
                activeTab === "log" ? "bg-accent text-white shadow-xs" : "text-ink-muted hover:text-ink"
              }`}
            >
              <Plus size={13} />
              <span>Log New Test</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("analytics")}
              className={`flex items-center gap-1 rounded-lg px-3 py-1.5 font-bold transition ${
                activeTab === "analytics" ? "bg-accent text-white shadow-xs" : "text-ink-muted hover:text-ink"
              }`}
            >
              <BarChart2 size={13} />
              <span>Cross-App Analytics</span>
            </button>
          </div>

          {activeTab === "records" && (
            <div className="hidden sm:flex items-center gap-1 text-xs">
              {(["all", "marrow", "prepladder", "dams", "cerebellum"] as const).map((plat) => {
                const isSelected = selectedPlatformFilter === plat;
                return (
                  <button
                    key={plat}
                    type="button"
                    onClick={() => setSelectedPlatformFilter(plat)}
                    className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold transition ${
                      isSelected
                        ? "bg-elevated text-ink border border-edge font-bold"
                        : "text-ink-muted hover:text-ink"
                    }`}
                  >
                    {plat === "all" ? "All Platforms" : PLATFORM_METADATA[plat].name}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Action Notice */}
        {actionNotice && (
          <div className="px-6 py-2.5 bg-emerald-500/15 border-b border-emerald-500/30 text-xs font-semibold text-emerald-400 flex items-center justify-between shrink-0">
            <span className="flex items-center gap-2">
              <Check size={14} />
              {actionNotice}
            </span>
            <button
              type="button"
              onClick={() => setActionNotice(null)}
              className="text-xs text-emerald-400 hover:underline"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
          {/* TAB 1: RECORDS */}
          {activeTab === "records" && (
            <div className="flex flex-col gap-6">
              {/* Quick Stat Pill Highlights */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="rounded-2xl bg-canvas p-4 border border-edge-soft flex flex-col">
                  <span className="text-[11px] font-medium text-ink-muted">Total Tests Ingested</span>
                  <div className="text-2xl font-black text-ink mt-0.5">{analytics.totalTestsLogged}</div>
                  <span className="text-[10.5px] text-accent">Across 4 major platforms</span>
                </div>

                <div className="rounded-2xl bg-canvas p-4 border border-edge-soft flex flex-col">
                  <span className="text-[11px] font-medium text-ink-muted">Average Strike Accuracy</span>
                  <div className="text-2xl font-black text-emerald-400 mt-0.5">
                    {analytics.averageAccuracy}%
                  </div>
                  <span className="text-[10.5px] text-ink-muted">Target &gt;75% for top 5k</span>
                </div>

                <div className="rounded-2xl bg-canvas p-4 border border-edge-soft flex flex-col">
                  <span className="text-[11px] font-medium text-ink-muted">Silly Mistakes Penalty</span>
                  <div className="text-2xl font-black text-amber-400 mt-0.5">
                    -{analytics.marksLostToSillyTotal}
                    <span className="text-xs text-ink-muted ml-1">marks</span>
                  </div>
                  <span className="text-[10.5px] text-ink-muted">{analytics.totalSillyMistakes} silly errors total</span>
                </div>

                <div className="rounded-2xl bg-canvas p-4 border border-edge-soft flex flex-col">
                  <span className="text-[11px] font-medium text-ink-muted">Latest Grand Test Rank</span>
                  <div className="text-2xl font-black text-cyan-400 mt-0.5">
                    {records[0]?.rank ? `#${records[0].rank}` : `${analytics.latestPercentile}%ile`}
                  </div>
                  <span className="text-[10.5px] text-ink-muted">{records[0]?.platform.toUpperCase()} GT</span>
                </div>
              </div>

              {/* Test List */}
              <div className="flex flex-col gap-3">
                {filteredRecords.map((record) => {
                  const meta = PLATFORM_METADATA[record.platform];
                  return (
                    <div
                      key={record.id}
                      className="rounded-2xl bg-canvas border border-edge-soft p-5 flex flex-col gap-3 hover:border-accent/40 transition"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-edge-soft pb-3">
                        <div className="flex items-center gap-2.5">
                          <span
                            className={`rounded-lg px-2.5 py-0.5 text-xs font-bold border ${meta.badgeBg} ${meta.badgeText}`}
                          >
                            {meta.name}
                          </span>
                          <div>
                            <h4 className="text-sm font-bold text-ink">{record.testName}</h4>
                            <span className="text-[11px] text-ink-muted">
                              {record.date} • {record.examPattern === "ini_cet" ? "INI-CET Scheme (+1/-0.33)" : "NEET-PG Scheme (+4/-1)"}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <div className="text-base font-black text-ink">
                              {record.rawMarks}{" "}
                              <span className="text-xs font-semibold text-ink-muted">
                                / {record.maxMarks}
                              </span>
                            </div>
                            <span className="text-[10.5px] font-bold text-emerald-400">
                              {record.accuracyPercentage}% accuracy
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleDelete(record.id)}
                            className="flex h-7 w-7 items-center justify-center rounded-lg bg-elevated text-ink-muted hover:text-red-400 transition"
                            title="Delete Record"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>

                      {/* Stats Breakout */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                        <div className="flex items-center gap-1.5 text-ink-muted">
                          <span className="text-emerald-400 font-bold">{record.correctCount} Correct</span>
                          <span>•</span>
                          <span className="text-red-400 font-bold">{record.incorrectCount} Wrong</span>
                        </div>
                        <div className="text-ink-muted">
                          Percentile: <strong className="text-ink">{record.percentile ?? "N/A"}%ile</strong>
                        </div>
                        <div className="text-amber-400">
                          Silly Mistakes: <strong>{record.sillyMistakesCount}</strong> (-{record.sillyMistakesCount * (record.examPattern === "ini_cet" ? 1.33 : 5)} marks)
                        </div>
                        <div className="text-cyan-400">
                          Knowledge Gaps: <strong>{record.knowledgeGapsCount}</strong>
                        </div>
                      </div>

                      {/* Weak Subjects & Notes */}
                      {record.weakSubjects.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1.5 pt-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-ink-muted">
                            Weak Focus Areas:
                          </span>
                          {record.weakSubjects.map((sub, i) => (
                            <span
                              key={i}
                              className="rounded-md bg-elevated border border-edge-soft px-2 py-0.5 text-[10.5px] text-ink font-semibold"
                            >
                              {sub}
                            </span>
                          ))}
                        </div>
                      )}

                      {record.notes && (
                        <p className="text-xs text-ink-muted italic bg-surface/50 p-2.5 rounded-xl border border-edge-soft">
                          &quot;{record.notes}&quot;
                        </p>
                      )}

                      {/* Actions */}
                      <div className="flex items-center justify-between pt-2 border-t border-edge-soft text-xs">
                        <span className="text-[11px] text-ink-muted">
                          Rank: {record.rank ? `#${record.rank} of ${record.totalCandidates?.toLocaleString()}` : "Not ranked"}
                        </span>
                        <button
                          type="button"
                          onClick={() => handlePushToErrorVault(record)}
                          className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-accent/15 border border-accent/25 text-accent hover:bg-accent/25 text-xs font-bold transition shadow-xs"
                        >
                          <Brain size={12} />
                          <span>Push Mistakes to BTR Vault & FSRS</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 2: LOG NEW TEST */}
          {activeTab === "log" && (
            <div className="flex flex-col gap-6 max-w-2xl mx-auto w-full">
              <div>
                <h3 className="text-base font-bold text-ink">Ingest Mock / Grand Test Scorecard</h3>
                <p className="text-xs text-ink-muted">
                  Supports Marrow GTs, Prepladder Championship tests, DAMS CBTs, and Cerebellum INI-CET mocks.
                </p>
              </div>

              {/* Platform Selector */}
              <div className="flex flex-col gap-2">
                <span className="text-xs font-bold text-ink">1. Select Platform</span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {(["marrow", "prepladder", "dams", "cerebellum"] as const).map((plat) => {
                    const meta = PLATFORM_METADATA[plat];
                    const isSelected = formPlatform === plat;
                    return (
                      <button
                        key={plat}
                        type="button"
                        onClick={() => setFormPlatform(plat)}
                        className={`flex flex-col items-center justify-center p-3 rounded-2xl border text-center transition ${
                          isSelected
                            ? `${meta.badgeBg} ring-2 ring-accent text-ink`
                            : "bg-canvas border-edge-soft text-ink-muted hover:text-ink"
                        }`}
                      >
                        <span className="text-xs font-bold">{meta.name}</span>
                        <span className="text-[10px] text-ink-muted mt-0.5">{meta.commonTestTypes[0]}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Exam Pattern */}
              <div className="flex flex-col gap-2">
                <span className="text-xs font-bold text-ink">2. Exam Scheme</span>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 text-xs font-semibold text-ink cursor-pointer">
                    <input
                      type="radio"
                      name="pattern"
                      checked={formPattern === "neet_pg"}
                      onChange={() => setFormPattern("neet_pg")}
                      className="accent-accent"
                    />
                    <span>NEET-PG (+4 for correct, -1 for wrong, 800 Max)</span>
                  </label>
                  <label className="flex items-center gap-2 text-xs font-semibold text-ink cursor-pointer">
                    <input
                      type="radio"
                      name="pattern"
                      checked={formPattern === "ini_cet"}
                      onChange={() => setFormPattern("ini_cet")}
                      className="accent-accent"
                    />
                    <span>INI-CET (+1 for correct, -1/3 for wrong, 200 Max)</span>
                  </label>
                </div>
              </div>

              {/* Test Name & Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-ink">Test Name / Identifier</label>
                  <input
                    type="text"
                    placeholder="e.g. Marrow National Mock GT 15"
                    value={formTestName}
                    onChange={(e) => setFormTestName(e.target.value)}
                    className="h-10 rounded-xl bg-canvas border border-edge-soft px-3 text-xs text-ink placeholder:text-ink-muted focus:border-accent focus:outline-none"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-ink">Test Date</label>
                  <input
                    type="date"
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="h-10 rounded-xl bg-canvas border border-edge-soft px-3 text-xs text-ink focus:border-accent focus:outline-none"
                  />
                </div>
              </div>

              {/* Score Breakdown */}
              <div className="grid grid-cols-3 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-emerald-400">Correct Count</label>
                  <input
                    type="number"
                    value={formCorrect}
                    onChange={(e) => setFormCorrect(Number(e.target.value))}
                    className="h-10 rounded-xl bg-canvas border border-emerald-500/30 px-3 text-xs font-bold text-ink focus:border-emerald-400 focus:outline-none"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-red-400">Incorrect Count</label>
                  <input
                    type="number"
                    value={formIncorrect}
                    onChange={(e) => setFormIncorrect(Number(e.target.value))}
                    className="h-10 rounded-xl bg-canvas border border-red-500/30 px-3 text-xs font-bold text-ink focus:border-red-400 focus:outline-none"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-ink-muted">Unattempted</label>
                  <input
                    type="number"
                    value={formUnattempted}
                    onChange={(e) => setFormUnattempted(Number(e.target.value))}
                    className="h-10 rounded-xl bg-canvas border border-edge-soft px-3 text-xs font-bold text-ink focus:border-accent focus:outline-none"
                  />
                </div>
              </div>

              {/* Error Attribution */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-amber-400">Silly Mistakes (Lost Marks)</label>
                  <input
                    type="number"
                    value={formSillyMistakes}
                    onChange={(e) => setFormSillyMistakes(Number(e.target.value))}
                    className="h-10 rounded-xl bg-canvas border border-amber-500/30 px-3 text-xs font-bold text-ink focus:border-amber-400 focus:outline-none"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-cyan-400">Pure Knowledge Gaps</label>
                  <input
                    type="number"
                    value={formKnowledgeGaps}
                    onChange={(e) => setFormKnowledgeGaps(Number(e.target.value))}
                    className="h-10 rounded-xl bg-canvas border border-cyan-500/30 px-3 text-xs font-bold text-ink focus:border-cyan-400 focus:outline-none"
                  />
                </div>
              </div>

              {/* Percentile & Rank */}
              <div className="grid grid-cols-3 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-ink">Percentile (%ile)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={formPercentile}
                    onChange={(e) => setFormPercentile(Number(e.target.value))}
                    className="h-10 rounded-xl bg-canvas border border-edge-soft px-3 text-xs font-bold text-ink focus:border-accent focus:outline-none"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-ink">All India Rank</label>
                  <input
                    type="number"
                    placeholder="e.g. 4210"
                    value={formRank ?? ""}
                    onChange={(e) => setFormRank(e.target.value ? Number(e.target.value) : undefined)}
                    className="h-10 rounded-xl bg-canvas border border-edge-soft px-3 text-xs font-bold text-ink focus:border-accent focus:outline-none"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-ink">Total Candidates</label>
                  <input
                    type="number"
                    placeholder="e.g. 36000"
                    value={formCandidates ?? ""}
                    onChange={(e) => setFormCandidates(e.target.value ? Number(e.target.value) : undefined)}
                    className="h-10 rounded-xl bg-canvas border border-edge-soft px-3 text-xs font-bold text-ink focus:border-accent focus:outline-none"
                  />
                </div>
              </div>

              {/* Weak Subjects */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-ink">Weak Subjects (comma-separated)</label>
                <input
                  type="text"
                  placeholder="e.g. Pharmacology, Microbiology, Obstetrics"
                  value={formWeakSubjects}
                  onChange={(e) => setFormWeakSubjects(e.target.value)}
                  className="h-10 rounded-xl bg-canvas border border-edge-soft px-3 text-xs text-ink placeholder:text-ink-muted focus:border-accent focus:outline-none"
                />
              </div>

              {/* Reflection Notes */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-ink">GT Review & Revision Strategy Notes</label>
                <textarea
                  rows={2}
                  placeholder="What was the main examiner trap? How did time management go?"
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  className="rounded-xl bg-canvas border border-edge-soft p-3 text-xs text-ink placeholder:text-ink-muted focus:border-accent focus:outline-none resize-none"
                />
              </div>

              {/* Live Preview Card */}
              <div className="rounded-2xl border border-accent/30 bg-accent/10 p-4 flex flex-col gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-accent">
                  Calculated Score Preview
                </span>
                <div className="flex items-baseline justify-between">
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-black text-ink">{liveMetrics.rawMarks}</span>
                    <span className="text-xs text-ink-muted">/ {liveMetrics.maxMarks} marks</span>
                    <span className="text-xs font-bold text-emerald-400">
                      ({liveMetrics.accuracyPercentage}% accuracy)
                    </span>
                  </div>
                  <div className="text-xs text-amber-400">
                    Silly Mistakes Penalty: -<strong>{liveMetrics.marksLostToSillyMistakes}</strong> marks
                  </div>
                </div>
                <span className="text-[11px] text-ink-muted">
                  Potential score with 0 silly mistakes:{" "}
                  <strong className="text-emerald-400">{liveMetrics.potentialMarks} marks</strong>
                </span>
              </div>

              <button
                type="button"
                onClick={handleSaveTest}
                className="flex items-center justify-center gap-2 h-11 rounded-2xl bg-accent text-white font-bold text-xs shadow-md hover:brightness-110 transition"
              >
                <Check size={16} />
                <span>Save Test Score & Calibrate</span>
              </button>
            </div>
          )}

          {/* TAB 3: CROSS-APP ANALYTICS */}
          {activeTab === "analytics" && (
            <div className="flex flex-col gap-6">
              {/* Platform Comparison Grid */}
              <div>
                <h4 className="text-sm font-bold text-ink mb-3">
                  Cross-Platform Accuracy & Percentile Calibration
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {(["marrow", "prepladder", "dams", "cerebellum"] as const).map((plat) => {
                    const meta = PLATFORM_METADATA[plat];
                    const stat = analytics.platformStats[plat];
                    return (
                      <div
                        key={plat}
                        className="rounded-2xl bg-canvas border border-edge-soft p-4 flex flex-col justify-between gap-3 shadow-xs"
                      >
                        <div className="flex items-center justify-between">
                          <span className={`rounded-lg px-2 py-0.5 text-xs font-bold border ${meta.badgeBg} ${meta.badgeText}`}>
                            {meta.name}
                          </span>
                          <span className="text-xs font-mono text-ink-muted">{stat.testCount} tests</span>
                        </div>

                        <div className="flex flex-col gap-1">
                          <div className="flex items-baseline justify-between text-xs">
                            <span className="text-ink-muted">Avg Accuracy:</span>
                            <span className="font-bold text-emerald-400">{stat.averageAccuracy}%</span>
                          </div>
                          <div className="flex items-baseline justify-between text-xs">
                            <span className="text-ink-muted">Avg Percentile:</span>
                            <span className="font-bold text-cyan-400">{stat.averagePercentile}%ile</span>
                          </div>
                          <div className="flex items-baseline justify-between text-xs">
                            <span className="text-ink-muted">Best Score:</span>
                            <span className="font-bold text-ink">{stat.bestScore} marks</span>
                          </div>
                        </div>

                        <div className="h-1.5 w-full bg-elevated rounded-full overflow-hidden">
                          <div
                            className="h-full bg-accent rounded-full transition-all duration-300"
                            style={{ width: `${Math.min(100, stat.averageAccuracy)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Recurring Weak Subjects Across All Tests */}
              <div className="rounded-2xl bg-canvas border border-edge-soft p-5 flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle size={16} className="text-amber-400" />
                  <h4 className="text-sm font-bold text-ink">
                    Top Recurring Weak Subjects Across All Grand Tests
                  </h4>
                </div>
                <p className="text-xs text-ink-muted">
                  These subjects caused the highest error rates across Marrow, Prepladder, DAMS, and Cerebellum mock tests.
                </p>

                <div className="flex flex-wrap items-center gap-2 pt-1">
                  {analytics.topWeakSubjects.map((item) => (
                    <div
                      key={item.subject}
                      className="flex items-center gap-2 rounded-xl bg-amber-500/10 border border-amber-500/25 px-3 py-1.5 text-xs font-semibold text-amber-300"
                    >
                      <span>{item.subject}</span>
                      <span className="rounded-full bg-amber-500/20 px-1.5 py-0.2 font-mono text-[10px] font-bold text-amber-400">
                        {item.count} GTs
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
