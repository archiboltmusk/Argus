export type CricketMatchEvent = "wicket" | "boundary_four" | "boundary_six" | "fifty" | "century" | "over_end";

export type CricketAlertPayload = {
  matchTitle: string;
  eventType: CricketMatchEvent;
  heading: string;
  body: string;
  scoreText: string;
};

/**
 * Formats non-intrusive desktop toast alerts for major cricket events
 * when Argus is minimized or playing in the background.
 */
export function formatCricketAlert(
  matchTitle: string,
  event: CricketMatchEvent,
  scoreText: string,
  playerDetail?: string,
): CricketAlertPayload {
  let heading = "🏏 Cricket Live Update";
  let body = `${matchTitle}: ${scoreText}`;

  switch (event) {
    case "wicket":
      heading = "🔴 WICKET!";
      body = playerDetail ? `${playerDetail} is OUT! (${scoreText})` : `Wicket fell in ${matchTitle} (${scoreText})`;
      break;
    case "boundary_six":
      heading = "💥 MASSIVE SIX!";
      body = playerDetail ? `${playerDetail} smashes it into the stands! (${scoreText})` : `Huge six in ${matchTitle}!`;
      break;
    case "boundary_four":
      heading = "⚡ FOUR!";
      body = playerDetail ? `${playerDetail} finds the boundary! (${scoreText})` : `Four runs in ${matchTitle}!`;
      break;
    case "fifty":
      heading = "⭐ 50 RUNS!";
      body = `${playerDetail || "Batsman"} reaches a hard-fought half-century! (${scoreText})`;
      break;
    case "century":
      heading = "👑 MAGNIFICENT 100!";
      body = `${playerDetail || "Batsman"} scores a sensational Century! (${scoreText})`;
      break;
    case "over_end":
      heading = "🏏 Over Complete";
      body = `${matchTitle} is now ${scoreText}`;
      break;
  }

  return { matchTitle, eventType: event, heading, body, scoreText };
}
