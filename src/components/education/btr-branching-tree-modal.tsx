import { useState } from "react";
import {
  X,
  Activity,
  Heart,
  Wind,
  Droplets,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ArrowRight,
  RotateCcw,
  Sparkles,
  ShieldAlert,
} from "lucide-react";
import {
  BRANCHING_CLINICAL_SCENARIOS,
  type BranchingScenario,
  type DecisionBranchOption,
} from "@/lib/education/btr-branching-tree";

export interface BTRBranchingTreeModalProps {
  isOpen: boolean;
  onClose: () => void;
  scenarioId?: string;
}

export function BTRBranchingTreeModal({
  isOpen,
  onClose,
  scenarioId,
}: BTRBranchingTreeModalProps) {
  const [selectedScenarioIndex, setSelectedScenarioIndex] = useState(0);
  const activeScenario: BranchingScenario =
    BRANCHING_CLINICAL_SCENARIOS.find((s) => s.id === scenarioId) ||
    BRANCHING_CLINICAL_SCENARIOS[selectedScenarioIndex] ||
    BRANCHING_CLINICAL_SCENARIOS[0];

  const [currentStageId, setCurrentStageId] = useState<string>(activeScenario.stages[0]?.id || "");
  const [selectedOption, setSelectedOption] = useState<DecisionBranchOption | null>(null);
  const [stageHistory, setStageHistory] = useState<
    Array<{ stageId: string; chosenOption: DecisionBranchOption }>
  >([]);
  const [isScenarioFinished, setIsScenarioFinished] = useState(false);

  const activeStage =
    activeScenario.stages.find((s) => s.id === currentStageId) || activeScenario.stages[0];

  const handleSelectOption = (opt: DecisionBranchOption) => {
    setSelectedOption(opt);
    setStageHistory((prev) => [...prev, { stageId: activeStage.id, chosenOption: opt }]);

    if (opt.isFatalTrap || !opt.nextStageId) {
      setIsScenarioFinished(true);
    }
  };

  const handleAdvanceToNextStage = () => {
    if (selectedOption?.nextStageId) {
      setCurrentStageId(selectedOption.nextStageId);
      setSelectedOption(null);
    }
  };

  const handleRestartScenario = () => {
    setCurrentStageId(activeScenario.stages[0]?.id || "");
    setSelectedOption(null);
    setStageHistory([]);
    setIsScenarioFinished(false);
  };

  if (!isOpen) return null;

  const vitals = activeStage.patientVitals;
  const isHypotensive = parseInt(vitals.bp.split("/")[0] || "120", 10) < 90;
  const isTachycardic = vitals.hr > 100;
  const isHypoxic = vitals.spo2 < 92;

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col rounded-3xl border border-edge bg-surface shadow-2xl overflow-hidden text-ink">
        {/* Header Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-edge bg-elevated/70">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-accent/15 border border-accent/30 text-accent flex items-center justify-center">
              <Activity size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-black text-ink">{activeScenario.title}</h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-accent/20 text-accent font-mono border border-accent/30">
                  {activeScenario.specialty}
                </span>
              </div>
              <span className="text-[11px] text-ink-muted">
                Sequential Consequence-Driven Clinical Branching Simulation
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={selectedScenarioIndex}
              onChange={(e) => {
                const idx = Number(e.target.value);
                setSelectedScenarioIndex(idx);
                const nextScen = BRANCHING_CLINICAL_SCENARIOS[idx];
                if (nextScen) {
                  setCurrentStageId(nextScen.stages[0]?.id || "");
                  setSelectedOption(null);
                  setStageHistory([]);
                  setIsScenarioFinished(false);
                }
              }}
              className="text-xs bg-canvas border border-edge rounded-xl px-2.5 py-1 text-ink font-semibold focus:outline-none"
            >
              {BRANCHING_CLINICAL_SCENARIOS.map((sc, i) => (
                <option key={sc.id} value={i}>
                  {sc.title}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={handleRestartScenario}
              className="p-1.5 rounded-xl bg-elevated border border-edge text-ink-muted hover:text-ink transition"
              title="Restart Scenario"
            >
              <RotateCcw size={15} />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl bg-elevated border border-edge text-ink-muted hover:text-ink transition"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Live Patient Bedside Monitor Banner */}
        <div className="px-6 py-3 bg-black/70 border-b border-edge flex flex-wrap items-center justify-between gap-4 font-mono text-xs">
          <div className="flex items-center gap-1.5 text-ink-muted text-[11px] uppercase tracking-wider font-bold">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Bedside Vitals Monitor</span>
          </div>

          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <Heart size={14} className={isTachycardic ? "text-rose-400 animate-bounce" : "text-emerald-400"} />
              <span className="text-ink-muted text-[11px]">HR:</span>
              <strong className={isTachycardic ? "text-rose-400 font-bold" : "text-ink"}>
                {vitals.hr} bpm
              </strong>
            </div>

            <div className="flex items-center gap-2">
              <Droplets size={14} className={isHypotensive ? "text-rose-400" : "text-emerald-400"} />
              <span className="text-ink-muted text-[11px]">BP:</span>
              <strong className={isHypotensive ? "text-rose-400 font-bold" : "text-ink"}>
                {vitals.bp} mmHg
              </strong>
            </div>

            <div className="flex items-center gap-2">
              <Wind size={14} className="text-sky-400" />
              <span className="text-ink-muted text-[11px]">RR:</span>
              <strong className="text-ink">{vitals.rr} /min</strong>
            </div>

            <div className="flex items-center gap-2">
              <Activity size={14} className={isHypoxic ? "text-rose-400" : "text-emerald-400"} />
              <span className="text-ink-muted text-[11px]">SpO2:</span>
              <strong className={isHypoxic ? "text-rose-400 font-bold" : "text-ink"}>
                {vitals.spo2}%
              </strong>
            </div>
          </div>
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-5">
          {/* Stage Stepper Strip */}
          <div className="flex items-center gap-2 pb-1 overflow-x-auto no-scrollbar">
            {activeScenario.stages.map((stg) => {
              const isCurrent = stg.id === activeStage.id;
              const isPast = stageHistory.some((h) => h.stageId === stg.id);
              return (
                <div
                  key={stg.id}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold border transition ${
                    isCurrent
                      ? "bg-accent/20 border-accent/40 text-accent shadow-xs"
                      : isPast
                        ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                        : "bg-elevated/40 border-edge text-ink-muted"
                  }`}
                >
                  <span>Stage {stg.stageNumber}</span>
                  {isPast && <CheckCircle2 size={12} className="text-emerald-400" />}
                </div>
              );
            })}
          </div>

          {/* Clinical Case Vignette */}
          <div className="p-4 rounded-2xl bg-canvas border border-edge flex flex-col gap-2 shadow-sm">
            <span className="text-[10px] font-bold uppercase tracking-wider text-accent font-mono">
              {activeStage.stageTitle}
            </span>
            <p className="text-xs sm:text-sm text-ink font-medium leading-relaxed">
              {activeStage.clinicalNarrative}
            </p>
          </div>

          {/* Decision Options */}
          <div className="flex flex-col gap-2.5">
            <span className="text-xs font-bold uppercase tracking-wider text-ink-muted">
              Select Immediate Clinical Management Option:
            </span>

            {activeStage.options.map((opt, idx) => {
              const isSelected = selectedOption?.id === opt.id;
              let borderClass = "border-edge bg-elevated/80 hover:bg-raised text-ink";

              if (selectedOption) {
                if (opt.isOptimal) {
                  borderClass = "border-emerald-500/60 bg-emerald-500/15 text-emerald-300 font-semibold";
                } else if (isSelected) {
                  borderClass = "border-rose-500/60 bg-rose-500/15 text-rose-300";
                }
              }

              return (
                <button
                  key={opt.id}
                  type="button"
                  disabled={selectedOption !== null}
                  onClick={() => handleSelectOption(opt)}
                  className={`w-full text-left p-3.5 rounded-2xl border text-xs sm:text-sm transition flex items-start gap-3 shadow-xs ${borderClass}`}
                >
                  <span className="font-mono font-bold text-ink-muted shrink-0 pt-0.5">
                    {String.fromCharCode(65 + idx)}.
                  </span>
                  <span className="flex-1 leading-relaxed">{opt.label}</span>
                  {selectedOption && opt.isOptimal && (
                    <CheckCircle2 size={18} className="text-emerald-400 shrink-0 mt-0.5" />
                  )}
                  {selectedOption && isSelected && !opt.isOptimal && (
                    <XCircle size={18} className="text-rose-400 shrink-0 mt-0.5" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Clinical Consequence & Autopsy Card */}
          {selectedOption && (
            <div
              className={`p-5 rounded-2xl border flex flex-col gap-3 animate-in fade-in duration-200 ${
                selectedOption.isFatalTrap
                  ? "bg-rose-950/20 border-rose-500/40 text-rose-200"
                  : selectedOption.isOptimal
                    ? "bg-emerald-950/20 border-emerald-500/40 text-emerald-200"
                    : "bg-amber-950/20 border-amber-500/40 text-amber-200"
              }`}
            >
              <div className="flex items-center gap-2 font-bold text-xs">
                {selectedOption.isFatalTrap ? (
                  <>
                    <ShieldAlert size={16} className="text-rose-400" />
                    <span className="text-rose-400">PATIENT DECOMPENSATION WARNING</span>
                  </>
                ) : selectedOption.isOptimal ? (
                  <>
                    <Sparkles size={16} className="text-emerald-400" />
                    <span className="text-emerald-400">OPTIMAL DIAGNOSTIC DECISION</span>
                  </>
                ) : (
                  <>
                    <AlertTriangle size={16} className="text-amber-400" />
                    <span className="text-amber-400">SUB-OPTIMAL CLINICAL CHOICE</span>
                  </>
                )}
              </div>

              <div className="text-xs sm:text-sm font-semibold leading-relaxed">
                {selectedOption.clinicalConsequence}
              </div>

              <div className="p-3 rounded-xl bg-canvas/80 border border-edge text-xs leading-relaxed text-ink">
                <strong>Mechanism Autopsy:</strong> {selectedOption.mechanismAutopsy}
              </div>

              {selectedOption.nextStageId && !isScenarioFinished && (
                <div className="flex justify-end pt-2">
                  <button
                    type="button"
                    onClick={handleAdvanceToNextStage}
                    className="px-5 py-2.5 rounded-xl bg-accent hover:brightness-110 text-white font-bold text-xs transition flex items-center gap-2 shadow-md"
                  >
                    <span>Advance to Next Stage</span>
                    <ArrowRight size={14} />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Scenario Completion Summary */}
          {isScenarioFinished && (
            <div className="p-5 rounded-2xl bg-canvas border border-accent/40 flex flex-col gap-3 shadow-lg">
              <div className="flex items-center gap-2 text-accent font-bold text-xs uppercase tracking-wider">
                <Sparkles size={15} />
                <span>Clinical Scenario Debriefing</span>
              </div>
              <p className="text-xs sm:text-sm text-ink leading-relaxed font-medium">
                {activeScenario.debriefingBottomLine}
              </p>
              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={handleRestartScenario}
                  className="px-4 py-2 rounded-xl bg-elevated border border-edge hover:bg-raised text-ink text-xs font-bold transition flex items-center gap-1.5"
                >
                  <RotateCcw size={13} />
                  <span>Repeat Scenario</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
