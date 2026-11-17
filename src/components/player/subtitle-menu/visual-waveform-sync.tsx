import { useMemo } from "react";
import {
  AudioLines,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import { useT } from "@/lib/i18n";

interface VisualWaveformSyncProps {
  delaySec: number;
  onDelayChange: (seconds: number) => void;
  onClose?: () => void;
}

export function VisualWaveformSync({
  delaySec,
  onDelayChange,
}: VisualWaveformSyncProps) {
  const tr = useT();

  // Generate synthetic voice energy waveform bars for visualization
  const waveformBars = useMemo(() => {
    const bars: number[] = [];
    for (let i = 0; i < 48; i++) {
      // Simulate speech bursts and breathing pauses
      const burst = Math.sin(i * 0.4) * Math.cos(i * 0.15);
      const val = Math.max(0.15, Math.min(1.0, Math.abs(burst) + (i % 5 === 0 ? 0.3 : 0.05)));
      bars.push(val);
    }
    return bars;
  }, []);

  const adjustDelay = (deltaSec: number) => {
    const next = Math.round((delaySec + deltaSec) * 100) / 100;
    onDelayChange(next);
  };

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onDelayChange(parseFloat(e.target.value));
  };

  const resetDelay = () => {
    onDelayChange(0);
  };

  return (
    <div className="flex flex-col p-3 rounded-xl border border-edge-soft bg-surface-elevated space-y-3 select-none">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-ink">
          <AudioLines size={14} className="text-accent" />
          <span>{tr("Visual Audio Timing Sync")}</span>
        </div>

        <span className="font-mono text-xs font-bold text-accent">
          {delaySec > 0 ? `+${delaySec.toFixed(2)}s` : `${delaySec.toFixed(2)}s`}
        </span>
      </div>

      {/* Mini Waveform Visualization Canvas */}
      <div className="relative h-12 w-full rounded-lg bg-surface-base border border-edge-soft/60 overflow-hidden flex items-center justify-between px-2">
        {/* Voice Onset Waveform Bars */}
        <div className="absolute inset-0 flex items-center justify-between px-2 pointer-events-none opacity-40">
          {waveformBars.map((height, idx) => (
            <div
              key={idx}
              className="w-1 rounded-full bg-accent transition-all duration-200"
              style={{ height: `${height * 100}%` }}
            />
          ))}
        </div>

        {/* Subtitle Cue Timing Alignment Block (moves based on delay) */}
        <div
          className="relative z-10 h-7 rounded-md bg-accent/25 border border-accent flex items-center justify-center px-2 text-[10px] font-bold text-accent shadow-sm transition-transform duration-100"
          style={{
            transform: `translateX(${Math.max(-40, Math.min(40, delaySec * 15))}px)`,
          }}
        >
          {tr("Subtitle Cue")}
        </div>
      </div>

      {/* Drag Slider */}
      <div className="space-y-1">
        <input
          type="range"
          min={-5}
          max={5}
          step={0.05}
          value={delaySec}
          onChange={handleSliderChange}
          className="w-full h-1.5 rounded-lg bg-edge-soft accent-accent cursor-pointer"
        />
        <div className="flex items-center justify-between text-[10px] text-ink-muted font-mono">
          <span>-5.0s</span>
          <span>0.0s</span>
          <span>+5.0s</span>
        </div>
      </div>

      {/* Nudge Buttons */}
      <div className="grid grid-cols-4 gap-1.5">
        <button
          type="button"
          onClick={() => adjustDelay(-0.25)}
          className="py-1 px-1.5 rounded-md border border-edge-soft bg-surface-base hover:bg-canvas/50 text-[11px] font-mono font-medium text-ink transition-colors"
        >
          -250ms
        </button>
        <button
          type="button"
          onClick={() => adjustDelay(-0.05)}
          className="py-1 px-1.5 rounded-md border border-edge-soft bg-surface-base hover:bg-canvas/50 text-[11px] font-mono font-medium text-ink transition-colors"
        >
          -50ms
        </button>
        <button
          type="button"
          onClick={() => adjustDelay(0.05)}
          className="py-1 px-1.5 rounded-md border border-edge-soft bg-surface-base hover:bg-canvas/50 text-[11px] font-mono font-medium text-ink transition-colors"
        >
          +50ms
        </button>
        <button
          type="button"
          onClick={() => adjustDelay(0.25)}
          className="py-1 px-1.5 rounded-md border border-edge-soft bg-surface-base hover:bg-canvas/50 text-[11px] font-mono font-medium text-ink transition-colors"
        >
          +250ms
        </button>
      </div>

      {/* Footer Actions */}
      <div className="flex items-center justify-between pt-1 border-t border-edge-soft/50 text-xs">
        <button
          type="button"
          onClick={resetDelay}
          className="flex items-center gap-1 text-[11px] text-ink-muted hover:text-ink transition-colors"
        >
          <RotateCcw size={11} />
          {tr("Reset Timing")}
        </button>

        <button
          type="button"
          onClick={() => {
            // Smart voice onset snap: snap to nearest 100ms
            const snapped = Math.round(delaySec * 10) / 10;
            onDelayChange(snapped);
          }}
          className="flex items-center gap-1 px-2 py-0.5 rounded bg-accent/15 text-accent text-[11px] font-semibold hover:bg-accent/25 transition-colors"
        >
          <Sparkles size={11} />
          {tr("Snap to Voice Onset")}
        </button>
      </div>
    </div>
  );
}
