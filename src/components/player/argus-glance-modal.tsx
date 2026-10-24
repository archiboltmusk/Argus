import { useState } from "react";
import { X, Search, Sparkles, BookOpen, Check, Copy } from "lucide-react";
import { searchKnowledgeBaseForTerm, type GlanceSearchResult } from "@/lib/player/argus-glance";

export function ArgusGlanceModal({
  frameDataUrl,
  onClose,
}: {
  frameDataUrl: string;
  onClose: () => void;
}) {
  const [term, setTerm] = useState("");
  const [result, setResult] = useState<GlanceSearchResult | null>(null);
  const [copied, setCopied] = useState(false);

  const handleLookup = () => {
    if (!term.trim()) return;
    const res = searchKnowledgeBaseForTerm(term.trim());
    setResult(res);
  };

  const handleCopyDefinition = () => {
    if (!result?.medicalTermDefinition) return;
    void navigator.clipboard.writeText(result.medicalTermDefinition);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className="fixed inset-0 z-[150] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl rounded-2xl border border-edge bg-surface shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-edge/60 px-6 py-4 bg-canvas/40">
          <div className="flex items-center gap-2.5">
            <Sparkles size={18} className="text-accent" />
            <h2 className="text-base font-bold text-ink">Argus Glance — In-Player Clinical Lookup</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-ink-subtle hover:bg-raised hover:text-ink transition"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-5">
          {/* Frozen Video Frame Preview */}
          <div className="relative aspect-video w-full rounded-xl overflow-hidden border border-edge bg-black">
            <img src={frameDataUrl} alt="Freeze Frame" className="h-full w-full object-contain" />
            <span className="absolute bottom-2 end-2 rounded bg-black/75 px-2 py-0.5 text-[10px] font-mono text-white/80">
              Frame Captured
            </span>
          </div>

          {/* Quick Concept / OCR Input */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search size={14} className="absolute start-3 top-3 text-ink-subtle" />
              <input
                type="text"
                value={term}
                onChange={(e) => setTerm(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleLookup()}
                placeholder="Enter or paste clinical term on screen (e.g. tamponade, pheochromocytoma, kawasaki)…"
                className="w-full rounded-xl border border-edge bg-canvas ps-9 pe-3 py-2 text-xs text-ink placeholder:text-ink-subtle outline-none focus:border-accent"
              />
            </div>
            <button
              type="button"
              onClick={handleLookup}
              className="rounded-xl bg-accent px-4 py-2 text-xs font-semibold text-white shadow hover:opacity-95 transition"
            >
              Analyze Term
            </button>
          </div>

          {/* Analysis & Lexicon Match Result */}
          {result && (
            <div className="flex flex-col gap-3 rounded-xl border border-edge bg-canvas/60 p-4 animate-in fade-in duration-200">
              {result.medicalTermDefinition ? (
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-amber-500 uppercase tracking-wider flex items-center gap-1.5">
                      <BookOpen size={13} />
                      High-Yield Fact Pearl
                    </span>
                    <button
                      type="button"
                      onClick={handleCopyDefinition}
                      className="text-[11px] text-ink-subtle hover:text-ink flex items-center gap-1 transition"
                    >
                      {copied ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                      <span>{copied ? "Copied" : "Copy"}</span>
                    </button>
                  </div>
                  <p className="text-xs text-ink leading-relaxed font-medium">
                    {result.medicalTermDefinition}
                  </p>
                </div>
              ) : (
                <p className="text-xs text-ink-muted">
                  No direct dictionary match. Showing related questions and notes from your library:
                </p>
              )}

              {result.relatedQuestions.length > 0 && (
                <div className="flex flex-col gap-1.5 pt-2 border-t border-edge/40">
                  <span className="text-[11px] font-semibold text-ink-muted">
                    Found {result.relatedQuestions.length} Related QBank Drill Questions:
                  </span>
                  {result.relatedQuestions.map((q) => (
                    <div key={q.id} className="p-2.5 rounded-lg bg-surface border border-edge/60 text-xs text-ink">
                      <span className="font-semibold text-accent block mb-0.5">[{q.subject}] {q.topic}</span>
                      <p className="line-clamp-2 text-ink-muted">{q.vignette}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
