import { useState } from "react";
import { ArrowUpRight, Cpu, Monitor, Play, ShieldAlert, Sparkles, X } from "lucide-react";
import { ModalShell } from "@/components/modal-shell";
import { openUrl } from "@/lib/window";
import { getMacSimulatorGuide, type MacGameGuide } from "@/lib/games/mac-simulator-bridge";

export function MacSimulatorGuideModal({
  gameName,
  steamId,
  onClose,
}: {
  gameName: string;
  steamId?: number;
  onClose: () => void;
}) {
  const guide = getMacSimulatorGuide(gameName, steamId);
  const [selectedRunnerIdx, setSelectedRunnerIdx] = useState(0);

  if (!guide) return null;
  const runner = guide.recommendedRunners[selectedRunnerIdx] ?? guide.recommendedRunners[0];

  return (
    <ModalShell width={740} onClose={onClose} labelledBy="mac-sim-title">
      <div className="p-6 flex flex-col gap-5 text-ink bg-canvas/95 rounded-2xl border border-edge">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-edge/60 pb-4">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider bg-accent/20 text-accent border border-accent/30">
                Mac Translation & Simulator Guide
              </span>
              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-white/10 text-ink-muted">
                {guide.ratingLabel}
              </span>
            </div>
            <h2 id="mac-sim-title" className="text-xl font-bold text-ink">
              Testing {guide.gameName} on Mac
            </h2>
            <p className="text-sm text-ink-muted leading-relaxed">
              {guide.summary}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-ink-muted hover:text-ink hover:bg-elevated transition-colors"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Apple Silicon Hardware Matrix */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-surface/60 rounded-xl p-4 border border-edge/40">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-accent/15 text-accent shrink-0">
              <Cpu size={20} />
            </div>
            <div>
              <span className="text-xs uppercase font-bold text-ink-muted tracking-wider block">
                Apple M1 / M2 / M3 Base
              </span>
              <p className="text-sm font-medium text-ink">
                {guide.estimatedFpsAppleSilicon.base}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-accent/15 text-accent shrink-0">
              <Sparkles size={20} />
            </div>
            <div>
              <span className="text-xs uppercase font-bold text-ink-muted tracking-wider block">
                Apple M-Series Pro / Max / Ultra
              </span>
              <p className="text-sm font-medium text-ink">
                {guide.estimatedFpsAppleSilicon.proMax}
              </p>
            </div>
          </div>
          <div className="col-span-full pt-1 text-xs text-ink-subtle flex items-center gap-2">
            <Monitor size={14} />
            <span>Graphics Architecture: {guide.graphicsBackend}</span>
          </div>
        </div>

        {/* Runner Selector */}
        <div className="flex flex-col gap-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
            Choose How to Test Before Buying
          </span>
          <div className="flex flex-wrap gap-2">
            {guide.recommendedRunners.map((r, idx) => (
              <button
                key={r.name}
                onClick={() => setSelectedRunnerIdx(idx)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  selectedRunnerIdx === idx
                    ? "bg-accent text-canvas font-semibold shadow-md"
                    : "bg-surface hover:bg-elevated text-ink-muted hover:text-ink border border-edge/40"
                }`}
              >
                {r.name}
              </button>
            ))}
          </div>

          {/* Active Runner Details */}
          {runner && (
            <div className="p-4 rounded-xl bg-surface/80 border border-edge/60 flex flex-col gap-3">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h4 className="text-base font-semibold text-ink">{runner.name}</h4>
                  <p className="text-sm text-ink-muted">{runner.description}</p>
                </div>
                {runner.downloadUrl && (
                  <button
                    onClick={() => void openUrl(runner.downloadUrl!)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent/20 hover:bg-accent/30 text-accent text-xs font-semibold shrink-0 transition-colors"
                  >
                    <span>Visit Tool</span>
                    <ArrowUpRight size={14} />
                  </button>
                )}
              </div>

              <div className="flex flex-col gap-1.5 pt-2 border-t border-edge/40">
                <span className="text-xs font-bold uppercase tracking-wider text-ink-subtle">
                  Step-by-Step Instructions
                </span>
                <ol className="list-decimal list-inside space-y-1 text-sm text-ink-muted leading-relaxed">
                  {runner.instructions.map((step, sIdx) => (
                    <li key={sIdx} className="ps-1">
                      {step}
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          )}
        </div>

        {/* Testing Advice */}
        <div className="p-3.5 rounded-xl bg-accent/10 border border-accent/20 text-xs text-ink-muted leading-relaxed flex items-start gap-2.5">
          <Play size={16} className="text-accent shrink-0 mt-0.5" />
          <div>
            <strong className="text-ink font-semibold block mb-0.5">Trial & Playability Tip</strong>
            {guide.testingAdvice}
          </div>
        </div>

        {/* Harbor-style Decentralized Indexer Disclaimer */}
        <div className="p-3 rounded-xl bg-elevated/40 border border-edge/30 text-[11px] text-ink-subtle leading-normal flex items-start gap-2">
          <ShieldAlert size={14} className="shrink-0 mt-0.5 text-warning" />
          <span>
            <strong>Decentralized Indexing Transparency:</strong> Argus acts purely as an open metadata catalog and universal indexer. Argus does not ship, host, store, or distribute game binaries or cracks. Users connect their own authorized accounts, trial passes, or external packages under their own responsibility.
          </span>
        </div>
      </div>
    </ModalShell>
  );
}
