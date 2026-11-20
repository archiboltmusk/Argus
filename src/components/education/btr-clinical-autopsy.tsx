import { ExplanationText } from "./explanation-text";
import { useState } from "react";
import {
  CheckCircle2,
  Lightbulb,
  AlertTriangle,
  BookOpen,
  Tv,
  Bookmark,
  ChevronDown,
  ChevronUp,
  Table,
  Sparkles,
  Check,
  Download,
} from "lucide-react";
import type { ClinicalQuestion, ClinicalExplanation5Tier } from "@/lib/education/qbank-types";
import { resolveQuestionSynapse } from "@/lib/education/btr-synapse";
import { loadFSRSCardStates, saveFSRSCardStates } from "@/lib/education/btr-fsrs-engine";

export interface BTRClinicalAutopsyProps {
  question: ClinicalQuestion;
  selectedOptionIndex?: number;
  onOpenVideo?: (videoTitle: string, timestampSec: number) => void;
  onBookmarkFSRS?: () => void;
}

export function BTRClinicalAutopsy({
  question,
  selectedOptionIndex,
  onOpenVideo,
  onBookmarkFSRS,
}: BTRClinicalAutopsyProps) {
  const [activeTierTab, setActiveTierTab] = useState<"all" | "distractors" | "table">("all");
  const [expandedDistractor, setExpandedDistractor] = useState<number | null>(null);
  const [isBookmarkedFSRS, setIsBookmarkedFSRS] = useState(false);
  const [showSocratic, setShowSocratic] = useState(false);
  const [exportedAnki, setExportedAnki] = useState(false);

  const handleBookmark = () => {
    setIsBookmarkedFSRS(true);
    try {
      const states = loadFSRSCardStates();
      states[question.id] = {
        cardId: question.id,
        intervalDays: 1,
        repetitionCount: 1,
        lastReviewedAt: new Date().toISOString().slice(0, 10),
        dueAt: new Date(Date.now() + 86400000).toISOString().slice(0, 10),
        easeFactor: 2.5,
      };
      saveFSRSCardStates(states);
    } catch {
      // ignore
    }
    onBookmarkFSRS?.();
  };

  const handleExportAnki = () => {
    const cardData = [
      `#separator:tab`,
      `#html:true`,
      `#tags column:3`,
      `#deck:Argus NEET-PG Clinical Autopsy`,
      `${question.vignette.replace(/\t/g, " ")}\t<b>Correct: ${question.options[question.correctIndex]}</b><br><br>${(exp.bottomLine || "").replace(/\t/g, " ")}\t${question.subject}::${question.topic || "CoreBTR"}`
    ].join("\n");
    const blob = new Blob([cardData], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `argus_${question.id}_anki.txt`;
    a.click();
    URL.revokeObjectURL(url);
    setExportedAnki(true);
    setTimeout(() => setExportedAnki(false), 3000);
  };

  const exp: ClinicalExplanation5Tier = question.explanation;
  const synapse = resolveQuestionSynapse(question);

  return (
    <div className="flex flex-col gap-4 rounded-3xl border border-edge bg-elevated/95 p-6 animate-in fade-in duration-200 select-none text-white">
      {/* Masthead Header */}
      <div className="flex items-center justify-between border-b border-edge pb-3">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-xl bg-amber-500/15 text-amber-300 border border-amber-500/30 flex items-center justify-center font-bold text-xs">
            5T
          </div>
          <div>
            <h3 className="text-sm font-black text-white">
              Answer explanation
            </h3>
            <span className="text-[10px] text-white/50">
              
            </span>
          </div>
        </div>

        {/* Tab Filters */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-white/5 border border-white/10 text-xs">
          <button
            type="button"
            onClick={() => setActiveTierTab("all")}
            className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition ${
              activeTierTab === "all" ? "bg-white text-black shadow-xs" : "text-white/60 hover:text-white"
            }`}
          >
            Explanation
          </button>
          <button
            type="button"
            onClick={() => setActiveTierTab("distractors")}
            className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition ${
              activeTierTab === "distractors" ? "bg-white text-black shadow-xs" : "text-white/60 hover:text-white"
            }`}
          >
            Other options
          </button>
        </div>
      </div>

      {/* TIER 1: Fast-Track Clinical Bottom Line */}
      <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3 shadow-md">
        <Lightbulb size={18} className="text-amber-400 shrink-0 mt-0.5" />
        <div className="flex-1">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-300 block">
            Answer
          </span>
          <p className="text-[13px] font-bold text-white mt-1 leading-relaxed">
            {exp.bottomLine}
          </p>
        </div>
      </div>

      {/* TIER 2: Why Correct (Mechanism & Board Rule) */}
      {(activeTierTab === "all" || activeTierTab === "distractors") && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
              <CheckCircle2 size={14} />
              Why option {String.fromCharCode(65 + question.correctIndex)} is Correct
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
              
            </span>
          </div>

          <ExplanationText text={exp.correctRationale || exp.whyCorrect?.mechanism || exp.bottomLine || "No rationale supplied."} />

          {exp.whyCorrect?.clinicalRule && (
            <div className="p-2.5 rounded-xl bg-black/40 border border-emerald-500/20 text-xs text-emerald-200 mt-1">
              <strong>Clinical Pearl: </strong> {exp.whyCorrect.clinicalRule}
            </div>
          )}
        </div>
      )}

      {/* Socratic Clinical Challenge (Interactive Distractor Drill) */}
      {selectedOptionIndex !== undefined && selectedOptionIndex !== question.correctIndex && (
        <div className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex flex-col gap-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles size={16} className="text-indigo-400" />
              <span className="text-xs font-bold text-indigo-300 uppercase tracking-wider">
                Socratic Clinical Challenge
              </span>
            </div>
            <button
              type="button"
              onClick={() => setShowSocratic(!showSocratic)}
              className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-200 transition cursor-pointer"
            >
              {showSocratic ? "Hide Challenge" : `Grill Me on Option ${String.fromCharCode(65 + selectedOptionIndex)}`}
            </button>
          </div>
          {showSocratic && (
            <div className="pt-2 border-t border-indigo-500/20 text-xs text-white/90 space-y-2">
              <p className="font-semibold text-white">
                Why did you choose <strong>{question.options[selectedOptionIndex]}</strong>, and what hallmark finding separates it from {question.options[question.correctIndex]}?
              </p>
              <div className="p-3 rounded-xl bg-black/40 border border-indigo-500/20 text-[12px] text-indigo-200 leading-relaxed">
                <strong>Pathognomonic Rule: </strong>
                {question.examinerTrap || exp.whyCorrect?.clinicalRule || exp.bottomLine}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Examiner Trap Radar */}
      {question.examinerTrap && question.examinerTrap !== "High-Yield Grand Test discriminator" && (
        <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-2.5">
          <AlertTriangle size={16} className="text-rose-400 shrink-0 mt-0.5" />
          <div className="text-xs">
            <strong className="text-rose-300 font-bold block text-[11px] uppercase tracking-wider">
              Examiner Trap Radar
            </strong>
            <p className="text-white/80 leading-relaxed mt-0.5">{question.examinerTrap}</p>
          </div>
        </div>
      )}

      {/* TIER 3: Distractor Autopsy & Inversion Scenarios */}
      <div className="flex flex-col gap-2.5">
        <span className="text-[11px] font-extrabold uppercase tracking-wider text-white/60">
          Tier 3 • Distractor Inversion (Learn 4 Concepts Per Question)
        </span>

        <div className="flex flex-col gap-2">
          {question.options.map((opt, idx) => {
            const isCorrect = idx === question.correctIndex;
            const isSelected = idx === selectedOptionIndex;
            const distractorData = exp.distractorBreakdown?.find(
              (d) => d.option === String.fromCharCode(65 + idx) || d.option.startsWith(opt.slice(0, 10))
            );

            // Synthesize an inversion scenario if not explicitly annotated
            const inversion =
              distractorData?.inversionScenario ||
              (!isCorrect
                ? `Would be correct if the presentation was consistent with typical ${opt} manifestations rather than the current findings.`
                : undefined);

            const isExpanded = expandedDistractor === idx || activeTierTab === "distractors";

            return (
              <div
                key={idx}
                className={`p-3.5 rounded-2xl border transition ${
                  isCorrect
                    ? "bg-emerald-500/10 border-emerald-500/30"
                    : isSelected
                      ? "bg-rose-500/10 border-rose-500/40"
                      : "bg-surface/60 border-edge"
                }`}
              >
                <div
                  className="flex items-center justify-between cursor-pointer"
                  onClick={() => setExpandedDistractor(isExpanded ? null : idx)}
                >
                  <div className="flex items-center gap-2.5">
                    <span
                      className={`h-5 w-5 rounded-full flex items-center justify-center font-mono text-[10px] font-bold ${
                        isCorrect
                          ? "bg-emerald-500 text-white"
                          : isSelected
                            ? "bg-rose-500 text-white"
                            : "bg-white/10 text-white/60"
                      }`}
                    >
                      {String.fromCharCode(65 + idx)}
                    </span>
                    <span className="text-xs font-bold text-white leading-snug">{opt}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    {isCorrect ? (
                      <span className="text-[10px] font-bold text-emerald-400">CORRECT ANSWER</span>
                    ) : (
                      <span className="text-[10px] text-white/40">
                        {isExpanded ? "Collapse" : "Why Incorrect?"}
                      </span>
                    )}
                    {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </div>
                </div>

                {isExpanded && !isCorrect && (
                  <div className="flex flex-col gap-2 pt-3 mt-2 border-t border-edge text-xs">
                    <p className="text-white/70 leading-relaxed">
                      {distractorData?.reason ||
                        `This distractor does not fit the diagnostic pattern and primary findings in the vignette.`}
                    </p>

                    {/* Inversion Scenario Callout */}
                    {inversion && (
                      <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-start gap-2">
                        <Sparkles size={14} className="text-purple-400 shrink-0 mt-0.5" />
                        <div className="text-[11px]">
                          <strong className="text-purple-300 font-bold block">
                            When would Option {String.fromCharCode(65 + idx)} be correct?
                          </strong>
                          <span className="text-white/80">{inversion}</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* TIER 4: Comparison Table / Differential Matrix */}
      {exp.comparisonTable && exp.comparisonTable.headers && (
        <div className="p-4 rounded-2xl bg-surface border border-edge flex flex-col gap-2.5">
          <div className="flex items-center gap-2">
            <Table size={14} className="text-amber-400" />
            <span className="text-[11px] font-bold uppercase tracking-wider text-white">
              {exp.comparisonTable.title || "Differential Diagnosis Matrix"}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-edge bg-white/5">
                  {exp.comparisonTable.headers.map((h, hIdx) => (
                    <th key={hIdx} className="p-2 font-bold text-white/80">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {exp.comparisonTable.rows.map((row, rIdx) => (
                  <tr key={rIdx} className="border-b border-edge/50 hover:bg-white/5">
                    {row.map((cell, cIdx) => (
                      <td key={cIdx} className="p-2 text-white/70">
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TIER 5: Standard Textbook Citations */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-2xl bg-surface border border-edge text-xs">
        <div className="flex items-center gap-2">
          <BookOpen size={14} className="text-white/50" />
          <span className="text-[11px] font-bold text-white/70">Sources</span>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {(exp.citations ?? []).map((c, cIdx) => (
            <span
              key={cIdx}
              className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-white/60 text-[10px] font-mono"
            >
              {c.textbook} • {c.chapter}
            </span>
          ))}
        </div>
      </div>

      {/* TIER 6: Argus Synapse Navigator Bar (Cross-Linking) */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-gradient-to-r from-purple-500/10 via-surface to-amber-500/10 border border-purple-500/30">
        <div className="flex items-center gap-2.5">
          <div className="h-7 w-7 rounded-lg bg-purple-500/20 text-purple-300 border border-purple-500/40 flex items-center justify-center">
            <Tv size={14} />
          </div>
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-purple-300 block">
              Argus Synapse Cross-Link
            </span>
            <span className="text-xs font-bold text-white">
              {synapse.btrVideo?.label || "BTR Core Integration Lecture"}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {synapse.btrVideo && onOpenVideo && (
            <button
              type="button"
              onClick={() => onOpenVideo(synapse.btrVideo!.title, synapse.btrVideo!.timestampSeconds)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-white/90 text-black font-extrabold text-xs shadow-md transition"
            >
              <Tv size={12} />
              <span>Jump to Video ({Math.floor(synapse.btrVideo.timestampSeconds / 60)}m)</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleBookmark}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs border transition cursor-pointer ${
              isBookmarkedFSRS
                ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-xs"
                : "bg-white/10 hover:bg-white/20 text-white border-white/20"
            }`}
            title="Add to Spaced Repetition Queue"
          >
            {isBookmarkedFSRS ? <Check size={12} className="text-emerald-400" /> : <Bookmark size={12} />}
            <span>{isBookmarkedFSRS ? "Added to Daily FSRS" : "FSRS Card"}</span>
          </button>

          <button
            type="button"
            onClick={handleExportAnki}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs border transition cursor-pointer ${
              exportedAnki
                ? "bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-xs"
                : "bg-white/5 hover:bg-white/15 text-white/80 hover:text-white border-white/15"
            }`}
            title="Export card to Anki text format"
          >
            <Download size={12} />
            <span>{exportedAnki ? "Exported!" : "Export Anki"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
