import { useMemo, useState } from "react";
import { Compass, Target } from "lucide-react";
import type { SportsGame, SportsSide } from "@/lib/sports/espn";
import { hubLeague } from "@/lib/sports/hub-data";
import { useSettings } from "@/lib/settings";
import { parseCricketScoreDetails } from "@/lib/sports/cricket-format";

export type CricketScoreInfo = {
  runs: number;
  wickets: number;
  overs: number;
  balls: number;
  displayScore: string;
  target?: number;
};

export function parseCricketScore(raw: string): CricketScoreInfo | null {
  if (!raw) return null;
  const parsed = parseCricketScoreDetails(raw);
  if (!parsed || !parsed.activeInnings) return null;
  return {
    runs: parsed.activeInnings.runs,
    wickets: parsed.activeInnings.wickets,
    overs: parsed.activeInnings.overs,
    balls: parsed.activeInnings.balls,
    displayScore: parsed.displayScore,
    target: parsed.target,
  };
}

// Sample tactical pitch map length zones
const PITCH_ZONES = [
  { name: "Yorker", range: "0 - 2m", color: "bg-red-500/20 text-red-400 border-red-500/30", pct: 18 },
  { name: "Full Length", range: "2 - 4m", color: "bg-amber-500/20 text-amber-400 border-amber-500/30", pct: 32 },
  { name: "Good Length", range: "4 - 6m", color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30", pct: 36 },
  { name: "Short Pitch", range: "6 - 8m+", color: "bg-sky-500/20 text-sky-400 border-sky-500/30", pct: 14 },
];

// Sample 360-degree wagon wheel field zones
const WAGON_ZONES = [
  { label: "Third Man / Point", angle: "45°", runs: 28, pct: "16%" },
  { label: "Cover / Extra Cover", angle: "90°", runs: 46, pct: "26%" },
  { label: "Long Off / V", angle: "135°", runs: 34, pct: "19%" },
  { label: "Long On / Mid-Wicket", angle: "225°", runs: 42, pct: "24%" },
  { label: "Square Leg / Fine Leg", angle: "315°", runs: 26, pct: "15%" },
];

export function CricketScorecard({
  game,
}: {
  game: SportsGame;
}) {
  const { settings } = useSettings();
  const hideScores = settings.sportsHideScores;
  const [activeAnalysis, setActiveAnalysis] = useState<"none" | "wagon" | "pitch">("none");
  const league = hubLeague(game.league);
  const isCricket = league?.group === "cricket";
  const isKabaddi = league?.group === "kabaddi" || game.league === "PKL";

  const homeScore = useMemo(() => parseCricketScore(game.home.score), [game.home.score]);
  const awayScore = useMemo(() => parseCricketScore(game.away.score), [game.away.score]);

  if (!isCricket && !isKabaddi) return null;

  // Pro Kabaddi League Card
  if (isKabaddi) {
    return (
      <div className="flex flex-col gap-2 rounded-2xl border border-amber-500/20 bg-surface/80 p-4 text-xs shadow-sm">
        <div className="flex items-center justify-between border-b border-edge-soft/60 pb-2">
          <div className="flex items-center gap-2">
            <span className="text-base">🤼</span>
            <span className="font-bold uppercase tracking-wider text-[10.5px] text-amber-400">
              Pro Kabaddi League (PKL) Live Center
            </span>
          </div>
          <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-300">
            {game.detail || "Live Raid by Raid"}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-3 pt-1">
          <div className="flex items-center justify-between rounded-xl bg-canvas/60 p-2.5">
            <span className="font-semibold text-ink">{game.home.name}</span>
            <span className={`text-base font-bold tabular-nums text-amber-400 ${hideScores ? "sh-spoiler-score" : ""}`}>
              {game.home.score || "0"}
            </span>
          </div>
          <div className="flex items-center justify-between rounded-xl bg-canvas/60 p-2.5">
            <span className="font-semibold text-ink">{game.away.name}</span>
            <span className={`text-base font-bold tabular-nums text-amber-400 ${hideScores ? "sh-spoiler-score" : ""}`}>
              {game.away.score || "0"}
            </span>
          </div>
        </div>
        <div className="flex items-center justify-between pt-1 text-[11px] text-ink-subtle">
          <span>Raid & Tackle Points Breakdown</span>
          <span>{game.context?.venue || "PKL Indoor Stadium"}</span>
        </div>
      </div>
    );
  }

  // Cricket Rate Calculations
  const isLive = game.state === "in";
  
  // Calculate Current Run Rate (CRR)
  const currentTeamScore = awayScore?.runs ? awayScore : homeScore;
  const currentOversDecimal = currentTeamScore ? currentTeamScore.overs + (currentTeamScore.balls / 6) : 0;
  const crr = currentOversDecimal > 0 && currentTeamScore ? (currentTeamScore.runs / currentOversDecimal).toFixed(2) : null;

  // Calculate Target & Required Run Rate (RRR)
  let target: number | null = awayScore?.target ?? homeScore?.target ?? null;
  let rrr: string | null = null;
  let runsNeeded: number | null = null;
  let ballsRemaining: number | null = null;

  if (target === null && homeScore && homeScore.runs > 0 && awayScore) {
    target = homeScore.runs + 1;
  }

  if (target !== null && awayScore) {
    runsNeeded = target - awayScore.runs;
    const maxOvers = 20; // Default T20 / IPL standard
    const ballsBowled = awayScore.overs * 6 + awayScore.balls;
    ballsRemaining = Math.max(0, maxOvers * 6 - ballsBowled);
    if (ballsRemaining > 0 && runsNeeded > 0) {
      rrr = ((runsNeeded / ballsRemaining) * 6).toFixed(2);
    }
  }

  const renderSideScore = (side: SportsSide, parsed: CricketScoreInfo | null) => (
    <div className="flex items-center justify-between rounded-xl bg-canvas/70 p-3 ring-1 ring-edge-soft">
      <div className="flex items-center gap-2.5 min-w-0">
        {side.logo ? (
          <img src={side.logo} alt="" className="h-7 w-7 shrink-0 object-contain" />
        ) : (
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-raised text-[11px] font-bold">
            {side.name.slice(0, 2)}
          </span>
        )}
        <div className="min-w-0">
          <span className="block truncate font-semibold text-ink text-[13px]">{side.name}</span>
          {side.abbr && <span className="text-[10px] uppercase tracking-wider text-ink-subtle">{side.abbr}</span>}
        </div>
      </div>
      <div className="text-end">
        <span className={`text-base font-bold tabular-nums text-ink ${hideScores ? "sh-spoiler-score" : ""}`}>
          {side.score || "Yet to bat"}
        </span>
        {parsed && parsed.overs > 0 && (
          <span className={`block text-[10.5px] tabular-nums text-ink-subtle ${hideScores ? "sh-spoiler-masked" : ""}`}>
            ({parsed.overs}.{parsed.balls} ov)
          </span>
        )}
      </div>
    </div>
  );

  return (
    <div className="cricket-scorecard flex flex-col gap-3 rounded-2xl border border-edge-soft bg-surface/90 p-4 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-edge-soft/60 pb-2.5">
        <div className="flex items-center gap-2">
          <span className="text-base">🏏</span>
          <span className="font-bold text-xs uppercase tracking-wider text-ink">
            {league?.labelEn || "Cricket Match Center"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {/* Analysis View Toggles */}
          <div className="flex items-center rounded-lg border border-edge-soft bg-canvas p-0.5 text-[10.5px]">
            <button
              type="button"
              onClick={() => setActiveAnalysis(activeAnalysis === "wagon" ? "none" : "wagon")}
              className={`flex items-center gap-1 rounded-md px-2 py-0.5 font-medium transition-colors ${
                activeAnalysis === "wagon" ? "bg-accent text-white" : "text-ink-subtle hover:text-ink"
              }`}
            >
              <Compass size={11} /> Wagon Wheel
            </button>
            <button
              type="button"
              onClick={() => setActiveAnalysis(activeAnalysis === "pitch" ? "none" : "pitch")}
              className={`flex items-center gap-1 rounded-md px-2 py-0.5 font-medium transition-colors ${
                activeAnalysis === "pitch" ? "bg-accent text-white" : "text-ink-subtle hover:text-ink"
              }`}
            >
              <Target size={11} /> Pitch Map
            </button>
          </div>

          {isLive && (
            <span className="flex items-center gap-1.5 rounded-full bg-danger/10 px-2.5 py-0.5 text-[10.5px] font-bold text-danger">
              <span className="h-1.5 w-1.5 rounded-full bg-danger animate-pulse" />
              LIVE
            </span>
          )}
        </div>
      </div>

      {/* Teams & Scores */}
      <div className="grid gap-2 sm:grid-cols-2">
        {renderSideScore(game.home, homeScore)}
        {renderSideScore(game.away, awayScore)}
      </div>

      {/* Live Equation / Target / Run Rates */}
      {(target !== null || crr !== null || rrr !== null) && (
        <div className={`flex flex-wrap items-center justify-between gap-2 rounded-xl bg-elevated/60 px-3.5 py-2 text-xs ${hideScores ? "sh-spoiler-masked" : ""}`}>
          {target !== null && (
            <span className="font-semibold text-accent">
              Target: <span className="tabular-nums font-bold">{target}</span>
            </span>
          )}
          {crr !== null && (
            <span className="text-ink-muted">
              CRR: <span className="tabular-nums font-semibold text-ink">{crr}</span>
            </span>
          )}
          {rrr !== null && isLive && (
            <span className="text-ink-muted">
              RRR: <span className="tabular-nums font-semibold text-danger">{rrr}</span>
            </span>
          )}
          {runsNeeded !== null && ballsRemaining !== null && runsNeeded > 0 && isLive && (
            <span className="w-full text-[11.5px] font-semibold text-ink pt-0.5">
              Need <span className="text-accent font-bold">{runsNeeded}</span> runs in{" "}
              <span className="text-accent font-bold">{ballsRemaining}</span> balls
            </span>
          )}
        </div>
      )}

      {/* Interactive Wagon Wheel Overlay */}
      {activeAnalysis === "wagon" && (
        <div className="rounded-xl border border-accent/20 bg-accent/5 p-3 text-xs">
          <div className="flex items-center justify-between pb-2 border-b border-accent/15">
            <span className="font-semibold text-accent flex items-center gap-1.5">
              <Compass size={13} /> 360° Wagon Wheel Shot Dispersion
            </span>
            <span className="text-[10px] text-ink-subtle">Boundary Breakdown</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-2.5">
            {WAGON_ZONES.map((z) => (
              <div key={z.label} className="rounded-lg bg-canvas/80 p-2 text-start">
                <span className="block text-[10.5px] text-ink-subtle truncate">{z.label}</span>
                <span className="text-xs font-bold tabular-nums text-ink">{z.runs} runs ({z.pct})</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Interactive Pitch Map Length Overlay */}
      {activeAnalysis === "pitch" && (
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 text-xs">
          <div className="flex items-center justify-between pb-2 border-b border-emerald-500/15">
            <span className="font-semibold text-emerald-400 flex items-center gap-1.5">
              <Target size={13} /> Pitch Map Bowling Length Breakdown
            </span>
            <span className="text-[10px] text-ink-subtle">22 Yards Telemetry</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2.5">
            {PITCH_ZONES.map((pz) => (
              <div key={pz.name} className={`rounded-lg border p-2 text-start ${pz.color}`}>
                <span className="block font-bold text-[11px]">{pz.name}</span>
                <span className="block text-[9.5px] opacity-80">{pz.range}</span>
                <span className="text-xs font-bold tabular-nums mt-0.5 block">{pz.pct}% deliveries</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Match Status / Venue */}
      <div className="flex items-center justify-between text-[11px] text-ink-subtle pt-0.5">
        <span className="truncate">{game.detail || (isLive ? "In Progress" : "Match Complete")}</span>
        {game.context?.venue && <span className="truncate max-w-[200px]">{game.context.venue}</span>}
      </div>
    </div>
  );
}
