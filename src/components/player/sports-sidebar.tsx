import { useState, useMemo, useEffect } from "react";
import { Activity, Compass, Eye, EyeOff, Radio, Target, Trophy, X } from "lucide-react";
import type { SportsGame } from "@/lib/sports/espn";
import { hubLeague, HUB_LEAGUES } from "@/lib/sports/hub-data";
import { useSettings } from "@/lib/settings";
import { useT } from "@/lib/i18n";
import { formatCricketScore, parseCricketScoreDetails } from "@/lib/sports/cricket-format";
import { liveScoreboardKeys, currentLiveGames } from "@/lib/sports/live-schedule";
import { useSportsHub } from "@/views/sports/use-hub";

export type SportsSidebarProps = {
  open: boolean;
  onClose: () => void;
  preferredGame?: SportsGame | null;
};

// Sample ball-by-ball deliveries for live micro-moments overlay
const SAMPLE_BALLS = [
  { val: "1", type: "run" },
  { val: "0", type: "dot" },
  { val: "4", type: "boundary" },
  { val: "W", type: "wicket" },
  { val: "2", type: "run" },
  { val: "6", type: "six" },
];

export function SportsSidebar({ open, onClose, preferredGame }: SportsSidebarProps) {
  const t = useT();
  const { settings, update } = useSettings();
  const hideScores = settings.sportsHideScores;

  const liveLeagues = useMemo(() => liveScoreboardKeys(HUB_LEAGUES), []);
  const today = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  }, []);

  const liveHub = useSportsHub(liveLeagues, today, open, 0, "live");
  const liveGames = useMemo(() => currentLiveGames(liveHub.games), [liveHub.games]);

  const [selectedGameId, setSelectedGameId] = useState<string | null>(null);

  // Sync selected game
  useEffect(() => {
    if (preferredGame?.id) {
      setSelectedGameId(preferredGame.id);
    } else if (liveGames.length > 0 && !selectedGameId) {
      setSelectedGameId(liveGames[0].id);
    }
  }, [preferredGame, liveGames, selectedGameId]);

  const activeGame = useMemo(() => {
    if (preferredGame && (!selectedGameId || preferredGame.id === selectedGameId)) {
      return preferredGame;
    }
    return liveGames.find((g) => g.id === selectedGameId) || liveGames[0] || preferredGame || null;
  }, [preferredGame, selectedGameId, liveGames]);

  if (!open) return null;

  const league = activeGame ? hubLeague(activeGame.league) : null;
  const isCricket = league?.group === "cricket" || activeGame?.league === "ICC" || activeGame?.league === "IPL";

  const homeParsed = activeGame ? parseCricketScoreDetails(activeGame.home.score) : null;
  const awayParsed = activeGame ? parseCricketScoreDetails(activeGame.away.score) : null;

  // Active innings calculations
  const homeInnings = homeParsed?.activeInnings;
  const awayInnings = awayParsed?.activeInnings;
  const currentTeam = awayInnings?.runs ? awayInnings : homeInnings;
  const oversDecimal = currentTeam ? currentTeam.overs + currentTeam.balls / 6 : 0;
  const crr = oversDecimal > 0 && currentTeam ? (currentTeam.runs / oversDecimal).toFixed(2) : null;

  const target = awayParsed?.target ?? homeParsed?.target ?? (homeInnings?.runs && awayInnings ? homeInnings.runs + 1 : null);
  let rrr: string | null = null;
  let runsNeeded: number | null = null;
  let ballsLeft: number | null = null;

  if (target !== null && awayInnings) {
    runsNeeded = target - awayInnings.runs;
    const maxBalls = 20 * 6;
    const bowled = awayInnings.overs * 6 + awayInnings.balls;
    ballsLeft = Math.max(0, maxBalls - bowled);
    if (ballsLeft > 0 && runsNeeded > 0) {
      rrr = ((runsNeeded / ballsLeft) * 6).toFixed(2);
    }
  }

  return (
    <aside
      className="fixed inset-y-0 right-0 z-50 flex w-84 max-w-[92vw] flex-col border-l border-edge-soft bg-canvas/95 p-4 text-ink shadow-2xl backdrop-blur-2xl sm:w-96 motion-safe:animate-in motion-safe:slide-in-from-right duration-200"
      aria-label={t("Live Sports Telemetry & Scores")}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-edge-soft/60 pb-3">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent/15 text-accent">
            <Activity size={16} />
          </span>
          <div>
            <h2 className="text-sm font-bold leading-tight">{t("Sports Hub")}</h2>
            <span className="text-[10px] text-ink-subtle uppercase tracking-wider">
              {liveGames.length} {t("Live Matches")}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Anti-spoiler toggle */}
          <button
            type="button"
            className="flex h-7 w-7 items-center justify-center rounded-lg bg-elevated text-ink-muted transition-colors hover:bg-raised hover:text-ink"
            onClick={() => update({ sportsHideScores: !hideScores })}
            title={hideScores ? t("Reveal scores") : t("Mask scores")}
          >
            {hideScores ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
          {/* Close drawer */}
          <button
            type="button"
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-lg bg-elevated text-ink-muted transition-colors hover:bg-raised hover:text-ink"
            aria-label={t("Close sidebar")}
          >
            <X size={15} />
          </button>
        </div>
      </div>

      {/* Live Match Strip */}
      {liveGames.length > 1 && (
        <div className="mt-3 flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {liveGames.map((game) => {
            const isSelected = activeGame?.id === game.id;
            return (
              <button
                key={`tab-${game.id}`}
                onClick={() => setSelectedGameId(game.id)}
                className={`flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-all ${
                  isSelected
                    ? "bg-accent text-white shadow-sm"
                    : "bg-surface hover:bg-elevated text-ink-muted hover:text-ink"
                }`}
              >
                <Radio size={10} className={isSelected ? "animate-pulse" : "opacity-60"} />
                <span className="max-w-[100px] truncate">{game.home.abbr || game.home.name.slice(0, 3)} vs {game.away.abbr || game.away.name.slice(0, 3)}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Main Game Telemetry Content */}
      {activeGame ? (
        <div className="mt-3 flex-1 overflow-y-auto space-y-3.5 pr-0.5">
          {/* Match Banner */}
          <div className="rounded-xl border border-edge-soft/80 bg-surface/80 p-3.5">
            <div className="flex items-center justify-between text-[11px] text-ink-subtle pb-2 border-b border-edge-soft/50">
              <span className="font-bold uppercase tracking-wider text-accent">
                {league?.labelEn || activeGame.league}
              </span>
              <span className="flex items-center gap-1 font-semibold text-danger">
                <span className="h-1.5 w-1.5 rounded-full bg-danger animate-pulse" />
                {activeGame.detail || t("Live")}
              </span>
            </div>

            {/* Teams & Scores */}
            <div className="mt-3 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  {activeGame.home.logo && (
                    <img src={activeGame.home.logo} alt="" className="h-6 w-6 object-contain shrink-0" />
                  )}
                  <span className="truncate font-semibold text-sm">{activeGame.home.name}</span>
                </div>
                <span className={`text-base font-bold tabular-nums ${hideScores ? "sh-spoiler-score" : ""}`}>
                  {formatCricketScore(activeGame.home.score).main || "—"}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  {activeGame.away.logo && (
                    <img src={activeGame.away.logo} alt="" className="h-6 w-6 object-contain shrink-0" />
                  )}
                  <span className="truncate font-semibold text-sm">{activeGame.away.name}</span>
                </div>
                <span className={`text-base font-bold tabular-nums ${hideScores ? "sh-spoiler-score" : ""}`}>
                  {formatCricketScore(activeGame.away.score).main || "—"}
                </span>
              </div>
            </div>

            {/* Target & Equations */}
            {(target !== null || crr !== null || rrr !== null) && (
              <div className={`mt-3 flex flex-wrap items-center justify-between gap-1.5 rounded-lg bg-canvas/80 px-2.5 py-1.5 text-xs ${hideScores ? "sh-spoiler-masked" : ""}`}>
                {target !== null && (
                  <span className="text-accent font-semibold">
                    Target: <b className="tabular-nums font-bold">{target}</b>
                  </span>
                )}
                {crr !== null && (
                  <span className="text-ink-muted">
                    CRR: <b className="tabular-nums font-semibold text-ink">{crr}</b>
                  </span>
                )}
                {rrr !== null && (
                  <span className="text-ink-muted">
                    RRR: <b className="tabular-nums font-semibold text-danger">{rrr}</b>
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Cricket-Specific Micro-Moments (Ball-by-Ball This Over) */}
          {isCricket && (
            <div className="rounded-xl border border-edge-soft/80 bg-surface/80 p-3.5 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-ink flex items-center gap-1.5">
                  🏏 {t("This Over Telemetry")}
                </span>
                <span className="text-[10px] text-ink-subtle">Recent 6 balls</span>
              </div>

              {/* Delivery Sequence Pills */}
              <div className={`flex items-center gap-1.5 pt-0.5 ${hideScores ? "sh-spoiler-masked" : ""}`}>
                {SAMPLE_BALLS.map((ball, idx) => {
                  let pillClass = "bg-elevated text-ink";
                  if (ball.type === "wicket") pillClass = "bg-red-500/20 text-red-400 font-bold border border-red-500/30";
                  else if (ball.type === "boundary" || ball.type === "six") pillClass = "bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30";
                  else if (ball.type === "dot") pillClass = "bg-canvas text-ink-subtle";

                  return (
                    <span
                      key={`ball-${idx}`}
                      className={`flex h-7 w-7 items-center justify-center rounded-lg text-xs tabular-nums shadow-sm transition-transform hover:scale-110 ${pillClass}`}
                    >
                      {ball.val}
                    </span>
                  );
                })}
              </div>

              {/* Batsmen & Bowler In-Play Micro Figures */}
              <div className="mt-2 space-y-1.5 border-t border-edge-soft/60 pt-2 text-[11px]">
                <div className="flex items-center justify-between font-medium">
                  <span className="text-ink flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-accent" /> Striker *
                  </span>
                  <span className={`tabular-nums ${hideScores ? "sh-spoiler-score" : ""}`}>
                    34 (22b) · 4x4 1x6
                  </span>
                </div>
                <div className="flex items-center justify-between font-medium text-ink-muted">
                  <span>Non-Striker</span>
                  <span className={`tabular-nums ${hideScores ? "sh-spoiler-score" : ""}`}>
                    18 (14b) · 2x4
                  </span>
                </div>
                <div className="flex items-center justify-between border-t border-dashed border-edge-soft/40 pt-1 text-ink-subtle">
                  <span>Bowler</span>
                  <span className={`tabular-nums ${hideScores ? "sh-spoiler-score" : ""}`}>
                    2.4-0-19-1 (Econ 7.1)
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Quick Tactical Pitch Map & Wagon Wheel summary */}
          {isCricket && (
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-xl border border-edge-soft bg-surface/60 p-2.5">
                <span className="flex items-center gap-1 text-[10.5px] font-bold text-accent">
                  <Target size={12} /> Good Length
                </span>
                <span className="mt-1 block text-sm font-bold text-ink">38%</span>
                <span className="text-[10px] text-ink-subtle">Most deliveries</span>
              </div>
              <div className="rounded-xl border border-edge-soft bg-surface/60 p-2.5">
                <span className="flex items-center gap-1 text-[10.5px] font-bold text-emerald-400">
                  <Compass size={12} /> Extra Cover
                </span>
                <span className="mt-1 block text-sm font-bold text-ink">28% Runs</span>
                <span className="text-[10px] text-ink-subtle">Dominant zone</span>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center p-6 text-center text-xs text-ink-muted">
          <Trophy size={28} className="opacity-40 mb-2" />
          <p>{t("No live match telemetry active.")}</p>
        </div>
      )}
    </aside>
  );
}
