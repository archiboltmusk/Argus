import {
  Shield,
  TrendingUp,
  Unlock,
  UserCheck,
} from "lucide-react";
import { useState } from "react";
import {
  BOTTLENECK_TAXONOMY,
  THREE_FLAGSHIP_BREAKTHROUGHS,
  DEMO_IMPACT_METRICS,
} from "@/lib/lifemaxxing/flourishing/data";
import type {
  BottleneckCategory,
  BreakthroughJourney,
  InterventionType,
} from "@/lib/lifemaxxing/flourishing/types";

export function FlourishingBreakthroughModule() {
  const [selectedJourneyId, setSelectedJourneyId] = useState<string>("journey-aspirant");
  const [customGoal, setCustomGoal] = useState("");
  const [customObstacle, setCustomObstacle] = useState("");
  const [customOutput, setCustomOutput] = useState<BreakthroughJourney | null>(null);
  const [activeTab, setActiveTab] = useState<"breakthroughs" | "resolver" | "impact_metrics">("breakthroughs");
  const [completedActions, setCompletedActions] = useState<Record<string, boolean>>({});

  const activeJourney =
    THREE_FLAGSHIP_BREAKTHROUGHS.find((j) => j.id === selectedJourneyId) ??
    THREE_FLAGSHIP_BREAKTHROUGHS[0];

  const toggleAction = (id: string) => {
    setCompletedActions((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleCustomBreakthrough = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customGoal.trim() || !customObstacle.trim()) return;

    const obsLower = customObstacle.toLowerCase();
    let detectedCat: BottleneckCategory = "execution";
    let intType: InterventionType = "simplify";

    if (obsLower.includes("forget") || obsLower.includes("concept") || obsLower.includes("understand")) {
      detectedCat = "knowledge";
      intType = "teach";
    } else if (obsLower.includes("time") || obsLower.includes("busy") || obsLower.includes("schedule")) {
      detectedCat = "time";
      intType = "simplify";
    } else if (obsLower.includes("money") || obsLower.includes("cost") || obsLower.includes("expensive")) {
      detectedCat = "money";
      intType = "simplify";
    } else if (obsLower.includes("internet") || obsLower.includes("power") || obsLower.includes("noise") || obsLower.includes("room")) {
      detectedCat = "environment";
      intType = "support_escalate";
    } else if (obsLower.includes("scared") || obsLower.includes("confidence") || obsLower.includes("impostor")) {
      detectedCat = "confidence_exposure";
      intType = "teach";
    }

    const isInfra = detectedCat === "environment" || detectedCat === "money" || detectedCat === ("systems" as any);

    const generated: BreakthroughJourney = {
      id: `custom-${Date.now()}`,
      personaName: "You (Personal Session)",
      personaRole: "Sovereign Human",
      goal: customGoal,
      obstacleDescription: customObstacle,
      identifiedCategory: detectedCat,
      bindingConstraint: `Binding Friction: Primary barrier is in [${detectedCat.replace("_", " ").toUpperCase()}] domain.`,
      isInfrastructureBarrier: isInfra,
      interventionType: intType,
      interventionTitle: `ARGUS Prescription: ${intType.toUpperCase()} protocol targeted at the single limiting constraint.`,
      smallestAction: "Execute 1 non-negotiable 15-minute micro-action before changing your environment or purchasing additional tools.",
      safetyCheck: {
        isAppropriate: true,
        isAffordable: true,
        isPermitted: true,
        rationale: "Respects user autonomy; focuses on immediate friction reduction without dependency creation.",
      },
      freedomImpact: {
        hoursReclaimedPerWeek: 5.0,
        skillGained: "First-principles bottleneck decomposition",
        obstacleResolutionPercent: 70,
      },
      falsifiableAdaptationTest: "Measure whether 3 consecutive days of execution can be maintained with zero friction.",
    };

    setCustomOutput(generated);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Hero Banner: The Flourishing Engine */}
      <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-emerald-950/40 via-teal-950/20 to-black/80 p-6 md:p-8 backdrop-blur-xl relative overflow-hidden shadow-2xl">
        <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />
        <div className="relative z-10 space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-3.5 py-1 text-xs font-semibold tracking-wide text-emerald-300">
            <Unlock className="h-3.5 w-3.5 text-emerald-400" />
            <span>ARGUS · The Human Flourishing Engine</span>
          </div>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white">
                Unlock the Extraordinary in Everyone
              </h2>
              <p className="mt-1 text-sm md:text-base text-white/70 max-w-3xl leading-relaxed">
                An intelligence system dedicated to helping humans overcome avoidable limitations and build lives of freedom, capability, connection, and meaning.
                Never confusing a meaningful life with a constantly optimized one.
              </p>
            </div>

            {/* Impact Quick Pill */}
            <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/40 p-3 backdrop-blur-md shrink-0">
              <div className="h-10 w-10 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-400 font-mono font-bold text-sm">
                +14h
              </div>
              <div>
                <div className="text-[11px] font-medium uppercase tracking-wider text-white/50">Weekly Freedom Gained</div>
                <div className="text-xs font-bold text-emerald-300">Measured in Real Life</div>
              </div>
            </div>
          </div>

          {/* Sub Navigation */}
          <div className="flex flex-wrap gap-2 pt-2 border-t border-white/10">
            {[
              { id: "breakthroughs", label: "1. ARGUS Breakthrough" },
              { id: "resolver", label: "2. Bottleneck Resolver" },
              { id: "impact_metrics", label: "3. Freedom Dashboard" },
            ].map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as typeof activeTab)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium transition-all duration-200 cursor-pointer ${
                    isActive
                      ? "bg-emerald-600 text-white shadow-lg shadow-emerald-600/30 border border-emerald-400/40"
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

      {/* TAB 1: ARGUS BREAKTHROUGH FLAGSHIP JOURNEYS */}
      {activeTab === "breakthroughs" && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left: Journey Selector & Custom Form */}
            <div className="lg:col-span-1 space-y-4">
              <div className="rounded-2xl border border-white/10 bg-black/40 p-5 backdrop-blur-md space-y-3">
                <div className="text-xs font-bold uppercase tracking-wider text-white/50">Flagship Test Journeys</div>
                <div className="space-y-2">
                  {THREE_FLAGSHIP_BREAKTHROUGHS.map((j) => {
                    const isSelected = selectedJourneyId === j.id;
                    return (
                      <button
                        key={j.id}
                        onClick={() => {
                          setSelectedJourneyId(j.id);
                          setCustomOutput(null);
                        }}
                        className={`w-full text-left p-3 rounded-xl border text-xs transition-all cursor-pointer ${
                          isSelected && !customOutput
                            ? "border-emerald-500 bg-emerald-950/40 text-white font-semibold shadow-md shadow-emerald-950/40"
                            : "border-white/5 bg-white/[0.02] text-white/70 hover:bg-white/[0.06] hover:text-white"
                        }`}
                      >
                        <div className="font-bold text-white/95">{j.personaName} · {j.personaRole.split("(")[0]}</div>
                        <div className="text-[11px] text-white/50 truncate mt-0.5">{j.goal}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Enter Your Own Goal & Obstacle */}
              <div className="rounded-2xl border border-white/10 bg-black/40 p-5 backdrop-blur-md space-y-3">
                <div className="text-xs font-bold uppercase tracking-wider text-white/50">Enter Custom Breakthrough</div>
                <form onSubmit={handleCustomBreakthrough} className="space-y-3">
                  <div>
                    <label className="text-[10px] font-mono uppercase text-white/40">1. Desired Outcome</label>
                    <input
                      type="text"
                      placeholder="e.g. Master statistics, transition careers..."
                      value={customGoal}
                      onChange={(e) => setCustomGoal(e.target.value)}
                      className="w-full mt-1 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-mono uppercase text-white/40">2. Current Obstacle</label>
                    <textarea
                      rows={2}
                      placeholder="e.g. Forgetting formulas, erratic hospital duty..."
                      value={customObstacle}
                      onChange={(e) => setCustomObstacle(e.target.value)}
                      className="w-full mt-1 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-emerald-500 resize-none"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-all cursor-pointer shadow-md shadow-emerald-600/30"
                  >
                    Resolve Binding Constraint
                  </button>
                </form>
              </div>
            </div>

            {/* Right: The Breakthrough Resolution Record */}
            <div className="lg:col-span-2 space-y-6">
              {(() => {
                const display = customOutput ?? activeJourney;
                const isDone = Boolean(completedActions[display.id]);

                return (
                  <div className="rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-950/30 via-black/60 to-black/80 p-6 backdrop-blur-md space-y-5 shadow-xl">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-4">
                      <div>
                        <span className="text-xs font-mono uppercase text-emerald-300">
                          Breakthrough Architecture · {display.personaName} ({display.personaRole})
                        </span>
                        <h3 className="text-lg font-bold text-white mt-0.5">{display.goal}</h3>
                      </div>

                      <span className="text-xs font-mono uppercase px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        {display.interventionType.toUpperCase()}
                      </span>
                    </div>

                    {/* Stated Obstacle vs Binding Constraint */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-4 rounded-xl border border-white/5 bg-white/[0.02] space-y-1">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-rose-400">Surface Obstacle</div>
                        <p className="text-xs text-white/80 leading-relaxed">{display.obstacleDescription}</p>
                      </div>

                      <div className="p-4 rounded-xl border border-amber-500/20 bg-amber-950/10 space-y-1">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-amber-400">Binding Constraint Discovered</div>
                        <p className="text-xs text-white/90 leading-relaxed font-semibold">{display.bindingConstraint}</p>
                      </div>
                    </div>

                    {/* Prescribed Intervention & Smallest Action */}
                    <div className="space-y-3">
                      <div className="text-xs font-bold uppercase tracking-wider text-white/50">The Smallest Useful Action (Consent Granted)</div>
                      <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-950/20 flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="space-y-1">
                          <div className="text-xs font-bold text-emerald-300">{display.interventionTitle}</div>
                          <p className="text-xs text-white/90 leading-relaxed">{display.smallestAction}</p>
                        </div>

                        <button
                          onClick={() => toggleAction(display.id)}
                          className={`shrink-0 py-2 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                            isDone
                              ? "bg-emerald-500 text-black shadow-md shadow-emerald-500/40"
                              : "bg-white/10 hover:bg-white/20 text-white"
                          }`}
                        >
                          {isDone ? "Action Verified ✓" : "Commit to Action"}
                        </button>
                      </div>
                    </div>

                    {/* Safety & Feasibility Check */}
                    <div className="p-4 rounded-xl border border-white/10 bg-black/40 space-y-2">
                      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-white/60">
                        <Shield className="h-4 w-4 text-emerald-400" />
                        <span>Safety, Affordability & Consent Verification</span>
                      </div>
                      <p className="text-xs text-white/70 leading-relaxed">{display.safetyCheck.rationale}</p>
                    </div>

                    {/* Falsifiable Adaptation Test */}
                    <div className="p-3.5 rounded-xl border border-indigo-500/20 bg-indigo-950/20 flex items-center justify-between gap-3 text-xs">
                      <div className="space-y-0.5">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-indigo-400">Falsifiable Measure of Success</div>
                        <div className="text-white/80">{display.falsifiableAdaptationTest}</div>
                      </div>
                      <span className="text-[10px] font-mono text-indigo-300 bg-indigo-500/20 px-2 py-1 rounded shrink-0">
                        No Guesswork
                      </span>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: UNIVERSAL BOTTLENECK RESOLVER (12 CATEGORIES) */}
      {activeTab === "resolver" && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="rounded-2xl border border-white/10 bg-black/40 p-6 backdrop-blur-md space-y-4">
            <div>
              <h3 className="text-lg font-bold text-white">The 12 Universal Bottleneck Categories</h3>
              <p className="text-xs text-white/70 mt-1 max-w-2xl">
                Most human obstacles fall into a finite taxonomy. Crucially, ARGUS distinguishes internal volition gaps from external infrastructure/system barriers.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {(Object.keys(BOTTLENECK_TAXONOMY) as BottleneckCategory[]).map((catKey) => {
                const b = BOTTLENECK_TAXONOMY[catKey];
                return (
                  <div
                    key={catKey}
                    className="rounded-xl border border-white/10 bg-white/[0.02] p-4 space-y-3 hover:border-emerald-500/30 transition-all flex flex-col justify-between"
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-white">{b.label}</span>
                        <span
                          className={`text-[9px] font-mono uppercase px-2 py-0.5 rounded ${
                            b.isStructuralOrExternal
                              ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                              : "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30"
                          }`}
                        >
                          {b.isStructuralOrExternal ? "External" : "Internal"}
                        </span>
                      </div>

                      <div className="text-[11px] text-white/50 italic font-mono">{b.coreQuestion}</div>
                      <p className="text-xs text-white/80 leading-relaxed">{b.engineAction}</p>
                    </div>

                    <div className="pt-2 border-t border-white/5 flex items-center justify-between">
                      <span className="text-[10px] text-white/40 uppercase font-mono">Primary Mode:</span>
                      <span className="text-[10px] font-mono text-emerald-300 bg-emerald-500/20 px-2 py-0.5 rounded">
                        {b.primaryIntervention.toUpperCase()}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: FREEDOM GAINED IMPACT DASHBOARD */}
      {activeTab === "impact_metrics" && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="rounded-2xl border border-white/10 bg-black/40 p-6 backdrop-blur-md space-y-6">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-emerald-400" />
                <span>ARGUS Impact Dashboard: Measuring Freedom Gained</span>
              </h3>
              <p className="text-xs text-white/70 mt-1 max-w-2xl">
                The ultimate product metric is verified, user-valued improvement in real life—never engagement captured, screen time, or dependence on AI.
              </p>
            </div>

            {/* 4 Pillars of Real-World Liberty */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-5 space-y-1">
                <div className="text-3xl font-extrabold text-emerald-400 font-mono tabular-nums">
                  {DEMO_IMPACT_METRICS.weeklyTimeReclaimedHours}h
                </div>
                <div className="text-xs font-bold text-white">Weekly Time Reclaimed</div>
                <p className="text-[11px] text-white/60">Hours saved from administrative trivia and redundant courses.</p>
              </div>

              <div className="rounded-xl border border-indigo-500/30 bg-indigo-950/20 p-5 space-y-1">
                <div className="text-3xl font-extrabold text-indigo-400 font-mono tabular-nums">
                  {DEMO_IMPACT_METRICS.newSkillsDemonstratedCount}
                </div>
                <div className="text-xs font-bold text-white">New Skills Demonstrated</div>
                <p className="text-[11px] text-white/60">Verified via real deliverables and unassisted problem solving.</p>
              </div>

              <div className="rounded-xl border border-amber-500/30 bg-amber-950/20 p-5 space-y-1">
                <div className="text-3xl font-extrabold text-amber-400 font-mono tabular-nums">
                  {DEMO_IMPACT_METRICS.obstaclesResolvedCount}
                </div>
                <div className="text-xs font-bold text-white">Obstacles Resolved</div>
                <p className="text-[11px] text-white/60">Binding constraints permanently dismantled with evidence.</p>
              </div>

              <div className="rounded-xl border border-teal-500/30 bg-teal-950/20 p-5 space-y-1">
                <div className="text-3xl font-extrabold text-teal-400 font-mono tabular-nums">
                  {DEMO_IMPACT_METRICS.opportunitiesExploredCount}
                </div>
                <div className="text-xs font-bold text-white">Opportunities Explored</div>
                <p className="text-[11px] text-white/60">Parallel frontiers investigated without jeopardizing duty.</p>
              </div>
            </div>

            {/* The Mentor's Rule: Self-Reliance Score */}
            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5 space-y-3">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <UserCheck className="h-5 w-5 text-emerald-400" />
                  <span className="text-sm font-bold text-white">The Self-Reliance Principle (Anti-Dependency)</span>
                </div>
                <span className="text-xs font-mono text-emerald-400 bg-emerald-500/20 px-2.5 py-1 rounded-full">
                  {DEMO_IMPACT_METRICS.dependencyReductionScore}% Autonomy Index
                </span>
              </div>
              <p className="text-xs text-white/80 leading-relaxed">
                A true mentor gradually makes the student independent. ARGUS intentionally teaches you how to plan, reason, evaluate evidence, and make decisions without requiring AI approval for everything.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
