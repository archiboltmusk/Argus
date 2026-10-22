import { useEffect } from "react";
import { useSettings } from "@/lib/settings";
import { useT } from "@/lib/i18n";
import { useView } from "@/lib/view";
import { recordBoot, setSafeMode, useSafeMode } from "@/lib/self-heal";
import { exportDiagnostics } from "@/lib/diagnostics/export";

export function SafeModeBanner() {
  const t = useT();
  const { settings } = useSettings();
  const { openSettings } = useView();
  const safe = useSafeMode();
  const enabled = settings.selfHeal;

  useEffect(() => (enabled ? recordBoot() : undefined), [enabled]);

  if (!enabled || !safe) return null;
  const btn = "rounded-full bg-ink/10 px-3 py-1 text-[12px] font-semibold hover:bg-ink/20";
  return (
    <div className="fixed inset-x-0 top-0 z-[300] flex flex-wrap items-center justify-center gap-3 bg-amber-500/95 px-4 py-2 text-[13px] font-medium text-black">
      <span>
        {t("Argus didn't start cleanly several times, so it is running in safe mode: background jobs are paused.")}
      </span>
      <button type="button" className={btn} onClick={() => void exportDiagnostics()}>
        {t("Export diagnostics")}
      </button>
      <button type="button" className={btn} onClick={() => openSettings()}>
        {t("Open settings")}
      </button>
      <button type="button" className={btn} onClick={() => setSafeMode(false)}>
        {t("Leave safe mode")}
      </button>
    </div>
  );
}
