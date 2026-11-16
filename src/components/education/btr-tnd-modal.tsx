import { useState } from "react";
import {
  X,
  Target,
  Clock,
  Check,
  AlertTriangle,
  Play,
  RotateCcw,
} from "lucide-react";
import {
  BTR_TND_PAPERS,
  buildErrorItemFromTnD,
  type BTRTnDPaper,
  type BTRTnDQuestion,
} from "@/lib/education/btr-tnd-engine";
import { saveBTRErrorItem } from "@/lib/education/btr-error-vault";

interface BTRTnDModalProps {
  open: boolean;
  onClose: () => void;
  onLaunchVideo?: (fileName: string) => void;
}

export function BTRTnDModal({ open, onClose, onLaunchVideo }: BTRTnDModalProps) {
  const [selectedPaper, setSelectedPaper] = useState<BTRTnDPaper>(BTR_TND_PAPERS[0]);
  const [activeQuestionIndex, setActiveQuestionIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isAnswerCommitted, setIsAnswerCommitted] = useState(false);
  const [score, setScore] = useState<{ correct: number; incorrect: number }>({ correct: 0, incorrect: 0 });
  const [errorLogged, setErrorLogged] = useState(false);

  if (!open) return null;

  const currentQ: BTRTnDQuestion = selectedPaper.sampleQuestions[activeQuestionIndex] || selectedPaper.sampleQuestions[0];
  const totalInPaper = selectedPaper.sampleQuestions.length;

  const handleCommit = (idx: number) => {
    if (isAnswerCommitted) return;
    setSelectedOption(idx);
    setIsAnswerCommitted(true);
    if (idx === currentQ.correctOptionIndex) {
      setScore((prev) => ({ ...prev, correct: prev.correct + 1 }));
    } else {
      setScore((prev) => ({ ...prev, incorrect: prev.incorrect + 1 }));
    }
  };

  const handleNext = () => {
    setIsAnswerCommitted(false);
    setSelectedOption(null);
    setErrorLogged(false);
    setActiveQuestionIndex((prev) => (prev + 1) % totalInPaper);
  };

  const handleReset = () => {
    setIsAnswerCommitted(false);
    setSelectedOption(null);
    setErrorLogged(false);
    setScore({ correct: 0, incorrect: 0 });
    setActiveQuestionIndex(0);
  };

  const handleLogToVault = () => {
    if (selectedOption === null) return;
    const item = buildErrorItemFromTnD(selectedPaper, currentQ, selectedOption);
    saveBTRErrorItem(item);
    setErrorLogged(true);
  };

  const totalAttempted = score.correct + score.incorrect;
  const strikeRate = totalAttempted === 0 ? 0 : Math.round((score.correct / totalAttempted) * 100);

  return (
    <div className="fixed inset-0 z-[250] flex items-center justify-center bg-black/80 backdrop-blur-md p-2 sm:p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-4xl h-[90vh] max-h-[820px] rounded-3xl bg-surface border border-edge flex flex-col shadow-2xl overflow-hidden text-ink">
        {/* Header */}
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-edge px-5 sm:px-6 bg-surface/90">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-accent/20 text-accent border border-accent/30">
              <Target size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-ink">T&D Interactive Exam Simulator</h2>
                <span className="font-mono text-xs px-2.5 py-0.5 rounded-full bg-accent/15 text-accent font-bold">
                  Strike Rate: {strikeRate}% ({score.correct}/{totalAttempted})
                </span>
              </div>
              <p className="text-xs text-ink-muted">
                Test & Discussion Active Recall • 17 Subject Papers in /Users/anupam/Downloads/BTR/TND
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

        {/* Paper Selector Strip */}
        <div className="border-b border-edge p-3 bg-surface/60 flex items-center justify-between gap-3 overflow-x-auto no-scrollbar shrink-0">
          <div className="flex items-center gap-1.5">
            {BTR_TND_PAPERS.map((p) => {
              const isSelected = selectedPaper.id === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    setSelectedPaper(p);
                    handleReset();
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                    isSelected
                      ? "bg-accent text-white shadow-xs"
                      : "bg-elevated border border-edge-soft text-ink-muted hover:text-ink"
                  }`}
                >
                  {p.subjectName}
                </button>
              );
            })}
          </div>

          {onLaunchVideo && (
            <button
              type="button"
              onClick={() => onLaunchVideo(selectedPaper.targetVideoFileName)}
              className="flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-lg bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-600/30 shrink-0"
            >
              <Play size={11} fill="currentColor" />
              <span>Watch Video Discussion</span>
            </button>
          )}
        </div>

        {/* Question Area */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 bg-canvas flex flex-col gap-4">
          <div className="flex items-center justify-between text-xs text-ink-muted">
            <span className="font-mono font-bold text-accent">
              QUESTION {activeQuestionIndex + 1} OF {totalInPaper} ({selectedPaper.subjectName})
            </span>
            <span className="flex items-center gap-1 font-mono">
              <Clock size={12} /> Time Target: 45s
            </span>
          </div>

          {/* Question Stem */}
          <div className="rounded-2xl bg-surface border border-edge p-5 shadow-xs">
            <p className="text-sm font-semibold text-ink leading-relaxed">
              {currentQ.stem}
            </p>
          </div>

          {/* Options */}
          <div className="flex flex-col gap-2.5">
            {currentQ.options.map((opt, idx) => {
              const isSelected = selectedOption === idx;
              const isCorrect = idx === currentQ.correctOptionIndex;

              let style = "bg-surface border-edge-soft text-ink hover:border-accent/40";
              if (isAnswerCommitted) {
                if (isCorrect) {
                  style = "bg-emerald-500/20 border-emerald-500 text-emerald-300 font-bold";
                } else if (isSelected) {
                  style = "bg-red-500/20 border-red-500 text-red-300 font-bold";
                } else {
                  style = "bg-surface/50 border-edge-soft text-ink-muted opacity-60";
                }
              }

              return (
                <button
                  key={idx}
                  type="button"
                  disabled={isAnswerCommitted}
                  onClick={() => handleCommit(idx)}
                  className={`text-left p-3.5 rounded-2xl border flex items-center justify-between text-xs transition ${style}`}
                >
                  <span>{opt}</span>
                  {isAnswerCommitted && isCorrect && <Check size={15} className="text-emerald-400 shrink-0" />}
                </button>
              );
            })}
          </div>

          {/* Rationale & Action Area when committed */}
          {isAnswerCommitted && (
            <div className="rounded-2xl bg-surface border border-edge p-5 flex flex-col gap-3 animate-in fade-in duration-200">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-accent">
                  Dr. Zainab Vora Explanation & Solution:
                </span>

                {selectedOption !== currentQ.correctOptionIndex && (
                  <button
                    type="button"
                    onClick={handleLogToVault}
                    disabled={errorLogged}
                    className="flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-300 hover:bg-amber-500/30 transition disabled:opacity-60"
                  >
                    <AlertTriangle size={12} />
                    <span>{errorLogged ? "Logged to GT Error Vault!" : "Log to GT Error Vault"}</span>
                  </button>
                )}
              </div>

              <p className="text-xs text-ink-muted leading-relaxed">
                {currentQ.explanation}
              </p>

              <div className="rounded-xl bg-accent/10 border border-accent/25 p-3 text-xs text-accent">
                <strong>💡 High-Yield Pearl:</strong> {currentQ.highYieldPearl}
              </div>

              <div className="rounded-xl bg-amber-500/10 border border-amber-500/25 p-3 text-xs text-amber-300">
                <strong>⚠️ Examiner Trap:</strong> {currentQ.examinerTrap}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <footer className="flex h-14 shrink-0 items-center justify-between border-t border-edge px-5 bg-surface/90">
          <button
            type="button"
            onClick={handleReset}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-elevated hover:bg-raised text-xs font-semibold text-ink-muted transition border border-edge"
          >
            <RotateCcw size={13} />
            <span>Reset Test</span>
          </button>

          <button
            type="button"
            onClick={handleNext}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-accent text-white text-xs font-bold hover:brightness-110 transition shadow-xs"
          >
            <span>Next Question</span>
          </button>
        </footer>
      </div>
    </div>
  );
}
