import { Copy, Download, ExternalLink, ListVideo, MonitorDown } from "lucide-react";
import { useState } from "react";
import { useT } from "@/lib/i18n";
import type { PlayerSnapshot } from "@/lib/player/bridge";
import {
  detectVlcPlatform,
  isVlcPlayableUrl,
  m3uPlaylist,
  vlcOpenLink,
} from "@/lib/player/vlc-link";

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

function downloadM3u(url: string, title: string): void {
  const blob = new Blob([m3uPlaylist(url, title)], { type: "audio/x-mpegurl" });
  const href = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = href;
  a.download = "argus-stream.m3u";
  a.click();
  setTimeout(() => URL.revokeObjectURL(href), 1000);
}

const actionClass =
  "flex h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-edge-soft text-[14px] font-semibold text-ink-muted transition-colors hover:border-edge hover:text-ink";

export function WebErrorCard({
  code,
  url,
  title,
  onChoose,
}: {
  code: NonNullable<PlayerSnapshot["errorCode"]>;
  url: string;
  title: string;
  onChoose: () => void;
}) {
  const t = useT();
  const info = describe(code);
  const [copied, setCopied] = useState(false);
  const vlcLink = vlcOpenLink(url, detectVlcPlatform(navigator.userAgent));
  const copyLink = () => {
    void navigator.clipboard
      ?.writeText(url)
      .then(() => setCopied(true))
      .catch(() => {});
  };
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
        {isVlcPlayableUrl(url) && (
          <div className="flex w-full flex-col gap-2.5">
            <div className="flex w-full items-center gap-2.5">
              {vlcLink && (
                <a href={vlcLink} className={actionClass}>
                  <ExternalLink size={16} strokeWidth={2.2} />
                  {t("Open in VLC")}
                </a>
              )}
              <button type="button" onClick={copyLink} className={actionClass}>
                <Copy size={16} strokeWidth={2.2} />
                {copied ? t("Copied") : t("Copy link")}
              </button>
              <button type="button" onClick={() => downloadM3u(url, title)} className={actionClass}>
                <Download size={16} strokeWidth={2.2} />
                {t(".m3u")}
              </button>
            </div>
            <p className="text-[12px] leading-relaxed text-ink-subtle">
              {t("Open in VLC needs VLC installed. If nothing happens, copy the link into VLC's Open Network Stream.")}
            </p>
          </div>
        )}
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
