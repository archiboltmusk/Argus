import { useState } from "react";
import { Play, Disc3 } from "lucide-react";
import type { Meta } from "@/lib/cinemeta";
import type { TasteCluster } from "@/lib/algo/content-dna";

interface DailyMixesProps {
  clusters: TasteCluster[];
  onSelectMeta?: (meta: Meta) => void;
}

export function DailyMixes({ clusters, onSelectMeta }: DailyMixesProps) {
  const [selectedClusterId, setSelectedClusterId] = useState<string>(
    clusters[0]?.id ?? "daily-mix-1",
  );

  if (clusters.length === 0) return null;

  const activeCluster = clusters.find((c) => c.id === selectedClusterId) ?? clusters[0];

  return (
    <div className="flex flex-col gap-6 py-4">
      {/* Header */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-tr from-emerald-500 to-teal-400 text-black shadow-md shadow-emerald-500/20">
            <Disc3 size={18} className="animate-spin motion-reduce:animate-none" style={{ animationDuration: "12s" }} />
          </div>
          <div>
            <h3 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
              Made For You · Daily Mixes
              <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-semibold text-emerald-400 border border-emerald-500/30">
                Spotify Engine
              </span>
            </h3>
            <p className="text-xs text-zinc-400">
              Micro-taste clusters algorithmically isolated from your watching DNA
            </p>
          </div>
        </div>
      </div>

      {/* Cluster Pill / Card Selector */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {clusters.map((cluster) => {
          const isSelected = cluster.id === activeCluster.id;
          return (
            <button
              key={cluster.id}
              type="button"
              onClick={() => setSelectedClusterId(cluster.id)}
              className={`group relative flex flex-col justify-between overflow-hidden rounded-xl p-4 text-left transition-all duration-200 border ${
                isSelected
                  ? "ring-2 ring-emerald-400 border-transparent shadow-lg shadow-emerald-500/10 scale-[1.02]"
                  : "border-white/10 bg-zinc-900/80 hover:bg-zinc-800/80 hover:border-white/20"
              }`}
              style={{
                background: isSelected
                  ? `linear-gradient(135deg, ${cluster.gradient[0]}22, ${cluster.gradient[1]}44)`
                  : undefined,
              }}
            >
              {/* Vibrant accent bar */}
              <div
                className="absolute top-0 inset-x-0 h-1 transition-all"
                style={{
                  background: `linear-gradient(90deg, ${cluster.gradient[0]}, ${cluster.gradient[1]})`,
                }}
              />

              <div className="flex flex-col gap-1 z-10">
                <span className="text-[11px] font-extrabold tracking-wider uppercase text-zinc-400 group-hover:text-white transition">
                  {cluster.name}
                </span>
                <span className="text-sm font-bold text-white line-clamp-1">
                  {cluster.tagline}
                </span>
              </div>

              <div className="flex items-center justify-between pt-4 mt-auto z-10 text-[11px]">
                <span className="font-semibold text-emerald-400">
                  {cluster.matchScore}% Match
                </span>
                <span className="text-zinc-500 group-hover:text-zinc-300 transition">
                  {cluster.items.length} titles
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Active Cluster Showcase Row */}
      {activeCluster && (
        <div className="flex flex-col gap-3 rounded-2xl bg-zinc-900/60 p-4 border border-white/5 backdrop-blur-md">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/5 pb-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-bold text-white">
                {activeCluster.name}: {activeCluster.tagline}
              </span>
              <div className="flex items-center gap-1.5">
                {activeCluster.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-medium text-zinc-300"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
            <span className="text-xs text-zinc-400">
              Updated daily with 80% taste affinity + 20% serendipitous exploration
            </span>
          </div>

          {/* Carousel */}
          <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-none pt-1">
            {activeCluster.items.map((meta) => (
              <div
                key={meta.id}
                onClick={() => onSelectMeta?.(meta)}
                className="group relative flex-shrink-0 w-36 sm:w-44 cursor-pointer flex flex-col gap-2 transition transform hover:-translate-y-1 motion-reduce:animate-none"
              >
                <div className="relative aspect-[2/3] w-full overflow-hidden rounded-xl bg-zinc-800 shadow-md">
                  {meta.poster ? (
                    <img
                      src={meta.poster}
                      alt={meta.name}
                      className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                      loading="lazy"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center p-3 text-center text-xs text-zinc-500">
                      {meta.name}
                    </div>
                  )}

                  {/* Play Overlay */}
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition group-hover:opacity-100">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-400 text-black shadow-lg shadow-emerald-400/40">
                      <Play size={20} className="fill-current translate-x-0.5" />
                    </div>
                  </div>
                </div>

                <div className="flex flex-col">
                  <span className="line-clamp-1 text-xs font-semibold text-white group-hover:text-emerald-400 transition">
                    {meta.name}
                  </span>
                  <span className="text-[10px] text-zinc-400">
                    {meta.releaseInfo ?? (meta.listingYear ? String(meta.listingYear) : meta.releaseDate ?? "Featured")}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
