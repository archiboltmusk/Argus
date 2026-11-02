import {
  AlertCircle,
  Layers,
  Target,
  Zap,
} from "lucide-react";
import { useState } from "react";
import {
  TWENTY_SECTOR_AUDIT,
  BENCHMARK_PROBLEM_RECORDS,
} from "@/lib/lifemaxxing/solver/data";
import type { UniversalProblemRecord } from "@/lib/lifemaxxing/solver/types";

export function UniversalSolverModule() {
  const [selectedRecordId, setSelectedRecordId] = useState<string>("prob-firstgen-engineer");
  const [sectorFilter, setSectorFilter] = useState<"all" | "gaps_partial">("all");
  const [activeTab, setActiveTab] = useState<"solver" | "sector_audit" | "levels">("solver");

  const currentRecord: UniversalProblemRecord =
    BENCHMARK_PROBLEM_RECORDS.find((r) => r.id === selectedRecordId) ??
    BENCHMARK_PROBLEM_RECORDS[0];

  const filteredSectors = TWENTY_SECTOR_AUDIT.filter((s) => {
    if (sectorFilter === "gaps_partial") return s.status === "gap" || s.status === "partial";
    return true;
  });

  const designedCount = TWENTY_SECTOR_AUDIT.filter((s) => s.status === "designed").length;
  const partialCount = TWENTY_SECTOR_AUDIT.filter((s) => s.status === "partial").length;
  const gapCount = TWENTY_SECTOR_AUDIT.filter((s) => s.status === "gap").length;

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Hero Banner: Universal Problem Solver */}
      <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-slate-950/60 via-zinc-950/40 to-black/90 p-6 md:p-8 backdrop-blur-xl relative overflow-hidden shadow-2xl">
        <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />
        <div className="relative z-10 space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-indigo-400/30 bg-indigo-500/10 px-3.5 py-1 text-xs font-semibold tracking-wide text-indigo-300">
            <Target className="h-3.5 w-3.5 text-indigo-400" />
            <span>ARGUS Universal Problem Solver · End-to-End Problem Resolution</span>
          </div>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white">
                Universal Problem-Solving Architecture
              </h2>
              <p className="mt-1 text-sm md:text-base text-white/70 max-w-3xl leading-relaxed">
                You could list 100 sectors and still fail to help a single person.
                ARGUS replaces fragmented chatbot advice with end-to-end bottleneck diagnosis, resource mobilization, and honest real-world verification.
              </p>
            </div>

            {/* Audit Status Pill */}
            <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/50 p-3 backdrop-blur-md shrink-0">
              <div className="text-center px-2">
                <div className="text-base font-extrabold text-emerald-400 font-mono">{designedCount}</div>
                <div className="text-[10px] text-white/50 uppercase">Designed</div>
              </div>
              <div className="text-center px-2 border-l border-white/10">
                <div className="text-base font-extrabold text-amber-400 font-mono">{partialCount}</div>
                <div className="text-[10px] text-white/50 uppercase">Partial</div>
              </div>
              <div className="text-center px-2 border-l border-white/10">
                <div className="text-base font-extrabold text-rose-400 font-mono">{gapCount}</div>
                <div className="text-[10px] text-white/50 uppercase">Gaps</div>
              </div>
            </div>
          </div>

          {/* Sub Navigation */}
          <div className="flex flex-wrap gap-2 pt-2 border-t border-white/10">
            {[
              { id: "solver", label: "1. Universal Problem Record", icon: Target, desc: "Standardized problem resolution" },
              { id: "sector_audit", label: "2. 20-Sector Coverage Audit", icon: Layers, desc: "Designed vs Partial vs Gaps" },
              { id: "levels", label: "3. 4 Capability Levels", icon: Zap, desc: "Understand, Guide, Execute, Verify" },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as typeof activeTab)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium transition-all duration-200 cursor-pointer ${
                    isActive
                      ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 border border-indigo-400/40"
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

      {/* TAB 1: STANDARDIZED PROBLEM RECORD */}
      {activeTab === "solver" && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Record Selector */}
            <div className="lg:col-span-1 rounded-2xl border border-white/10 bg-black/40 p-6 backdrop-blur-md space-y-4">
              <div className="text-xs font-bold uppercase tracking-wider text-white/50">
                Benchmark Problem Cases
              </div>

              <div className="space-y-2">
                {BENCHMARK_PROBLEM_RECORDS.map((rec) => {
                  const isSel = selectedRecordId === rec.id;
                  return (
                    <button
                      key={rec.id}
                      onClick={() => setSelectedRecordId(rec.id)}
                      className={`w-full text-left p-3.5 rounded-xl border text-xs transition-all cursor-pointer ${
                        isSel
                          ? "border-indigo-500 bg-indigo-950/40 text-white font-semibold shadow-md shadow-indigo-950/40"
                          : "border-white/5 bg-white/[0.02] text-white/70 hover:bg-white/[0.06] hover:text-white"
                      }`}
                    >
                      <div className="font-bold text-white">{rec.title}</div>
                      <div className="text-[11px] text-white/50 truncate mt-0.5">{rec.personaContext}</div>
                      <div className="mt-1 flex items-center justify-between text-[10px] font-mono">
                        <span className="text-indigo-300 uppercase">Level: {rec.recommendedIntervention.level}</span>
                        <span className={`px-1.5 py-0.5 rounded ${
                          rec.urgency === "critical" ? "bg-rose-500/20 text-rose-300" : "bg-white/10 text-white/60"
                        }`}>
                          {rec.urgency} urgency
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Known Facts & Constraints */}
              <div className="pt-3 border-t border-white/10 space-y-2 text-xs">
                <div className="text-[11px] font-bold uppercase tracking-wider text-white/50">Binding Constraints</div>
                <ul className="text-white/80 space-y-1 list-disc list-inside">
                  {currentRecord.bindingConstraints.map((c) => (
                    <li key={c}>{c}</li>
                  ))}
                </ul>

                <div className="text-[11px] font-bold uppercase tracking-wider text-amber-400 pt-2">Missing Information Identified</div>
                <ul className="text-white/70 space-y-1 list-disc list-inside">
                  {currentRecord.missingInformation.map((m) => (
                    <li key={m}>{m}</li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Problem Resolution Plan */}
            <div className="lg:col-span-2 rounded-2xl border border-indigo-500/30 bg-gradient-to-br from-indigo-950/20 via-black/60 to-black/80 p-6 md:p-8 backdrop-blur-md space-y-5 shadow-2xl">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
                <div>
                  <span className="text-xs font-mono uppercase text-indigo-300 font-bold">
                    Standardized Problem Record · Resolution Plan
                  </span>
                  <h3 className="text-lg font-bold text-white mt-0.5">{currentRecord.title}</h3>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-3 py-1 rounded-full uppercase">
                    Capability Level: {currentRecord.recommendedIntervention.level}
                  </span>
                </div>
              </div>

              {/* Desired Outcome */}
              <div className="p-4 rounded-xl border border-white/5 bg-white/[0.02] space-y-1">
                <span className="text-[10px] uppercase font-mono text-emerald-400 font-bold">Desired Outcome</span>
                <p className="text-xs md:text-sm text-white/95 leading-relaxed font-semibold">
                  {currentRecord.desiredOutcome}
                </p>
              </div>

              {/* Recommended Action & Mobilized Resources */}
              <div className="p-4 rounded-xl border border-indigo-500/40 bg-indigo-950/20 space-y-2">
                <div className="text-xs font-bold uppercase tracking-wider text-indigo-300">
                  Recommended Intervention ({currentRecord.recommendedIntervention.actionTitle})
                </div>
                <p className="text-xs text-white/90 leading-relaxed font-medium">
                  {currentRecord.recommendedIntervention.actionDetails}
                </p>

                <div className="pt-2 flex flex-wrap gap-1.5">
                  {currentRecord.recommendedIntervention.mobilizedResources.map((res) => (
                    <span key={res} className="text-[10px] font-mono px-2.5 py-1 rounded-lg bg-black/40 border border-white/10 text-white/80">
                      📦 {res}
                    </span>
                  ))}
                </div>
              </div>

              {/* Limits Honestly Recognized */}
              <div className="p-4 rounded-xl border border-rose-500/30 bg-rose-950/15 space-y-1 text-xs">
                <div className="text-[10px] font-bold uppercase tracking-wider text-rose-300 flex items-center gap-1.5">
                  <AlertCircle className="h-3.5 w-3.5" />
                  <span>Limits Honestly Recognized (What ARGUS Cannot Do Alone)</span>
                </div>
                <p className="text-white/80 leading-relaxed">{currentRecord.recommendedIntervention.limitsRecognized}</p>
              </div>

              {/* Falsifiable Success Verification */}
              <div className="p-3.5 rounded-xl border border-white/10 bg-black/40 flex items-center justify-between text-xs">
                <div className="space-y-0.5">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">Falsifiable Success Criteria</div>
                  <div className="text-white/80">{currentRecord.successCriteria.falsifiableProof}</div>
                </div>
                <span className="text-[10px] font-mono text-emerald-300 bg-emerald-500/10 px-2 py-1 rounded shrink-0">
                  Review in {currentRecord.successCriteria.reviewIntervalDays} days
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: 20-SECTOR COVERAGE AUDIT */}
      {activeTab === "sector_audit" && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="rounded-2xl border border-white/10 bg-black/40 p-6 md:p-8 backdrop-blur-md space-y-5">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-4">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Layers className="h-5 w-5 text-indigo-400" />
                  <span>ARGUS 20-Sector Coverage Audit</span>
                </h3>
                <p className="text-xs text-white/70 mt-1 max-w-2xl">
                  Honest audit of current conceptual coverage across 20 life domains. 11 designed, 3 partial, 6 explicit gaps to address.
                </p>
              </div>

              {/* Filter */}
              <div className="flex items-center gap-1 rounded-xl border border-white/10 bg-black/60 p-1">
                <button
                  onClick={() => setSectorFilter("all")}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    sectorFilter === "all" ? "bg-indigo-600 text-white" : "text-white/60 hover:text-white"
                  }`}
                >
                  All 20 Sectors
                </button>
                <button
                  onClick={() => setSectorFilter("gaps_partial")}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    sectorFilter === "gaps_partial" ? "bg-indigo-600 text-white" : "text-white/60 hover:text-white"
                  }`}
                >
                  Only Gaps & Partial (9)
                </button>
              </div>
            </div>

            {/* Sector Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredSectors.map((s) => (
                <div
                  key={s.id}
                  className="rounded-xl border border-white/10 bg-white/[0.02] p-4 space-y-2 flex flex-col justify-between"
                >
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white">{s.name}</span>
                      <span
                        className={`text-[9px] font-mono uppercase px-2 py-0.5 rounded font-bold ${
                          s.status === "designed"
                            ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                            : s.status === "partial"
                              ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                              : "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                        }`}
                      >
                        {s.statusLabel}
                      </span>
                    </div>
                    <p className="text-[11px] text-white/70 leading-relaxed">
                      <strong>Current:</strong> {s.currentCapabilities}
                    </p>
                  </div>

                  {s.roadmapGap !== "None" && (
                    <div className="pt-2 border-t border-white/5 text-[10px] font-mono text-amber-300/80">
                      Roadmap: {s.roadmapGap}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: THE 4 CAPABILITY LEVELS */}
      {activeTab === "levels" && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="rounded-2xl border border-white/10 bg-black/40 p-6 md:p-8 backdrop-blur-md space-y-5">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Zap className="h-5 w-5 text-indigo-400" />
                <span>The 4 Realistic Levels of ARGUS Capability</span>
              </h3>
              <p className="text-xs text-white/70 mt-1 max-w-2xl">
                Recognizing what can be automated versus what requires physical infrastructure, human coordination, or professional care.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                {
                  lvl: "01",
                  title: "Understand",
                  desc: "Recognize what the user is truly trying to achieve and what critical information is missing before recommending action.",
                  audit: "Prevents superficial generic advice by identifying unstated constraints.",
                },
                {
                  lvl: "02",
                  title: "Guide",
                  desc: "Recommend credible options, transparently explain opportunity costs and trade-offs, and produce an actionable step.",
                  audit: "Differentiates between low-yield busywork and high-yield strategic moves.",
                },
                {
                  lvl: "03",
                  title: "Execute",
                  desc: "Use permitted tools, coordinate workflows, and complete authorized tasks without black-box autonomy.",
                  audit: "Requires explicit user consent; respects regulatory and security boundaries.",
                },
                {
                  lvl: "04",
                  title: "Verify",
                  desc: "Confirm whether the desired real-world outcome actually occurred. If not, change the approach rather than blaming the user.",
                  audit: "Enforces falsifiable milestones over vanity engagement metrics.",
                },
              ].map((item) => (
                <div key={item.lvl} className="p-5 rounded-xl border border-white/10 bg-white/[0.02] space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-indigo-400">LEVEL {item.lvl}</span>
                    <h4 className="text-sm font-bold text-white">{item.title}</h4>
                  </div>
                  <p className="text-xs text-white/80 leading-relaxed">{item.desc}</p>
                  <p className="text-[10px] font-mono text-emerald-300 pt-1">Standard: {item.audit}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
