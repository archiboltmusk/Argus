import React, { useState } from "react";
import "./lifemaxxing/lifemaxxing-harbor.css";
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
import { CommunityTab } from "./lab/community-tab";
import { useOptionalProfiles } from "@/lib/profiles";

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
  | "community"
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
    id: "community",
    label: "Community & Public Discovery",
    shortDesc: "Worldwide sources, local action",
    icon: Search,
    tag: "Live"
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
    label: "Living Well",
    shortDesc: "Obstacle Diagnostic Matrix",
    icon: FileCheck,
    tag: "Impact"
  }
];

export const LifemaxxingView: React.FC<{ active?: boolean }> = ({ active = true }) => {
  const profiles = useOptionalProfiles();
  const activeProfile = profiles?.activeProfile ?? null;
  const [activeTab, setActiveTab] = useState<LifemaxxingTab>("blueprint");

  // Blueprint View Filters
  const [goalFilter, setGoalFilter] = useState<GoalCategory | "All">("All");
  const [searchGoal, setSearchGoal] = useState("");

  const filteredGoals = ARGUS_20_GOALS.filter(g => {
    if (goalFilter !== "All" && g.category !== goalFilter) return false;
    if (
      searchGoal &&
      !g.title.toLowerCase().includes(searchGoal.toLowerCase()) &&
      !g.tagline.toLowerCase().includes(searchGoal.toLowerCase()) &&
      !g.problemSolved.toLowerCase().includes(searchGoal.toLowerCase())
    ) {
      return false;
    }
    return true;
  });

  return (
    <div className="flourish-container">
      <div className="mx-auto max-w-[1400px] px-6 pt-24 pb-16 sm:px-8 lg:px-12">
        {/* Unified Authoritative Hero Masthead */}
        <header className="flourish-masthead">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-3">
              <div className="flourish-eyebrow">
                <Sparkles className="w-4 h-4 text-accent" />
                <span>Consolidated Vision Blueprint v1.0</span>
                <span className="flourish-eyebrow-badge">Argus OS Standard</span>
              </div>
              <h1 className="text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
                Personal Growth & Health
              </h1>
              <p className="max-w-3xl text-sm leading-relaxed text-ink-muted sm:text-base">
                Unlock the extraordinary in everyone. Universal access to knowledge, health intelligence, civic accountability, opportunity equalization, and human sovereignty—regardless of wealth, background, or circumstance.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 shrink-0">
              <div className="flex items-center gap-3.5 text-xs font-mono text-ink-subtle bg-surface-elevated/70 px-4 py-2.5 rounded-full border border-edge">
                <span><strong className="text-ink">20</strong> Goals</span>
                <span className="text-edge-soft">·</span>
                <span><strong className="text-ink">12</strong> Engines</span>
                <span className="text-edge-soft">·</span>
                <span><strong className="text-ink">20</strong> Sectors</span>
                <span className="text-edge-soft">·</span>
                <span className="text-accent font-bold">88.3% Cost Cut</span>
              </div>
              <a
                href="https://github.com/archiboltmusk/Argus"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-medium text-ink-muted hover:text-ink bg-surface border border-edge hover:border-edge-strong px-3.5 py-2.5 rounded-full transition-all"
              >
                <span>GitHub</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-3 text-xs">
            <div className="flourish-card-subtle flex items-center gap-2">
              <span className="text-accent font-bold uppercase tracking-wider text-[10px]">Core Doctrine</span>
              <span className="text-ink-muted">Every human life is precious. Every person deserves the opportunity to realize their latent potential without exploitation.</span>
            </div>
          </div>
        </header>

        {/* Sub-navigation Tabs Rail */}
        <nav className="flourish-tabs-bar" role="tablist" aria-label="ARGUS Health & Growth Modules">
          {TABS.filter((tab) => tab.id !== "community" || (activeProfile && !activeProfile.kid)).map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                role="tab"
                aria-selected={isActive}
                onClick={() => setActiveTab(tab.id)}
                className={`flourish-tab-button ${isActive ? "active" : ""}`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
                <span className="flourish-tab-badge">{tab.tag}</span>
              </button>
            );
          })}
        </nav>

        {/* Main Content Area */}
        <main className="space-y-8">
          {/* TAB: BLUEPRINT */}
          {activeTab === "blueprint" && (
            <div className="space-y-10 animate-fadeIn">
              {/* North Star Metrics Grid */}
              <section className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-bold text-ink flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-accent" />
                    The 8 North Star Indicators of Real-World Impact
                  </h2>
                  <span className="text-xs text-ink-subtle">Measured outside the software in daily human lives</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
                  {ARGUS_NORTH_STARS.map((ns, idx) => (
                    <div key={idx} className="bg-surface border border-edge hover:border-edge-strong p-4 rounded-2xl space-y-1.5 transition-all shadow-sm">
                      <span className="text-[11px] font-medium text-ink-subtle block">{ns.name}</span>
                      <div className="text-xl font-extrabold tracking-tight text-ink">{ns.target}</div>
                      <p className="text-[11px] text-ink-muted leading-snug">{ns.description}</p>
                    </div>
                  ))}
                </div>
              </section>

              {/* 20 Ultimate Goals Registry */}
              <section className="space-y-5">
                <div className="flex items-center justify-between flex-wrap gap-3 pb-3 border-b border-edge-soft">
                  <div>
                    <h2 className="text-lg font-bold text-ink flex items-center gap-2">
                      <Target className="w-5 h-5 text-accent" />
                      The 20 Ultimate Goals of ARGUS
                    </h2>
                    <span className="text-xs text-ink-subtle">Categorized into Core, Growth, and Frontier</span>
                  </div>

                  <div className="flex items-center gap-2.5 flex-wrap">
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 text-ink-subtle absolute left-3 top-2.5" />
                      <input
                        type="text"
                        placeholder="Search goals & problems..."
                        value={searchGoal}
                        onChange={(e) => setSearchGoal(e.target.value)}
                        className="bg-surface border border-edge text-xs rounded-full pl-9 pr-4 py-1.5 text-ink placeholder:text-ink-subtle focus:outline-none focus:border-accent transition-all"
                      />
                    </div>

                    {(["All", "Core", "Growth", "Frontier"] as const).map((cat) => (
                      <button
                        key={cat}
                        onClick={() => setGoalFilter(cat)}
                        className={`px-3.5 py-1 rounded-full text-xs font-semibold transition-all ${
                          goalFilter === cat
                            ? "bg-white text-black shadow-sm"
                            : "bg-surface border border-edge text-ink-muted hover:text-ink hover:border-edge-strong"
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredGoals.map((g) => (
                    <div
                      key={g.id}
                      className="p-5 rounded-2xl bg-surface border border-edge hover:border-edge-strong transition-all space-y-3 shadow-sm"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2.5">
                          <span className="w-6 h-6 rounded-full bg-accent-soft border border-accent/20 text-accent font-mono text-[11px] flex items-center justify-center font-bold">
                            {g.id}
                          </span>
                          <span className="font-bold text-ink text-sm">{g.title}</span>
                        </div>
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase ${
                            g.category === "Core"
                              ? "bg-accent-soft text-accent border border-accent/20"
                              : g.category === "Growth"
                              ? "bg-surface-elevated text-ink border border-edge"
                              : "bg-surface-elevated text-ink-muted border border-edge"
                          }`}
                        >
                          {g.category}
                        </span>
                      </div>

                      <p className="text-xs text-ink-muted leading-relaxed font-medium">{g.tagline}</p>

                      <div className="text-[11px] text-ink-subtle bg-surface-elevated p-3 rounded-xl border border-edge-soft space-y-1.5">
                        <div>
                          <strong className="text-ink">Problem:</strong> {g.problemSolved}
                        </div>
                        <div className="text-accent font-medium">
                          <strong className="text-ink">ARGUS:</strong> {g.argusCapability}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* The 12 Core Intelligence Engines */}
              <section className="space-y-4 pt-4 border-t border-edge-soft">
                <h2 className="text-lg font-bold text-ink flex items-center gap-2">
                  <Cpu className="w-5 h-5 text-accent" />
                  The 12 Core Intelligence Engines
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {ARGUS_12_ENGINES.map((eng) => (
                    <div key={eng.id} className="p-4 rounded-2xl bg-surface border border-edge hover:border-edge-strong transition-all space-y-2.5 shadow-sm">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-mono text-[10px] text-accent font-bold">Engine #{eng.number}</span>
                        <span className="text-[10px] bg-surface-elevated text-ink-muted px-2 py-0.5 rounded-full border border-edge-soft">
                          {eng.architectureTier.split("(")[0]}
                        </span>
                      </div>
                      <h3 className="text-sm font-bold text-ink">{eng.name}</h3>
                      <p className="text-xs text-ink-muted leading-relaxed">{eng.role}</p>
                      <div className="text-[11px] text-ink-subtle pt-2 border-t border-edge-soft">
                        <span className="text-accent font-semibold">Safeguard:</span> {eng.humanSafeguard}
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* 4-Phase Evolution Roadmap */}
              <section className="space-y-4 pt-4 border-t border-edge-soft">
                <h2 className="text-lg font-bold text-ink flex items-center gap-2">
                  <Workflow className="w-5 h-5 text-accent" />
                  4-Phase Evolution Roadmap
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {ARGUS_ROADMAP.map((rm) => (
                    <div key={rm.phase} className="p-4 rounded-2xl bg-surface border border-edge hover:border-edge-strong transition-all space-y-2.5 shadow-sm">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-mono text-[10px] font-bold text-accent">{rm.phase}</span>
                        <span className="text-[10px] text-ink-subtle">{rm.timeframe}</span>
                      </div>
                      <h3 className="text-sm font-bold text-ink">{rm.name}</h3>
                      <p className="text-[11px] text-ink-muted leading-relaxed">{rm.theme}</p>
                      <ul className="space-y-1.5 text-[10px] text-ink-muted list-disc pl-3.5 pt-1">
                        {rm.deliverables.map((d, i) => (
                          <li key={i}>{d}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          )}

          {/* OTHER SUB-MODULES */}
          {activeTab === "accountability" && <AccountabilityModule />}
          {activeTab === "trust" && <TrustModule />}
          {activeTab === "community" && <CommunityTab profileId={activeProfile?.id ?? null} childProfile={!activeProfile || !!activeProfile.kid} active={active} />}
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
        <footer className="mt-14 border-t border-edge-soft py-8 text-center text-xs text-ink-subtle">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <p>ARGUS: Personal Growth & Health · Open-source, private, and independent.</p>
            <div className="flex items-center gap-4 text-[11px]">
              <span>Truth over comfort</span>
              <span>Wisdom over stimulation</span>
              <span>Capability over dependency</span>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default LifemaxxingView;
