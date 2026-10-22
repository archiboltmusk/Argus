import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Radio } from "lucide-react";
import { useT, useUiLanguage } from "@/lib/i18n";
import { useSettings } from "@/lib/settings";
import { useScrollMemory, useView } from "@/lib/view";
import {
  DEFAULT_SPORTS_LEAGUES,
  LEAGUES,
  getLeagueLabel,
  liveCount,
  type SportsGame,
} from "@/lib/sports/espn";
import { addDays, fetchGamesOnDate, ymd } from "@/lib/sports/schedule";
import { SportsCard } from "@/views/live/live-home/sports/sports-card";
import { WatchSourcesModal } from "./sports/watch-sources-modal";

const POLL_MS = 15_000;
const isSameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();

export function SportsView({ active }: { active: boolean }) {
  const t = useT();
  const locale = useUiLanguage();
  const { settings } = useSettings();
  const { openMatchDetail } = useView();
  const scrollRef = useRef<HTMLDivElement>(null);
  useScrollMemory("sports", scrollRef, active);

  const [day, setDay] = useState(() => new Date());
  const [league, setLeague] = useState<string>("all");
  const [games, setGames] = useState<SportsGame[]>([]);
  const [loadedKey, setLoadedKey] = useState("");
  const [watching, setWatching] = useState<SportsGame | null>(null);

  const userLeagues = settings.sportsLeagues?.length
    ? settings.sportsLeagues
    : DEFAULT_SPORTS_LEAGUES;
  const leagueKey = (league === "all" ? userLeagues : [league]).join(",");
  const isToday = isSameDay(day, new Date());
  const dayKey = ymd(day);
  const requestKey = `${dayKey}|${leagueKey}`;
  const loading = loadedKey !== requestKey;

  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    const date = new Date(
      Number(dayKey.slice(0, 4)),
      Number(dayKey.slice(4, 6)) - 1,
      Number(dayKey.slice(6, 8)),
    );
    const load = () =>
      fetchGamesOnDate(leagueKey.split(","), date)
        .then((g) => {
          if (cancelled) return;
          setGames(g);
          setLoadedKey(requestKey);
        })
        .catch(() => {});
    void load();
    if (dayKey !== ymd(new Date())) {
      return () => {
        cancelled = true;
      };
    }
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") void load();
    }, POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [active, leagueKey, dayKey, requestKey]);

  const byLeague = useMemo(() => {
    const m = new Map<string, SportsGame[]>();
    for (const g of games) {
      const list = m.get(g.league) ?? [];
      list.push(g);
      m.set(g.league, list);
    }
    return [...m.entries()];
  }, [games]);

  const leagueByTag = useMemo(() => new Map(LEAGUES.map((l) => [l.tag, l] as const)), []);
  const live = liveCount(games);
  const dayLabel = day.toLocaleDateString(locale, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <div ref={scrollRef} className="h-full overflow-y-auto px-8 pb-16 pt-24">
      <div className="mx-auto flex max-w-5xl flex-col gap-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-baseline gap-3">
            <h1 className="font-display text-[30px] font-medium leading-none tracking-tight text-ink">
              {t("Sports")}
            </h1>
            {live > 0 && (
              <span className="flex items-center gap-1.5 text-[13px] font-semibold text-brand">
                <Radio size={14} /> {t("{n} live", { n: live })}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label={t("Previous day")}
              onClick={() => setDay((d) => addDays(d, -1))}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-elevated text-ink-muted hover:text-ink"
            >
              <ChevronLeft size={16} className="dir-icon" />
            </button>
            <button
              type="button"
              onClick={() => setDay(new Date())}
              className="min-w-[200px] rounded-full bg-elevated px-4 py-2 text-[13px] font-semibold text-ink"
            >
              {isToday ? `${t("Today")} · ${dayLabel}` : dayLabel}
            </button>
            <button
              type="button"
              aria-label={t("Next day")}
              onClick={() => setDay((d) => addDays(d, 1))}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-elevated text-ink-muted hover:text-ink"
            >
              <ChevronRight size={16} className="dir-icon" />
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {["all", ...userLeagues].map((k) => {
            const def = LEAGUES.find((l) => l.key === k);
            const on = league === k;
            return (
              <button
                key={k}
                type="button"
                onClick={() => setLeague(k)}
                className={`rounded-full px-3.5 py-1.5 text-[12px] font-semibold transition-colors ${
                  on ? "bg-ink text-canvas" : "bg-elevated text-ink-muted hover:text-ink"
                }`}
              >
                {k === "all" || !def ? t("All") : getLeagueLabel(def)}
              </button>
            );
          })}
        </div>

        {loading && games.length === 0 ? (
          <p className="py-16 text-center text-[14px] text-ink-subtle">{t("Loading…")}</p>
        ) : games.length === 0 ? (
          <p className="py-16 text-center text-[14px] text-ink-subtle">
            {t("No games on this day for your leagues.")}
          </p>
        ) : (
          byLeague.map(([tag, list]) => {
            const def = leagueByTag.get(tag);
            return (
              <section key={tag} className="flex flex-col gap-3">
                <h2 className="text-[12px] font-bold uppercase tracking-[0.2em] text-ink-subtle">
                  {def ? getLeagueLabel(def) : tag}
                </h2>
                <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-3">
                  {list.map((g) => (
                    <div key={`${g.league}:${g.id}`} className="flex flex-col gap-1.5">
                      <SportsCard game={g} onSelect={openMatchDetail} />
                      {g.state !== "post" && (
                        <button
                          type="button"
                          onClick={() => setWatching(g)}
                          className="self-start rounded-full bg-elevated px-3 py-1 text-[11px] font-semibold text-ink-muted hover:text-ink"
                        >
                          {t("Find in my sources")}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            );
          })
        )}
        <p className="text-[11px] text-ink-subtle">
          {t(
            "Schedules and scores come from ESPN. Streams come only from sources you add yourself.",
          )}
        </p>
      </div>
      {watching && <WatchSourcesModal game={watching} onClose={() => setWatching(null)} />}
    </div>
  );
}
