import {
  Play,
  Pause,
  Layers,
  Headphones,
  X,
} from "lucide-react";
import type { BTRLocalMediaFile } from "@/lib/education/btr-local-library";
import type { BTRSubject } from "@/lib/education/corebtr-schedule";

interface BTRMiniPlayerDockProps {
  session: {
    video: BTRLocalMediaFile;
    subject: BTRSubject;
    unannotatedPdf?: BTRLocalMediaFile;
    annotatedPdf?: BTRLocalMediaFile;
  } | null;
  isPlaying?: boolean;
  onTogglePlay?: () => void;
  onExpandWorkstation: () => void;
  onCloseSession: () => void;
}

export function BTRMiniPlayerDock({
  session,
  isPlaying = true,
  onTogglePlay,
  onExpandWorkstation,
  onCloseSession,
}: BTRMiniPlayerDockProps) {
  if (!session) return null;

  return (
    <div className="fixed bottom-0 left-64 right-0 z-[120] h-16 border-t border-edge bg-surface/95 backdrop-blur-md px-6 flex items-center justify-between shadow-2xl animate-in slide-in-from-bottom-2 text-ink">
      {/* Track & Subject Info */}
      <div className="flex items-center gap-3 max-w-md truncate">
        <span className="font-mono text-[10.5px] font-bold rounded-lg bg-accent/20 text-accent px-2 py-0.5 border border-accent/30 shrink-0">
          {session.subject.shortCode}
        </span>

        <div className="flex flex-col truncate">
          <span className="text-xs font-bold text-ink truncate">
            {session.video.title || session.video.filename}
          </span>
          <span className="text-[11px] text-ink-muted flex items-center gap-1.5">
            <Headphones size={11} className="text-accent shrink-0" />
            <span>Continuous Background Study • Dr. Zainab Vora</span>
          </span>
        </div>
      </div>

      {/* Center Controls */}
      <div className="flex items-center gap-3">
        {onTogglePlay && (
          <button
            type="button"
            onClick={onTogglePlay}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent text-white hover:brightness-110 shadow-sm"
          >
            {isPlaying ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />}
          </button>
        )}

        <button
          type="button"
          onClick={onExpandWorkstation}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-600/30 text-xs font-bold transition shadow-xs"
        >
          <Layers size={13} />
          <span>Expand Dual Workstation</span>
        </button>
      </div>

      {/* Right Dismiss */}
      <button
        type="button"
        onClick={onCloseSession}
        className="flex h-7 w-7 items-center justify-center rounded-lg bg-elevated hover:bg-raised text-ink-muted hover:text-ink transition border border-edge-soft"
        title="Stop Mini-Player"
      >
        <X size={14} />
      </button>
    </div>
  );
}
