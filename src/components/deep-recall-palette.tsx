import { useState, useEffect, useRef } from "react";
import { Search, Zap, FileText, ArrowRight, Sparkles, X } from "lucide-react";
import { deepRecallSearch, type DeepRecallResult } from "@/lib/education/deep-recall";

export function DeepRecallPalette({
  open,
  onClose,
  onSelectResult,
}: {
  open: boolean;
  onClose: () => void;
  onSelectResult: (res: DeepRecallResult) => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<DeepRecallResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setQuery("");
      setResults([]);
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    const found = deepRecallSearch(query, 12);
    setResults(found);
    setSelectedIndex(0);
  }, [query]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      onClose();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1 < results.length ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : Math.max(0, results.length - 1)));
    } else if (e.key === "Enter" && results[selectedIndex]) {
      e.preventDefault();
      onSelectResult(results[selectedIndex]);
      onClose();
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-start justify-center pt-24 bg-black/75 backdrop-blur-md animate-in fade-in duration-150 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl rounded-2xl border border-edge bg-surface shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Search Input Bar */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-edge/60 bg-canvas/40">
          <Sparkles size={18} className="text-accent shrink-0 animate-pulse" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Deep Recall: Search symptoms, drugs, rules of 10, translocations, questions…"
            className="flex-1 bg-transparent text-sm text-ink placeholder:text-ink-subtle outline-none"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="text-ink-subtle hover:text-ink p-1 rounded-md transition"
            >
              <X size={14} />
            </button>
          )}
          <kbd className="rounded bg-raised px-2 py-0.5 text-[10px] font-mono text-ink-muted border border-edge">
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div className="max-h-[420px] overflow-y-auto p-2 flex flex-col gap-1">
          {results.length === 0 ? (
            <div className="py-12 text-center text-ink-subtle flex flex-col items-center gap-2">
              <Search size={28} strokeWidth={1.5} />
              <p className="text-xs">
                {query.trim()
                  ? "No matching clinical vignettes or study notes found."
                  : "Type any medical concept, question stem, or study topic to instantly recall."}
              </p>
            </div>
          ) : (
            results.map((res, idx) => {
              const isSelected = idx === selectedIndex;
              return (
                <div
                  key={res.id}
                  onClick={() => {
                    onSelectResult(res);
                    onClose();
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`flex items-start justify-between gap-3 p-3 rounded-xl cursor-pointer transition ${
                    isSelected ? "bg-accent/15 border border-accent/30 text-ink" : "hover:bg-raised/60 text-ink-muted"
                  }`}
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div
                      className={`flex h-8 w-8 items-center justify-center rounded-lg shrink-0 mt-0.5 ${
                        res.category === "qbank"
                          ? "bg-amber-500/15 text-amber-500"
                          : "bg-sky-500/15 text-sky-400"
                      }`}
                    >
                      {res.category === "qbank" ? <Zap size={15} /> : <FileText size={15} />}
                    </div>
                    <div className="min-w-0 flex flex-col">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-ink truncate">{res.title}</span>
                        <span className="rounded bg-raised px-1.5 py-0.2 text-[9.5px] font-mono uppercase text-ink-subtle">
                          {res.category}
                        </span>
                      </div>
                      <p className="text-[11.5px] text-ink-muted line-clamp-1 mt-0.5">{res.snippet}</p>
                    </div>
                  </div>
                  <ArrowRight size={14} className={`shrink-0 mt-2 ${isSelected ? "text-accent" : "opacity-0"}`} />
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
