import { safeFetch } from "@/lib/safe-fetch";
import { BASE, BY_KEY, parseEvents, sortGames, type SportsGame } from "./espn";

const DAY_TTL = 30_000;
const dayCache = new Map<string, { at: number; games: SportsGame[] }>();

/** ESPN scoreboard date key (YYYYMMDD) in the viewer's local calendar. */
export function ymd(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}${m}${day}`;
}

export function addDays(d: Date, n: number): Date {
  const out = new Date(d);
  out.setDate(out.getDate() + n);
  return out;
}

async function fetchLeagueDay(league: string, date: string): Promise<SportsGame[]> {
  const def = BY_KEY.get(league);
  if (!def) return [];
  const key = `${league}:${date}`;
  const hit = dayCache.get(key);
  if (hit && Date.now() - hit.at < DAY_TTL) return hit.games;
  try {
    const res = await safeFetch(`${BASE}/${def.path}/scoreboard?dates=${date}`);
    if (!res.ok) return hit?.games ?? [];
    const data = (await res.json()) as { events?: unknown[] };
    const events = Array.isArray(data.events) ? data.events : [];
    const games = parseEvents(events, def);
    dayCache.set(key, { at: Date.now(), games });
    return games;
  } catch {
    return hit?.games ?? [];
  }
}

/** Games for one calendar day across the given leagues, live first. */
export async function fetchGamesOnDate(leagues: string[], date: Date): Promise<SportsGame[]> {
  const day = ymd(date);
  const lists = await Promise.all(leagues.map((l) => fetchLeagueDay(l, day)));
  const seen = new Set<string>();
  const flat = lists.flat().filter((g) => {
    const k = `${g.league}:${g.id}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
  return sortGames(flat);
}
