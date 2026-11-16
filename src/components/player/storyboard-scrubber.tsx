import { useMemo } from "react";

export interface StoryboardScrubberProps {
  hoverSec: number;
  durationSec: number;
  chapters?: Array<{ title: string; startSec: number }>;
  visible: boolean;
}

export function formatTimecode(sec: number): string {
  const clamped = Math.max(0, Math.floor(sec));
  const h = Math.floor(clamped / 3600);
  const m = Math.floor((clamped % 3600) / 60);
  const s = clamped % 60;
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function StoryboardScrubber({
  hoverSec,
  durationSec,
  chapters = [],
  visible,
}: StoryboardScrubberProps) {
  // Compute current chapter if available
  const currentChapter = useMemo(() => {
    if (!chapters || chapters.length === 0) return null;
    const sorted = [...chapters].sort((a, b) => a.startSec - b.startSec);
    for (let i = sorted.length - 1; i >= 0; i--) {
      if (hoverSec >= sorted[i].startSec) {
        return sorted[i];
      }
    }
    return null;
  }, [chapters, hoverSec]);

  // Compute 5 continuous frames around hover position (-20s, -10s, 0, +10s, +20s)
  const frames = useMemo(() => {
    const offsets = [-20, -10, 0, 10, 20];
    return offsets.map((offset) => {
      const targetSec = Math.max(0, Math.min(durationSec, hoverSec + offset));
      return {
        offset,
        sec: targetSec,
        isCenter: offset === 0,
        timeLabel: formatTimecode(targetSec),
        pct: durationSec > 0 ? (targetSec / durationSec) * 100 : 0,
      };
    });
  }, [hoverSec, durationSec]);

  if (!visible || durationSec <= 0) return null;

  return (
    <div
      className="pointer-events-none absolute bottom-14 left-1/2 -translate-x-1/2 z-40 flex flex-col items-center animate-in fade-in zoom-in-95 duration-150"
      aria-label="Storyboard Scrubbing Carousel"
    >
      {/* Chapter Indicator Pill */}
      {currentChapter && (
        <div className="mb-2 px-3 py-1 rounded-full bg-black/80 border border-amber-500/40 text-amber-300 text-[11px] font-medium tracking-wide shadow-lg backdrop-blur-md">
          {currentChapter.title}
        </div>
      )}

      {/* Filmstrip Ribbon */}
      <div className="flex items-center gap-1.5 p-1.5 rounded-xl bg-[#0b0c14]/95 border border-zinc-700/80 shadow-2xl backdrop-blur-xl">
        {frames.map((frame, idx) => (
          <div
            key={idx}
            className={`relative flex flex-col items-center justify-between rounded-lg overflow-hidden transition-all ${
              frame.isCenter
                ? "w-28 h-20 border-2 border-amber-500 scale-105 shadow-md shadow-amber-500/20 bg-zinc-900"
                : "w-20 h-14 border border-zinc-800 opacity-60 bg-zinc-950 scale-95"
            }`}
          >
            {/* Visual Frame Background Gradient */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-zinc-900/40 to-transparent flex items-center justify-center">
              <span className="font-mono text-[9px] text-zinc-500 font-medium">
                {frame.pct.toFixed(0)}%
              </span>
            </div>

            {/* Frame Needle Top Marker */}
            {frame.isCenter && (
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-amber-400" />
            )}

            {/* Timecode Badge Bottom */}
            <div
              className={`relative z-10 w-full text-center pb-1 font-mono ${
                frame.isCenter
                  ? "text-xs font-semibold text-amber-300"
                  : "text-[10px] text-zinc-400"
              }`}
            >
              {frame.timeLabel}
            </div>
          </div>
        ))}
      </div>

      {/* Downward Needle Arrow pointing to seekbar */}
      <div className="w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-amber-500 mt-1" />
    </div>
  );
}
