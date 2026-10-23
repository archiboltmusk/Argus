import { BookOpen, ChevronLeft, ChevronRight, Compass, Loader2, Sparkles, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { usePageVisible } from "@/lib/visibility";
import { useT } from "@/lib/i18n";
import { mangaBackdrop } from "@/lib/manga/backdrop";
import { topCharacterImage } from "@/lib/manga/character";
import { universeLogo } from "@/lib/manga/universe-logo";
import { searchMangaEverywhere } from "@/lib/manga/api";
import { mangaUpdatesFor, type MangaUpdatesInfo } from "@/lib/manga/mangaupdates";
import { MANGA_UNIVERSES, type MangaUniverse } from "@/lib/manga/universes";
import { MangaAdaptationCard, MangaRecommendedRail } from "./manga-extras";

const AMES = '"QR Ames Beta", var(--font-display), serif';
const NEUTRAL = "linear-gradient(135deg, oklch(0.3 0.02 260), oklch(0.21 0.02 260))";
const CYCLE_MS = 7000;
const MASK = "linear-gradient(to right, transparent, black 62%)";

function useBackdrop(name: string, baked?: string): string | null {
  const [url, setUrl] = useState<string | null>(baked ?? null);
  useEffect(() => {
    if (baked || !name) return;
    let cancelled = false;
    void mangaBackdrop(name).then((u) => {
      if (!cancelled) setUrl(u);
    });
    return () => {
      cancelled = true;
    };
  }, [name, baked]);
  return baked ?? url;
}

function useTopCharacter(name: string): string | null {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!name) return;
    let cancelled = false;
    void topCharacterImage(name).then((u) => {
      if (!cancelled) setUrl(u);
    });
    return () => {
      cancelled = true;
    };
  }, [name]);
  return url;
}

function useUniverseLogo(query: string, baked?: string): string | null {
  const [url, setUrl] = useState<string | null>(baked ?? null);
  useEffect(() => {
    if (baked || !query) return;
    let cancelled = false;
    void universeLogo(query).then((u) => {
      if (!cancelled) setUrl(u);
    });
    return () => {
      cancelled = true;
    };
  }, [query, baked]);
  return baked ?? url;
}

function BannerLayer({
  name,
  backdrop,
  active,
}: {
  name: string;
  backdrop?: string;
  active: boolean;
}) {
  const [seen, setSeen] = useState(active);
  useEffect(() => {
    if (active) setSeen(true);
  }, [active]);
  const banner = useBackdrop(seen ? name : "", backdrop);
  if (!banner) return null;
  return (
    <img
      src={banner}
      alt=""
      className={`pointer-events-none absolute inset-y-0 right-0 h-full w-3/5 object-cover transition-opacity duration-1000 ease-out ${
        active ? "opacity-100" : "opacity-0"
      }`}
      style={{ objectPosition: "center 22%", maskImage: MASK, WebkitMaskImage: MASK }}
    />
  );
}

function CharLayer({ name, active }: { name: string; active: boolean }) {
  const [seen, setSeen] = useState(active);
  useEffect(() => {
    if (active) setSeen(true);
  }, [active]);
  const img = useTopCharacter(seen ? name : "");
  if (!img) return null;
  return (
    <img
      src={img}
      alt=""
      className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-1000 ease-out ${
        active ? "opacity-100" : "opacity-0"
      }`}
      style={{ objectPosition: "center 12%" }}
    />
  );
}

export function UniversesCta({ onClick }: { onClick: () => void }) {
  const t = useT();
  const [i, setI] = useState(0);
  const pageVisible = usePageVisible();
  useEffect(() => {
    if (!pageVisible) return;
    const id = window.setInterval(() => setI((v) => (v + 1) % MANGA_UNIVERSES.length), CYCLE_MS);
    return () => window.clearInterval(id);
  }, [pageVisible]);
  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative flex min-h-[84px] items-center gap-4 overflow-hidden rounded-2xl border border-edge-soft bg-elevated/40 px-6 py-4 text-start transition-all duration-300 hover:bg-elevated/70 active:scale-[0.99]"
    >
      {MANGA_UNIVERSES.map((u, idx) => (
        <BannerLayer key={u.id} name={u.query} backdrop={u.backdrop} active={idx === i} />
      ))}
      <span className="relative grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-xl bg-elevated ring-1 ring-edge-soft">
        <Users size={20} className="text-ink-subtle" />
        {MANGA_UNIVERSES.map((u, idx) => (
          <CharLayer key={u.id} name={u.query} active={idx === i} />
        ))}
      </span>
      <div className="relative flex min-w-0 flex-1 flex-col">
        <span className="text-[15.5px] font-semibold text-ink">{t("Universes")}</span>
        <span className="truncate text-[13px] text-ink-muted">
          {t("One Piece, Naruto and more worlds")}
        </span>
      </div>
      <ChevronRight
        size={22}
        className="relative shrink-0 text-ink-subtle drop-shadow-[0_1px_3px_rgba(0,0,0,0.6)] transition-transform group-hover:translate-x-1"
      />
    </button>
  );
}

function UniverseCard({
  universe,
  onSelect,
  loading,
  disabled,
}: {
  universe: MangaUniverse;
  onSelect: () => void;
  loading: boolean;
  disabled: boolean;
}) {
  const art = useBackdrop(universe.query, universe.backdrop);
  const logo = useUniverseLogo(universe.noLogo ? "" : universe.query, universe.logo);
  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={disabled}
      aria-busy={loading}
      className="group relative aspect-[16/10] overflow-hidden rounded-2xl ring-1 ring-edge-soft transition-[box-shadow,opacity,transform] duration-200 [clip-path:inset(0_round_1rem)] hover:ring-edge active:scale-[0.96] disabled:cursor-wait disabled:opacity-70 motion-reduce:active:scale-100"
    >
      <div className="absolute inset-0" style={{ background: NEUTRAL }} />
      {art && (
        <img
          src={art}
          alt=""
          className="absolute inset-0 h-full w-full object-cover transition-[filter] duration-300 ease-out group-hover:brightness-110"
          style={{ objectPosition: "center 24%" }}
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-black/30" />
      {logo ? (
        <img
          src={logo}
          alt={universe.name}
          className="absolute left-1/2 top-1/2 max-h-[46%] w-[74%] -translate-x-1/2 -translate-y-1/2 object-contain drop-shadow-[0_3px_14px_rgba(0,0,0,0.85)]"
        />
      ) : (
        <span
          className="absolute inset-x-6 top-1/2 -translate-y-1/2 text-center text-[28px] font-semibold uppercase leading-[1.05] tracking-tight text-white drop-shadow-[0_3px_16px_rgba(0,0,0,0.9)]"
          style={{ fontFamily: AMES }}
        >
          {universe.name}
        </span>
      )}
      {loading && (
        <span className="absolute end-3 top-3 grid h-8 w-8 place-items-center rounded-full bg-black/55 text-white ring-1 ring-white/15 backdrop-blur-sm">
          <Loader2 size={15} className="animate-spin motion-reduce:animate-none" />
        </span>
      )}
    </button>
  );
}

function normTitle(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

type Candidate = { id: string; title: string; lastChapter?: string };

function pickBestMatch(results: Candidate[], query: string, name: string): Candidate | null {
  if (!results.length) return null;
  const keys = [normTitle(query), normTitle(name)].filter(Boolean);
  let best = results[0];
  let bestScore = -Infinity;
  for (const r of results) {
    const t = normTitle(r.title);
    let score = 0;
    if (keys.some((k) => t === k)) score += 100;
    else if (keys.some((k) => t.startsWith(k))) score += 55;
    else if (keys.some((k) => k.includes(t) || t.includes(k))) score += 25;
    score += Math.min(Number(r.lastChapter) || 0, 2000) / 100;
    score -= Math.min(...keys.map((k) => Math.abs(t.length - k.length))) / 25;
    if (score > bestScore) {
      bestScore = score;
      best = r;
    }
  }
  return best;
}

function UniverseHub({
  universe,
  onBack,
  onOpenManga,
}: {
  universe: MangaUniverse;
  onBack: () => void;
  onOpenManga: (mangaId: string) => void;
}) {
  const t = useT();
  const art = useBackdrop(universe.query, universe.backdrop);
  const logo = useUniverseLogo(universe.noLogo ? "" : universe.query, universe.logo);
  const [muInfo, setMuInfo] = useState<MangaUpdatesInfo | null>(null);
  const [openingTitle, setOpeningTitle] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setMuInfo(null);
    void mangaUpdatesFor(universe.query)
      .then((info) => {
        if (!cancelled) setMuInfo(info);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [universe.query]);

  const openByTitle = async (targetTitle: string, altQuery?: string) => {
    if (openingTitle) return;
    setOpeningTitle(targetTitle);
    try {
      const queries = altQuery && altQuery !== targetTitle ? [altQuery, targetTitle] : [targetTitle];
      let found: Candidate | null = null;
      for (const q of queries) {
        const results = await searchMangaEverywhere(q).catch(() => []);
        found = pickBestMatch(results, q, targetTitle);
        if (found) break;
      }
      onOpenManga(found ? found.id : `title:${encodeURIComponent(targetTitle)}`);
    } finally {
      setOpeningTitle(null);
    }
  };

  return (
    <div className="animate-fade-in flex flex-col gap-8">
      <div className="relative overflow-hidden rounded-3xl ring-1 ring-edge-soft">
        <div className="absolute inset-0" style={{ background: NEUTRAL }} />
        {art && (
          <img
            src={art}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
            style={{ objectPosition: "center 22%" }}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-canvas via-canvas/70 to-black/35" />
        <div className="relative z-10 flex min-h-[280px] flex-col justify-between p-8">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex w-fit items-center gap-1.5 rounded-xl bg-canvas/70 px-4 py-2 text-[14px] font-medium text-ink ring-1 ring-edge-soft backdrop-blur-md transition-all hover:bg-elevated active:scale-[0.97]"
          >
            <ChevronLeft size={18} strokeWidth={2.4} />
            {t("All Universes")}
          </button>

          <div className="mt-8 flex flex-col gap-4">
            {logo ? (
              <img
                src={logo}
                alt={universe.name}
                className="max-h-20 w-auto max-w-[300px] object-contain object-left drop-shadow-[0_4px_18px_rgba(0,0,0,0.85)]"
              />
            ) : (
              <h1
                className="text-[40px] font-semibold tracking-tight text-white drop-shadow-[0_3px_16px_rgba(0,0,0,0.9)]"
                style={{ fontFamily: AMES }}
              >
                {universe.name}
              </h1>
            )}
            {muInfo?.description && (
              <p className="line-clamp-3 max-w-2xl text-[14.5px] leading-relaxed text-ink-muted">
                {muInfo.description}
              </p>
            )}
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <button
                type="button"
                disabled={openingTitle !== null}
                onClick={() => void openByTitle(universe.name, universe.query)}
                className="inline-flex h-11 items-center gap-2 rounded-full bg-ink px-6 text-[14px] font-semibold text-canvas shadow-lg transition-transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60"
              >
                {openingTitle === universe.name ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <BookOpen size={17} />
                )}
                {t("Read {title}", { title: universe.name })}
              </button>
              {muInfo?.year && (
                <span className="rounded-full bg-elevated/70 px-3 py-1 text-[12.5px] text-ink-muted ring-1 ring-edge-soft backdrop-blur-sm">
                  {muInfo.year}
                </span>
              )}
              {muInfo?.latestChapter != null && (
                <span className="rounded-full bg-elevated/70 px-3 py-1 text-[12.5px] text-ink-muted ring-1 ring-edge-soft backdrop-blur-sm">
                  {t("Ch. {n}", { n: muInfo.latestChapter })}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      <MangaAdaptationCard title={universe.name} info={muInfo} heroBg={art} />

      {muInfo && muInfo.related.length > 0 && (
        <section className="flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <Compass size={16} className="text-accent" />
            <h2 className="text-[16px] font-semibold tracking-tight text-ink">
              {t("Spin-offs, Sequels & Side Stories in this Universe")}
            </h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {muInfo.related.map((rel) => {
              const busy = openingTitle === rel.title;
              return (
                <button
                  key={`${rel.id}-${rel.title}`}
                  type="button"
                  disabled={openingTitle !== null}
                  onClick={() => void openByTitle(rel.title)}
                  className="group flex items-center justify-between gap-3 rounded-2xl border border-edge-soft bg-elevated/35 px-4 py-3.5 text-start transition-all hover:border-edge hover:bg-elevated/70 active:scale-[0.99] disabled:opacity-60"
                >
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="truncate text-[14px] font-medium text-ink group-hover:text-accent">
                      {rel.title}
                    </span>
                    <span className="inline-flex items-center gap-1 text-[12px] text-ink-subtle">
                      <Sparkles size={11} className="text-accent/80" />
                      {rel.relation}
                    </span>
                  </div>
                  {busy ? (
                    <Loader2 size={15} className="shrink-0 animate-spin text-ink-subtle" />
                  ) : (
                    <ChevronRight
                      size={16}
                      className="shrink-0 text-ink-subtle transition-transform group-hover:translate-x-0.5"
                    />
                  )}
                </button>
              );
            })}
          </div>
        </section>
      )}

      <MangaRecommendedRail title={universe.name} onOpen={onOpenManga} />
    </div>
  );
}

export function MangaUniverses({
  onOpen,
  onBack,
}: {
  onOpen: (mangaId: string) => void;
  onBack: () => void;
}) {
  const t = useT();
  const [activeUniverse, setActiveUniverse] = useState<MangaUniverse | null>(null);

  if (activeUniverse) {
    return (
      <UniverseHub
        universe={activeUniverse}
        onBack={() => setActiveUniverse(null)}
        onOpenManga={onOpen}
      />
    );
  }

  return (
    <div className="animate-fade-in flex flex-col gap-6">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex w-fit items-center gap-1.5 rounded-xl bg-elevated px-4 py-2.5 text-[15px] font-medium text-ink shadow-[0_2px_8px_-2px_rgba(0,0,0,0.4)] ring-1 ring-edge-soft transition-all hover:bg-raised active:scale-[0.97]"
      >
        <ChevronLeft size={19} strokeWidth={2.4} />
        {t("Back")}
      </button>
      <div className="flex flex-col gap-1.5">
        <h1
          className="text-[34px] font-medium tracking-tight text-ink"
          style={{ fontFamily: AMES }}
        >
          {t("Universes")}
        </h1>
        <p className="text-[15px] text-ink-muted">
          {t("Pick a world and dive into everything in it.")}
        </p>
      </div>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        {MANGA_UNIVERSES.map((u) => (
          <UniverseCard
            key={u.id}
            universe={u}
            onSelect={() => setActiveUniverse(u)}
            loading={false}
            disabled={false}
          />
        ))}
      </div>
    </div>
  );
}
