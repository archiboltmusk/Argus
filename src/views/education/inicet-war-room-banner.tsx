import { useState } from "react";
import { Zap, Flame, AlertTriangle, Check, Copy, X } from "lucide-react";
import { INICET_RAPID_TABLES } from "@/lib/education/inicet-vault";

export function InicetWarRoomBanner() {
  const [activeTableId, setActiveTableId] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const selectedTable = INICET_RAPID_TABLES.find((t) => t.id === activeTableId);

  const handleCopy = (text: string, key: string) => {
    void navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1800);
  };

  return (
    <div className="relative overflow-hidden rounded-2xl border border-edge-soft bg-surface/60 p-6 shadow-sm backdrop-blur-md">
      <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-accent/10 blur-3xl pointer-events-none" />
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent/15 text-accent border border-accent/25 shrink-0">
            <Zap size={22} className="fill-accent/30 text-accent" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h3 className="text-[16px] font-bold text-ink leading-tight">
                INICET Rapid Review & High-Yield Vault
              </h3>
              <span className="rounded-full bg-accent-soft px-2.5 py-0.5 text-[10.5px] font-bold text-accent flex items-center gap-1 border border-accent/20">
                <Flame size={12} className="fill-accent text-accent" /> High-Yield
              </span>
            </div>
            <p className="text-[12.5px] text-ink-muted mt-0.5 leading-relaxed">
              The 100 most volatile repeat tables, chromosomal translocations, eponymous histology bodies, and trap inoculations.
            </p>
          </div>
        </div>

        {activeTableId && (
          <button
            type="button"
            onClick={() => setActiveTableId(null)}
            className="flex items-center gap-1.5 text-xs font-semibold text-ink-muted hover:text-ink px-3 py-1.5 rounded-lg bg-elevated border border-edge-soft hover:bg-raised transition shrink-0"
          >
            <X size={13} />
            <span>Close Vault</span>
          </button>
        )}
      </div>

      {/* Quick Access Pills */}
      <div className="flex flex-wrap items-center gap-2 pt-4">
        {INICET_RAPID_TABLES.map((table) => {
          const isSelected = activeTableId === table.id;
          return (
            <button
              key={table.id}
              type="button"
              onClick={() => setActiveTableId(isSelected ? null : table.id)}
              className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
                isSelected
                  ? "bg-accent text-white shadow-sm"
                  : "bg-elevated hover:bg-raised border border-edge-soft text-ink hover:border-accent/40"
              }`}
            >
              <span>{table.title}</span>
              <span className="text-[10px] opacity-70 font-mono">({table.category})</span>
            </button>
          );
        })}
      </div>

      {/* Expanded Table Inline Glass Panel */}
      {selectedTable && (
        <div className="mt-4 rounded-xl bg-elevated/80 border border-edge p-5 flex flex-col gap-3.5 text-ink animate-in fade-in duration-150 backdrop-blur-md">
          <div className="flex items-start justify-between gap-3 border-b border-edge-soft pb-3">
            <div>
              <h4 className="text-sm font-bold text-ink">{selectedTable.title}</h4>
              <p className="text-[11.5px] text-ink-muted">Subject: {selectedTable.category}</p>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-accent bg-accent-soft px-2.5 py-1 rounded-lg font-semibold border border-accent/20 max-w-[420px]">
              <AlertTriangle size={13} className="shrink-0" />
              <span>{selectedTable.trap}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {selectedTable.items.map((item, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between rounded-xl bg-canvas/70 p-3 border border-edge-soft text-xs group hover:border-accent/30 transition"
              >
                <div className="flex flex-col gap-0.5 max-w-[85%]">
                  <span className="font-semibold text-ink">{item.key}</span>
                  <span className="text-ink-muted leading-snug">{item.value}</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopy(`${item.key}: ${item.value}`, `${selectedTable.id}_${idx}`)}
                  className="opacity-60 group-hover:opacity-100 transition p-1.5 text-ink-subtle hover:text-ink hover:bg-raised rounded-lg"
                  title="Copy to clipboard"
                >
                  {copiedKey === `${selectedTable.id}_${idx}` ? (
                    <Check size={13} className="text-emerald-400" />
                  ) : (
                    <Copy size={13} />
                  )}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
