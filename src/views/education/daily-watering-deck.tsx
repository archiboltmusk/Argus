import { useState, useMemo } from "react";
import {
  CheckCircle,
  Eye,
  Zap,
  ArrowRight,
} from "lucide-react";
import type { StudyNote, FSRSRating } from "@/lib/education/types";
import { reviewStudyNote } from "@/lib/education/notes";
import { ImageOcclusionCanvas } from "@/views/player/image-occlusion-canvas";

export type DailyWateringDeckProps = {
  notes: StudyNote[];
  onOpenNoteContext?: (note: StudyNote) => void;
  onClose: () => void;
};

export function DailyWateringDeck({
  notes,
  onOpenNoteContext,
  onClose,
}: DailyWateringDeckProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [reviewedCount, setReviewedCount] = useState(0);

  const dueNotes = useMemo(() => {
    return notes.filter((n) => {
      if (!n.fsrs) return true;
      return n.fsrs.due <= Date.now();
    });
  }, [notes]);

  const current = dueNotes[currentIndex] ?? null;

  const handleRate = (rating: FSRSRating) => {
    if (!current) return;
    reviewStudyNote(current.id, rating);
    setReviewedCount((c) => c + 1);
    setShowAnswer(false);
    if (currentIndex < dueNotes.length - 1) {
      setCurrentIndex((i) => i + 1);
    }
  };

  if (!current || reviewedCount >= dueNotes.length) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center bg-surface rounded-2xl border border-edge shadow-xl gap-4 max-w-[500px] mx-auto animate-in fade-in">
        <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
          <CheckCircle className="w-8 h-8" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-ink">Tree Watered for Today!</h3>
          <p className="text-xs text-ink-muted mt-1 max-w-[340px]">
            You have reviewed all {reviewedCount} due concepts using the FSRS spaced repetition engine. Your memory traces are reinforced.
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-xl bg-accent px-5 py-2 text-xs font-semibold text-white shadow hover:opacity-95 transition"
        >
          Return to Education Hub
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 max-w-[640px] mx-auto bg-surface rounded-2xl border border-edge shadow-2xl p-6 text-ink animate-in zoom-in-95 duration-150">
      {/* Top Deck Info */}
      <div className="flex items-center justify-between border-b border-edge/60 pb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-500/15 text-sky-500 font-bold text-xs">
            💧
          </div>
          <div>
            <h4 className="text-sm font-semibold text-ink leading-tight">Daily Tree Watering (FSRS Recall)</h4>
            <p className="text-[11px] text-ink-subtle">
              Card {currentIndex + 1} of {dueNotes.length} due today
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {current.highYield && (
            <span className="flex items-center gap-1 rounded bg-amber-500/15 text-amber-500 px-2 py-0.5 text-[10px] font-semibold">
              <Zap size={11} className="fill-amber-500" /> High-Yield Repeat
            </span>
          )}
          <span className="text-[11px] font-mono text-ink-subtle">
            Reps: {current.fsrs?.reps ?? 0}
          </span>
        </div>
      </div>

      {/* Card Body */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between text-xs text-ink-muted">
          <span className="font-medium truncate max-w-[360px]">{current.itemTitle}</span>
          <span className="font-mono text-[11px] bg-raised px-1.5 py-0.5 rounded">
            {current.timestampLabel}
          </span>
        </div>

        {/* Visual Occlusion or Screenshot */}
        {current.snapshotDataUrl && (
          <div className="rounded-xl overflow-hidden border border-edge/60 bg-black/40">
            {current.occlusions && current.occlusions.length > 0 ? (
              <ImageOcclusionCanvas
                imageUrl={current.snapshotDataUrl}
                boxes={current.occlusions}
                interactive={true}
              />
            ) : (
              <img
                src={current.snapshotDataUrl}
                alt="Diagram snapshot"
                className="max-h-[260px] w-auto mx-auto object-contain"
              />
            )}
          </div>
        )}

        {/* Question / Context */}
        <div className="rounded-xl bg-canvas/60 p-3.5 border border-edge text-sm">
          {showAnswer ? (
            <div className="flex flex-col gap-2">
              <span className="text-[11px] uppercase tracking-wider font-semibold text-emerald-500">
                Answer / Key Takeaway:
              </span>
              <p className="whitespace-pre-wrap text-[13px] text-ink leading-relaxed">
                {current.markdown}
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-2 py-2 items-center justify-center text-center">
              <span className="text-xs text-ink-muted">
                Recall the core mechanism, derivation, or unmask the diagram labels above.
              </span>
              <button
                type="button"
                onClick={() => setShowAnswer(true)}
                className="mt-1 flex items-center gap-1.5 rounded-lg bg-raised px-4 py-1.5 text-xs font-semibold text-ink hover:bg-edge transition"
              >
                <Eye size={13} />
                <span>Show Answer & Explanation</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* FSRS Scoring Bar */}
      {showAnswer ? (
        <div className="flex flex-col gap-2 pt-2 border-t border-edge/60 animate-in fade-in">
          <span className="text-[11px] text-center text-ink-subtle">
            Rate your recall difficulty to optimize the spaced interval:
          </span>
          <div className="grid grid-cols-4 gap-2">
            <button
              type="button"
              onClick={() => handleRate("again")}
              className="flex flex-col items-center py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 border border-rose-500/30 transition text-xs font-semibold"
            >
              <span>Again</span>
              <span className="text-[10px] font-normal opacity-75">&lt; 10m / 1d</span>
            </button>
            <button
              type="button"
              onClick={() => handleRate("hard")}
              className="flex flex-col items-center py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 border border-amber-500/30 transition text-xs font-semibold"
            >
              <span>Hard</span>
              <span className="text-[10px] font-normal opacity-75">1-2d</span>
            </button>
            <button
              type="button"
              onClick={() => handleRate("good")}
              className="flex flex-col items-center py-2 rounded-xl bg-sky-500/10 hover:bg-sky-500/20 text-sky-500 border border-sky-500/30 transition text-xs font-semibold"
            >
              <span>Good</span>
              <span className="text-[10px] font-normal opacity-75">3-5d</span>
            </button>
            <button
              type="button"
              onClick={() => handleRate("easy")}
              className="flex flex-col items-center py-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 border border-emerald-500/30 transition text-xs font-semibold"
            >
              <span>Easy</span>
              <span className="text-[10px] font-normal opacity-75">7+d</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between pt-1">
          <button
            type="button"
            onClick={onClose}
            className="text-xs text-ink-subtle hover:text-ink transition"
          >
            Skip for now
          </button>
          {onOpenNoteContext && (
            <button
              type="button"
              onClick={() => onOpenNoteContext(current)}
              className="flex items-center gap-1 text-xs text-accent hover:underline"
            >
              <span>Jump to video timestamp</span>
              <ArrowRight size={12} />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
