import { useState, useEffect, useRef } from "react";
import {
  Search,
  X,
  Play,
  Clock,
  Sparkles,
  BookOpen,
  ArrowRight,
  Layers,
} from "lucide-react";
import {
  searchTriLinkOmni,
  type TriLinkSearchResult,
} from "@/lib/education/btr-tri-link-search";
import type { ClinicalQuestion } from "@/lib/education/qbank-types";

export interface BTRTriLinkSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartQBankDrill?: (title: string, questions: ClinicalQuestion[]) => void;
  onSelectVideoTimestamp?: (chapterTitle: string, timestampSec: number) => void;
}

export function BTRTriLinkSearchModal({
  isOpen,
  onClose,
  onStartQBankDrill,
  onSelectVideoTimestamp,
}: BTRTriLinkSearchModalProps) {
  const [query, setQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [result, setResult] = useState<TriLinkSearchResult | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!query || query.trim().length < 2) {
      setResult(null);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await searchTriLinkOmni(query);
        setResult(res);
      } finally {
        setIsSearching(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [query]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl max-h-[85vh] flex flex-col rounded-3xl border border-edge bg-surface shadow-2xl overflow-hidden text-ink">
        {/* Search Header */}
        <div className="p-4 border-b border-edge bg-elevated/70 flex items-center gap-3">
          <Search size={18} className="text-accent shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search QBank, Dr. Zainab's video timestamps, FIGO guidelines, formulas..."
            className="flex-1 bg-transparent border-none text-sm text-ink placeholder:text-ink-muted focus:outline-none"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="p-1 rounded-lg text-ink-muted hover:text-ink"
            >
              <X size={15} />
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl bg-elevated border border-edge text-ink-muted hover:text-ink"
          >
            <X size={16} />
          </button>
        </div>

        {/* Results Body */}
        <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-6">
          {isSearching && (
            <div className="py-12 text-center text-xs text-ink-muted font-mono animate-pulse">
              Scanning 5,602 QBank items, 61 video chapters, and guidelines...
            </div>
          )}

          {!isSearching && !result && query.length < 2 && (
            <div className="py-12 flex flex-col items-center justify-center gap-3 text-center text-ink-muted">
              <Layers size={32} className="text-ink-subtle" />
              <div className="text-xs">
                Type keywords like <span className="text-accent font-semibold">FIGO 2023</span>,{" "}
                <span className="text-accent font-semibold">Erb&apos;s palsy</span>, or{" "}
                <span className="text-accent font-semibold">Atropine</span>
              </div>
              <span className="text-[11px] text-ink-subtle">
                Instant zero-latency tri-link indexing across QBank, lecture timestamps, and volatile pearls.
              </span>
            </div>
          )}

          {!isSearching && result && result.totalMatches === 0 && (
            <div className="py-12 text-center text-xs text-ink-muted">
              No matching medical concepts found for &ldquo;{query}&rdquo;.
            </div>
          )}

          {result && result.totalMatches > 0 && (
            <>
              {/* Category 1: Dr. Zainab Vora Video Chapter Timestamps */}
              {result.chapters.length > 0 && (
                <div className="flex flex-col gap-2.5">
                  <div className="flex items-center justify-between text-xs font-bold text-accent">
                    <span className="flex items-center gap-1.5">
                      <Clock size={14} />
                      <span>BTR Lecture Video Timestamps ({result.chapters.length})</span>
                    </span>
                  </div>

                  <div className="flex flex-col gap-2">
                    {result.chapters.map((m, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-2xl bg-canvas border border-edge hover:border-accent/40 transition flex items-center justify-between gap-3 shadow-xs"
                      >
                        <div className="flex flex-col gap-0.5">
                          <span className="text-xs font-bold text-ink leading-snug">
                            {m.chapter.title}
                          </span>
                          <span className="text-[11px] text-ink-muted">
                            {m.subjectName} • {m.chapter.timestampLabel}
                          </span>
                          <p className="text-[11px] text-ink-subtle mt-0.5">
                            {m.chapter.mustKnowConcept}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            onClose();
                            onSelectVideoTimestamp?.(m.chapter.title, m.chapter.timestampSec);
                          }}
                          className="px-3 py-1.5 rounded-xl bg-accent text-white font-bold text-xs hover:brightness-110 transition shrink-0 flex items-center gap-1.5"
                        >
                          <Play size={11} fill="currentColor" />
                          <span>Jump ({m.chapter.timestampLabel})</span>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Category 2: Top-100 Frontier Vault Pearls */}
              {result.frontierPearls.length > 0 && (
                <div className="flex flex-col gap-2.5">
                  <div className="flex items-center justify-between text-xs font-bold text-amber-400">
                    <span className="flex items-center gap-1.5">
                      <Sparkles size={14} />
                      <span>Frontier Vault & Guidelines ({result.frontierPearls.length})</span>
                    </span>
                  </div>

                  <div className="flex flex-col gap-2">
                    {result.frontierPearls.map((f) => (
                      <div
                        key={f.id}
                        className="p-3 rounded-2xl bg-canvas border border-amber-500/30 flex flex-col gap-1.5 shadow-xs"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-ink">{f.title}</span>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/15 text-amber-300">
                            {f.category}
                          </span>
                        </div>
                        <p className="text-xs text-amber-300 font-semibold">{f.mustKnowPill}</p>
                        <p className="text-[11px] text-ink-muted leading-relaxed">
                          {f.clinicalContext}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Category 3: QBank Questions */}
              {result.questions.length > 0 && (
                <div className="flex flex-col gap-2.5">
                  <div className="flex items-center justify-between text-xs font-bold text-purple-400">
                    <span className="flex items-center gap-1.5">
                      <BookOpen size={14} />
                      <span>QBank Clinical Questions ({result.questions.length})</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onStartQBankDrill?.(`Search: ${query}`, result.questions);
                      }}
                      className="text-[11px] text-accent hover:underline flex items-center gap-1 font-semibold"
                    >
                      <span>Drill all ({result.questions.length})</span>
                      <ArrowRight size={12} />
                    </button>
                  </div>

                  <div className="flex flex-col gap-2">
                    {result.questions.map((q) => (
                      <div
                        key={q.id}
                        className="p-3 rounded-2xl bg-canvas border border-edge hover:border-purple-500/40 transition flex items-center justify-between gap-3 shadow-xs"
                      >
                        <div className="flex flex-col gap-0.5">
                          <span className="text-xs font-bold text-ink truncate max-w-lg">
                            {q.subject}: {q.topic}
                          </span>
                          <p className="text-[11px] text-ink-muted line-clamp-2">
                            {q.vignette}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            onClose();
                            onStartQBankDrill?.(`Question: ${q.topic}`, [q]);
                          }}
                          className="px-3 py-1.5 rounded-xl bg-purple-600 text-white font-bold text-xs hover:bg-purple-500 transition shrink-0 flex items-center gap-1"
                        >
                          <span>Practice</span>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
