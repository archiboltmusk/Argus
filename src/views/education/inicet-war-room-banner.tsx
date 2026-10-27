import { useState } from "react";
import { Zap, Flame, AlertTriangle, Check, Copy } from "lucide-react";
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
    <div className="relative overflow-hidden rounded-2xl border border-edge-soft bg-surface/40 p-6 shadow-sm backdrop-blur-md">
      <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/15 text-amber-400 border border-amber-500/30">
            <Zap size={20} className="fill-amber-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-[15px] font-semibold text-ink leading-tight">
                INICET Nov 1 War Room (7-Day Sprint)
              </h3>
              <span className="rounded-full bg-rose-500/15 px-2 py-0.5 text-[10px] font-semibold text-rose-400 flex items-center gap-1 border border-rose-500/25">
                <Flame size={11} className="fill-rose-400" /> High-Yield Vault
              </span>
            </div>
            <p className="text-[12px] text-ink-muted mt-0.5">
              Zero fluff. The 100 most volatile repeat tables, translocations, eponymous bodies, and examiner trap inoculations.
            </p>
          </div>
        </div>

        {activeTableId && (
          <button
            type="button"
            onClick={() => setActiveTableId(null)}
            className="text-xs font-medium text-ink-subtle hover:text-ink px-3 py-1.5 rounded-lg bg-surface border border-edge hover:bg-raised transition"
          >
            Close Table
          </button>
        )}
      </div>

      {/* Quick Access Badges */}
      <div className="flex flex-wrap items-center gap-2 pt-1">
        {INICET_RAPID_TABLES.map((table) => {
          const isSelected = activeTableId === table.id;
          return (
            <button
              key={table.id}
              type="button"
              onClick={() => setActiveTableId(isSelected ? null : table.id)}
              className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium transition ${
                isSelected
                  ? "bg-amber-500 text-black shadow-sm font-semibold"
                  : "bg-surface/80 hover:bg-surface border border-edge text-ink hover:border-amber-500/40"
              }`}
            >
              <span>{table.title}</span>
              <span className="text-[10px] opacity-75 font-mono">({table.category})</span>
            </button>
          );
        })}
      </div>

      {/* Expanded Table Modal / Inline View */}
      {selectedTable && (
        <div className="mt-2 rounded-xl bg-surface/90 border border-amber-500/40 p-4 flex flex-col gap-3 text-ink animate-in fade-in duration-150">
          <div className="flex items-start justify-between gap-3 border-b border-edge/60 pb-2">
            <div>
              <h4 className="text-sm font-bold text-ink">{selectedTable.title}</h4>
              <p className="text-[11px] text-ink-muted">Subject: {selectedTable.category}</p>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-amber-500 bg-amber-500/10 px-2 py-1 rounded-lg font-medium max-w-[420px]">
              <AlertTriangle size={13} className="shrink-0" />
              <span>{selectedTable.trap}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {selectedTable.items.map((item, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between rounded-lg bg-canvas/60 p-2.5 border border-edge text-xs group hover:border-amber-500/30 transition"
              >
                <div className="flex flex-col gap-0.5 max-w-[85%]">
                  <span className="font-semibold text-ink">{item.key}</span>
                  <span className="text-ink-muted leading-tight">{item.value}</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopy(`${item.key}: ${item.value}`, `${selectedTable.id}_${idx}`)}
                  className="opacity-0 group-hover:opacity-100 transition p-1 text-ink-subtle hover:text-ink"
                  title="Copy to clipboard"
                >
                  {copiedKey === `${selectedTable.id}_${idx}` ? (
                    <Check size={13} className="text-emerald-500" />
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
