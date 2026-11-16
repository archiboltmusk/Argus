import {
  X,
  Sparkles,
  Bookmark,
} from "lucide-react";
import type { BTRPearlItem } from "@/lib/education/btr-pearls-data";
import { reviewFSRSCard } from "@/lib/education/btr-fsrs-engine";

interface BTRPearlModalProps {
  pearl: BTRPearlItem | null;
  onClose: () => void;
  onBookmark?: (pearl: BTRPearlItem) => void;
}

export function BTRPearlModal({ pearl, onClose, onBookmark }: BTRPearlModalProps) {
  if (!pearl) return null;

  const handleRate = (rating: 1 | 2 | 3 | 4) => {
    reviewFSRSCard(pearl.id, rating);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-3xl bg-[#0f101d] border border-indigo-500/30 text-white shadow-2xl flex flex-col p-6 gap-5">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-lg bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              {pearl.code}
            </span>
            <span className="text-xs text-white/50 uppercase font-bold tracking-wider">
              {pearl.subjectId}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {onBookmark && (
              <button
                type="button"
                onClick={() => onBookmark(pearl)}
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
          {pearl.title}
        </h3>

        {/* High-Yield Summary */}
        <div className="p-4 rounded-2xl bg-white/5 border border-white/10 text-sm leading-relaxed text-white/90">
          {pearl.highYieldSummary}
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
          <span className="text-[11px] font-bold uppercase tracking-wider text-white/60">
            Rate Spaced Recall (FSRS):
          </span>
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
      </div>
    </div>
  );
}
