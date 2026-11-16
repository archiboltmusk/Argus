import { useState } from "react";
import {
  X,
  Eye,
  EyeOff,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  Check,
  Dna,
} from "lucide-react";
import {
  BTR_HIGH_YIELD_SPOTTERS,
  type BTRSpotterItem,
} from "@/lib/education/btr-spotter-engine";

interface BTRSpotterModalProps {
  open: boolean;
  onClose: () => void;
}

export function BTRSpotterModal({ open, onClose }: BTRSpotterModalProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);

  if (!open) return null;

  const current: BTRSpotterItem = BTR_HIGH_YIELD_SPOTTERS[currentIndex];
  const allOptions = [current.diagnosis, ...current.distractorLookAlikes].sort();

  const handleNext = () => {
    setRevealed(false);
    setSelectedAnswer(null);
    setCurrentIndex((prev) => (prev + 1) % BTR_HIGH_YIELD_SPOTTERS.length);
  };

  const handlePrev = () => {
    setRevealed(false);
    setSelectedAnswer(null);
    setCurrentIndex((prev) => (prev - 1 + BTR_HIGH_YIELD_SPOTTERS.length) % BTR_HIGH_YIELD_SPOTTERS.length);
  };

  return (
    <div className="fixed inset-0 z-[250] flex items-center justify-center bg-black/80 backdrop-blur-md p-2 sm:p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-3xl rounded-3xl bg-surface border border-edge flex flex-col shadow-2xl overflow-hidden text-ink">
        {/* Header */}
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-edge px-5 sm:px-6 bg-surface/90">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-purple-500/20 text-purple-400 border border-purple-500/30">
              <Eye size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-ink">High-Yield Spotter & Image Bank</h2>
                <span className="font-mono text-xs px-2 py-0.5 rounded-full bg-elevated text-ink-muted border border-edge">
                  {currentIndex + 1} / {BTR_HIGH_YIELD_SPOTTERS.length}
                </span>
              </div>
              <p className="text-xs text-ink-muted">
                25-30% of Board Questions are Visual Spotters • Pathognomonic Patterns & Examiner Traps
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

        {/* Spotter Body */}
        <div className="p-5 sm:p-6 flex flex-col gap-4 overflow-y-auto max-h-[75vh]">
          {/* Metadata pill row */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-accent px-2.5 py-0.5 rounded-md bg-accent/15 border border-accent/25">
                {current.subject}
              </span>
              <span className="text-[11px] font-semibold text-purple-400 px-2.5 py-0.5 rounded-md bg-purple-500/15 border border-purple-500/25">
                {current.modality}
              </span>
            </div>

            <button
              type="button"
              onClick={() => setRevealed(!revealed)}
              className="flex items-center gap-1.5 text-xs font-bold text-ink-muted hover:text-ink transition bg-elevated px-3 py-1 rounded-xl border border-edge-soft"
            >
              {revealed ? <EyeOff size={13} /> : <Eye size={13} />}
              <span>{revealed ? "Hide Key" : "Reveal Diagnostic Key"}</span>
            </button>
          </div>

          {/* Clinical Vignette Card */}
          <div className="rounded-2xl bg-canvas p-4 border border-edge flex flex-col gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-ink-muted">
              Clinical Vignette / Presentation:
            </span>
            <p className="text-xs text-ink leading-relaxed font-medium">
              {current.clinicalVignette}
            </p>
          </div>

          {/* Pathognomonic Sign (Masked / Revealed) */}
          <div className="rounded-2xl bg-surface border border-edge p-4 flex flex-col gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-accent">
              Characteristic Finding / Classic Sign:
            </span>
            <div className={`text-base font-black transition ${revealed ? "text-amber-400" : "blur-md select-none text-ink/30"}`}>
              {current.pathognomonicSign}
            </div>
            {!revealed && (
              <span className="text-[11px] text-ink-muted italic">
                (Sign blurred for active recall. Select your diagnosis below or click Reveal Key)
              </span>
            )}
          </div>

          {/* Interactive Multiple Choice Commitment */}
          <div className="flex flex-col gap-2">
            <span className="text-xs font-bold text-ink">Commit Your Diagnosis:</span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {allOptions.map((opt) => {
                const isCorrect = opt === current.diagnosis;
                const isSelected = selectedAnswer === opt;
                let btnStyle = "bg-canvas border-edge-soft text-ink-muted hover:text-ink";
                if (selectedAnswer) {
                  if (isCorrect) {
                    btnStyle = "bg-emerald-500/20 border-emerald-500 text-emerald-400 font-bold";
                  } else if (isSelected) {
                    btnStyle = "bg-red-500/20 border-red-500 text-red-400 font-bold";
                  }
                }

                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => {
                      setSelectedAnswer(opt);
                      setRevealed(true);
                    }}
                    className={`text-left text-xs p-3 rounded-xl border flex items-center justify-between transition ${btnStyle}`}
                  >
                    <span>{opt}</span>
                    {selectedAnswer && isCorrect && <Check size={14} className="text-emerald-400" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Examiner Trap & Genetics (Revealed state) */}
          {revealed && (
            <div className="flex flex-col gap-2.5 animate-in fade-in duration-200">
              <div className="rounded-xl bg-amber-500/10 border border-amber-500/30 p-3 text-xs text-amber-300 leading-snug flex items-start gap-2">
                <AlertTriangle size={15} className="shrink-0 text-amber-400 mt-0.5" />
                <div>
                  <strong className="block text-amber-400 mb-0.5">⚠️ Examiner Trap Alert:</strong>
                  {current.examinerTraps}
                </div>
              </div>

              {current.associatedGeneOrOrganism && (
                <div className="rounded-xl bg-purple-500/10 border border-purple-500/30 p-2.5 text-xs text-purple-300 flex items-center gap-2">
                  <Dna size={14} className="text-purple-400 shrink-0" />
                  <span><strong>Genetics / Organism:</strong> {current.associatedGeneOrOrganism}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Navigation */}
        <footer className="flex h-14 shrink-0 items-center justify-between border-t border-edge px-5 bg-surface/90">
          <button
            type="button"
            onClick={handlePrev}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-elevated hover:bg-raised text-xs font-semibold text-ink transition border border-edge"
          >
            <ChevronLeft size={14} />
            <span>Previous Spotter</span>
          </button>

          <span className="text-xs text-ink-muted font-mono">
            Spotter #{currentIndex + 1}
          </span>

          <button
            type="button"
            onClick={handleNext}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-accent text-white text-xs font-semibold hover:brightness-110 transition shadow-xs"
          >
            <span>Next Spotter</span>
            <ChevronRight size={14} />
          </button>
        </footer>
      </div>
    </div>
  );
}
