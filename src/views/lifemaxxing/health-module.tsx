import {
  ShieldCheck,
  Stethoscope,
  Zap,
} from "lucide-react";
import { useState } from "react";
import {
  THREE_FATIGUE_PERSONAS,
  HEALTH_ACTION_ENGINE_STEPS,
} from "@/lib/lifemaxxing/health_intelligence/data";
import type { FatigueClinicalPersona } from "@/lib/lifemaxxing/health_intelligence/types";

export function HealthIntelligenceModule() {
  const [selectedPersonaId, setSelectedPersonaId] = useState<string>("elder_diabetic_fatigue");
  const [activeTab, setActiveTab] = useState<"triage_demo" | "action_engine" | "free_layer">("triage_demo");

  const currentPersona: FatigueClinicalPersona =
    THREE_FATIGUE_PERSONAS.find((p) => p.id === selectedPersonaId) ??
    THREE_FATIGUE_PERSONAS[0];

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Banner: ARGUS Health Intelligence */}
      <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-rose-950/40 via-red-950/20 to-black/80 p-6 md:p-8 backdrop-blur-xl relative overflow-hidden shadow-2xl">
        <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-rose-500/10 blur-3xl pointer-events-none" />
        <div className="relative z-10 space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-rose-400/30 bg-rose-500/10 px-3.5 py-1 text-xs font-semibold tracking-wide text-rose-300">
            <Stethoscope className="h-3.5 w-3.5 text-rose-400" />
            <span>ARGUS Health · Personalized Healthcare Intelligence</span>
          </div>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white">
                Your Health. In Context.
              </h2>
              <p className="mt-1 text-sm md:text-base text-white/70 max-w-3xl leading-relaxed">
                Medical knowledge is abundant; personalized, trustworthy guidance is not.
                ARGUS removes friction and connects you to clinical care—never pretending to replace qualified medical professionals.
              </p>
            </div>

            {/* ABHA / Ayushman Bharat Digital Link Badge */}
            <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/40 p-3.5 backdrop-blur-md shrink-0">
              <div className="h-10 w-10 rounded-lg bg-rose-500/20 flex items-center justify-center text-rose-400 font-bold font-mono">
                ABHA
              </div>
              <div>
                <div className="text-[11px] font-medium uppercase tracking-wider text-white/50">Digital Health Mission</div>
                <div className="text-xs font-bold text-white">ABDM Consent Architecture Linked</div>
              </div>
            </div>
          </div>

          {/* Sub Navigation */}
          <div className="flex flex-wrap gap-2 pt-2 border-t border-white/10">
            {[
              { id: "triage_demo", label: "1. Three Contexts, One Symptom", icon: Stethoscope, desc: "'I am tired all the time'" },
              { id: "action_engine", label: "2. Health Action Engine", icon: Zap, desc: "6-step clinical translation" },
              { id: "free_layer", label: "3. The Free Essential Layer", icon: ShieldCheck, desc: "Zero paywalls on safety" },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as typeof activeTab)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium transition-all duration-200 cursor-pointer ${
                    isActive
                      ? "bg-rose-600 text-white shadow-lg shadow-rose-600/30 border border-rose-400/40"
                      : "bg-white/5 text-white/70 hover:bg-white/10 hover:text-white border border-white/5"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* TAB 1: THREE CONTEXTS, ONE SYMPTOM (FATIGUE TRIAGE DEMO) */}
      {activeTab === "triage_demo" && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Persona Selector */}
            <div className="lg:col-span-1 rounded-2xl border border-white/10 bg-black/40 p-6 backdrop-blur-md space-y-4">
              <div className="text-xs font-bold uppercase tracking-wider text-white/50">
                Identical Symptom: &ldquo;I&apos;m Tired All The Time&rdquo;
              </div>

              <div className="space-y-2">
                {THREE_FATIGUE_PERSONAS.map((p) => {
                  const isSel = selectedPersonaId === p.id;
                  return (
                    <button
                      key={p.id}
                      onClick={() => setSelectedPersonaId(p.id)}
                      className={`w-full text-left p-3.5 rounded-xl border text-xs transition-all cursor-pointer ${
                        isSel
                          ? "border-rose-500 bg-rose-950/40 text-white font-semibold shadow-md shadow-rose-950/40"
                          : "border-white/5 bg-white/[0.02] text-white/70 hover:bg-white/[0.06] hover:text-white"
                      }`}
                    >
                      <div className="font-bold text-white">{p.patientTitle}</div>
                      <div className="text-[11px] text-white/50 truncate mt-0.5">{p.contextSummary}</div>
                      {p.triageVerdict === "mandatory_clinical_evaluation" && (
                        <div className="mt-1 text-[10px] text-rose-400 font-mono font-bold">
                          ⚠️ Red Flag: Clinical Evaluation Required
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Health Graph Quick Snapshot */}
              <div className="pt-3 border-t border-white/10 space-y-2 text-xs">
                <div className="text-[11px] font-bold uppercase tracking-wider text-white/50">Personal Health Graph</div>
                {currentPersona.healthGraph.abhaId && (
                  <div className="text-[10px] text-emerald-400 font-mono">{currentPersona.healthGraph.abhaId}</div>
                )}
                <div className="text-white/80">
                  <strong>Conditions:</strong> {currentPersona.healthGraph.chronicConditions.join(", ")}
                </div>
                {currentPersona.healthGraph.currentMedications.length > 0 && (
                  <div className="text-white/80">
                    <strong>Medications:</strong> {currentPersona.healthGraph.currentMedications.map((m) => m.name).join(", ")}
                  </div>
                )}
                {currentPersona.healthGraph.recentLabBiomarkers.map((lab) => (
                  <div key={lab.testName} className="flex justify-between py-1 border-b border-white/5">
                    <span className="text-white/60">{lab.testName}:</span>
                    <span className={lab.isAbnormal ? "text-rose-400 font-bold" : "text-white"}>{lab.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* ARGUS Contextual Response */}
            <div className="lg:col-span-2 rounded-2xl border border-rose-500/30 bg-gradient-to-br from-rose-950/20 via-black/60 to-black/80 p-6 md:p-8 backdrop-blur-md space-y-5 shadow-2xl">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
                <div>
                  <span className="text-xs font-mono uppercase text-rose-300 font-bold">
                    Contextual Health Triage Dispatch
                  </span>
                  <h3 className="text-lg font-bold text-white mt-0.5">{currentPersona.argusResponse.headline}</h3>
                </div>

                <span
                  className={`text-xs font-bold uppercase px-3 py-1 rounded-full ${
                    currentPersona.triageVerdict === "mandatory_clinical_evaluation"
                      ? "bg-rose-500 text-black font-extrabold shadow-md shadow-rose-500/50"
                      : "bg-white/10 text-white border border-white/20"
                  }`}
                >
                  {currentPersona.triageVerdict.replace(/_/g, " ").toUpperCase()}
                </span>
              </div>

              {/* Chief Complaint vs Context Rationale */}
              <div className="space-y-2">
                <div className="p-3.5 rounded-xl border border-white/5 bg-white/[0.02] text-xs">
                  <span className="text-white/50 uppercase font-mono text-[10px] block">Chief Complaint</span>
                  <p className="text-white/90 italic font-serif text-sm mt-0.5">&ldquo;{currentPersona.chiefComplaint}&rdquo;</p>
                </div>

                <div className="p-3.5 rounded-xl border border-white/5 bg-white/[0.02] text-xs space-y-1">
                  <span className="text-rose-300 uppercase font-mono text-[10px] font-bold">Clinical Evidence Rationale</span>
                  <p className="text-white/80 leading-relaxed">{currentPersona.argusResponse.evidenceRationale}</p>
                </div>
              </div>

              {/* Recommended Action */}
              <div className="p-4 rounded-xl border border-rose-500/40 bg-rose-950/20 space-y-1.5">
                <div className="text-xs font-bold uppercase tracking-wider text-rose-300">Prescribed Health Action</div>
                <p className="text-xs md:text-sm text-white/95 font-medium leading-relaxed">
                  {currentPersona.argusResponse.nextUsefulAction}
                </p>
              </div>

              {/* Questions for Doctor */}
              <div className="space-y-2 pt-2">
                <div className="text-xs font-bold uppercase tracking-wider text-white/50">
                  Doctor-Ready Appointment Questions (Bring to Clinic)
                </div>
                <div className="space-y-1.5">
                  {currentPersona.argusResponse.questionsForDoctor.map((q) => (
                    <div key={q} className="p-2.5 rounded-lg border border-white/5 bg-white/[0.02] text-xs text-white/85 flex items-start gap-2">
                      <Stethoscope className="h-3.5 w-3.5 text-rose-400 mt-0.5 shrink-0" />
                      <span>{q}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Affordable Care Navigation */}
              <div className="p-3.5 rounded-xl border border-white/10 bg-black/40 flex items-center justify-between text-xs">
                <div className="space-y-0.5">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">Affordable Care Navigation</div>
                  <div className="text-white/70">{currentPersona.argusResponse.affordableCareGuidance}</div>
                </div>
                <span className="text-[10px] font-mono text-emerald-300 bg-emerald-500/10 px-2 py-1 rounded shrink-0">
                  Verified Public Scheme
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: HEALTH ACTION ENGINE */}
      {activeTab === "action_engine" && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="rounded-2xl border border-white/10 bg-black/40 p-6 md:p-8 backdrop-blur-md space-y-6">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Zap className="h-5 w-5 text-rose-400" />
                <span>The 6-Step Health Action Engine</span>
              </h3>
              <p className="text-xs text-white/70 mt-1 max-w-2xl">
                Translating health information into appropriate, safe, and feasible action.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {HEALTH_ACTION_ENGINE_STEPS.map((step) => (
                <div
                  key={step.stepNumber}
                  className="rounded-xl border border-white/10 bg-white/[0.02] p-5 space-y-2 flex flex-col justify-between"
                >
                  <div className="space-y-1">
                    <span className="text-[10px] font-mono text-rose-400 font-bold">STEP {step.stepNumber}</span>
                    <h4 className="text-sm font-bold text-white">{step.stageName}</h4>
                    <p className="text-xs text-white/70 leading-relaxed">{step.description}</p>
                  </div>
                  <div className="pt-2 border-t border-white/5 text-[10px] font-mono text-emerald-300">
                    Audit: {step.actionableCheck}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: THE FREE ESSENTIAL LAYER */}
      {activeTab === "free_layer" && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="rounded-2xl border border-white/10 bg-black/40 p-6 md:p-8 backdrop-blur-md space-y-5">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-rose-400" />
                <span>Universal Health Access: The Free Essential Layer</span>
              </h3>
              <p className="text-xs text-white/70 mt-1 max-w-2xl">
                Safety and basic healthcare literacy should never be behind a paywall.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-5 rounded-xl border border-emerald-500/20 bg-emerald-950/10 space-y-3">
                <div className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                  100% Free For Everyone (Non-Negotiable)
                </div>
                <ul className="text-xs text-white/80 space-y-2 list-disc list-inside">
                  <li>Personal Health Profile (ABHA compatible)</li>
                  <li>Health literacy, jargon explanation, and lab report decoding</li>
                  <li>Red-flag safety warnings and clinical emergency triage</li>
                  <li>Medication reminders and structured doctor appointment preparation</li>
                  <li>Age-appropriate preventive screening alerts (ICMR/WHO)</li>
                  <li>Care navigation to public hospitals and generic pharmacies (Jan Aushadhi)</li>
                </ul>
              </div>

              <div className="p-5 rounded-xl border border-white/10 bg-white/[0.02] space-y-3">
                <div className="text-xs font-bold uppercase tracking-wider text-white/60">
                  Optional Paid Services (Sustains the Free Layer)
                </div>
                <ul className="text-xs text-white/70 space-y-2 list-disc list-inside">
                  <li>Advanced sports science & continuous glucose monitor (CGM) analytics</li>
                  <li>1-on-1 human executive longevity coach consultations</li>
                  <li>Institutional corporate wellness integration tiers</li>
                  <li>White-glove medical record concierge and physical file scanning</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
