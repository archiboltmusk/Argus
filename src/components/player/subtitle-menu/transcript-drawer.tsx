import { useState, useEffect, useRef, useMemo } from "react";
import {
  FileText,
  Search,
  X,
  Copy,
  Check,
  Compass,
  BookOpen,
} from "lucide-react";
import {
  useTranscriptState,
  closeTranscriptDrawer,
  setTranscriptSearchQuery,
} from "@/lib/subtitles/transcript-store";
import { findMatchingPearl } from "@/lib/subtitles/medical-pearls-glossary";
import { useT } from "@/lib/i18n";

interface TranscriptDrawerProps {
  onSeek: (seconds: number) => void;
  onOpenPearlModal?: (pearl: any) => void;
}

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function TranscriptDrawer({ onSeek, onOpenPearlModal }: TranscriptDrawerProps) {
  const tr = useT();
  const state = useTranscriptState();
  const [followPlayback, setFollowPlayback] = useState(true);
  const [copiedAll, setCopiedAll] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const activeLineRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Filter cues by search query
  const filteredCues = useMemo(() => {
    if (!state.searchQuery.trim()) {
      return state.cues.map((cue, index) => ({ cue, originalIndex: index }));
    }
    const q = state.searchQuery.toLowerCase();
    return state.cues
      .map((cue, index) => ({ cue, originalIndex: index }))
      .filter(({ cue }) => cue.text.toLowerCase().includes(q));
  }, [state.cues, state.searchQuery]);

  // Auto-scroll to active cue when follow mode is on
  useEffect(() => {
    if (!followPlayback || state.activeCueIndex === -1) return;
    if (activeLineRef.current && scrollContainerRef.current) {
      activeLineRef.current.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  }, [state.activeCueIndex, followPlayback]);

  if (!state.isOpen) return null;

  const handleCopyAll = () => {
    const fullText = state.cues
      .map((c) => `[${formatTime(c.start)}] ${c.text}`)
      .join("\n\n");
    navigator.clipboard.writeText(fullText);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2500);
  };

  const handleCopyLine = (text: string, index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <div className="fixed top-14 bottom-20 right-6 z-[9500] w-96 max-w-[calc(100vw-3rem)] flex flex-col rounded-2xl border border-edge-soft bg-surface-base/95 backdrop-blur-xl shadow-2xl overflow-hidden animate-in slide-in-from-right-4 duration-200 select-none">
      {/* Header */}
      <div className="p-3.5 border-b border-edge-soft bg-surface-elevated/40 space-y-2.5 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-accent/15 text-accent">
              <FileText size={14} strokeWidth={2.4} />
            </div>
            <div>
              <h3 className="text-xs font-bold text-ink leading-none">
                {tr("Interactive Transcript")}
              </h3>
              <p className="text-[10px] text-ink-muted mt-0.5">
                {state.cues.length} {tr("spoken sentences")}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setFollowPlayback(!followPlayback)}
              title={followPlayback ? tr("Following playback") : tr("Follow disabled")}
              className={`p-1.5 rounded-md transition-colors ${
                followPlayback
                  ? "bg-accent/15 text-accent"
                  : "text-ink-muted hover:text-ink hover:bg-canvas/50"
              }`}
            >
              <Compass size={14} />
            </button>

            <button
              type="button"
              onClick={handleCopyAll}
              title={tr("Copy full transcript")}
              className="p-1.5 rounded-md text-ink-muted hover:text-ink hover:bg-canvas/50 transition-colors"
            >
              {copiedAll ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
            </button>

            <button
              type="button"
              onClick={closeTranscriptDrawer}
              aria-label={tr("Close transcript")}
              className="p-1.5 rounded-md text-ink-muted hover:text-ink hover:bg-canvas/50 transition-colors"
            >
              <X size={14} />
            </button>
          </div>
        </div>

        {/* Search Input */}
        <div className="relative">
          <Search size={13} className="absolute left-2.5 top-2.5 text-ink-muted" />
          <input
            type="text"
            placeholder={tr("Search transcript text...")}
            value={state.searchQuery}
            onChange={(e) => setTranscriptSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-edge-soft bg-surface-elevated pl-8 pr-7 py-1.5 text-xs text-ink placeholder:text-ink-muted/70 focus:outline-none focus:border-accent"
          />
          {state.searchQuery && (
            <button
              type="button"
              onClick={() => setTranscriptSearchQuery("")}
              className="absolute right-2.5 top-2.5 text-ink-muted hover:text-ink"
            >
              <X size={12} />
            </button>
          )}
        </div>
      </div>

      {/* Transcript Sentence List */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto p-2 space-y-1 scrollbar-thin divide-y divide-edge-soft/30"
      >
        {filteredCues.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-center text-ink-muted p-4">
            <FileText size={28} className="opacity-40 mb-2" />
            <p className="text-xs font-semibold">{tr("No dialogue matches found")}</p>
            <p className="text-[11px] opacity-75 mt-0.5">
              {tr("Try searching for another word or phrase.")}
            </p>
          </div>
        ) : (
          filteredCues.map(({ cue, originalIndex }) => {
            const isActive = originalIndex === state.activeCueIndex;
            const matchingPearl = findMatchingPearl(cue.text);

            return (
              <div
                key={originalIndex}
                ref={isActive ? activeLineRef : null}
                onClick={() => onSeek(cue.start)}
                className={`group relative flex items-start gap-2.5 p-2 rounded-xl cursor-pointer transition-all ${
                  isActive
                    ? "bg-accent/15 border-l-2 border-accent shadow-sm"
                    : "hover:bg-canvas/50"
                }`}
              >
                {/* Timestamp Pill */}
                <span
                  className={`shrink-0 font-mono text-[10px] px-1.5 py-0.5 rounded font-bold ${
                    isActive
                      ? "bg-accent text-accent-contrast"
                      : "bg-surface-elevated text-ink-muted group-hover:text-ink"
                  }`}
                >
                  {formatTime(cue.start)}
                </span>

                {/* Sentence Text */}
                <div className="flex-1 min-w-0">
                  <p
                    className={`text-xs leading-relaxed font-sans ${
                      isActive ? "text-ink font-semibold" : "text-ink/90"
                    }`}
                  >
                    {cue.text}
                  </p>

                  {/* Medical / High-Yield Pearl Pill */}
                  {matchingPearl && (
                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenPearlModal?.(matchingPearl);
                      }}
                      className="inline-flex items-center gap-1 mt-1 px-1.5 py-0.5 rounded bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[10px] font-semibold hover:bg-amber-500/25 transition-colors"
                    >
                      <BookOpen size={10} />
                      <span>{matchingPearl.term}</span>
                      {matchingPearl.examTag && (
                        <span className="text-[9px] opacity-75">· {matchingPearl.examTag}</span>
                      )}
                    </div>
                  )}
                </div>

                {/* Hover Copy Button */}
                <button
                  type="button"
                  onClick={(e) => handleCopyLine(cue.text, originalIndex, e)}
                  title={tr("Copy line")}
                  className="shrink-0 p-1 rounded opacity-0 group-hover:opacity-100 text-ink-muted hover:text-ink hover:bg-surface-elevated transition-opacity"
                >
                  {copiedIndex === originalIndex ? (
                    <Check size={12} className="text-emerald-400" />
                  ) : (
                    <Copy size={12} />
                  )}
                </button>
              </div>
            );
          })
        )}
      </div>

      {/* Footer Info */}
      <div className="p-2 border-t border-edge-soft bg-surface-elevated/40 flex items-center justify-between text-[11px] text-ink-muted shrink-0">
        <span>{tr("Click any sentence to jump to that moment")}</span>
      </div>
    </div>
  );
}
