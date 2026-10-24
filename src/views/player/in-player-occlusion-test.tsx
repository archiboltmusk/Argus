import { useState, useEffect } from "react";
import { Eye, EyeOff, X, ArrowRight } from "lucide-react";
import type { StudyNote, OcclusionBox } from "@/lib/education/types";

export type InPlayerOcclusionTestProps = {
  open: boolean;
  note: StudyNote | null;
  onClose: () => void;
  onNext?: () => void;
};

export function InPlayerOcclusionTest({
  open,
  note,
  onClose,
  onNext,
}: InPlayerOcclusionTestProps) {
  const [revealedIds, setRevealedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    setRevealedIds(new Set());
  }, [note, open]);

  if (!open || !note || !note.snapshotDataUrl) return null;

  const boxes: OcclusionBox[] = note.occlusions || [];
  const allRevealed = boxes.length > 0 && revealedIds.size === boxes.length;

  const toggleBox = (id: string) => {
    setRevealedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleRevealAll = () => {
    if (allRevealed) {
      setRevealedIds(new Set());
    } else {
      setRevealedIds(new Set(boxes.map((b) => b.id)));
    }
  };

  return (
    <div className="fixed inset-0 z-[125] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in select-none">
      <div className="relative w-full max-w-[780px] bg-surface rounded-2xl border border-edge shadow-2xl p-5 flex flex-col gap-4 text-ink">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-edge/60 pb-3">
          <div>
            <h3 className="text-sm font-bold text-ink leading-tight flex items-center gap-2">
              <span>Occlusion Exam Drill</span>
              <span className="rounded bg-accent/15 px-2 py-0.5 text-[10px] font-semibold text-accent">
                {boxes.length} Active Masks
              </span>
            </h3>
            <p className="text-[11px] text-ink-muted mt-0.5">{note.itemTitle}</p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleRevealAll}
              className="flex items-center gap-1 rounded-lg bg-raised hover:bg-edge px-3 py-1.5 text-xs font-semibold text-ink transition"
            >
              {allRevealed ? <EyeOff size={13} /> : <Eye size={13} />}
              <span>{allRevealed ? "Hide All Masks" : "Reveal All Masks"}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded-lg text-ink-subtle hover:bg-raised hover:text-ink transition"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Masked Diagram Canvas */}
        <div className="relative w-full max-h-[460px] flex items-center justify-center bg-black/60 rounded-xl overflow-hidden border border-edge/60">
          <img
            src={note.snapshotDataUrl}
            alt="Occlusion snapshot"
            className="max-h-[460px] w-auto object-contain pointer-events-none"
          />

          {/* Occlusion Blinds */}
          {boxes.map((box, idx) => {
            const isRev = revealedIds.has(box.id);
            return (
              <div
                key={box.id}
                onClick={() => toggleBox(box.id)}
                style={{
                  left: `${box.xPct}%`,
                  top: `${box.yPct}%`,
                  width: `${box.wPct}%`,
                  height: `${box.hPct}%`,
                }}
                className={`absolute border transition-colors flex items-center justify-center cursor-pointer shadow-md ${
                  isRev
                    ? "border-emerald-500 bg-emerald-500/10"
                    : "border-amber-400 bg-amber-500/90 text-black font-bold text-xs hover:bg-amber-400"
                }`}
              >
                {!isRev && <span className="font-mono text-[11px]">[{idx + 1}]</span>}
              </div>
            );
          })}
        </div>

        {/* Footer Navigation */}
        <div className="flex items-center justify-between pt-1">
          <span className="text-[11px] text-ink-subtle">
            Tap any yellow mask to test your anatomical / conceptual recall.
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl px-4 py-1.5 text-xs font-semibold text-ink-subtle hover:bg-raised hover:text-ink transition"
            >
              Done
            </button>
            {onNext && (
              <button
                type="button"
                onClick={onNext}
                className="flex items-center gap-1 rounded-xl bg-accent px-4 py-1.5 text-xs font-bold text-white shadow hover:opacity-95 transition"
              >
                <span>Next Diagram</span>
                <ArrowRight size={13} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
