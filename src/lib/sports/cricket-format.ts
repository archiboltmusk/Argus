export type FormattedCricketScore = {
  main: string;
  target?: string;
  overs?: string;
};

export type CricketInnings = {
  runs: number;
  wickets: number;
  overs: number;
  balls: number;
  declared?: boolean;
};

export type ParsedCricketScore = {
  innings: CricketInnings[];
  activeInnings: CricketInnings | null;
  target?: number;
  displayScore: string;
};

/**
 * Normalizes ESPN / TheSportsDB cricket score strings for display in fixture lists,
 * tickers, and scorecards. Strips misplaced symbols and extracts target equations.
 */
export function formatCricketScore(raw: string | undefined | null): FormattedCricketScore {
  if (!raw || typeof raw !== "string" || !raw.trim()) {
    return { main: "" };
  }

  let s = raw.trim();

  // Strip leading ampersand from second innings representations (e.g. "& 65/7 (26 ov)" -> "65/7 (26 ov)")
  s = s.replace(/^&\s*/, "");

  // Extract target if embedded in score (e.g. "194 & 38/0 (9 ov, target 369)")
  let target: string | undefined;
  const targetMatch = s.match(/,?\s*target\s*(\d+)/i);
  if (targetMatch) {
    target = targetMatch[1];
    s = s.replace(/,?\s*target\s*\d+/i, "").trim();
  }

  // Clean trailing commas, extra spaces, or empty parens resulting from extraction
  s = s.replace(/\(\s*,\s*/g, "(").replace(/,\s*\)/g, ")");
  s = s.replace(/\(\s*\)/g, "").trim();
  s = s.replace(/\s+/g, " ");

  // Extract overs note if cleanly isolated
  let overs: string | undefined;
  const oversMatch = s.match(/\((\d+(?:\.\d+)?\s*(?:ov|overs)?)\)/i);
  if (oversMatch) {
    overs = oversMatch[1];
  }

  return {
    main: s,
    target,
    overs,
  };
}

/**
 * Parses multi-innings cricket scores (e.g. "272 & 290/5d", "194 & 38/0 (9 ov, target 369)")
 * and extracts individual innings, overs, declarations, target, and the currently active innings.
 */
export function parseCricketScoreDetails(raw: string | undefined | null): ParsedCricketScore | null {
  if (!raw || typeof raw !== "string" || !raw.trim()) return null;

  const formatted = formatCricketScore(raw);
  const target = formatted.target ? parseInt(formatted.target, 10) : undefined;

  const rawParts = formatted.main.split("&").map((p) => p.trim()).filter(Boolean);
  if (!rawParts.length) return null;

  const innings: CricketInnings[] = [];

  for (const part of rawParts) {
    const declared = /d$/i.test(part) || /\(d\)/i.test(part);
    const cleaned = part.replace(/[dD]$/, "").trim();

    const ovMatch = cleaned.match(/\((\d+)(?:\.(\d+))?\s*(?:ov|overs)?\)/i);
    const overs = ovMatch && ovMatch[1] ? parseInt(ovMatch[1], 10) : 0;
    const balls = ovMatch && ovMatch[2] ? parseInt(ovMatch[2], 10) : 0;

    const scorePart = cleaned.replace(/\([^)]*\)/, "").trim();
    const runMatch = scorePart.match(/(\d+)(?:[/|-](\d+))?/);

    if (runMatch) {
      const runs = parseInt(runMatch[1], 10);
      const wickets = runMatch[2]
        ? parseInt(runMatch[2], 10)
        : declared
          ? 10
          : overs === 0
            ? 10
            : 0;

      innings.push({
        runs,
        wickets,
        overs,
        balls,
        declared,
      });
    }
  }

  const activeInnings = innings.length > 0 ? innings[innings.length - 1] : null;

  return {
    innings,
    activeInnings,
    target,
    displayScore: formatted.main,
  };
}
