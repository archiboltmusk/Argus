import { useState, useMemo } from "react";
import {
  X,
  Search,
  BookOpen,
  FileText,
} from "lucide-react";
import {
  searchBTRPdfs,
  type BTRPdfSearchResult,
} from "@/lib/education/btr-pdf-search-index";

interface BTRPdfSearchModalProps {
  open: boolean;
  onClose: () => void;
  onJumpToPdfPage?: (fileName: string, pageNumber: number) => void;
}

export function BTRPdfSearchModal({ open, onClose, onJumpToPdfPage }: BTRPdfSearchModalProps) {
  const [query, setQuery] = useState("");
  const results = useMemo(() => searchBTRPdfs(query), [query]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[250] flex items-center justify-center bg-black/80 backdrop-blur-md p-2 sm:p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-4xl h-[88vh] max-h-[800px] rounded-3xl bg-surface border border-edge flex flex-col shadow-2xl overflow-hidden text-ink">
        {/* Header */}
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-edge px-5 sm:px-6 bg-surface/90">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-500/20 text-blue-400 border border-blue-500/30">
              <BookOpen size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold text-ink">Instant Cross-PDF Search Engine</h2>
              <p className="text-xs text-ink-muted">
                Searches across all 32 PDF Workbooks (Vol 1, Vol 2, Vol 3, and Subject Notes)
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-xl bg-elevated hover:bg-raised text-ink-muted hover:text-ink transition border border-edge"
          >
            <X size={16} />
          </button>
        </header>

        {/* Search Bar Input */}
        <div className="p-4 sm:p-5 border-b border-edge-soft bg-canvas shrink-0">
          <div className="relative">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-muted" />
            <input
              type="text"
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search diseases, drugs, staging, or tables (e.g. Brachial Plexus, Antidotes, BMW, Thyroid)..."
              className="w-full pl-11 pr-4 py-3 rounded-2xl bg-surface border border-edge text-sm text-ink placeholder:text-ink-muted focus:outline-none focus:border-accent shadow-xs"
            />
          </div>
        </div>

        {/* Results List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 bg-canvas flex flex-col gap-3">
          <div className="flex items-center justify-between text-xs text-ink-muted px-1">
            <span>Found {results.length} cross-referenced topic matches:</span>
            <span className="font-mono">PDF Direct Jump</span>
          </div>

          {results.length > 0 ? (
            results.map((item: BTRPdfSearchResult) => (
              <div
                key={item.id}
                className="rounded-2xl bg-surface border border-edge p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs hover:border-accent/40 transition"
              >
                <div className="flex flex-col gap-1.5 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-accent px-2 py-0.5 rounded-md bg-accent/15 border border-accent/25">
                      {item.subjectName}
                    </span>
                    <span className="text-[10px] font-medium text-ink-muted px-2 py-0.5 rounded-md bg-elevated border border-edge-soft">
                      {item.volumeLabel}
                    </span>
                    <span className="text-[10.5px] font-mono font-bold text-amber-400">
                      Page {item.pageNumber}
                    </span>
                  </div>

                  <h4 className="text-sm font-bold text-ink">{item.topic}</h4>
                  <p className="text-xs text-ink-muted leading-relaxed line-clamp-2">
                    &quot;{item.highlightSnippet}&quot;
                  </p>
                </div>

                {onJumpToPdfPage ? (
                  <button
                    type="button"
                    onClick={() => onJumpToPdfPage(item.pdfFileName, item.pageNumber)}
                    className="flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl bg-accent text-white hover:brightness-110 shadow-xs shrink-0 transition"
                  >
                    <FileText size={13} />
                    <span>Open Page {item.pageNumber}</span>
                  </button>
                ) : (
                  <div className="text-xs font-mono text-ink-muted flex items-center gap-1 shrink-0">
                    <FileText size={13} />
                    <span>{item.pdfFileName}</span>
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center p-12 text-center text-ink-muted gap-2">
              <Search size={32} className="opacity-40" />
              <p className="text-sm font-semibold">No direct matches found for &quot;{query}&quot;</p>
              <p className="text-xs">Try searching by drug name, syndrome, or subject keyword.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
