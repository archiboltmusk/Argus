import { useState, useMemo } from "react";
import {
  X,
  Zap,
  Clock,
  Play,
  Calendar,
  Layers,
} from "lucide-react";
import {
  MEGA_BTR_MARATHON_CATALOG,
  calculateMarathonPacing,
  type BTRMarathonModule,
} from "@/lib/education/btr-marathon-engine";

interface BTRMarathonModalProps {
  open: boolean;
  onClose: () => void;
  onPlayModule?: (module: BTRMarathonModule) => void;
}

export function BTRMarathonModal({ open, onClose, onPlayModule }: BTRMarathonModalProps) {
  const [selectedSpeed, setSelectedSpeed] = useState<1.0 | 1.5 | 1.75 | 2.0>(1.75);
  const pacing = useMemo(() => calculateMarathonPacing(MEGA_BTR_MARATHON_CATALOG), []);

  if (!open) return null;

  const currentHours =
    selectedSpeed === 1.0
      ? pacing.hoursAt1_0x
      : selectedSpeed === 1.5
      ? pacing.hoursAt1_5x
      : selectedSpeed === 1.75
      ? pacing.hoursAt1_75x
      : pacing.hoursAt2_0x;

  const dailyHours = Number((currentHours / 3).toFixed(1));

  return (
    <div className="fixed inset-0 z-[250] flex items-center justify-center bg-black/80 backdrop-blur-md p-2 sm:p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-4xl h-[90vh] max-h-[820px] rounded-3xl bg-surface border border-edge flex flex-col shadow-2xl overflow-hidden text-ink">
        {/* Header */}
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-edge px-5 sm:px-6 bg-surface/90">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <Zap size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold text-ink">Mega BTR 72-Hour Rapid Revision Command</h2>
              <p className="text-xs text-ink-muted">
                Paced 19-Subject Final Sweep • 6 Mega Marathons Before INI-CET & NEET-PG
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

        {/* Pacing Speed HUD */}
        <div className="shrink-0 bg-gradient-to-r from-accent/15 via-surface to-transparent border-b border-edge-soft p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex flex-col gap-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-accent">
              Playback Speed Pacing:
            </span>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-black text-ink">{currentHours} hrs total</span>
              <span className="text-xs text-ink-muted font-mono">({dailyHours} hrs / day over 3 days)</span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 rounded-2xl bg-elevated border border-edge p-1">
            {[1.0, 1.5, 1.75, 2.0].map((spd) => (
              <button
                key={spd}
                type="button"
                onClick={() => setSelectedSpeed(spd as typeof selectedSpeed)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                  selectedSpeed === spd
                    ? "bg-accent text-white shadow-xs"
                    : "text-ink-muted hover:text-ink"
                }`}
              >
                {spd}x {spd === 1.75 ? "★" : ""}
              </button>
            ))}
          </div>
        </div>

        {/* 3-Day Marathon Blueprint */}
        <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-4 bg-canvas">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="rounded-2xl bg-surface border border-edge p-4 flex flex-col gap-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400">
                <Calendar size={13} /> Day 1 (72h to go)
              </div>
              <h4 className="text-xs font-bold text-ink">Pre-Clinicals & Shorts</h4>
              <p className="text-[11px] text-ink-muted">
                Mega BTR 1 (Shorts) + Anatomy, Physio, Biochem. Focus on formulas, nerve attitudes, and dermatology lesions.
              </p>
            </div>

            <div className="rounded-2xl bg-surface border border-edge p-4 flex flex-col gap-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-blue-400">
                <Calendar size={13} /> Day 2 (48h to go)
              </div>
              <h4 className="text-xs font-bold text-ink">Para-Clinicals & Intermediates</h4>
              <p className="text-[11px] text-ink-muted">
                Mega BTR 2 + Pathology, Pharma, Micro, FMT, PSM. Focus on BMW rules, antidotes, and biostatistics.
              </p>
            </div>

            <div className="rounded-2xl bg-surface border border-edge p-4 flex flex-col gap-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-purple-400">
                <Calendar size={13} /> Day 3 (24h to go)
              </div>
              <h4 className="text-xs font-bold text-ink">Long Clinicals & Systems</h4>
              <p className="text-[11px] text-ink-muted">
                Mega BTR 3 & 4 (Integrated + Long Clinical). Medicine, Surgery, OBGYN, Peds. High-yield emergency algorithms.
              </p>
            </div>
          </div>

          {/* Module List from Local Folder */}
          <div className="flex flex-col gap-3">
            <span className="text-xs font-bold text-ink-muted uppercase tracking-wider">
              Mega BTR Modules in Your Local Library (6):
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {MEGA_BTR_MARATHON_CATALOG.map((mod) => {
                const adjMins = Math.round(mod.estimatedMinutes / selectedSpeed);
                const hrs = Math.floor(adjMins / 60);
                const remM = adjMins % 60;
                return (
                  <div
                    key={mod.id}
                    className="rounded-2xl bg-surface border border-edge p-4 flex flex-col justify-between gap-3 shadow-xs hover:border-accent/40 transition"
                  >
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-mono text-ink-muted truncate">
                          {mod.targetFileName}
                        </span>
                        <span className="text-[10.5px] font-mono font-bold text-accent shrink-0 flex items-center gap-1">
                          <Clock size={11} /> {hrs}h {remM}m
                        </span>
                      </div>

                      <h4 className="text-sm font-bold text-ink">{mod.title}</h4>

                      <div className="flex flex-wrap gap-1">
                        {mod.subjectsCovered.map((s) => (
                          <span
                            key={s}
                            className="text-[10px] px-2 py-0.5 rounded-md bg-elevated text-ink-muted border border-edge-soft"
                          >
                            {s}
                          </span>
                        ))}
                      </div>

                      <div className="text-[11px] text-ink-muted leading-relaxed">
                        <strong>Key Foci:</strong> {mod.highYieldFoci.join(" • ")}
                      </div>
                    </div>

                    <div className="pt-2 border-t border-edge-soft flex items-center justify-between">
                      <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
                        <Layers size={11} /> Ready to Play
                      </span>

                      {onPlayModule && (
                        <button
                          type="button"
                          onClick={() => onPlayModule(mod)}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-accent text-white text-xs font-bold hover:brightness-110 shadow-xs transition"
                        >
                          <Play size={11} fill="currentColor" />
                          <span>Play Marathon</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
