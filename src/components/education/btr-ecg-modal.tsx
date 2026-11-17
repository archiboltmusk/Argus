import { X, Activity } from "lucide-react";
import { BTRECGViewer } from "./btr-ecg-viewer";

export interface BTRECGModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function BTRECGModal({ isOpen, onClose }: BTRECGModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[250] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col rounded-3xl border border-edge bg-surface shadow-2xl overflow-hidden text-ink">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-edge bg-elevated/70">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center">
              <Activity size={18} className="animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-black text-ink">
                  Real-Time Clinical ECG & Rhythm Strip Simulator
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono border border-emerald-500/30">
                  Local-First Engine
                </span>
              </div>
              <span className="text-[11px] text-ink-muted">
                Mathematical cardiac wave synthesis • Caliper interval measurement • NEET-PG High-Yield Pathology
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl bg-elevated border border-edge text-ink-muted hover:text-ink transition"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-5">
          <BTRECGViewer
            allowPresetChange={true}
            title="Interactive Diagnostic Telemetry Monitor (Lead II)"
          />
        </div>
      </div>
    </div>
  );
}
