import {
  ArrowRight,
  CheckCircle2,
  Target,
  XCircle,
  Zap,
} from "lucide-react";
import { useState } from "react";
import {
  DIAGNOSTIC_PRESETS,
  CAPABILITY_DOMAINS,
  INITIAL_LEARNING_TWIN,
} from "@/lib/lifemaxxing/capability/data";
import type {
  DiagnosticBottleneckType,
  CapabilityDomainId,
} from "@/lib/lifemaxxing/capability/types";

export function CapabilityDiscoveryModule() {
  const [twin] = useState(INITIAL_LEARNING_TWIN);
  const [selectedBottleneck, setSelectedBottleneck] = useState<DiagnosticBottleneckType>("conceptual_gaps");
  const [selectedCapabilityDomain, setSelectedCapabilityDomain] = useState<CapabilityDomainId>("analytical");
  const [activeSubTab, setActiveSubTab] = useState<"diagnose" | "accelerate" | "capability_genome" | "opportunity_graph">("diagnose");
  const [completedDays, setCompletedDays] = useState<Record<number, boolean>>({ 1: true });
  const [completedExperiments, setCompletedExperiments] = useState<Record<string, boolean>>({});

  const hypothesis = DIAGNOSTIC_PRESETS[selectedBottleneck];
  const activeDomain = CAPABILITY_DOMAINS[selectedCapabilityDomain];

  const toggleDayCompletion = (day: number) => {
    setCompletedDays((prev) => ({ ...prev, [day]: !prev[day] }));
  };

  const toggleExperiment = (id: string) => {
    setCompletedExperiments((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header Banner: From Lost Potential to Exceptional Capability */}
      <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-indigo-950/40 via-purple-950/20 to-black/80 p-6 md:p-8 backdrop-blur-xl relative overflow-hidden shadow-2xl">
        <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />
        <div className="relative z-10 space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-indigo-400/30 bg-indigo-500/10 px-3.5 py-1 text-xs font-semibold tracking-wide text-indigo-300">
            <Zap className="h-3.5 w-3.5 animate-pulse text-indigo-400" />
            <span>ARGUS Intelligence Layer · Knowledge → Competence → Opportunity</span>
          </div>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white">
                From Lost Potential to Demonstrated Capability
              </h2>
              <p className="mt-1 text-sm md:text-base text-white/70 max-w-3xl leading-relaxed">
                Exam rank measures performance in a single zero-sum competition, not the boundaries of human intelligence.
                ARGUS removes the friction between raw information and true mastery.
              </p>
            </div>

            {/* Quick Baseline Pill */}
            <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/40 p-3 backdrop-blur-md self-start md:self-auto">
              <div className="h-10 w-10 rounded-lg bg-amber-500/20 flex items-center justify-center text-amber-400 font-mono font-bold text-sm">
                AIR
              </div>
              <div>
                <div className="text-[11px] font-medium uppercase tracking-wider text-white/50">Current Simulated Baseline</div>
                <div className="text-sm font-bold text-white tabular-nums">{twin.baseline.currentRankEstimate}</div>
              </div>
            </div>
          </div>

          {/* Sub Navigation */}
          <div className="flex flex-wrap gap-2 pt-2 border-t border-white/10">
            {[
              { id: "diagnose", label: "1. ARGUS Diagnose" },
              { id: "accelerate", label: "2. ARGUS Accelerate" },
              { id: "capability_genome", label: "3. Capability Genome" },
              { id: "opportunity_graph", label: "4. Opportunity Graph" },
            ].map((tab) => {
              const isActive = activeSubTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveSubTab(tab.id as typeof activeSubTab)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium transition-all duration-200 cursor-pointer ${
                    isActive
                      ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 border border-indigo-400/40"
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

      {/* SUB-VIEW 1: ARGUS DIAGNOSE */}
      {activeSubTab === "diagnose" && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Step 1 & 2 Selector: Primary Bottleneck */}
            <div className="lg:col-span-1 rounded-2xl border border-white/10 bg-black/40 p-5 backdrop-blur-md space-y-4">
              <div className="flex items-center gap-2">
                <Target className="h-5 w-5 text-indigo-400" />
                <h3 className="text-base font-bold text-white">Select Student Bottleneck</h3>
              </div>
              <p className="text-xs text-white/60 leading-relaxed">
                ARGUS doesn&apos;t prescribe 12 hours of studying or another course subscription. It discovers what is stopping progression.
              </p>

              <div className="space-y-2">
                {(Object.keys(DIAGNOSTIC_PRESETS) as DiagnosticBottleneckType[]).map((key) => {
                  const b = DIAGNOSTIC_PRESETS[key];
                  const isSelected = selectedBottleneck === key;
                  return (
                    <button
                      key={key}
                      onClick={() => setSelectedBottleneck(key)}
                      className={`w-full text-left p-3 rounded-xl border text-xs transition-all cursor-pointer ${
                        isSelected
                          ? "border-indigo-500 bg-indigo-950/40 text-white font-semibold shadow-md shadow-indigo-950/50"
                          : "border-white/5 bg-white/[0.02] text-white/70 hover:bg-white/[0.06] hover:text-white"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span>{b.title}</span>
                        <span className="text-[10px] font-mono text-indigo-300 bg-indigo-500/20 px-1.5 py-0.5 rounded">
                          {b.confidenceScore}% conf
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Mock Test Score Telemetry Card */}
              <div className="pt-3 border-t border-white/10 space-y-2">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-white/50">Recent Mock Diagnostics</div>
                <div className="space-y-1.5">
                  {twin.baseline.mockTestScores.map((m) => (
                    <div key={m.testName} className="flex items-center justify-between text-xs bg-white/5 px-2.5 py-2 rounded-lg">
                      <div>
                        <div className="font-medium text-white/90">{m.testName}</div>
                        <div className="text-[10px] text-white/50 font-mono">{m.avgTimePerQuestionSec}s avg/q · {m.date}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-indigo-300 tabular-nums">{m.score}/{m.total}</div>
                        <div className="text-[10px] text-emerald-400 font-mono">{m.accuracyPercent}% acc</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Diagnostic Hypothesis & Intervention Card */}
            <div className="lg:col-span-2 space-y-6">
              <div className="rounded-2xl border border-indigo-500/30 bg-gradient-to-br from-indigo-950/30 via-black/60 to-black/80 p-6 backdrop-blur-md space-y-5 shadow-xl">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-4">
                  <span className="text-xs font-semibold uppercase tracking-wider text-indigo-300">Diagnostic Hypothesis</span>
                  <span className="text-xs font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2.5 py-1 rounded-full">
                    {hypothesis.confidenceScore}% Algorithm Confidence
                  </span>
                </div>

                <div>
                  <h4 className="text-xl font-bold text-white">{hypothesis.title}</h4>
                  <p className="mt-1 text-sm text-white/80 leading-relaxed">{hypothesis.description}</p>
                </div>

                {/* Evidence Signals */}
                <div className="space-y-2">
                  <div className="text-xs font-semibold uppercase tracking-wider text-white/50">Detected Behavioral Signals</div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {hypothesis.evidenceSignals.map((sig) => (
                      <div key={sig} className="flex items-start gap-2 rounded-lg border border-white/5 bg-white/[0.03] p-2.5 text-xs text-white/80">
                        <CheckCircle2 className="h-3.5 w-3.5 text-indigo-400 mt-0.5 shrink-0" />
                        <span>{sig}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Protocol comparison: What to DO vs STOP DOING */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                  <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-4 space-y-2">
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-400">
                      <Zap className="h-4 w-4" />
                      <span>Prescribed Learning Protocol</span>
                    </div>
                    <p className="text-xs text-white/90 leading-relaxed font-medium">
                      {hypothesis.prescribedProtocol}
                    </p>
                  </div>

                  <div className="rounded-xl border border-rose-500/30 bg-rose-950/20 p-4 space-y-2">
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-rose-400">
                      <XCircle className="h-4 w-4" />
                      <span>Stop Doing (Zero Yield)</span>
                    </div>
                    <p className="text-xs text-white/90 leading-relaxed font-medium">
                      {hypothesis.stopDoingProtocol}
                    </p>
                  </div>
                </div>

                {/* Proof of Improvement */}
                <div className="rounded-xl border border-amber-500/30 bg-amber-950/20 p-4 flex items-center justify-between gap-4">
                  <div className="space-y-0.5">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-amber-400">Proof of Improvement Standard</div>
                    <div className="text-xs text-white/80">{hypothesis.proofOfImprovement}</div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-[11px] font-mono text-amber-300 bg-amber-500/20 px-2 py-1 rounded">
                      Falsifiable Metric
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUB-VIEW 2: ARGUS ACCELERATE */}
      {activeSubTab === "accelerate" && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="rounded-2xl border border-white/10 bg-black/40 p-6 backdrop-blur-md space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-4">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Zap className="h-5 w-5 text-amber-400" />
                  <span>The 7-Day Minimum Effective Learning Pathway</span>
                </h3>
                <p className="text-xs text-white/70 mt-1">
                  Rooted in 2026 meta-analytic evidence: Spaced retrieval practice and error self-explanation outperform marathon lecture binges.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-white/60">
                  {Object.values(completedDays).filter(Boolean).length} of {twin.weeklyPlan.length} milestones verified
                </span>
              </div>
            </div>

            {/* Daily Schedule List */}
            <div className="space-y-3">
              {twin.weeklyPlan.map((step) => {
                const isDone = Boolean(completedDays[step.day]);
                return (
                  <div
                    key={step.day}
                    onClick={() => toggleDayCompletion(step.day)}
                    className={`rounded-xl border p-4 transition-all cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                      isDone
                        ? "border-emerald-500/30 bg-emerald-950/20 text-white/80"
                        : "border-white/10 bg-white/[0.02] hover:bg-white/[0.05] text-white"
                    }`}
                  >
                    <div className="flex items-start gap-3.5">
                      <button
                        className={`h-7 w-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                          isDone ? "bg-emerald-500 text-black" : "border border-white/20 bg-white/5 text-white/40"
                        }`}
                      >
                        {isDone ? <CheckCircle2 className="h-4 w-4" /> : <span className="font-mono text-xs font-bold">{step.day}</span>}
                      </button>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-white uppercase tracking-wider">Day {step.day}</span>
                          <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                            {step.phase.replace("_", " ")}
                          </span>
                          <span className="text-[10px] font-mono text-white/50">{step.timeBudgetMin} min budget</span>
                        </div>
                        <p className={`text-xs md:text-sm ${isDone ? "line-through text-white/50" : "text-white/90"}`}>
                          {step.activity}
                        </p>
                        <div className="text-[11px] text-amber-300/80 font-mono">
                          Target Standard: {step.metric}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end md:self-auto shrink-0">
                      <span className="text-[11px] font-mono px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-white/70">
                        {step.resourceType.replace("_", " ")}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* SUB-VIEW 3: CAPABILITY GENOME */}
      {activeSubTab === "capability_genome" && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="rounded-2xl border border-white/10 bg-black/40 p-6 backdrop-blur-md space-y-4">
            <div>
              <h3 className="text-lg font-bold text-white">ARGUS Capability Genome</h3>
              <p className="text-xs text-white/70 mt-1 max-w-2xl">
                A dynamic map of human potential inferred from observed performance, curiosity, and project deliverables—not a static horoscope.
              </p>
            </div>

            {/* Capability Domain Selector Tabs */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
              {(Object.keys(CAPABILITY_DOMAINS) as CapabilityDomainId[]).map((domId) => {
                const d = CAPABILITY_DOMAINS[domId];
                const isSelected = selectedCapabilityDomain === domId;
                return (
                  <button
                    key={domId}
                    onClick={() => setSelectedCapabilityDomain(domId)}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      isSelected
                        ? "border-indigo-500 bg-indigo-950/40 text-white shadow-md shadow-indigo-950/40"
                        : "border-white/5 bg-white/[0.02] text-white/70 hover:bg-white/[0.06] hover:text-white"
                    }`}
                  >
                    <div className="text-xs font-bold truncate">{d.label.split(" ")[0]}</div>
                    <div className="mt-1 flex items-baseline justify-between">
                      <span className="text-sm font-extrabold text-indigo-300 tabular-nums">{d.score}</span>
                      <span className="text-[9px] font-mono text-white/40">{d.confidence}% conf</span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Active Domain Detail & Experiments */}
            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5 space-y-5">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-white/10 pb-4">
                <div>
                  <h4 className="text-base font-bold text-white">{activeDomain.label}</h4>
                  <p className="text-xs text-white/70">{activeDomain.tagline}</p>
                </div>
                <div className="flex items-center gap-2">
                  {activeDomain.keyStrengths.map((str) => (
                    <span key={str} className="text-[10px] font-medium px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-white/80">
                      {str}
                    </span>
                  ))}
                </div>
              </div>

              {/* Experiments */}
              <div className="space-y-3">
                <div className="text-xs font-bold uppercase tracking-wider text-white/50">
                  Recommended Discovery Experiments (Low Friction, High Signal)
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {activeDomain.experiments.map((exp) => {
                    const isCompleted = Boolean(completedExperiments[exp.id]);
                    return (
                      <div
                        key={exp.id}
                        className={`rounded-xl border p-4 flex flex-col justify-between space-y-3 transition-all ${
                          isCompleted
                            ? "border-emerald-500/40 bg-emerald-950/20"
                            : "border-white/10 bg-black/30 hover:border-white/20"
                        }`}
                      >
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300">
                              {exp.timeCommitmentMin} min
                            </span>
                            <span className="text-[10px] font-mono text-white/50">{exp.difficulty}</span>
                          </div>
                          <div className="text-xs font-bold text-white">{exp.title}</div>
                          <p className="text-[11px] text-white/70 leading-relaxed">{exp.shortDescription}</p>
                        </div>

                        <div className="pt-2 border-t border-white/5 space-y-2">
                          <div className="text-[10px] text-amber-300/80 font-mono">Deliverable: {exp.deliverable}</div>
                          <button
                            onClick={() => toggleExperiment(exp.id)}
                            className={`w-full py-1.5 px-3 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                              isCompleted
                                ? "bg-emerald-500 text-black"
                                : "bg-white/10 text-white hover:bg-white/20"
                            }`}
                          >
                            {isCompleted ? "Experiment Logged" : "Log Deliverable"}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUB-VIEW 4: THE OPPORTUNITY GRAPH */}
      {activeSubTab === "opportunity_graph" && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="rounded-2xl border border-white/10 bg-black/40 p-6 backdrop-blur-md space-y-4">
            <div>
              <h3 className="text-lg font-bold text-white">The Opportunity Graph: Parallel Career Frontiers</h3>
              <p className="text-xs text-white/70 mt-1 max-w-2xl">
                Not a recommendation to abandon medicine, but a deliberate expansion of possibilities.
                Maintains the <strong>Commitment Path</strong> while carving 2–3 hours/week for the <strong>Exploration Path</strong>.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {twin.opportunityTracks.map((track) => (
                <div
                  key={track.id}
                  className="rounded-xl border border-white/10 bg-gradient-to-br from-white/[0.03] to-white/[0.01] p-5 space-y-4 flex flex-col justify-between hover:border-indigo-500/40 transition-all"
                >
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                        {track.parallelMode.replace("_", " ")}
                      </span>
                      <span className="text-[10px] font-mono text-white/50">{track.estimatedHoursPerWeek} hrs/wk</span>
                    </div>

                    <h4 className="text-sm font-bold text-white">{track.title}</h4>
                    <p className="text-xs text-white/70 leading-relaxed">{track.description}</p>
                  </div>

                  <div className="pt-3 border-t border-white/10 space-y-2">
                    <button className="w-full py-2 px-3 rounded-lg bg-indigo-600/80 hover:bg-indigo-600 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer">
                      <span>Launch Sandbox</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
