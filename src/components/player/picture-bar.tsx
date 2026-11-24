import { RotateCcw, X } from "lucide-react";
import { useEffect } from "react";
import { useSettings } from "@/lib/settings";
import { useT } from "@/lib/i18n";
import { PICTURE_DIALS, closePictureBar, usePictureBarOpen } from "@/lib/player/picture-bar";

const IDLE_MS = 12000;

export function PictureBar() {
  const t = useT();
  const open = usePictureBarOpen();
  const { settings, update } = useSettings();
  const tweaks = settings.mpvTweaks ?? {};

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closePictureBar();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    let timer = window.setTimeout(closePictureBar, IDLE_MS);
    const bump = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(closePictureBar, IDLE_MS);
    };
    window.addEventListener("pointermove", bump);
    window.addEventListener("pointerdown", bump);
    window.addEventListener("keydown", bump);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("pointermove", bump);
      window.removeEventListener("pointerdown", bump);
      window.removeEventListener("keydown", bump);
    };
  }, [open]);

  if (!open) return null;

  const valueOf = (key: string): number => {
    const raw = tweaks[key];
    const n = raw != null && raw !== "" ? parseFloat(raw) : 0;
    return Number.isFinite(n) ? n : 0;
  };

  const setValue = (key: string, n: number) => {
    const next = { ...tweaks };
    if (n === 0) delete next[key];
    else next[key] = String(n);
    update({ mpvTweaks: next });
  };

  const resetAll = () => {
    const next = { ...tweaks };
    for (const d of PICTURE_DIALS) delete next[d.key];
    update({ mpvTweaks: next });
  };

  const anyActive = PICTURE_DIALS.some((d) => valueOf(d.key) !== 0);

  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-30 flex justify-center px-7 pt-[68px] animate-in fade-in slide-in-from-top-2 duration-200">
      <div
        role="toolbar"
        aria-label={t("Picture adjustments")}
        className="pointer-events-auto flex max-w-[calc(100vw-56px)] flex-wrap items-center justify-center gap-4 apple-liquid-glass px-5 py-3.5 text-white"
      >
        {PICTURE_DIALS.map((dial) => {
          const value = valueOf(dial.key);
          return (
            <label key={dial.key} className="flex min-w-[168px] flex-col gap-1.5">
              <span className="flex items-baseline justify-between gap-3">
                <span className="text-[12.5px] font-semibold text-white/90">{t(dial.label)}</span>
                <span className="tabular-nums font-mono text-[12px] text-white/60">{value}</span>
              </span>
              <input
                type="range"
                min={dial.min}
                max={dial.max}
                step={1}
                value={value}
                onChange={(e) => setValue(dial.key, Number(e.target.value))}
                onDoubleClick={() => setValue(dial.key, 0)}
                className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-white/20 accent-white"
              />
            </label>
          );
        })}

        <div className="flex items-center gap-2 border-s border-white/12 ps-3">
          <button
            type="button"
            onClick={() => update({ ambientGlow: !settings.ambientGlow })}
            title={t("Ambient Edge Glow")}
            aria-label={t("Ambient Edge Glow")}
            className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-semibold transition-all ${
              settings.ambientGlow
                ? "bg-white text-black font-bold shadow-xs"
                : "bg-white/10 text-white/70 hover:bg-white/18 hover:text-white border border-white/8"
            }`}
          >
            <span>✨</span>
            {t("Ambilight")}
          </button>
          <button
            type="button"
            onClick={resetAll}
            disabled={!anyActive}
            title={t("Reset picture")}
            aria-label={t("Reset picture")}
            className="grid h-8 w-8 place-items-center rounded-full text-white/70 transition-colors hover:bg-white/15 hover:text-white disabled:cursor-default disabled:opacity-35"
          >
            <RotateCcw size={15} strokeWidth={2.2} />
          </button>
          <button
            type="button"
            onClick={closePictureBar}
            title={t("Close")}
            aria-label={t("Close")}
            className="grid h-8 w-8 place-items-center rounded-full text-white/70 transition-colors hover:bg-white/15 hover:text-white"
          >
            <X size={15} strokeWidth={2.2} />
          </button>
        </div>
      </div>
    </div>
  );
}
