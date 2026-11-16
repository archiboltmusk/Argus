import { useMemo } from "react";
import type { Meta } from "@/lib/cinemeta";
import {
  CulturalConstellationEngine,
  type CulturalConstellation,
} from "@/lib/algo/cultural-constellation";

export interface CulturalPolymathModalProps {
  isOpen: boolean;
  onClose: () => void;
  meta: Meta;
}

export function CulturalPolymathModal({
  isOpen,
  onClose,
  meta,
}: CulturalPolymathModalProps) {
  const constellation: CulturalConstellation = useMemo(() => {
    const engine = new CulturalConstellationEngine();
    return engine.synthesizeConstellation(meta);
  }, [meta]);

  if (!isOpen) return null;

  const { literaryMatch, visualArtMatch, musicalTheme, filmVector } = constellation;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Cultural Constellation"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md px-4 py-8"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl rounded-2xl bg-zinc-900 border border-zinc-700/60 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="p-2 rounded-xl bg-amber-500/20 text-amber-400">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </span>
            <div>
              <h2 className="text-base font-semibold text-white">
                Cultural Constellation &bull; {meta.name}
              </h2>
              <p className="text-xs text-zinc-400">
                Cross-medium artistic lineage linking literature, museum art, and musical scores
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-zinc-800"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* 8D DNA Badges */}
          <div className="flex flex-wrap gap-2 pb-2 border-b border-zinc-800/60">
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300">
              Pacing: {Math.round(filmVector.pacing * 100)}%
            </span>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300">
              Complexity: {Math.round(filmVector.complexity * 100)}%
            </span>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300">
              Atmosphere: {Math.round(filmVector.atmosphere * 100)}%
            </span>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300">
              Tone: {Math.round(filmVector.tone * 100)}%
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Literary Sister Match */}
            {literaryMatch && (
              <div className="p-3.5 rounded-xl bg-zinc-950/70 border border-zinc-800 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                      📖 Literary Parallel
                    </span>
                    <span className="text-[10px] bg-amber-500/10 text-amber-300 px-2 py-0.5 rounded-full font-mono">
                      {literaryMatch.affinityScore}% Match
                    </span>
                  </div>
                  <h3 className="text-sm font-semibold text-white">
                    {literaryMatch.book.title}
                  </h3>
                  <p className="text-xs text-zinc-400 mb-2">
                    by {literaryMatch.book.authors.join(", ")} ({literaryMatch.book.publishedYear})
                  </p>
                  <p className="text-xs text-zinc-300 line-clamp-3 mb-2">
                    {literaryMatch.book.summary}
                  </p>
                </div>
                <div className="pt-2 border-t border-zinc-800/60 text-[11px] text-zinc-400 italic">
                  &ldquo;{literaryMatch.rationale}&rdquo;
                </div>
              </div>
            )}

            {/* Visual Fine Art Match */}
            {visualArtMatch && (
              <div className="p-3.5 rounded-xl bg-zinc-950/70 border border-zinc-800 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
                      🎨 Museum Aesthetic Parallel
                    </span>
                    <span className="text-[10px] bg-indigo-500/10 text-indigo-300 px-2 py-0.5 rounded-full font-mono">
                      {visualArtMatch.affinityScore}% Match
                    </span>
                  </div>
                  <h3 className="text-sm font-semibold text-white">
                    {visualArtMatch.artwork.title}
                  </h3>
                  <p className="text-xs text-zinc-400 mb-2">
                    by {visualArtMatch.artwork.artist} ({visualArtMatch.artwork.date}) &bull; {visualArtMatch.artwork.department}
                  </p>
                  {visualArtMatch.artwork.thumbnailUrl && (
                    <div className="h-24 w-full rounded-lg overflow-hidden mb-2 bg-zinc-800">
                      <img
                        src={visualArtMatch.artwork.thumbnailUrl}
                        alt={visualArtMatch.artwork.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                </div>
                <div className="pt-2 border-t border-zinc-800/60 text-[11px] text-zinc-400 italic">
                  {visualArtMatch.aestheticLink}
                </div>
              </div>
            )}
          </div>

          {/* Musical Theme Pairing */}
          {musicalTheme && (
            <div className="p-3.5 rounded-xl bg-zinc-950/70 border border-zinc-800 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400 shrink-0">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                  </svg>
                </span>
                <div>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-400 block">
                    Acoustic Soundtrack Sister &bull; {musicalTheme.style}
                  </span>
                  <h4 className="text-xs sm:text-sm font-semibold text-white">
                    {musicalTheme.title} &mdash; {musicalTheme.composerOrArtist}
                  </h4>
                  <p className="text-[11px] text-zinc-400">
                    {musicalTheme.reason}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
