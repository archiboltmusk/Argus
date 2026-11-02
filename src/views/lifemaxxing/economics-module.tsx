import {
  Coins,
  Database,
  Layers,
  PiggyBank,
  } from "lucide-react";
import { useState } from "react";
import {
  FIVE_TIER_COMPUTE_PYRAMID,
  ONE_MILLION_USERS_SIMULATION,
  INTELLIGENCE_ASSETS,
} from "@/lib/lifemaxxing/economics/data";
import type { ComputeTier } from "@/lib/lifemaxxing/economics/types";

export function EconomicsAffordabilityModule() {
  const [selectedTier, setSelectedTier] = useState<ComputeTier>(1);
  const [activeTab, setActiveTab] = useState<"simulator" | "pyramid" | "assets" | "funding">("simulator");

  const tierDetail = FIVE_TIER_COMPUTE_PYRAMID.find((t) => t.tier === selectedTier) ?? FIVE_TIER_COMPUTE_PYRAMID[1];

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Hero Banner: Why AI Is Expensive & How ARGUS Makes It Affordable */}
      <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-emerald-950/40 via-teal-950/20 to-black/80 p-6 md:p-8 backdrop-blur-xl relative overflow-hidden shadow-2xl">
        <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />
        <div className="relative z-10 space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-3.5 py-1 text-xs font-semibold tracking-wide text-emerald-300">
            <Coins className="h-3.5 w-3.5 text-emerald-400" />
            <span>ARGUS Economics · Making Intelligence Affordable for Everyone</span>
          </div>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white">
                Intelligence Per Rupee of Compute
              </h2>
              <p className="mt-1 text-sm md:text-base text-white/70 max-w-3xl leading-relaxed">
                A child learning fractions, a doctor organizing duty shifts, and a banker evaluating loan default risks should not consume the same computing power.
                ARGUS replaces brute-force chatbot calls with a 5-tier cost-aware routing network.
              </p>
            </div>

            {/* Stanford HAI 280x Drop Badge */}
            <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/40 p-3.5 backdrop-blur-md shrink-0">
              <div className="h-10 w-10 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-400 font-mono font-bold text-sm">
                280×
              </div>
              <div>
                <div className="text-[11px] font-medium uppercase tracking-wider text-white/50">Stanford HAI 2025 Index</div>
                <div className="text-xs font-bold text-white">$20/M tokens (2022) → $0.07 (2024)</div>
              </div>
            </div>
          </div>

          {/* Sub Navigation */}
          <div className="flex flex-wrap gap-2 pt-2 border-t border-white/10">
            {[
              { id: "simulator", label: "1. 1,000,000 Users Simulator", icon: Coins, desc: "Modeled $1.2M → $140K/mo" },
              { id: "pyramid", label: "2. 5-Tier Compute Pyramid", icon: Layers, desc: "Normal code to frontier reasoning" },
              { id: "assets", label: "3. The 3 Intelligence Assets", icon: Database, desc: "Global, Solution, Personal" },
              { id: "funding", label: "4. The 3-Tier Funding Model", icon: PiggyBank, desc: "Universal Free Layer" },
            ].map((tab) => {
              const Icon = tab.icon;
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
                  <Icon className="h-4 w-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* TAB 1: 1 MILLION USERS SIMULATOR */}
      {activeTab === "simulator" && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="rounded-2xl border border-white/10 bg-black/40 p-6 md:p-8 backdrop-blur-md space-y-6">
            <div className="border-b border-white/10 pb-4">
              <span className="text-xs font-mono uppercase text-emerald-400 font-bold">Inference Cost Modeling</span>
              <h3 className="text-xl font-bold text-white mt-0.5">
                Serving 1,000,000 People: The Economic Shift
              </h3>
              <p className="text-xs md:text-sm text-white/70 mt-1 max-w-3xl leading-relaxed">
                Hypothetical simulation based on 5 requests/user/day (5,000,000 daily queries) with 90% routed to inexpensive tiers ($0.00015) and 10% to advanced reasoning ($0.008).
              </p>
            </div>

            {/* Visual Head-to-Head Comparison */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="p-6 rounded-2xl border border-rose-500/30 bg-rose-950/20 space-y-2">
                <div className="text-xs font-bold uppercase tracking-wider text-rose-300">
                  Brute-Force Chatbot Architecture
                </div>
                <div className="text-3xl font-extrabold text-white font-mono tabular-nums">
                  ${ONE_MILLION_USERS_SIMULATION.allAdvancedMonthlyCostUsd.toLocaleString()}/mo
                </div>
                <p className="text-xs text-white/70 leading-relaxed pt-1">
                  If all 5,000,000 daily queries are blindly piped to a frontier LLM at $0.008/request. Unaffordable for public benefit.
                </p>
              </div>

              <div className="p-6 rounded-2xl border border-emerald-500/40 bg-emerald-950/30 space-y-2 shadow-xl shadow-emerald-950/30">
                <div className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                  ARGUS Cost-Aware Smart Routing
                </div>
                <div className="text-3xl font-extrabold text-emerald-300 font-mono tabular-nums">
                  ${ONE_MILLION_USERS_SIMULATION.argusRoutedMonthlyCostUsd.toLocaleString()}/mo
                </div>
                <p className="text-xs text-white/70 leading-relaxed pt-1">
                  90% routed to deterministic math, cached solutions, or small 9B models ($0.00015) + 10% to advanced reasoning.
                </p>
              </div>

              <div className="p-6 rounded-2xl border border-indigo-500/30 bg-indigo-950/20 space-y-2 flex flex-col justify-between">
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-indigo-300">
                    Net Impact & Capital Retained
                  </div>
                  <div className="text-3xl font-extrabold text-indigo-300 font-mono tabular-nums">
                    {ONE_MILLION_USERS_SIMULATION.modeledInferenceReductionPercent}% Lower
                  </div>
                  <p className="text-xs text-white/70 leading-relaxed pt-1">
                    Saves <strong>${(ONE_MILLION_USERS_SIMULATION.annualCapitalSavedUsd / 1000000).toFixed(1)} Million / year</strong>, funding free access for rural students and low-income families.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: 5-TIER COMPUTE PYRAMID */}
      {activeTab === "pyramid" && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Tier Selector */}
            <div className="lg:col-span-1 rounded-2xl border border-white/10 bg-black/40 p-6 backdrop-blur-md space-y-3">
              <div className="text-xs font-bold uppercase tracking-wider text-white/50">The 5 Compute Tiers</div>
              <div className="space-y-2">
                {FIVE_TIER_COMPUTE_PYRAMID.map((t) => {
                  const isSel = selectedTier === t.tier;
                  return (
                    <button
                      key={t.tier}
                      onClick={() => setSelectedTier(t.tier)}
                      className={`w-full text-left p-3.5 rounded-xl border text-xs transition-all cursor-pointer ${
                        isSel
                          ? "border-emerald-500 bg-emerald-950/40 text-white font-semibold shadow-md shadow-emerald-950/40"
                          : "border-white/5 bg-white/[0.02] text-white/70 hover:bg-white/[0.06] hover:text-white"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold">{t.label}: {t.categoryName.split("&")[0]}</span>
                        <span className="text-[10px] font-mono text-emerald-400">${t.costPerMillionTokensUsd}/M</span>
                      </div>
                      <div className="text-[10px] text-white/50 font-mono mt-0.5">Latency ~{t.typicalLatencyMs}ms</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Selected Tier Breakdown */}
            <div className="lg:col-span-2 rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-950/20 via-black/60 to-black/80 p-6 md:p-8 backdrop-blur-md space-y-5 shadow-2xl">
              <div className="border-b border-white/10 pb-4">
                <span className="text-xs font-mono uppercase text-emerald-400 font-bold">{tierDetail.label}</span>
                <h3 className="text-xl font-bold text-white mt-0.5">{tierDetail.categoryName}</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="p-4 rounded-xl border border-white/5 bg-white/[0.02] space-y-1">
                  <span className="text-[10px] uppercase font-mono text-emerald-400 font-bold">Typical Use Cases</span>
                  <ul className="text-white/80 space-y-1 list-disc list-inside pt-1">
                    {tierDetail.primaryUseCases.map((u) => (
                      <li key={u}>{u}</li>
                    ))}
                  </ul>
                </div>

                <div className="p-4 rounded-xl border border-white/5 bg-white/[0.02] space-y-1">
                  <span className="text-[10px] uppercase font-mono text-cyan-400 font-bold">Sample Stack & Tools</span>
                  <ul className="text-white/80 space-y-1 list-disc list-inside pt-1">
                    {tierDetail.sampleTechnologies.map((st) => (
                      <li key={st}>{st}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: THE 3 INTELLIGENCE ASSETS */}
      {activeTab === "assets" && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="rounded-2xl border border-white/10 bg-black/40 p-6 md:p-8 backdrop-blur-md space-y-5">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Database className="h-5 w-5 text-emerald-400" />
                <span>The 3 Intellectual Assets of ARGUS</span>
              </h3>
              <p className="text-xs text-white/70 mt-1 max-w-2xl">
                The moat isn&apos;t an interchangeable model checkpoint. The moat is verified knowledge, reusable problem solutions, and strictly sovereign personal data.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-5 rounded-xl border border-white/10 bg-white/[0.02] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white">Global Knowledge Graph</span>
                  <span className="text-[9px] font-mono uppercase bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded">
                    Public Open
                  </span>
                </div>
                <p className="text-xs text-white/70 leading-relaxed">{INTELLIGENCE_ASSETS.globalKnowledgeGraph.description}</p>
                <div className="text-[10px] font-mono text-white/50 pt-2 border-t border-white/5">
                  Examples: {INTELLIGENCE_ASSETS.globalKnowledgeGraph.examples.join("; ")}
                </div>
              </div>

              <div className="p-5 rounded-xl border border-white/10 bg-white/[0.02] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white">Solution Graph</span>
                  <span className="text-[9px] font-mono uppercase bg-cyan-500/20 text-cyan-300 px-2 py-0.5 rounded">
                    Shared Reusable
                  </span>
                </div>
                <p className="text-xs text-white/70 leading-relaxed">{INTELLIGENCE_ASSETS.reusableSolutionGraph.description}</p>
                <div className="text-[10px] font-mono text-white/50 pt-2 border-t border-white/5">
                  Examples: {INTELLIGENCE_ASSETS.reusableSolutionGraph.examples.join("; ")}
                </div>
              </div>

              <div className="p-5 rounded-xl border border-amber-500/30 bg-amber-950/10 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white">Personal Learning Graph</span>
                  <span className="text-[9px] font-mono uppercase bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded">
                    100% Sovereign
                  </span>
                </div>
                <p className="text-xs text-white/70 leading-relaxed">{INTELLIGENCE_ASSETS.personalLearningGraph.description}</p>
                <div className="text-[10px] font-mono text-white/50 pt-2 border-t border-white/5">
                  Examples: {INTELLIGENCE_ASSETS.personalLearningGraph.examples.join("; ")}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: THE 3-TIER FUNDING MODEL */}
      {activeTab === "funding" && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="rounded-2xl border border-white/10 bg-black/40 p-6 md:p-8 backdrop-blur-md space-y-5">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <PiggyBank className="h-5 w-5 text-emerald-400" />
                <span>The 3 Funding & Deployment Mechanisms</span>
              </h3>
              <p className="text-xs text-white/70 mt-1 max-w-2xl">
                Making AI accessible without commercializing sensitive human struggles or personal health data.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-5 rounded-xl border border-emerald-500/30 bg-emerald-950/20 space-y-2">
                <div className="text-xs font-bold uppercase tracking-wider text-emerald-400">1. Universal Free Layer</div>
                <p className="text-xs text-white/80 leading-relaxed">
                  Essential learning, foundational guidance, public resource discovery, and emergency safety triage. 100% free forever in regional languages.
                </p>
              </div>

              <div className="p-5 rounded-xl border border-blue-500/30 bg-blue-950/20 space-y-2">
                <div className="text-xs font-bold uppercase tracking-wider text-blue-300">2. Institutional Funding</div>
                <p className="text-xs text-white/80 leading-relaxed">
                  Schools, universities, public district health programs, and non-profits fund cohort access to spread costs across institutions.
                </p>
              </div>

              <div className="p-5 rounded-xl border border-white/10 bg-white/[0.02] space-y-2">
                <div className="text-xs font-bold uppercase tracking-wider text-white/70">3. Optional Enterprise Tiers</div>
                <p className="text-xs text-white/80 leading-relaxed">
                  High-volume professional research, intensive autonomous coding agents, and bespoke corporate analytics cross-subsidize the public tier.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
