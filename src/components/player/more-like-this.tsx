import { X } from "lucide-react";
import { useEffect, useState } from "react";
import type { Meta } from "@/lib/cinemeta";
import { useT } from "@/lib/i18n";
import { getPlaybackPosition } from "@/lib/player/playback-clock";
import { tmdbDetails } from "@/lib/providers/tmdb/tmdb-details";
import { useSettings } from "@/lib/settings";

const MAX_CARDS = 4;

// End-of-title recommendations. Shows in the last `lead` seconds of a movie or
// the last episode of a series, never when another episode is queued.
export function MoreLikeThis({
  meta,
  durationSec,
  hasNext,
  onPick,
}: {
  meta: Meta;
  durationSec: number;
  hasNext: boolean;
  onPick: (m: Meta) => void;
}) {
  const t = useT();
  const { settings } = useSettings();
  const enabled = settings.moreLikeThisEndScreen && !hasNext && durationSec > 0;
  const lead = settings.moreLikeThisLeadSec;
  const [near, setNear] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [recs, setRecs] = useState<Meta[]>([]);

  useEffect(() => {
    setDismissed(false);
    setNear(false);
    setRecs([]);
  }, [meta.id, durationSec]);

  useEffect(() => {
    if (!enabled) return;
    const id = window.setInterval(() => {
      const remaining = durationSec - getPlaybackPosition();
      setNear(remaining > 0 && remaining <= lead);
    }, 1000);
    return () => window.clearInterval(id);
  }, [enabled, durationSec, lead]);

  useEffect(() => {
    if (!enabled || !near || recs.length > 0 || !settings.tmdbKey) return;
    let live = true;
    void tmdbDetails(settings.tmdbKey, meta)
      .then((d) => {
        if (!live || !d) return;
        const seen = new Set([meta.id]);
        const picks = [...d.recommendations, ...d.similar]
          .filter((m) => m.poster && !seen.has(m.id) && seen.add(m.id))
          .slice(0, MAX_CARDS);
        setRecs(picks);
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [enabled, near, recs.length, settings.tmdbKey, meta]);

  if (!enabled || !near || dismissed || recs.length === 0) return null;
  return (
    <div className="animate-fade-in absolute bottom-24 end-6 z-30 w-[min(92vw,520px)] rounded-2xl border border-edge-soft bg-elevated/90 p-4 shadow-[0_30px_90px_-25px_rgba(0,0,0,0.7)] backdrop-blur-md">
      <div className="mb-3 flex items-center justify-between">
        <div className="text-[12px] font-semibold uppercase tracking-[0.16em] text-ink-subtle">
          {t("More like this")}
        </div>
        <button
          type="button"
          aria-label={t("Dismiss")}
          onClick={() => setDismissed(true)}
          className="text-ink-subtle transition-colors hover:text-ink"
        >
          <X size={16} />
        </button>
      </div>
      <div className="grid grid-cols-4 gap-3">
        {recs.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => onPick(m)}
            className="group flex flex-col gap-1.5 text-start"
          >
            <img
              src={m.poster}
              alt=""
              className="aspect-[2/3] w-full rounded-lg object-cover ring-1 ring-edge-soft transition-transform group-hover:scale-[1.03]"
            />
            <span className="line-clamp-2 text-[11.5px] leading-tight text-ink-muted group-hover:text-ink">
              {m.name}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
