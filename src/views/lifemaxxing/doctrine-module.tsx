import {
  CheckCircle2,
  Compass,
  Scroll,
  ShieldAlert,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import { useState } from "react";
import {
  ARGUS_PRINCIPLES,
  SOVEREIGNTY_SAFEGUARDS,
  CONSTITUTIONAL_STRESS_CASES,
} from "@/lib/lifemaxxing/doctrine/data";
import type { SovereignScenarioCase } from "@/lib/lifemaxxing/doctrine/types";

export function DoctrineConstitutionModule() {
  const [selectedCaseId, setSelectedCaseId] = useState<string>("sleep_sacrificing_student");
  const [activeTab, setActiveTab] = useState<"constitution" | "principles" | "sovereignty" | "cases">("constitution");

  const activeCase: SovereignScenarioCase =
    CONSTITUTIONAL_STRESS_CASES.find((c) => c.id === selectedCaseId) ??
    CONSTITUTIONAL_STRESS_CASES[0];

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Banner: The ARGUS Constitution */}
      <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-amber-950/40 via-stone-950/30 to-black/90 p-6 md:p-8 backdrop-blur-xl relative overflow-hidden shadow-2xl">
        <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />
        <div className="relative z-10 space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-400/30 bg-amber-500/10 px-3.5 py-1 text-xs font-semibold tracking-wide text-amber-300">
            <Scroll className="h-3.5 w-3.5 text-amber-400" />
            <span>The ARGUS Constitution & Doctrine</span>
          </div>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white">
                Human Flourishing Intelligence
              </h2>
              <p className="mt-1 text-sm md:text-base text-white/70 max-w-3xl leading-relaxed">
                Protect human agency. Expand human capability. Reduce preventable suffering. Restore meaningful connection.
                Whoever claims the authority to save humanity can eventually justify controlling it—ARGUS must never cross that line.
              </p>
            </div>

            {/* Core Credo Pill */}
            <div className="rounded-xl border border-amber-500/30 bg-amber-950/30 p-3.5 backdrop-blur-md max-w-sm">
              <div className="text-[10px] font-bold uppercase tracking-wider text-amber-400">The Central Creed</div>
              <p className="text-xs text-white/90 italic font-serif leading-relaxed mt-1">
                &ldquo;We will not save humanity by controlling people. We will help humanity flourish by making wisdom, knowledge, opportunity, and meaningful human connection accessible to everyone.&rdquo;
              </p>
            </div>
          </div>

          {/* Sub Navigation */}
          <div className="flex flex-wrap gap-2 pt-2 border-t border-white/10">
            {[
              { id: "constitution", label: "1. The 1-Page Constitution" },
              { id: "principles", label: "2. The 5 Principles" },
              { id: "sovereignty", label: "3. Sovereignty Protocol" },
              { id: "cases", label: "4. Constitutional Stress-Tests" },
            ].map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as typeof activeTab)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium transition-all duration-200 cursor-pointer ${
                    isActive
                      ? "bg-amber-600 text-white shadow-lg shadow-amber-600/30 border border-amber-400/40"
                      : "bg-white/5 text-white/70 hover:bg-white/10 hover:text-white border border-white/5"
                  }`}
                >
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* TAB 1: ONE-PAGE CONSTITUTION OVERVIEW */}
      {activeTab === "constitution" && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="rounded-2xl border border-white/10 bg-black/40 p-6 md:p-8 backdrop-blur-md space-y-6">
            <div className="border-b border-white/10 pb-4">
              <span className="text-xs font-mono uppercase tracking-widest text-amber-400">Preamble & Sovereign Compact</span>
              <h3 className="text-xl font-bold text-white mt-1">The ARGUS Constitution</h3>
              <p className="text-xs md:text-sm text-white/70 mt-1 max-w-3xl leading-relaxed">
                ARGUS is built on the conviction that the measure of an intelligence system is not the obedience it commands,
                nor the dependency it creates, but the freedom and authentic capability it unlocks in human beings outside the system.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="p-5 rounded-xl border border-emerald-500/20 bg-emerald-950/10 space-y-2">
                <div className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>What ARGUS Exists to Protect</span>
                </div>
                <ul className="text-xs text-white/80 space-y-2 list-disc list-inside leading-relaxed">
                  <li>Human cognitive sovereignty and freedom of choice</li>
                  <li>Deep, un-fragmented human attention & biological recovery</li>
                  <li>First-principles understanding and real competence</li>
                  <li>Genuine in-person friendship, kinship, and community</li>
                </ul>
              </div>

              <div className="p-5 rounded-xl border border-amber-500/20 bg-amber-950/10 space-y-2">
                <div className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-2">
                  <Compass className="h-4 w-4" />
                  <span>What ARGUS May Influence</span>
                </div>
                <ul className="text-xs text-white/80 space-y-2 list-disc list-inside leading-relaxed">
                  <li>Transparent learning pathways and active recall drills</li>
                  <li>Circadian energy calibration and schedule de-confliction</li>
                  <li>Evidence-backed discovery of parallel career frontiers</li>
                  <li>Micro-actions to overcome activation friction and doubt</li>
                </ul>
              </div>

              <div className="p-5 rounded-xl border border-rose-500/20 bg-rose-950/10 space-y-2">
                <div className="text-xs font-bold uppercase tracking-wider text-rose-400 flex items-center gap-2">
                  <XCircle className="h-4 w-4" />
                  <span>What ARGUS Must NEVER Control</span>
                </div>
                <ul className="text-xs text-white/80 space-y-2 list-disc list-inside leading-relaxed">
                  <li>Never decide life paths or coerce decisions on user&apos;s behalf</li>
                  <li>Never replace real human intimacy with synthetic AI affection</li>
                  <li>Never lock devices, censor peaceful dissent, or trap attention</li>
                  <li>Never assign intrinsic human worth based on ranks or wealth</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: THE 5 FOUNDATIONAL PRINCIPLES */}
      {activeTab === "principles" && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {ARGUS_PRINCIPLES.map((p) => (
              <div
                key={p.id}
                className="rounded-2xl border border-white/10 bg-black/40 p-6 backdrop-blur-md space-y-3.5 flex flex-col justify-between hover:border-amber-500/40 transition-all"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-base font-bold text-white">{p.title}</h4>
                    <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      Core Principle
                    </span>
                  </div>
                  <p className="text-xs text-white/90 leading-relaxed font-medium">{p.statement}</p>
                </div>

                <div className="space-y-2 pt-2 border-t border-white/5">
                  <div className="text-[11px] text-emerald-300 font-mono">
                    <strong className="text-white/60 uppercase">Implementation:</strong> {p.implementationRule}
                  </div>
                  <div className="text-[11px] text-rose-300 font-mono">
                    <strong className="text-white/60 uppercase">Violation Boundary:</strong> {p.violationBoundary}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: THE HUMAN SOVEREIGNTY PROTOCOL */}
      {activeTab === "sovereignty" && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="rounded-2xl border border-white/10 bg-black/40 p-6 backdrop-blur-md space-y-4">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-amber-400" />
                <span>The Human Sovereignty Protocol</span>
              </h3>
              <p className="text-xs text-white/70 mt-1 max-w-2xl">
                Fundamental safeguards that even the most advanced autonomous agents in ARGUS cannot bypass.
              </p>
            </div>

            <div className="space-y-3">
              {SOVEREIGNTY_SAFEGUARDS.map((s, idx) => (
                <div
                  key={s.clause}
                  className="rounded-xl border border-white/10 bg-white/[0.02] p-4 flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="h-5 w-5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-mono flex items-center justify-center font-bold">
                        {idx + 1}
                      </span>
                      <h4 className="text-xs font-bold text-white">{s.clause}</h4>
                    </div>
                    <p className="text-xs text-white/70 leading-relaxed pl-7">{s.description}</p>
                  </div>

                  <div className="shrink-0 pl-7 md:pl-0">
                    <span className="text-[11px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-lg">
                      {s.hardConstraint}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: CONSTITUTIONAL STRESS-TEST CASES */}
      {activeTab === "cases" && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Case Selector */}
            <div className="lg:col-span-1 space-y-3">
              <div className="text-xs font-bold uppercase tracking-wider text-white/50">Stress-Test Cases</div>
              <div className="space-y-2">
                {CONSTITUTIONAL_STRESS_CASES.map((c) => {
                  const isSelected = selectedCaseId === c.id;
                  return (
                    <button
                      key={c.id}
                      onClick={() => setSelectedCaseId(c.id)}
                      className={`w-full text-left p-3.5 rounded-xl border text-xs transition-all cursor-pointer ${
                        isSelected
                          ? "border-amber-500 bg-amber-950/40 text-white font-semibold shadow-md shadow-amber-950/40"
                          : "border-white/5 bg-white/[0.02] text-white/70 hover:bg-white/[0.06] hover:text-white"
                      }`}
                    >
                      <div className="font-bold text-white">{c.title}</div>
                      <div className="text-[11px] text-white/50 truncate mt-0.5">{c.perilousImpulse}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Case Evaluation Detail */}
            <div className="lg:col-span-2 rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-950/20 via-black/60 to-black/80 p-6 backdrop-blur-md space-y-5 shadow-xl">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-4">
                <div>
                  <span className="text-xs font-mono uppercase text-amber-300">Constitutional Evaluation</span>
                  <h3 className="text-lg font-bold text-white mt-0.5">{activeCase.title}</h3>
                </div>
                <span className="text-xs font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2.5 py-1 rounded-full">
                  Sovereignty Protocol Intact ✓
                </span>
              </div>

              {/* Context & Perilous Impulse */}
              <div className="space-y-2">
                <div className="text-xs text-white/80 leading-relaxed">
                  <strong className="text-white">Situation:</strong> {activeCase.userContext}
                </div>
                <div className="p-3 rounded-lg border border-rose-500/20 bg-rose-950/15 text-xs text-rose-300 font-medium">
                  <strong>Perilous Impulse:</strong> {activeCase.perilousImpulse}
                </div>
              </div>

              {/* Prescribed Guidance Decomposition */}
              <div className="space-y-3 pt-2">
                <div className="text-xs font-bold uppercase tracking-wider text-white/50">The ARGUS Guidance Matrix</div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  <div className="p-3.5 rounded-xl border border-white/5 bg-white/[0.03] space-y-1">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-amber-400">1. Truth over Comfort</div>
                    <p className="text-white/80 leading-relaxed">{activeCase.argusPrescribedGuidance.truthAspect}</p>
                  </div>

                  <div className="p-3.5 rounded-xl border border-white/5 bg-white/[0.03] space-y-1">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">2. Compassion & De-escalation</div>
                    <p className="text-white/80 leading-relaxed">{activeCase.argusPrescribedGuidance.compassionAspect}</p>
                  </div>

                  <div className="p-3.5 rounded-xl border border-white/5 bg-white/[0.03] space-y-1">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-indigo-400">3. Freedom & Autonomy Preserved</div>
                    <p className="text-white/80 leading-relaxed">{activeCase.argusPrescribedGuidance.autonomyPreserved}</p>
                  </div>

                  <div className="p-3.5 rounded-xl border border-white/5 bg-white/[0.03] space-y-1">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-teal-400">4. Real-World Connection Primacy</div>
                    <p className="text-white/80 leading-relaxed">{activeCase.argusPrescribedGuidance.realWorldConnectionAction}</p>
                  </div>
                </div>
              </div>

              {/* Hard Forbidden Actions */}
              <div className="p-4 rounded-xl border border-rose-500/30 bg-rose-950/20 space-y-1.5">
                <div className="text-xs font-bold uppercase tracking-wider text-rose-400 flex items-center gap-1.5">
                  <ShieldAlert className="h-4 w-4" />
                  <span>Hard Forbidden Actions (Constitutional Barriers)</span>
                </div>
                <ul className="text-xs text-white/80 space-y-1 list-disc list-inside">
                  {activeCase.forbiddenActions.map((act) => (
                    <li key={act}>{act}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
