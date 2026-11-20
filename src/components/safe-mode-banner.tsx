import { useEffect } from "react";
import { ShieldAlert, X } from "lucide-react";
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
  const btn =
    "rounded-full border border-amber-400/30 bg-amber-500/20 px-3 py-1 text-[12px] font-semibold text-amber-100 hover:bg-amber-500/30 transition-colors";
  return (
    <div className="fixed inset-x-4 top-3 z-[300] mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-500/35 bg-amber-950/85 px-4 py-2.5 text-[13px] font-medium text-amber-200 shadow-[0_12px_36px_rgba(0,0,0,0.6)] backdrop-blur-xl">
      <div className="flex items-center gap-2.5">
        <ShieldAlert size={18} className="shrink-0 text-amber-400" />
        <span>
          {t("Argus didn't start cleanly several times, so it is running in safe mode: background jobs are paused.")}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <button type="button" className={btn} onClick={() => void exportDiagnostics()}>
          {t("Export diagnostics")}
        </button>
        <button type="button" className={btn} onClick={() => openSettings()}>
          {t("Open settings")}
        </button>
        <button
          type="button"
          className="rounded-full bg-amber-500 px-3.5 py-1 text-[12px] font-bold text-black transition-colors hover:bg-amber-400"
          onClick={() => setSafeMode(false)}
        >
          {t("Leave safe mode")}
        </button>
        <button
          type="button"
          aria-label={t("Dismiss")}
          className="rounded-full p-1 text-amber-300/80 transition-colors hover:bg-amber-400/20 hover:text-white"
          onClick={() => setSafeMode(false)}
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
