import { ExternalLink } from "lucide-react";
import { useT } from "@/lib/i18n";
import { useSettings } from "@/lib/settings";
import { invoke } from "@tauri-apps/api/core";

const LABEL = { iina: "IINA", vlc: "VLC", mpv: "mpv" } as const;

export function ExternalPlayerButton({
  url,
  size = 13,
  className = "",
}: {
  url: string;
  size?: number;
  className?: string;
}) {
  const t = useT();
  const { settings } = useSettings();
  const player = settings.externalPlayer;
  if (player === "off" || !/^https?:\/\//i.test(url) || !("__TAURI_INTERNALS__" in window)) {
    return null;
  }
  const label = `${t("Open in")} ${LABEL[player]}`;
  const open = () => void invoke("open_in_external_player", { player, url }).catch(() => {});
  return (
    <span
      role="button"
      tabIndex={0}
      title={label}
      aria-label={label}
      onClick={(e) => {
        e.stopPropagation();
        open();
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          e.stopPropagation();
          open();
        }
      }}
      className={`inline-flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-full text-ink-subtle transition-colors hover:bg-raised hover:text-ink ${className}`}
    >
      <ExternalLink size={size} />
    </span>
  );
}
