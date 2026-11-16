import { useMemo } from "react";
import {
  DualWindowPieceScheduler,
  DualWindowBounds,
  BufferTelemetry,
  ContentProfile,
} from "../../lib/torrent/dual-window-piece-scheduler";

export interface TorrentBufferVisualizerProps {
  scheduler: DualWindowPieceScheduler;
  downloadSpeedBytesPerSec?: number;
  className?: string;
  onProfileChange?: (profile: ContentProfile) => void;
}

export function TorrentBufferVisualizer({
  scheduler,
  downloadSpeedBytesPerSec = 0,
  className = "",
  onProfileChange,
}: TorrentBufferVisualizerProps) {
  const ctx = scheduler.getContext();
  const bounds: DualWindowBounds = useMemo(() => scheduler.calculateWindows(), [scheduler, ctx]);
  const telemetry: BufferTelemetry = useMemo(
    () => scheduler.evaluateTelemetry(downloadSpeedBytesPerSec),
    [scheduler, downloadSpeedBytesPerSec, ctx],
  );

  const totalPieces = Math.max(1, ctx.totalPieces);

  // Calculate percentages for the timeline bar
  const needlePct = Math.min(100, Math.max(0, (bounds.currentPieceIndex / totalPieces) * 100));
  const highStartPct = (bounds.highWindow.startPiece / totalPieces) * 100;
  const highWidthPct = Math.max(0.5, (bounds.highWindow.pieceCount / totalPieces) * 100);

  const lowStartPct = (bounds.lowWindow.startPiece / totalPieces) * 100;
  const lowWidthPct = Math.max(0.5, (bounds.lowWindow.pieceCount / totalPieces) * 100);

  // Format Mbps helper
  const speedMbps = ((downloadSpeedBytesPerSec * 8) / 1_000_000).toFixed(1);
  const requiredMbps = ((telemetry.requiredThroughputBytesPerSec * 8) / 1_000_000).toFixed(1);

  // Risk styling
  const riskBadge = {
    none: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    low: "bg-teal-500/20 text-teal-300 border-teal-500/30",
    moderate: "bg-amber-500/20 text-amber-300 border-amber-500/30",
    critical: "bg-rose-500/20 text-rose-300 border-rose-500/30 animate-pulse",
  }[telemetry.underrunRisk];

  return (
    <div
      className={`rounded-xl border border-white/10 bg-[#0d0e12]/95 backdrop-blur-md p-4 text-xs text-zinc-300 shadow-2xl select-none ${className}`}
      data-testid="torrent-buffer-visualizer"
    >
      {/* Header telemetry row */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
          <span className="font-mono font-bold tracking-wider uppercase text-zinc-100">
            Dual-Window Torrent Stream
          </span>
          <span
            className={`px-2 py-0.5 rounded text-[10px] font-semibold tracking-wide border uppercase ${riskBadge}`}
          >
            {telemetry.underrunRisk === "critical"
              ? "STALL RISK"
              : `${telemetry.underrunRisk} risk`}
          </span>
        </div>

        {/* Profile pills */}
        <div className="flex items-center gap-1 bg-black/40 p-0.5 rounded-lg border border-white/5">
          {(["lecture", "action_4k", "standard_drama", "scrubbing"] as ContentProfile[]).map(
            (p) => (
              <button
                key={p}
                onClick={() => onProfileChange?.(p)}
                className={`px-2 py-1 rounded text-[10px] font-medium transition-colors ${
                  ctx.contentProfile === p
                    ? "bg-white/15 text-white font-bold shadow-sm"
                    : "text-zinc-500 hover:text-zinc-300"
                }`}
                title={`Switch profile to ${p}`}
              >
                {p === "action_4k" ? "4K Action" : p === "standard_drama" ? "Drama" : p}
              </button>
            ),
          )}
        </div>
      </div>

      {/* Visual buffer timeline */}
      <div className="relative h-6 w-full rounded bg-zinc-900 border border-white/5 overflow-hidden my-2">
        {/* Background piece ticks (sample representation) */}
        <div className="absolute inset-0 flex opacity-15">
          {Array.from({ length: 60 }).map((_, i) => (
            <div key={i} className="flex-1 border-r border-white/20" />
          ))}
        </div>

        {/* Low Window (Lookahead / Anticipatory Window) */}
        <div
          className="absolute top-0 bottom-0 bg-cyan-500/25 border-y border-cyan-400/40 transition-all duration-300"
          style={{
            left: `${lowStartPct}%`,
            width: `${lowWidthPct}%`,
          }}
          title={`Low Window: pieces ${bounds.lowWindow.startPiece} - ${bounds.lowWindow.endPiece} (${bounds.lookaheadTargetSeconds}s lookahead)`}
        >
          <div className="h-full w-full bg-[repeating-linear-gradient(45deg,transparent,transparent_4px,rgba(6,182,212,0.15)_4px,rgba(6,182,212,0.15)_8px)]" />
        </div>

        {/* High Window (Urgent Playback Deadline Buffer) */}
        <div
          className="absolute top-0 bottom-0 bg-emerald-500/40 border border-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.3)] transition-all duration-300 z-10"
          style={{
            left: `${highStartPct}%`,
            width: `${highWidthPct}%`,
          }}
          title={`High Window: pieces ${bounds.highWindow.startPiece} - ${bounds.highWindow.endPiece} (${bounds.urgentTargetSeconds}s urgent)`}
        />

        {/* Seek Halo (if active) */}
        {bounds.seekHalo && (
          <div
            className="absolute top-0 bottom-0 bg-amber-400/30 border border-amber-300/70 z-20 transition-all duration-150 animate-pulse"
            style={{
              left: `${(bounds.seekHalo.startPiece / totalPieces) * 100}%`,
              width: `${(bounds.seekHalo.pieceCount / totalPieces) * 100}%`,
            }}
            title="Seek Halo: Immediate bidirectional keyframe target"
          />
        )}

        {/* Playhead needle */}
        <div
          className="absolute top-0 bottom-0 w-1 bg-white z-30 shadow-[0_0_8px_white] transition-all duration-150"
          style={{ left: `${needlePct}%` }}
          title={`Playhead: piece ${bounds.currentPieceIndex}`}
        />
      </div>

      {/* Legend & Telemetry stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-white/5 font-mono text-[11px]">
        <div>
          <span className="text-zinc-500 block text-[9px] uppercase tracking-wide">
            Buffer Head
          </span>
          <span className="text-emerald-400 font-bold">
            {telemetry.bufferedSeconds.toFixed(1)}s
          </span>{" "}
          <span className="text-zinc-500">
            ({bounds.highWindow.pieceCount} pcs)
          </span>
        </div>

        <div>
          <span className="text-zinc-500 block text-[9px] uppercase tracking-wide">
            Lookahead
          </span>
          <span className="text-cyan-400 font-bold">
            {bounds.lookaheadTargetSeconds}s
          </span>{" "}
          <span className="text-zinc-500">
            ({bounds.lowWindow.pieceCount} pcs)
          </span>
        </div>

        <div>
          <span className="text-zinc-500 block text-[9px] uppercase tracking-wide">
            Playback Speed
          </span>
          <span className="text-zinc-200 font-bold">
            {ctx.playbackRate.toFixed(2)}x
          </span>
          <span className="text-zinc-500 ml-1">
            ({bounds.burstMultiplier.toFixed(1)}x burst)
          </span>
        </div>

        <div>
          <span className="text-zinc-500 block text-[9px] uppercase tracking-wide">
            Drain vs Inflow
          </span>
          <span className="text-zinc-200">
            {requiredMbps} / {speedMbps} Mbps
          </span>
        </div>
      </div>
    </div>
  );
}
