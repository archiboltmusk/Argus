import React, { useState } from "react";
import {
  FileText,
  Sparkles,
  Building2,
  CheckCircle2,
  Search,
  ShieldCheck,
  ShieldAlert,
  BarChart3,
  HelpCircle,
  Scale,
  Lock
} from "lucide-react";
import {
  PublicProject,
  CivicServiceJourney,
  SAMPLE_PUBLIC_PROJECTS,
  CIVIC_SERVICE_JOURNEYS,
  ARGUS_TRUST_METRICS
} from "../../lib/lifemaxxing/trust/trust-engine";

export const TrustModule: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"tracker" | "navigator" | "reporting" | "metrics">("tracker");
  const [selectedProject, setSelectedProject] = useState<PublicProject>(SAMPLE_PUBLIC_PROJECTS[0]);
  const [selectedService, setSelectedService] = useState<CivicServiceJourney>(CIVIC_SERVICE_JOURNEYS[0]);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredServices = CIVIC_SERVICE_JOURNEYS.filter(s =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.department.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-950 via-slate-900 to-indigo-950 p-6 md:p-8 border border-emerald-800/40 shadow-xl">
        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-medium mb-3">
            <ShieldCheck className="w-3.5 h-3.5" />
            ARGUS TRUST · Institutional Integrity Infrastructure
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
            Building a Society Where Corruption Becomes Difficult
          </h1>
          <p className="mt-2 text-sm md:text-base text-slate-300 leading-relaxed">
            Corruption declines when misconduct is hard to conceal, legitimate processes are easy to complete, 
            and citizens don't need personal connections, bribes, or blind faith to receive what they are lawfully entitled to.
          </p>
          <div className="mt-4 flex flex-wrap gap-2 text-xs text-emerald-200/80">
            <span className="bg-emerald-900/60 px-2.5 py-1 rounded-md border border-emerald-700/40">✓ Traceable Public Money</span>
            <span className="bg-emerald-900/60 px-2.5 py-1 rounded-md border border-emerald-700/40">✓ Clear Fees & Zero Touts</span>
            <span className="bg-emerald-900/60 px-2.5 py-1 rounded-md border border-emerald-700/40">✓ Zero Algorithmic Guilt</span>
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex border-b border-slate-800 space-x-2 md:space-x-6 text-sm font-medium overflow-x-auto pb-1">
        <button
          onClick={() => setActiveTab("tracker")}
          className={`pb-2.5 px-1 whitespace-nowrap transition-colors border-b-2 flex items-center gap-2 ${
            activeTab === "tracker"
              ? "border-emerald-500 text-emerald-400 font-semibold"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <Building2 className="w-4 h-4" />
          Public Money Tracker
        </button>
        <button
          onClick={() => setActiveTab("navigator")}
          className={`pb-2.5 px-1 whitespace-nowrap transition-colors border-b-2 flex items-center gap-2 ${
            activeTab === "navigator"
              ? "border-emerald-500 text-emerald-400 font-semibold"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <FileText className="w-4 h-4" />
          Civic Service Navigator
        </button>
        <button
          onClick={() => setActiveTab("reporting")}
          className={`pb-2.5 px-1 whitespace-nowrap transition-colors border-b-2 flex items-center gap-2 ${
            activeTab === "reporting"
              ? "border-emerald-500 text-emerald-400 font-semibold"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <Lock className="w-4 h-4" />
          Protected Reporting & Evidence Vault
        </button>
        <button
          onClick={() => setActiveTab("metrics")}
          className={`pb-2.5 px-1 whitespace-nowrap transition-colors border-b-2 flex items-center gap-2 ${
            activeTab === "metrics"
              ? "border-emerald-500 text-emerald-400 font-semibold"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          Trust Metrics & Principles
        </button>
      </div>

      {/* TAB 1: PUBLIC MONEY TRACKER */}
      {activeTab === "tracker" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Project Selector (4 cols) */}
            <div className="lg:col-span-4 space-y-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 block">
                Tracked Public Works ({SAMPLE_PUBLIC_PROJECTS.length})
              </span>
              <div className="space-y-2.5">
                {SAMPLE_PUBLIC_PROJECTS.map((proj) => {
                  const isSelected = selectedProject.id === proj.id;
                  return (
                    <div
                      key={proj.id}
                      onClick={() => setSelectedProject(proj)}
                      className={`p-4 rounded-xl border cursor-pointer transition-all ${
                        isSelected
                          ? "bg-emerald-950/40 border-emerald-500 shadow-md"
                          : "bg-slate-900/80 border-slate-800 hover:border-slate-700"
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs mb-1.5">
                        <span className="font-bold text-white">{proj.publishedBudgetFormatted}</span>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                            proj.status === "completed_audited"
                              ? "bg-emerald-950 text-emerald-400 border border-emerald-800"
                              : "bg-amber-950 text-amber-400 border border-amber-800"
                          }`}
                        >
                          {proj.status.replace("_", " ")}
                        </span>
                      </div>
                      <h4 className="text-sm font-semibold text-slate-200 line-clamp-2">{proj.title}</h4>
                      <div className="text-[11px] text-slate-400 mt-2">
                        {proj.jurisdiction}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Informational Card */}
              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-400 space-y-2">
                <span className="font-semibold text-slate-200 block">How Evidence-Based Transparency Works:</span>
                <p>
                  Instead of relying on whispers or political allegations, citizens can audit official tender publications, 
                  work orders, and third-party lab tests in one unified view.
                </p>
              </div>
            </div>

            {/* Right Project Detail & Milestones (8 cols) */}
            <div className="lg:col-span-8">
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-6">
                {/* Project Header */}
                <div className="flex items-start justify-between pb-4 border-b border-slate-800">
                  <div>
                    <span className="text-xs text-indigo-400 font-mono">{selectedProject.department}</span>
                    <h2 className="text-lg font-bold text-white mt-1">{selectedProject.title}</h2>
                    <div className="text-xs text-slate-400 mt-0.5">{selectedProject.jurisdiction}</div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-slate-400 block">Published Budget</span>
                    <span className="text-xl font-extrabold text-emerald-400">{selectedProject.publishedBudgetFormatted}</span>
                    <span className="text-[11px] text-slate-500 block">Due: {selectedProject.completionDeadline}</span>
                  </div>
                </div>

                {/* Milestone Pipeline */}
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
                    Documented Project Milestones
                  </h3>
                  <div className="space-y-3">
                    {selectedProject.milestones.map((m, idx) => (
                      <div
                        key={m.id}
                        className="p-3.5 rounded-lg bg-slate-950 border border-slate-800 flex items-start justify-between gap-3 text-xs"
                      >
                        <div className="flex items-start gap-3">
                          <div className="w-5 h-5 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-[10px] text-slate-300 shrink-0 mt-0.5">
                            {idx + 1}
                          </div>
                          <div>
                            <div className="font-semibold text-slate-200">{m.title}</div>
                            <div className="text-slate-400 text-[11px] mt-0.5">{m.evidenceDescription}</div>
                            {m.evidenceHash && (
                              <div className="text-[10px] font-mono text-indigo-400/90 mt-1">
                                Hash: {m.evidenceHash}
                              </div>
                            )}
                          </div>
                        </div>

                        <span
                          className={`px-2.5 py-1 rounded text-[10px] font-medium uppercase shrink-0 ${
                            m.status === "verified"
                              ? "bg-emerald-950 text-emerald-400 border border-emerald-800"
                              : m.status === "evidence_pending"
                              ? "bg-amber-950 text-amber-400 border border-amber-800"
                              : "bg-red-950 text-red-400 border border-red-800"
                          }`}
                        >
                          {m.status.replace("_", " ")}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* ARGUS Integrity Assessment Box */}
                <div className="p-4 rounded-xl bg-slate-950 border border-indigo-900/40 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-indigo-300 flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-indigo-400" />
                      ARGUS Civic Assessment & Recommendation
                    </span>
                    <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded">
                      Zero Automated Guilt Guarantee
                    </span>
                  </div>

                  <p className="text-xs text-slate-200 leading-relaxed font-medium">
                    {selectedProject.integrityAssessment.verdict}
                  </p>

                  <div className="p-3 rounded-lg bg-indigo-950/30 border border-indigo-800/40 text-xs text-indigo-200">
                    <span className="font-semibold text-white">Suggested Action:</span>{" "}
                    {selectedProject.integrityAssessment.actionableStep}
                  </div>

                  <div className="text-[11px] text-slate-400 flex items-center gap-1.5 pt-1">
                    <ShieldAlert className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>
                      Missing records prompt an official inquiry under statutory RTI / Open Data laws—they never constitute criminal accusation.
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: CIVIC SERVICE NAVIGATOR */}
      {activeTab === "navigator" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h2 className="text-lg font-bold text-white">Civic Service Navigator</h2>
              <p className="text-xs text-slate-400">
                Official statutory fees, required document checklists, and citizen grievance escalation lines.
              </p>
            </div>

            <div className="relative w-72">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search certificate or license..."
                className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Services List (4 cols) */}
            <div className="lg:col-span-4 space-y-2.5">
              {filteredServices.map((srv) => {
                const isSelected = selectedService.id === srv.id;
                return (
                  <div
                    key={srv.id}
                    onClick={() => setSelectedService(srv)}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                      isSelected
                        ? "bg-emerald-950/40 border-emerald-500 shadow-sm"
                        : "bg-slate-900/80 border-slate-800 hover:border-slate-700"
                    }`}
                  >
                    <div className="flex items-center justify-between text-[11px] mb-1">
                      <span className="font-semibold text-emerald-400">{srv.officialFee}</span>
                      <span className="text-slate-400">{srv.statutoryDays} Days Legal Limit</span>
                    </div>
                    <div className="text-xs font-semibold text-white">{srv.name}</div>
                    <div className="text-[11px] text-slate-400 mt-1">{srv.department}</div>
                  </div>
                );
              })}
            </div>

            {/* Right Detailed Procedure & Requirements (8 cols) */}
            <div className="lg:col-span-8">
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-5">
                <div className="flex items-start justify-between pb-4 border-b border-slate-800">
                  <div>
                    <span className="text-xs text-slate-400">{selectedService.department}</span>
                    <h3 className="text-lg font-bold text-white mt-0.5">{selectedService.name}</h3>
                    <div className="text-xs text-indigo-400 mt-1">
                      Responsible Office: {selectedService.responsibleOffice}
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-xs text-slate-400 block">Statutory Official Fee</span>
                    <span className="text-sm font-bold text-emerald-400 bg-emerald-950/60 px-3 py-1 rounded-md border border-emerald-800 inline-block mt-0.5">
                      {selectedService.officialFee}
                    </span>
                    <span className="text-[10px] text-slate-500 block mt-1">
                      Mandated turnaround: {selectedService.statutoryDays} working days
                    </span>
                  </div>
                </div>

                {/* Required Documents */}
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                    Exhaustive Document Checklist (No Extra Demands Allowed)
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    {selectedService.requiredDocuments.map((doc, idx) => (
                      <div key={idx} className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 flex items-start gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                        <span className="text-slate-200">{doc}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Step-by-Step Official Procedure */}
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                    Official Procedural Steps
                  </h4>
                  <div className="space-y-1.5 text-xs text-slate-300">
                    {selectedService.officialProcedure.map((st, idx) => (
                      <div key={idx} className="p-2.5 rounded-lg bg-slate-950 border border-slate-800/80">
                        {st}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Grievance Escalation Box */}
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
                  <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                    <HelpCircle className="w-4 h-4 text-indigo-400" />
                    Statutory Grievance & Escalation Channel
                  </span>
                  <div className="text-slate-400">
                    <span className="text-slate-200 font-medium">Online Portal:</span> {selectedService.grievanceChannel.portalName}
                  </div>
                  <div className="text-slate-400">
                    <span className="text-slate-200 font-medium">Helpline / Escalation:</span> {selectedService.grievanceChannel.escalationContact}
                  </div>
                  <div className="text-indigo-400 text-[11px]">
                    <span className="text-slate-400">Legal Authority:</span> {selectedService.grievanceChannel.statutoryAppellateAuthority}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: PROTECTED REPORTING & EVIDENCE VAULT */}
      {activeTab === "reporting" && (
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Protected Reporting & Evidence Vault</h3>
                <p className="text-xs text-slate-400">
                  Secure cryptographic preservation of payment receipts, demand notes, and public communications.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <span className="font-semibold text-emerald-400 block">1. Cryptographic Hashing</span>
                <p className="text-slate-400 leading-relaxed">
                  Every uploaded document receives a SHA-256 fingerprint timestamped locally. Proof of submission cannot be altered retroactively.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <span className="font-semibold text-indigo-400 block">2. Whistleblower Safeguards</span>
                <p className="text-slate-400 leading-relaxed">
                  Complaints are mapped directly to official statutory vigilance bodies (e.g., Central Vigilance Commission, Lokayukta) under legal whistleblower protection laws.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <span className="font-semibold text-purple-400 block">3. Anti-Retaliation Protocol</span>
                <p className="text-slate-400 leading-relaxed">
                  No public accusation walls or vigilante doxxing. Information is preserved safely for due legal process and human administrative review.
                </p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-indigo-950/20 border border-indigo-800/40 text-xs text-indigo-200">
              <strong className="text-white block mb-1">UNODC / OECD Anti-Corruption Alignment:</strong>
              ARGUS implements the United Nations Convention against Corruption (UNCAC) principles by focusing on 
              systemic prevention, transparent procedures, and accessible institutional redress rather than personal retribution.
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: TRUST METRICS & PRINCIPLES */}
      {activeTab === "metrics" && (
        <div className="space-y-6">
          {/* Trust Metrics Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {ARGUS_TRUST_METRICS.map((tm, idx) => (
              <div key={idx} className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-2">
                <span className="text-xs text-slate-400 block">{tm.name}</span>
                <div className="text-2xl font-bold text-white">{tm.currentValue}</div>
                <div className="text-[11px] text-emerald-400 font-medium">Benchmark: {tm.benchmark}</div>
                <p className="text-[11px] text-slate-400 leading-snug pt-1 border-t border-slate-800">
                  {tm.definition}
                </p>
              </div>
            ))}
          </div>

          {/* Constitutional Trust Principle */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Scale className="w-5 h-5 text-indigo-400" />
              The ARGUS Trust Doctrine
            </h3>
            <blockquote className="p-4 rounded-xl bg-slate-950 border-l-4 border-emerald-500 text-sm italic text-slate-200 leading-relaxed">
              "Trust should not be demanded by authority, bought by wealth, or manufactured through popularity. 
              It should be earned through truth, competence, fairness, and verifiable accountability."
            </blockquote>

            <div className="text-xs text-slate-400 leading-relaxed space-y-2">
              <p>
                A society cannot thrive when citizens must navigate an opaque labyrinth of discretionary approvals, 
                unrecorded demands, and unappealable delays. By turning official procedures into transparent, verifiable 
                checklists and tracking public projects with verifiable evidence, ARGUS makes integrity the natural default.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
