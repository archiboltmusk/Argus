import { useState, useEffect, useCallback, useMemo, type MouseEvent } from "react";
import {
  CheckCircle2,
  XCircle,
  ArrowRight,
  AlertTriangle,
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
  Award,
  TrendingUp,
  ShieldAlert,
  Brain,
  Headphones,
  Activity,
  AlertOctagon,
  Lock,
} from "lucide-react";
import type { ClinicalQuestion, QBankSessionState, GrandTestResult } from "@/lib/education/qbank-types";
import { CLINICAL_QBANK_STARTER } from "@/lib/education/qbank-data";
import { saveStudyNote } from "@/lib/education/notes";
import {
  highlightStemKeywords,
  computeGuessEVReport,
  computeCognitiveFatigueBlocks,
  saveRankTelemetry,
  type AIR100ExamTelemetry,
  type AnswerChangeRecord,
  type GuessRecord,
} from "@/lib/education/btr-rank-optimizer";
import { BTRInteractiveImage } from "@/components/education/btr-interactive-image";
import { BTRClinicalAutopsy } from "@/components/education/btr-clinical-autopsy";
import {
  generateIRTRankSimulation,
  type IRTExamSimulationReport,
} from "@/lib/education/btr-irt-rank-simulator";
import {
  aggregateSessionBiases,
  type CandidateResponseTelemetry,
} from "@/lib/education/btr-cognitive-decoder";
import { BTRAudioPodModal } from "@/components/education/btr-audio-pod-modal";
import {
  buildNEETPGSectionConfigs,
  initSectionalPacingState,
  computePacingRadar,
  lockAndAdvanceSection,
  type ExamSectionConfig,
  type SectionalPacingState,
} from "@/lib/education/btr-sectional-pacing";

export type QBankRunnerProps = {
  questions?: ClinicalQuestion[];
  examMode?: boolean; // In exam mode, explanations are hidden until submission
  sectionalMode?: boolean; // 2024 NEET-PG 4-section time-boxed pacing simulator
  onFinish?: (result: GrandTestResult) => void;
  onClose: () => void;
};

export function QBankRunner({
  questions = CLINICAL_QBANK_STARTER,
  examMode = false,
  sectionalMode = false,
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
  const [rankTelemetry, setRankTelemetry] = useState<AIR100ExamTelemetry | null>(null);
  const [answerChanges, setAnswerChanges] = useState<
    Record<string, { initialOption: number; finalOption: number; timeSeconds: number }>
  >({});
  const [activeTab, setActiveTab] = useState<"analysis" | "questions">("analysis");
  const [irtSimulation, setIrtSimulation] = useState<IRTExamSimulationReport | null>(null);
  const [sessionBiases, setSessionBiases] = useState<ReturnType<typeof aggregateSessionBiases> | null>(null);
  const [showAudioPodModal, setShowAudioPodModal] = useState(false);

  // Sectional Pacing State (NEET-PG 2024 Scheme)
  const [sectionalGatedMode, setSectionalGatedMode] = useState<boolean>(sectionalMode);
  const [sectionalPacingState, setSectionalPacingState] = useState<SectionalPacingState>(initSectionalPacingState);
  const [sectionElapsedTimer, setSectionElapsedTimer] = useState<number>(0);

  const sectionConfigs: ExamSectionConfig[] = useMemo(() => {
    return buildNEETPGSectionConfigs(activeQuestions.length);
  }, [activeQuestions.length]);

  const currentSectionConfig = useMemo(() => {
    return (
      sectionConfigs.find((c) => c.sectionId === sectionalPacingState.currentSectionId) ||
      sectionConfigs[0]
    );
  }, [sectionConfigs, sectionalPacingState.currentSectionId]);

  const pacingTelemetry = useMemo(() => {
    if (!currentSectionConfig) return null;
    return computePacingRadar({
      sectionConfig: currentSectionConfig,
      currentQuestionIndex: session.activeQuestionIndex,
      sectionElapsedSeconds: sectionElapsedTimer,
    });
  }, [currentSectionConfig, session.activeQuestionIndex, sectionElapsedTimer]);

  // Timer
  useEffect(() => {
    if (examFinished) return;
    const interval = setInterval(() => {
      setElapsedTimer((t) => t + 1);
      if (sectionalGatedMode) {
        setSectionElapsedTimer((t) => t + 1);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [examFinished, sectionalGatedMode]);

  const activeQuestion = activeQuestions[session.activeQuestionIndex] ?? activeQuestions[0];
  const qId = activeQuestion?.id || "q_0";
  const selectedIdx = session.selectedAnswers[qId];
  const eliminated = session.eliminatedOptions[qId] || [];
  const submitted = examMode ? examFinished : !!session.isSubmitted[qId];
  const isBookmarked = session.bookmarks.includes(qId);
  const isMarkedReview = markedForReview.includes(qId);
  const isGuess = !!guessedQuestions[qId];

  // Handle Option Select with Answer Switch Telemetry
  const handleSelectOption = (idx: number) => {
    if (submitted) return;
    const prevSelected = session.selectedAnswers[qId];
    if (prevSelected !== undefined && prevSelected !== idx) {
      setAnswerChanges((prev) => ({
        ...prev,
        [qId]: {
          initialOption: prev[qId]?.initialOption ?? prevSelected,
          finalOption: idx,
          timeSeconds: elapsedTimer,
        },
      }));
    }
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

  // Complete Exam and calculate CoreBTR analytics + AIR < 100 Telemetry
  const handleFinishExam = useCallback(() => {
    let correct = 0;
    let incorrect = 0;
    let attempted = 0;

    const questionResults: Array<{
      questionIndex: number;
      isCorrect: boolean;
      timeSpentSeconds: number;
    }> = [];

    const guessRecords: GuessRecord[] = [];

    activeQuestions.forEach((q, idx) => {
      const sel = session.selectedAnswers[q.id];
      const timeSpent =
        session.timeSpentSec[q.id] ||
        Math.max(1, Math.round(elapsedTimer / Math.max(1, activeQuestions.length)));

      if (sel !== undefined) {
        attempted++;
        const isRight = sel === q.correctIndex;
        if (isRight) {
          correct++;
        } else {
          incorrect++;
        }

        questionResults.push({
          questionIndex: idx,
          isCorrect: isRight,
          timeSpentSeconds: timeSpent,
        });

        const elim = session.eliminatedOptions[q.id] || [];
        if (guessedQuestions[q.id] || elim.length >= 2) {
          guessRecords.push({
            questionId: q.id,
            subject: q.subject,
            eliminatedOptions: elim.map((e) => q.options[e] || ""),
            selectedOption: q.options[sel] || "",
            isCorrect: isRight,
          });
        }
      }
    });

    // NEET-PG standard scoring: +4 correct, -1 incorrect
    const score = correct * 4 - incorrect * 1;
    const maxScore = activeQuestions.length * 4;
    const accuracyPct = attempted > 0 ? Math.round((correct / attempted) * 100) : 0;

    // AIR < 100 Telemetry Computation
    const changeRecords: AnswerChangeRecord[] = Object.entries(answerChanges).map(
      ([questionId, rec]) => {
        const q = activeQuestions.find((item) => item.id === questionId);
        const initialWasCorrect = q ? rec.initialOption === q.correctIndex : false;
        const finalWasCorrect = q ? rec.finalOption === q.correctIndex : false;
        return {
          questionId,
          initialOption: String.fromCharCode(65 + rec.initialOption),
          finalOption: String.fromCharCode(65 + rec.finalOption),
          initialWasCorrect,
          finalWasCorrect,
          timeOfChangeSeconds: rec.timeSeconds,
        };
      }
    );

    const changedCorrectToIncorrect = changeRecords.filter(
      (c) => c.initialWasCorrect && !c.finalWasCorrect
    ).length;
    const changedIncorrectToCorrect = changeRecords.filter(
      (c) => !c.initialWasCorrect && c.finalWasCorrect
    ).length;
    const marksLostToSillyErrors = changedCorrectToIncorrect * 5;
    const netIntuitionGain = changedIncorrectToCorrect * 5 - marksLostToSillyErrors;
    const intuitionRatio =
      changedCorrectToIncorrect > 0
        ? Math.round((changedIncorrectToCorrect / changedCorrectToIncorrect) * 100) / 100
        : changedIncorrectToCorrect > 0
          ? 2.0
          : 1.0;

    const guessReport = computeGuessEVReport(guessRecords);
    const fatigueAnalysis = computeCognitiveFatigueBlocks(questionResults, activeQuestions.length);

    const telemetry: AIR100ExamTelemetry = {
      examId: `telemetry_${Date.now()}`,
      examTitle: examMode ? "CoreBTR National Grand Test Simulation" : "CoreBTR Custom Module Drill",
      timestamp: Date.now(),
      totalMarks: score,
      marksLostToSillyErrors,
      answerChanges: changeRecords,
      intuitionRatio,
      intuitionNetGainMarks: netIntuitionGain,
      guessStats: guessReport,
      cognitiveFatigueBlocks: fatigueAnalysis.blocks,
      fatigueSlumpDetected: fatigueAnalysis.slumpDetected,
      fatigueSlumpBlock: fatigueAnalysis.slumpBlock,
    };

    saveRankTelemetry(telemetry);
    setRankTelemetry(telemetry);

    // Item Response Theory (IRT) Latent Ability & All-India Rank Simulation
    const irtItems = activeQuestions.map((q) => {
      const sel = session.selectedAnswers[q.id];
      const isRight = sel === q.correctIndex;
      return {
        questionId: q.id,
        isCorrect: isRight,
        vignette: q.vignette,
        examinerTrap: q.examinerTrap,
        highYieldTags: q.highYieldTags,
        imageUrl: q.imageUrl,
      };
    });
    const irtReport = generateIRTRankSimulation(irtItems);
    setIrtSimulation(irtReport);

    // Socratic Cognitive Bias Diagnostics
    const candidateResponses: CandidateResponseTelemetry[] = activeQuestions.map((q) => {
      const sel = session.selectedAnswers[q.id] ?? -1;
      const timeSpent =
        session.timeSpentSec[q.id] ||
        Math.max(1, Math.round(elapsedTimer / Math.max(1, activeQuestions.length)));
      return {
        question: q,
        selectedIndex: sel,
        timeSpentSeconds: timeSpent,
        changedMind: !!answerChanges[q.id],
      };
    });
    const biasReport = aggregateSessionBiases(candidateResponses);
    setSessionBiases(biasReport);

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
  }, [
    activeQuestions,
    session.selectedAnswers,
    session.eliminatedOptions,
    session.timeSpentSec,
    guessedQuestions,
    answerChanges,
    examMode,
    elapsedTimer,
    onFinish,
  ]);

  const handleAdvanceSection = useCallback(() => {
    const res = lockAndAdvanceSection(sectionalPacingState, sectionConfigs);
    setSectionalPacingState(res.nextState);
    setSectionElapsedTimer(0);
    if (res.isFinished) {
      handleFinishExam();
    } else if (res.nextQuestionIndex >= 0) {
      setSession((prev) => ({
        ...prev,
        activeQuestionIndex: res.nextQuestionIndex,
      }));
    }
  }, [sectionalPacingState, sectionConfigs, handleFinishExam]);

  // Auto-lock section when time limit expires under Sectional Mode
  useEffect(() => {
    if (!sectionalGatedMode || examFinished || !currentSectionConfig) return;
    if (
      currentSectionConfig.timeLimitSeconds > 0 &&
      sectionElapsedTimer >= currentSectionConfig.timeLimitSeconds
    ) {
      handleAdvanceSection();
    }
  }, [
    sectionalGatedMode,
    examFinished,
    currentSectionConfig,
    sectionElapsedTimer,
    handleAdvanceSection,
  ]);

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
    setAnswerChanges({});
    setRankTelemetry(null);
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
      <div className="flex flex-col h-full w-full max-w-4xl mx-auto bg-surface rounded-3xl border border-edge shadow-2xl overflow-hidden text-white select-none animate-in zoom-in-95 duration-200">
        {/* Top Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-edge bg-elevated">
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
                  activeTab === "analysis" ? "bg-white text-black font-semibold shadow-xs" : "text-white/60 hover:text-white"
                }`}
              >
                Analysis
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("questions")}
                className={`px-3 py-1 rounded-lg font-bold transition ${
                  activeTab === "questions" ? "bg-white text-black font-semibold shadow-xs" : "text-white/60 hover:text-white"
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
                <div className="p-4 rounded-2xl bg-elevated border border-edge flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-md">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-amber-500/15 text-amber-300 border border-amber-500/30 flex items-center justify-center shrink-0">
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
                    className="w-full sm:w-auto px-4 py-2 rounded-xl bg-white hover:bg-white/90 text-black font-semibold font-extrabold text-xs shadow-md transition shrink-0"
                  >
                    Start Recovery Sprint ({incorrectCount} Qs)
                  </button>
                </div>
              )}

              {/* Accuracy & Breakdown Card (Matching App Store Screenshot) */}
              <div className="p-5 rounded-2xl bg-elevated/70 border border-edge flex flex-col gap-4">
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
                <div className="p-3.5 rounded-2xl bg-elevated border border-edge flex flex-col">
                  <span className="text-[11px] text-white/60">Marks Obtained</span>
                  <strong className="text-base font-black text-white mt-0.5">
                    {resultData.score > 0 ? `+${resultData.score}` : resultData.score} / {resultData.maxScore}
                  </strong>
                </div>

                <div className="p-3.5 rounded-2xl bg-elevated border border-edge flex flex-col">
                  <span className="text-[11px] text-white/60">Total Time</span>
                  <strong className="text-base font-black text-white mt-0.5">
                    {resultData.timeSpentMinutes} min
                  </strong>
                </div>

                <div className="p-3.5 rounded-2xl bg-elevated border border-edge flex flex-col">
                  <span className="text-[11px] text-white/60">Guess Accuracy</span>
                  <strong className="text-base font-black text-ink-muted mt-0.5">
                    {guessAccuracy}%
                  </strong>
                </div>

                <div className="p-3.5 rounded-2xl bg-elevated border border-edge flex flex-col">
                  <span className="text-[11px] text-white/60">Accuracy</span>
                  <strong className="text-base font-black text-emerald-400 mt-0.5">
                    {resultData.accuracyPct}%
                  </strong>
                </div>

                <div className="p-3.5 rounded-2xl bg-elevated border border-edge flex flex-col">
                  <span className="text-[11px] text-white/60">Avg Time / Question</span>
                  <strong className="text-base font-black text-white mt-0.5">
                    {avgTimePerQ} sec/ques
                  </strong>
                </div>

                <div className="p-3.5 rounded-2xl bg-elevated border border-edge flex flex-col">
                  <span className="text-[11px] text-white/60">Correct Guesses</span>
                  <strong className="text-base font-black text-amber-400 mt-0.5">
                    {correctGuesses} out of {totalGuesses}
                  </strong>
                </div>
              </div>

              {/* AIR < 100 Rank Maximization Telemetry Suite */}
              {rankTelemetry && (
                <div className="p-5 rounded-3xl bg-surface/90 border border-edge shadow-xl flex flex-col gap-5">
                  <div className="flex items-center justify-between border-b border-edge pb-3">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-xl bg-amber-500/15 text-amber-300 border border-amber-500/30 flex items-center justify-center shrink-0">
                        <Award size={18} className="text-amber-400" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-black text-white">
                            AIR &lt; 100 Rank Maximization Telemetry
                          </h3>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                            Frontier Engine
                          </span>
                        </div>
                        <p className="text-[11px] text-white/60">
                          Silly mistakes elimination, 50:50 guess expected value, and 8-block cognitive pacing
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* 1. Silly Mistake & Instinct Radar */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 rounded-2xl bg-elevated border border-edge flex flex-col justify-between gap-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <ShieldAlert size={16} className="text-amber-400" />
                          <span className="text-xs font-bold text-white">
                            Zero-Silly-Mistake Radar
                          </span>
                        </div>
                        <span className="font-mono text-xs font-black text-amber-300">
                          {rankTelemetry.marksLostToSillyErrors > 0
                            ? `-${rankTelemetry.marksLostToSillyErrors} Marks`
                            : "0 Marks Lost"}
                        </span>
                      </div>

                      <div className="text-xs text-white/80 leading-relaxed">
                        {rankTelemetry.marksLostToSillyErrors === 0 ? (
                          <div className="flex items-center gap-2 text-emerald-400 font-semibold">
                            <CheckCircle2 size={16} />
                            <span>Zero silly errors! You maintained elite instinct discipline.</span>
                          </div>
                        ) : (
                          <div className="flex items-start gap-2 text-rose-300">
                            <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                            <span>
                              Lost {rankTelemetry.marksLostToSillyErrors} marks by altering correct answers to wrong choices. Trust your primary clinical instinct!
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-between text-[11px] pt-2 border-t border-edge text-white/60">
                        <span>Total Answer Switches: {rankTelemetry.answerChanges.length}</span>
                        <span>Instinct Ratio: {rankTelemetry.intuitionRatio}x</span>
                      </div>
                    </div>

                    {/* 2. 50:50 Guess Expected Value (EV) */}
                    <div className="p-4 rounded-2xl bg-elevated border border-edge flex flex-col justify-between gap-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <TrendingUp size={16} className="text-emerald-400" />
                          <span className="text-xs font-bold text-white">
                            50:50 Guess Expected Value (EV)
                          </span>
                        </div>
                        <span className="font-mono text-xs font-black text-emerald-400">
                          {rankTelemetry.guessStats.neetExpectedValueMarks >= 0 ? "+" : ""}
                          {rankTelemetry.guessStats.neetExpectedValueMarks} NEET Marks
                        </span>
                      </div>

                      <p className="text-xs text-white/70">
                        Strike rate across {rankTelemetry.guessStats.totalGuesses} educated guesses is{" "}
                        <strong className="text-white">{rankTelemetry.guessStats.strikeRatePct}%</strong>.
                        {rankTelemetry.guessStats.strikeRatePct >= 50
                          ? " Aggressive elimination strategy yielded net positive marks!"
                          : " Selective elimination required; stick to high-confidence topics."}
                      </p>

                      <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-edge">
                        {rankTelemetry.guessStats.subjectGuidance.slice(0, 3).map((g) => (
                          <span
                            key={g.subject}
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                              g.action === "ALWAYS_ATTEMPT"
                                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                                : g.action === "CALCULATED_RISK"
                                  ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                                  : "bg-rose-500/20 text-rose-300 border border-rose-500/40"
                            }`}
                          >
                            {g.subject}: {g.action.replace("_", " ")} ({g.strikeRatePct}%)
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* 3. 8-Block Cognitive Fatigue & Endurance Curve */}
                  {rankTelemetry.cognitiveFatigueBlocks.length > 0 && (
                    <div className="p-4 rounded-2xl bg-elevated border border-edge flex flex-col gap-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Brain size={16} className="text-purple-400" />
                          <span className="text-xs font-bold text-white">
                            8-Block Cognitive Fatigue Profile (3.5-Hour Endurance Curve)
                          </span>
                        </div>
                        {rankTelemetry.fatigueSlumpDetected ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-rose-500/20 text-rose-400 border border-rose-500/40">
                            Fatigue Slump Detected in Block #{rankTelemetry.fatigueSlumpBlock}
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                            Pacing Stable Across 8 Blocks
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-4 sm:grid-cols-8 gap-2 pt-2">
                        {rankTelemetry.cognitiveFatigueBlocks.map((b) => (
                          <div
                            key={b.blockNumber}
                            className={`p-2 rounded-xl border flex flex-col items-center justify-center gap-1 ${
                              rankTelemetry.fatigueSlumpBlock === b.blockNumber
                                ? "bg-rose-500/15 border-rose-500/40 ring-1 ring-rose-500/30"
                                : "bg-surface/80 border-edge"
                            }`}
                          >
                            <span className="text-[10px] font-mono text-white/50">
                              B#{b.blockNumber}
                            </span>
                            <strong
                              className={`text-xs font-black ${
                                b.accuracyPct >= 70
                                  ? "text-emerald-400"
                                  : b.accuracyPct >= 50
                                    ? "text-amber-400"
                                    : "text-rose-400"
                              }`}
                            >
                              {b.accuracyPct}%
                            </strong>
                            <span className="text-[9px] text-white/40 font-mono">
                              {b.avgTimePerQuestionSec}s/q
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* IRT 2PL Model All-India Rank Projection */}
              {irtSimulation && (
                <div className="p-5 rounded-3xl bg-surface/90 border border-edge shadow-xl flex flex-col gap-4">
                  <div className="flex items-center justify-between border-b border-edge pb-3">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-xl bg-accent/15 text-accent border border-accent/30 flex items-center justify-center shrink-0">
                        <Activity size={18} className="text-accent" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-black text-white">
                            Item Response Theory (IRT) Rank Simulation
                          </h3>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-accent/20 text-accent border border-accent/40 font-mono">
                            2PL Model (N=200,000)
                          </span>
                        </div>
                        <p className="text-[11px] text-white/60">
                          Latent clinical ability θ calibrated against national NEET-PG percentile distribution
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] font-mono uppercase text-white/50 block">Projected Percentile</span>
                      <strong className="text-base font-black text-accent font-mono">
                        {irtSimulation.projectedNeetPercentile}%
                      </strong>
                    </div>
                  </div>

                  {/* AIR Range Triple Display */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="p-3.5 rounded-2xl bg-elevated border border-edge flex flex-col items-center justify-center text-center">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-white/50">Best-Case AIR</span>
                      <strong className="text-xl font-black text-emerald-400 font-mono mt-0.5">
                        AIR #{irtSimulation.projectedAIRRange.best.toLocaleString()}
                      </strong>
                      <span className="text-[10px] text-emerald-400/80 mt-0.5">Optimal exam execution</span>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-accent/10 border border-accent/30 flex flex-col items-center justify-center text-center">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-accent">Median Projected AIR</span>
                      <strong className="text-2xl font-black text-white font-mono mt-0.5">
                        AIR #{irtSimulation.projectedAIRRange.median.toLocaleString()}
                      </strong>
                      <span className="text-[10px] text-white/70 mt-0.5">θ = {irtSimulation.thetaAbility} (50% likelihood)</span>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-elevated border border-edge flex flex-col items-center justify-center text-center">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-white/50">Conservative AIR</span>
                      <strong className="text-xl font-black text-amber-300 font-mono mt-0.5">
                        AIR #{irtSimulation.projectedAIRRange.conservative.toLocaleString()}
                      </strong>
                      <span className="text-[10px] text-amber-300/80 mt-0.5">Worst-case boundary</span>
                    </div>
                  </div>

                  {/* Cardinal Sin Repeats vs Frontier Deciders */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    <div className="p-3.5 rounded-2xl bg-elevated border border-edge flex flex-col justify-between gap-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-white flex items-center gap-1.5">
                          <AlertOctagon size={14} className="text-rose-400" />
                          <span>Cardinal Sin Repeats Missed</span>
                        </span>
                        <span className="font-mono font-black text-rose-400">
                          {irtSimulation.cardinalRepeatsMissed} Qs
                        </span>
                      </div>
                      <p className="text-[11px] text-white/70 leading-relaxed">
                        {irtSimulation.cardinalRepeatsMissed > 0
                          ? `Missing ${irtSimulation.cardinalRepeatsMissed} standard repeat(s) cost an estimated -${irtSimulation.rankLostToCardinalErrors} All-India ranks.`
                          : "Zero cardinal repeats missed! Flawless defense on must-know fundamentals."}
                      </p>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-elevated border border-edge flex flex-col justify-between gap-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-white flex items-center gap-1.5">
                          <TrendingUp size={14} className="text-emerald-400" />
                          <span>Frontier Deciders Secured</span>
                        </span>
                        <span className="font-mono font-black text-emerald-400">
                          {irtSimulation.frontierDecidersSecured} Qs
                        </span>
                      </div>
                      <p className="text-[11px] text-white/70 leading-relaxed">
                        {irtSimulation.frontierDecidersSecured > 0
                          ? `Secured ${irtSimulation.frontierDecidersSecured} high-discrimination frontier decider(s), elevating rank by +${irtSimulation.rankGainedFromFrontierDeciders} ranks!`
                          : "No frontier deciders converted yet. Drill the Top-100 Frontier Vault to secure top-tier tie-breakers."}
                      </p>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-canvas border border-edge text-xs text-white/80 leading-relaxed">
                    <strong>IRT Executive Summary:</strong> {irtSimulation.executiveSummary}
                  </div>
                </div>
              )}

              {/* Socratic Cognitive Bias & Misreading Decoder */}
              {sessionBiases && sessionBiases.totalErrors > 0 && (
                <div className="p-5 rounded-3xl bg-surface/90 border border-edge shadow-xl flex flex-col gap-4">
                  <div className="flex items-center justify-between border-b border-edge pb-3">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-xl bg-purple-500/15 text-purple-300 border border-purple-500/30 flex items-center justify-center shrink-0">
                        <Brain size={18} className="text-purple-400" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-black text-white">
                            Socratic Cognitive Bias & Misreading Decoder
                          </h3>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40">
                            Debiasing Engine
                          </span>
                        </div>
                        <p className="text-[11px] text-white/60">
                          Root-cause breakdown of error cognitive patterns and examiner trap vulnerabilities
                        </p>
                      </div>
                    </div>
                    <span className="text-xs font-mono font-bold text-rose-400">
                      {sessionBiases.totalErrors} Error Patterns Analyzed
                    </span>
                  </div>

                  {/* Primary Bias Alert Banner */}
                  <div className="p-4 rounded-2xl bg-purple-950/30 border border-purple-500/30 flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-purple-300 uppercase tracking-wider">
                        Primary Diagnosed Cognitive Bias
                      </span>
                      <span className="text-xs font-mono font-bold text-white bg-purple-500/30 px-2 py-0.5 rounded-md">
                        {sessionBiases.primaryBias}
                      </span>
                    </div>
                    <p className="text-xs text-white/80 leading-relaxed">
                      {sessionBiases.executiveActionPlan}
                    </p>
                  </div>

                  {/* Bias Distribution Bar */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
                    {Object.entries(sessionBiases.biasCounts).map(([bias, count]) => (
                      <div
                        key={bias}
                        className={`p-2.5 rounded-xl border flex flex-col items-center justify-center text-center ${
                          sessionBiases.primaryBias === bias
                            ? "bg-purple-500/20 border-purple-500/50 text-purple-200"
                            : "bg-elevated border-edge text-white/70"
                        }`}
                      >
                        <span className="text-[10px] font-semibold truncate max-w-full">
                          {bias.replace("Bias", "").replace("Fall", "").replace("Gap", "")}
                        </span>
                        <strong className="text-sm font-black font-mono mt-0.5">{count}</strong>
                      </div>
                    ))}
                  </div>
                </div>
              )}

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
                        className="flex flex-col gap-2.5 p-4 rounded-2xl bg-elevated border border-edge hover:border-white/20 transition"
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
                            className="text-xs font-bold text-ink-muted hover:underline transition flex items-center gap-1"
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
                        ? "bg-elevated/80 border-emerald-500/40"
                        : isUnanswered
                          ? "bg-elevated border-white/10"
                          : "bg-elevated/80 border-rose-500/40"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-white/70">
                          Q{idx + 1}
                        </span>
                        <span className="text-xs font-semibold px-2 py-0.5 rounded bg-white/10 text-white/90 border border-white/15">
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

                    {/* Interactive Image if present */}
                    {(q.imageUrl || (q as any).images?.[0]?.url) && (
                      <div className="mt-3">
                        <BTRInteractiveImage
                          imageUrl={q.imageUrl || (q as any).images?.[0]?.url}
                          caption={q.topic}
                          imagingMeta={q.imagingMeta}
                        />
                      </div>
                    )}

                    {/* 5-Tier Clinical Autopsy & Distractor Inversion */}
                    <div className="mt-3">
                      <BTRClinicalAutopsy
                        question={q}
                        selectedOptionIndex={sel}
                        onBookmarkFSRS={() => {
                          if (!session.bookmarks.includes(q.id)) {
                            setSession((prev) => ({
                              ...prev,
                              bookmarks: [...prev.bookmarks, q.id],
                            }));
                          }
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Bottom Done Button */}
        <div className="p-4 border-t border-edge bg-elevated flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 rounded-2xl bg-white hover:bg-white/90 text-black font-semibold font-bold text-xs transition"
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
        <div className="relative w-full max-w-3xl max-h-[85vh] bg-surface rounded-3xl border border-edge shadow-2xl flex flex-col overflow-hidden text-white">
          <div className="flex items-center justify-between px-6 py-4 border-b border-edge bg-elevated">
            <div className="flex items-center gap-2">
              <FileText size={18} className="text-ink-muted" />
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
              <div key={q.id} className="p-4 rounded-2xl bg-elevated/70 border border-edge flex flex-col gap-2">
                <span className="font-bold text-xs text-ink-muted">Question {i + 1} • {q.subject}</span>
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
        <div className="relative w-full max-w-2xl max-h-[85vh] bg-surface rounded-3xl border border-edge shadow-2xl flex flex-col overflow-hidden text-white">
          <div className="flex items-center justify-between px-6 py-4 border-b border-edge bg-elevated">
            <div className="flex items-center gap-2">
              <Info size={18} className="text-ink-muted" />
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
      <div className="flex flex-col h-full w-full max-w-5xl mx-auto bg-surface rounded-3xl border border-edge shadow-2xl overflow-hidden text-white select-none animate-in zoom-in-95 duration-150">
        {/* TCS iON Official Masthead */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-edge bg-elevated">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-black font-semibold font-bold text-xs">
              CBT
            </div>
            <div>
              <h2 className="text-xs font-bold text-white tracking-tight">
                National Board of Examinations • NEET-PG / INI-CET Computer-Based Test
              </h2>
              <span className="text-[10px] text-ink-muted">Subject: {activeQuestion.subject} • Official TCS iON Skin</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setSectionalGatedMode((prev) => !prev)}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold transition shadow-xs ${
                sectionalGatedMode
                  ? "bg-purple-600/30 border border-purple-500/50 text-purple-200"
                  : "bg-white/5 border border-white/10 text-white/60 hover:text-white"
              }`}
              title="Toggle NEET-PG 2024 4-Section Time-Boxed Lockout"
            >
              <Activity size={13} />
              <span className="hidden sm:inline">NBE 2024 Sections:</span>
              <span>{sectionalGatedMode ? "ON" : "OFF"}</span>
            </button>

            <button
              type="button"
              onClick={() => setShowAudioPodModal(true)}
              className="flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold bg-amber-500/15 border border-amber-500/30 text-amber-300 hover:bg-amber-500/25 transition shadow-xs"
              title="Hands-Free Active Recall Audio Pod"
            >
              <Headphones size={13} />
              <span className="hidden sm:inline">Audio Pod</span>
            </button>

            <div className="flex items-center gap-1.5 rounded-xl bg-white/5 border border-white/10 px-3 py-1 font-mono text-xs font-bold text-white">
              <Timer size={13} className="text-ink-muted" />
              <span>Time Left: {formatTimer(7200 - elapsedTimer)}</span>
            </div>

            <button
              type="button"
              onClick={() => setCbtMode(false)}
              className="text-xs text-ink-muted hover:underline font-semibold"
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

        {/* NBE 2024 Official Sectional Pacing & Lockout Sub-Header */}
        {sectionalGatedMode && (
          <div className="flex flex-wrap items-center justify-between px-6 py-2.5 bg-black/50 border-b border-edge text-xs">
            {/* 4 Section Tabs */}
            <div className="flex items-center gap-1.5 sm:gap-2">
              {sectionConfigs.map((sec) => {
                const isCurrent = sec.sectionId === sectionalPacingState.currentSectionId;
                const isLocked = sectionalPacingState.sectionStates[sec.sectionId]?.isLocked;
                return (
                  <div
                    key={sec.sectionId}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition ${
                      isCurrent
                        ? "bg-white text-black font-semibold shadow-xs"
                        : isLocked
                          ? "bg-white/5 text-white/40 line-through"
                          : "bg-white/10 text-white/70"
                    }`}
                  >
                    {isLocked && <Lock size={11} className="text-white/40" />}
                    <span>Sec {sec.sectionId}</span>
                    <span className="text-[10px] opacity-75">
                      (Q{sec.startIndex + 1}-{sec.endIndex + 1})
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Pacing Radar Telemetry */}
            {pacingTelemetry && (
              <div className="flex items-center gap-3">
                <div
                  className={`flex items-center gap-2 px-3 py-1 rounded-lg font-mono text-[11px] font-bold border ${
                    pacingTelemetry.pacingStatus === "optimal"
                      ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-300"
                      : pacingTelemetry.pacingStatus === "rushing"
                        ? "bg-amber-500/15 border-amber-500/30 text-amber-300"
                        : "bg-rose-500/20 border-rose-500/40 text-rose-300 animate-pulse"
                  }`}
                  title={pacingTelemetry.pacingMessage}
                >
                  <Activity size={12} />
                  <span>Sec Time Left: {formatTimer(pacingTelemetry.sectionTimeRemainingSeconds)}</span>
                  <span>•</span>
                  <span>
                    Pacing: {pacingTelemetry.driftSeconds <= 0 ? "" : "+"}
                    {pacingTelemetry.driftSeconds}s ({pacingTelemetry.pacingStatus.replace(/_/g, " ")})
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleAdvanceSection}
                  className="px-3 py-1 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-[11px] font-bold shadow-xs transition"
                >
                  {sectionalPacingState.currentSectionId === "D"
                    ? "Final Submission"
                    : `Lock Sec ${sectionalPacingState.currentSectionId} & Next`}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Two-Column Split Layout */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* Left Column: Active Question */}
          <div className="flex-1 flex flex-col overflow-y-auto p-6 border-r border-edge">
            {/* Question Header */}
            <div className="flex items-center justify-between border-b border-edge pb-3 mb-4">
              <span className="font-bold text-sm text-white">
                Question No. {session.activeQuestionIndex + 1}
              </span>
              <span className="text-[11px] text-white/60 font-mono">
                Marks for correct answer: +4 | Negative mark: -1
              </span>
            </div>

            {/* Vignette with Negative Keyword Alert Radar */}
            <div className="text-[14.5px] leading-relaxed text-white font-medium p-4 rounded-2xl bg-elevated border border-edge mb-5">
              {highlightStemKeywords(activeQuestion.vignette).map((part, pIdx) =>
                part.isNegativeKeyword ? (
                  <span
                    key={pIdx}
                    className="px-1.5 py-0.5 mx-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/40 font-black tracking-wide"
                  >
                    {part.text}
                  </span>
                ) : (
                  <span key={pIdx}>{part.text}</span>
                )
              )}
            </div>

            {/* Interactive Clinical & Radiological Imaging Suite */}
            {(activeQuestion.imageUrl || (activeQuestion as any).images?.[0]?.url) && (
              <BTRInteractiveImage
                imageUrl={activeQuestion.imageUrl || (activeQuestion as any).images?.[0]?.url}
                caption={activeQuestion.topic}
                imagingMeta={activeQuestion.imagingMeta}
              />
            )}

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
                        ? "bg-white/15 border-edge text-white font-bold ring-1 ring-white/40"
                        : isElim
                          ? "opacity-35 line-through bg-black/20 border-white/5 text-white/40"
                          : "bg-elevated/40 border-edge hover:bg-elevated/80 text-white"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`h-4 w-4 rounded-full border flex items-center justify-center ${
                          isSelected ? "border-white/20 bg-white text-black" : "border-white/40"
                        }`}
                      >
                        {isSelected && <div className="h-2 w-2 rounded-full bg-white" />}
                      </div>
                      <span className="text-xs font-mono font-bold text-ink-muted">
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
            <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-edge mt-4">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleToggleMarkReview}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
                    isMarkedReview
                      ? "bg-purple-600 text-white"
                      : "bg-elevated border border-edge text-white hover:bg-raised"
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
                    className="px-5 py-1.5 rounded-xl bg-white hover:bg-white/90 text-black font-semibold text-xs font-bold shadow-md transition"
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
              <div className="flex items-center gap-3 p-3 rounded-2xl bg-elevated/70 border border-edge">
                <div className="h-10 w-10 rounded-full bg-white text-black font-semibold font-bold flex items-center justify-center shrink-0">
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
              <div className="flex flex-col gap-2 pt-2 border-t border-edge">
                <span className="text-[11px] font-bold text-white/70">
                  Choose a Question:
                </span>
                <div className="grid grid-cols-5 gap-1.5 max-h-56 overflow-y-auto p-1">
                  {activeQuestions.map((q, idx) => {
                    const status = getQuestionPaletteStatus(idx);
                    const isCurrent = idx === session.activeQuestionIndex;
                    const qSection = sectionConfigs.find(
                      (c) => idx >= c.startIndex && idx <= c.endIndex
                    );
                    const isSectionLocked =
                      sectionalGatedMode && qSection
                        ? qSection.sectionId !== sectionalPacingState.currentSectionId
                        : false;

                    let bgClass = "bg-white/10 text-white/70";
                    if (isSectionLocked)
                      bgClass = "bg-black/40 text-white/20 border border-white/5 cursor-not-allowed";
                    else if (status === "answered") bgClass = "bg-emerald-600 text-white font-bold";
                    else if (status === "not_answered") bgClass = "bg-rose-600 text-white font-bold";
                    else if (status === "marked" || status === "ans_marked")
                      bgClass = "bg-purple-600 text-white font-bold";

                    return (
                      <button
                        key={q.id}
                        type="button"
                        disabled={isSectionLocked}
                        title={
                          isSectionLocked
                            ? `Locked in Section ${qSection?.sectionId} under NBE 2024 scheme`
                            : undefined
                        }
                        onClick={() =>
                          !isSectionLocked &&
                          setSession((prev) => ({
                            ...prev,
                            activeQuestionIndex: idx,
                          }))
                        }
                        className={`h-8 rounded-lg font-mono text-xs font-bold transition flex items-center justify-center relative ${bgClass} ${
                          isCurrent
                            ? "ring-2 ring-white scale-105"
                            : isSectionLocked
                              ? "opacity-40"
                              : "hover:brightness-110"
                        }`}
                      >
                        {isSectionLocked ? <Lock size={11} className="text-white/40" /> : idx + 1}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Bottom Palette Actions */}
            <div className="flex flex-col gap-2 pt-3 border-t border-edge">
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
    <div className="flex flex-col h-full w-full max-w-3xl mx-auto bg-surface rounded-3xl border border-edge shadow-2xl overflow-hidden text-white select-none animate-in zoom-in-95 duration-150">
      {/* Top Question Status Bar */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-edge bg-elevated">
        <div className="flex items-center gap-3">
          <span className="font-mono text-sm font-black text-white">
            {session.activeQuestionIndex + 1}/{activeQuestions.length}
          </span>
          <span className="rounded-lg bg-white/10 px-2.5 py-0.5 text-xs font-bold text-ink-muted border border-edge">
            {activeQuestion.subject}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setCbtMode(true)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white/5 border border-white/10 text-xs font-semibold text-white/80 hover:text-white hover:border-edge transition"
            title="Switch to TCS iON Prometric Examination Skin"
          >
            <Monitor size={13} className="text-ink-muted" />
            <span className="hidden sm:inline">TCS iON CBT Mode</span>
          </button>

          <button
            type="button"
            onClick={() => setShowAudioPodModal(true)}
            className="flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold bg-amber-500/15 border border-amber-500/30 text-amber-300 hover:bg-amber-500/25 transition shadow-xs"
            title="Hands-Free Active Recall Audio Pod"
          >
            <Headphones size={13} />
            <span className="hidden sm:inline">Audio Pod</span>
          </button>

          <div className="flex items-center gap-1.5 rounded-xl bg-white/5 border border-white/10 px-3 py-1 text-xs font-mono font-bold text-white">
            <Timer size={13} className="text-ink-muted" />
            <span>{formatTimer(elapsedTimer)}</span>
          </div>

          <button
            type="button"
            onClick={handleToggleBookmark}
            className={`p-1.5 rounded-xl transition ${
              isBookmarked
                ? "bg-amber-500/15 text-amber-300 border border-amber-500/30"
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
        {/* Vignette with Negative Keyword Alert Radar */}
        <div className="text-[15px] leading-relaxed text-white font-medium p-4 rounded-2xl bg-elevated border border-edge">
          {highlightStemKeywords(activeQuestion.vignette).map((part, pIdx) =>
            part.isNegativeKeyword ? (
              <span
                key={pIdx}
                className="px-1.5 py-0.5 mx-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/40 font-black tracking-wide"
              >
                {part.text}
              </span>
            ) : (
              <span key={pIdx}>{part.text}</span>
            )
          )}
        </div>

        {/* Interactive Clinical & Radiological Imaging Suite */}
        {(activeQuestion.imageUrl || (activeQuestion as any).images?.[0]?.url) && (
          <BTRInteractiveImage
            imageUrl={activeQuestion.imageUrl || (activeQuestion as any).images?.[0]?.url}
            caption={activeQuestion.topic}
            imagingMeta={activeQuestion.imagingMeta}
          />
        )}

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
              isMarkedReview ? "text-ink-muted font-bold" : "hover:text-white"
            }`}
          >
            <Flag size={12} className={isMarkedReview ? "fill-accent text-accent" : ""} />
            <span>{isMarkedReview ? "Marked for Review" : "Mark for Review"}</span>
          </button>
        </div>

        {/* Options List with Direct Distractor Strike-Out Cross ✕ */}
        <div className="flex flex-col gap-2.5">
          {activeQuestion.options.map((option, idx) => {
            const isSelected = selectedIdx === idx;
            const isElim = eliminated.includes(idx);
            const isCorrect = idx === activeQuestion.correctIndex;

            let optionBorder = "border-edge bg-elevated/40 hover:bg-elevated/80 hover:border-edge text-white";
            if (submitted) {
              if (isCorrect) {
                optionBorder = "border-emerald-500 bg-emerald-500/15 text-emerald-300 font-bold";
              } else if (isSelected && !isCorrect) {
                optionBorder = "border-rose-500 bg-rose-500/15 text-rose-300 line-through";
              } else {
                optionBorder = "opacity-40 border-white/5 text-white/50";
              }
            } else if (isSelected) {
              optionBorder = "border-edge bg-white/15 text-white font-bold ring-1 ring-white/40";
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
                            ? "bg-white text-black font-semibold"
                            : "bg-white/10 text-white/90 border border-white/15"
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
            className="h-4 w-4 rounded accent-white cursor-pointer"
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
              className="rounded-xl bg-white text-black hover:bg-white/90 px-5 py-2 text-xs font-bold text-white shadow-md disabled:opacity-30 transition"
            >
              Confirm Answer & Reveal Rationale
            </button>
          </div>
        )}

        {/* 5-Tier Clinical Autopsy, Distractor Inversion & Synapse Engine */}
        {submitted && (
          <BTRClinicalAutopsy
            question={activeQuestion}
            selectedOptionIndex={selectedIdx}
            onBookmarkFSRS={handleToggleBookmark}
          />
        )}
      </div>

      {/* Bottom Bar: Previous and Save & Next */}
      <div className="flex items-center justify-between px-6 py-3.5 border-t border-edge bg-elevated">
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
            className="px-6 py-2 rounded-xl text-xs font-bold text-white bg-white text-black hover:bg-white/90 shadow-md shadow-black/30 transition flex items-center gap-1.5"
          >
            <span>Save & Next</span>
            <ArrowRight size={13} />
          </button>
        ) : (
          <button
            type="button"
            onClick={handleFinishExam}
            className="px-6 py-2 rounded-xl text-xs font-bold text-white bg-white text-black hover:bg-white/90 shadow-md shadow-black/30 transition flex items-center gap-1.5"
          >
            <span>Submit Module</span>
            <CheckCircle2 size={13} />
          </button>
        )}
      </div>

      {/* Hands-Free Rapid Audio Pod Modal */}
      <BTRAudioPodModal
        isOpen={showAudioPodModal}
        onClose={() => setShowAudioPodModal(false)}
        questions={activeQuestions}
      />
    </div>
  );
}
