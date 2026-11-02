import {
  CheckCircle2,
  Database,
  Layers,
  Network,
  Zap,
} from "lucide-react";
import { useState } from "react";
import {
  VERIFIED_SOLUTIONS_LIBRARY,
  INFERENCE_DISTRIBUTION_SIMULATION,
  routeRequest,
} from "@/lib/lifemaxxing/router/data";
import type { RoutingDecision } from "@/lib/lifemaxxing/router/types";

export function CollectiveRouterModule() {
  const [testQuery, setTestQuery] = useState(
    "How does vomiting cause hypochloremic metabolic alkalosis?",
  );
  const [decision, setDecision] = useState<RoutingDecision>(() =>
    routeRequest("How does vomiting cause hypochloremic metabolic alkalosis?"),
  );
  const [activeTab, setActiveTab] = useState<"simulator" | "solution_library" | "levels">("simulator");

  const handleTestRoute = (q: string) => {
    setTestQuery(q);
    setDecision(routeRequest(q));
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Hero Banner: Intelligence Infrastructure */}
      <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-blue-950/40 via-indigo-950/20 to-black/80 p-6 md:p-8 backdrop-blur-xl relative overflow-hidden shadow-2xl">
        <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-blue-500/10 blur-3xl pointer-events-none" />
        <div className="relative z-10 space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-400/30 bg-blue-500/10 px-3.5 py-1 text-xs font-semibold tracking-wide text-blue-300">
            <Network className="h-3.5 w-3.5 text-blue-400" />
            <span>ARGUS Collective Intelligence · 6-Tier Intelligence Router</span>
          </div>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white">
                Intelligence Infrastructure, Not Another Jarvis
              </h2>
              <p className="mt-1 text-sm md:text-base text-white/70 max-w-3xl leading-relaxed">
                Never spend expensive frontier AI where deterministic computation, an on-device model, or a reusable verified solution will suffice.
                ARGUS gets faster, smarter, and cheaper with every student question solved.
              </p>
            </div>

            {/* Savings Pill */}
            <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/40 p-3.5 backdrop-blur-md shrink-0">
              <div className="h-10 w-10 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-400 font-mono font-bold text-sm">
                -95%
              </div>
              <div>
                <div className="text-[11px] font-medium uppercase tracking-wider text-white/50">Blended Compute Cost</div>
                <div className="text-xs font-bold text-emerald-300">94.8% Operational Savings</div>
              </div>
            </div>
          </div>

          {/* Sub Navigation */}
          <div className="flex flex-wrap gap-2 pt-2 border-t border-white/10">
            {[
              { id: "simulator", label: "1. Interactive Router Simulator", icon: Zap, desc: "Test query routing" },
              { id: "solution_library", label: "2. Verified Solution Library", icon: Database, desc: "Solve recurring problems once" },
              { id: "levels", label: "3. The 6 Levels of Intelligence", icon: Layers, desc: "Cost & Tier Architecture" },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as typeof activeTab)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium transition-all duration-200 cursor-pointer ${
                    isActive
                      ? "bg-blue-600 text-white shadow-lg shadow-blue-600/30 border border-blue-400/40"
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

      {/* TAB 1: INTERACTIVE ROUTER SIMULATOR */}
      {activeTab === "simulator" && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Query Input & Presets */}
            <div className="lg:col-span-1 rounded-2xl border border-white/10 bg-black/40 p-6 backdrop-blur-md space-y-4">
              <div className="text-xs font-bold uppercase tracking-wider text-white/50">Test Intelligence Routing</div>

              <div className="space-y-2">
                <label className="text-[10px] font-mono uppercase text-white/40">Enter Any Human Query</label>
                <textarea
                  rows={3}
                  value={testQuery}
                  onChange={(e) => handleTestRoute(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-xs text-white placeholder-white/30 focus:outline-none focus:border-blue-500 resize-none font-mono"
                />
              </div>

              {/* Preset Quick Chips */}
              <div className="space-y-1.5 pt-2">
                <span className="text-[10px] font-mono uppercase text-white/40">Sample Test Prompts</span>
                <div className="space-y-1">
                  {[
                    "Calculate hours left until NEET exam deadline on Dec 15",
                    "How does vomiting cause hypochloremic metabolic alkalosis?",
                    "Summarize my feeling today: exhausted and unmotivated",
                    "Personalize my chemistry study plan based on recent 54% mock",
                    "Analyze opportunity cost trade-off between residency duty and ₹10 Cr startup",
                    "I feel like dying, chest pain and cannot breathe",
                  ].map((preset) => (
                    <button
                      key={preset}
                      onClick={() => handleTestRoute(preset)}
                      className="w-full text-left p-2 rounded-lg bg-white/[0.02] hover:bg-white/[0.06] text-[11px] text-white/70 hover:text-white truncate transition-all cursor-pointer border border-white/5"
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Router Dispatch Result */}
            <div className="lg:col-span-2 rounded-2xl border border-blue-500/30 bg-gradient-to-br from-blue-950/20 via-black/60 to-black/80 p-6 md:p-8 backdrop-blur-md space-y-5 shadow-2xl">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
                <div>
                  <span className="text-xs font-mono uppercase text-blue-300 font-bold">
                    Router Execution Policy
                  </span>
                  <h3 className="text-lg font-bold text-white mt-0.5">{decision.tierLabel}</h3>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono bg-white/5 text-white/80 border border-white/10 px-3 py-1 rounded-full">
                    Latency: {decision.latencyMs}ms
                  </span>
                  <span className="text-xs font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-3 py-1 rounded-full">
                    Cost: ${decision.estimatedCostPerQueryUsd.toFixed(4)}
                  </span>
                </div>
              </div>

              {/* Target Engine & Technique */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="p-4 rounded-xl border border-white/5 bg-white/[0.02] space-y-1">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-blue-300">Target Serving Engine</div>
                  <div className="font-bold text-white">{decision.targetEngine}</div>
                  <p className="text-[11px] text-white/60 font-mono mt-0.5">{decision.technique}</p>
                </div>

                <div className="p-4 rounded-xl border border-white/5 bg-white/[0.02] space-y-1">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-amber-300">Efficiency Rationale</div>
                  <p className="text-white/85 leading-relaxed">{decision.rationale}</p>
                </div>
              </div>

              {/* Reusable Asset Matched Box */}
              {decision.reusableAssetMatched && (
                <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-950/20 space-y-1.5">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-400">
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Verified Reusable Solution Graph Match</span>
                  </div>
                  <div className="text-xs font-bold text-white">{decision.reusableAssetMatched}</div>
                  <p className="text-[11px] text-white/80 leading-relaxed">
                    Zero frontier LLM tokens billed. Returning peer-reviewed explanation, diagnostic algorithm, and falsifiable retest set directly from cache.
                  </p>
                </div>
              )}

              {/* 10,000 Daily Requests Simulator */}
              <div className="pt-3 border-t border-white/10 space-y-3">
                <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-white/50">
                  <span>10,000 Daily Requests Workload Distribution</span>
                  <span className="font-mono text-emerald-400">
                    ${INFERENCE_DISTRIBUTION_SIMULATION.totalBlendedCostUsd}/day (vs ${INFERENCE_DISTRIBUTION_SIMULATION.allFrontierCostUsd}/day)
                  </span>
                </div>

                <div className="h-3 w-full rounded-full bg-white/10 overflow-hidden flex">
                  <div style={{ width: "45%" }} className="bg-emerald-500" title="Rules & Cache (45%)" />
                  <div style={{ width: "25%" }} className="bg-teal-500" title="Verified Solutions (25%)" />
                  <div style={{ width: "12%" }} className="bg-cyan-500" title="On-Device (12%)" />
                  <div style={{ width: "13%" }} className="bg-blue-500" title="Small Server 9B (13%)" />
                  <div style={{ width: "4.5%" }} className="bg-indigo-500" title="Frontier Reasoning (4.5%)" />
                  <div style={{ width: "0.5%" }} className="bg-rose-500" title="Human Triage (0.5%)" />
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 text-[10px] font-mono text-white/70">
                  <div><span className="text-emerald-400">● 45%</span> Level 0 ($0)</div>
                  <div><span className="text-teal-400">● 25%</span> Level 1 ($0.25)</div>
                  <div><span className="text-cyan-400">● 12%</span> Level 2 ($0)</div>
                  <div><span className="text-blue-400">● 13%</span> Level 3 ($2.6)</div>
                  <div><span className="text-indigo-400">● 4.5%</span> Level 4 ($18)</div>
                  <div><span className="text-rose-400">● 0.5%</span> Level 5 ($0)</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: VERIFIED SOLUTION LIBRARY */}
      {activeTab === "solution_library" && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="rounded-2xl border border-white/10 bg-black/40 p-6 md:p-8 backdrop-blur-md space-y-5">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Database className="h-5 w-5 text-blue-400" />
                <span>The Verified Solution Library: Solve Recurring Problems Once</span>
              </h3>
              <p className="text-xs text-white/70 mt-1 max-w-3xl leading-relaxed">
                When 100,000 students struggle with the exact same conceptual barrier, conventional AI generates 100,000 independent token streams.
                ARGUS creates an indexed, validated learning asset with evidence of efficacy, serving future students at near-zero incremental cost.
              </p>
            </div>

            <div className="space-y-4">
              {VERIFIED_SOLUTIONS_LIBRARY.map((sol) => (
                <div
                  key={sol.id}
                  className="rounded-xl border border-white/10 bg-white/[0.02] p-5 space-y-3 hover:border-blue-500/40 transition-all"
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-white/5 pb-2">
                    <div>
                      <span className="text-[10px] font-mono uppercase text-blue-400 font-bold">{sol.topic}</span>
                      <h4 className="text-sm font-bold text-white">{sol.misconceptionAddressed}</h4>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full">
                        Served {sol.usageCount.toLocaleString()} times
                      </span>
                      <span className="text-[11px] font-mono text-cyan-300 bg-cyan-500/10 border border-cyan-500/20 px-2.5 py-1 rounded-full">
                        Saved ${sol.costSavedUsd.toFixed(1)}
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-white/80 leading-relaxed font-mono">
                    Deliverable: {sol.reusableDeliverable}
                  </p>

                  <div className="text-[11px] text-amber-300/90 font-mono">
                    Mastery Proof: {sol.falsifiableMasteryProof}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: THE 6 LEVELS OF INTELLIGENCE */}
      {activeTab === "levels" && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="rounded-2xl border border-white/10 bg-black/40 p-6 md:p-8 backdrop-blur-md space-y-5">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Layers className="h-5 w-5 text-blue-400" />
                <span>The 6 Levels of Intelligence (Arranged by Cost & Reliability)</span>
              </h3>
              <p className="text-xs text-white/70 mt-1 max-w-2xl">
                The language model is interchangeable. ARGUS&apos;s routing architecture, verified solution graph, and evidence pipeline are the product.
              </p>
            </div>

            <div className="space-y-3">
              {[
                {
                  lvl: 0,
                  name: "Rules & Conventional Software",
                  cost: "$0.00 / query",
                  example: "Deadlines, hours calculation, calendar reminders, timetable arithmetic.",
                  why: "High-end LLMs hallucinate dates and charge tokens for basic math.",
                },
                {
                  lvl: 1,
                  name: "Verified Reusable Solutions",
                  cost: "$0.0001 / query",
                  example: "Peer-reviewed explanations for recurring medical, mathematical, and coding misconceptions.",
                  why: "Solve once with evidence; reuse 10,000 times without generating duplicate tokens.",
                },
                {
                  lvl: 2,
                  name: "On-Device Small Models (Edge AI)",
                  cost: "$0.00 (Zero server load)",
                  example: "Local intent classification, sensitive diary journaling, quick summarization (Qwen 0.8B/2B).",
                  why: "100% on-device privacy, zero cloud bandwidth, ultra-low latency.",
                },
                {
                  lvl: 3,
                  name: "Small Server Models (4B–9B)",
                  cost: "$0.0012 / query",
                  example: "Personalized tutoring, Socratic dialogue, adaptive revision pacing (Qwen 9B / Flash).",
                  why: "Delivers 95% of frontier quality for daily tutoring at 1/30th the operational cost.",
                },
                {
                  lvl: 4,
                  name: "Large Frontier Reasoning Models",
                  cost: "$0.035 / query",
                  example: "High-stakes trade-offs, multi-goal conflicts, complex multi-variable life strategy.",
                  why: "Reserved strictly for queries requiring multi-step deep reasoning.",
                },
                {
                  lvl: 5,
                  name: "Specialist Tools & Qualified Human Care",
                  cost: "Specialized routing",
                  example: "Acute psychological crisis, clinical emergencies, regulated financial and legal disputes.",
                  why: "WHO & Constitutional Boundary: AI must never simulate clinical crisis intervention.",
                },
              ].map((item) => (
                <div
                  key={item.lvl}
                  className="rounded-xl border border-white/10 bg-white/[0.02] p-4 flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="h-5 w-5 rounded-md bg-blue-500/20 text-blue-300 text-xs font-mono font-bold flex items-center justify-center">
                        L{item.lvl}
                      </span>
                      <h4 className="text-xs font-bold text-white">{item.name}</h4>
                      <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
                        {item.cost}
                      </span>
                    </div>
                    <p className="text-xs text-white/80 pl-7">{item.example}</p>
                    <p className="text-[11px] text-white/50 pl-7 font-mono">{item.why}</p>
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
