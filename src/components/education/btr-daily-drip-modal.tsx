import { useState } from "react";
import {
  X,
  Droplets,
  Flame,
  Check,
  RotateCcw,
  AlertTriangle,
  Lightbulb,
} from "lucide-react";
import {
  getDailyDripQueue,
  reviewFSRSCard,
  getFSRSSummary,
  type FSRSRating,
} from "@/lib/education/btr-fsrs-engine";
import { CORE_BTR_SUPER_VOLATILES, type BTRVolatileCard } from "@/lib/education/corebtr-schedule";

interface BTRDailyDripModalProps {
  open: boolean;
  onClose: () => void;
}

export function BTRDailyDripModal({ open, onClose }: BTRDailyDripModalProps) {
  const [queue, setQueue] = useState<BTRVolatileCard[]>(() => getDailyDripQueue(CORE_BTR_SUPER_VOLATILES, 10));
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [summary, setSummary] = useState(() => getFSRSSummary(CORE_BTR_SUPER_VOLATILES));

  if (!open) return null;

  const currentCard: BTRVolatileCard | undefined = queue[currentIndex];
  const isFinished = currentIndex >= queue.length || !currentCard;

  const handleRate = (rating: FSRSRating) => {
    if (!currentCard) return;
    reviewFSRSCard(currentCard.id, rating);
    setSummary(getFSRSSummary(CORE_BTR_SUPER_VOLATILES));
    setIsFlipped(false);
    setCurrentIndex((prev) => prev + 1);
  };

  const handleRestart = () => {
    setQueue(getDailyDripQueue(CORE_BTR_SUPER_VOLATILES, 10));
    setCurrentIndex(0);
    setIsFlipped(false);
  };

  return (
    <div className="fixed inset-0 z-[250] flex items-center justify-center bg-black/80 backdrop-blur-md p-2 sm:p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-2xl rounded-3xl bg-surface border border-edge flex flex-col shadow-2xl overflow-hidden text-ink">
        {/* Header */}
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-edge px-5 sm:px-6 bg-surface/90">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
              <Droplets size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-ink">Daily Volatile Drip (FSRS)</h2>
                <span className="flex items-center gap-1 font-mono text-xs px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-300 font-bold border border-amber-500/30">
                  <Flame size={12} className="text-amber-400" /> {summary.streakDays}-Day Streak
                </span>
              </div>
              <p className="text-xs text-ink-muted">
                10 Super-Volatiles Due for Spaced Watering Today • High-Yield Retention Curve
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

        {/* Content Body */}
        <div className="p-5 sm:p-6 flex flex-col gap-5 bg-canvas">
          {!isFinished ? (
            <>
              {/* Progress and card info */}
              <div className="flex items-center justify-between text-xs text-ink-muted">
                <span className="font-bold uppercase tracking-wider text-accent">
                  CARD {currentIndex + 1} OF {queue.length}: {currentCard.subjectName}
                </span>
                <span className="font-mono text-[11px]">
                  Retention: {summary.retentionRatePercentage}%
                </span>
              </div>

              {/* The Flip Card */}
              <div
                onClick={() => setIsFlipped(!isFlipped)}
                className="cursor-pointer min-h-[260px] rounded-3xl bg-surface border border-edge p-6 flex flex-col justify-between gap-4 shadow-sm hover:border-accent/40 transition select-none"
              >
                <div className="flex flex-col gap-2.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-accent px-2 py-0.5 rounded bg-accent/15 w-fit">
                    {currentCard.category}
                  </span>
                  <h3 className="text-base font-bold text-ink">{currentCard.title}</h3>
                  <div className="rounded-xl bg-canvas p-3 border border-edge-soft text-xs text-ink leading-relaxed">
                    <strong>Prompt:</strong> {currentCard.keyPrompt}
                  </div>
                </div>

                {isFlipped ? (
                  <div className="flex flex-col gap-2.5 pt-3 border-t border-edge-soft animate-in fade-in duration-150">
                    <div className="text-sm font-bold text-emerald-400">
                      {currentCard.maskedAnswer}
                    </div>

                    {currentCard.examinerTrap && (
                      <div className="rounded-xl bg-amber-500/10 border border-amber-500/25 p-2.5 text-xs text-amber-300 flex items-start gap-1.5">
                        <AlertTriangle size={13} className="shrink-0 mt-0.5 text-amber-400" />
                        <span><strong>Trap:</strong> {currentCard.examinerTrap}</span>
                      </div>
                    )}

                    {currentCard.mnemonic && (
                      <div className="rounded-xl bg-purple-500/10 border border-purple-500/25 p-2 text-xs text-purple-300 flex items-center gap-1.5">
                        <Lightbulb size={13} className="text-purple-400 shrink-0" />
                        <span><strong>Mnemonic:</strong> {currentCard.mnemonic}</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-4 text-xs font-semibold text-ink-muted">
                    Tap to reveal answer & examiner traps 👆
                  </div>
                )}
              </div>

              {/* Rating Buttons */}
              {isFlipped ? (
                <div className="grid grid-cols-4 gap-2 pt-2 animate-in fade-in duration-150">
                  <button
                    type="button"
                    onClick={() => handleRate(1)}
                    className="flex flex-col items-center py-2.5 px-2 rounded-xl bg-red-500/15 border border-red-500/30 text-red-400 hover:bg-red-500/25 transition text-xs font-bold"
                  >
                    <span>Again</span>
                    <span className="text-[10px] font-mono opacity-80 mt-0.5">1d</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleRate(2)}
                    className="flex flex-col items-center py-2.5 px-2 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 hover:bg-amber-500/25 transition text-xs font-bold"
                  >
                    <span>Hard</span>
                    <span className="text-[10px] font-mono opacity-80 mt-0.5">2d</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleRate(3)}
                    className="flex flex-col items-center py-2.5 px-2 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/25 transition text-xs font-bold"
                  >
                    <span>Good</span>
                    <span className="text-[10px] font-mono opacity-80 mt-0.5">4d</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleRate(4)}
                    className="flex flex-col items-center py-2.5 px-2 rounded-xl bg-blue-500/15 border border-blue-500/30 text-blue-400 hover:bg-blue-500/25 transition text-xs font-bold"
                  >
                    <span>Easy</span>
                    <span className="text-[10px] font-mono opacity-80 mt-0.5">7d</span>
                  </button>
                </div>
              ) : null}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center p-8 text-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                <Check size={32} />
              </div>
              <div>
                <h3 className="text-base font-bold text-ink">Daily Drip Complete!</h3>
                <p className="text-xs text-ink-muted mt-1 max-w-sm">
                  You&apos;ve watered all 10 volatile cards due for today. Your streak is now{" "}
                  <strong>{summary.streakDays} days</strong>!
                </p>
              </div>

              <button
                type="button"
                onClick={handleRestart}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-accent text-white text-xs font-bold hover:brightness-110 shadow-xs"
              >
                <RotateCcw size={13} />
                <span>Water Another 10 Volatiles</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
