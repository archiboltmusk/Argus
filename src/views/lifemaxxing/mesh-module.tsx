import {
  CheckCircle2,
  ExternalLink,
  GitBranch,
  Globe,
  Sparkles,
  } from "lucide-react";
import { useState } from "react";
import {
  SAMPLE_MESH_CONCEPTS,
  DEMO_AI_PATHWAY,
} from "@/lib/lifemaxxing/mesh/data";
import type { KnowledgeConceptNode } from "@/lib/lifemaxxing/mesh/types";

export function KnowledgeMeshModule() {
  const [selectedConceptId, setSelectedConceptId] = useState<string>("math-fractions-division");
  const [activeTab, setActiveTab] = useState<"pathway" | "concepts" | "federation">("pathway");
  const [verifiedMilestones, setVerifiedMilestones] = useState<Record<number, boolean>>({ 1: true });

  const activeConcept: KnowledgeConceptNode =
    SAMPLE_MESH_CONCEPTS.find((c) => c.id === selectedConceptId) ??
    SAMPLE_MESH_CONCEPTS[0];

  const toggleMilestone = (stepNum: number) => {
    setVerifiedMilestones((prev) => ({ ...prev, [stepNum]: !prev[stepNum] }));
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Banner: ARGUS Knowledge Mesh */}
      <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-indigo-950/50 via-blue-950/30 to-black/90 p-6 md:p-8 backdrop-blur-xl relative overflow-hidden shadow-2xl">
        <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-blue-500/10 blur-3xl pointer-events-none" />
        <div className="relative z-10 space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-400/30 bg-blue-500/10 px-3.5 py-1 text-xs font-semibold tracking-wide text-blue-300">
            <GitBranch className="h-3.5 w-3.5 text-blue-400" />
            <span>ARGUS Knowledge Mesh · Connect the World&apos;s Knowledge to Every Human</span>
          </div>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white">
                Information → Understanding → Capability → Opportunity
              </h2>
              <p className="mt-1 text-sm md:text-base text-white/70 max-w-3xl leading-relaxed">
                The internet connected documents, websites, and databases. ARGUS builds the missing connection between what humanity knows and what each person needs to learn—without requiring ARGUS to own the internet.
              </p>
            </div>

            {/* Open Utility Badge */}
            <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/40 p-3.5 backdrop-blur-md shrink-0">
              <div className="h-10 w-10 rounded-lg bg-blue-500/20 flex items-center justify-center text-blue-400 font-bold font-mono">
                RDF
              </div>
              <div>
                <div className="text-[11px] font-medium uppercase tracking-wider text-white/50">Interoperability</div>
                <div className="text-xs font-bold text-white">W3C / UNESCO OER Linked Mesh</div>
              </div>
            </div>
          </div>

          {/* Sub Navigation */}
          <div className="flex flex-wrap gap-2 pt-2 border-t border-white/10">
            {[
              { id: "pathway", label: "1. Personalized Pathway (Learn AI)", icon: Sparkles, desc: "Aarav's adaptive route" },
              { id: "concepts", label: "2. Knowledge Concept Graph", icon: GitBranch, desc: "Prerequisites & provenance" },
              { id: "federation", label: "3. Open Knowledge Utility", icon: Globe, desc: "Federated, not centralized" },
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

      {/* TAB 1: PERSONALIZED PATHWAY (AARAV'S AI ROADMAP) */}
      {activeTab === "pathway" && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="rounded-2xl border border-white/10 bg-black/40 p-6 md:p-8 backdrop-blur-md space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-4">
              <div>
                <span className="text-xs font-mono uppercase text-blue-400 font-bold">Personalized Knowledge Routing</span>
                <h3 className="text-xl font-bold text-white mt-0.5">{DEMO_AI_PATHWAY.learnerContext.goal}</h3>
                <p className="text-xs text-white/70 mt-1">
                  Learner: <strong>{DEMO_AI_PATHWAY.learnerContext.name}</strong> · Budget: {DEMO_AI_PATHWAY.learnerContext.availableHoursDaily}h daily · Device: {DEMO_AI_PATHWAY.learnerContext.deviceTier.replace("_", " ")}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-full">
                  Prerequisites Automatically Re-routed
                </span>
              </div>
            </div>

            {/* Diagnostic State Card */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              <div className="p-3.5 rounded-xl border border-emerald-500/20 bg-emerald-950/10 space-y-1">
                <span className="text-[10px] font-bold uppercase text-emerald-400 font-mono">Demonstrated Mastery</span>
                <div className="text-white font-medium">Whole Number Arithmetic</div>
                <p className="text-[11px] text-white/60">Passed diagnostic with 100% speed score.</p>
              </div>

              <div className="p-3.5 rounded-xl border border-amber-500/20 bg-amber-950/10 space-y-1">
                <span className="text-[10px] font-bold uppercase text-amber-400 font-mono">Identified Gaps (Remediating First)</span>
                <div className="text-white font-medium">Fractions & Basic Algebraic Variables</div>
                <p className="text-[11px] text-white/60">Must clear before touching Python or loss gradients.</p>
              </div>

              <div className="p-3.5 rounded-xl border border-blue-500/20 bg-blue-950/10 space-y-1">
                <span className="text-[10px] font-bold uppercase text-blue-400 font-mono">Future Milestones</span>
                <div className="text-white font-medium">Python → Statistics → Gradient Descent</div>
                <p className="text-[11px] text-white/60">Unlocked sequentially upon evidence of competence.</p>
              </div>
            </div>

            {/* Ordered Step-by-Step Pathway */}
            <div className="space-y-3 pt-2">
              <div className="text-xs font-bold uppercase tracking-wider text-white/50">
                The Adaptive Sequence (No 10,000 Unvetted Courses)
              </div>

              <div className="space-y-3">
                {DEMO_AI_PATHWAY.orderedMilestones.map((m) => {
                  const isVerified = Boolean(verifiedMilestones[m.stepNumber]);
                  return (
                    <div
                      key={m.stepNumber}
                      onClick={() => toggleMilestone(m.stepNumber)}
                      className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                        isVerified
                          ? "border-emerald-500/40 bg-emerald-950/20 text-white/90"
                          : "border-white/10 bg-white/[0.02] hover:bg-white/[0.05] text-white"
                      }`}
                    >
                      <div className="flex items-start gap-3.5">
                        <button
                          className={`h-7 w-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 font-mono text-xs font-bold transition-colors ${
                            isVerified ? "bg-emerald-500 text-black" : "border border-white/20 bg-white/5 text-white/60"
                          }`}
                        >
                          {isVerified ? <CheckCircle2 className="h-4 w-4" /> : m.stepNumber}
                        </button>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-white uppercase tracking-wider">Step {m.stepNumber}</span>
                            <span
                              className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded ${
                                m.prerequisiteStatus === "needs_foundation_remediation"
                                  ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                                  : "bg-blue-500/20 text-blue-300 border border-blue-500/30"
                              }`}
                            >
                              {m.prerequisiteStatus.replace(/_/g, " ")}
                            </span>
                            <span className="text-[10px] font-mono text-white/40">{m.estimatedMinutes}m</span>
                          </div>
                          <div className="text-sm font-bold text-white">{m.conceptName}</div>
                          <p className="text-xs text-white/70">Resource: {m.prescribedResource}</p>
                          <div className="text-[11px] font-mono text-amber-300/90">
                            Deliverable: {m.deliverableProof}
                          </div>
                        </div>
                      </div>

                      <div className="shrink-0 self-end md:self-auto">
                        <span className={`text-[11px] font-mono px-3 py-1 rounded-full border ${
                          isVerified ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-300" : "bg-white/5 border-white/10 text-white/60"
                        }`}>
                          {isVerified ? "Mastery Verified ✓" : "In Progress"}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: KNOWLEDGE CONCEPT GRAPH */}
      {activeTab === "concepts" && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Concept Node List */}
            <div className="lg:col-span-1 rounded-2xl border border-white/10 bg-black/40 p-6 backdrop-blur-md space-y-3">
              <div className="text-xs font-bold uppercase tracking-wider text-white/50">Class 6 → AI Concept Graph</div>
              <div className="space-y-2">
                {SAMPLE_MESH_CONCEPTS.map((c) => {
                  const isSel = selectedConceptId === c.id;
                  return (
                    <button
                      key={c.id}
                      onClick={() => setSelectedConceptId(c.id)}
                      className={`w-full text-left p-3.5 rounded-xl border text-xs transition-all cursor-pointer ${
                        isSel
                          ? "border-blue-500 bg-blue-950/40 text-white font-semibold shadow-md shadow-blue-950/40"
                          : "border-white/5 bg-white/[0.02] text-white/70 hover:bg-white/[0.06] hover:text-white"
                      }`}
                    >
                      <div className="font-bold text-white truncate">{c.name}</div>
                      <div className="text-[10px] text-white/40 font-mono mt-0.5">{c.domain} · Level {c.difficultyLevel}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Selected Concept Node Inspector */}
            <div className="lg:col-span-2 rounded-2xl border border-blue-500/30 bg-gradient-to-br from-blue-950/20 via-black/60 to-black/80 p-6 md:p-8 backdrop-blur-md space-y-5 shadow-2xl">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
                <div>
                  <span className="text-xs font-mono uppercase text-blue-400 font-bold">{activeConcept.domain}</span>
                  <h3 className="text-xl font-bold text-white mt-0.5">{activeConcept.name}</h3>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono bg-blue-500/20 text-blue-300 border border-blue-500/30 px-3 py-1 rounded-full uppercase">
                    License: {activeConcept.provenance.license.replace(/_/g, " ")}
                  </span>
                </div>
              </div>

              {/* First Principle & Provenance */}
              <div className="space-y-3 text-xs">
                <div className="p-4 rounded-xl border border-white/5 bg-white/[0.02] space-y-1">
                  <span className="text-[10px] uppercase font-mono text-blue-300 font-bold">First-Principle Explanation</span>
                  <p className="text-sm text-white/90 leading-relaxed font-serif">{activeConcept.firstPrincipleExplanation}</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg border border-white/5 bg-white/[0.02]">
                    <span className="text-[10px] text-white/50 block font-mono">Curriculum / Provenance Standard</span>
                    <span className="font-bold text-white mt-0.5 block">{activeConcept.provenance.sourceStandard}</span>
                  </div>

                  <div className="p-3 rounded-lg border border-white/5 bg-white/[0.02]">
                    <span className="text-[10px] text-white/50 block font-mono">Evidence Grade</span>
                    <span className="font-bold text-emerald-400 mt-0.5 block">{activeConcept.provenance.evidenceRating.replace(/_/g, " ").toUpperCase()}</span>
                  </div>
                </div>

                {/* Connected Free Resources */}
                <div className="pt-2 space-y-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-white/50 block">Connected Open Resources</span>
                  <div className="space-y-1.5">
                    {activeConcept.connectedResources.map((res) => (
                      <div key={res.title} className="p-3 rounded-xl border border-white/10 bg-black/40 flex items-center justify-between text-xs">
                        <div>
                          <div className="font-bold text-white">{res.title}</div>
                          <div className="text-[10px] text-white/50 font-mono">{res.language} · {res.format.replace(/_/g, " ")}</div>
                        </div>
                        <a
                          href={res.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-300 hover:text-white flex items-center gap-1"
                        >
                          <span>Open</span>
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Falsifiable Mastery Check */}
                <div className="p-3.5 rounded-xl border border-emerald-500/20 bg-emerald-950/20 text-xs text-emerald-300 font-mono">
                  Mastery Check: {activeConcept.falsifiableMasteryCheck}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: OPEN KNOWLEDGE UTILITY */}
      {activeTab === "federation" && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="rounded-2xl border border-white/10 bg-black/40 p-6 md:p-8 backdrop-blur-md space-y-5">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Globe className="h-5 w-5 text-blue-400" />
                <span>The Open Knowledge Utility (Federated, Not Centralized)</span>
              </h3>
              <p className="text-xs text-white/70 mt-1 max-w-2xl leading-relaxed">
                ARGUS does not need to own human knowledge. Knowledge providers (universities, state boards, open repositories) publish structured concept maps using open RDF/W3C schema standards.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-5 rounded-xl border border-white/10 bg-white/[0.02] space-y-2">
                <div className="text-xs font-bold text-white uppercase tracking-wider text-blue-400">1. Global Intelligence</div>
                <p className="text-xs text-white/80 leading-relaxed">
                  What is known, where it can be found, licensing, and evidence reliability. 100% open and federated.
                </p>
              </div>

              <div className="p-5 rounded-xl border border-amber-500/30 bg-amber-950/20 space-y-2">
                <div className="text-xs font-bold text-white uppercase tracking-wider text-amber-400">2. Personal Intelligence</div>
                <p className="text-xs text-white/80 leading-relaxed">
                  What an individual knows, struggles with, and can realistically access. 100% private and on-device.
                </p>
              </div>

              <div className="p-5 rounded-xl border border-emerald-500/30 bg-emerald-950/20 space-y-2">
                <div className="text-xs font-bold text-white uppercase tracking-wider text-emerald-400">3. Collective Learning Intelligence</div>
                <p className="text-xs text-white/80 leading-relaxed">
                  Which educational interventions work for which specific learning obstacles, evaluated on anonymized outcomes with consent.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
