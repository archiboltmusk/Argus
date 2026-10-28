import { useEffect, useState } from "react";
import { ExternalLink, Play, Tv, Video, X } from "lucide-react";
import { openUrl } from "@/lib/window";
import type { SportsGame } from "@/lib/sports/espn";
import {
  loadSportsYoutubeVideos,
  type SportsYoutubeVideo,
} from "@/lib/sports/youtube-videos";
import { hubLeague } from "@/lib/sports/hub-data";

export function MatchHighlights({ game }: { game: SportsGame }) {
  const [videos, setVideos] = useState<SportsYoutubeVideo[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeVideo, setActiveVideo] = useState<SportsYoutubeVideo | null>(null);

  const league = hubLeague(game.league);

  useEffect(() => {
    // Only resolve highlights for finished or live matches
    if (game.state === "pre") return;

    const controller = new AbortController();
    setLoading(true);

    const names = [game.home.name, game.away.name].filter(Boolean);
    const query = {
      names,
      league: game.league,
      eventTitle: game.context?.name || `${game.away.name} vs ${game.home.name}`,
      eventStartMs: game.startMs,
      participants: [
        { name: game.home.name, abbr: game.home.abbr },
        { name: game.away.name, abbr: game.away.abbr },
      ],
    };

    loadSportsYoutubeVideos(query, controller.signal)
      .then((res) => {
        if (!controller.signal.aborted) {
          setVideos(res);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [game.id, game.state, game.home.name, game.away.name, game.league, game.startMs]);

  // If no videos yet, construct a smart search fallback
  const fallbackSearchQuery = `${game.away.name} vs ${game.home.name} highlights ${league?.labelEn || game.league}`;
  const fallbackSearchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(fallbackSearchQuery)}`;

  return (
    <section className="match-highlights-section rounded-2xl border border-edge-soft bg-surface/80 p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-red-500/10 text-red-400">
            <Video size={14} />
          </span>
          <h3 className="text-sm font-bold text-ink">
            Official Highlights & Recap
          </h3>
        </div>
        <button
          type="button"
          onClick={() => openUrl(fallbackSearchUrl)}
          className="flex items-center gap-1 text-[11.5px] font-semibold text-accent hover:underline"
        >
          <span>More on YouTube</span>
          <ExternalLink size={11} />
        </button>
      </div>

      {loading ? (
        <div className="flex min-h-[90px] items-center justify-center text-xs text-ink-subtle">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-ink-subtle border-t-transparent mr-2" />
          Finding official highlights…
        </div>
      ) : videos.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {videos.slice(0, 2).map((vid) => (
            <div
              key={vid.id}
              className="group relative flex flex-col overflow-hidden rounded-xl border border-edge-soft bg-canvas transition-all hover:border-edge"
            >
              <div
                role="button"
                tabIndex={0}
                onClick={() => setActiveVideo(vid)}
                className="relative aspect-video w-full cursor-pointer overflow-hidden bg-black/40"
              >
                <img
                  src={vid.image}
                  alt={vid.title}
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  loading="lazy"
                />
                <div className="absolute inset-0 flex items-center justify-center bg-black/25 opacity-90 transition-opacity group-hover:bg-black/40">
                  <span className="flex h-11 w-11 items-center justify-center rounded-full bg-red-600 text-white shadow-lg transition-transform group-hover:scale-110">
                    <Play size={18} fill="currentColor" className="translate-x-0.5" />
                  </span>
                </div>
              </div>
              <div className="p-3">
                <h4 className="line-clamp-2 text-xs font-semibold text-ink group-hover:text-accent">
                  {vid.title}
                </h4>
                <div className="mt-1.5 flex items-center justify-between text-[10.5px] text-ink-subtle">
                  <span>{vid.channel}</span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      openUrl(vid.url);
                    }}
                    className="hover:text-ink inline-flex items-center gap-1"
                  >
                    Watch <ExternalLink size={10} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-edge-soft/80 py-5 text-center text-xs text-ink-muted">
          <p>Highlights are being processed by broadcasters.</p>
          <button
            type="button"
            onClick={() => openUrl(fallbackSearchUrl)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-elevated px-3 py-1.5 text-xs font-semibold text-ink hover:bg-elevated/90"
          >
            <Tv size={12} /> Search Official Highlights
          </button>
        </div>
      )}

      {/* Embedded Video Modal */}
      {activeVideo && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
          onClick={() => setActiveVideo(null)}
        >
          <div
            className="relative w-full max-w-4xl overflow-hidden rounded-2xl bg-canvas shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-edge-soft p-3">
              <span className="truncate text-xs font-bold text-ink pe-4">
                {activeVideo.title}
              </span>
              <button
                type="button"
                onClick={() => setActiveVideo(null)}
                className="flex h-7 w-7 items-center justify-center rounded-full bg-elevated text-ink hover:bg-elevated/80"
              >
                <X size={15} />
              </button>
            </div>
            <div className="relative aspect-video w-full bg-black">
              <iframe
                src={`https://www.youtube-nocookie.com/embed/${activeVideo.id}?autoplay=1&rel=0`}
                title={activeVideo.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="h-full w-full border-0"
              />
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
