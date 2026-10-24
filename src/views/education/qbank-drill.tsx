import { useState, useEffect, useCallback, type MouseEvent } from "react";
import {
  CheckCircle2,
  XCircle,
  ArrowRight,
  ArrowLeft,
  AlertTriangle,
  Lightbulb,
  Timer,
  Bookmark,
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
  const [session, setSession] = useState<QBankSessionState>({
    activeQuestionIndex: 0,
    selectedAnswers: {},
    eliminatedOptions: {},
    isSubmitted: {},
    bookmarks: [],
    timeSpentSec: {},
  });

  const [examFinished, setExamFinished] = useState(false);
  const [elapsedTimer, setElapsedTimer] = useState(0);

  // Timer
  useEffect(() => {
    if (examFinished) return;
    const interval = setInterval(() => {
      setElapsedTimer((t) => t + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [examFinished]);

  const activeQuestion = questions[session.activeQuestionIndex] ?? questions[0];
  const qId = activeQuestion.id;
  const selectedIdx = session.selectedAnswers[qId];
  const eliminated = session.eliminatedOptions[qId] || [];
  const submitted = examMode ? examFinished : !!session.isSubmitted[qId];
  const isBookmarked = session.bookmarks.includes(qId);

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

  // Right-click or Alt-click to Strike out / Eliminate distractors
  const handleToggleEliminate = (e: MouseEvent, idx: number) => {
    e.preventDefault();
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
    setSession((prev) => {
      const isBook = prev.bookmarks.includes(qId);
      const nextBookmarks = isBook
        ? prev.bookmarks.filter((id) => id !== qId)
        : [...prev.bookmarks, qId];

      if (!isBook) {
        // Automatically save to Study Notes with High Yield tag
        saveStudyNote({
          itemId: activeQuestion.id,
          itemTitle: `${activeQuestion.subject}: ${activeQuestion.topic}`,
          timestampSec: 0,
          timestampLabel: "QBank High-Yield",
          markdown: `### ${activeQuestion.topic}\n**Question:** ${activeQuestion.vignette}\n\n**Correct Answer:** ${activeQuestion.options[activeQuestion.correctIndex]}\n\n> ⚡ **Examiner Trap:** ${activeQuestion.examinerTrap}\n\n**Bottom Line:** ${activeQuestion.explanation.bottomLine}`,
          highYield: true,
          topic: activeQuestion.subject,
        });
      }

      return {
        ...prev,
        bookmarks: nextBookmarks,
      };
    });
  };

  // Finish exam
  const handleFinishExam = useCallback(() => {
    let correct = 0;
    let incorrect = 0;
    let attempted = 0;

    for (const q of questions) {
      const sel = session.selectedAnswers[q.id];
      if (sel !== undefined) {
        attempted++;
        if (sel === q.correctIndex) {
          correct++;
        } else {
          incorrect++;
        }
      }
    }

    // NEET PG / INICET marking: +4 for correct, -1 for incorrect
    const score = correct * 4 - incorrect * 1;
    const maxScore = questions.length * 4;
    const accuracyPct = attempted > 0 ? Math.round((correct / attempted) * 100) : 0;

    const result: GrandTestResult = {
      id: `gt_${Date.now()}`,
      examTitle: examMode ? "Argus National Grand Test Simulation" : "Argus High-Yield QBank Drill",
      timestamp: Date.now(),
      totalQuestions: questions.length,
      attempted,
      correct,
      incorrect,
      score,
      maxScore,
      accuracyPct,
      timeSpentMinutes: Math.round(elapsedTimer / 60),
    };

    setExamFinished(true);
    onFinish?.(result);
  }, [questions, session.selectedAnswers, examMode, elapsedTimer, onFinish]);

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${String(s).padStart(2, "0")}`;
  };

  return (
    <div className="flex flex-col h-full w-full max-w-[880px] mx-auto bg-surface rounded-2xl border border-edge shadow-2xl overflow-hidden text-ink animate-in zoom-in-95 duration-150 select-none">
      {/* Top Session Bar */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-edge/60 bg-canvas/40">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm tracking-tight text-ink">
              Q{session.activeQuestionIndex + 1} of {questions.length}
            </span>
            <span className="rounded-md bg-accent/15 px-2 py-0.5 text-[11px] font-semibold text-accent">
              {activeQuestion.subject}
            </span>
            <span className="rounded-md bg-raised px-2 py-0.5 text-[11px] font-mono text-ink-subtle">
              {activeQuestion.topic}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 rounded-lg bg-raised px-3 py-1 text-xs font-mono font-medium text-ink">
            <Timer size={13} className="text-accent" />
            <span>{formatTimer(elapsedTimer)}</span>
          </div>

          <button
            type="button"
            onClick={handleToggleBookmark}
            className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium transition ${
              isBookmarked
                ? "bg-amber-500/20 text-amber-500 border border-amber-500/40"
                : "bg-raised text-ink-subtle hover:text-ink"
            }`}
            title="Bookmark into FSRS Spaced Repetition Tree"
          >
            <Bookmark size={13} className={isBookmarked ? "fill-amber-500" : ""} />
            <span>{isBookmarked ? "Bookmarked (FSRS)" : "Bookmark"}</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-ink-subtle hover:bg-raised hover:text-ink transition"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Main Question Area */}
      <div className="flex-1 overflow-y-auto px-6 py-6 flex flex-col gap-6">
        {/* Vignette */}
        <div className="text-[14.5px] leading-relaxed text-ink font-sans tracking-tight bg-canvas/50 p-4 rounded-xl border border-edge">
          {activeQuestion.vignette}
        </div>

        {/* Options List */}
        <div className="flex flex-col gap-2.5">
          <span className="text-[11px] text-ink-subtle px-1">
            Tip: Right-click or long-press an option to cross it out (strike-out distractors).
          </span>
          {activeQuestion.options.map((option, idx) => {
            const isSelected = selectedIdx === idx;
            const isElim = eliminated.includes(idx);
            const isCorrect = idx === activeQuestion.correctIndex;

            let optionStyle = "border-edge bg-surface hover:bg-raised text-ink";
            if (submitted) {
              if (isCorrect) {
                optionStyle = "border-emerald-500 bg-emerald-500/10 text-emerald-500 font-semibold";
              } else if (isSelected && !isCorrect) {
                optionStyle = "border-rose-500 bg-rose-500/10 text-rose-500 line-through";
              } else {
                optionStyle = "opacity-50 border-edge";
              }
            } else if (isSelected) {
              optionStyle = "border-accent bg-accent/10 text-accent font-semibold shadow-sm";
            } else if (isElim) {
              optionStyle = "opacity-40 line-through bg-canvas text-ink-subtle";
            }

            return (
              <div
                key={idx}
                onClick={() => handleSelectOption(idx)}
                onContextMenu={(e) => handleToggleEliminate(e, idx)}
                className={`flex items-center gap-3.5 p-3.5 rounded-xl border transition cursor-pointer select-none ${optionStyle}`}
              >
                <div
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold font-mono transition ${
                    submitted && isCorrect
                      ? "bg-emerald-500 text-white"
                      : submitted && isSelected && !isCorrect
                        ? "bg-rose-500 text-white"
                        : isSelected
                          ? "bg-accent text-white"
                          : "bg-raised text-ink-subtle"
                  }`}
                >
                  {String.fromCharCode(65 + idx)}
                </div>
                <span className="text-[13.5px] leading-snug flex-1">{option}</span>
                {submitted && isCorrect && <CheckCircle2 size={16} className="text-emerald-500" />}
                {submitted && isSelected && !isCorrect && <XCircle size={16} className="text-rose-500" />}
              </div>
            );
          })}
        </div>

        {/* Practice Mode Submit Button */}
        {!examMode && !submitted && (
          <div className="flex justify-end pt-2">
            <button
              type="button"
              onClick={handleSubmitSingle}
              disabled={selectedIdx === undefined}
              className="rounded-xl bg-accent px-5 py-2 text-xs font-semibold text-white shadow hover:opacity-95 disabled:opacity-40 transition"
            >
              Confirm Answer & Reveal Explanation
            </button>
          </div>
        )}

        {/* Socratic Explanation Breakdown (Shown after submission) */}
        {submitted && (
          <div className="flex flex-col gap-4 rounded-xl border border-edge bg-canvas/80 p-5 animate-in fade-in duration-200">
            {/* Trap Warning Box */}
            <div className="flex items-start gap-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 p-3 text-xs text-amber-500">
              <AlertTriangle size={16} className="shrink-0 mt-0.5" />
              <div className="flex flex-col gap-0.5">
                <span className="font-bold uppercase tracking-wider text-[10px]">Examiner Trap Radar</span>
                <p className="text-[12px] text-ink leading-relaxed">{activeQuestion.examinerTrap}</p>
              </div>
            </div>

            {/* Core Rationale */}
            <div className="flex flex-col gap-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-500 flex items-center gap-1">
                <CheckCircle2 size={13} /> Why Option {String.fromCharCode(65 + activeQuestion.correctIndex)} is Correct
              </span>
              <p className="text-[13px] text-ink leading-relaxed">
                {activeQuestion.explanation.correctRationale}
              </p>
            </div>

            {/* Distractor Breakdown */}
            <div className="flex flex-col gap-2 pt-2 border-t border-edge/60">
              <span className="text-[11px] font-bold uppercase tracking-wider text-ink-subtle">
                Distractor Breakdown (Why the other options fail):
              </span>
              <div className="flex flex-col gap-1.5">
                {activeQuestion.explanation.distractorBreakdown.map((d, i) => (
                  <div key={i} className="text-[12px] bg-surface/60 p-2 rounded-lg border border-edge/50">
                    <span className="font-semibold text-rose-500">{d.option}: </span>
                    <span className="text-ink-muted">{d.reason}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Bottom Line Rule */}
            <div className="flex items-center gap-2 rounded-lg bg-sky-500/10 border border-sky-500/20 p-2.5 text-xs text-sky-500 font-medium">
              <Lightbulb size={15} className="shrink-0" />
              <span>
                <strong className="font-semibold text-ink">Bottom Line: </strong>
                {activeQuestion.explanation.bottomLine}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Nav Bar */}
      <div className="flex items-center justify-between px-6 py-3.5 border-t border-edge/60 bg-canvas/40">
        <button
          type="button"
          onClick={() => setSession((prev) => ({ ...prev, activeQuestionIndex: Math.max(0, prev.activeQuestionIndex - 1) }))}
          disabled={session.activeQuestionIndex === 0}
          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-ink hover:bg-raised transition disabled:opacity-30"
        >
          <ArrowLeft size={13} /> Previous
        </button>

        {/* Question Numbers Quick Navigator */}
        <div className="flex items-center gap-1 overflow-x-auto max-w-[400px] px-2 py-1">
          {questions.map((q, idx) => {
            const isCurrent = idx === session.activeQuestionIndex;
            const hasAns = session.selectedAnswers[q.id] !== undefined;
            return (
              <button
                key={q.id}
                type="button"
                onClick={() => setSession((prev) => ({ ...prev, activeQuestionIndex: idx }))}
                className={`h-6 w-6 rounded text-[11px] font-mono font-medium transition ${
                  isCurrent
                    ? "bg-accent text-white font-bold"
                    : hasAns
                      ? "bg-emerald-500/20 text-emerald-500 border border-emerald-500/40"
                      : "bg-raised text-ink-subtle hover:text-ink"
                }`}
              >
                {idx + 1}
              </button>
            );
          })}
        </div>

        {session.activeQuestionIndex < questions.length - 1 ? (
          <button
            type="button"
            onClick={() => setSession((prev) => ({ ...prev, activeQuestionIndex: prev.activeQuestionIndex + 1 }))}
            className="flex items-center gap-1.5 rounded-lg bg-raised hover:bg-edge px-3.5 py-1.5 text-xs font-semibold text-ink transition"
          >
            Next <ArrowRight size={13} />
          </button>
        ) : (
          <button
            type="button"
            onClick={handleFinishExam}
            className="flex items-center gap-1.5 rounded-lg bg-emerald-500 px-4 py-1.5 text-xs font-semibold text-white shadow hover:opacity-95 transition"
          >
            Submit & Complete Drill
          </button>
        )}
      </div>
    </div>
  );
}
