import { useMemo } from "react";
import {
  CatchMeUpEngine,
  type CatchMeUpCue,
  type CatchMeUpSummary,
} from "@/lib/player/catch-me-up";

export interface CatchMeUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPlaybackSec: number;
  cues: CatchMeUpCue[];
}

function formatTime(totalSec: number): string {
  const s = Math.max(0, Math.floor(totalSec));
  const mins = Math.floor(s / 60);
  const secs = s % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export function CatchMeUpModal({
  isOpen,
  onClose,
  currentPlaybackSec,
  cues,
}: CatchMeUpModalProps) {
  const summary: CatchMeUpSummary = useMemo(() => {
    const engine = new CatchMeUpEngine(cues);
    return engine.generateRecap(currentPlaybackSec);
  }, [cues, currentPlaybackSec]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Catch Me Up Micro-Recap"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md px-4 py-8"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl rounded-2xl bg-zinc-900 border border-zinc-700/60 shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold text-white">Catch Me Up</h2>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full font-mono">
                  Zero Spoilers Verified
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                Orientation for timestamp {formatTime(currentPlaybackSec)} &bull; Window: last {formatTime(currentPlaybackSec - summary.windowStartSec)}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-zinc-800"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Active Objective */}
          <div className="p-3 rounded-xl bg-zinc-950/70 border border-zinc-800">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-amber-400 block mb-1">
              Active Scene Objective
            </span>
            <p className="text-xs sm:text-sm text-zinc-200 font-medium">
              {summary.activeObjective}
            </p>
          </div>

          {/* Characters on Screen */}
          {summary.activeCharactersInScene.length > 0 && (
            <div>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 block mb-2">
                Who Is In This Scene
              </span>
              <div className="flex flex-wrap gap-2">
                {summary.activeCharactersInScene.map((char) => (
                  <div
                    key={char.name}
                    className="p-2 rounded-lg bg-zinc-800/80 border border-zinc-700/50 flex flex-col min-w-[130px]"
                  >
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-semibold text-white">{char.name}</span>
                      <span className="text-[10px] text-zinc-400">{char.recentLinesCount} lines</span>
                    </div>
                    <span className="text-[11px] text-zinc-400 line-clamp-1 italic">
                      &ldquo;{char.lastDialogueSnippet}&rdquo;
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Plot Digest */}
          <div>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 block mb-2">
              Recent Moments (Past 10 Mins)
            </span>
            <div className="space-y-2">
              {summary.recentPlotDigest.map((digest, idx) => (
                <div
                  key={idx}
                  className="p-2.5 rounded-lg bg-zinc-950/50 border border-zinc-800 text-xs text-zinc-300 flex items-start gap-2.5"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-1.5 shrink-0" />
                  <p className="line-clamp-2">{digest}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-zinc-800 flex justify-between items-center bg-zinc-950/40">
          <span className="text-[11px] text-zinc-500">
            Press ESC or click outside to dismiss
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition-colors"
          >
            Resume Watching &rarr;
          </button>
        </div>
      </div>
    </div>
  );
}
