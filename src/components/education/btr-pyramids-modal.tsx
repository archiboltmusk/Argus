import { useState, useMemo } from "react";
import {
  X,
  Triangle,
  CheckCircle2,
  Circle,
} from "lucide-react";
import {
  BTR_PYRAMID_CATALOG,
  loadCheckedPyramidTopics,
  togglePyramidTopic,
  calculatePyramidProgress,
  type BTRPyramidData,
} from "@/lib/education/btr-pyramids-engine";

interface BTRPyramidsModalProps {
  open: boolean;
  onClose: () => void;
}

export function BTRPyramidsModal({ open, onClose }: BTRPyramidsModalProps) {
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>("anatomy");
  const [checkedSet, setCheckedSet] = useState<Set<string>>(() => loadCheckedPyramidTopics());

  if (!open) return null;

  const currentData: BTRPyramidData =
    BTR_PYRAMID_CATALOG[selectedSubjectId] || BTR_PYRAMID_CATALOG.anatomy;

  const progress = useMemo(
    () => calculatePyramidProgress(currentData, checkedSet),
    [currentData, checkedSet]
  );

  const handleToggle = (key: string) => {
    togglePyramidTopic(key);
    setCheckedSet(new Set(loadCheckedPyramidTopics()));
  };

  return (
    <div className="fixed inset-0 z-[250] flex items-center justify-center bg-black/80 backdrop-blur-md p-2 sm:p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-4xl h-[90vh] max-h-[840px] rounded-3xl bg-surface border border-edge flex flex-col shadow-2xl overflow-hidden text-ink">
        {/* Header */}
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-edge px-5 sm:px-6 bg-surface/90">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <Triangle size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-ink">The BTR 3-Tier Pyramid Visualizer</h2>
                <span className="font-mono text-xs px-2.5 py-0.5 rounded-full bg-accent/15 text-accent font-bold">
                  {progress.totalPercentage}% Mastered
                </span>
              </div>
              <p className="text-xs text-ink-muted">
                Dr. Zainab Vora&apos;s 3-Tier Rule: Tier 1 (70% Base) • Tier 2 (20% Volatiles) • Tier 3 (10% Tie-Breakers)
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

        {/* Subject Selectors */}
        <div className="border-b border-edge p-3 bg-surface/60 flex items-center gap-2 overflow-x-auto no-scrollbar shrink-0">
          {Object.values(BTR_PYRAMID_CATALOG).map((p) => {
            const isSelected = selectedSubjectId === p.subjectId;
            return (
              <button
                key={p.subjectId}
                type="button"
                onClick={() => setSelectedSubjectId(p.subjectId)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                  isSelected
                    ? "bg-accent text-white shadow-xs"
                    : "bg-elevated border border-edge-soft text-ink-muted hover:text-ink"
                }`}
              >
                {p.subjectName}
              </button>
            );
          })}
        </div>

        {/* Pyramid Schematic Banner */}
        <div className="shrink-0 bg-canvas/80 border-b border-edge-soft p-4 flex flex-col sm:flex-row items-center justify-around gap-4 text-center">
          <div className="flex flex-col items-center gap-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-purple-400">
              Apex: Tier 3 Tie-Breakers (10%)
            </span>
            <div className="flex items-center gap-2">
              <span className="text-lg font-black text-purple-300">{progress.tier3Percentage}%</span>
              <div className="w-24 h-1.5 bg-elevated rounded-full overflow-hidden">
                <div className="h-full bg-purple-500 rounded-full" style={{ width: `${progress.tier3Percentage}%` }} />
              </div>
            </div>
          </div>

          <div className="flex flex-col items-center gap-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">
              Middle: Tier 2 Volatiles (20%)
            </span>
            <div className="flex items-center gap-2">
              <span className="text-lg font-black text-amber-300">{progress.tier2Percentage}%</span>
              <div className="w-24 h-1.5 bg-elevated rounded-full overflow-hidden">
                <div className="h-full bg-amber-500 rounded-full" style={{ width: `${progress.tier2Percentage}%` }} />
              </div>
            </div>
          </div>

          <div className="flex flex-col items-center gap-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
              Base: Tier 1 Must-Knows (70%)
            </span>
            <div className="flex items-center gap-2">
              <span className="text-lg font-black text-emerald-300">{progress.tier1Percentage}%</span>
              <div className="w-24 h-1.5 bg-elevated rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${progress.tier1Percentage}%` }} />
              </div>
            </div>
          </div>
        </div>

        {/* Pyramid Tiers Interactive Checklist */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 bg-canvas flex flex-col gap-6">
          {/* TIER 3 (Apex) */}
          <div className="rounded-3xl bg-surface border border-purple-500/30 p-5 flex flex-col gap-3 shadow-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-[10.5px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  TIER 3: Apex Rank-Decider Tie-Breakers (10% marks)
                </span>
              </div>
              <span className="text-xs font-mono text-purple-400 font-bold">{progress.tier3Percentage}%</span>
            </div>

            <div className="flex flex-col gap-2">
              {currentData.tier3TieBreakers.map((topic, idx) => {
                const key = `${currentData.subjectId}-t3-${idx}`;
                const isDone = checkedSet.has(key);
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => handleToggle(key)}
                    className={`text-left p-3 rounded-xl border flex items-center justify-between text-xs transition ${
                      isDone
                        ? "bg-purple-500/15 border-purple-500/40 text-purple-200"
                        : "bg-canvas border-edge-soft text-ink-muted hover:text-ink"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      {isDone ? <CheckCircle2 size={16} className="text-purple-400 shrink-0" /> : <Circle size={16} className="text-ink-muted shrink-0" />}
                      <span className={isDone ? "line-through opacity-80" : ""}>{topic}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* TIER 2 (Middle) */}
          <div className="rounded-3xl bg-surface border border-amber-500/30 p-5 flex flex-col gap-3 shadow-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-[10.5px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  TIER 2: Volatile Repeat Traps & Tables (20% marks)
                </span>
              </div>
              <span className="text-xs font-mono text-amber-400 font-bold">{progress.tier2Percentage}%</span>
            </div>

            <div className="flex flex-col gap-2">
              {currentData.tier2Volatiles.map((topic, idx) => {
                const key = `${currentData.subjectId}-t2-${idx}`;
                const isDone = checkedSet.has(key);
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => handleToggle(key)}
                    className={`text-left p-3 rounded-xl border flex items-center justify-between text-xs transition ${
                      isDone
                        ? "bg-amber-500/15 border-amber-500/40 text-amber-200"
                        : "bg-canvas border-edge-soft text-ink-muted hover:text-ink"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      {isDone ? <CheckCircle2 size={16} className="text-amber-400 shrink-0" /> : <Circle size={16} className="text-ink-muted shrink-0" />}
                      <span className={isDone ? "line-through opacity-80" : ""}>{topic}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* TIER 1 (Base) */}
          <div className="rounded-3xl bg-surface border border-emerald-500/30 p-5 flex flex-col gap-3 shadow-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-[10.5px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  TIER 1: Foundation Base Must-Knows (70% marks)
                </span>
              </div>
              <span className="text-xs font-mono text-emerald-400 font-bold">{progress.tier1Percentage}%</span>
            </div>

            <div className="flex flex-col gap-2">
              {currentData.tier1MustKnow.map((topic, idx) => {
                const key = `${currentData.subjectId}-t1-${idx}`;
                const isDone = checkedSet.has(key);
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => handleToggle(key)}
                    className={`text-left p-3 rounded-xl border flex items-center justify-between text-xs transition ${
                      isDone
                        ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-200"
                        : "bg-canvas border-edge-soft text-ink-muted hover:text-ink"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      {isDone ? <CheckCircle2 size={16} className="text-emerald-400 shrink-0" /> : <Circle size={16} className="text-ink-muted shrink-0" />}
                      <span className={isDone ? "line-through opacity-80" : ""}>{topic}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
