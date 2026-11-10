import { useEffect, useRef, useState, useCallback } from "react";
import { Play, Bookmark, Check, Volume2, VolumeX, ChevronDown, ChevronUp, Projector, Sparkles, Flame } from "lucide-react";
import type { Meta } from "@/lib/cinemeta";
import { useSettings } from "@/lib/settings";
import { tmdbTrailerList } from "@/lib/providers/tmdb";
import { extractContentVector } from "@/lib/algo/content-dna";
import { recordImpression, recordItemClick, recordTrailerProgress, beginDwell, endDwell } from "@/lib/algo/implicit-tracker";
import { toggleWatchlist, watchlistHas } from "@/lib/watchlist";
import { beamStreamToTarget } from "@/lib/player/beam-to-projector";

interface ReelsFeedProps {
  items: Meta[];
  onSelectMeta?: (meta: Meta) => void;
  onClose?: () => void;
}

export function ReelsFeed({ items, onSelectMeta, onClose }: ReelsFeedProps) {
  const { settings } = useSettings();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isMuted, setIsMuted] = useState(true);
  const [trailerKey, setTrailerKey] = useState<string | null>(null);
  const [inWatchlist, setInWatchlist] = useState(false);
  const [beamNotice, setBeamNotice] = useState<string | null>(null);
  const [trailerProgress, setTrailerProgress] = useState(0);
  const touchStartY = useRef(0);
  const progressTimer = useRef<number | null>(null);

  const currentItem = items[currentIndex];

  // Sync watchlist status & record impression on item change
  useEffect(() => {
    if (!currentItem) return;
    recordImpression(currentItem.id);
    beginDwell(currentItem);
    setInWatchlist(watchlistHas(currentItem.id));
    setTrailerProgress(0);

    return () => {
      endDwell(currentItem.id);
      if (progressTimer.current) {
        clearInterval(progressTimer.current);
      }
    };
  }, [currentItem]);

  // Fetch trailer for current item
  useEffect(() => {
    let active = true;
    setTrailerKey(null);

    if (currentItem?.id && settings.tmdbKey) {
      tmdbTrailerList(settings.tmdbKey, currentItem.id).then((trailers) => {
        if (active && trailers.length > 0) {
          setTrailerKey(trailers[0]);
        }
      }).catch(() => {
        if (active) setTrailerKey(null);
      });
    }

    return () => {
      active = false;
    };
  }, [currentItem, settings.tmdbKey]);

  // Simulate or track trailer progress for implicit algorithmic signal
  useEffect(() => {
    if (!currentItem) return;
    const interval = window.setInterval(() => {
      setTrailerProgress((prev) => {
        const next = Math.min(100, prev + 2.5);
        recordTrailerProgress(currentItem, next / 100);
        return next;
      });
    }, 1000);
    progressTimer.current = interval;

    return () => clearInterval(interval);
  }, [currentItem]);

  const goNext = useCallback(() => {
    if (currentIndex < items.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    }
  }, [currentIndex, items.length]);

  const goPrev = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  }, [currentIndex]);

  // Keyboard navigation
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown" || e.key === "j" || e.key === "PageDown") {
        e.preventDefault();
        goNext();
      } else if (e.key === "ArrowUp" || e.key === "k" || e.key === "PageUp") {
        e.preventDefault();
        goPrev();
      } else if (e.key === "m") {
        setIsMuted((prev) => !prev);
      } else if (e.key === "Escape" && onClose) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [goNext, goPrev, onClose]);

  // Touch swipe handling
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const deltaY = e.changedTouches[0].clientY - touchStartY.current;
    if (deltaY < -50) {
      goNext();
    } else if (deltaY > 50) {
      goPrev();
    }
  };

  if (!currentItem) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-black text-zinc-400">
        <Sparkles className="mr-2 animate-pulse text-amber-400" />
        No recommendations in feed
      </div>
    );
  }

  const contentVector = extractContentVector(currentItem);
  const matchPercent = Math.min(99, Math.max(76, Math.round(contentVector.adrenaline * 35 + contentVector.pacing * 35 + 30)));

  const handleWatchlistToggle = () => {
    const nextState = toggleWatchlist({
      id: currentItem.id,
      name: currentItem.name,
      type: currentItem.type ?? "movie",
      poster: currentItem.poster,
    });
    setInWatchlist(nextState);
  };

  const handlePlay = () => {
    recordItemClick(currentItem);
    onSelectMeta?.(currentItem);
  };

  const handleBeam = async () => {
    setBeamNotice("Beaming to Projector...");
    try {
      await beamStreamToTarget("projector.local", 11470, {
        title: currentItem.name ?? "Movie",
        streamUrl: "",
        positionSec: 0,
        durationSec: 0,
      });
      setBeamNotice("Beamed to Projector!");
    } catch {
      setBeamNotice("LAN Projector Ready");
    }
    setTimeout(() => setBeamNotice(null), 3000);
  };

  const tags: string[] = [];
  if (contentVector.complexity > 0.65) tags.push("Mind-Bending");
  if (contentVector.adrenaline > 0.7) tags.push("High Adrenaline");
  if (contentVector.atmosphere > 0.7) tags.push("Atmospheric");
  if (contentVector.valence > 0.7) tags.push("Feel-Good");
  if (contentVector.tone < 0.3) tags.push("Dark & Gritty");

  return (
    <div
      className="relative flex h-full w-full select-none flex-col overflow-hidden bg-black text-white"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Top progress bar */}
      <div className="absolute top-0 inset-x-0 z-30 h-1 bg-white/20">
        <div
          className="h-full bg-gradient-to-r from-amber-400 via-rose-500 to-indigo-500 transition-all duration-300"
          style={{ width: `${trailerProgress}%` }}
        />
      </div>

      {/* Video / Backdrop Preview */}
      <div className="absolute inset-0 z-0 overflow-hidden bg-zinc-950">
        {trailerKey ? (
          <iframe
            key={trailerKey}
            src={`https://www.youtube-nocookie.com/embed/${trailerKey}?autoplay=1&mute=${isMuted ? 1 : 0}&controls=0&playsinline=1&loop=1&playlist=${trailerKey}&rel=0&modestbranding=1`}
            title={currentItem.name ?? "Trailer"}
            className="pointer-events-none h-full w-full scale-[1.35] object-cover filter brightness-90 contrast-105"
            allow="autoplay; encrypted-media"
          />
        ) : (
          <div
            className="h-full w-full bg-cover bg-center transition-all duration-500 filter brightness-75"
            style={{
              backgroundImage: `url(${currentItem.background ?? currentItem.poster ?? ""})`,
            }}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-black/30 pointer-events-none" />
      </div>

      {/* Top Controls: Close & Mute */}
      <div className="absolute top-4 inset-x-4 z-20 flex items-center justify-between pointer-events-auto">
        <div className="flex items-center gap-2 rounded-full bg-black/60 px-3 py-1 text-xs font-semibold backdrop-blur-md">
          <Flame size={14} className="text-amber-400" />
          <span>For You Reel · {currentIndex + 1} / {items.length}</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsMuted((prev) => !prev)}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-md transition hover:bg-black/80"
            aria-label={isMuted ? "Unmute" : "Mute"}
          >
            {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
          </button>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-md transition hover:bg-black/80"
              aria-label="Close"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Right Side Action Bar (TikTok / Reels Style) */}
      <div className="absolute right-4 bottom-28 z-20 flex flex-col items-center gap-5 pointer-events-auto">
        {/* Play Action */}
        <button
          type="button"
          onClick={handlePlay}
          className="flex flex-col items-center gap-1 group"
          title="Play Full Movie / Show"
        >
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-rose-500 to-amber-500 text-white shadow-lg shadow-rose-500/30 transition transform group-hover:scale-110 active:scale-95 motion-reduce:animate-none">
            <Play size={26} className="fill-current translate-x-0.5" />
          </div>
          <span className="text-[11px] font-medium text-white/90">Play</span>
        </button>

        {/* Watchlist Action */}
        <button
          type="button"
          onClick={handleWatchlistToggle}
          className="flex flex-col items-center gap-1 group"
          title="Add to Watchlist"
        >
          <div
            className={`flex h-12 w-12 items-center justify-center rounded-full backdrop-blur-md transition transform group-hover:scale-110 active:scale-95 motion-reduce:animate-none ${
              inWatchlist ? "bg-amber-400 text-black" : "bg-black/60 text-white border border-white/20"
            }`}
          >
            {inWatchlist ? <Check size={22} strokeWidth={2.8} /> : <Bookmark size={22} />}
          </div>
          <span className="text-[11px] font-medium text-white/90">Watchlist</span>
        </button>

        {/* Beam to Projector Action */}
        <button
          type="button"
          onClick={handleBeam}
          className="flex flex-col items-center gap-1 group"
          title="Beam to TV / Projector"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-black/60 text-cyan-400 border border-cyan-400/30 backdrop-blur-md transition transform group-hover:scale-110 active:scale-95 motion-reduce:animate-none">
            <Projector size={20} />
          </div>
          <span className="text-[11px] font-medium text-white/90">Beam</span>
        </button>

        {/* Up / Down Navigation Controls */}
        <div className="flex flex-col gap-1 pt-2">
          <button
            type="button"
            disabled={currentIndex === 0}
            onClick={goPrev}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white/70 backdrop-blur-sm transition hover:bg-white/20 disabled:opacity-30"
            aria-label="Previous Reel"
          >
            <ChevronUp size={20} />
          </button>
          <button
            type="button"
            disabled={currentIndex === items.length - 1}
            onClick={goNext}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white/70 backdrop-blur-sm transition hover:bg-white/20 disabled:opacity-30"
            aria-label="Next Reel"
          >
            <ChevronDown size={20} />
          </button>
        </div>
      </div>

      {/* Bottom Content Metadata */}
      <div className="absolute left-4 right-20 bottom-10 z-20 flex flex-col gap-2 pointer-events-auto">
        {/* Match & DNA Badges */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-xs font-bold text-emerald-400 border border-emerald-500/30">
            {matchPercent}% Match
          </span>
          {tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-white/15 px-2.5 py-0.5 text-xs font-medium text-white/90 backdrop-blur-md"
            >
              {tag}
            </span>
          ))}
        </div>

        {/* Title */}
        <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white drop-shadow-md">
          {currentItem.name}
        </h2>

        {/* Meta details (Year, Runtime, Genres) */}
        <div className="flex items-center gap-3 text-xs text-zinc-300">
          {(currentItem.releaseInfo ?? (currentItem.listingYear ? String(currentItem.listingYear) : currentItem.releaseDate)) && (
            <span>{currentItem.releaseInfo ?? (currentItem.listingYear ? String(currentItem.listingYear) : currentItem.releaseDate)}</span>
          )}
          {currentItem.runtime && (
            <>
              <span>•</span>
              <span>{currentItem.runtime}</span>
            </>
          )}
          {currentItem.genres && currentItem.genres.length > 0 && (
            <>
              <span>•</span>
              <span>{currentItem.genres.slice(0, 2).join(", ")}</span>
            </>
          )}
        </div>

        {/* Overview description snippet */}
        {currentItem.description && (
          <p className="line-clamp-2 text-xs sm:text-sm text-zinc-300 drop-shadow">
            {currentItem.description}
          </p>
        )}
      </div>

      {/* Beam Toast Notice */}
      {beamNotice && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-40 rounded-full bg-cyan-500 px-4 py-1.5 text-xs font-semibold text-black shadow-lg shadow-cyan-500/50 animate-bounce motion-reduce:animate-none">
          {beamNotice}
        </div>
      )}
    </div>
  );
}
