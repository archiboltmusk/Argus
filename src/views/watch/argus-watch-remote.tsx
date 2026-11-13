import { useState } from "react";
import { Pause, Play, RotateCcw, RotateCw, SkipBack, SkipForward, Volume2 } from "lucide-react";

export interface WatchRemoteProps {
  title?: string;
  subtitle?: string;
  playing?: boolean;
  volume?: number;
  onCommand?: (cmd: "playpause" | "next" | "previous" | "seek-back" | "seek-fwd") => void;
  onVolumeChange?: (next: number) => void;
}

export function ArgusWatchRemote({
  title = "Argus",
  subtitle = "Ready on Mac",
  playing = false,
  volume = 70,
  onCommand,
  onVolumeChange,
}: WatchRemoteProps) {
  const [vol, setVol] = useState(volume);

  const send = (cmd: "playpause" | "next" | "previous" | "seek-back" | "seek-fwd") => {
    onCommand?.(cmd);
  };

  return (
    <div className="flex min-h-screen w-full max-w-[396px] flex-col justify-between bg-black px-4 py-5 text-white select-none">
      <div className="text-center">
        <p className="truncate text-sm font-semibold tracking-tight">{title}</p>
        <p className="truncate text-xs text-white/60">{subtitle}</p>
      </div>

      <div className="flex items-center justify-center gap-3">
        <button
          type="button"
          onClick={() => send("seek-back")}
          aria-label="Back 15 seconds"
          className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 active:scale-95"
        >
          <RotateCcw size={18} />
        </button>

        <button
          type="button"
          onClick={() => send("playpause")}
          aria-label={playing ? "Pause" : "Play"}
          className="flex h-16 w-16 items-center justify-center rounded-full bg-white text-black active:scale-95"
        >
          {playing ? <Pause size={24} /> : <Play size={24} className="translate-x-0.5" />}
        </button>

        <button
          type="button"
          onClick={() => send("seek-fwd")}
          aria-label="Forward 15 seconds"
          className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 active:scale-95"
        >
          <RotateCw size={18} />
        </button>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between px-4">
          <button
            type="button"
            onClick={() => send("previous")}
            aria-label="Previous"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 active:scale-95"
          >
            <SkipBack size={16} />
          </button>
          <button
            type="button"
            onClick={() => send("next")}
            aria-label="Next"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 active:scale-95"
          >
            <SkipForward size={16} />
          </button>
        </div>

        <label className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-2 text-xs">
          <Volume2 size={14} className="shrink-0 text-white/75" />
          <input
            type="range"
            min={0}
            max={100}
            value={vol}
            onChange={(e) => {
              const next = Number(e.target.value);
              setVol(next);
              onVolumeChange?.(next);
            }}
            className="w-full accent-white"
          />
          <span className="w-7 text-right tabular-nums text-white/75">{vol}%</span>
        </label>
      </div>
    </div>
  );
}
