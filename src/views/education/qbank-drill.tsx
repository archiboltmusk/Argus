import { useState, useEffect, useCallback, useRef, type MouseEvent } from "react";
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
} from "lucide-react";
import type {
  ClinicalQuestion,
  QBankSessionState,
  GrandTestResult,
} from "@/lib/education/qbank-types";
import { getAllQuestions } from "@/lib/education/qbank-store";
import { CLINICAL_QBANK_STARTER } from "@/lib/education/qbank-data";
import {
  answerSpecFor,
  hasAnswer,
  isCorrectAnswer,
  correctAnswerLabel,
} from "@/lib/education/question-integrity";
import {
  attemptKey,
  loadAttempt,
  saveAttempt,
  elapsedSeconds,
  reportQuestion,
  newAttempt,
} from "@/lib/education/attempts";
import { getStudyNotes, saveStudyNote } from "@/lib/education/notes";

export type QBankRunnerProps = {
  questions?: ClinicalQuestion[];
  examMode?: boolean; // In exam mode, explanations are hidden until submission
  durationMinutes?: number; // Optional custom practice deadline, independent of official exam rules.
  onFinish?: (result: GrandTestResult) => void;
  onClose: () => void;
};

export function QBankRunner(props: QBankRunnerProps) {
  const [retest, setRetest] = useState<ClinicalQuestion | null>(null);
  const questions = retest ? [retest] : (props.questions ?? CLINICAL_QBANK_STARTER);
  if (!questions.length)
    return (
      <div role="alert">
        No valid questions are available. <button onClick={props.onClose}>Close</button>
      </div>
    );
  return (
    <>
      <QBankSession
        key={attemptKey(questions, props.examMode ?? false, props.durationMinutes)}
        {...props}
        questions={questions}
        onRetest={setRetest}
      />
      {retest && (
        <button className="p-2 text-indigo-300" onClick={() => setRetest(null)}>
          Return to original drill
        </button>
      )}
    </>
  );
}

function QBankSession({
  questions = CLINICAL_QBANK_STARTER,
  examMode = false,
  durationMinutes,
  onFinish,
  onClose,
  onRetest,
}: QBankRunnerProps & { onRetest: (question: ClinicalQuestion) => void }) {
  const [storageKey] = useState(() => attemptKey(questions, examMode, durationMinutes));
  const [session, setSessionState] = useState<QBankSessionState>(() => {
    const restored = loadAttempt(storageKey, questions);
    if (durationMinutes && !restored.deadlineAt)
      restored.deadlineAt = (restored.startedAt ?? Date.now()) + durationMinutes * 60000;
    return restored;
  });
  const sessionRef = useRef(session);

  const [saveError, setSaveError] = useState<string | null>(null);
  const setSession = (change: (previous: QBankSessionState) => QBankSessionState) => {
    let next = change(sessionRef.current);
    const previous = sessionRef.current;
    const now = Date.now();
    if (next.startedAt === previous.startedAt && !previous.finishedAt) {
      const previousId = questions[previous.activeQuestionIndex]?.id;
      if (previousId)
        next = {
          ...next,
          timeSpentSec: {
            ...next.timeSpentSec,
            [previousId]:
              (previous.timeSpentSec[previousId] ?? 0) +
              Math.max(0, (now - (previous.activeSince ?? previous.startedAt ?? now)) / 1000),
          },
        };
    }
    next = { ...next, activeSince: now };
    sessionRef.current = next;
    try {
      saveAttempt(storageKey, questions, next);
      setSaveError(null);
    } catch {
      setSaveError("Progress is not saved. Free storage and retry before closing.");
    }
    setSessionState(next);
  };
  const guessedQuestions = session.guessedQuestions ?? {};
  const markedForReview = session.markedForReview ?? [];
  const examFinished = !!session.result;
  const resultData = session.result ?? null;
  const [elapsedTimer, setElapsedTimer] = useState(() => elapsedSeconds(session));
  const [activeTab, setActiveTab] = useState<"analysis" | "questions">("analysis");
  const [dispute, setDispute] = useState("");
  const [disputeNotice, setDisputeNotice] = useState("");
  useEffect(() => {
    const interval = setInterval(() => setElapsedTimer(elapsedSeconds(sessionRef.current)), 1000);
    return () => clearInterval(interval);
  }, []);
  useEffect(() => {
    try {
      saveAttempt(storageKey, questions, sessionRef.current);
    } catch {
      setSaveError("Progress is not saved. Free storage and retry before closing.");
    }
  }, [storageKey, questions]);

  const activeQuestion = questions[session.activeQuestionIndex] ?? questions[0];
  const qId = activeQuestion.id;
  const retestQuestion = activeQuestion.learningLink?.relatedQuestionId
    ? getAllQuestions().find(
        (question) =>
          question.id === activeQuestion.learningLink?.relatedQuestionId && question.id !== qId,
      )
    : undefined;
  useEffect(() => {
    setDispute("");
    setDisputeNotice("");
  }, [qId]);
  const selectedIdx = session.selectedAnswers[qId];
  const answerSpec = answerSpecFor(activeQuestion);
  const eliminated = session.eliminatedOptions[qId] || [];
  const submitted = examMode ? examFinished : !!session.isSubmitted[qId];
  const isBookmarked = session.bookmarks.includes(qId);
  const isMarkedReview = markedForReview.includes(qId);
  const isGuess = !!guessedQuestions[qId];

  // Handle Option Select
  const handleSelectOption = (idx: number) => {
    if (submitted || (session.deadlineAt !== undefined && Date.now() >= session.deadlineAt)) return;
    setSession((prev) => ({
      ...prev,
      selectedAnswers: {
        ...prev.selectedAnswers,
        [qId]:
          answerSpec.kind === "multiple"
            ? (Array.isArray(prev.selectedAnswers[qId])
                ? (prev.selectedAnswers[qId] as number[])
                : []
              ).includes(idx)
              ? (prev.selectedAnswers[qId] as number[]).filter((key) => key !== idx)
              : [
                  ...(Array.isArray(prev.selectedAnswers[qId])
                    ? (prev.selectedAnswers[qId] as number[])
                    : []),
                  idx,
                ]
            : idx,
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
    setSession((prev) => ({
      ...prev,
      markedForReview: (prev.markedForReview ?? []).includes(qId)
        ? prev.markedForReview!.filter((id) => id !== qId)
        : [...(prev.markedForReview ?? []), qId],
    }));
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
    setSession((prev) => ({
      ...prev,
      guessedQuestions: { ...prev.guessedQuestions, [qId]: !prev.guessedQuestions?.[qId] },
    }));
  };

  // Submit single question (in practice mode)
  const handleSubmitSingle = () => {
    if (!hasAnswer(selectedIdx)) return;
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
    if (isNowBookmarked && !getStudyNotes(qId).length) {
      try {
        saveStudyNote({
          itemId: activeQuestion.id,
          itemTitle: `[QBank FSRS] ${activeQuestion.subject}: ${activeQuestion.topic}`,
          timestampSec: 0,
          timestampLabel: "QBank",
          markdown: `**Vignette:** ${activeQuestion.vignette}\n\n**Answer:** ${correctAnswerLabel(activeQuestion)}\n\n**Rationale:** ${activeQuestion.explanation.correctRationale}\n\n**Source:** ${activeQuestion.provenance?.source ?? "Not supplied (unverified)"}`,
          highYield: true,
          topic: activeQuestion.topic,
        });
      } catch {
        setSaveError("Could not save recall note. Free storage before trying again.");
        return;
      }
    }
    setSession((prev) => ({
      ...prev,
      bookmarks: isNowBookmarked
        ? [...prev.bookmarks, qId]
        : prev.bookmarks.filter((id) => id !== qId),
    }));
  };

  // Complete Exam and calculate CoreBTR analytics
  const handleFinishExam = useCallback(() => {
    let correct = 0;
    let incorrect = 0;
    let attempted = 0;

    questions.forEach((q) => {
      const sel = session.selectedAnswers[q.id];
      if (hasAnswer(sel)) {
        attempted++;
        if (isCorrectAnswer(q, sel)) {
          correct++;
        } else {
          incorrect++;
        }
      }
    });

    // NEET-PG standard scoring: +4 correct, -1 incorrect
    const score = correct * 4 - incorrect * 1;
    const maxScore = questions.length * 4;
    const accuracyPct = attempted > 0 ? Math.round((correct / attempted) * 100) : 0;

    const result: GrandTestResult = {
      id: `gt_${Date.now()}`,
      examTitle: examMode
        ? "CoreBTR National Grand Test Simulation"
        : "CoreBTR Custom Module Drill",
      timestamp: Date.now(),
      totalQuestions: questions.length,
      attempted,
      correct,
      incorrect,
      score,
      maxScore,
      accuracyPct,
      timeSpentMinutes: Math.max(1, Math.round(elapsedSeconds(sessionRef.current) / 60)),
    };

    if (sessionRef.current.result) return;
    setSession((previous) => ({ ...previous, result, finishedAt: Date.now() }));
    onFinish?.(result);
  }, [questions, session.selectedAnswers, examMode, elapsedTimer, onFinish]);

  useEffect(() => {
    if (!session.deadlineAt || examFinished) return;
    if (Date.now() >= session.deadlineAt) handleFinishExam();
  }, [elapsedTimer, session.deadlineAt, examFinished, handleFinishExam]);

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${String(s).padStart(2, "0")}`;
  };

  // If exam finished, render authentic CoreBTR Analysis Screen (matching screenshot media_1794864389406_b0b9e895.jpg)
  if (examFinished && resultData) {
    const totalQ = questions.length;
    const correctCount = resultData.correct;
    const incorrectCount = resultData.incorrect;
    const notAnsweredCount = totalQ - (correctCount + incorrectCount);
    const correctPct = Math.round((correctCount / totalQ) * 100);

    // Calculate guess statistics
    const totalGuesses = Object.values(guessedQuestions).filter(Boolean).length;
    let correctGuesses = 0;
    questions.forEach((q) => {
      if (guessedQuestions[q.id] && isCorrectAnswer(q, session.selectedAnswers[q.id])) {
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

    questions.forEach((q) => {
      if (!subjectMap[q.subject]) {
        subjectMap[q.subject] = { total: 0, correct: 0, incorrect: 0, notAnswered: 0, qIds: [] };
      }
      subjectMap[q.subject].total++;
      subjectMap[q.subject].qIds.push(q.id);

      const sel = session.selectedAnswers[q.id];
      if (!hasAnswer(sel)) {
        subjectMap[q.subject].notAnswered++;
      } else if (isCorrectAnswer(q, sel)) {
        subjectMap[q.subject].correct++;
      } else {
        subjectMap[q.subject].incorrect++;
      }
    });

    return (
      <div className="flex flex-col h-full w-full max-w-4xl mx-auto bg-[#0b0c16] rounded-3xl border border-indigo-500/30 shadow-2xl overflow-hidden text-white select-none animate-in zoom-in-95 duration-200">
        <div className="flex items-center gap-3 p-3">
          {session.deadlineAt && (
            <p className="text-xs text-indigo-300">
              Custom practice deadline: remaining time continues while the app is closed.
            </p>
          )}
          {saveError && (
            <p role="alert" className="text-red-300">
              {saveError}
              <button onClick={() => setSession((prev) => ({ ...prev }))}>Retry save</button>
            </p>
          )}
          <button
            className="text-xs text-indigo-300"
            onClick={() => {
              setSession(() => ({
                ...newAttempt(),
                deadlineAt: durationMinutes ? Date.now() + durationMinutes * 60000 : undefined,
              }));

              setElapsedTimer(0);
            }}
          >
            Start a new attempt
          </button>
          <span className="text-xs text-gray-400">
            Practice scoring: +4 correct, −1 incorrect; multiple and matching responses require
            exact answers.
          </span>
        </div>
        {/* Top Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1767be]/25 bg-[#1d204b]">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl hover:bg-[#1767be]/15 text-[#4da2ff] border border-[#1767be]/30 hover:text-white transition"
            >
              <X size={18} />
            </button>
            <div>
              <h2 className="text-base font-black text-white">Custom Module Analysis</h2>
              <span className="text-[11px] text-white/50">
                Completed • {totalQ} questions • {resultData.timeSpentMinutes} mins
              </span>
            </div>
          </div>

          {/* Analysis / Questions Tabs */}
          <div className="flex items-center bg-white/5 p-1 rounded-2xl border border-white/10">
            <button
              type="button"
              onClick={() => setActiveTab("analysis")}
              className={`px-4 py-1.5 rounded-xl text-xs font-bold transition ${
                activeTab === "analysis"
                  ? "bg-[#1767be] text-white shadow-sm"
                  : "text-white/60 hover:text-white"
              }`}
            >
              Analysis
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("questions")}
              className={`px-4 py-1.5 rounded-xl text-xs font-bold transition ${
                activeTab === "questions"
                  ? "bg-[#1767be] text-white shadow-sm"
                  : "text-white/60 hover:text-white"
              }`}
            >
              Questions
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
          {activeTab === "analysis" ? (
            <>
              {/* Total Questions Card */}
              <div className="flex flex-col gap-4 p-5 rounded-3xl bg-[#14152a] border border-indigo-500/20">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-white/60">
                    Total Questions
                  </span>
                  <span className="text-2xl font-black text-white">{correctPct}% Correct</span>
                </div>

                {/* Score Indicators Row */}
                <div className="flex items-center gap-6 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full bg-emerald-500 shrink-0" />
                    <span className="text-white/70">
                      <strong className="text-white font-bold">{correctCount}</strong> Correct
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full bg-rose-500 shrink-0" />
                    <span className="text-white/70">
                      <strong className="text-white font-bold">{incorrectCount}</strong> Incorrect
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full bg-amber-500 shrink-0" />
                    <span className="text-white/70">
                      <strong className="text-white font-bold">{notAnsweredCount}</strong> Not
                      Answered
                    </span>
                  </div>
                </div>

                {/* Multi-Color Progress Bar */}
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
                  <div
                    style={{ width: `${(notAnsweredCount / totalQ) * 100}%` }}
                    className="bg-amber-500 h-full transition-all duration-700"
                    title={`Not Answered: ${notAnsweredCount}`}
                  />
                </div>

                {/* 6 Metric Cards Grid (Matching official screenshot) */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 pt-3 border-t border-white/10">
                  <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 flex flex-col">
                    <span className="text-[11px] text-white/50">Marks</span>
                    <strong className="text-base font-black text-white mt-0.5">
                      {resultData.score > 0 ? `+${resultData.score}` : resultData.score} /{" "}
                      {resultData.maxScore}
                    </strong>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 flex flex-col">
                    <span className="text-[11px] text-white/50">Total Time</span>
                    <strong className="text-base font-black text-white mt-0.5">
                      {resultData.timeSpentMinutes} min
                    </strong>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 flex flex-col">
                    <span className="text-[11px] text-white/50">Guess Accuracy</span>
                    <strong className="text-base font-black text-[#4da2ff] mt-0.5">
                      {guessAccuracy}%
                    </strong>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 flex flex-col">
                    <span className="text-[11px] text-white/50">Accuracy</span>
                    <strong className="text-base font-black text-emerald-400 mt-0.5">
                      {resultData.accuracyPct}%
                    </strong>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 flex flex-col">
                    <span className="text-[11px] text-white/50">Avg time per question</span>
                    <strong className="text-base font-black text-white mt-0.5">
                      {avgTimePerQ} sec/ques
                    </strong>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 flex flex-col">
                    <span className="text-[11px] text-white/50">Correct Guesses</span>
                    <strong className="text-base font-black text-amber-400 mt-0.5">
                      {correctGuesses} out of {totalGuesses}
                    </strong>
                  </div>
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
                        className="flex flex-col gap-2.5 p-4 rounded-2xl bg-[#14152a] border border-white/10 hover:border-indigo-500/30 transition"
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
                              <span className="text-emerald-400 font-bold">{stats.correct}</span>{" "}
                              Correct
                            </span>
                            <span className="text-white/60">
                              <span className="text-rose-400 font-bold">{stats.incorrect}</span>{" "}
                              Incorrect
                            </span>
                            <span className="text-white/60">
                              <span className="text-amber-400 font-bold">{stats.notAnswered}</span>{" "}
                              Not Answered
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={() => setActiveTab("questions")}
                            className="text-xs font-bold text-[#4da2ff] hover:text-indigo-300 transition flex items-center gap-1"
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
              {questions.map((q, idx) => {
                const sel = session.selectedAnswers[q.id];
                const isCorrect = isCorrectAnswer(q, sel);
                const isUnanswered = !hasAnswer(sel);

                return (
                  <div
                    key={q.id}
                    className={`p-4 rounded-2xl border transition ${
                      isCorrect
                        ? "bg-emerald-950/20 border-emerald-500/30"
                        : isUnanswered
                          ? "bg-amber-950/20 border-amber-500/30"
                          : "bg-rose-950/20 border-rose-500/30"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-white/70">
                          Q{idx + 1}
                        </span>
                        <span className="text-xs font-semibold px-2 py-0.5 rounded bg-white/10 text-white/80">
                          {q.subject}
                        </span>
                      </div>
                      <span
                        className={`text-xs font-bold ${
                          isCorrect
                            ? "text-emerald-400"
                            : isUnanswered
                              ? "text-amber-400"
                              : "text-rose-400"
                        }`}
                      >
                        {isCorrect
                          ? "Correct (+4)"
                          : isUnanswered
                            ? "Unanswered (0)"
                            : "Incorrect (-1)"}
                      </span>
                    </div>

                    <p className="text-xs text-white/90 leading-relaxed mb-3">{q.vignette}</p>
                    {!isCorrect && !isUnanswered && (
                      <label className="text-xs">
                        Mistake reason{" "}
                        <select
                          aria-label={`Mistake reason for question ${idx + 1}`}
                          className="bg-[#24262d] p-2 ml-2"
                          value={session.mistakes?.[q.id] ?? ""}
                          onChange={(event) => {
                            const value = event.target.value as NonNullable<
                              QBankSessionState["mistakes"]
                            >[string];
                            setSession((prev) => ({
                              ...prev,
                              mistakes: { ...prev.mistakes, [q.id]: value },
                            }));
                          }}
                        >
                          <option value="">Choose reason</option>
                          {["knowledge", "misread", "reasoning", "guessing", "time"].map(
                            (reason) => (
                              <option key={reason}>{reason}</option>
                            ),
                          )}
                        </select>
                      </label>
                    )}
                    {session.confidence?.[q.id] === "confident" && !isCorrect && (
                      <p className="text-amber-300 text-xs">
                        Confident but wrong — prioritized in your next study plan.
                      </p>
                    )}

                    <div className="text-xs font-medium text-emerald-300 bg-emerald-500/10 p-2.5 rounded-xl border border-emerald-500/20">
                      <strong>Correct answer: </strong>
                      {correctAnswerLabel(q)}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Bottom Done Button */}
        <div className="p-4 border-t border-white/10 bg-[#121324] flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition"
          >
            Close & Return to CoreBTR
          </button>
        </div>
      </div>
    );
  }

  // Active Question Solving View (matching screenshot media_1794864389397_6b81d4d2.jpg)
  return (
    <div className="flex flex-col h-full w-full max-w-3xl mx-auto bg-[#0d1b4b] rounded-3xl border border-[#1767be]/35 shadow-2xl overflow-hidden text-white select-none animate-in zoom-in-95 duration-150">
      {/* Top Question Status Bar */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-[#1767be]/25 bg-[#1d204b]">
        <div className="flex items-center gap-3">
          <span className="font-mono text-sm font-black text-white">
            {session.activeQuestionIndex + 1}/{questions.length}
          </span>
          <span className="rounded-lg bg-[#1767be]/20 px-2.5 py-0.5 text-xs font-bold text-[#4da2ff] border border-[#1767be]/30">
            {activeQuestion.subject}
          </span>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 rounded-xl bg-white/5 border border-white/10 px-3 py-1 text-xs font-mono font-bold text-white">
            <Timer size={13} className="text-[#4da2ff]" />
            <span>
              {formatTimer(
                session.deadlineAt
                  ? Math.max(
                      0,
                      Math.ceil((session.deadlineAt - (session.finishedAt ?? Date.now())) / 1000),
                    )
                  : elapsedTimer,
              )}
            </span>
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
            disabled={!hasAnswer(selectedIdx) || submitted}
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
          {saveError && (
            <div role="alert" className="p-3 text-red-300">
              {saveError}{" "}
              <button onClick={() => setSession((prev) => ({ ...prev }))}>Retry save</button>
            </div>
          )}
          <div className="text-xs text-gray-400 py-2">
            Source:{" "}
            {activeQuestion.provenance?.source ?? activeQuestion.sourceExam ?? "Not supplied"} ·{" "}
            {activeQuestion.provenance?.edition ?? "Edition unspecified"} ·{" "}
            {activeQuestion.provenance?.status === "reviewed" && activeQuestion.provenance.reviewer
              ? `Reviewed by ${activeQuestion.provenance.reviewer}`
              : "Unverified"}
          </div>
          {activeQuestion.assertionReason && (
            <div className="text-sm py-2">
              <p>
                <strong>Assertion:</strong> {activeQuestion.assertionReason.assertion}
              </p>
              <p>
                <strong>Reason:</strong> {activeQuestion.assertionReason.reason}
              </p>
            </div>
          )}
          {!submitted && (
            <label className="text-sm">
              Confidence{" "}
              <select
                aria-label="Answer confidence"
                className="ml-2 bg-[#24262d] p-2 rounded"
                value={session.confidence?.[qId] ?? "unsure"}
                onChange={(event) => {
                  const value = event.target.value as "unsure" | "confident";
                  setSession((prev) => ({
                    ...prev,
                    confidence: { ...prev.confidence, [qId]: value },
                  }));
                }}
              >
                <option value="unsure">Unsure</option>
                <option value="confident">Confident</option>
              </select>
            </label>
          )}
          {submitted && !isCorrectAnswer(activeQuestion, selectedIdx) && (
            <label className="text-sm">
              Why did you miss this?{" "}
              <select
                aria-label="Mistake reason"
                className="ml-2 bg-[#24262d] p-2 rounded"
                value={session.mistakes?.[qId] ?? ""}
                onChange={(event) => {
                  const value = event.target.value as NonNullable<
                    QBankSessionState["mistakes"]
                  >[string];
                  setSession((prev) => ({ ...prev, mistakes: { ...prev.mistakes, [qId]: value } }));
                }}
              >
                <option value="">Choose reason</option>
                {["knowledge", "misread", "reasoning", "guessing", "time"].map((reason) => (
                  <option key={reason} value={reason}>
                    {reason}
                  </option>
                ))}
              </select>
            </label>
          )}
          {submitted &&
            activeQuestion.learningLink &&
            /^https?:\/\//.test(activeQuestion.learningLink.url) && (
              <a
                className="block text-indigo-300"
                href={
                  activeQuestion.learningLink.url +
                  (activeQuestion.learningLink.timestampSec !== undefined
                    ? `#t=${activeQuestion.learningLink.timestampSec}`
                    : "")
                }
                target="_blank"
                rel="noreferrer"
              >
                Review source lesson
              </a>
            )}
          {submitted && retestQuestion && (
            <button className="text-indigo-300 text-sm" onClick={() => onRetest(retestQuestion)}>
              Retest with a related question
            </button>
          )}
          <details className="text-xs text-gray-400 py-2">
            <summary>Report a question issue (saved locally)</summary>
            <textarea
              aria-label="Question issue"
              className="block bg-[#24262d] p-2 w-full"
              value={dispute}
              onChange={(event) => setDispute(event.target.value)}
            />
            <button
              onClick={() => {
                try {
                  reportQuestion(qId, dispute);
                  setDispute("");
                  setDisputeNotice(
                    "Report saved on this device. It has not been sent to a reviewer.",
                  );
                } catch {
                  setDisputeNotice(
                    "Could not save report. Check the description and available storage.",
                  );
                }
              }}
            >
              Save report
            </button>
            <p role="status">{disputeNotice}</p>
          </details>
          {answerSpec.kind === "multiple" && (
            <p className="text-sm text-indigo-300">
              Select every correct option. Exact-match grading; no partial credit.
            </p>
          )}
          {answerSpec.kind === "matching" &&
            answerSpec.prompts.map((prompt, index) => (
              <label key={index} className="block py-2 text-sm">
                {prompt}
                <select
                  aria-label={prompt}
                  disabled={
                    submitted ||
                    (session.deadlineAt !== undefined && Date.now() >= session.deadlineAt)
                  }
                  className="ml-3 bg-[#24262d] p-2 rounded"
                  value={
                    typeof selectedIdx === "object" && !Array.isArray(selectedIdx)
                      ? (selectedIdx[String(index)] ?? "")
                      : ""
                  }
                  onChange={(event) => {
                    const value = event.target.value;
                    setSession((prev) => {
                      const response = {
                        ...(typeof prev.selectedAnswers[qId] === "object" &&
                        !Array.isArray(prev.selectedAnswers[qId])
                          ? (prev.selectedAnswers[qId] as Record<string, number>)
                          : {}),
                      };
                      if (value === "") delete response[String(index)];
                      else response[String(index)] = Number(value);
                      return {
                        ...prev,
                        selectedAnswers: { ...prev.selectedAnswers, [qId]: response },
                      };
                    });
                  }}
                >
                  <option value="">Choose a match</option>
                  {activeQuestion.options.map((option, key) => (
                    <option key={key} value={key}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
            ))}
          {answerSpec.kind !== "matching" &&
            activeQuestion.options.map((option, idx) => {
              const isSelected = Array.isArray(selectedIdx)
                ? selectedIdx.includes(idx)
                : selectedIdx === idx;
              const isElim = eliminated.includes(idx);
              const isCorrect =
                answerSpec.kind === "multiple"
                  ? answerSpec.correctIndices.includes(idx)
                  : idx === activeQuestion.correctIndex;

              let optionBorder =
                "border-[#1767be]/20 bg-[#1d204b]/40 hover:bg-[#1d204b]/80 hover:border-[#1767be]/40 text-white";
              if (submitted) {
                if (isCorrect) {
                  optionBorder = "border-emerald-500 bg-emerald-500/15 text-emerald-300 font-bold";
                } else if (isSelected && !isCorrect) {
                  optionBorder = "border-rose-500 bg-rose-500/15 text-rose-300 line-through";
                } else {
                  optionBorder = "opacity-40 border-white/5 text-white/50";
                }
              } else if (isSelected) {
                optionBorder =
                  "border-[#1767be] bg-[#1767be]/25 text-white font-bold ring-1 ring-[#4da2ff]";
              } else if (isElim) {
                optionBorder = "opacity-40 line-through bg-black/30 border-white/5 text-white/40";
              }

              return (
                <div
                  key={idx}
                  role="button"
                  tabIndex={submitted ? -1 : 0}
                  aria-pressed={isSelected}
                  aria-label={`${String.fromCharCode(65 + idx)}: ${option}`}
                  onKeyDown={(event) => {
                    if (
                      event.target === event.currentTarget &&
                      (event.key === "Enter" || event.key === " ")
                    ) {
                      event.preventDefault();
                      handleSelectOption(idx);
                    }
                  }}
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
                    {submitted && isCorrect && (
                      <CheckCircle2 size={16} className="text-emerald-400" />
                    )}
                    {submitted && isSelected && !isCorrect && (
                      <XCircle size={16} className="text-rose-400" />
                    )}
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
              disabled={!hasAnswer(selectedIdx)}
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
                <span className="font-bold uppercase tracking-wider text-[10px]">
                  Examiner Trap Radar
                </span>
                <p className="text-[12px] text-white/90 leading-relaxed mt-0.5">
                  {activeQuestion.examinerTrap}
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1">
                <CheckCircle2 size={13} /> Correct answer: {correctAnswerLabel(activeQuestion)}
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

        {session.activeQuestionIndex < questions.length - 1 ? (
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
