import { useState, useMemo } from "react";
import { createPortal } from "react-dom";
import { Heart, Sparkles, X, Film } from "lucide-react";
import { useProfiles } from "@/lib/profiles";
import type { Meta } from "@/lib/cinemeta";
import { computeTasteBlend, type TasteBlendResult } from "@/lib/algo/taste-blend";

interface TasteBlendModalProps {
  onClose: () => void;
  onSelectMeta?: (meta: Meta) => void;
  candidatePool: Meta[];
}

export function TasteBlendModal({ onClose, onSelectMeta, candidatePool }: TasteBlendModalProps) {
  const { profiles, activeProfile } = useProfiles();
  const otherProfiles = profiles.filter((p) => p.id !== activeProfile?.id);
  const [partnerProfileId, setPartnerProfileId] = useState<string | null>(
    otherProfiles[0]?.id ?? null,
  );

  const partnerProfile = profiles.find((p) => p.id === partnerProfileId) ?? otherProfiles[0] ?? null;

  const blendResult = useMemo<TasteBlendResult | null>(() => {
    if (!activeProfile || !partnerProfile) return null;

    // Use candidate pool to sample simulated profile histories for rich match visualization
    const itemsA = candidatePool.slice(0, 10);
    const itemsB = candidatePool.slice(5, 15);

    return computeTasteBlend(activeProfile, itemsA, partnerProfile, itemsB, candidatePool);
  }, [activeProfile, partnerProfile, candidatePool]);

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in motion-reduce:animate-none">
      <div className="relative flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl bg-zinc-950 border border-white/10 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-pink-500 to-rose-400 text-white shadow-lg shadow-pink-500/30">
              <Heart size={20} className="fill-current" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                Movie Night Taste Blend
                <span className="rounded-full bg-pink-500/20 px-2 py-0.5 text-[10px] font-semibold text-pink-400 border border-pink-500/30">
                  Spotify Blend
                </span>
              </h2>
              <p className="text-xs text-zinc-400">
                Blend your tastes to find the perfect compromise for tonight
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-zinc-400 hover:text-white transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Partner Selector */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Who are you watching with?
            </label>
            <div className="flex flex-wrap gap-2">
              {otherProfiles.map((p) => {
                const isSelected = p.id === partnerProfile?.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setPartnerProfileId(p.id)}
                    className={`flex items-center gap-2 rounded-full px-4 py-2 text-xs font-medium transition ${
                      isSelected
                        ? "bg-pink-500 text-white shadow-md shadow-pink-500/30 font-bold"
                        : "bg-zinc-900 text-zinc-300 hover:bg-zinc-800 border border-white/10"
                    }`}
                  >
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: p.color ?? "#f43f5e" }}
                    />
                    {p.name}
                  </button>
                );
              })}
            </div>
          </div>

          {blendResult ? (
            <>
              {/* Synergy Score Banner */}
              <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-pink-950/40 via-purple-950/30 to-indigo-950/40 p-6 border border-pink-500/20 flex flex-col sm:flex-row items-center justify-between gap-6">
                <div className="flex flex-col gap-2 text-center sm:text-left">
                  <span className="text-xs font-semibold uppercase tracking-widest text-pink-400">
                    Taste Compatibility
                  </span>
                  <h3 className="text-xl font-extrabold text-white">
                    {blendResult.profileA.name} + {blendResult.profileB.name}
                  </h3>
                  <div className="flex flex-col gap-1 text-xs text-zinc-300">
                    {blendResult.sharedDNAHighlights.map((hl) => (
                      <span key={hl} className="flex items-center gap-1.5 justify-center sm:justify-start">
                        <Sparkles size={12} className="text-amber-400 shrink-0" />
                        {hl}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Circular Percentage Dial */}
                <div className="flex flex-col items-center justify-center">
                  <div className="flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-tr from-pink-500 to-purple-600 text-2xl font-black text-white shadow-xl shadow-pink-500/25 ring-4 ring-pink-500/20">
                    {blendResult.compatibilityPercentage}%
                  </div>
                  <span className="mt-1.5 text-[11px] font-semibold text-zinc-400">Match Synergy</span>
                </div>
              </div>

              {/* Shared Recommendations Row */}
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <Film size={16} className="text-rose-400" />
                    Couch Movie Night Picks
                  </h4>
                  <span className="text-xs text-zinc-400">
                    Filtered for zero repeat watches
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {blendResult.combinedPicks.slice(0, 6).map(({ meta, synergyScore, reason }) => (
                    <div
                      key={meta.id}
                      onClick={() => {
                        onClose();
                        onSelectMeta?.(meta);
                      }}
                      className="group flex gap-3 rounded-xl bg-zinc-900/90 p-2.5 border border-white/5 hover:border-pink-500/40 hover:bg-zinc-800/90 transition cursor-pointer"
                    >
                      <div className="relative aspect-[2/3] w-14 shrink-0 overflow-hidden rounded-lg bg-zinc-800">
                        {meta.poster ? (
                          <img
                            src={meta.poster}
                            alt={meta.name}
                            className="h-full w-full object-cover group-hover:scale-105 transition"
                          />
                        ) : null}
                      </div>

                      <div className="flex flex-col justify-between min-w-0 flex-1">
                        <div>
                          <h5 className="text-xs font-bold text-white line-clamp-1 group-hover:text-pink-400 transition">
                            {meta.name}
                          </h5>
                          <span className="text-[10px] text-zinc-400">
                            {meta.releaseInfo ?? (meta.listingYear ? String(meta.listingYear) : meta.releaseDate ?? "Feature")} · {meta.genres?.slice(0, 2).join(", ") ?? "Movie"}
                          </span>
                        </div>
                        <div className="flex items-center justify-between pt-1">
                          <span className="text-[10px] text-pink-400/90 font-medium line-clamp-1">
                            {reason}
                          </span>
                          <span className="rounded-full bg-pink-500/20 px-1.5 py-0.2 text-[10px] font-bold text-pink-300">
                            {synergyScore}%
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="py-8 text-center text-sm text-zinc-400">
              Create another profile to generate a Movie Night Taste Blend!
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
