import { memo, useMemo, useState } from "react";
import { Play, X } from "lucide-react";
import { Row } from "@/components/row";
import { useT } from "@/lib/i18n";
import type { NewEpisode } from "@/lib/new-episodes";
import { useView } from "@/lib/view";

type Props = {
  episodes: NewEpisode[];
  onDismissOne: (key: string) => void;
  onDismissAll: () => void;
};

const PALETTES = [
  {
    bg: "from-blue-950 via-slate-900 to-black",
    accent: "text-blue-400",
    border: "border-blue-500/20",
  },
  {
    bg: "from-indigo-950 via-purple-950/60 to-black",
    accent: "text-indigo-400",
    border: "border-indigo-500/20",
  },
  {
    bg: "from-emerald-950 via-slate-900 to-black",
    accent: "text-emerald-400",
    border: "border-emerald-500/20",
  },
  {
    bg: "from-rose-950 via-slate-900 to-black",
    accent: "text-rose-400",
    border: "border-rose-500/20",
  },
  {
    bg: "from-amber-950/80 via-neutral-900 to-black",
    accent: "text-amber-400",
    border: "border-amber-500/20",
  },
  {
    bg: "from-cyan-950 via-slate-900 to-black",
    accent: "text-cyan-400",
    border: "border-cyan-500/20",
  },
];

function getPalette(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash << 5) - hash + name.charCodeAt(i);
  return PALETTES[Math.abs(hash) % PALETTES.length];
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

const EpisodeCard = memo(function EpisodeCard({
  ep,
  onDismiss,
}: {
  ep: NewEpisode;
  onDismiss: (key: string) => void;
}) {
  const t = useT();
  const { openMeta } = useView();

  const candidates = useMemo(() => {
    return [ep.still, ep.background, ep.poster].filter(
      (u): u is string => typeof u === "string" && u.trim().length > 0,
    );
  }, [ep.still, ep.background, ep.poster]);

  const [srcIndex, setSrcIndex] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const palette = useMemo(() => getPalette(ep.seriesName), [ep.seriesName]);

  const currentSrc = candidates[srcIndex];
  const hasValidImage = !!currentSrc && srcIndex < candidates.length;

  return (
    <div className="group relative shrink-0">
      <button
        type="button"
        onClick={() =>
          openMeta(
            { id: ep.seriesId, type: "series", name: ep.seriesName, poster: ep.poster ?? undefined },
            { episodeHint: { season: ep.season, episode: ep.episode } },
          )
        }
        className="block w-full overflow-hidden rounded-xl border border-white/[0.08] bg-elevated text-start shadow-md outline-none transition-all duration-200 group-hover:scale-[1.02] group-hover:border-white/20 group-hover:shadow-[0_12px_28px_rgba(0,0,0,0.6)] motion-reduce:group-hover:scale-100"
      >
        <span className={`relative block aspect-video w-full overflow-hidden bg-gradient-to-br ${palette.bg}`}>
          {/* Procedural Art Fallback (always beneath, shines through if no image or while loading) */}
          <span className="absolute inset-0 flex flex-col items-center justify-center p-4">
            <span className="relative flex h-12 w-12 items-center justify-center rounded-full border border-white/15 bg-white/10 text-white/90 shadow-inner backdrop-blur-md transition-all duration-200 group-hover:scale-110 group-hover:bg-accent group-hover:text-canvas">
              <Play size={18} className="translate-x-0.5 fill-current" />
            </span>
            <span className="mt-2 text-center text-[11px] font-semibold tracking-wider text-white/50 uppercase">
              {getInitials(ep.seriesName)}
            </span>
          </span>

          {/* Actual Still / Backdrop / Poster with graceful fallback cascade */}
          {hasValidImage ? (
            <img
              key={currentSrc}
              src={currentSrc}
              alt=""
              draggable={false}
              loading="lazy"
              onLoad={() => setLoaded(true)}
              onError={() => {
                setLoaded(false);
                setSrcIndex((i) => i + 1);
              }}
              className={`absolute inset-0 h-full w-full select-none object-cover transition-opacity duration-300 ${
                loaded ? "opacity-100" : "opacity-0"
              }`}
            />
          ) : null}

          {/* Season & Episode Top Badge */}
          <span className="absolute end-2.5 top-2.5 z-10 rounded-md border border-white/10 bg-black/70 px-2 py-0.5 text-[11px] font-semibold text-white/90 backdrop-blur-md">
            S{ep.season} · E{ep.episode}
          </span>

          {/* Cinematic Vignette Overlay */}
          <span className="pointer-events-none absolute inset-x-0 bottom-0 h-3/4 bg-gradient-to-t from-black/95 via-black/55 to-transparent" />

          {/* Text Labels */}
          <span className="absolute inset-x-0 bottom-0 z-10 flex flex-col gap-0.5 p-3">
            <span className="truncate text-[13.5px] font-bold leading-tight text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
              {ep.seriesName}
            </span>
            <span className="truncate text-[12px] font-medium leading-tight text-white/75 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
              {ep.title ? ep.title : `Episode ${ep.episode}`}
            </span>
          </span>
        </span>
      </button>

      {/* Dismiss Button */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onDismiss(ep.key);
        }}
        aria-label={t("Dismiss")}
        className="absolute start-2.5 top-2.5 z-20 grid h-7 w-7 place-items-center rounded-full border border-white/15 bg-black/70 text-white/80 opacity-0 backdrop-blur-md transition-all duration-150 ease-in-out hover:border-red-500/50 hover:bg-red-500/90 hover:text-white focus-visible:opacity-100 group-hover:opacity-100"
      >
        <X size={14} strokeWidth={2.4} />
      </button>
    </div>
  );
});

export function NewEpisodesSection({ episodes, onDismissOne, onDismissAll }: Props) {
  const t = useT();
  if (episodes.length === 0) return null;

  const dismissAll = (
    <button
      type="button"
      onClick={onDismissAll}
      className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[12.5px] font-medium text-ink-subtle backdrop-blur-sm transition-colors hover:bg-raised hover:text-ink"
    >
      {t("Dismiss all")}
      <X size={13} strokeWidth={2.2} />
    </button>
  );

  const title = (
    <span className="flex items-center gap-2.5">
      <span className="grid h-6 min-w-6 place-items-center rounded-full bg-accent px-1.5 text-[12px] font-bold tabular-nums text-canvas shadow-sm">
        {episodes.length}
      </span>
      <span className="font-semibold text-ink">{t("New Episodes")}</span>
    </span>
  );

  return (
    <Row
      title={title}
      min={260}
      shape="landscape"
      scrollKey="home:new-episodes"
      headerRight={dismissAll}
    >
      {episodes.map((ep) => (
        <EpisodeCard key={ep.key} ep={ep} onDismiss={onDismissOne} />
      ))}
    </Row>
  );
}