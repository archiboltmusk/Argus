import { useState } from "react";
import {
  Activity,
  Heart,
  Wind,
  Brain,
  FileSearch,
  Zap,
  CheckCircle2,
  XCircle,
  RotateCcw,
  ShieldAlert,
  ArrowLeft,
} from "lucide-react";
import type {
  PatientVitalSigns,
  ClinicalInvestigation,
  ClinicalIntervention,
} from "@/lib/education/simulator-types";
import { CLINICAL_SIMULATOR_CASES } from "@/lib/education/simulator-data";

export function PatientCaseSimulator({ onClose }: { onClose: () => void }) {
  const [selectedCaseIndex, setSelectedCaseIndex] = useState<number>(0);
  const activeCase = CLINICAL_SIMULATOR_CASES[selectedCaseIndex] ?? CLINICAL_SIMULATOR_CASES[0];

  const [currentVitals, setCurrentVitals] = useState<PatientVitalSigns>(activeCase.initialVitals);
  const [orderedInvestigationIds, setOrderedInvestigationIds] = useState<Set<string>>(new Set());
  const [performedInterventions, setPerformedInterventions] = useState<ClinicalIntervention[]>([]);
  const [fatalErrorTriggered, setFatalErrorTriggered] = useState<boolean>(false);
  const [caseResolved, setCaseResolved] = useState<boolean>(false);

  const resetCase = (newIndex: number) => {
    setSelectedCaseIndex(newIndex);
    const next = CLINICAL_SIMULATOR_CASES[newIndex];
    if (next) {
      setCurrentVitals(next.initialVitals);
      setOrderedInvestigationIds(new Set());
      setPerformedInterventions([]);
      setFatalErrorTriggered(false);
      setCaseResolved(false);
    }
  };

  const handleOrderInvestigation = (inv: ClinicalInvestigation) => {
    if (orderedInvestigationIds.has(inv.id) || fatalErrorTriggered || caseResolved) return;
    setOrderedInvestigationIds((prev) => new Set(prev).add(inv.id));
  };

  const handlePerformIntervention = (action: ClinicalIntervention) => {
    if (performedInterventions.some((i) => i.id === action.id) || fatalErrorTriggered || caseResolved) return;

    setPerformedInterventions((prev) => [...prev, action]);

    if (action.hemodynamicDelta) {
      setCurrentVitals((prev) => ({
        ...prev,
        ...action.hemodynamicDelta,
      }));
    }

    if (action.isFatal) {
      setFatalErrorTriggered(true);
    } else if (action.isCorrect && action.category === "procedure") {
      setCaseResolved(true);
    }
  };

  const vitalStatusColor = (val: number, normalLow: number, normalHigh: number) => {
    if (val < normalLow || val > normalHigh) return "text-red-400 font-bold animate-pulse";
    return "text-emerald-400 font-medium";
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-canvas text-ink backdrop-blur-md overflow-hidden select-none">
      {/* Top Navigation & Case Selector */}
      <header className="flex items-center justify-between border-b border-edge bg-surface/90 px-6 py-3">
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-lg bg-elevated hover:bg-raised text-ink-muted hover:text-ink transition-colors"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1.5 rounded bg-accent-soft px-2 py-0.5 text-[11px] font-semibold text-accent border border-accent/20">
                <Activity size={12} /> CLINICAL RESIDENT SIMULATOR
              </span>
              <span className="text-xs text-ink-subtle">• {activeCase.department}</span>
            </div>
            <h1 className="text-base font-bold text-ink">{activeCase.title}</h1>
          </div>
        </div>

        {/* Case Selector Tabs */}
        <div className="flex items-center gap-2">
          {CLINICAL_SIMULATOR_CASES.map((c, idx) => (
            <button
              key={c.id}
              onClick={() => resetCase(idx)}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-all ${
                selectedCaseIndex === idx
                  ? "bg-accent text-canvas shadow-lg"
                  : "bg-elevated text-ink-muted hover:bg-raised hover:text-ink border border-edge-soft"
              }`}
            >
              Case {idx + 1}
            </button>
          ))}
          <button
            onClick={() => resetCase(selectedCaseIndex)}
            className="flex items-center gap-1 rounded-md border border-edge bg-elevated px-3 py-1.5 text-xs text-ink-muted hover:bg-raised hover:text-ink"
          >
            <RotateCcw size={12} /> Reset Case
          </button>
        </div>
      </header>

      {/* Main Clinical Stage */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Side: Real-Time Patient Monitor & Demographics */}
        <div className="w-[380px] shrink-0 border-r border-edge bg-surface/50 p-5 flex flex-col gap-4 overflow-y-auto">
          {/* Patient Header */}
          <div className="rounded-xl border border-edge-soft bg-surface/80 p-4">
            <div className="flex items-center justify-between text-xs text-ink-subtle mb-1">
              <span>Age: {activeCase.patientDemographics.age}y</span>
              <span>Gender: {activeCase.patientDemographics.gender}</span>
              <span className="font-semibold text-accent">{activeCase.difficulty} Level</span>
            </div>
            <p className="text-sm font-medium text-ink mt-2">
              <span className="font-bold text-ink-muted">Chief Complaint:</span> "{activeCase.patientDemographics.chiefComplaint}"
            </p>
          </div>

          {/* ICU / ED Vital Signs Telemetry Monitor */}
          <div className="rounded-xl border border-edge-soft bg-canvas p-4 font-mono shadow-inner">
            <div className="flex items-center justify-between border-b border-edge-soft pb-2 mb-3">
              <span className="text-[11px] font-bold uppercase tracking-wider text-ink-subtle flex items-center gap-1.5">
                <Activity size={14} className="text-accent" /> BEDSIDE TELEMETRY
              </span>
              <span className="text-[10px] text-accent animate-pulse">● LIVE</span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-lg bg-surface/80 p-2.5 border border-edge-soft">
                <div className="flex items-center gap-1.5 text-xs text-ink-subtle">
                  <Heart size={14} className="text-red-400" /> HR (BPM)
                </div>
                <div className={`text-2xl mt-1 ${vitalStatusColor(currentVitals.heartRateBpm, 60, 100)}`}>
                  {currentVitals.heartRateBpm}
                </div>
              </div>

              <div className="rounded-lg bg-surface/80 p-2.5 border border-edge-soft">
                <div className="flex items-center gap-1.5 text-xs text-ink-subtle">
                  <Activity size={14} className="text-accent" /> BP (mmHg)
                </div>
                <div className={`text-2xl mt-1 ${vitalStatusColor(currentVitals.bloodPressureSystolic, 90, 130)}`}>
                  {currentVitals.bloodPressureSystolic}/{currentVitals.bloodPressureDiastolic}
                </div>
              </div>

              <div className="rounded-lg bg-surface/80 p-2.5 border border-edge-soft">
                <div className="flex items-center gap-1.5 text-xs text-ink-subtle">
                  <Wind size={14} className="text-sky-400" /> SpO2 (%)
                </div>
                <div className={`text-2xl mt-1 ${vitalStatusColor(currentVitals.spO2Percent, 94, 100)}`}>
                  {currentVitals.spO2Percent}%
                </div>
              </div>

              <div className="rounded-lg bg-surface/80 p-2.5 border border-edge-soft">
                <div className="flex items-center gap-1.5 text-xs text-ink-subtle">
                  <Brain size={14} className="text-amber-400" /> GCS (3-15)
                </div>
                <div className={`text-2xl mt-1 ${vitalStatusColor(currentVitals.glasgowComaScale, 15, 15)}`}>
                  {currentVitals.glasgowComaScale}/15
                </div>
              </div>
            </div>
          </div>

          {/* History of Present Illness & Physical Findings */}
          <div className="rounded-xl border border-edge-soft bg-surface/60 p-4 flex flex-col gap-2.5 text-xs leading-relaxed text-ink-muted">
            <span className="font-bold text-ink uppercase tracking-wider text-[11px]">Clinical Findings</span>
            <p className="text-ink-muted italic">{activeCase.historyOfPresentIllness}</p>
            <div className="mt-2 flex flex-col gap-1.5 border-t border-edge-soft pt-2">
              {activeCase.physicalExaminationFindings.map((finding, idx) => (
                <div key={idx} className="flex items-start gap-1.5 text-ink-muted">
                  <span className="text-accent font-bold">•</span>
                  <span>{finding}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Side: Interactive Investigations & Intervention Orders */}
        <div className="flex-1 flex flex-col p-6 overflow-y-auto gap-6 bg-canvas">
          {/* Status Banners: Fatal Mistake or Success */}
          {fatalErrorTriggered && (
            <div className="rounded-xl border border-red-500/40 bg-red-950/40 p-4 text-red-200 flex items-start gap-3">
              <ShieldAlert size={24} className="text-red-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-bold text-red-300">CRITICAL ADVERSE EVENT / CARDIAC ARREST</h4>
                <p className="text-xs mt-1 text-red-200/90">
                  {performedInterventions.find((i) => i.isFatal)?.feedback}
                </p>
                <p className="text-xs mt-2 font-mono text-red-300/80">
                  Examiner Trap: {activeCase.examinerTrap}
                </p>
              </div>
            </div>
          )}

          {caseResolved && (
            <div className="rounded-xl border border-emerald-500/40 bg-emerald-950/40 p-4 text-emerald-200 flex items-start gap-3">
              <CheckCircle2 size={24} className="text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-bold text-emerald-300">PATIENT STABILIZED / CRISIS REVERSED</h4>
                <p className="text-xs mt-1 text-emerald-200/90">
                  {performedInterventions.find((i) => i.isCorrect && i.category === "procedure")?.feedback}
                </p>
                <div className="mt-3 rounded-lg bg-surface/90 p-3 border border-emerald-500/20">
                  <span className="text-xs font-bold text-emerald-400">Diagnosis: {activeCase.finalDiagnosis}</span>
                  <div className="mt-2 flex flex-col gap-1 text-[11px] text-ink-muted">
                    {activeCase.clinicalPearls.map((pearl, pIdx) => (
                      <span key={pIdx}>• {pearl}</span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Section 1: Order Diagnostic Tests & Bedside Imaging */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <FileSearch size={16} className="text-accent" />
              <h3 className="text-sm font-bold text-ink">1. Order Diagnostic Tests & Point-of-Care Imaging</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {activeCase.availableInvestigations.map((inv) => {
                const ordered = orderedInvestigationIds.has(inv.id);
                return (
                  <div
                    key={inv.id}
                    className={`rounded-xl border p-4 transition-all ${
                      ordered
                        ? "border-accent/40 bg-accent-soft/20"
                        : "border-edge-soft bg-surface/70 hover:border-edge hover:bg-elevated/80"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-ink">{inv.name}</span>
                      {!ordered ? (
                        <button
                          disabled={fatalErrorTriggered || caseResolved}
                          onClick={() => handleOrderInvestigation(inv)}
                          className="rounded bg-accent px-2.5 py-1 text-[11px] font-semibold text-canvas hover:opacity-90 active:scale-95 disabled:opacity-40 transition-opacity"
                        >
                          Order Test
                        </button>
                      ) : (
                        <span className="text-[11px] font-semibold text-accent">● Result Available</span>
                      )}
                    </div>
                    {ordered && (
                      <div className="mt-2 text-xs text-ink-muted border-t border-edge-soft pt-2 leading-relaxed">
                        <p className="font-mono text-emerald-400">{inv.resultSummary}</p>
                        <p className="mt-1.5 text-[11px] text-ink-subtle italic">
                          <span className="text-accent font-bold">High-Yield Pearl:</span> {inv.highYieldLearningPoint}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section 2: Clinical Interventions & Emergency Therapeutics */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Zap size={16} className="text-amber-400" />
              <h3 className="text-sm font-bold text-ink">2. Emergency Interventions & Pharmacotherapy</h3>
            </div>
            <div className="flex flex-col gap-2.5">
              {activeCase.availableInterventions.map((action) => {
                const performed = performedInterventions.some((i) => i.id === action.id);
                return (
                  <div
                    key={action.id}
                    className={`rounded-xl border p-4 flex items-center justify-between transition-all ${
                      performed
                        ? action.isFatal
                          ? "border-red-500/60 bg-red-950/30"
                          : action.isCorrect
                          ? "border-emerald-500/60 bg-emerald-950/30"
                          : "border-amber-500/50 bg-amber-950/20"
                        : "border-edge-soft bg-surface/70 hover:border-edge hover:bg-elevated/80"
                    }`}
                  >
                    <div className="flex-1 pr-4">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-ink">{action.name}</span>
                        <span className="rounded bg-elevated px-1.5 py-0.5 text-[10px] uppercase font-mono text-ink-subtle border border-edge-soft">
                          {action.category}
                        </span>
                      </div>
                      {performed && (
                        <p className={`mt-2 text-xs ${action.isFatal ? "text-red-300" : "text-emerald-300"}`}>
                          {action.feedback}
                        </p>
                      )}
                    </div>

                    {!performed ? (
                      <button
                        disabled={fatalErrorTriggered || caseResolved}
                        onClick={() => handlePerformIntervention(action)}
                        className="rounded-lg bg-accent px-4 py-2 text-xs font-semibold text-canvas hover:opacity-90 active:scale-95 disabled:opacity-40 shrink-0 transition-opacity"
                      >
                        Administer / Perform
                      </button>
                    ) : (
                      <div className="shrink-0">
                        {action.isCorrect ? (
                          <CheckCircle2 size={20} className="text-emerald-400" />
                        ) : (
                          <XCircle size={20} className="text-red-400" />
                        )}
                      </div>
                    )}
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
