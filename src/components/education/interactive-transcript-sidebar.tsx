import { useState, useMemo, useEffect, useRef } from "react";
import { Search, X, Clock, Play, FileText, ArrowRight } from "lucide-react";
import type { TranscriptCue } from "@/lib/education/course-engine";

export interface InteractiveTranscriptProps {
  open: boolean;
  onClose: () => void;
  cues: TranscriptCue[];
  currentPositionSec: number;
  onSeek: (seconds: number) => void;
  lectureTitle?: string;
  onSendToScratchpad?: (cue: TranscriptCue) => void;
}

export function InteractiveTranscriptSidebar({
  open,
  onClose,
  cues,
  currentPositionSec,
  onSeek,
  lectureTitle,
  onSendToScratchpad,
}: InteractiveTranscriptProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [autoScroll, setAutoScroll] = useState(true);
  const activeCueRef = useRef<HTMLDivElement | null>(null);
  const listContainerRef = useRef<HTMLDivElement | null>(null);

  // Determine current active cue index based on playback position
  const activeIndex = useMemo(() => {
    return cues.findIndex(
      (cue) => currentPositionSec >= cue.startSec && currentPositionSec <= cue.endSec
    );
  }, [cues, currentPositionSec]);

  // Filter cues if user entered search query
  const filteredCues = useMemo(() => {
    if (!searchQuery.trim()) return cues;
    const q = searchQuery.toLowerCase();
    return cues.filter((cue) => cue.text.toLowerCase().includes(q));
  }, [cues, searchQuery]);

  // Auto-scroll to active sentence during playback
  useEffect(() => {
    if (!open || !autoScroll || activeIndex === -1 || searchQuery.trim()) return;
    if (activeCueRef.current && listContainerRef.current) {
      activeCueRef.current.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    }
  }, [activeIndex, open, autoScroll, searchQuery]);

  if (!open) return null;

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <aside
      role="dialog"
      aria-label="Synchronized Interactive Transcript"
      className="pointer-events-auto fixed top-16 right-6 bottom-24 w-[420px] max-w-[calc(100vw-3rem)] z-50 flex flex-col rounded-2xl bg-[#0b0c14]/95 backdrop-blur-2xl border border-white/15 shadow-[0_16px_50px_rgba(0,0,0,0.85)] text-white overflow-hidden animate-[argus-fade-in_200ms_ease-out]"
    >
      {/* Cinematic Header */}
      <div className="flex items-center justify-between px-4 py-3.5 border-b border-white/10 bg-white/[0.02]">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
            <FileText size={16} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-white tracking-wide truncate">
                Interactive Transcript
              </h3>
              <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/30 px-1.5 py-0.5 rounded-full shrink-0">
                SYNC
              </span>
            </div>
            {lectureTitle && (
              <p className="text-[11px] text-zinc-400 truncate max-w-[240px]">
                {lectureTitle}
              </p>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="flex h-7 w-7 items-center justify-center rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
          aria-label="Close transcript"
        >
          <X size={16} />
        </button>
      </div>

      {/* Search Bar & Auto-scroll Toggle */}
      <div className="px-4 py-2.5 border-b border-white/10 bg-zinc-950/40 flex items-center gap-2">
        <div className="relative flex-1">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search dialogue & equations..."
            className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500/50"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white"
            >
              <X size={12} />
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={() => setAutoScroll((v) => !v)}
          title="Toggle auto-follow speaker"
          className={`px-2.5 py-1.5 rounded-lg text-[11px] font-medium border transition-colors ${
            autoScroll
              ? "bg-amber-500/20 text-amber-300 border-amber-500/30"
              : "bg-white/5 text-zinc-400 border-white/10 hover:text-white"
          }`}
        >
          Follow
        </button>
      </div>

      {/* Transcript Cue Feed */}
      <div
        ref={listContainerRef}
        className="flex-1 overflow-y-auto px-3 py-2 space-y-1.5 scrollbar-thin scrollbar-thumb-white/10"
      >
        {filteredCues.length === 0 ? (
          <div className="text-center py-12 text-zinc-500 text-xs">
            No dialogue or derivations match &ldquo;{searchQuery}&rdquo;
          </div>
        ) : (
          filteredCues.map((cue, idx) => {
            const isPlayingThisCue =
              currentPositionSec >= cue.startSec && currentPositionSec <= cue.endSec;

            return (
              <div
                key={`${cue.startSec}-${idx}`}
                ref={isPlayingThisCue ? activeCueRef : null}
                onClick={() => onSeek(cue.startSec)}
                className={`group relative p-2.5 rounded-xl border transition-all duration-150 cursor-pointer ${
                  isPlayingThisCue
                    ? "bg-amber-500/15 border-amber-500/40 shadow-[0_0_15px_rgba(245,158,11,0.15)]"
                    : "bg-white/[0.02] border-white/5 hover:bg-white/[0.06] hover:border-white/15"
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span
                    className={`flex items-center gap-1 font-mono text-[11px] font-semibold tracking-wide ${
                      isPlayingThisCue ? "text-amber-400" : "text-zinc-400 group-hover:text-amber-300"
                    }`}
                  >
                    <Clock size={11} />
                    {formatTime(cue.startSec)}
                  </span>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {onSendToScratchpad && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSendToScratchpad(cue);
                        }}
                        className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-white/10 hover:bg-white/20 text-zinc-300 hover:text-white"
                        title="Send sentence to derivation scratchpad"
                      >
                        + Scratchpad
                      </button>
                    )}
                    <span className="flex items-center gap-0.5 text-[10px] text-amber-400 font-medium">
                      Seek <ArrowRight size={10} />
                    </span>
                  </div>
                </div>

                <p
                  className={`text-[12.5px] leading-relaxed select-text ${
                    isPlayingThisCue
                      ? "text-zinc-100 font-medium"
                      : "text-zinc-300 group-hover:text-zinc-100"
                  }`}
                >
                  {cue.text}
                </p>
              </div>
            );
          })
        )}
      </div>

      {/* Footer / Status */}
      <div className="px-4 py-2.5 border-t border-white/10 bg-zinc-950/60 flex items-center justify-between text-[11px] text-zinc-400">
        <span className="flex items-center gap-1.5">
          <Play size={11} className="text-amber-400" />
          Click any sentence to seek
        </span>
        <span className="tabular-nums font-mono text-zinc-500">
          {cues.length} cues
        </span>
      </div>
    </aside>
  );
}
