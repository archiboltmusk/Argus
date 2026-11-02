import {
  AlertCircle,
  ArrowRight,
  ExternalLink,
  Scroll,
  Sparkles,
} from "lucide-react";
import { useState } from "react";
import {
  CIVIC_SERVICE_REGISTRY,
  resolveArgusNow,
} from "@/lib/lifemaxxing/now/data";
import type {
  UserReportedEmotion,
  WisdomTraditionId,
  ArgusNowIntervention,
} from "@/lib/lifemaxxing/now/types";

export function ArgusNowModule() {
  const [selectedEmotion, setSelectedEmotion] = useState<UserReportedEmotion>("lost");
  const [energyLevel, setEnergyLevel] = useState<number>(5);
  const [selectedTradition, setSelectedTradition] = useState<WisdomTraditionId>("stoicism");
  const [intervention, setIntervention] = useState<ArgusNowIntervention>(() =>
    resolveArgusNow("lost", 5, "stoicism"),
  );
  const [actionDone, setActionDone] = useState(false);
  const [showCivicRegistry, setShowCivicRegistry] = useState(false);

  const handleRecalculate = (
    emotion: UserReportedEmotion,
    energy: number,
    trad: WisdomTraditionId,
  ) => {
    setSelectedEmotion(emotion);
    setEnergyLevel(energy);
    setSelectedTradition(trad);
    setIntervention(resolveArgusNow(emotion, energy, trad));
    setActionDone(false);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Entry Point Header */}
      <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-violet-950/40 via-purple-950/20 to-black/80 p-6 md:p-8 backdrop-blur-xl relative overflow-hidden shadow-2xl">
        <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-violet-500/10 blur-3xl pointer-events-none" />
        <div className="relative z-10 space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-violet-400/30 bg-violet-500/10 px-3.5 py-1 text-xs font-semibold tracking-wide text-violet-300">
            <Sparkles className="h-3.5 w-3.5 text-violet-400 animate-pulse" />
            <span>ARGUS / NOW · Minimum Effective Intervention</span>
          </div>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white">
                How are you, really?
              </h2>
              <p className="mt-1 text-sm md:text-base text-white/70 max-w-2xl leading-relaxed">
                No judgment. No complicated dashboard. Tell me what is happening, and we&apos;ll find the next useful step.
              </p>
            </div>

            {/* Mode Indicator */}
            <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/50 p-2.5 backdrop-blur-md self-start md:self-auto">
              <span className="text-[10px] font-mono uppercase text-white/50">Active Mode:</span>
              <span
                className={`text-xs font-bold uppercase px-2.5 py-1 rounded-lg ${
                  intervention.mode === "care"
                    ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                    : intervention.mode === "advance"
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                      : "bg-sky-500/20 text-sky-300 border border-sky-500/30"
                }`}
              >
                ARGUS {intervention.mode.toUpperCase()}
              </span>
            </div>
          </div>

          {/* Quick Emotion Pills */}
          <div className="space-y-2 pt-2 border-t border-white/10">
            <span className="text-[11px] font-bold uppercase tracking-wider text-white/40">Select Current Feeling</span>
            <div className="flex flex-wrap gap-2">
              {(["lost", "anxious", "exhausted", "lonely", "motivated", "confused"] as UserReportedEmotion[]).map(
                (emo) => {
                  const isSel = selectedEmotion === emo;
                  return (
                    <button
                      key={emo}
                      onClick={() => handleRecalculate(emo, energyLevel, selectedTradition)}
                      className={`px-4 py-2 rounded-xl text-xs font-bold capitalize transition-all cursor-pointer ${
                        isSel
                          ? "bg-violet-600 text-white shadow-lg shadow-violet-600/40 border border-violet-400"
                          : "bg-white/5 text-white/70 hover:bg-white/10 hover:text-white border border-white/5"
                      }`}
                    >
                      {emo}
                    </button>
                  );
                },
              )}
            </div>
          </div>

          {/* Energy Slider & Wisdom Selector */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div className="p-3.5 rounded-xl border border-white/5 bg-black/30 space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-white/60">Estimated Energy Level:</span>
                <span className="font-bold text-violet-300 font-mono">{energyLevel}/10</span>
              </div>
              <input
                type="range"
                min={1}
                max={10}
                value={energyLevel}
                onChange={(e) => handleRecalculate(selectedEmotion, Number(e.target.value), selectedTradition)}
                className="w-full accent-violet-500 cursor-pointer"
              />
            </div>

            <div className="p-3.5 rounded-xl border border-white/5 bg-black/30 space-y-1.5">
              <span className="text-[11px] text-white/60">Wisdom Perspective Tradition:</span>
              <select
                value={selectedTradition}
                onChange={(e) =>
                  handleRecalculate(selectedEmotion, energyLevel, e.target.value as WisdomTraditionId)
                }
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-violet-500 cursor-pointer"
              >
                <option value="stoicism">Stoic Philosophy (Epictetus / Aurelius)</option>
                <option value="bhagavad_gita">Bhagavad Gita (Nishkama Karma)</option>
                <option value="buddhism">Buddhist Psychology (Vipassana)</option>
                <option value="biblical">Biblical Wisdom (Ecclesiastes)</option>
                <option value="quranic">Quranic Ethics (Surah Al-Inshirah)</option>
                <option value="secular_rationalism">Secular Behavioral Science (Bounded Rationality)</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Main Intervention Card */}
      <div className="rounded-2xl border border-violet-500/30 bg-gradient-to-br from-violet-950/20 via-black/60 to-black/80 p-6 md:p-8 backdrop-blur-md space-y-6 shadow-2xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-white/10 pb-4">
          <div>
            <span className="text-xs font-mono uppercase text-violet-300 font-bold">
              Targeted Protocol Dispatch
            </span>
            <h3 className="text-xl font-bold text-white mt-0.5">{intervention.headline}</h3>
          </div>
          <span className="text-xs font-mono bg-white/5 text-white/70 border border-white/10 px-3 py-1 rounded-full self-start md:self-auto">
            Outcome: {intervention.singleUsefulStep.targetOutcome.replace(/_/g, " ").toUpperCase()}
          </span>
        </div>

        {/* Initial Guidance Message */}
        <div className="p-4 rounded-xl border border-white/10 bg-white/[0.02]">
          <p className="text-sm md:text-base text-white/90 leading-relaxed font-serif italic">
            &ldquo;{intervention.initialGuidance}&rdquo;
          </p>
        </div>

        {/* The SINGLE Actionable Step */}
        <div className="rounded-xl border border-violet-500/40 bg-violet-950/20 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-violet-300">
              The Minimum Effective Action (1 Step Only)
            </span>
            <span className="text-xs font-mono text-white/60">
              ~{intervention.singleUsefulStep.estimatedMinutes} minutes
            </span>
          </div>

          <div className="space-y-1">
            <h4 className="text-base font-bold text-white">{intervention.singleUsefulStep.actionTitle}</h4>
            <p className="text-xs md:text-sm text-white/80 leading-relaxed">
              {intervention.singleUsefulStep.details}
            </p>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              onClick={() => setActionDone(!actionDone)}
              className={`py-2 px-5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                actionDone
                  ? "bg-emerald-500 text-black shadow-md shadow-emerald-500/40"
                  : "bg-violet-600 hover:bg-violet-500 text-white shadow-md shadow-violet-600/30"
              }`}
            >
              {actionDone ? "Step Completed & Verified ✓" : "Commit to this Step"}
            </button>
          </div>
        </div>

        {/* Wisdom Reflection Box */}
        {intervention.wisdomPerspective && (
          <div className="rounded-xl border border-amber-500/20 bg-amber-950/10 p-5 space-y-3">
            <div className="flex items-center justify-between border-b border-white/5 pb-2">
              <span className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-2">
                <Scroll className="h-4 w-4" />
                <span>{intervention.wisdomPerspective.traditionLabel}</span>
              </span>
              <span className="text-[10px] font-mono text-white/50">{intervention.wisdomPerspective.sourceText}</span>
            </div>

            <blockquote className="text-xs text-white/80 italic font-serif leading-relaxed">
              &ldquo;{intervention.wisdomPerspective.originalQuote}&rdquo;
            </blockquote>

            <p className="text-xs text-white/90 leading-relaxed">
              <strong>Secular Insight:</strong> {intervention.wisdomPerspective.secularTranslation}
            </p>

            <div className="text-[11px] text-amber-300 font-mono pt-1">
              <strong>Action Rule:</strong> {intervention.wisdomPerspective.contemporaryAction}
            </div>
          </div>
        )}

        {/* WHO Clinical Boundary Alert */}
        {intervention.clinicalBoundaryWarning && (
          <div className="p-4 rounded-xl border border-rose-500/30 bg-rose-950/20 text-xs text-rose-300 leading-relaxed flex items-start gap-2.5">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <div>
              <strong className="text-rose-200">Clinical Boundary:</strong> {intervention.clinicalBoundaryWarning}
            </div>
          </div>
        )}

        {/* Civic / Financial Triage Pathway Toggle */}
        <div className="pt-2 flex items-center justify-between border-t border-white/10">
          <button
            onClick={() => setShowCivicRegistry(!showCivicRegistry)}
            className="text-xs text-violet-300 hover:text-white font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <span>{showCivicRegistry ? "Hide Civic & Financial Guides" : "Explore Civic & Financial Support Triage"}</span>
            <ArrowRight className="h-3 w-3" />
          </button>
        </div>

        {/* Civic Registry Expandable */}
        {showCivicRegistry && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 animate-in fade-in">
            {CIVIC_SERVICE_REGISTRY.map((c) => (
              <div key={c.id} className="p-4 rounded-xl border border-white/10 bg-white/[0.02] space-y-2">
                <div className="text-xs font-bold text-white">{c.title}</div>
                <p className="text-[11px] text-white/70 leading-relaxed">{c.neutralExplanation}</p>
                <ul className="text-[10px] text-white/60 space-y-1 list-disc list-inside">
                  {c.checklist.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
                <a
                  href={c.officialPortal}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] text-violet-300 hover:text-white pt-1"
                >
                  <span>Official Portal</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
