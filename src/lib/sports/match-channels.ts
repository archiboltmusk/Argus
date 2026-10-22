import type { IptvChannel } from "@/lib/iptv/types";

export type GameSides = {
  home: { name: string; abbr: string };
  away: { name: string; abbr: string };
  league: string;
};

export type ChannelMatch = { channel: IptvChannel; score: number };

const SPORTS_GROUP =
  /\b(sports?|football|soccer|basket|nba|nfl|mlb|nhl|ufc|wwe|boxing|racing|tennis|golf|cricket|rugby|f1|formula)\b/i;
const EVENT_SEP = /\s+(?:vs?\.?|@|x|-)\s+/i;

export function norm(s: string): string {
  return s
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function hasWord(hay: string, needle: string): boolean {
  if (!needle) return false;
  return ` ${hay} `.includes(` ${needle} `);
}

/**
 * Rank the user's own IPTV channels against a game. Event-style channels
 * ("Team A vs Team B") rank highest, then channels named after a team, then
 * channels in a sports group that carry the league tag.
 */
export function matchGameChannels(
  game: GameSides,
  channels: IptvChannel[],
  limit = 12,
): ChannelMatch[] {
  const teams = [game.home, game.away].map((t) => ({ name: norm(t.name), abbr: norm(t.abbr) }));
  const league = norm(game.league);
  const out: ChannelMatch[] = [];
  for (const channel of channels) {
    const name = norm(channel.name);
    if (!name) continue;
    const group = channel.group ?? "";
    let score = 0;
    const nameHits = teams.filter((t) => t.name.length > 2 && hasWord(name, t.name)).length;
    const abbrHits = teams.filter((t) => t.abbr.length > 2 && hasWord(name, t.abbr)).length;
    const hits = Math.max(nameHits, abbrHits);
    if (hits === 2) score += 100;
    else if (hits === 1) score += 40;
    if (hits > 0 && EVENT_SEP.test(channel.name)) score += 20;
    if (league.length > 1 && hasWord(name, league)) score += hits > 0 ? 10 : 15;
    if (score > 0 && SPORTS_GROUP.test(group)) score += 5;
    if (score >= 15) out.push({ channel, score });
  }
  return out
    .sort((a, b) => b.score - a.score || a.channel.name.localeCompare(b.channel.name))
    .slice(0, limit);
}
