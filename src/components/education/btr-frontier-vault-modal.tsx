import { useState, useMemo } from "react";
import {
  X,
  Search,
  Zap,
  AlertTriangle,
  Award,
} from "lucide-react";
import { TOP_100_FRONTIER_VAULT } from "@/lib/education/btr-frontier-vault";
import type { ClinicalQuestion } from "@/lib/education/qbank-types";

export interface BTRFrontierVaultModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartDrill?: (questions: ClinicalQuestion[]) => void;
}

export function BTRFrontierVaultModal({
  isOpen,
  onClose,
  onStartDrill,
}: BTRFrontierVaultModalProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedFactId, setSelectedFactId] = useState<string | null>(null);

  const categories = useMemo(
    () => [
      { id: "ALL", label: "All Frontier Facts", count: TOP_100_FRONTIER_VAULT.length },
      {
        id: "Guidelines_2024",
        label: "2024-25 Guidelines",
        count: TOP_100_FRONTIER_VAULT.filter((f) => f.category === "Guidelines_2024").length,
      },
      {
        id: "Biostatistics",
        label: "Biostatistics & Math",
        count: TOP_100_FRONTIER_VAULT.filter((f) => f.category === "Biostatistics").length,
      },
      {
        id: "Cytogenetics",
        label: "Molecular & Cytogenetics",
        count: TOP_100_FRONTIER_VAULT.filter((f) => f.category === "Cytogenetics").length,
      },
      {
        id: "Antidotes_DOC",
        label: "Antidotes & DOC",
        count: TOP_100_FRONTIER_VAULT.filter((f) => f.category === "Antidotes_DOC").length,
      },
      {
        id: "Scores_Thresholds",
        label: "Scores & Thresholds",
        count: TOP_100_FRONTIER_VAULT.filter((f) => f.category === "Scores_Thresholds").length,
      },
    ],
    []
  );

  const filteredFacts = useMemo(() => {
    return TOP_100_FRONTIER_VAULT.filter((fact) => {
      const matchesCat =
        selectedCategory === "ALL" || fact.category === selectedCategory;
      if (!matchesCat) return false;
      if (!searchQuery.trim()) return true;

      const q = searchQuery.toLowerCase();
      return (
        fact.title.toLowerCase().includes(q) ||
        fact.mustKnowPill.toLowerCase().includes(q) ||
        fact.clinicalContext.toLowerCase().includes(q) ||
        fact.examinerTrap.toLowerCase().includes(q) ||
        fact.tags.some((t) => t.toLowerCase().includes(q))
      );
    });
  }, [selectedCategory, searchQuery]);

  // Convert frontier facts into interactive question drill items
  const handleLaunchFrontierDrill = () => {
    if (!onStartDrill) return;

    const drillQuestions: ClinicalQuestion[] = filteredFacts.slice(0, 15).map((f, idx) => ({
      id: `frontier_${f.id}_${idx}`,
      subject: f.tags[0] || "High-Yield Frontier",
      topic: f.title,
      vignette: `${f.clinicalContext}\n\nRegarding ${f.title}, which of the following statements is strictly accurate under the latest national examination standards?`,
      options: [
        f.mustKnowPill,
        `Traditional standard: ${f.examinerTrap}`,
        "Finding is clinically inconsequential and does not alter management or staging",
        "Indicative of mild disease with no requirement for intervention",
      ],
      correctIndex: 0,
      examinerTrap: f.examinerTrap,
      highYieldTags: f.tags,
      explanation: {
        bottomLine: f.mustKnowPill,
        correctRationale: f.clinicalContext,
        distractorBreakdown: [
          { option: "B", reason: `Trap: ${f.examinerTrap}` },
          { option: "C", reason: "Incorrect: alters staging and treatment pathway completely." },
          { option: "D", reason: "Incorrect: this is a major rank-deciding guideline update." },
        ],
        whyCorrect: {
          mechanism: f.clinicalContext,
          clinicalRule: f.mustKnowPill,
        },
      },
    }));

    onClose();
    onStartDrill(drillQuestions);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150">
      <div className="flex flex-col h-[90vh] max-h-[820px] w-full max-w-5xl bg-surface rounded-3xl border border-edge shadow-2xl overflow-hidden text-ink">
        {/* Masthead */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-edge bg-elevated shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-amber-500/15 text-amber-300 border border-amber-500/30 flex items-center justify-center shrink-0">
              <Award size={20} className="text-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-white">
                  Top-100 Frontier Tie-Breakers Vault
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  AIR &lt; 100 Frontier
                </span>
              </div>
              <p className="text-xs text-white/60">
                250 hyper-volatile, rank-deciding concepts separating Top 100 from Rank 2,500
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {onStartDrill && filteredFacts.length > 0 && (
              <button
                type="button"
                onClick={handleLaunchFrontierDrill}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white hover:bg-white/90 text-black font-extrabold text-xs shadow-md transition"
              >
                <Zap size={14} className="fill-black" />
                <span>Launch Frontier Drill ({Math.min(15, filteredFacts.length)} Qs)</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl hover:bg-white/10 text-white/70 hover:text-white transition"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Filter bar & Search */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 px-6 py-3 border-b border-edge bg-surface shrink-0">
          {/* Category Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            {categories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition ${
                  selectedCategory === cat.id
                    ? "bg-white text-black font-semibold shadow-xs"
                    : "bg-white/5 border border-white/10 text-white/70 hover:text-white hover:bg-white/10"
                }`}
              >
                {cat.label} ({cat.count})
              </button>
            ))}
          </div>

          {/* Search Omnibar */}
          <div className="relative w-full sm:w-64 shrink-0">
            <Search size={14} className="absolute left-3 top-2.5 text-white/40" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search sections, formulas..."
              className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-canvas border border-edge-soft text-xs text-white placeholder-white/40 focus:outline-none focus:border-white/30"
            />
          </div>
        </div>

        {/* Body Grid */}
        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredFacts.map((fact) => {
            const isSelected = selectedFactId === fact.id;

            return (
              <div
                key={fact.id}
                onClick={() => setSelectedFactId(isSelected ? null : fact.id)}
                className={`p-4 rounded-2xl border transition cursor-pointer flex flex-col justify-between gap-3 ${
                  isSelected
                    ? "bg-elevated border-white/40 ring-1 ring-white/30"
                    : "bg-elevated/60 border-edge hover:border-white/20 hover:bg-elevated"
                }`}
              >
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-white/10 text-white/70 border border-white/10">
                      {fact.category.replace(/_/g, " ")}
                    </span>
                    {fact.formulaOrValue && (
                      <span className="font-mono text-[11px] font-bold text-amber-300 bg-amber-500/15 px-2 py-0.5 rounded-md border border-amber-500/30">
                        {fact.formulaOrValue}
                      </span>
                    )}
                  </div>

                  <h4 className="text-sm font-bold text-white">{fact.title}</h4>

                  {/* Must-Know Pill */}
                  <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-2">
                    <Zap size={14} className="text-amber-400 shrink-0 mt-0.5" />
                    <span className="text-xs font-bold text-amber-200 leading-snug">
                      {fact.mustKnowPill}
                    </span>
                  </div>

                  {/* Clinical Context */}
                  <p className="text-xs text-white/70 leading-relaxed">
                    {fact.clinicalContext}
                  </p>
                </div>

                {/* Examiner Trap */}
                <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-2">
                  <AlertTriangle size={14} className="text-rose-400 shrink-0 mt-0.5" />
                  <div className="text-[11px] leading-snug">
                    <strong className="text-rose-300 font-bold block">Examiner Trap:</strong>
                    <span className="text-white/80">{fact.examinerTrap}</span>
                  </div>
                </div>

                {/* Tags */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  {fact.tags.map((tag, tIdx) => (
                    <span
                      key={tIdx}
                      className="text-[10px] px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-white/60"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}

          {filteredFacts.length === 0 && (
            <div className="col-span-full py-16 flex flex-col items-center justify-center text-center">
              <Search size={32} className="text-white/20 mb-3" />
              <h4 className="text-sm font-bold text-white">No frontier facts match your search</h4>
              <p className="text-xs text-white/50 max-w-sm mt-1">
                Try searching for keywords like &quot;FIGO&quot;, &quot;BNS&quot;, &quot;KDIGO&quot;, &quot;antidote&quot;, or clear filters.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
