import { useEffect, useState } from "react";
import type { Meta } from "@/lib/cinemeta";
import { useSettings } from "@/lib/settings";
import { buildCinemetaRows, buildTmdbRows } from "@/views/home/home-rows";
import { rankNextUpCandidates, getCurrentDaypart } from "@/lib/algo/session-transition";
import { ReelsFeed } from "@/views/feed/reels-feed";
import { MobileDetail } from "./mobile-detail";
import { ArgusLoader } from "@/components/argus-loader";

export function MobileReels() {
  const { settings } = useSettings();
  const [candidates, setCandidates] = useState<Meta[]>([]);
  const [loading, setLoading] = useState(true);
  const [detailMeta, setDetailMeta] = useState<Meta | null>(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);

    (async () => {
      try {
        const built = settings.tmdbKey ? await buildTmdbRows(settings) : await buildCinemetaRows();
        if (!alive) return;
        const all = [...built.hero, ...built.rows.flatMap((r) => r.metas)];
        const deduped: Meta[] = [];
        const seen = new Set<string>();
        for (const m of all) {
          if (!seen.has(m.id) && (m.background || m.poster)) {
            seen.add(m.id);
            deduped.push(m);
          }
        }

        // Apply YouTube-style session & daypart ranking
        const ranked = rankNextUpCandidates(deduped, {
          timeOfDay: getCurrentDaypart(),
        });

        setCandidates(ranked);
      } catch {
        // Fallback
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [settings]);

  if (loading) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-black">
        <ArgusLoader />
      </div>
    );
  }

  return (
    <div className="relative h-full w-full bg-black">
      <ReelsFeed items={candidates} onSelectMeta={setDetailMeta} />
      {detailMeta && <MobileDetail meta={detailMeta} onClose={() => setDetailMeta(null)} />}
    </div>
  );
}
