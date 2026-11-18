import { useState } from "react";
import { useT } from "@/lib/i18n";
import { MUSIC_QUALITY_LABELS, musicTrackQuality, type MusicQuality } from "@/lib/music/quality";
import type { MusicTrack } from "@/lib/music/types";
import { Activity, Sliders, ChevronRight } from "lucide-react";
import "./music-signal.css";

export function MusicQualityGlyph({ tier }: { tier: MusicQuality["tier"] }) {
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      {tier === "hi-res" ? (
        <>
          <path
            d="M3 12V8m4 8V4m4 14V2m4 13V5"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <path d="M17 2v4m-2-2h4" stroke="currentColor" strokeWidth="1.5" />
        </>
      ) : tier === "lossless" ? (
        <path
          d="M3 8v4m4-7v10m4-13v16m4-13v10m3-7v4"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      ) : tier === "lossy" ? (
        <path
          d="M3 9v2m4-6v3m0 4v3m4-12v5m0 4v5m4-12v3m0 4v3m3-6v2"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      ) : (
        <>
          <circle
            cx="10"
            cy="10"
            r="6.5"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeDasharray="2 3"
          />
          <path d="M7 10h6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </>
      )}
    </svg>
  );
}

export function MusicQualityBadge({
  track,
  className = "",
  showEvidence = false,
  interactive = false,
}: {
  track: MusicTrack;
  className?: string;
  showEvidence?: boolean;
  interactive?: boolean;
}) {
  const t = useT();
  const [showPopover, setShowPopover] = useState(false);
  const quality = musicTrackQuality(track);
  if (!quality) return null;
  const tier = t(MUSIC_QUALITY_LABELS[quality.tier]);
  const label =
    quality.tier === "lossy" && quality.format
      ? `${quality.format} · ${tier}`
      : quality.tier === "unverified"
        ? (quality.format ?? quality.label)
        : tier;
  const evidence = quality.detail
    .split(" · ")
    .filter((part) => part !== label && !label.split(" · ").includes(part))
    .join(" · ");

  const handleLaunchStudio = () => {
    window.dispatchEvent(new CustomEvent("argus:open-audiophile-studio"));
    setShowPopover(false);
  };

  return (
    <div
      className="relative inline-flex items-center"
      onMouseEnter={() => interactive && setShowPopover(true)}
      onMouseLeave={() => interactive && setShowPopover(false)}
    >
      <button
        type="button"
        onClick={() => {
          if (interactive) {
            handleLaunchStudio();
          }
        }}
        className={`music-quality-badge ${className} ${interactive ? "cursor-pointer hover:opacity-90" : ""}`}
        data-tier={quality.tier}
        title={`${tier} · ${quality.detail}`}
        aria-label={`${tier} · ${quality.detail}`}
      >
        <MusicQualityGlyph tier={quality.tier} />
        <span>{label}</span>
        {showEvidence && evidence && <span className="music-quality-evidence"> · {evidence}</span>}
      </button>

      {/* Audio Quality Popover */}
      {interactive && showPopover && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-72 p-3.5 rounded-2xl bg-[#0c0d12]/95 border border-white/15 shadow-2xl backdrop-blur-xl z-[300] text-ink animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center justify-between pb-2 border-b border-white/10 mb-2.5">
            <div className="flex items-center gap-1.5 text-xs font-black tracking-wide text-white">
              <Activity size={13} className="text-emerald-400" />
              <span>AUDIO QUALITY DETAILS</span>
            </div>
            <span className="text-[10px] font-mono text-emerald-400 px-1.5 py-0.2 rounded bg-emerald-500/15">
              LOSSLESS
            </span>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between py-0.5">
              <span className="text-ink-muted">Audio Format</span>
              <span className="font-bold text-white font-mono text-[11px]">{quality.detail || "FLAC 24-bit"}</span>
            </div>
            <div className="flex items-center justify-between py-0.5">
              <span className="text-ink-muted">Sound Engine</span>
              <span className="font-semibold text-white/90">High-Fidelity Audio</span>
            </div>
            <div className="flex items-center justify-between py-0.5">
              <span className="text-ink-muted">Volume Leveling</span>
              <span className="text-white/80">Balanced</span>
            </div>
            <div className="flex items-center justify-between py-0.5">
              <span className="text-ink-muted">Headphone Spatial Audio</span>
              <span className="text-accent font-semibold">Active</span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleLaunchStudio}
            className="mt-3 w-full flex items-center justify-center gap-1.5 py-1.5 rounded-xl bg-accent hover:brightness-110 text-white font-bold text-xs transition shadow-sm"
          >
            <Sliders size={12} />
            <span>Audio Settings & Equalizer</span>
            <ChevronRight size={12} />
          </button>
        </div>
      )}
    </div>
  );
}
