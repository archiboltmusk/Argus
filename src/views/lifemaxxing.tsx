import React, { useState } from "react";
import {
  Compass,
  FileCheck,
  ShieldAlert,
  GraduationCap,
  Sparkles,
  HeartPulse,
  Workflow,
  Network,
  Cpu,
  Hourglass,
  Scale,
  ShieldCheck,
  Target,
  Search,
  ExternalLink,
  BarChart3
} from "lucide-react";

// Sub-modules
import { ArgusNowModule as NowModule } from "./lifemaxxing/now-module";
import { FlourishingBreakthroughModule as FlourishingModule } from "./lifemaxxing/flourishing-module";
import { DoctrineConstitutionModule as DoctrineModule } from "./lifemaxxing/doctrine-module";
import { EquityOpportunityModule as EquityModule } from "./lifemaxxing/equity-module";
import { CapabilityDiscoveryModule as CapabilityModule } from "./lifemaxxing/capability-module";
import { HealthIntelligenceModule as HealthModule } from "./lifemaxxing/health-module";
import { UniversalSolverModule as SolverModule } from "./lifemaxxing/solver-module";
import { KnowledgeMeshModule as MeshModule } from "./lifemaxxing/mesh-module";
import { EconomicsAffordabilityModule as EconomicsModule } from "./lifemaxxing/economics-module";
import { LifeEvolutionModule as EvolutionModule } from "./lifemaxxing/evolution-module";
import { AccountabilityModule } from "./lifemaxxing/accountability-module";
import { TrustModule } from "./lifemaxxing/trust-module";

// Vision Registry
import {
  ARGUS_20_GOALS,
  ARGUS_12_ENGINES,
  ARGUS_ROADMAP,
  ARGUS_NORTH_STARS,
  GoalCategory
} from "../lib/lifemaxxing/vision-registry";

export type LifemaxxingTab =
  | "blueprint"
  | "now"
  | "accountability"
  | "trust"
  | "evolution"
  | "solver"
  | "health"
  | "equity"
  | "mesh"
  | "capability"
  | "economics"
  | "doctrine"
  | "flourishing";

interface TabMeta {
  id: LifemaxxingTab;
  label: string;
  shortDesc: string;
  icon: React.ComponentType<{ className?: string }>;
  tag: string;
}

const TABS: TabMeta[] = [
  {
    id: "blueprint",
    label: "Vision Blueprint v1.0",
    shortDesc: "20 Goals · 12 Engines · 4 Phases",
    icon: Target,
    tag: "Master"
  },
  {
    id: "accountability",
    label: "Accountability Engine",
    shortDesc: "Student to Prime Minister",
    icon: Scale,
    tag: "Core"
  },
  {
    id: "trust",
    label: "Trust & Anti-Corruption",
    shortDesc: "Public Money & Service Navigator",
    icon: ShieldCheck,
    tag: "Civic"
  },
  {
    id: "now",
    label: "ARGUS NOW",
    shortDesc: "Immediate Contextual Intervention",
    icon: Compass,
    tag: "Core"
  },
  {
    id: "evolution",
    label: "Life Evolution",
    shortDesc: "Worthwhile Living & Leisure",
    icon: Hourglass,
    tag: "Living"
  },
  {
    id: "solver",
    label: "Universal Problem Solver",
    shortDesc: "20-Sector Diagnostic Engine",
    icon: Workflow,
    tag: "Intelligence"
  },
  {
    id: "health",
    label: "Health Intelligence",
    shortDesc: "Contextual Triage & ABHA Graph",
    icon: HeartPulse,
    tag: "Health"
  },
  {
    id: "equity",
    label: "Opportunity Equalizer",
    shortDesc: "Kolkata Pilot & Vernacular",
    icon: GraduationCap,
    tag: "Equity"
  },
  {
    id: "mesh",
    label: "Knowledge Mesh",
    shortDesc: "Federated Prerequisite Trees",
    icon: Network,
    tag: "Knowledge"
  },
  {
    id: "capability",
    label: "Capability Discovery",
    shortDesc: "Latent Aptitude Genome",
    icon: Sparkles,
    tag: "Growth"
  },
  {
    id: "economics",
    label: "Cost-Aware Router",
    shortDesc: "5-Tier Compute Pyramid (88% Cut)",
    icon: Cpu,
    tag: "Compute"
  },
  {
    id: "doctrine",
    label: "ARGUS Constitution",
    shortDesc: "5 Principles & Human Sovereignty",
    icon: ShieldAlert,
    tag: "Doctrine"
  },
  {
    id: "flourishing",
    label: "Universal Flourishing",
    shortDesc: "Obstacle Diagnostic Matrix",
    icon: FileCheck,
    tag: "Impact"
  }
];

export const LifemaxxingView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<LifemaxxingTab>("blueprint");

  // Blueprint View Filters
  const [goalFilter, setGoalFilter] = useState<GoalCategory | "All">("All");
  const [searchGoal, setSearchGoal] = useState("");

  const filteredGoals = ARGUS_20_GOALS.filter(g => {
    if (goalFilter !== "All" && g.category !== goalFilter) return false;
    if (searchGoal && !g.title.toLowerCase().includes(searchGoal.toLowerCase()) && !g.tagline.toLowerCase().includes(searchGoal.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Top OS Header Bar */}
      <header className="border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md sticky top-0 z-30 px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-emerald-400 p-0.5 shadow-lg shadow-indigo-500/20">
              <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                <Compass className="w-5 h-5 text-indigo-400 animate-spin-slow" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold tracking-tight text-white text-base">ARGUS</span>
                <span className="text-[10px] font-mono uppercase bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-full border border-indigo-500/30">
                  Human Flourishing OS v2.0
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">
                Unlock the extraordinary in everyone · Knowledge, Health, Opportunity, Trust & Sovereignty
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-4 text-xs font-mono text-slate-400 border-r border-slate-800 pr-4">
              <span>20 Goals</span>
              <span>12 Engines</span>
              <span>20 Sectors</span>
              <span className="text-emerald-400">88.3% Cost Cut</span>
            </div>
            <a
              href="https://github.com/archiboltmusk/Argus"
              target="_blank"
              rel="noreferrer"
              className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1 bg-slate-800/60 px-3 py-1.5 rounded-lg border border-slate-700/60 transition-colors"
            >
              <span>GitHub</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </header>

      {/* Main Tab Bar */}
      <div className="border-b border-slate-800 bg-slate-950/90 sticky top-[57px] z-20 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 overflow-x-auto scrollbar-none py-2 flex items-center gap-1.5">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-all ${
                  isActive
                    ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-950/60 font-semibold"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-900 border border-transparent"
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? "text-white" : "text-slate-400"}`} />
                <span>{tab.label}</span>
                <span
                  className={`text-[9px] px-1.5 py-0.2 rounded font-mono uppercase ${
                    isActive ? "bg-white/20 text-white" : "bg-slate-800 text-slate-500"
                  }`}
                >
                  {tab.tag}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl mx-auto w-full p-4 md:p-6 lg:p-8 space-y-6">
        {/* TAB: BLUEPRINT */}
        {activeTab === "blueprint" && (
          <div className="space-y-8 animate-fadeIn">
            {/* Vision Banner */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-950 via-slate-900 to-slate-950 p-6 md:p-8 border border-indigo-800/40 shadow-xl">
              <div className="relative z-10 max-w-3xl">
                <span className="text-xs font-semibold uppercase tracking-wider text-indigo-400 block mb-2">
                  Consolidated Vision Blueprint v1.0
                </span>
                <h1 className="text-2xl md:text-4xl font-extrabold text-white tracking-tight">
                  The Human Flourishing Operating System
                </h1>
                <p className="mt-3 text-sm md:text-base text-slate-300 leading-relaxed">
                  Make knowledge, wisdom, health, opportunity, human connection, and personalized guidance 
                  accessible to every person—regardless of wealth, age, profession, location, or background.
                </p>
                <div className="mt-5 flex flex-wrap gap-3 text-xs">
                  <div className="bg-indigo-900/60 px-3 py-1.5 rounded-lg border border-indigo-700/50 text-indigo-200">
                    <strong>Every human life is precious.</strong> Every person deserves the opportunity to realize their potential.
                  </div>
                </div>
              </div>
            </div>

            {/* North Star Metrics Grid */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-emerald-400" />
                  The 8 North Star Indicators of Real-World Impact
                </h2>
                <span className="text-xs text-slate-400">Measured outside the app</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {ARGUS_NORTH_STARS.map((ns, idx) => (
                  <div key={idx} className="bg-slate-900/90 border border-slate-800 p-3.5 rounded-xl space-y-1">
                    <span className="text-[11px] text-slate-400 block">{ns.name}</span>
                    <div className="text-lg font-bold text-emerald-400">{ns.target}</div>
                    <p className="text-[10px] text-slate-400 leading-tight">{ns.description}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* 20 Ultimate Goals Registry */}
            <div className="space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-3 pb-2 border-b border-slate-800">
                <div>
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <Target className="w-5 h-5 text-indigo-400" />
                    The 20 Ultimate Goals of ARGUS
                  </h2>
                  <span className="text-xs text-slate-400">Categorized into Core, Growth, and Frontier</span>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
                    <input
                      type="text"
                      placeholder="Search goals..."
                      value={searchGoal}
                      onChange={(e) => setSearchGoal(e.target.value)}
                      className="bg-slate-900 border border-slate-700 text-xs rounded-lg pl-8 pr-3 py-1.5 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  {(["All", "Core", "Growth", "Frontier"] as const).map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setGoalFilter(cat)}
                      className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                        goalFilter === cat
                          ? "bg-indigo-600 text-white"
                          : "bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {filteredGoals.map((g) => (
                  <div
                    key={g.id}
                    className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-slate-700 transition-all space-y-2.5"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-indigo-950 border border-indigo-800 text-indigo-300 font-mono text-[10px] flex items-center justify-center font-bold">
                          {g.id}
                        </span>
                        <span className="font-semibold text-white">{g.title}</span>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                          g.category === "Core"
                            ? "bg-indigo-950 text-indigo-300 border border-indigo-800"
                            : g.category === "Growth"
                            ? "bg-purple-950 text-purple-300 border border-purple-800"
                            : "bg-emerald-950 text-emerald-300 border border-emerald-800"
                        }`}
                      >
                        {g.category}
                      </span>
                    </div>

                    <p className="text-xs text-slate-300 leading-snug font-medium">{g.tagline}</p>

                    <div className="text-[11px] text-slate-400 bg-slate-950 p-2.5 rounded-lg border border-slate-800 space-y-1">
                      <div>
                        <strong className="text-slate-300">Problem:</strong> {g.problemSolved}
                      </div>
                      <div className="text-indigo-300">
                        <strong className="text-slate-300">ARGUS:</strong> {g.argusCapability}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* The 12 Core Intelligence Engines */}
            <div className="space-y-4 pt-4 border-t border-slate-800">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Cpu className="w-5 h-5 text-purple-400" />
                The 12 Core Intelligence Engines
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                {ARGUS_12_ENGINES.map((eng) => (
                  <div key={eng.id} className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-mono text-[10px] text-purple-400 font-bold">Engine #{eng.number}</span>
                      <span className="text-[10px] bg-slate-950 text-slate-400 px-2 py-0.5 rounded border border-slate-800">
                        {eng.architectureTier.split("(")[0]}
                      </span>
                    </div>
                    <h3 className="text-sm font-bold text-white">{eng.name}</h3>
                    <p className="text-xs text-slate-300 leading-snug">{eng.role}</p>
                    <div className="text-[11px] text-slate-400 pt-1 border-t border-slate-800/80">
                      <span className="text-emerald-400 font-semibold">Safeguard:</span> {eng.humanSafeguard}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 4-Phase Roadmap */}
            <div className="space-y-4 pt-4 border-t border-slate-800">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Workflow className="w-5 h-5 text-emerald-400" />
                4-Phase Evolution Roadmap
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {ARGUS_ROADMAP.map((rm) => (
                  <div key={rm.phase} className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-mono text-[10px] font-bold text-indigo-400">{rm.phase}</span>
                      <span className="text-[10px] text-slate-500">{rm.timeframe}</span>
                    </div>
                    <h3 className="text-sm font-bold text-white">{rm.name}</h3>
                    <p className="text-[11px] text-slate-400 leading-snug">{rm.theme}</p>
                    <ul className="space-y-1.5 text-[10px] text-slate-300 list-disc pl-3.5 pt-1">
                      {rm.deliverables.map((d, i) => (
                        <li key={i}>{d}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* OTHER SUB-MODULES */}
        {activeTab === "accountability" && <AccountabilityModule />}
        {activeTab === "trust" && <TrustModule />}
        {activeTab === "now" && <NowModule />}
        {activeTab === "evolution" && <EvolutionModule />}
        {activeTab === "solver" && <SolverModule />}
        {activeTab === "health" && <HealthModule />}
        {activeTab === "equity" && <EquityModule />}
        {activeTab === "mesh" && <MeshModule />}
        {activeTab === "capability" && <CapabilityModule />}
        {activeTab === "economics" && <EconomicsModule />}
        {activeTab === "doctrine" && <DoctrineModule />}
        {activeTab === "flourishing" && <FlourishingModule />}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p>ARGUS: The Human Flourishing Operating System · Open-source, private, and sovereignty-preserving.</p>
          <div className="flex items-center gap-4 text-[11px]">
            <span>Truth over comfort</span>
            <span>Wisdom over stimulation</span>
            <span>Capability over dependency</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LifemaxxingView;
