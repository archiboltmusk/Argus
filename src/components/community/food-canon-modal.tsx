import { useState, useMemo } from "react";
import {
  UtensilsCrossed,
  Sparkles,
  MapPin,
  Clock,
  Compass,
  Footprints,
  X,
  Flame,
  Heart,
  Zap,
  Users,
  CheckCircle,
} from "lucide-react";
import {
  foodCanonRadar,
  FoodNeedState,
  SignatureDishEntry,
} from "@/lib/community/food-canon-radar";
import { useT } from "@/lib/i18n";

export function FoodCanonModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const t = useT();
  const [selectedNeed, setSelectedNeed] = useState<FoodNeedState>("solace_reset");
  const [serendipityActive, setSerendipityActive] = useState(false);
  const [feedbackRecorded, setFeedbackRecorded] = useState(false);

  const currentMealTime = useMemo(() => foodCanonRadar.getCurrentMealTime(), []);

  const plate: SignatureDishEntry | null = useMemo(() => {
    return foodCanonRadar.resolveSovereignPlate({
      needState: selectedNeed,
      mealTime: currentMealTime,
      allowWildcardSerendipity: serendipityActive,
    });
  }, [selectedNeed, currentMealTime, serendipityActive]);

  if (!isOpen) return null;

  const handleRecordFeedback = (rating: "transcendent_canon" | "comforting_solid") => {
    if (!plate) return;
    foodCanonRadar.logMealFeedback({
      dishId: plate.id,
      eatenAtEpochMs: Date.now(),
      rating,
    });
    setFeedbackRecorded(true);
    setTimeout(() => setFeedbackRecorded(false), 3000);
  };

  return (
    <div
      className="fixed inset-0 z-[75] flex items-center justify-center bg-black/82 backdrop-blur-md animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative flex h-full max-h-[85vh] w-full max-w-[740px] flex-col overflow-hidden rounded-2xl bg-[#111215] border border-white/10 shadow-[0_28px_80px_rgba(0,0,0,0.95)]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-4 bg-[#14151a]">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/15 text-amber-400 border border-amber-500/25">
              <UtensilsCrossed size={19} />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-[17px] font-bold text-white tracking-tight">
                  {t("Sovereign Food Canon Radar")}
                </h2>
                <span className="flex items-center gap-1 rounded-full bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 text-[10.5px] font-bold text-amber-300">
                  <Flame size={10} />
                  Kolkata Benchmark
                </span>
              </div>
              <p className="text-[12px] text-zinc-400">
                {t("Zero delivery ads. Zero 200-item menus. Exactly one dish tailored to your present state.")}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 hover:bg-white/10 hover:text-white transition-colors"
            aria-label={t("Close")}
          >
            <X size={16} />
          </button>
        </div>

        {/* Need State Selector (The 4 States of Human Appetite) */}
        <div className="border-b border-white/10 bg-[#121317] px-6 py-3.5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
              {t("Select Your Present Need State")}
            </span>
            <button
              onClick={() => setSerendipityActive((v) => !v)}
              className={`flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-md border transition-all ${
                serendipityActive
                  ? "bg-amber-400/20 text-amber-300 border-amber-400/40"
                  : "bg-white/5 text-zinc-400 border-white/10 hover:bg-white/10 hover:text-white"
              }`}
            >
              <Compass size={12} />
              <span>{t("Wildcard Unrated Mode")}</span>
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <button
              onClick={() => setSelectedNeed("solace_reset")}
              className={`flex items-center gap-2 p-2.5 rounded-xl border text-start transition-all ${
                selectedNeed === "solace_reset"
                  ? "bg-amber-500/15 border-amber-500/50 text-white shadow-sm"
                  : "bg-[#181920] border-white/5 text-zinc-300 hover:bg-[#1f2029] hover:border-white/15"
              }`}
            >
              <Heart size={14} className="text-rose-400 shrink-0" />
              <div className="min-w-0">
                <div className="text-[12px] font-bold truncate">Solace & Reset</div>
                <div className="text-[10px] text-zinc-400 truncate">Comfort & warmth</div>
              </div>
            </button>

            <button
              onClick={() => setSelectedNeed("sensory_awakening")}
              className={`flex items-center gap-2 p-2.5 rounded-xl border text-start transition-all ${
                selectedNeed === "sensory_awakening"
                  ? "bg-amber-500/15 border-amber-500/50 text-white shadow-sm"
                  : "bg-[#181920] border-white/5 text-zinc-300 hover:bg-[#1f2029] hover:border-white/15"
              }`}
            >
              <Sparkles size={14} className="text-amber-400 shrink-0" />
              <div className="min-w-0">
                <div className="text-[12px] font-bold truncate">Sensory Awakening</div>
                <div className="text-[10px] text-zinc-400 truncate">Acid, crunch & heat</div>
              </div>
            </button>

            <button
              onClick={() => setSelectedNeed("kinetic_fuel")}
              className={`flex items-center gap-2 p-2.5 rounded-xl border text-start transition-all ${
                selectedNeed === "kinetic_fuel"
                  ? "bg-amber-500/15 border-amber-500/50 text-white shadow-sm"
                  : "bg-[#181920] border-white/5 text-zinc-300 hover:bg-[#1f2029] hover:border-white/15"
              }`}
            >
              <Zap size={14} className="text-cyan-400 shrink-0" />
              <div className="min-w-0">
                <div className="text-[12px] font-bold truncate">Kinetic Fuel</div>
                <div className="text-[10px] text-zinc-400 truncate">Clean light power</div>
              </div>
            </button>

            <button
              onClick={() => setSelectedNeed("tribal_communion")}
              className={`flex items-center gap-2 p-2.5 rounded-xl border text-start transition-all ${
                selectedNeed === "tribal_communion"
                  ? "bg-amber-500/15 border-amber-500/50 text-white shadow-sm"
                  : "bg-[#181920] border-white/5 text-zinc-300 hover:bg-[#1f2029] hover:border-white/15"
              }`}
            >
              <Users size={14} className="text-emerald-400 shrink-0" />
              <div className="min-w-0">
                <div className="text-[12px] font-bold truncate">Tribal Feast</div>
                <div className="text-[10px] text-zinc-400 truncate">Shared ritual</div>
              </div>
            </button>
          </div>
        </div>

        {/* The Sovereign Plate Encounter */}
        <div className="flex-1 overflow-y-auto p-6 flex flex-col justify-center">
          {plate ? (
            <div className="relative flex flex-col gap-5 rounded-2xl border border-amber-500/30 bg-gradient-to-b from-[#181921] to-[#14151b] p-6 shadow-xl">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      {plate.neighborhood}
                    </span>
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-white/10 text-white border border-white/10 font-bold">
                      {plate.priceDisplay}
                    </span>
                    {plate.isUnratedStall && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
                        {t("Unrated Local Craft")}
                      </span>
                    )}
                  </div>
                  <h3 className="text-[22px] font-extrabold text-white tracking-tight leading-tight">
                    {plate.dishName}
                  </h3>
                  <div className="text-[14px] font-medium text-amber-400/90 flex items-center gap-1.5 mt-0.5">
                    <MapPin size={13} />
                    <span>{plate.venueName}</span>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-1.5 shrink-0">
                  <span className="text-[10.5px] font-bold uppercase tracking-wider text-zinc-400">
                    {t("Timing")}
                  </span>
                  <div className="flex items-center gap-1 text-[11px] font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/25 px-2.5 py-1 rounded-lg">
                    <Clock size={12} />
                    <span>Active Now</span>
                  </div>
                </div>
              </div>

              {/* Craft Lineage & Epistemic Reason */}
              <div className="space-y-2 border-t border-white/10 pt-4">
                <div className="text-[13px] font-semibold text-zinc-200 leading-snug">
                  {plate.whyThisNow}
                </div>
                <p className="text-[12px] text-zinc-400 leading-relaxed italic">
                  "{plate.craftLineage}"
                </p>
              </div>

              {/* Peak Hour Preparation Note */}
              <div className="flex items-start gap-2.5 rounded-xl bg-white/5 border border-white/5 p-3 text-[12px] text-zinc-300">
                <Clock size={14} className="text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-white">{t("Peak Preparation Window: ")}</strong>
                  <span>{plate.peakHourDescription}</span>
                </div>
              </div>

              {/* Walking / In-Person Proof of Work */}
              {plate.walkingTip && (
                <div className="flex items-start gap-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 p-3 text-[12px] text-amber-200">
                  <Footprints size={14} className="text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-amber-100">{t("In-Person Guide: ")}</strong>
                    <span>{plate.walkingTip}</span>
                  </div>
                </div>
              )}

              {/* Feedback Loop */}
              <div className="flex items-center justify-between border-t border-white/10 pt-4 mt-1">
                <span className="text-[11px] text-zinc-400">
                  {feedbackRecorded ? t("Recorded in private local history!") : t("Did this plate reset your benchmark?")}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleRecordFeedback("comforting_solid")}
                    className="flex h-8 items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 text-[11px] font-semibold text-zinc-300 hover:bg-white/10 hover:text-white transition-all"
                  >
                    <span>Solid Comfort</span>
                  </button>
                  <button
                    onClick={() => handleRecordFeedback("transcendent_canon")}
                    className="flex h-8 items-center gap-1.5 rounded-lg bg-amber-500 text-black px-3 text-[11px] font-bold hover:bg-amber-400 transition-all shadow-sm"
                  >
                    <CheckCircle size={12} />
                    <span>Canon Event</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-zinc-400 text-[13px]">
              {t("No signature dish matched your current constraint. Try loosening the filter.")}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-white/10 px-6 py-3.5 bg-[#0e0f13] text-[11px] text-zinc-400">
          <span>{t("Proof-of-work neighborhood craft · Zero sponsored listings · Zero delivery cuts")}</span>
          <span className="font-mono text-zinc-500">Argus Gastronomy Engine</span>
        </div>
      </div>
    </div>
  );
}
