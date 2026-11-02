import {
  Microscope,
  School,
  WifiOff,
} from "lucide-react";
import { useState } from "react";
import {
  STUDENT_AARAV_PROFILE,
  LOW_COST_DISCOVERY_MISSIONS,
  PUBLIC_RESOURCE_INDEX,
  AARAV_OPPORTUNITY_PATHWAY,
} from "@/lib/lifemaxxing/equity/data";
import type { LowCostDiscoveryMission } from "@/lib/lifemaxxing/equity/types";

export function EquityOpportunityModule() {
  const [activeTab, setActiveTab] = useState<"student_a" | "discovery_lab" | "resource_network" | "kolkata_pilot">("student_a");
  const [selectedMissionId, setSelectedMissionId] = useState<string>("mission-paper-bridge");
  const [languageMode, setLanguageMode] = useState<"bengali" | "english">("bengali");
  const [completedMissions, setCompletedMissions] = useState<Record<string, boolean>>({});

  const activeMission: LowCostDiscoveryMission =
    LOW_COST_DISCOVERY_MISSIONS.find((m) => m.id === selectedMissionId) ??
    LOW_COST_DISCOVERY_MISSIONS[0];

  const toggleMission = (id: string) => {
    setCompletedMissions((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Top Banner: ARGUS EQUITY */}
      <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-cyan-950/40 via-sky-950/20 to-black/80 p-6 md:p-8 backdrop-blur-xl relative overflow-hidden shadow-2xl">
        <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none" />
        <div className="relative z-10 space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-500/10 px-3.5 py-1 text-xs font-semibold tracking-wide text-cyan-300">
            <School className="h-3.5 w-3.5 text-cyan-400" />
            <span>ARGUS Equity · Discover Talent. Remove Barriers. Unlock Opportunity.</span>
          </div>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white">
                The Opportunity Equalizer
              </h2>
              <p className="mt-1 text-sm md:text-base text-white/70 max-w-3xl leading-relaxed">
                A child born into poverty may never discover what they are capable of due to lack of exposure and resources.
                ARGUS makes potential independent of parental wealth, location, or school prestige—without prematurely deciding their destiny.
              </p>
            </div>

            {/* Offline & Low-Cost Capability Pill */}
            <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/40 p-3.5 backdrop-blur-md shrink-0">
              <div className="h-10 w-10 rounded-lg bg-cyan-500/20 flex items-center justify-center text-cyan-400">
                <WifiOff className="h-5 w-5" />
              </div>
              <div>
                <div className="text-[11px] font-medium uppercase tracking-wider text-white/50">Connectivity Mode</div>
                <div className="text-xs font-bold text-white">100% Offline / Shared Device Ready</div>
              </div>
            </div>
          </div>

          {/* Sub Navigation */}
          <div className="flex flex-wrap gap-2 pt-2 border-t border-white/10">
            {[
              { id: "student_a", label: "1. Student Profile (Class 6)" },
              { id: "discovery_lab", label: "2. Zero-Cost Discovery Lab" },
              { id: "resource_network", label: "3. Opportunity Network" },
              { id: "kolkata_pilot", label: "4. Kolkata District Pilot" },
            ].map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as typeof activeTab)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium transition-all duration-200 cursor-pointer ${
                    isActive
                      ? "bg-cyan-600 text-white shadow-lg shadow-cyan-600/30 border border-cyan-400/40"
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

      {/* TAB 1: STUDENT A PROFILE (CLASS 6) */}
      {activeTab === "student_a" && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Student Circumstance Card */}
            <div className="lg:col-span-1 rounded-2xl border border-white/10 bg-black/40 p-6 backdrop-blur-md space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-xl bg-cyan-500/20 text-cyan-300 flex items-center justify-center font-bold text-lg font-mono">
                  12
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">{STUDENT_AARAV_PROFILE.name}</h3>
                  <div className="text-xs text-cyan-300 font-mono">{STUDENT_AARAV_PROFILE.region}</div>
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t border-white/10 text-xs">
                <div className="flex justify-between py-1 border-b border-white/5">
                  <span className="text-white/50">Grade / Medium</span>
                  <span className="font-semibold text-white">{STUDENT_AARAV_PROFILE.grade} · {STUDENT_AARAV_PROFILE.primaryLanguage}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-white/5">
                  <span className="text-white/50">Device Access</span>
                  <span className="font-semibold text-amber-300">Shared family phone</span>
                </div>
                <div className="flex justify-between py-1 border-b border-white/5">
                  <span className="text-white/50">Connectivity</span>
                  <span className="font-semibold text-rose-300">Unreliable 2G/3G</span>
                </div>
                <div className="flex justify-between py-1 border-b border-white/5">
                  <span className="text-white/50">Private Tutor</span>
                  <span className="font-semibold text-white/60">None (Cannot afford)</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-white/50">Learning Velocity</span>
                  <span className="font-bold text-emerald-400 font-mono">{STUDENT_AARAV_PROFILE.learningVelocityScore}% (High visual adaptation)</span>
                </div>
              </div>

              <div className="p-3.5 rounded-xl border border-cyan-500/30 bg-cyan-950/20 space-y-1">
                <div className="text-[10px] font-bold uppercase tracking-wider text-cyan-400">UNICEF Equity Safeguard</div>
                <p className="text-[11px] text-white/80 leading-relaxed">
                  No early career pigeonholing. No IQ score labels. Reassess continuously as the child gains exposure to novel fields.
                </p>
              </div>
            </div>

            {/* What ARGUS Discovers & The Pathway */}
            <div className="lg:col-span-2 space-y-6">
              <div className="rounded-2xl border border-white/10 bg-black/40 p-6 backdrop-blur-md space-y-5">
                <div className="border-b border-white/10 pb-3">
                  <h3 className="text-base font-bold text-white">Continuous Capability Discovery (Over 4 Weeks)</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="p-3.5 rounded-xl border border-emerald-500/20 bg-emerald-950/10 space-y-1.5">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">Observed Strengths</div>
                    <ul className="text-xs text-white/80 space-y-1 list-disc list-inside">
                      {STUDENT_AARAV_PROFILE.interestsObserved.map((s) => (
                        <li key={s}>{s}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="p-3.5 rounded-xl border border-amber-500/20 bg-amber-950/10 space-y-1.5">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-amber-400">Current Gaps</div>
                    <ul className="text-xs text-white/80 space-y-1 list-disc list-inside">
                      {STUDENT_AARAV_PROFILE.learningGapsIdentified.map((g) => (
                        <li key={g}>{g}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="p-3.5 rounded-xl border border-indigo-500/20 bg-indigo-950/10 space-y-1.5">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-indigo-400">Never Encountered</div>
                    <ul className="text-xs text-white/80 space-y-1 list-disc list-inside">
                      {STUDENT_AARAV_PROFILE.novelExperiencesLacking.map((e) => (
                        <li key={e}>{e}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* The 4-Step Equalizer Pathway */}
                <div className="pt-4 border-t border-white/10 space-y-3">
                  <div className="text-xs font-bold uppercase tracking-wider text-white/50">
                    Aarav&apos;s Equalizer Pathway (Resourceful, Low-Cost Execution)
                  </div>
                  <div className="space-y-2">
                    {AARAV_OPPORTUNITY_PATHWAY.map((step, idx) => (
                      <div key={step.actionTitle} className="p-3.5 rounded-xl border border-white/5 bg-white/[0.02] flex items-start gap-3">
                        <span className="h-6 w-6 rounded-full bg-cyan-500/20 text-cyan-300 text-xs font-mono font-bold flex items-center justify-center shrink-0 mt-0.5">
                          {idx + 1}
                        </span>
                        <div className="space-y-1 text-xs">
                          <div className="font-bold text-white">{step.actionTitle}</div>
                          <div className="text-cyan-300 font-serif italic text-[11px]">{step.localLanguageNote}</div>
                          <div className="text-white/60 font-mono text-[10px]">Resource: {step.resourceNeeded}</div>
                          <div className="text-emerald-400 font-mono text-[11px]">Proof: {step.successProof}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: ZERO-COST DISCOVERY LAB */}
      {activeTab === "discovery_lab" && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="rounded-2xl border border-white/10 bg-black/40 p-6 backdrop-blur-md space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-4">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Microscope className="h-5 w-5 text-cyan-400" />
                  <span>The Low-Cost Discovery Lab</span>
                </h3>
                <p className="text-xs text-white/70 mt-1 max-w-2xl">
                  Sample activities requiring little or no equipment. Evaluates learning velocity, observation rigor, and practical problem-solving.
                </p>
              </div>

              {/* Language Toggle */}
              <div className="flex items-center gap-1 rounded-xl border border-white/10 bg-black/60 p-1">
                <button
                  onClick={() => setLanguageMode("bengali")}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                    languageMode === "bengali" ? "bg-cyan-600 text-white" : "text-white/60 hover:text-white"
                  }`}
                >
                  বাংলা (Bengali)
                </button>
                <button
                  onClick={() => setLanguageMode("english")}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                    languageMode === "english" ? "bg-cyan-600 text-white" : "text-white/60 hover:text-white"
                  }`}
                >
                  English
                </button>
              </div>
            </div>

            {/* Mission Selector Tabs */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              {LOW_COST_DISCOVERY_MISSIONS.map((m) => {
                const isSel = selectedMissionId === m.id;
                const isDone = Boolean(completedMissions[m.id]);
                return (
                  <button
                    key={m.id}
                    onClick={() => setSelectedMissionId(m.id)}
                    className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      isSel
                        ? "border-cyan-500 bg-cyan-950/40 text-white shadow-md shadow-cyan-950/40"
                        : "border-white/5 bg-white/[0.02] text-white/70 hover:bg-white/[0.05] hover:text-white"
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="text-[10px] font-mono uppercase text-cyan-300">{m.category.replace("_", " ")}</div>
                      <div className="text-xs font-bold text-white">{m.title}</div>
                    </div>
                    <div className="pt-2 flex items-center justify-between text-[10px] font-mono text-white/50">
                      <span>{m.timeMinutes} min</span>
                      {isDone && <span className="text-emerald-400">Completed ✓</span>}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Active Mission Details */}
            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5 space-y-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-white/10 pb-3">
                <h4 className="text-base font-bold text-white">{activeMission.title}</h4>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full">
                    100% Offline Capable
                  </span>
                </div>
              </div>

              {/* Bilingual Instructions Box */}
              <div className="p-4 rounded-xl border border-cyan-500/20 bg-cyan-950/15 space-y-2">
                <div className="text-[10px] font-bold uppercase tracking-wider text-cyan-400">
                  {languageMode === "bengali" ? "অনুশীলন নির্দেশিকা (বাংলা)" : "Mission Prompt (English)"}
                </div>
                <p className="text-sm text-white/95 leading-relaxed font-serif">
                  {languageMode === "bengali" ? activeMission.bengaliPrompt : activeMission.englishPrompt}
                </p>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  onClick={() => toggleMission(activeMission.id)}
                  className={`py-2 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    completedMissions[activeMission.id]
                      ? "bg-emerald-500 text-black shadow-md shadow-emerald-500/40"
                      : "bg-cyan-600 hover:bg-cyan-500 text-white"
                  }`}
                >
                  {completedMissions[activeMission.id] ? "Mission Logged & Verified ✓" : "Log Observation Result"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: PUBLIC RESOURCE & OPPORTUNITY NETWORK */}
      {activeTab === "resource_network" && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="rounded-2xl border border-white/10 bg-black/40 p-6 backdrop-blur-md space-y-4">
            <div>
              <h3 className="text-lg font-bold text-white">The ARGUS Resource & Opportunity Network</h3>
              <p className="text-xs text-white/70 mt-1 max-w-2xl">
                Indexing verified public educational portals (DIKSHA, NCERT, SWAYAM, NSP) with zero commercial affiliate revenue.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {PUBLIC_RESOURCE_INDEX.map((res) => (
                <div
                  key={res.title}
                  className="rounded-xl border border-white/10 bg-white/[0.02] p-5 space-y-3 flex flex-col justify-between hover:border-cyan-500/30 transition-all"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-cyan-300 font-mono">{res.portal}</span>
                      <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded">
                        {res.cost}
                      </span>
                    </div>

                    <h4 className="text-sm font-bold text-white">{res.title}</h4>
                    <p className="text-xs text-white/70 leading-relaxed">{res.description}</p>
                    <div className="text-[10px] text-amber-300/80 font-mono">Eligibility: {res.eligibilityFilter}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: KOLKATA DISTRICT PILOT */}
      {activeTab === "kolkata_pilot" && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="rounded-2xl border border-white/10 bg-black/40 p-6 backdrop-blur-md space-y-6">
            <div className="border-b border-white/10 pb-4">
              <span className="text-xs font-mono uppercase tracking-widest text-cyan-400">12-Week Proof of Concept</span>
              <h3 className="text-xl font-bold text-white mt-1">Kolkata District Equity Pilot</h3>
              <p className="text-xs md:text-sm text-white/70 mt-1 max-w-2xl leading-relaxed">
                Starting with 30 consenting students in West Bengal across Class 6 to 8 with teacher and guardian oversight.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl border border-white/5 bg-white/[0.02] space-y-1">
                <div className="text-xs font-bold text-white">First 24 Hours</div>
                <div className="text-[11px] text-cyan-300 font-mono">Multilingual Discovery Assessment</div>
                <p className="text-xs text-white/70 leading-relaxed mt-1">
                  Define 30-minute hands-on assessment in Bengali and English covering foundational reasoning.
                </p>
              </div>

              <div className="p-4 rounded-xl border border-white/5 bg-white/[0.02] space-y-1">
                <div className="text-xs font-bold text-white">Next 24 Hours</div>
                <div className="text-[11px] text-cyan-300 font-mono">Resource-Matching Engine</div>
                <p className="text-xs text-white/70 leading-relaxed mt-1">
                  Return 1 learning intervention, 1 exploration activity, and 1 accessible public resource.
                </p>
              </div>

              <div className="p-4 rounded-xl border border-white/5 bg-white/[0.02] space-y-1">
                <div className="text-xs font-bold text-white">Final 24 Hours</div>
                <div className="text-[11px] text-cyan-300 font-mono">Representative Profile Stress-Test</div>
                <p className="text-xs text-white/70 leading-relaxed mt-1">
                  Test with 5 fictional student profiles including children with zero personal smartphones.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
