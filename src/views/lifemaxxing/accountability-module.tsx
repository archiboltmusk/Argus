import React, { useState } from "react";
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  UserCheck,
  FileCheck,
  ChevronRight,
  Check,
  FileText,
  Scale,
  ShieldAlert
} from "lucide-react";
import {
  PersonaType,
  VerificationType,
  SCENARIOS_20,
  PERSONA_PROFILES,
  ACCOUNTABILITY_MECHANISMS,
  calculateCommitmentReliability
} from "../../lib/lifemaxxing/accountability/accountability-engine";
import {
  RoleCategory,
  AccountabilityLevel,
  LedgerCommitment,
  ROLE_CONFIGS,
  INITIAL_LEDGER_ITEMS,
  ledgerService
} from "../../lib/lifemaxxing/accountability/universal-ledger";

export const AccountabilityModule: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<"contract" | "universal_ledger" | "scenarios" | "safeguards">("contract");

  // Contract State
  const [selectedPersona, setSelectedPersona] = useState<PersonaType>("neet_aspirant");
  const [commitmentText, setCommitmentText] = useState(
    "Revise Thermodynamics formulas & solve 25 high-yield MCQs"
  );
  const [selectedTime, setSelectedTime] = useState<number>(60);
  const [selectedVerification, setSelectedVerification] = useState<VerificationType>("assessment_result");
  const [contractStatus, setContractStatus] = useState<"not_started" | "in_progress" | "blocked" | "renegotiated" | "completed">("not_started");
  const [nonDisciplineReason, setNonDisciplineReason] = useState<string>("");
  const [contractCreated, setContractCreated] = useState<boolean>(false);

  // Universal Ledger State
  const [ledgerRole, setLedgerRole] = useState<RoleCategory>("elected_representative");
  const [ledgerLevelFilter, setLedgerLevelFilter] = useState<AccountabilityLevel | "all">("all");
  const [ledgerItems, setLedgerItems] = useState<LedgerCommitment[]>(INITIAL_LEDGER_ITEMS);
  const [selectedLedgerItem, setSelectedLedgerItem] = useState<LedgerCommitment | null>(INITIAL_LEDGER_ITEMS[3]); // PM Tap Water
  const [newEvidenceText, setNewEvidenceText] = useState("");
  const [newEvidenceSource, setNewEvidenceSource] = useState("");

  // Scenarios Filter
  const [scenarioFilter, setScenarioFilter] = useState<PersonaType | "all">("all");
  const filteredScenarios = scenarioFilter === "all" 
    ? SCENARIOS_20 
    : SCENARIOS_20.filter(s => s.persona === scenarioFilter);

  const stats = calculateCommitmentReliability(SCENARIOS_20);

  const handleCreateContract = () => {
    setContractCreated(true);
    setContractStatus("in_progress");
  };

  const handleAttachEvidenceToLedger = (itemId: string) => {
    if (!newEvidenceText) return;
    ledgerService.attachEvidence(itemId, {
      type: "audit_trail",
      title: newEvidenceText,
      uriOrHash: `sha256:${Math.random().toString(16).substring(2, 10)}`,
      timestamp: new Date().toISOString().replace("T", " ").substring(0, 16),
      verifiedBy: newEvidenceSource || "Auditor Review",
      isAllegationOrFact: "verified_fact"
    });
    setLedgerItems([...ledgerService.getItems()]);
    setNewEvidenceText("");
    setNewEvidenceSource("");
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-950 via-slate-900 to-purple-950 p-6 md:p-8 border border-indigo-800/40 shadow-xl">
        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-xs font-medium mb-3">
            <Scale className="w-3.5 h-3.5" />
            Universal Accountability Engine · Zero Social Scoring
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
            Everyone Answers to Their Own Commitments
          </h1>
          <p className="mt-2 text-sm md:text-base text-slate-300 leading-relaxed">
            From a Class 6 student mastering fractions to a Prime Minister delivering clean tap water. 
            Accountability without punishment, surveillance, or public humiliation.
          </p>
          <div className="mt-4 flex flex-wrap gap-2 text-xs text-indigo-200/80">
            <span className="bg-indigo-900/60 px-2.5 py-1 rounded-md border border-indigo-700/40">✓ Commit → Plan → Verify → Diagnose → Adapt</span>
            <span className="bg-indigo-900/60 px-2.5 py-1 rounded-md border border-indigo-700/40">✓ No Single Citizen Score (UNESCO Compliant)</span>
            <span className="bg-indigo-900/60 px-2.5 py-1 rounded-md border border-indigo-700/40">✓ Honest Renegotiation Protected</span>
          </div>
        </div>
      </div>

      {/* Sub Tabs Navigation */}
      <div className="flex border-b border-slate-800 space-x-2 md:space-x-6 text-sm font-medium overflow-x-auto pb-1">
        <button
          onClick={() => setActiveSubTab("contract")}
          className={`pb-2.5 px-1 whitespace-nowrap transition-colors border-b-2 flex items-center gap-2 ${
            activeSubTab === "contract"
              ? "border-indigo-500 text-indigo-400 font-semibold"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <FileCheck className="w-4 h-4" />
          Personal Commitment Contract
        </button>
        <button
          onClick={() => setActiveSubTab("universal_ledger")}
          className={`pb-2.5 px-1 whitespace-nowrap transition-colors border-b-2 flex items-center gap-2 ${
            activeSubTab === "universal_ledger"
              ? "border-indigo-500 text-indigo-400 font-semibold"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <Scale className="w-4 h-4" />
          Universal Ledger (Student to PM)
        </button>
        <button
          onClick={() => setActiveSubTab("scenarios")}
          className={`pb-2.5 px-1 whitespace-nowrap transition-colors border-b-2 flex items-center gap-2 ${
            activeSubTab === "scenarios"
              ? "border-indigo-500 text-indigo-400 font-semibold"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <UserCheck className="w-4 h-4" />
          20 Scenario Test Lab
        </button>
        <button
          onClick={() => setActiveSubTab("safeguards")}
          className={`pb-2.5 px-1 whitespace-nowrap transition-colors border-b-2 flex items-center gap-2 ${
            activeSubTab === "safeguards"
              ? "border-indigo-500 text-indigo-400 font-semibold"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <ShieldAlert className="w-4 h-4" />
          Safeguards & Formula
        </button>
      </div>

      {/* TAB 1: PERSONAL COMMITMENT CONTRACT */}
      {activeSubTab === "contract" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Contract Builder (Left 2 cols) */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-6 shadow-sm">
              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 font-bold">
                    1
                  </div>
                  <h2 className="text-lg font-semibold text-white">Daily Commitment Contract</h2>
                </div>
                <span className="text-xs bg-slate-800 text-slate-300 px-2.5 py-1 rounded-md border border-slate-700">
                  Persona: {PERSONA_PROFILES[selectedPersona].label}
                </span>
              </div>

              {/* Persona Selector */}
              <div className="mt-4">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-2">
                  Select Persona to Calibrate Expectations
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {(Object.keys(PERSONA_PROFILES) as PersonaType[]).slice(0, 4).map((pKey) => {
                    const prof = PERSONA_PROFILES[pKey];
                    return (
                      <button
                        key={pKey}
                        onClick={() => {
                          setSelectedPersona(pKey);
                          setCommitmentText(prof.sampleCommitment);
                          setSelectedVerification(prof.defaultVerification);
                          setContractCreated(false);
                        }}
                        className={`text-left p-2.5 rounded-lg border text-xs transition-all ${
                          selectedPersona === pKey
                            ? "bg-indigo-600/20 border-indigo-500/50 text-indigo-200 font-medium"
                            : "bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200"
                        }`}
                      >
                        <div className="font-medium text-slate-200">{prof.label}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Commitment Input */}
              <div className="mt-5 space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 block">
                  What will you accomplish consciously?
                </label>
                <textarea
                  value={commitmentText}
                  onChange={(e) => setCommitmentText(e.target.value)}
                  rows={2}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-sm text-slate-100 focus:outline-none focus:border-indigo-500 placeholder-slate-500"
                  placeholder="e.g. Master equivalent fractions..."
                />
              </div>

              {/* Estimated Focused Time */}
              <div className="mt-5">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-2">
                  Estimated Focused Time
                </label>
                <div className="flex gap-2">
                  {[15, 30, 45, 60, 90, 120].map((mins) => (
                    <button
                      key={mins}
                      onClick={() => setSelectedTime(mins)}
                      className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-colors ${
                        selectedTime === mins
                          ? "bg-indigo-600 text-white border-indigo-500"
                          : "bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      {mins < 60 ? `${mins}m` : `${mins / 60}h`}
                    </button>
                  ))}
                </div>
              </div>

              {/* How will you verify it? */}
              <div className="mt-5">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-2">
                  How will you verify completion? (Evidence Standard)
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {[
                    { type: "assessment_result" as VerificationType, label: "Assessment or Quiz", desc: "Solve novel problems independently" },
                    { type: "tangible_deliverable" as VerificationType, label: "Deliverable / Artifact", desc: "Code, notes, report, or signed file" },
                    { type: "personal_reflection" as VerificationType, label: "Private Reflection", desc: "Honest self-check (no surveillance)" }
                  ].map((v) => (
                    <button
                      key={v.type}
                      onClick={() => setSelectedVerification(v.type)}
                      className={`p-3 rounded-lg border text-left transition-all ${
                        selectedVerification === v.type
                          ? "bg-indigo-950/60 border-indigo-500 text-indigo-200"
                          : "bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700"
                      }`}
                    >
                      <div className="text-xs font-medium text-slate-200">{v.label}</div>
                      <div className="text-[11px] text-slate-400 mt-1 leading-snug">{v.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Action Button */}
              <div className="mt-6 pt-4 border-t border-slate-800 flex items-center justify-between">
                <div className="text-xs text-slate-400">
                  <span className="text-emerald-400">✓ Safeguard:</span> Failure due to illness or family duty will never hurt reliability.
                </div>
                {!contractCreated ? (
                  <button
                    onClick={handleCreateContract}
                    className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-all shadow-md shadow-indigo-950 flex items-center gap-2"
                  >
                    <Check className="w-4 h-4" />
                    Lock In Commitment
                  </button>
                ) : (
                  <div className="flex items-center gap-2 text-xs font-medium text-emerald-400 bg-emerald-950/50 border border-emerald-800/60 px-3 py-1.5 rounded-md">
                    <CheckCircle2 className="w-4 h-4" /> Commitment Active
                  </div>
                )}
              </div>
            </div>

            {/* Contract Execution & Resolution State (Shown when created) */}
            {contractCreated && (
              <div className="bg-slate-900 border border-indigo-900/40 rounded-xl p-6 shadow-sm space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-indigo-400" />
                    <span className="text-sm font-semibold text-white">Execution & Honest Reflection</span>
                  </div>
                  <span className="text-xs text-indigo-300">Scheduled: {selectedTime} minutes</span>
                </div>

                <div className="space-y-3">
                  <div className="text-xs text-slate-300 font-medium">Current Status:</div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { key: "in_progress", label: "In Progress", color: "border-blue-500 bg-blue-950/40 text-blue-300" },
                      { key: "completed", label: "Completed & Verified", color: "border-emerald-500 bg-emerald-950/40 text-emerald-300" },
                      { key: "blocked", label: "Blocked by Obstacle", color: "border-amber-500 bg-amber-950/40 text-amber-300" },
                      { key: "renegotiated", label: "Valid Renegotiation", color: "border-purple-500 bg-purple-950/40 text-purple-300" }
                    ].map((st) => (
                      <button
                        key={st.key}
                        onClick={() => setContractStatus(st.key as any)}
                        className={`p-2.5 rounded-md border text-xs font-medium transition-all ${
                          contractStatus === st.key ? st.color : "border-slate-800 bg-slate-950 text-slate-400"
                        }`}
                      >
                        {st.label}
                      </button>
                    ))}
                  </div>

                  {contractStatus === "blocked" && (
                    <div className="mt-3 p-4 rounded-lg bg-amber-950/20 border border-amber-800/40 space-y-3">
                      <div className="flex items-center gap-2 text-xs font-semibold text-amber-300">
                        <AlertTriangle className="w-4 h-4" />
                        Diagnose Root Block (No Guilt)
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        {[
                          { id: "avoidance_friction", label: "Avoidance / Friction (Feasible but started late)" },
                          { id: "resource_constraint", label: "Resource Deficit (Lacked tool, quiet space, power)" },
                          { id: "illness_exhaustion", label: "Illness or Acute Physical Fatigue" },
                          { id: "priority_evolution", label: "Consciously Reprioritized Urgent Family/Care" }
                        ].map((r) => (
                          <button
                            key={r.id}
                            onClick={() => setNonDisciplineReason(r.id)}
                            className={`p-2 rounded text-left border transition-all ${
                              nonDisciplineReason === r.id
                                ? "bg-amber-900/50 border-amber-600 text-amber-100"
                                : "bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700"
                            }`}
                          >
                            {r.label}
                          </button>
                        ))}
                      </div>
                      {nonDisciplineReason && (
                        <div className="text-xs text-slate-300 bg-slate-900/80 p-2.5 rounded border border-slate-800">
                          <span className="font-semibold text-indigo-300">ARGUS Adaptive Intervention:</span>{" "}
                          {nonDisciplineReason === "illness_exhaustion"
                            ? "Zero penalty. Quota suspended. Prioritize 8 hours of sleep or clinical rest."
                            : nonDisciplineReason === "avoidance_friction"
                            ? "Shrink starting step to 5 minutes. Remove phone from workspace."
                            : nonDisciplineReason === "resource_constraint"
                            ? "Routing to offline paper exercises or local peer cache."
                            : "Honest reprioritization logged in advance; reliability score remains 100%."}
                        </div>
                      )}
                    </div>
                  )}

                  {contractStatus === "completed" && (
                    <div className="p-4 rounded-lg bg-emerald-950/30 border border-emerald-800/50 flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                      <div>
                        <div className="text-sm font-semibold text-emerald-200">Commitment Verified!</div>
                        <p className="text-xs text-slate-300 mt-1">
                          Evidence attached and logged in your private ledger. Your Reliability score updated cleanly.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Right Sidebar: Principles & Safeguards */}
          <div className="space-y-4">
            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2 mb-3">
                <Sparkles className="w-4 h-4 text-indigo-400" />
                The 5 Accountability Mechanisms
              </h3>
              <div className="space-y-3">
                {ACCOUNTABILITY_MECHANISMS.map((m) => (
                  <div key={m.id} className="p-2.5 rounded-lg bg-slate-950 border border-slate-800/80 text-xs">
                    <div className="font-medium text-slate-200">{m.title}</div>
                    <div className="text-slate-400 mt-0.5">{m.description}</div>
                    <div className="text-[10px] text-indigo-400/90 mt-1.5 flex items-center gap-1">
                      <ShieldAlert className="w-3 h-3 shrink-0" />
                      {m.safeguard}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5">
              <h3 className="text-sm font-semibold text-white mb-2">Accountability Without Guilt</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Missed commitments are diagnostic data, never character verdicts. Artificial streaks 
                that penalize sickness or family emergencies are forbidden in ARGUS.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: UNIVERSAL LEDGER (STUDENT TO PM) */}
      {activeSubTab === "universal_ledger" && (
        <div className="space-y-6">
          {/* Level Explainer */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-xl">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-blue-400">Level 1</span>
                <span className="text-[10px] bg-blue-950 text-blue-300 px-2 py-0.5 rounded border border-blue-800">100% Private</span>
              </div>
              <h3 className="text-sm font-bold text-white">Personal Accountability</h3>
              <p className="text-xs text-slate-400 mt-1">
                Student studying, parent time, personal health. Zero public ranking, no peer humiliation.
              </p>
            </div>

            <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-xl">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-purple-400">Level 2</span>
                <span className="text-[10px] bg-purple-950 text-purple-300 px-2 py-0.5 rounded border border-purple-800">Role-Authorized</span>
              </div>
              <h3 className="text-sm font-bold text-white">Professional Accountability</h3>
              <p className="text-xs text-slate-400 mt-1">
                Shopkeepers, doctors, founders. Shared only with patients, clients, and authorized supervisors.
              </p>
            </div>

            <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-xl">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-amber-400">Level 3</span>
                <span className="text-[10px] bg-amber-950 text-amber-300 px-2 py-0.5 rounded border border-amber-800">Lawfully Public</span>
              </div>
              <h3 className="text-sm font-bold text-white">Public Accountability</h3>
              <p className="text-xs text-slate-400 mt-1">
                Elected representatives, Prime Minister. Verifiable evidence of public spending and service delivery.
              </p>
            </div>
          </div>

          {/* Role Filter Tabs */}
          <div className="flex items-center justify-between flex-wrap gap-3 pb-2 border-b border-slate-800">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
              {(Object.keys(ROLE_CONFIGS) as RoleCategory[]).map((rKey) => {
                const conf = ROLE_CONFIGS[rKey];
                return (
                  <button
                    key={rKey}
                    onClick={() => {
                      setLedgerRole(rKey);
                      const match = ledgerItems.find(i => i.role === rKey);
                      if (match) setSelectedLedgerItem(match);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      ledgerRole === rKey
                        ? "bg-indigo-600 text-white shadow-sm"
                        : "bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800"
                    }`}
                  >
                    {conf.title.split("(")[0].trim()}
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-400">Level Filter:</span>
              {(["all", "personal", "professional", "public"] as const).map((lvl) => (
                <button
                  key={lvl}
                  onClick={() => setLedgerLevelFilter(lvl)}
                  className={`px-2 py-1 rounded text-xs capitalize transition-colors ${
                    ledgerLevelFilter === lvl
                      ? "bg-slate-700 text-white font-medium"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {lvl}
                </button>
              ))}
            </div>
          </div>

          {/* Active Ledger Inspector & List */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Ledger List (5 cols) */}
            <div className="lg:col-span-5 space-y-3">
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Commitment Ledger Entries ({ledgerItems.length})
              </div>
              <div className="space-y-2.5 max-h-[560px] overflow-y-auto pr-1">
                {ledgerItems
                  .filter(item => ledgerLevelFilter === "all" || item.level === ledgerLevelFilter)
                  .map((item) => {
                    const isSelected = selectedLedgerItem?.id === item.id;
                    return (
                      <div
                        key={item.id}
                        onClick={() => setSelectedLedgerItem(item)}
                        className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                          isSelected
                            ? "bg-indigo-950/40 border-indigo-500 shadow-md"
                            : "bg-slate-900/80 border-slate-800 hover:border-slate-700 hover:bg-slate-900"
                        }`}
                      >
                        <div className="flex items-center justify-between text-[11px] mb-1">
                          <span className="font-semibold text-slate-300">{item.responsibleEntity.designation}</span>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-medium uppercase ${
                              item.status === "completed_verified"
                                ? "bg-emerald-950 text-emerald-400 border border-emerald-800"
                                : item.status === "disputed"
                                ? "bg-amber-950 text-amber-400 border border-amber-800"
                                : "bg-purple-950 text-purple-400 border border-purple-800"
                            }`}
                          >
                            {item.status.replace("_", " ")}
                          </span>
                        </div>
                        <div className="text-xs font-medium text-slate-100 line-clamp-2">{item.commitment}</div>
                        <div className="mt-2 flex items-center justify-between text-[10px] text-slate-400">
                          <span>Due: {item.dueDate}</span>
                          <span className="flex items-center gap-1 text-indigo-400">
                            {item.evidence.length} Evidence attached <ChevronRight className="w-3 h-3" />
                          </span>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>

            {/* Right Detailed Inspector (7 cols) */}
            <div className="lg:col-span-7">
              {selectedLedgerItem ? (
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-5">
                  <div className="flex items-start justify-between pb-4 border-b border-slate-800">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-800 uppercase font-medium">
                          {selectedLedgerItem.level} Accountability
                        </span>
                        <span className="text-xs text-slate-400">ID: {selectedLedgerItem.id}</span>
                      </div>
                      <h3 className="text-base font-bold text-white mt-2">
                        {selectedLedgerItem.responsibleEntity.name}
                      </h3>
                      <div className="text-xs text-slate-400">
                        {selectedLedgerItem.responsibleEntity.designation} · {selectedLedgerItem.responsibleEntity.organizationOrJurisdiction}
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-xs text-slate-400">Visibility Rule:</div>
                      <span className="text-xs font-medium text-indigo-400">
                        {selectedLedgerItem.visibility.replace("_", " ")}
                      </span>
                    </div>
                  </div>

                  {/* Commitment Details */}
                  <div className="space-y-3">
                    <div>
                      <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block">
                        Official Commitment
                      </label>
                      <p className="text-sm font-medium text-slate-100 mt-1">
                        {selectedLedgerItem.commitment}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                        <span className="text-slate-400 block">Target Metric:</span>
                        <span className="text-slate-200 font-medium">{selectedLedgerItem.targetMetric}</span>
                      </div>
                      <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                        <span className="text-slate-400 block">Dependencies:</span>
                        <span className="text-slate-200 font-medium">
                          {selectedLedgerItem.dependencies.join(", ")}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Evidence Ledger Section */}
                  <div>
                    <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block mb-2">
                      Attached Evidence & Audit Proof ({selectedLedgerItem.evidence.length})
                    </label>
                    <div className="space-y-2">
                      {selectedLedgerItem.evidence.map((ev) => (
                        <div key={ev.id} className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-xs">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                              <FileText className="w-3.5 h-3.5 text-indigo-400" />
                              {ev.title}
                            </span>
                            <span
                              className={`text-[10px] px-2 py-0.5 rounded font-medium ${
                                ev.isAllegationOrFact === "verified_fact"
                                  ? "bg-emerald-950 text-emerald-400"
                                  : "bg-amber-950 text-amber-400"
                              }`}
                            >
                              {ev.isAllegationOrFact.replace("_", " ")}
                            </span>
                          </div>
                          <div className="mt-1 flex items-center justify-between text-slate-400 text-[11px]">
                            <span>Verified by: {ev.verifiedBy || "Automated System"}</span>
                            <span className="font-mono text-[10px] text-slate-500">{ev.uriOrHash}</span>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Attach New Evidence Form */}
                    <div className="mt-3 p-3 rounded-lg bg-indigo-950/20 border border-indigo-900/30 space-y-2">
                      <span className="text-xs font-semibold text-indigo-300 block">Attach Independent Verification</span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <input
                          type="text"
                          placeholder="Evidence description or citation..."
                          value={newEvidenceText}
                          onChange={(e) => setNewEvidenceText(e.target.value)}
                          className="bg-slate-950 border border-slate-700 text-xs rounded px-2.5 py-1.5 text-white placeholder-slate-500"
                        />
                        <input
                          type="text"
                          placeholder="Verifying authority / audit source..."
                          value={newEvidenceSource}
                          onChange={(e) => setNewEvidenceSource(e.target.value)}
                          className="bg-slate-950 border border-slate-700 text-xs rounded px-2.5 py-1.5 text-white placeholder-slate-500"
                        />
                      </div>
                      <button
                        onClick={() => handleAttachEvidenceToLedger(selectedLedgerItem.id)}
                        className="px-3 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-xs text-white font-medium transition-colors"
                      >
                        Submit Evidence to Ledger
                      </button>
                    </div>
                  </div>

                  {/* Deviation & Mitigation (If present) */}
                  {selectedLedgerItem.deviation && (
                    <div className="p-3.5 rounded-lg bg-amber-950/20 border border-amber-900/40 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-amber-300 flex items-center gap-1.5">
                          <AlertTriangle className="w-4 h-4" />
                          Documented Deviation & Explanation
                        </span>
                        <span className="text-[10px] bg-amber-900/60 text-amber-200 px-2 py-0.5 rounded">
                          {selectedLedgerItem.deviation.rootCause.replace("_", " ")}
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed">
                        {selectedLedgerItem.deviation.narrative}
                      </p>
                      <div className="text-xs text-indigo-300 pt-1 border-t border-amber-900/30">
                        <span className="font-semibold text-slate-400">Corrective Action:</span>{" "}
                        {selectedLedgerItem.deviation.mitigationPlanned}
                      </div>
                    </div>
                  )}

                  {/* UNESCO Safeguard Footer */}
                  <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-400 flex items-start gap-2">
                    <ShieldAlert className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold text-emerald-300">UNESCO Human Rights Safeguard:</span>{" "}
                      {selectedLedgerItem.safeguardRule}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-12 text-center text-slate-500 bg-slate-900/50 rounded-xl border border-slate-800">
                  Select a ledger item on the left to inspect its commitments and verified evidence.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: 20 SCENARIOS TEST LAB */}
      {activeSubTab === "scenarios" && (
        <div className="space-y-6">
          {/* Summary Reliability Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl">
              <span className="text-xs text-slate-400">Verified Reliability</span>
              <div className="text-2xl font-bold text-emerald-400 mt-1">
                {stats.verifiedReliabilityPct}%
              </div>
              <span className="text-[11px] text-slate-500">
                {stats.verifiedCompleted} of {stats.eligibleDue} eligible commitments
              </span>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl">
              <span className="text-xs text-slate-400">Advance Renegotiated</span>
              <div className="text-2xl font-bold text-purple-400 mt-1">
                {stats.renegotiated}
              </div>
              <span className="text-[11px] text-purple-400/80">
                Excluded from failure penalty
              </span>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl">
              <span className="text-xs text-slate-400">Protected Recovery</span>
              <div className="text-2xl font-bold text-blue-400 mt-1">
                {stats.illnessRecovery}
              </div>
              <span className="text-[11px] text-blue-400/80">
                Sickness & medical emergency
              </span>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl">
              <span className="text-xs text-slate-400">Avoidance Friction</span>
              <div className="text-2xl font-bold text-amber-400 mt-1">
                {stats.avoidedFailures}
              </div>
              <span className="text-[11px] text-amber-400/80">
                Feasible; diagnosed for friction
              </span>
            </div>
          </div>

          {/* Scenario Filters */}
          <div className="flex items-center justify-between flex-wrap gap-2 pb-2 border-b border-slate-800">
            <div className="flex items-center gap-1.5 overflow-x-auto">
              <button
                onClick={() => setScenarioFilter("all")}
                className={`px-3 py-1 rounded text-xs transition-colors ${
                  scenarioFilter === "all" ? "bg-indigo-600 text-white font-medium" : "text-slate-400 hover:text-slate-200"
                }`}
              >
                All 20 Scenarios
              </button>
              {(Object.keys(PERSONA_PROFILES) as PersonaType[]).map((pKey) => (
                <button
                  key={pKey}
                  onClick={() => setScenarioFilter(pKey)}
                  className={`px-2.5 py-1 rounded text-xs transition-colors ${
                    scenarioFilter === pKey ? "bg-indigo-600 text-white font-medium" : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {PERSONA_PROFILES[pKey].label}
                </button>
              ))}
            </div>
          </div>

          {/* Scenario Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredScenarios.map((sc) => {
              const prof = PERSONA_PROFILES[sc.persona];
              return (
                <div
                  key={sc.id}
                  className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3 hover:border-slate-700 transition-all"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-indigo-300">{prof.label}</span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                        sc.status === "completed_verified"
                          ? "bg-emerald-950 text-emerald-400 border border-emerald-800"
                          : sc.status === "completed_self_reported"
                          ? "bg-blue-950 text-blue-400 border border-blue-800"
                          : sc.status === "renegotiated_valid"
                          ? "bg-purple-950 text-purple-400 border border-purple-800"
                          : sc.status === "paused_recovery"
                          ? "bg-teal-950 text-teal-400 border border-teal-800"
                          : "bg-amber-950 text-amber-400 border border-amber-800"
                      }`}
                    >
                      {sc.status.replace("_", " ")}
                    </span>
                  </div>

                  <div>
                    <h4 className="text-sm font-semibold text-slate-100">{sc.title}</h4>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      {sc.estimatedMinutes} mins · Window: {sc.scheduledWindow} · Method: {sc.verificationMethod.replace("_", " ")}
                    </div>
                  </div>

                  {sc.evidence && (
                    <div className="p-2.5 rounded bg-slate-950 border border-slate-800 text-xs">
                      <span className="text-emerald-400 font-medium">✓ Verified Evidence:</span>{" "}
                      <span className="text-slate-300">{sc.evidence.description}</span>
                    </div>
                  )}

                  {sc.obstacle && (
                    <div className="p-2.5 rounded bg-amber-950/20 border border-amber-900/40 text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-amber-300 font-medium">
                          Root Cause: {sc.obstacle.category.replace("_", " ")}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          Discipline Failure: {sc.obstacle.isDisciplineFailure ? "Yes (Avoidance)" : "No (External/Health)"}
                        </span>
                      </div>
                      <p className="text-slate-300 text-[11px]">{sc.obstacle.rootCause}</p>
                      <div className="text-indigo-300 text-[11px] pt-1 border-t border-amber-900/30">
                        <span className="text-slate-400">ARGUS Action:</span> {sc.obstacle.systemicIntervention}
                      </div>
                    </div>
                  )}

                  {sc.adaptiveTomorrowRecommendation && (
                    <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
                      <RotateCcw className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                      <span>Tomorrow: {sc.adaptiveTomorrowRecommendation}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 4: SAFEGUARDS & FORMULA */}
      {activeSubTab === "safeguards" && (
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-5">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Scale className="w-5 h-5 text-indigo-400" />
              Evidence-Backed Commitment Reliability Formula
            </h2>
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-center font-mono text-sm text-indigo-300">
              {"Reliability = (Verified Completed Commitments / Eligible Commitments Due) × 100"}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-300">
              <div className="p-4 rounded-lg bg-slate-950 border border-slate-800 space-y-2">
                <span className="font-semibold text-emerald-400 text-sm block">What is Excluded from Denominator?</span>
                <ul className="space-y-1.5 list-disc pl-4 text-slate-400">
                  <li>
                    <strong className="text-slate-200">Honest Renegotiation in Advance:</strong> Changing plans when circumstances shift is mature executive functioning, not a moral failure.
                  </li>
                  <li>
                    <strong className="text-slate-200">Illness & Physical Exhaustion:</strong> Medical rest is protected by the Health Engine; no artificial streak penalizes biology.
                  </li>
                  <li>
                    <strong className="text-slate-200">Infrastructure Failures:</strong> Power cuts, server outages, and transport breakdowns are logged as systemic constraints.
                  </li>
                </ul>
              </div>

              <div className="p-4 rounded-lg bg-slate-950 border border-slate-800 space-y-2">
                <span className="font-semibold text-indigo-400 text-sm block">Separation of Evidence</span>
                <ul className="space-y-1.5 list-disc pl-4 text-slate-400">
                  <li>
                    <strong className="text-slate-200">Independently Verified:</strong> Code PR merged, exam scored, financial audit signed by external accountant.
                  </li>
                  <li>
                    <strong className="text-slate-200">Self-Reported Reflections:</strong> Private time with children, meditation, or daily walking routines.
                  </li>
                  <li>
                    <strong className="text-slate-200">No Coercive Biometrics:</strong> Never uses webcams, keystroke surveillance, or invasive employee trackers.
                  </li>
                </ul>
              </div>
            </div>

            <div className="p-4 rounded-lg bg-red-950/20 border border-red-900/40 text-xs text-red-200 space-y-2">
              <span className="font-semibold text-red-300 flex items-center gap-1.5 text-sm">
                <ShieldAlert className="w-4 h-4" />
                The Permanent ARGUS Anti-Surveillance Safeguard (UNESCO AI Ethics)
              </span>
              <p className="leading-relaxed text-slate-300">
                ARGUS strictly bans universal citizen social scoring. A person's moral worth cannot be reduced to a single number. 
                Whether a student, a farmer, an entrepreneur, or a politician, every evaluation is granular, temporary, context-aware, 
                and equipped with a constitutional right of appeal.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
