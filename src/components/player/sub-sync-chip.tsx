import { AudioLines, Check, Loader2 } from "lucide-react";
import { useT } from "@/lib/i18n";
import { useSyncStatus } from "@/lib/subtitles/sync-status";

export function SubSyncChip({ chromeVisible }: { chromeVisible: boolean }) {
  const t = useT();
  const status = useSyncStatus();
  if (status !== "analyzing" && status !== "synced") return null;
  if (status === "synced" && !chromeVisible) return null;
  return (
    <div className="pointer-events-none absolute right-6 top-[3.25rem] z-30 flex items-center gap-1.5 rounded-full border border-edge-soft bg-canvas/85 px-3 py-1.5 text-[11px] font-semibold text-ink/85 backdrop-blur-md">
      {status === "analyzing" ? (
        <>
          <Loader2 size={12} className="animate-spin text-accent" />
          <span>{t("Syncing subtitles to speech")}</span>
        </>
      ) : (
        <>
          <Check size={12} strokeWidth={3} className="text-emerald-400" />
          <AudioLines size={12} className="text-ink-subtle" />
          <span>{t("Synced")}</span>
        </>
      )}
    </div>
  );
}
