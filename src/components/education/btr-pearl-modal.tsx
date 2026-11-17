import { useState, useEffect } from "react";
import {
  X,
  Sparkles,
  Bookmark,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  RotateCcw,
} from "lucide-react";
import type { BTRPearlItem } from "@/lib/education/btr-pearls-data";
import { reviewFSRSCard } from "@/lib/education/btr-fsrs-engine";

interface BTRPearlModalProps {
  pearl?: BTRPearlItem | null;
  pearls?: BTRPearlItem[];
  initialIndex?: number;
  onClose: () => void;
  onBookmark?: (pearl: BTRPearlItem) => void;
}

export function BTRPearlModal({
  pearl: singlePearl,
  pearls,
  initialIndex = 0,
  onClose,
  onBookmark,
}: BTRPearlModalProps) {
  const isDeckMode = Array.isArray(pearls) && pearls.length > 0;
  const [deckIndex, setDeckIndex] = useState(initialIndex);
  const [isFinished, setIsFinished] = useState(false);

  useEffect(() => {
    setDeckIndex(initialIndex);
    setIsFinished(false);
  }, [initialIndex, singlePearl, pearls]);

  const activePearl = isDeckMode ? pearls[deckIndex] : singlePearl;

  if ((!activePearl && !isFinished) || (!singlePearl && !isDeckMode)) return null;

  const handleRate = (rating: 1 | 2 | 3 | 4) => {
    if (activePearl) {
      reviewFSRSCard(activePearl.id, rating);
    }

    if (isDeckMode && pearls) {
      if (deckIndex + 1 < pearls.length) {
        setDeckIndex((prev) => prev + 1);
      } else {
        setIsFinished(true);
      }
    } else {
      onClose();
    }
  };

  const handlePrev = () => {
    if (deckIndex > 0) {
      setDeckIndex((prev) => prev - 1);
    }
  };

  const handleNext = () => {
    if (pearls && deckIndex + 1 < pearls.length) {
      setDeckIndex((prev) => prev + 1);
    } else if (pearls && deckIndex + 1 >= pearls.length) {
      setIsFinished(true);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-3xl bg-[#0f101d] border border-indigo-500/30 text-white shadow-2xl flex flex-col p-6 gap-5">
        {isFinished ? (
          <div className="flex flex-col items-center justify-center py-8 text-center gap-4">
            <div className="h-16 w-16 rounded-3xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center">
              <CheckCircle2 size={36} />
            </div>
            <div>
              <h3 className="text-lg font-black text-white">Deck Completed!</h3>
              <p className="text-xs text-white/70 mt-1 max-w-xs">
                You have reviewed all {pearls?.length} high-yield pearls in this deck. All items are synced to your FSRS spaced repetition queue.
              </p>
            </div>
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setDeckIndex(0);
                  setIsFinished(false);
                }}
                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs transition flex items-center gap-1.5"
              >
                <RotateCcw size={13} />
                <span>Review Deck Again</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow transition"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          activePearl && (
            <>
              {/* Header */}
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-lg bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                    {activePearl.code}
                  </span>
                  <span className="text-xs text-white/50 uppercase font-bold tracking-wider">
                    {activePearl.subjectId}
                  </span>
                  {isDeckMode && pearls && (
                    <span className="text-xs font-mono font-bold text-amber-400 ml-2">
                      ({deckIndex + 1}/{pearls.length})
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {onBookmark && (
                    <button
                      type="button"
                      onClick={() => onBookmark(activePearl)}
                      className="p-1.5 rounded-xl text-white/70 hover:text-amber-400 hover:bg-white/10 transition"
                      title="Bookmark Pearl"
                    >
                      <Bookmark size={16} />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={onClose}
                    className="p-1.5 rounded-xl hover:bg-white/10 text-white/70 hover:text-white transition"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              {/* Title */}
              <h3 className="text-lg font-black text-white leading-snug">
                {activePearl.title}
              </h3>

              {/* High-Yield Summary */}
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 text-sm leading-relaxed text-white/90">
                {activePearl.highYieldSummary}
              </div>

              {/* 2V Yield Badge */}
              <div className="flex items-center gap-2 p-3 rounded-xl bg-indigo-600/15 border border-indigo-500/25 text-xs text-indigo-300">
                <Sparkles size={14} className="shrink-0 text-indigo-400" />
                <span>
                  <strong>Dr. Zainab Vora Board Rule: </strong>
                  High-yield volatile table. Spaced repetition interval automatically scheduled.
                </span>
              </div>

              {/* FSRS Rating Buttons */}
              <div className="flex flex-col gap-2 pt-2 border-t border-white/10">
                <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-white/60">
                  <span>Rate Spaced Recall (FSRS):</span>
                  {isDeckMode && pearls && (
                    <div className="flex items-center gap-1 normal-case font-normal text-xs text-indigo-300">
                      <button
                        type="button"
                        onClick={handlePrev}
                        disabled={deckIndex === 0}
                        className="p-1 rounded-lg hover:bg-white/10 disabled:opacity-30"
                      >
                        <ChevronLeft size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={handleNext}
                        className="p-1 rounded-lg hover:bg-white/10"
                      >
                        <ChevronRight size={16} />
                      </button>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-4 gap-2">
                  {[
                    { rating: 1 as const, label: "Again", desc: "1d", color: "bg-rose-500/20 text-rose-300 border-rose-500/30 hover:bg-rose-500/30" },
                    { rating: 2 as const, label: "Hard", desc: "3d", color: "bg-amber-500/20 text-amber-300 border-amber-500/30 hover:bg-amber-500/30" },
                    { rating: 3 as const, label: "Good", desc: "7d", color: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/30" },
                    { rating: 4 as const, label: "Easy", desc: "14d", color: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30 hover:bg-cyan-500/30" },
                  ].map((btn) => (
                    <button
                      key={btn.rating}
                      type="button"
                      onClick={() => handleRate(btn.rating)}
                      className={`flex flex-col items-center justify-center py-2 px-1 rounded-xl border text-xs font-bold transition ${btn.color}`}
                    >
                      <span>{btn.label}</span>
                      <span className="text-[10px] opacity-70 mt-0.5">{btn.desc}</span>
                    </button>
                  ))}
                </div>
              </div>
            </>
          )
        )}
      </div>
    </div>
  );
}
