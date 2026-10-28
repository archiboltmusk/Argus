import { useState } from "react";
import { Play, Sparkles } from "lucide-react";
import type { SportsGame } from "@/lib/sports/espn";
import { hubLeague } from "@/lib/sports/hub-data";
import { useSettings } from "@/lib/settings";
import { useT } from "@/lib/i18n";
import { MatchHighlights } from "./match-highlights";

export function SportsHighlightReel({
  games,
  onOpen,
}: {
  games: SportsGame[];
  onOpen?: (game: SportsGame) => void;
}) {
  const t = useT();
  const { settings } = useSettings();
  const hideScores = settings.sportsHideScores;
  const [selectedHighlightGame, setSelectedHighlightGame] = useState<SportsGame | null>(null);

  // Filter completed matches with valid teams
  const finished = games
    .filter((g) => g.state === "post" && g.home.name && g.away.name)
    .slice(0, 10);

  if (!finished.length) return null;

  return (
    <section className="sh-section sh-highlights-reel">
      <div className="sh-section-head">
        <div>
          <h2>
            {t("Match Highlights & Recaps")}
            <span>{t("Official recaps & key moments")}</span>
          </h2>
          <p>{t("Catch up on official broadcasts, game reviews, and completed match recaps.")}</p>
        </div>
      </div>

      <div className="sh-event-rail">
        {finished.map((game) => {
          const league = hubLeague(game.league);
          return (
            <div
              key={`reel-${game.id}-${game.league}`}
              className="sh-event-card sh-highlight-card group relative cursor-pointer"
              onClick={() => setSelectedHighlightGame(game)}
            >
              <div className="sh-card-meta">
                <span className="flex items-center gap-1.5 font-bold text-accent">
                  <Sparkles size={12} />
                  {league?.labelEn || game.league}
                </span>
                <span className="rounded bg-elevated px-1.5 py-0.5 text-[10px] font-semibold text-ink-muted">
                  {t("Recap")}
                </span>
              </div>

              <div className="sh-card-teams">
                <span>
                  {game.home.logo && (
                    <span className="sh-team-logo">
                      <img src={game.home.logo} alt="" />
                    </span>
                  )}
                  <strong>{game.home.name}</strong>
                  <b className={`tabular-nums ${hideScores ? "sh-spoiler-score" : ""}`}>
                    {game.home.score || "—"}
                  </b>
                </span>
                <span>
                  {game.away.logo && (
                    <span className="sh-team-logo">
                      <img src={game.away.logo} alt="" />
                    </span>
                  )}
                  <strong>{game.away.name}</strong>
                  <b className={`tabular-nums ${hideScores ? "sh-spoiler-score" : ""}`}>
                    {game.away.score || "—"}
                  </b>
                </span>
              </div>

              <div className="sh-card-bottom">
                <span className="truncate text-[11px] text-ink-muted">
                  {game.detail || t("Final")}
                </span>
                <div className="flex items-center gap-1.5">
                  {onOpen && (
                    <button
                      type="button"
                      className="rounded-md bg-elevated px-2 py-1 text-[11px] font-semibold text-ink-muted transition-colors hover:text-ink"
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpen(game);
                      }}
                    >
                      {t("Details")}
                    </button>
                  )}
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 rounded-md bg-accent/15 px-2 py-1 text-[11px] font-bold text-accent transition-colors hover:bg-accent hover:text-white"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedHighlightGame(game);
                    }}
                  >
                    <Play size={10} fill="currentColor" /> {t("Watch Recap")}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {selectedHighlightGame && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md"
          onClick={() => setSelectedHighlightGame(null)}
        >
          <div
            className="w-full max-w-3xl"
            onClick={(e) => e.stopPropagation()}
          >
            <MatchHighlights game={selectedHighlightGame} />
          </div>
        </div>
      )}
    </section>
  );
}
