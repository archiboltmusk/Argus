import { Languages, X } from "lucide-react";
import { UiIcon } from "@/components/ui-icon";
import type { TrackInfo } from "@/lib/player/bridge";
import { useT } from "@/lib/i18n";
import { useSettings } from "@/lib/settings";
import { useAutoSyncHandle } from "@/components/player/autosync/autosync-store";
import { HoverTooltip } from "@/components/hover-tooltip";
import { SubtitleFpsControl } from "./subtitle-fps-control";
import { SyncControl } from "./sync-control";

type Props = {
  engine: "html5" | "mpv";
  count: number;
  selectedTrack: TrackInfo | null;
  hasSecondary: boolean;
  delaySec: number;
  delayNonZero: boolean;
  onEnterSync?: () => void;
  onOpenStyleBar?: () => void;
  onClose: () => void;
};

export function MenuHeader(p: Props) {
  const tr = useT();
  const { settings, update } = useSettings();
  const autoSync = useAutoSyncHandle();
  const dualOn = settings.dualSubtitlesEnabled === true;

  const autoSyncOn =
    autoSync?.status === "analyzing" ||
    autoSync?.status === "synced" ||
    autoSync?.status === "best-effort";
  const canAutoSync = p.selectedTrack?.external === true || autoSyncOn;

  return (
    <header className="flex items-center justify-between border-b border-edge-soft pe-4 ps-10 py-2.5">
      <div className="flex items-baseline gap-2.5">
        <span className="text-[13.5px] font-semibold text-ink">{tr("Subtitles")}</span>
        {p.count > 0 && (
          <span className="text-[11.5px] tabular-nums text-ink-subtle">{p.count}</span>
        )}
      </div>

      <div className="flex items-center gap-1">
        <SyncControl
          canAutoSync={canAutoSync}
          canLiveSync={p.selectedTrack != null}
          delaySec={p.delaySec}
          delayNonZero={p.delayNonZero}
          onLiveSync={p.onEnterSync}
          onClose={p.onClose}
        />
        <SubtitleFpsControl
          engine={p.engine}
          track={p.selectedTrack}
          hasSecondary={p.hasSecondary}
        />

        <HoverTooltip label={tr("Dual subtitles")} side="bottom" align="end">
          <button
            type="button"
            onClick={() => update({ dualSubtitlesEnabled: !dualOn })}
            aria-label={tr("Dual subtitles")}
            aria-pressed={dualOn}
            className={`flex h-9 w-9 items-center justify-center rounded-full transition-colors hover:bg-raised ${
              dualOn ? "bg-raised text-ink" : "text-ink-muted hover:text-ink"
            }`}
          >
            <Languages size={17} strokeWidth={2} />
          </button>
        </HoverTooltip>

        {p.onOpenStyleBar && (
          <HoverTooltip label={tr("Subtitle appearance")} side="bottom" align="end">
            <button
              type="button"
              onClick={() => {
                p.onOpenStyleBar?.();
                p.onClose();
              }}
              aria-label={tr("Subtitle appearance")}
              className="flex h-9 w-9 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-raised hover:text-ink"
            >
              <UiIcon name="customize-subtitles" className="h-[18px] w-[18px]" />
            </button>
          </HoverTooltip>
        )}

        <button
          onClick={p.onClose}
          aria-label={tr("Close")}
          className="flex h-9 w-9 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-raised hover:text-ink"
        >
          <X size={16} strokeWidth={2.2} />
        </button>
      </div>
    </header>
  );
}
