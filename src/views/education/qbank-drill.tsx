import { useState, useEffect, useCallback, type MouseEvent } from "react";
import {
  CheckCircle2,
  XCircle,
  ArrowRight,
  AlertTriangle,
  Lightbulb,
  Timer,
  Bookmark,
  X,
  RotateCcw,
  Flag,
  ChevronRight,
  Monitor,
  FileText,
  Info,
  User,
  Zap,
} from "lucide-react";
import type { ClinicalQuestion, QBankSessionState, GrandTestResult } from "@/lib/education/qbank-types";
import { CLINICAL_QBANK_STARTER } from "@/lib/education/qbank-data";
import { saveStudyNote } from "@/lib/education/notes";

export type QBankRunnerProps = {
  questions?: ClinicalQuestion[];
  examMode?: boolean; // In exam mode, explanations are hidden until submission
  onFinish?: (result: GrandTestResult) => void;
  onClose: () => void;
};

export function QBankRunner({
  questions = CLINICAL_QBANK_STARTER,
  examMode = false,
  onFinish,
  onClose,
}: QBankRunnerProps) {
  const [activeQuestions, setActiveQuestions] = useState<ClinicalQuestion[]>(questions);
  const [cbtMode, setCbtMode] = useState<boolean>(examMode);
  const [showQuestionPaper, setShowQuestionPaper] = useState<boolean>(false);
  const [showInstructions, setShowInstructions] = useState<boolean>(false);

  const [session, setSession] = useState<QBankSessionState>({
    activeQuestionIndex: 0,
    selectedAnswers: {},
    eliminatedOptions: {},
    isSubmitted: {},
    bookmarks: [],
    timeSpentSec: {},
  });

  const [guessedQuestions, setGuessedQuestions] = useState<Record<string, boolean>>({});
  const [markedForReview, setMarkedForReview] = useState<string[]>([]);
  const [examFinished, setExamFinished] = useState(false);
  const [elapsedTimer, setElapsedTimer] = useState(0);
  const [resultData, setResultData] = useState<GrandTestResult | null>(null);
  const [activeTab, setActiveTab] = useState<"analysis" | "questions">("analysis");

  // Timer
  useEffect(() => {
    if (examFinished) return;
    const interval = setInterval(() => {
      setElapsedTimer((t) => t + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [examFinished]);

  const activeQuestion = activeQuestions[session.activeQuestionIndex] ?? activeQuestions[0];
  const qId = activeQuestion?.id || "q_0";
  const selectedIdx = session.selectedAnswers[qId];
  const eliminated = session.eliminatedOptions[qId] || [];
  const submitted = examMode ? examFinished : !!session.isSubmitted[qId];
  const isBookmarked = session.bookmarks.includes(qId);
  const isMarkedReview = markedForReview.includes(qId);
  const isGuess = !!guessedQuestions[qId];

  // Handle Option Select
  const handleSelectOption = (idx: number) => {
    if (submitted) return;
    setSession((prev) => ({
      ...prev,
      selectedAnswers: {
        ...prev.selectedAnswers,
        [qId]: idx,
      },
    }));
  };

  // Reset answer for current question
  const handleResetAnswer = () => {
    if (submitted) return;
    setSession((prev) => {
      const copy = { ...prev.selectedAnswers };
      delete copy[qId];
      return { ...prev, selectedAnswers: copy };
    });
  };

  // Toggle Mark for Review
  const handleToggleMarkReview = () => {
    setMarkedForReview((prev) =>
      prev.includes(qId) ? prev.filter((id) => id !== qId) : [...prev, qId]
    );
  };

  // Strike out / Eliminate distractors
  const handleToggleEliminate = (e: MouseEvent, idx: number) => {
    e.stopPropagation();
    if (submitted) return;
    setSession((prev) => {
      const currentElim = prev.eliminatedOptions[qId] || [];
      const updated = currentElim.includes(idx)
        ? currentElim.filter((i) => i !== idx)
        : [...currentElim, idx];
      return {
        ...prev,
        eliminatedOptions: {
          ...prev.eliminatedOptions,
          [qId]: updated,
        },
      };
    });
  };

  // Toggle Guessing Flag
  const handleToggleGuess = () => {
    setGuessedQuestions((prev) => ({
      ...prev,
      [qId]: !prev[qId],
    }));
  };

  // Submit single question (in practice mode)
  const handleSubmitSingle = () => {
    if (selectedIdx === undefined) return;
    setSession((prev) => ({
      ...prev,
      isSubmitted: {
        ...prev.isSubmitted,
        [qId]: true,
      },
    }));
  };

  // Toggle Bookmark into FSRS Vault
  const handleToggleBookmark = () => {
    const isNowBookmarked = !isBookmarked;
    setSession((prev) => ({
      ...prev,
      bookmarks: isNowBookmarked
        ? [...prev.bookmarks, qId]
        : prev.bookmarks.filter((id) => id !== qId),
    }));

    if (isNowBookmarked) {
      saveStudyNote({
        itemId: activeQuestion.id,
        itemTitle: `BTR: ${activeQuestion.topic} (${activeQuestion.subject})`,
        timestampSec: 0,
        timestampLabel: "00:00",
        markdown: `**Vignette:** ${activeQuestion.vignette}\n\n**Examiner Trap:** ${activeQuestion.examinerTrap}\n\n**Rule:** ${activeQuestion.explanation.bottomLine}`,
        highYield: true,
        topic: activeQuestion.topic,
      });
    }
  };

  // Complete Exam and calculate CoreBTR analytics
  const handleFinishExam = useCallback(() => {
    let correct = 0;
    let incorrect = 0;
    let attempted = 0;

    activeQuestions.forEach((q) => {
      const sel = session.selectedAnswers[q.id];
      if (sel !== undefined) {
        attempted++;
        if (sel === q.correctIndex) {
          correct++;
        } else {
          incorrect++;
        }
      }
    });

    // NEET-PG standard scoring: +4 correct, -1 incorrect
    const score = correct * 4 - incorrect * 1;
    const maxScore = activeQuestions.length * 4;
    const accuracyPct = attempted > 0 ? Math.round((correct / attempted) * 100) : 0;

    const result: GrandTestResult = {
      id: `gt_${Date.now()}`,
      examTitle: examMode ? "CoreBTR National Grand Test Simulation" : "CoreBTR Custom Module Drill",
      timestamp: Date.now(),
      totalQuestions: activeQuestions.length,
      attempted,
      correct,
      incorrect,
      score,
      maxScore,
      accuracyPct,
      timeSpentMinutes: Math.max(1, Math.round(elapsedTimer / 60)),
    };

    setResultData(result);
    setExamFinished(true);
    onFinish?.(result);
  }, [activeQuestions, session.selectedAnswers, examMode, elapsedTimer, onFinish]);

  // Restart focused Recovery Sprint on missed questions
  const handleStartRecoverySprint = () => {
    const missed = activeQuestions.filter((q) => {
      const sel = session.selectedAnswers[q.id];
      return sel !== undefined && sel !== q.correctIndex;
    });

    if (missed.length === 0) return;

    setActiveQuestions(missed);
    setSession({
      activeQuestionIndex: 0,
      selectedAnswers: {},
      eliminatedOptions: {},
      isSubmitted: {},
      bookmarks: [],
      timeSpentSec: {},
    });
    setGuessedQuestions({});
    setMarkedForReview([]);
    setExamFinished(false);
    setElapsedTimer(0);
    setResultData(null);
    setActiveTab("analysis");
  };

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${String(s).padStart(2, "0")}`;
  };

  // Calculate palette status for TCS iON grid
  const getQuestionPaletteStatus = (index: number) => {
    const q = activeQuestions[index];
    if (!q) return "not_visited";
    const isAns = session.selectedAnswers[q.id] !== undefined;
    const isMarked = markedForReview.includes(q.id);

    if (isAns && isMarked) return "ans_marked";
    if (isMarked) return "marked";
    if (isAns) return "answered";
    if (index <= session.activeQuestionIndex) return "not_answered";
    return "not_visited";
  };

  // If exam finished, render authentic CoreBTR Analysis Screen (matching screenshot media_1794864389406_b0b9e895.jpg)
  if (examFinished && resultData) {
    const totalQ = activeQuestions.length;
    const correctCount = resultData.correct;
    const incorrectCount = resultData.incorrect;
    const notAnsweredCount = totalQ - (correctCount + incorrectCount);
    const correctPct = Math.round((correctCount / totalQ) * 100);

    // Calculate guess statistics
    const totalGuesses = Object.values(guessedQuestions).filter(Boolean).length;
    let correctGuesses = 0;
    activeQuestions.forEach((q) => {
      if (guessedQuestions[q.id] && session.selectedAnswers[q.id] === q.correctIndex) {
        correctGuesses++;
      }
    });
    const guessAccuracy = totalGuesses > 0 ? Math.round((correctGuesses / totalGuesses) * 100) : 0;
    const avgTimePerQ = totalQ > 0 ? Math.round(elapsedTimer / totalQ) : 0;

    // Group questions by subject for subject-wise analysis
    const subjectMap: Record<
      string,
      { total: number; correct: number; incorrect: number; notAnswered: number; qIds: string[] }
    > = {};

    activeQuestions.forEach((q) => {
      if (!subjectMap[q.subject]) {
        subjectMap[q.subject] = { total: 0, correct: 0, incorrect: 0, notAnswered: 0, qIds: [] };
      }
      subjectMap[q.subject].total++;
      subjectMap[q.subject].qIds.push(q.id);

      const sel = session.selectedAnswers[q.id];
      if (sel === undefined) {
        subjectMap[q.subject].notAnswered++;
      } else if (sel === q.correctIndex) {
        subjectMap[q.subject].correct++;
      } else {
        subjectMap[q.subject].incorrect++;
      }
    });

    return (
      <div className="flex flex-col h-full w-full max-w-4xl mx-auto bg-[#0d1b4b] rounded-3xl border border-[#1767be]/35 shadow-2xl overflow-hidden text-white select-none animate-in zoom-in-95 duration-200">
        {/* Top Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1767be]/25 bg-[#1d204b]">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl hover:bg-white/10 text-white/70 hover:text-white transition"
            >
              <X size={18} />
            </button>
            <div>
              <h2 className="text-base font-black text-white">Custom Module Analysis</h2>
              <span className="text-xs text-white/60">
                Performance Telemetry • CoreBTR Diagnostic Engine
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 rounded-xl bg-white/5 border border-white/10 p-1 text-xs">
              <button
                type="button"
                onClick={() => setActiveTab("analysis")}
                className={`px-3 py-1 rounded-lg font-bold transition ${
                  activeTab === "analysis" ? "bg-[#1767be] text-white shadow-xs" : "text-white/60 hover:text-white"
                }`}
              >
                Analysis
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("questions")}
                className={`px-3 py-1 rounded-lg font-bold transition ${
                  activeTab === "questions" ? "bg-[#1767be] text-white shadow-xs" : "text-white/60 hover:text-white"
                }`}
              >
                Questions ({totalQ})
              </button>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
          {activeTab === "analysis" ? (
            <>
              {/* Recovery Sprint Alert Banner */}
              {incorrectCount > 0 && (
                <div className="p-4 rounded-2xl bg-[#1d204b] border border-[#1767be]/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-md">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-[#feb122]/15 text-[#feb122] border border-[#feb122]/30 flex items-center justify-center shrink-0">
                      <Zap size={18} className="fill-[#feb122]" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">Weaker Topics Recovery Sprint</h4>
                      <p className="text-xs text-white/70">
                        {incorrectCount} questions missed. Launch an instant drill to master these examiner traps.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleStartRecoverySprint}
                    className="w-full sm:w-auto px-4 py-2 rounded-xl bg-[#1767be] hover:bg-[#155bb0] text-white font-extrabold text-xs shadow-md transition shrink-0"
                  >
                    Start Recovery Sprint ({incorrectCount} Qs)
                  </button>
                </div>
              )}

              {/* Accuracy & Breakdown Card (Matching App Store Screenshot) */}
              <div className="p-5 rounded-2xl bg-[#1d204b]/70 border border-[#1767be]/30 flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-white/60">
                    Accuracy & Score
                  </span>
                  <div className="flex items-center gap-3 text-xs">
                    <div className="flex items-center gap-1.5">
                      <span className="h-3 w-3 rounded-full bg-emerald-500 shrink-0" />
                      <span className="text-white/80">
                        <strong className="text-white">{correctCount}</strong> Correct
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className="h-3 w-3 rounded-full bg-rose-500 shrink-0" />
                      <span className="text-white/80">
                        <strong className="text-white">{incorrectCount}</strong> Incorrect
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className="h-3 w-3 rounded-full bg-white/20 shrink-0" />
                      <span className="text-white/80">
                        <strong className="text-white">{notAnsweredCount}</strong> Not Answered
                      </span>
                    </div>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="h-3 w-full bg-white/10 rounded-full overflow-hidden flex">
                  <div
                    style={{ width: `${(correctCount / totalQ) * 100}%` }}
                    className="bg-emerald-500 h-full transition-all duration-700"
                    title={`Correct: ${correctCount}`}
                  />
                  <div
                    style={{ width: `${(incorrectCount / totalQ) * 100}%` }}
                    className="bg-rose-500 h-full transition-all duration-700"
                    title={`Incorrect: ${incorrectCount}`}
                  />
                </div>

                {/* Accuracy Percentage Callout */}
                <div className="flex items-center justify-between pt-1">
                  <div>
                    <span className="text-3xl font-black text-white">{correctPct}%</span>
                    <span className="text-xs text-white/60 ml-2">Accuracy</span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-bold text-white">
                      Score: {resultData.score} / {resultData.maxScore}
                    </span>
                    <span className="text-[11px] text-white/50 block">NEET-PG (+4 / -1 Marking)</span>
                  </div>
                </div>
              </div>

              {/* 6-Metric HUD Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="p-3.5 rounded-2xl bg-[#1d204b]/60 border border-[#1767be]/25 flex flex-col">
                  <span className="text-[11px] text-white/60">Marks Obtained</span>
                  <strong className="text-base font-black text-white mt-0.5">
                    {resultData.score > 0 ? `+${resultData.score}` : resultData.score} / {resultData.maxScore}
                  </strong>
                </div>

                <div className="p-3.5 rounded-2xl bg-[#1d204b]/60 border border-[#1767be]/25 flex flex-col">
                  <span className="text-[11px] text-white/60">Total Time</span>
                  <strong className="text-base font-black text-white mt-0.5">
                    {resultData.timeSpentMinutes} min
                  </strong>
                </div>

                <div className="p-3.5 rounded-2xl bg-[#1d204b]/60 border border-[#1767be]/25 flex flex-col">
                  <span className="text-[11px] text-white/60">Guess Accuracy</span>
                  <strong className="text-base font-black text-[#4da2ff] mt-0.5">
                    {guessAccuracy}%
                  </strong>
                </div>

                <div className="p-3.5 rounded-2xl bg-[#1d204b]/60 border border-[#1767be]/25 flex flex-col">
                  <span className="text-[11px] text-white/60">Accuracy</span>
                  <strong className="text-base font-black text-emerald-400 mt-0.5">
                    {resultData.accuracyPct}%
                  </strong>
                </div>

                <div className="p-3.5 rounded-2xl bg-[#1d204b]/60 border border-[#1767be]/25 flex flex-col">
                  <span className="text-[11px] text-white/60">Avg Time / Question</span>
                  <strong className="text-base font-black text-white mt-0.5">
                    {avgTimePerQ} sec/ques
                  </strong>
                </div>

                <div className="p-3.5 rounded-2xl bg-[#1d204b]/60 border border-[#1767be]/25 flex flex-col">
                  <span className="text-[11px] text-white/60">Correct Guesses</span>
                  <strong className="text-base font-black text-[#feb122] mt-0.5">
                    {correctGuesses} out of {totalGuesses}
                  </strong>
                </div>
              </div>

              {/* Subject-wise Analysis */}
              <div className="flex flex-col gap-3">
                <span className="text-xs font-bold uppercase tracking-wider text-white/60">
                  Subject-wise Analysis
                </span>

                <div className="flex flex-col gap-2.5">
                  {Object.entries(subjectMap).map(([subject, stats]) => {
                    const acc =
                      stats.correct + stats.incorrect > 0
                        ? Math.round((stats.correct / (stats.correct + stats.incorrect)) * 100)
                        : 0;
                    const isWeaker = acc < 50;

                    return (
                      <div
                        key={subject}
                        className="flex flex-col gap-2.5 p-4 rounded-2xl bg-[#1d204b]/60 border border-[#1767be]/25 hover:border-[#4da2ff]/40 transition"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-white">{subject}</span>
                            {isWeaker && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-rose-500/20 text-rose-400 border border-rose-500/30">
                                Weaker
                              </span>
                            )}
                          </div>
                          <span className="text-xs font-bold text-white">{acc}% Correct</span>
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs">
                          <div className="flex items-center gap-4">
                            <span className="text-white/60">
                              <span className="text-emerald-400 font-bold">{stats.correct}</span> Correct
                            </span>
                            <span className="text-white/60">
                              <span className="text-rose-400 font-bold">{stats.incorrect}</span> Incorrect
                            </span>
                            <span className="text-white/60">
                              <span className="text-white/40 font-bold">{stats.notAnswered}</span> Not Answered
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={() => setActiveTab("questions")}
                            className="text-xs font-bold text-[#4da2ff] hover:underline transition flex items-center gap-1"
                          >
                            <span>view questions ({stats.total})</span>
                            <ChevronRight size={12} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          ) : (
            /* Questions Review Tab */
            <div className="flex flex-col gap-3">
              {activeQuestions.map((q, idx) => {
                const sel = session.selectedAnswers[q.id];
                const isCorrect = sel === q.correctIndex;
                const isUnanswered = sel === undefined;

                return (
                  <div
                    key={q.id}
                    className={`p-4 rounded-2xl border transition ${
                      isCorrect
                        ? "bg-[#1d204b]/80 border-emerald-500/40"
                        : isUnanswered
                          ? "bg-[#1d204b]/50 border-white/10"
                          : "bg-[#1d204b]/80 border-rose-500/40"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-white/70">
                          Q{idx + 1}
                        </span>
                        <span className="text-xs font-semibold px-2 py-0.5 rounded bg-[#1767be]/20 text-[#4da2ff] border border-[#1767be]/30">
                          {q.subject}
                        </span>
                      </div>
                      <span
                        className={`text-xs font-bold ${
                          isCorrect
                            ? "text-emerald-400"
                            : isUnanswered
                              ? "text-white/50"
                              : "text-rose-400"
                        }`}
                      >
                        {isCorrect ? "Correct (+4)" : isUnanswered ? "Unanswered (0)" : "Incorrect (-1)"}
                      </span>
                    </div>

                    <p className="text-xs text-white/90 leading-relaxed mb-3">{q.vignette}</p>

                    <div className="text-xs font-medium text-emerald-300 bg-emerald-500/10 p-2.5 rounded-xl border border-emerald-500/20">
                      <strong>Correct Option: {String.fromCharCode(65 + q.correctIndex)}) </strong>
                      {q.options[q.correctIndex]}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Bottom Done Button */}
        <div className="p-4 border-t border-[#1767be]/25 bg-[#1d204b] flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 rounded-2xl bg-[#1767be] hover:bg-[#155bb0] text-white font-bold text-xs transition"
          >
            Close & Return to CoreBTR
          </button>
        </div>
      </div>
    );
  }

  // Question Paper Modal
  if (showQuestionPaper) {
    return (
      <div className="fixed inset-0 z-[400] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
        <div className="relative w-full max-w-3xl max-h-[85vh] bg-[#0d1b4b] rounded-3xl border border-[#1767be]/35 shadow-2xl flex flex-col overflow-hidden text-white">
          <div className="flex items-center justify-between px-6 py-4 border-b border-[#1767be]/25 bg-[#1d204b]">
            <div className="flex items-center gap-2">
              <FileText size={18} className="text-[#4da2ff]" />
              <h3 className="text-base font-bold text-white">Complete Question Paper</h3>
            </div>
            <button
              type="button"
              onClick={() => setShowQuestionPaper(false)}
              className="p-1 rounded-lg hover:bg-white/10 text-white/70 hover:text-white"
            >
              <X size={16} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
            {activeQuestions.map((q, i) => (
              <div key={q.id} className="p-4 rounded-2xl bg-[#1d204b]/70 border border-[#1767be]/20 flex flex-col gap-2">
                <span className="font-bold text-xs text-[#4da2ff]">Question {i + 1} • {q.subject}</span>
                <p className="text-xs text-white/90 leading-relaxed">{q.vignette}</p>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {q.options.map((opt, optIdx) => (
                    <div key={optIdx} className="text-[11.5px] text-white/70 p-2 rounded-lg bg-black/20 border border-white/5">
                      <strong className="text-white/90">{String.fromCharCode(65 + optIdx)})</strong> {opt}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Instructions Modal
  if (showInstructions) {
    return (
      <div className="fixed inset-0 z-[400] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
        <div className="relative w-full max-w-2xl max-h-[85vh] bg-[#0d1b4b] rounded-3xl border border-[#1767be]/35 shadow-2xl flex flex-col overflow-hidden text-white">
          <div className="flex items-center justify-between px-6 py-4 border-b border-[#1767be]/25 bg-[#1d204b]">
            <div className="flex items-center gap-2">
              <Info size={18} className="text-[#4da2ff]" />
              <h3 className="text-base font-bold text-white">TCS iON CBT Examination Instructions</h3>
            </div>
            <button
              type="button"
              onClick={() => setShowInstructions(false)}
              className="p-1 rounded-lg hover:bg-white/10 text-white/70 hover:text-white"
            >
              <X size={16} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-4 text-xs text-white/80 leading-relaxed">
            <h4 className="text-sm font-bold text-white">General Guidelines for NEET-PG & INI-CET Aspirants:</h4>
            <p>1. The clock will be set at the server. The countdown timer at top right indicates time remaining.</p>
            <p>2. The Question Palette displays status of each question using official color conventions:</p>
            <ul className="list-disc pl-5 flex flex-col gap-1 text-[11.5px]">
              <li><strong className="text-emerald-400">Green:</strong> You have answered the question.</li>
              <li><strong className="text-rose-400">Red:</strong> You have not answered the question.</li>
              <li><strong className="text-white/50">Grey:</strong> You have not visited the question yet.</li>
              <li><strong className="text-purple-400">Purple:</strong> You have marked the question for review.</li>
              <li><strong className="text-purple-300">Purple with Green Dot:</strong> Answered and marked for review (evaluated in final score).</li>
            </ul>
            <p>3. Marking Scheme: <strong>+4 Marks</strong> for each correct response, <strong>-1 Mark</strong> for each incorrect response.</p>
          </div>
        </div>
      </div>
    );
  }

  // MODE A: TCS iON CBT PROMETRIC EXAM SCREEN
  if (cbtMode) {
    const answeredCount = Object.keys(session.selectedAnswers).length;
    const markedCount = markedForReview.length;
    const notAnsweredCount = session.activeQuestionIndex + 1 - answeredCount;
    const notVisitedCount = Math.max(0, activeQuestions.length - (session.activeQuestionIndex + 1));

    return (
      <div className="flex flex-col h-full w-full max-w-5xl mx-auto bg-[#0d1b4b] rounded-3xl border border-[#1767be]/40 shadow-2xl overflow-hidden text-white select-none animate-in zoom-in-95 duration-150">
        {/* TCS iON Official Masthead */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-[#1767be]/30 bg-[#1d204b]">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#1767be] text-white font-bold text-xs">
              CBT
            </div>
            <div>
              <h2 className="text-xs font-bold text-white tracking-tight">
                National Board of Examinations • NEET-PG / INI-CET Computer-Based Test
              </h2>
              <span className="text-[10px] text-[#4da2ff]">Subject: {activeQuestion.subject} • Official TCS iON Skin</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 rounded-xl bg-white/5 border border-white/10 px-3 py-1 font-mono text-xs font-bold text-white">
              <Timer size={13} className="text-[#4da2ff]" />
              <span>Time Left: {formatTimer(7200 - elapsedTimer)}</span>
            </div>

            <button
              type="button"
              onClick={() => setCbtMode(false)}
              className="text-xs text-[#4da2ff] hover:underline font-semibold"
              title="Switch to CoreBTR Obsidian View"
            >
              CoreBTR View
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded-lg text-white/60 hover:text-white"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Two-Column Split Layout */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* Left Column: Active Question */}
          <div className="flex-1 flex flex-col overflow-y-auto p-6 border-r border-[#1767be]/20">
            {/* Question Header */}
            <div className="flex items-center justify-between border-b border-[#1767be]/20 pb-3 mb-4">
              <span className="font-bold text-sm text-white">
                Question No. {session.activeQuestionIndex + 1}
              </span>
              <span className="text-[11px] text-white/60 font-mono">
                Marks for correct answer: +4 | Negative mark: -1
              </span>
            </div>

            {/* Vignette */}
            <div className="text-[14.5px] leading-relaxed text-white font-medium p-4 rounded-2xl bg-[#1d204b]/50 border border-[#1767be]/20 mb-5">
              {activeQuestion.vignette}
            </div>

            {/* Options Radio List */}
            <div className="flex flex-col gap-3 flex-1">
              {activeQuestion.options.map((option, idx) => {
                const isSelected = selectedIdx === idx;
                const isElim = eliminated.includes(idx);

                return (
                  <div
                    key={idx}
                    onClick={() => !isElim && handleSelectOption(idx)}
                    className={`flex items-center justify-between p-3.5 rounded-xl border transition cursor-pointer ${
                      isSelected
                        ? "bg-[#1767be]/25 border-[#1767be] text-white font-bold ring-1 ring-[#4da2ff]"
                        : isElim
                          ? "opacity-35 line-through bg-black/20 border-white/5 text-white/40"
                          : "bg-[#1d204b]/40 border-[#1767be]/20 hover:bg-[#1d204b]/80 text-white"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`h-4 w-4 rounded-full border flex items-center justify-center ${
                          isSelected ? "border-[#4da2ff] bg-[#1767be]" : "border-white/40"
                        }`}
                      >
                        {isSelected && <div className="h-2 w-2 rounded-full bg-white" />}
                      </div>
                      <span className="text-xs font-mono font-bold text-[#4da2ff]">
                        {String.fromCharCode(65 + idx)})
                      </span>
                      <span className="text-xs leading-snug">{option}</span>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => handleToggleEliminate(e, idx)}
                      className="text-white/40 hover:text-rose-400 p-1 text-xs font-bold"
                      title={isElim ? "Restore distractor" : "Strike-out distractor"}
                    >
                      ✕
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Bottom Actions Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-[#1767be]/20 mt-4">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleToggleMarkReview}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
                    isMarkedReview
                      ? "bg-purple-600 text-white"
                      : "bg-[#1d204b] border border-[#1767be]/30 text-white hover:bg-[#252a60]"
                  }`}
                >
                  {isMarkedReview ? "Marked for Review" : "Mark for Review & Next"}
                </button>

                <button
                  type="button"
                  onClick={handleResetAnswer}
                  disabled={selectedIdx === undefined}
                  className="px-3.5 py-1.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-white/70 hover:text-white text-xs font-bold transition disabled:opacity-30"
                >
                  Clear Response
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setSession((prev) => ({
                      ...prev,
                      activeQuestionIndex: Math.max(0, prev.activeQuestionIndex - 1),
                    }))
                  }
                  disabled={session.activeQuestionIndex === 0}
                  className="px-4 py-1.5 rounded-xl bg-white/5 border border-white/10 text-white/80 hover:text-white text-xs font-bold transition disabled:opacity-30"
                >
                  Previous
                </button>

                {session.activeQuestionIndex < activeQuestions.length - 1 ? (
                  <button
                    type="button"
                    onClick={() =>
                      setSession((prev) => ({
                        ...prev,
                        activeQuestionIndex: prev.activeQuestionIndex + 1,
                      }))
                    }
                    className="px-5 py-1.5 rounded-xl bg-[#1767be] hover:bg-[#155bb0] text-white text-xs font-bold shadow-md transition"
                  >
                    Save & Next
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleFinishExam}
                    className="px-5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md transition"
                  >
                    Submit Test
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Candidate & Question Palette */}
          <div className="w-full md:w-72 shrink-0 bg-[#0a1334] p-4 flex flex-col justify-between gap-4 overflow-y-auto">
            <div className="flex flex-col gap-4">
              {/* Candidate Info */}
              <div className="flex items-center gap-3 p-3 rounded-2xl bg-[#1d204b]/70 border border-[#1767be]/25">
                <div className="h-10 w-10 rounded-full bg-[#1767be] text-white font-bold flex items-center justify-center shrink-0">
                  <User size={18} />
                </div>
                <div className="min-w-0">
                  <h4 className="text-xs font-bold text-white truncate">Dr. Anupam Mahato</h4>
                  <span className="text-[10.5px] text-white/60 block">Roll: 27041995 • AIIMS/NBE</span>
                </div>
              </div>

              {/* Status Legend */}
              <div className="grid grid-cols-2 gap-2 text-[10px] text-white/80">
                <div className="flex items-center gap-1.5">
                  <span className="h-4 w-4 rounded bg-emerald-600 text-white font-bold flex items-center justify-center text-[9px] shrink-0">
                    {answeredCount}
                  </span>
                  <span>Answered</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-4 w-4 rounded bg-rose-600 text-white font-bold flex items-center justify-center text-[9px] shrink-0">
                    {notAnsweredCount}
                  </span>
                  <span>Not Answered</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-4 w-4 rounded bg-white/20 text-white font-bold flex items-center justify-center text-[9px] shrink-0">
                    {notVisitedCount}
                  </span>
                  <span>Not Visited</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-4 w-4 rounded-full bg-purple-600 text-white font-bold flex items-center justify-center text-[9px] shrink-0">
                    {markedCount}
                  </span>
                  <span>Marked</span>
                </div>
              </div>

              {/* Question Palette Numbered Buttons */}
              <div className="flex flex-col gap-2 pt-2 border-t border-[#1767be]/20">
                <span className="text-[11px] font-bold text-white/70">
                  Choose a Question:
                </span>
                <div className="grid grid-cols-5 gap-1.5 max-h-56 overflow-y-auto p-1">
                  {activeQuestions.map((q, idx) => {
                    const status = getQuestionPaletteStatus(idx);
                    const isCurrent = idx === session.activeQuestionIndex;

                    let bgClass = "bg-white/10 text-white/70";
                    if (status === "answered") bgClass = "bg-emerald-600 text-white font-bold";
                    else if (status === "not_answered") bgClass = "bg-rose-600 text-white font-bold";
                    else if (status === "marked" || status === "ans_marked") bgClass = "bg-purple-600 text-white font-bold";

                    return (
                      <button
                        key={q.id}
                        type="button"
                        onClick={() =>
                          setSession((prev) => ({
                            ...prev,
                            activeQuestionIndex: idx,
                          }))
                        }
                        className={`h-8 rounded-lg font-mono text-xs font-bold transition flex items-center justify-center ${bgClass} ${
                          isCurrent ? "ring-2 ring-white scale-105" : "hover:brightness-110"
                        }`}
                      >
                        {idx + 1}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Bottom Palette Actions */}
            <div className="flex flex-col gap-2 pt-3 border-t border-[#1767be]/20">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowQuestionPaper(true)}
                  className="flex-1 py-1.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-white text-[11px] font-bold transition"
                >
                  Question Paper
                </button>
                <button
                  type="button"
                  onClick={() => setShowInstructions(true)}
                  className="flex-1 py-1.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-white text-[11px] font-bold transition"
                >
                  Instructions
                </button>
              </div>

              <button
                type="button"
                onClick={handleFinishExam}
                className="w-full py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md transition"
              >
                Submit Exam
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // MODE B: CORE BTR OBSIDIAN GLASS VIEW
  return (
    <div className="flex flex-col h-full w-full max-w-3xl mx-auto bg-[#0d1b4b] rounded-3xl border border-[#1767be]/35 shadow-2xl overflow-hidden text-white select-none animate-in zoom-in-95 duration-150">
      {/* Top Question Status Bar */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-[#1767be]/25 bg-[#1d204b]">
        <div className="flex items-center gap-3">
          <span className="font-mono text-sm font-black text-white">
            {session.activeQuestionIndex + 1}/{activeQuestions.length}
          </span>
          <span className="rounded-lg bg-[#1767be]/20 px-2.5 py-0.5 text-xs font-bold text-[#4da2ff] border border-[#1767be]/30">
            {activeQuestion.subject}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setCbtMode(true)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white/5 border border-white/10 text-xs font-semibold text-white/80 hover:text-white hover:border-[#1767be]/40 transition"
            title="Switch to TCS iON Prometric Examination Skin"
          >
            <Monitor size={13} className="text-[#4da2ff]" />
            <span className="hidden sm:inline">TCS iON CBT Mode</span>
          </button>

          <div className="flex items-center gap-1.5 rounded-xl bg-white/5 border border-white/10 px-3 py-1 text-xs font-mono font-bold text-white">
            <Timer size={13} className="text-[#4da2ff]" />
            <span>{formatTimer(elapsedTimer)}</span>
          </div>

          <button
            type="button"
            onClick={handleToggleBookmark}
            className={`p-1.5 rounded-xl transition ${
              isBookmarked
                ? "bg-[#feb122]/20 text-[#feb122] border border-[#feb122]/40"
                : "text-white/60 hover:text-white hover:bg-white/5"
            }`}
            title="Bookmark into FSRS Vault"
          >
            <Bookmark size={15} className={isBookmarked ? "fill-[#feb122]" : ""} />
          </button>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-white/60 hover:text-white hover:bg-white/10 transition"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Main Question Body */}
      <div className="flex-1 overflow-y-auto px-6 py-6 flex flex-col gap-5">
        {/* Vignette */}
        <div className="text-[15px] leading-relaxed text-white font-medium p-4 rounded-2xl bg-[#1d204b]/60 border border-[#1767be]/25">
          {activeQuestion.vignette}
        </div>

        {/* Action Row: Reset Answer & Mark for Review */}
        <div className="flex items-center justify-end gap-4 text-xs font-semibold text-white/60">
          <button
            type="button"
            onClick={handleResetAnswer}
            disabled={selectedIdx === undefined || submitted}
            className="flex items-center gap-1.5 hover:text-white transition disabled:opacity-30 cursor-pointer"
          >
            <RotateCcw size={12} />
            <span>Reset Answer</span>
          </button>
          <button
            type="button"
            onClick={handleToggleMarkReview}
            className={`flex items-center gap-1.5 transition cursor-pointer ${
              isMarkedReview ? "text-[#4da2ff] font-bold" : "hover:text-white"
            }`}
          >
            <Flag size={12} className={isMarkedReview ? "fill-[#4da2ff]" : ""} />
            <span>{isMarkedReview ? "Marked for Review" : "Mark for Review"}</span>
          </button>
        </div>

        {/* Options List with Direct Distractor Strike-Out Cross ✕ */}
        <div className="flex flex-col gap-2.5">
          {activeQuestion.options.map((option, idx) => {
            const isSelected = selectedIdx === idx;
            const isElim = eliminated.includes(idx);
            const isCorrect = idx === activeQuestion.correctIndex;

            let optionBorder = "border-[#1767be]/20 bg-[#1d204b]/40 hover:bg-[#1d204b]/80 hover:border-[#1767be]/40 text-white";
            if (submitted) {
              if (isCorrect) {
                optionBorder = "border-emerald-500 bg-emerald-500/15 text-emerald-300 font-bold";
              } else if (isSelected && !isCorrect) {
                optionBorder = "border-rose-500 bg-rose-500/15 text-rose-300 line-through";
              } else {
                optionBorder = "opacity-40 border-white/5 text-white/50";
              }
            } else if (isSelected) {
              optionBorder = "border-[#1767be] bg-[#1767be]/25 text-white font-bold ring-1 ring-[#4da2ff]";
            } else if (isElim) {
              optionBorder = "opacity-40 line-through bg-black/30 border-white/5 text-white/40";
            }

            return (
              <div
                key={idx}
                onClick={() => handleSelectOption(idx)}
                className={`flex items-center justify-between gap-3 p-3.5 rounded-2xl border transition cursor-pointer select-none ${optionBorder}`}
              >
                <div className="flex items-center gap-3 flex-1">
                  <div
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold font-mono transition ${
                      submitted && isCorrect
                        ? "bg-emerald-500 text-white"
                        : submitted && isSelected && !isCorrect
                          ? "bg-rose-500 text-white"
                          : isSelected
                            ? "bg-[#1767be] text-white"
                            : "bg-[#1767be]/15 text-[#4da2ff] border border-[#1767be]/30"
                    }`}
                  >
                    {String.fromCharCode(65 + idx)}
                  </div>
                  <span className="text-[13.5px] leading-snug">{option}</span>
                </div>

                {/* Right Action: Distractor Elimination Cross ✕ */}
                <div className="flex items-center gap-2">
                  {submitted && isCorrect && <CheckCircle2 size={16} className="text-emerald-400" />}
                  {submitted && isSelected && !isCorrect && <XCircle size={16} className="text-rose-400" />}
                  {!submitted && (
                    <button
                      type="button"
                      onClick={(e) => handleToggleEliminate(e, idx)}
                      className={`p-1 rounded-md transition text-xs font-mono font-bold ${
                        isElim
                          ? "text-rose-400 bg-rose-500/20 border border-rose-500/30"
                          : "text-white/40 hover:text-rose-400 hover:bg-white/10"
                      }`}
                      title={isElim ? "Restore distractor" : "Strike-out distractor"}
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Checkbox: I'm guessing this answer (matching official app screenshot) */}
        <label className="flex items-center gap-2.5 text-xs text-white/70 cursor-pointer pt-1 select-none">
          <input
            type="checkbox"
            checked={isGuess}
            onChange={handleToggleGuess}
            className="h-4 w-4 rounded accent-[#1767be] cursor-pointer"
          />
          <span>I'm guessing this answer</span>
        </label>

        {/* Single Submit in Practice Mode */}
        {!examMode && !submitted && (
          <div className="flex justify-end pt-1">
            <button
              type="button"
              onClick={handleSubmitSingle}
              disabled={selectedIdx === undefined}
              className="rounded-xl bg-[#1767be] hover:bg-[#155bb0] px-5 py-2 text-xs font-bold text-white shadow-md disabled:opacity-30 transition"
            >
              Confirm Answer & Reveal Rationale
            </button>
          </div>
        )}

        {/* Socratic Rationale */}
        {submitted && (
          <div className="flex flex-col gap-4 rounded-2xl border border-[#1767be]/30 bg-[#1d204b]/95 p-5 animate-in fade-in duration-200">
            <div className="flex items-start gap-2.5 rounded-xl bg-[#feb122]/10 border border-[#feb122]/30 p-3 text-xs text-[#feb122]">
              <AlertTriangle size={15} className="shrink-0 mt-0.5" />
              <div>
                <span className="font-bold uppercase tracking-wider text-[10px]">Examiner Trap Radar</span>
                <p className="text-[12px] text-white/90 leading-relaxed mt-0.5">{activeQuestion.examinerTrap}</p>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1">
                <CheckCircle2 size={13} /> Why Option {String.fromCharCode(65 + activeQuestion.correctIndex)} is Correct
              </span>
              <div className="text-[13px] text-white/90 leading-relaxed whitespace-pre-line">
                {activeQuestion.explanation.correctRationale}
              </div>
            </div>

            <div className="flex items-center gap-2 rounded-xl bg-[#1767be]/15 border border-[#1767be]/30 p-2.5 text-xs text-[#4da2ff]">
              <Lightbulb size={15} className="shrink-0" />
              <span>
                <strong className="text-white font-bold">Bottom Line: </strong>
                {activeQuestion.explanation.bottomLine}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Bar: Previous and Save & Next */}
      <div className="flex items-center justify-between px-6 py-3.5 border-t border-[#1767be]/25 bg-[#1d204b]">
        <button
          type="button"
          onClick={() =>
            setSession((prev) => ({
              ...prev,
              activeQuestionIndex: Math.max(0, prev.activeQuestionIndex - 1),
            }))
          }
          disabled={session.activeQuestionIndex === 0}
          className="px-5 py-2 rounded-xl text-xs font-bold text-white/80 hover:text-white bg-white/5 hover:bg-white/10 transition disabled:opacity-30"
        >
          Previous
        </button>

        {session.activeQuestionIndex < activeQuestions.length - 1 ? (
          <button
            type="button"
            onClick={() =>
              setSession((prev) => ({
                ...prev,
                activeQuestionIndex: prev.activeQuestionIndex + 1,
              }))
            }
            className="px-6 py-2 rounded-xl text-xs font-bold text-white bg-[#1767be] hover:bg-[#155bb0] shadow-md shadow-[#1767be]/30 transition flex items-center gap-1.5"
          >
            <span>Save & Next</span>
            <ArrowRight size={13} />
          </button>
        ) : (
          <button
            type="button"
            onClick={handleFinishExam}
            className="px-6 py-2 rounded-xl text-xs font-bold text-white bg-[#1767be] hover:bg-[#155bb0] shadow-md shadow-[#1767be]/30 transition flex items-center gap-1.5"
          >
            <span>Submit Module</span>
            <CheckCircle2 size={13} />
          </button>
        )}
      </div>
    </div>
  );
}
