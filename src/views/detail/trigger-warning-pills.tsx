import { useEffect, useState } from "react";
import { TriangleAlert } from "lucide-react";
import { useSettings } from "@/lib/settings";
import { useT } from "@/lib/i18n";
import { fetchDtddWarnings, type DtddWarning } from "@/lib/dtdd";
import { Pill } from "./pill";

export function TriggerWarningPills({
  imdbId,
  title,
  year,
}: {
  imdbId: string | null | undefined;
  title: string;
  year?: number | null;
}) {
  const t = useT();
  const { settings } = useSettings();
  const [warnings, setWarnings] = useState<DtddWarning[]>([]);
  const [showSpoilers, setShowSpoilers] = useState(false);
  const key = settings.dtddKey.trim();
  const enabled = settings.dtddEnabled && key !== "";

  useEffect(() => {
    setWarnings([]);
    if (!enabled || !title) return;
    let cancelled = false;
    fetchDtddWarnings(key, { imdbId, title, year })
      .then((w) => {
        if (!cancelled) setWarnings(w);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [enabled, key, imdbId, title, year]);

  const visible = warnings.filter((w) => showSpoilers || !w.spoiler).slice(0, 8);
  const hiddenCount = warnings.length - warnings.filter((w) => !w.spoiler).length;
  if (visible.length === 0 && hiddenCount === 0) return null;
  return (
    <>
      {visible.map((w) => (
        <Pill key={w.name}>
          <TriangleAlert size={13} className="text-accent" />
          <span>{w.name}</span>
          <span className="text-[11px] font-semibold text-ink-subtle">{w.yes}</span>
        </Pill>
      ))}
      {hiddenCount > 0 && !showSpoilers && (
        <button type="button" onClick={() => setShowSpoilers(true)} className="text-[12px] font-semibold text-ink-subtle hover:text-ink">
          {t("Show {n} spoiler warnings", { n: hiddenCount })}
        </button>
      )}
    </>
  );
}
