import { Sparkles } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { ANIME4K_MODES } from "@/lib/player/anime4k-modes";
import type { Anime4kChoice } from "@/views/player/hooks/use-anime4k";
import { useT } from "@/lib/i18n";
import { useMenuSide } from "../menu-side";
import { Tooltip } from "./tooltip";
import { watchOutsideMouseDown } from "@/lib/player/overlay-dismiss";

const OPTIONS: Array<{ id: Anime4kChoice; label: string }> = [
  { id: "auto", label: "Auto" },
  { id: "off", label: "Off" },
  ...ANIME4K_MODES.map((m) => ({ id: m.id as Anime4kChoice, label: m.label })),
];

export function Anime4kMenu({
  mode,
  onMode,
  onOpenChange,
  iconUrl,
}: {
  mode: Anime4kChoice;
  onMode: (m: Anime4kChoice) => void;
  onOpenChange?: (open: boolean) => void;
  iconUrl?: string;
}) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const { measure } = useMenuSide(wrap, 320);
  useEffect(() => {
    onOpenChange?.(open);
  }, [open, onOpenChange]);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (!wrap.current?.contains(e.target as Node)) setOpen(false);
    };
    return watchOutsideMouseDown(close);
  }, [open]);
  const active = mode !== "auto" && mode !== "off";
  const accent = open || active;
  const current = OPTIONS.find((o) => o.id === mode);
  const sub = ANIME4K_MODES.find((m) => m.id === mode)?.sub;
  return (
    <div ref={wrap} className="relative">
      <Tooltip label={t("Anime4K upscaling")}>
        <button
          onClick={() => {
            if (!open) measure();
            setOpen((o) => !o);
          }}
          aria-label={t("Anime4K upscaling")}
          className={`flex h-11 min-w-11 items-center justify-center gap-1 rounded-full px-2 transition-[background-color,color] ${
            accent ? "bg-white/22 text-white hover:bg-white/30" : "text-white/85 hover:bg-white/10 hover:text-white"
          }`}
        >
          {iconUrl ? (
            <img src={iconUrl} alt="" className="h-[22px] w-[22px] shrink-0 select-none object-contain" draggable={false} />
          ) : (
            <Sparkles size={20} strokeWidth={1.9} />
          )}
          {active && current ? (
            <span className="text-[11px] font-bold tracking-wider">{current.label.replace("Mode ", "")}</span>
          ) : null}
        </button>
      </Tooltip>
      {open && (
        <div className="fixed end-14 bottom-[150px] max-h-[calc(100vh-174px)] w-[320px] max-w-[calc(100vw-72px)] overflow-y-auto apple-liquid-glass animate-menu-pop z-50 text-white">
          <div className="p-3">
            <div className="px-2 pt-1 text-[11px] font-bold uppercase tracking-[0.18em] text-white/60">
              {t("Anime4K")}
            </div>
            <div className="px-2 pb-2 pt-0.5 text-[11px] leading-snug text-white/60">
              {sub ? t(sub) : t("Real-time anime upscaling. GPU-intensive.")}
            </div>
            <div className="flex flex-col gap-1">
              {OPTIONS.map((o) => {
                const sel = o.id === mode;
                return (
                  <button
                    key={o.id}
                    onClick={() => {
                      onMode(o.id);
                      setOpen(false);
                    }}
                    className={`flex h-9 w-full items-center justify-between rounded-xl px-3 text-start text-[13.5px] transition-all ${
                      sel ? "bg-white/20 text-white font-semibold ring-1 ring-white/25 shadow-xs" : "text-white/80 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    <span className={sel ? "font-semibold text-white" : ""}>{t(o.label)}</span>
                    {o.id === "auto" && (
                      <span className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-white/50">
                        {t("default")}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
