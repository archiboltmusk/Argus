import {
  Film,
  Sparkles,
  } from "lucide-react";
import { useState } from "react";
import {
  WORTHWHILE_MODES_DEFINITION,
  SAMPLE_EVOLUTION_REVIEW,
  SAMPLE_CONTRIBUTION_MATCHES,
  resolveWhatNow,
} from "@/lib/lifemaxxing/evolution/data";
import type {
  TimeAvailableSlot,
} from "@/lib/lifemaxxing/evolution/types";

export function LifeEvolutionModule() {
  const [feeling, setFeeling] = useState<"focused" | "tired" | "lost" | "lonely" | "curious" | "stressed">("focused");
  const [timeAvailable, setTimeAvailable] = useState<TimeAvailableSlot>("30min");
  const [activeTab, setActiveTab] = useState<"what_now" | "intentional_living" | "evolution_review" | "contribution">("what_now");
  const [leisureDecision, setLeisureDecision] = useState<"none" | "intentional_leisure" | "focus_first">("none");

  const recommendation = resolveWhatNow(feeling, timeAvailable);

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Hero Banner: The Life Evolution Engine */}
      <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-amber-950/40 via-orange-950/20 to-black/80 p-6 md:p-8 backdrop-blur-xl relative overflow-hidden shadow-2xl">
        <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />
        <div className="relative z-10 space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-400/30 bg-amber-500/10 px-3.5 py-1 text-xs font-semibold tracking-wide text-amber-300">
            <Sparkles className="h-3.5 w-3.5 text-amber-400" />
            <span>ARGUS · The Life Evolution Engine · Make Every Moment Matter</span>
          </div>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white">
                Live Deliberately, Not Mechanically
              </h2>
              <p className="mt-1 text-sm md:text-base text-white/70 max-w-3xl leading-relaxed">
                Watching a film develops imagination. A conversation deepens love. Rest restores judgment.
                The enemy is not leisure—the enemy is unconscious living. ARGUS helps you live deliberately without turning life into a productivity contest.
              </p>
            </div>

            {/* Credo Pill */}
            <div className="p-3.5 rounded-xl border border-amber-500/30 bg-amber-950/30 backdrop-blur-md max-w-xs">
              <div className="text-[10px] font-bold uppercase tracking-wider text-amber-400">Anti-Compulsive Rule</div>
              <p className="text-xs text-white/85 italic font-serif mt-0.5">
                &ldquo;Zero guilt for resting. Protect from unwanted distraction, but never control genuine leisure.&rdquo;
              </p>
            </div>
          </div>

          {/* Sub Navigation */}
          <div className="flex flex-wrap gap-2 pt-2 border-t border-white/10">
            {[
              { id: "what_now", label: "1. What is Most Worthwhile Now?" },
              { id: "intentional_living", label: "2. Intentional Living (Leisure vs Scrolling)" },
              { id: "evolution_review", label: "3. Life Evolution Review (No Life Score)" },
              { id: "contribution", label: "4. Contribution Intelligence" },
            ].map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as typeof activeTab)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium transition-all duration-200 cursor-pointer ${
                    isActive
                      ? "bg-amber-600 text-white shadow-lg shadow-amber-600/30 border border-amber-400/40"
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

      {/* TAB 1: WHAT IS MOST WORTHWHILE NOW? */}
      {activeTab === "what_now" && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Input Controls */}
            <div className="lg:col-span-1 rounded-2xl border border-white/10 bg-black/40 p-6 backdrop-blur-md space-y-4">
              <div className="space-y-2">
                <span className="text-xs font-bold uppercase tracking-wider text-white/50 block">How do you feel right now?</span>
                <div className="grid grid-cols-2 gap-2">
                  {(["focused", "tired", "lost", "lonely", "curious", "stressed"] as const).map((f) => (
                    <button
                      key={f}
                      onClick={() => setFeeling(f)}
                      className={`p-2.5 rounded-xl border text-xs font-bold capitalize transition-all cursor-pointer ${
                        feeling === f
                          ? "border-amber-500 bg-amber-950/40 text-white shadow-md shadow-amber-950/40"
                          : "border-white/5 bg-white/[0.02] text-white/70 hover:bg-white/[0.06] hover:text-white"
                      }`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t border-white/10">
                <span className="text-xs font-bold uppercase tracking-wider text-white/50 block">Time Available</span>
                <div className="grid grid-cols-3 gap-2">
                  {(["5min", "30min", "2hours"] as TimeAvailableSlot[]).map((t) => (
                    <button
                      key={t}
                      onClick={() => setTimeAvailable(t)}
                      className={`p-2 rounded-xl border text-xs font-mono font-bold transition-all cursor-pointer ${
                        timeAvailable === t
                          ? "border-amber-500 bg-amber-950/40 text-white shadow-md"
                          : "border-white/5 bg-white/[0.02] text-white/70 hover:bg-white/[0.06] hover:text-white"
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* The Worthwhile Action Result */}
            <div className="lg:col-span-2 rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-950/20 via-black/60 to-black/80 p-6 md:p-8 backdrop-blur-md space-y-5 shadow-2xl">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
                <div>
                  <span className="text-xs font-mono uppercase text-amber-400 font-bold">
                    Mode: {WORTHWHILE_MODES_DEFINITION[recommendation.mode].label} · {WORTHWHILE_MODES_DEFINITION[recommendation.mode].whatImproves}
                  </span>
                  <h3 className="text-xl font-bold text-white mt-0.5">{recommendation.title}</h3>
                </div>

                <span className="text-xs font-mono bg-white/5 text-white/80 border border-white/10 px-3 py-1 rounded-full">
                  Time Budget: {timeAvailable}
                </span>
              </div>

              <div className="p-4 rounded-xl border border-amber-500/40 bg-amber-950/20 space-y-2">
                <span className="text-[10px] uppercase font-mono text-amber-300 font-bold">Suggested Action</span>
                <p className="text-xs md:text-sm text-white/95 leading-relaxed font-medium">
                  {recommendation.actionDetails}
                </p>
              </div>

              <div className="p-4 rounded-xl border border-white/5 bg-white/[0.02] space-y-1 text-xs">
                <span className="text-[10px] uppercase font-mono text-white/50 font-bold">Guiding Principle</span>
                <p className="text-white/80 leading-relaxed font-serif italic">{recommendation.rationale}</p>
              </div>

              {/* 6 Modes Overview */}
              <div className="pt-3 border-t border-white/10 space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-white/40 block">The 6 Types of Worthwhile Time</span>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
                  {Object.entries(WORTHWHILE_MODES_DEFINITION).map(([k, v]) => (
                    <div
                      key={k}
                      className={`p-2 rounded-lg border text-center transition-all ${
                        recommendation.mode === k
                          ? "border-amber-500 bg-amber-500/20 text-white font-bold"
                          : "border-white/5 bg-white/[0.02] text-white/60"
                      }`}
                    >
                      <div className="text-[11px]">{v.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: INTENTIONAL LIVING (LEISURE VS SCROLLING) */}
      {activeTab === "intentional_living" && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="rounded-2xl border border-white/10 bg-black/40 p-6 md:p-8 backdrop-blur-md space-y-6">
            <div className="border-b border-white/10 pb-4">
              <span className="text-xs font-mono uppercase text-amber-400 font-bold">Protect People From Unwanted Distraction · Do Not Control Their Leisure</span>
              <h3 className="text-xl font-bold text-white mt-0.5">The Intentional Living Protocol</h3>
              <p className="text-xs md:text-sm text-white/70 mt-1 max-w-3xl leading-relaxed">
                ARGUS never shames you for watching a film or gaming. It introduces gentle friction only when you are in danger of falling into an unconscious, unplanned scrolling loop that you will later regret.
              </p>
            </div>

            {/* Interactive Dilemma Scenario */}
            <div className="p-6 rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-950/20 to-black/60 space-y-4">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-400">
                <Film className="h-4 w-4" />
                <span>Simulated Moment: 8:00 PM Study Plan vs Opening Social Media</span>
              </div>

              <blockquote className="p-4 rounded-xl border border-white/10 bg-black/40 text-sm text-white/90 italic font-serif leading-relaxed">
                &ldquo;You planned to study at 8:00 PM, but you are considering opening Instagram or streaming a video. Would you like 15 minutes of intentional relaxation, or would you prefer to complete your study session first?&rdquo;
              </blockquote>

              <div className="flex flex-wrap gap-3 pt-2">
                <button
                  onClick={() => setLeisureDecision("intentional_leisure")}
                  className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    leisureDecision === "intentional_leisure"
                      ? "bg-amber-500 text-black shadow-lg"
                      : "bg-white/10 text-white hover:bg-white/20"
                  }`}
                >
                  I choose 15m of Deliberate Leisure (Honored without Guilt)
                </button>
                <button
                  onClick={() => setLeisureDecision("focus_first")}
                  className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    leisureDecision === "focus_first"
                      ? "bg-emerald-500 text-black shadow-lg"
                      : "bg-white/10 text-white hover:bg-white/20"
                  }`}
                >
                  Help me resist the impulse — Complete study session first
                </button>
              </div>

              {leisureDecision === "intentional_leisure" && (
                <div className="p-3.5 rounded-xl border border-amber-500/30 bg-amber-950/20 text-xs text-amber-300 font-mono animate-in fade-in">
                  ✓ Deliberate decision acknowledged. ARGUS will mute notifications for 15 minutes and gently chime when your chosen rest window ends. Zero guilt.
                </div>
              )}

              {leisureDecision === "focus_first" && (
                <div className="p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-950/20 text-xs text-emerald-300 font-mono animate-in fade-in">
                  ✓ Friction activated. Opening 25-minute focus timer on your #1 concept. Distracting apps locked until timer completes.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: LIFE EVOLUTION REVIEW */}
      {activeTab === "evolution_review" && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="rounded-2xl border border-white/10 bg-black/40 p-6 md:p-8 backdrop-blur-md space-y-6">
            <div className="border-b border-white/10 pb-4">
              <span className="text-xs font-mono uppercase text-amber-400 font-bold">Goal-Relative Progress · No Single Vanity Score</span>
              <h3 className="text-xl font-bold text-white mt-0.5">Life Evolution Weekly Review</h3>
              <p className="text-xs md:text-sm text-white/70 mt-1 max-w-3xl leading-relaxed">
                ARGUS rejects a single universal score grading someone&apos;s existence. A person facing grief, illness, or poverty must never be classified as inferior because their measurable productivity dipped.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {SAMPLE_EVOLUTION_REVIEW.map((item) => (
                <div key={item.dimension} className="p-5 rounded-xl border border-white/10 bg-white/[0.02] space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-white">{item.dimension}</span>
                    <span className="text-sm font-bold font-mono text-amber-400">{item.percentAccomplished}%</span>
                  </div>

                  <div className="h-2 w-full rounded-full bg-white/10 overflow-hidden">
                    <div
                      style={{ width: `${item.percentAccomplished}%` }}
                      className="h-full bg-amber-500 rounded-full"
                    />
                  </div>

                  <div className="text-xs text-white/80">{item.targetGoal}</div>
                  <div className="text-[10px] font-mono text-emerald-300 pt-1 border-t border-white/5">
                    Proof: {item.subtextEvidence}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: CONTRIBUTION INTELLIGENCE */}
      {activeTab === "contribution" && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="rounded-2xl border border-white/10 bg-black/40 p-6 md:p-8 backdrop-blur-md space-y-6">
            <div className="border-b border-white/10 pb-4">
              <span className="text-xs font-mono uppercase text-amber-400 font-bold">Human Needs ↔ Available Skills ↔ Verified Opportunities</span>
              <h3 className="text-xl font-bold text-white mt-0.5">Contribution Intelligence</h3>
              <p className="text-xs md:text-sm text-white/70 mt-1 max-w-3xl leading-relaxed">
                Human flourishing extends beyond personal achievement. Matching voluntary human competence with real community needs to leave the world better than we found it.
              </p>
            </div>

            <div className="space-y-4">
              {SAMPLE_CONTRIBUTION_MATCHES.map((c) => (
                <div key={c.id} className="p-5 rounded-xl border border-white/10 bg-white/[0.02] space-y-3 hover:border-amber-500/30 transition-all">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-white/5 pb-2">
                    <div className="space-y-0.5">
                      <span className="text-[10px] font-mono text-amber-400 uppercase">{c.organizationOrPeer}</span>
                      <h4 className="text-sm font-bold text-white">{c.needHeadline}</h4>
                    </div>

                    <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20 self-start md:self-auto">
                      {c.hoursPerMonth} hrs / month (Voluntary)
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {c.skillsUtilized.map((s) => (
                      <span key={s} className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/5 text-white/70">
                        {s}
                      </span>
                    ))}
                  </div>

                  <p className="text-xs text-white/80 leading-relaxed font-serif">
                    Impact: {c.impactCreated}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
