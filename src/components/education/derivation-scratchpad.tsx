import { useState } from "react";
import {
  Camera,
  X,
  BookOpen,
  Copy,
  Check,
  Clock,
  Sparkles,
  Download,
} from "lucide-react";

export interface ScratchpadItem {
  id: string;
  timestampSec: number;
  title: string;
  latex?: string;
  notes: string;
  createdAt: number;
}

export type DerivationStep = ScratchpadItem;

export function KaTeXRenderer({ latex }: { latex: string }) {
  return (
    <div className="font-mono text-emerald-300 overflow-x-auto select-all">
      $${latex}$$
    </div>
  );
}

const TEMPLATE_DERIVATIONS = [
  {
    title: "MIT 18.06 Column Picture",
    latex: "A x = x_1 \\mathbf{a}_1 + x_2 \\mathbf{a}_2 + \\dots + x_n \\mathbf{a}_n = \\mathbf{b}",
    notes: "Matrix multiplication is a linear combination of the column vectors.",
  },
  {
    title: "Stanford CS224W Graph Convolution",
    latex: "\\mathbf{h}_v^{(k)} = \\sigma \\left( \\mathbf{W}^{(k)} \\sum_{u \\in \\mathcal{N}(v)} \\frac{\\mathbf{h}_u^{(k-1)}}{|\\mathcal{N}(v)|} + \\mathbf{B}^{(k)} \\mathbf{h}_v^{(k-1)} \\right)",
    notes: "GCN neighborhood aggregation message-passing update rule.",
  },
  {
    title: "Stanford CS229 Gradient Descent",
    latex: "\\theta_j := \\theta_j - \\alpha \\frac{\\partial}{\\partial \\theta_j} J(\\theta)",
    notes: "Parameter update rule along negative gradient of cost function.",
  },
  {
    title: "Feynman Quantum Interference",
    latex: "P_{12} = |\\phi_1 + \\phi_2|^2 = P_1 + P_2 + 2 \\sqrt{P_1 P_2} \\cos(\\delta)",
    notes: "Total probability is square of the sum of complex probability amplitudes.",
  },
  {
    title: "MIT 6.006 Master Theorem",
    latex: "T(n) = a T\\left(\\frac{n}{b}\\right) + \\Theta(n^d) \\implies T(n) = \\Theta(n^{\\log_b a}) \\quad \\text{if } a > b^d",
    notes: "Divide-and-conquer recurrence relations solution.",
  },
];

export interface DerivationScratchpadProps {
  open: boolean;
  onClose: () => void;
  currentPositionSec: number;
  onSeek: (seconds: number) => void;
  lectureTitle?: string;
}

export function DerivationScratchpad({
  open,
  onClose,
  currentPositionSec,
  onSeek,
  lectureTitle,
}: DerivationScratchpadProps) {
  const [items, setItems] = useState<ScratchpadItem[]>([]);
  const [newTitle, setNewTitle] = useState("");
  const [newLatex, setNewLatex] = useState("");
  const [newNotes, setNewNotes] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  if (!open) return null;

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const handleCaptureFrame = () => {
    const snap: ScratchpadItem = {
      id: `snap-${Date.now()}`,
      timestampSec: currentPositionSec,
      title: newTitle.trim() || `Blackboard Snapshot at ${formatTime(currentPositionSec)}`,
      latex: newLatex.trim() || undefined,
      notes: newNotes.trim() || "Captured key blackboard frame derivation.",
      createdAt: Date.now(),
    };
    setItems((prev) => [snap, ...prev]);
    setNewTitle("");
    setNewLatex("");
    setNewNotes("");
  };

  const handleInsertTemplate = (tpl: (typeof TEMPLATE_DERIVATIONS)[0]) => {
    setNewTitle(tpl.title);
    setNewLatex(tpl.latex);
    setNewNotes(tpl.notes);
  };

  const handleCopyMarkdown = (item: ScratchpadItem) => {
    const md = `### ${item.title} (${formatTime(item.timestampSec)})\n${item.latex ? `$$\n${item.latex}\n$$\n` : ""}${item.notes}`;
    navigator.clipboard.writeText(md);
    setCopiedId(item.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleExportAll = () => {
    const content = `# Derivations & Notes: ${lectureTitle ?? "Lecture"}
Exported from Argus Academic Engine

${items
  .map(
    (item) => `## [${formatTime(item.timestampSec)}] ${item.title}
${item.latex ? `$$\n${item.latex}\n$$\n` : ""}
${item.notes}
`
  )
  .join("\n---\n\n")}
`;
    const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `lecture-notes-${Date.now()}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <aside
      role="dialog"
      aria-label="LaTeX Derivation Scratchpad"
      className="pointer-events-auto fixed top-16 right-6 bottom-24 w-[460px] max-w-[calc(100vw-3rem)] z-50 flex flex-col rounded-2xl bg-[#0b0c14]/95 backdrop-blur-2xl border border-white/15 shadow-[0_16px_50px_rgba(0,0,0,0.85)] text-white overflow-hidden animate-[argus-fade-in_200ms_ease-out]"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3.5 border-b border-white/10 bg-white/[0.02]">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            <BookOpen size={16} />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white tracking-wide">
              Derivation Scratchpad
            </h3>
            <p className="text-[11px] text-zinc-400 truncate max-w-[260px]">
              {lectureTitle ?? "Blackboard Snapshots & Proofs"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {items.length > 0 && (
            <button
              type="button"
              onClick={handleExportAll}
              title="Export all notes to Markdown"
              className="flex h-7 px-2 items-center gap-1 rounded-lg text-xs font-medium text-zinc-300 hover:text-white bg-white/5 hover:bg-white/10 transition-colors"
            >
              <Download size={13} />
              <span>Export</span>
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Close scratchpad"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Editor & Capture Section */}
      <div className="p-3.5 border-b border-white/10 bg-zinc-950/40 space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-400">
            <Clock size={12} />
            Timestamp: {formatTime(currentPositionSec)}
          </span>
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-zinc-500">Templates:</span>
            <select
              className="text-[11px] bg-white/5 border border-white/10 rounded px-1.5 py-0.5 text-zinc-300 focus:outline-none focus:border-emerald-500/50"
              onChange={(e) => {
                const tpl = TEMPLATE_DERIVATIONS.find((t) => t.title === e.target.value);
                if (tpl) handleInsertTemplate(tpl);
              }}
              defaultValue=""
            >
              <option value="" disabled>Insert Proof Formula...</option>
              {TEMPLATE_DERIVATIONS.map((t) => (
                <option key={t.title} value={t.title} className="bg-zinc-900 text-white">
                  {t.title}
                </option>
              ))}
            </select>
          </div>
        </div>

        <input
          type="text"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          placeholder="Concept / Theorem Title..."
          className="w-full px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500/50"
        />

        <textarea
          value={newLatex}
          onChange={(e) => setNewLatex(e.target.value)}
          placeholder="LaTeX Formula (e.g. A x = \sum x_i a_i = b)..."
          rows={2}
          className="w-full px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs font-mono text-amber-300 placeholder-zinc-500 focus:outline-none focus:border-emerald-500/50 resize-none"
        />

        <input
          type="text"
          value={newNotes}
          onChange={(e) => setNewNotes(e.target.value)}
          placeholder="Derivation notes or intuition..."
          className="w-full px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500/50"
        />

        <div className="flex items-center justify-between pt-1">
          <span className="text-[10px] text-zinc-500 flex items-center gap-1">
            <Sparkles size={11} className="text-amber-400" />
            Markdown and LaTeX supported
          </span>
          <button
            type="button"
            onClick={handleCaptureFrame}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 transition-colors shadow-sm"
          >
            <Camera size={13} />
            Capture Snapshot
          </button>
        </div>
      </div>

      {/* Snapshot List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5 scrollbar-thin scrollbar-thumb-white/10">
        {items.length === 0 ? (
          <div className="text-center py-12 text-zinc-500 text-xs">
            No derivations captured yet. Use the form above to pin formulas or blackboard timestamps.
          </div>
        ) : (
          items.map((item) => (
            <div
              key={item.id}
              className="p-3 rounded-xl bg-white/[0.03] border border-white/10 hover:border-white/20 transition-all duration-150 space-y-2"
            >
              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => onSeek(item.timestampSec)}
                  className="flex items-center gap-1 text-[11px] font-mono font-semibold text-emerald-400 hover:text-emerald-300 transition-colors"
                >
                  <Clock size={11} />
                  {formatTime(item.timestampSec)}
                </button>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleCopyMarkdown(item)}
                    className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"
                  >
                    {copiedId === item.id ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
                    {copiedId === item.id ? "Copied" : "Markdown"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setItems((prev) => prev.filter((p) => p.id !== item.id))}
                    className="p-1 rounded text-zinc-500 hover:text-rose-400 hover:bg-white/5 transition-colors"
                  >
                    <X size={12} />
                  </button>
                </div>
              </div>

              <h4 className="text-xs font-semibold text-zinc-100">{item.title}</h4>

              {item.latex && (
                <div className="p-2 rounded-lg bg-zinc-950/80 border border-white/5 font-mono text-[11px] text-amber-300 overflow-x-auto select-all">
                  $${item.latex}$$
                </div>
              )}

              <p className="text-[11.5px] text-zinc-300 leading-relaxed">{item.notes}</p>
            </div>
          ))
        )}
      </div>
    </aside>
  );
}
