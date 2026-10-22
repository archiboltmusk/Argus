import { ListVideo, MonitorDown } from "lucide-react";
import { useT } from "@/lib/i18n";
import type { PlayerSnapshot } from "@/lib/player/bridge";

function describe(code: NonNullable<PlayerSnapshot["errorCode"]>): { title: string; detail: string } {
  if (code === "codec" || code === "decode")
    return {
      title: "Your browser can't play this format",
      detail:
        "Browsers handle MP4 (H.264/AAC), WebM and HLS. HEVC, AC3/DTS audio and some MKV files need the Argus desktop app, or pick a different source.",
    };
  if (code === "network")
    return {
      title: "Your browser couldn't load this source",
      detail:
        "The server blocked the request (CORS), the link expired, or it is plain http on an https page. The desktop app doesn't have these limits.",
    };
  return {
    title: "Playback failed",
    detail: "The browser couldn't start this source. Pick a different one, or use the desktop app.",
  };
}

export function WebErrorCard({
  code,
  onChoose,
}: {
  code: NonNullable<PlayerSnapshot["errorCode"]>;
  onChoose: () => void;
}) {
  const t = useT();
  const info = describe(code);
  return (
    <div className="animate-fade-in absolute inset-0 z-[90] flex items-center justify-center bg-canvas/85 p-6 backdrop-blur-md">
      <div className="animate-modal-in flex w-[min(94vw,440px)] flex-col items-center gap-5 rounded-2xl border border-edge-soft bg-elevated/95 px-7 py-8 text-center shadow-[0_30px_90px_-25px_rgba(0,0,0,0.7)]">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-rose-500/12 text-rose-300">
          <MonitorDown size={26} strokeWidth={2} />
        </div>
        <div className="flex flex-col gap-2">
          <h2 className="font-display text-[20px] font-medium text-ink">{t(info.title)}</h2>
          <p className="text-[13.5px] leading-relaxed text-ink-muted">{t(info.detail)}</p>
        </div>
        <button
          type="button"
          onClick={onChoose}
          className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-accent text-[14px] font-semibold text-canvas transition-opacity hover:opacity-90"
        >
          <ListVideo size={17} strokeWidth={2.2} />
          {t("Choose another source")}
        </button>
      </div>
    </div>
  );
}
