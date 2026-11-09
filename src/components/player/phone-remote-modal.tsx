import { useEffect, useMemo, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Check, Copy, Smartphone, X } from "lucide-react";
import { buildHandoffQr, QR_DARK, QR_LIGHT } from "@/lib/tv-handoff/handoff-qr";
import { useSettings } from "@/lib/settings";
import { useT } from "@/lib/i18n";
import { copyText } from "./copy-link-button";

const WEB_PORT = 11471;

function Qr({ url }: { url: string }) {
  const qr = useMemo(() => buildHandoffQr(url), [url]);
  if (!qr) return null;
  return (
    <svg
      viewBox={qr.viewBox}
      className="h-44 w-44 rounded-xl bg-white p-2.5 shadow-lg"
      shapeRendering="crispEdges"
      aria-label="QR Code"
    >
      <rect width={qr.extent} height={qr.extent} fill={QR_LIGHT} />
      <path d={qr.path} fill={QR_DARK} />
    </svg>
  );
}

export function PhoneRemoteModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const t = useT();
  const { settings, update } = useSettings();
  const [lanIp, setLanIp] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (!settings.serveWebUi || !settings.remoteControlEnabled) {
      update({ serveWebUi: true, remoteControlEnabled: true });
    }
    invoke<string | null>("lan_ip")
      .then((ip) => setLanIp(ip ?? "127.0.0.1"))
      .catch(() => setLanIp("127.0.0.1"));
  }, [open, settings.serveWebUi, settings.remoteControlEnabled, update]);

  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  if (!open) return null;

  const remoteUrl = lanIp ? `http://${lanIp}:${WEB_PORT}/remote` : `http://127.0.0.1:${WEB_PORT}/remote`;

  const handleCopy = () => {
    void copyText(remoteUrl).then((ok) => {
      if (ok) {
        setCopied(true);
        window.setTimeout(() => setCopied(false), 2000);
      }
    });
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="phone-remote-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative flex w-full max-w-sm flex-col items-center gap-4 rounded-2xl border border-white/10 bg-slate-900/95 p-6 text-center text-white shadow-2xl backdrop-blur-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          aria-label={t("Close")}
          className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full text-white/60 transition-colors hover:bg-white/10 hover:text-white"
        >
          <X size={16} />
        </button>

        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-white">
          <Smartphone size={24} />
        </div>

        <div className="flex flex-col gap-1">
          <h2 id="phone-remote-title" className="text-lg font-semibold tracking-tight text-white">
            {t("Phone Remote")}
          </h2>
          <p className="text-xs text-white/60 leading-relaxed max-w-[280px]">
            {t("Scan with your phone camera to control playback, timeline scrub, and volume.")}
          </p>
        </div>

        <div className="my-1 rounded-2xl bg-white p-2">
          <Qr url={remoteUrl} />
        </div>

        <div className="flex w-full items-center gap-2 rounded-xl bg-black/40 px-3 py-2 border border-white/10">
          <span className="min-w-0 flex-1 truncate font-mono text-xs text-white/70 select-all">
            {remoteUrl}
          </span>
          <button
            type="button"
            onClick={handleCopy}
            className="flex items-center gap-1 rounded-lg bg-white/10 px-2.5 py-1 text-xs font-medium text-white transition-colors hover:bg-white/20 active:scale-95"
          >
            {copied ? (
              <>
                <Check size={12} className="text-emerald-400" />
                <span className="text-emerald-400">{t("Copied")}</span>
              </>
            ) : (
              <>
                <Copy size={12} />
                <span>{t("Copy")}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
