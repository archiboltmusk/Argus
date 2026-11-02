import { Shuffle } from "lucide-react";
import { HoverTooltip } from "@/components/hover-tooltip";
import type { Meta } from "@/lib/cinemeta";
import type { Season } from "@/lib/providers/tmdb";
import { useSettings } from "@/lib/settings";
import { useView } from "@/lib/view";
import { useT } from "@/lib/i18n";

function pickRandomEpisode(
  seasons: Season[],
  watchedKeys?: Set<string>,
): { season: number; episode: number } | null {
  const today = new Date().toISOString().slice(0, 10);
  const real = seasons.filter((s) => s.seasonNumber >= 1 && s.episodeCount > 0);
  const aired = real.filter((s) => !s.airDate || s.airDate.slice(0, 10) <= today);
  const pool = aired.length > 0 ? aired : real;

  // Build candidate lists: unwatched first, with fallback to all aired
  const unwatchedCandidates: Array<{ season: number; episode: number }> = [];
  const allCandidates: Array<{ season: number; episode: number }> = [];

  for (const s of pool) {
    for (let e = 1; e <= s.episodeCount; e++) {
      const epRef = { season: s.seasonNumber, episode: e };
      allCandidates.push(epRef);
      const key = `${s.seasonNumber}:${e}`;
      if (!watchedKeys || !watchedKeys.has(key)) {
        unwatchedCandidates.push(epRef);
      }
    }
  }

  const candidatePool = unwatchedCandidates.length > 0 ? unwatchedCandidates : allCandidates;
  if (candidatePool.length === 0) return null;
  const pickedIndex = Math.floor(Math.random() * candidatePool.length);
  return candidatePool[pickedIndex] ?? null;
}

export function RandomEpisodeButton({
  meta,
  seasons,
  watchedKeys,
}: {
  meta: Meta;
  seasons: Season[];
  watchedKeys?: Set<string>;
}) {
  const t = useT();
  const { openPicker } = useView();
  const { settings } = useSettings();

  const onClick = (unwatchedOnly: boolean) => {
    const pick = pickRandomEpisode(seasons, unwatchedOnly ? watchedKeys : undefined);
    if (!pick) return;
    openPicker(meta, pick, { autoPlay: settings.instantPlay || settings.seasonSourceLock });
  };

  const hasWatchedData = watchedKeys && watchedKeys.size > 0;
  const tooltipLabel = hasWatchedData
    ? t("Play random unwatched episode (Shift-click for any)")
    : t("Play a random episode");

  return (
    <HoverTooltip label={tooltipLabel} align="center" className="shrink-0">
      <button
        type="button"
        onClick={(e) => onClick(!e.shiftKey)}
        aria-label={t("Play a random episode")}
        className="group relative flex h-9 w-9 items-center justify-center rounded-full text-ink-subtle transition-colors hover:bg-elevated hover:text-ink"
      >
        <Shuffle size={16} strokeWidth={2} />
        {hasWatchedData && (
          <span
            className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-accent ring-2 ring-canvas"
            title={t("Prioritizing unwatched episodes")}
          />
        )}
      </button>
    </HoverTooltip>
  );
}
