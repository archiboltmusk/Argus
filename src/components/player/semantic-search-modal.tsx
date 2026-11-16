import { useState, useMemo, useEffect, useRef } from "react";
import {
  SemanticSceneSearchIndex,
  type SemanticSearchCue,
  type SemanticSearchResult,
} from "@/lib/player/semantic-scene-search";

export interface SemanticSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSeek: (timestampSec: number) => void;
  cues: SemanticSearchCue[];
  chapters?: Array<{ startSec: number; title: string }>;
  currentPlaybackSec?: number;
}

function formatTime(totalSec: number): string {
  const s = Math.max(0, Math.floor(totalSec));
  const hrs = Math.floor(s / 3600);
  const mins = Math.floor((s % 3600) / 60);
  const secs = s % 60;
  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

const SAMPLE_QUERIES = [
  "Action & Fight",
  "Car Chase",
  "Emotional Breakup",
  "Plot Twist & Secret",
  "Farewell",
  "Science & Experiment",
];

export function SemanticSearchModal({
  isOpen,
  onClose,
  onSeek,
  cues,
  chapters = [],
  currentPlaybackSec = 0,
}: SemanticSearchModalProps) {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const searchIndex = useMemo(() => {
    return new SemanticSceneSearchIndex(cues, chapters);
  }, [cues, chapters]);

  const results: SemanticSearchResult[] = useMemo(() => {
    if (!query.trim()) return [];
    return searchIndex.search(query, 16);
  }, [searchIndex, query]);

  useEffect(() => {
    if (isOpen) {
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  if (!isOpen) return null;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (results.length > 0 ? (prev + 1) % results.length : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (results.length > 0 ? (prev - 1 + results.length) % results.length : 0));
    } else if (e.key === "Enter" && results[selectedIndex]) {
      e.preventDefault();
      onSeek(results[selectedIndex].timestampSec);
      onClose();
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Semantic Scene Search"
      className="fixed inset-0 z-50 flex items-start justify-center pt-20 bg-black/75 backdrop-blur-md px-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl rounded-2xl bg-zinc-900 border border-zinc-700/60 shadow-2xl overflow-hidden flex flex-col max-h-[75vh]"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Search Header */}
        <div className="p-4 border-b border-zinc-800 flex items-center gap-3">
          <svg className="w-5 h-5 text-indigo-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search dialogue, emotions, scene concepts (e.g. 'car chase', 'apology')..."
            className="w-full bg-transparent text-white placeholder-zinc-500 focus:outline-none text-base sm:text-lg"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="text-zinc-400 hover:text-white px-2 py-1 rounded text-xs bg-zinc-800"
            >
              Clear
            </button>
          )}
          <kbd className="hidden sm:inline-block text-[11px] font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700">
            ESC
          </kbd>
        </div>

        {/* Suggestion Chips */}
        {!query && (
          <div className="p-4 flex flex-wrap gap-2 border-b border-zinc-800/60 bg-zinc-900/50">
            <span className="text-xs text-zinc-500 py-1">Quick Concepts:</span>
            {SAMPLE_QUERIES.map((sample) => (
              <button
                key={sample}
                onClick={() => setQuery(sample)}
                className="text-xs px-2.5 py-1 rounded-full bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 hover:text-white transition-colors"
              >
                {sample}
              </button>
            ))}
          </div>
        )}

        {/* Results List */}
        <div className="overflow-y-auto flex-1 p-2 space-y-1 divide-y divide-zinc-800/40">
          {query.trim() && results.length === 0 && (
            <div className="text-center py-12 text-zinc-500 text-sm">
              No matching scenes or dialogue found for &ldquo;{query}&rdquo;
            </div>
          )}

          {!query.trim() && cues.length === 0 && (
            <div className="text-center py-12 text-zinc-500 text-sm">
              No transcript or subtitle cues loaded for this title.
            </div>
          )}

          {!query.trim() && cues.length > 0 && (
            <div className="text-center py-8 text-zinc-400 text-sm">
              Type keywords or concept descriptors to jump to moments across {cues.length} dialogue cues.
            </div>
          )}

          {results.map((res, idx) => {
            const isSelected = idx === selectedIndex;
            const isNearCurrent = Math.abs(res.timestampSec - currentPlaybackSec) < 15;

            return (
              <button
                key={res.id}
                onClick={() => {
                  onSeek(res.timestampSec);
                  onClose();
                }}
                className={`w-full text-left p-3 rounded-xl transition-all flex items-start justify-between gap-3 ${
                  isSelected
                    ? "bg-indigo-600/20 border border-indigo-500/40 text-white"
                    : "hover:bg-zinc-800/60 text-zinc-200"
                }`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="font-mono text-xs px-2 py-0.5 rounded bg-zinc-800 text-indigo-300 font-semibold border border-zinc-700/50">
                      {formatTime(res.timestampSec)}
                    </span>
                    {res.chapterTitle && (
                      <span className="text-[11px] text-zinc-400 bg-zinc-800/50 px-2 py-0.5 rounded truncate max-w-[200px]">
                        {res.chapterTitle}
                      </span>
                    )}
                    {res.badge === "exact" && (
                      <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded font-medium">
                        Exact Match
                      </span>
                    )}
                    {res.badge === "concept" && (
                      <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-1.5 py-0.5 rounded font-medium">
                        Concept Match
                      </span>
                    )}
                    {isNearCurrent && (
                      <span className="text-[10px] bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded font-medium">
                        Current Scene
                      </span>
                    )}
                  </div>
                  <p className="text-xs sm:text-sm text-zinc-300 line-clamp-2">
                    &ldquo;{res.surroundingDialogue}&rdquo;
                  </p>
                </div>

                <div className="text-right shrink-0">
                  <span className="text-[11px] text-zinc-500 block">
                    {res.score}% match
                  </span>
                  <span className="text-xs text-indigo-400 group-hover:underline">
                    Jump &rarr;
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
