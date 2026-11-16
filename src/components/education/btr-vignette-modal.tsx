import { useState } from "react";
import {
  X,
  Stethoscope,
  ChevronLeft,
  ChevronRight,
  Check,
} from "lucide-react";
import {
  BTR_CLINICAL_VIGNETTES,
  type BTRClinicalVignette,
} from "@/lib/education/btr-clinical-vignettes";

interface BTRVignetteModalProps {
  open: boolean;
  onClose: () => void;
}

export function BTRVignetteModal({ open, onClose }: BTRVignetteModalProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isAnswerCommitted, setIsAnswerCommitted] = useState(false);
  const [score, setScore] = useState({ correct: 0, incorrect: 0 });

  if (!open) return null;

  const currentCase: BTRClinicalVignette = BTR_CLINICAL_VIGNETTES[currentIndex];
  const totalCases = BTR_CLINICAL_VIGNETTES.length;

  const handleCommit = (idx: number) => {
    if (isAnswerCommitted) return;
    setSelectedOption(idx);
    setIsAnswerCommitted(true);
    if (idx === currentCase.correctOptionIndex) {
      setScore((prev) => ({ ...prev, correct: prev.correct + 1 }));
    } else {
      setScore((prev) => ({ ...prev, incorrect: prev.incorrect + 1 }));
    }
  };

  const handleNext = () => {
    setIsAnswerCommitted(false);
    setSelectedOption(null);
    setCurrentIndex((prev) => (prev + 1) % totalCases);
  };

  const handlePrev = () => {
    setIsAnswerCommitted(false);
    setSelectedOption(null);
    setCurrentIndex((prev) => (prev - 1 + totalCases) % totalCases);
  };

  const totalAttempted = score.correct + score.incorrect;

  return (
    <div className="fixed inset-0 z-[250] flex items-center justify-center bg-black/80 backdrop-blur-md p-2 sm:p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-3xl h-[90vh] max-h-[820px] rounded-3xl bg-surface border border-edge flex flex-col shadow-2xl overflow-hidden text-ink">
        {/* Header */}
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-edge px-5 sm:px-6 bg-surface/90">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-teal-500/20 text-teal-400 border border-teal-500/30">
              <Stethoscope size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-ink">Two-Step Clinical Case Drills</h2>
                <span className="font-mono text-xs px-2 py-0.5 rounded-full bg-elevated text-ink-muted border border-edge">
                  Case #{currentIndex + 1} / {totalCases}
                </span>
              </div>
              <p className="text-xs text-ink-muted">
                INI-CET & NEET-PG Multi-Step Reasoning • Presentation $\rightarrow$ Diagnosis $\rightarrow$ Next Step
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

        {/* Case Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 bg-canvas flex flex-col gap-4">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-accent px-2.5 py-0.5 rounded-md bg-accent/15 border border-accent/25">
              {currentCase.subject}
            </span>
            <span className="text-[10.5px] font-semibold text-purple-400 px-2 py-0.5 rounded-md bg-purple-500/15 border border-purple-500/25">
              {currentCase.difficulty}
            </span>
          </div>

          {/* Clinical Vignette Box */}
          <div className="rounded-2xl bg-surface border border-edge p-5 shadow-xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-ink-muted block mb-2">
              Clinical Vignette:
            </span>
            <p className="text-xs text-ink font-medium leading-relaxed">
              {currentCase.casePresentation}
            </p>
          </div>

          {/* Two-Step Target Question */}
          <div className="rounded-2xl bg-accent/10 border border-accent/30 p-4 flex flex-col gap-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-accent">
              Two-Step Core Question:
            </span>
            <p className="text-xs font-bold text-ink leading-snug">
              {currentCase.step2TargetQuestion}
            </p>
          </div>

          {/* Options */}
          <div className="flex flex-col gap-2">
            {currentCase.options.map((opt, idx) => {
              const isSelected = selectedOption === idx;
              const isCorrect = idx === currentCase.correctOptionIndex;

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
                  className={`text-left p-3 rounded-2xl border flex items-center justify-between text-xs transition ${style}`}
                >
                  <span>{opt}</span>
                  {isAnswerCommitted && isCorrect && <Check size={15} className="text-emerald-400 shrink-0" />}
                </button>
              );
            })}
          </div>

          {/* Rationale & Diagnosis Reveal */}
          {isAnswerCommitted && (
            <div className="rounded-2xl bg-surface border border-edge p-5 flex flex-col gap-3 animate-in fade-in duration-200">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-400">
                  Step 1 Condition: {currentCase.step1ImplicitDiagnosis}
                </span>
                <span className="text-[11px] font-mono text-ink-muted">
                  Score: {score.correct}/{totalAttempted}
                </span>
              </div>

              <p className="text-xs text-ink-muted leading-relaxed">
                {currentCase.detailedRationale}
              </p>

              <div className="rounded-xl bg-amber-500/10 border border-amber-500/25 p-3 text-xs text-amber-300">
                <strong>⚠️ Examiner Trap:</strong> {currentCase.examinerTrapBreakdown}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <footer className="flex h-14 shrink-0 items-center justify-between border-t border-edge px-5 bg-surface/90">
          <button
            type="button"
            onClick={handlePrev}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-elevated hover:bg-raised text-xs font-semibold text-ink transition border border-edge"
          >
            <ChevronLeft size={14} />
            <span>Previous Case</span>
          </button>

          <button
            type="button"
            onClick={handleNext}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-accent text-white text-xs font-bold hover:brightness-110 transition shadow-xs"
          >
            <span>Next Case</span>
            <ChevronRight size={14} />
          </button>
        </footer>
      </div>
    </div>
  );
}
