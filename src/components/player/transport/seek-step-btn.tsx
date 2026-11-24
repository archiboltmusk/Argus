import { ChevronDown } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useT } from "@/lib/i18n";
import { publicAssetUrl } from "@/lib/public-url";
import { SEEK_STEP_OPTIONS, sanitizeSeekStep } from "@/lib/seek-step";
const DEFAULT_SHORT_SEC = 3;
const CURATED_SEEK = [5, 10, 30];
import { useSettings } from "@/lib/settings";
import { Tooltip } from "./tooltip";

export function SeekStepBtn({
  direction,
  seconds: defaultSeconds,
  onSeekStep,
}: {
  direction: "back" | "forward";
  seconds: number;
  onSeekStep: (delta: number) => void;
}) {
  const t = useT();
  const { settings, update } = useSettings();
  const word = direction === "back" ? t("Back") : t("Forward");
  const seconds = sanitizeSeekStep(
    direction === "back" ? settings.seekBackStepSec : settings.seekForwardStepSec,
    defaultSeconds,
  );
  const shortSeconds = sanitizeSeekStep(
    direction === "back" ? settings.seekBackStepShortSec : settings.seekForwardStepShortSec,
    DEFAULT_SHORT_SEC,
  );
  const numberedSrc = publicAssetUrl(`/player-icons/seek-${direction}-${seconds}.png`);
  const [numberedOk, setNumberedOk] = useState(true);
  useEffect(() => setNumberedOk(true), [numberedSrc]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  useEffect(() => {
    if (!pickerOpen) setExpanded(false);
  }, [pickerOpen]);
  const curatedFor = (v: number) => [...new Set([...CURATED_SEEK, v])].sort((a, b) => a - b);
  const wrapRef = useRef<HTMLDivElement>(null);
  const holdTimerRef = useRef<number | null>(null);
  const claimedRef = useRef(false);
  const iconRef = useRef<HTMLImageElement>(null);

  const playNudge = () => {
    const el = iconRef.current;
    if (!el) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const deg = direction === "back" ? -40 : 40;
    el.animate(
      [
        { transform: "rotate(0deg)" },
        { transform: `rotate(${deg}deg)`, offset: 0.4 },
        { transform: "rotate(0deg)" },
      ],
      { duration: 460, easing: "cubic-bezier(0.34, 1.56, 0.64, 1)" },
    );
  };

  useEffect(() => {
    if (!pickerOpen) return;
    const onDoc = (e: PointerEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setPickerOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPickerOpen(false);
    };
    window.addEventListener("pointerdown", onDoc);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointerdown", onDoc);
      window.removeEventListener("keydown", onKey);
    };
  }, [pickerOpen]);

  const cancelTimer = () => {
    if (holdTimerRef.current != null) {
      window.clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    if (pickerOpen) return;
    claimedRef.current = false;
    cancelTimer();
    holdTimerRef.current = window.setTimeout(() => {
      holdTimerRef.current = null;
      claimedRef.current = true;
      setPickerOpen(true);
    }, 380);
  };

  const onPointerUp = () => {
    if (claimedRef.current) {
      claimedRef.current = false;
      return;
    }
    if (holdTimerRef.current != null) {
      cancelTimer();
      onSeekStep(direction === "back" ? -seconds : seconds);
      playNudge();
    }
  };

  const onPointerLeave = () => {
    cancelTimer();
  };

  const commitChoice = (s: number) => {
    if (direction === "back") update({ seekBackStepSec: s });
    else update({ seekForwardStepSec: s });
    setPickerOpen(false);
  };

  const commitShortChoice = (s: number) => {
    if (direction === "back") update({ seekBackStepShortSec: s });
    else update({ seekForwardStepShortSec: s });
    setPickerOpen(false);
  };

  return (
    <div ref={wrapRef} className="relative">
      <Tooltip label={t("Hold for more options")}>
        <button
          type="button"
          onPointerDown={onPointerDown}
          onPointerUp={onPointerUp}
          onPointerLeave={onPointerLeave}
          onPointerCancel={onPointerLeave}
          onContextMenu={(e) => {
            e.preventDefault();
            setPickerOpen(true);
          }}
          aria-label={t("{word} {n} seconds. Hold for options", { word, n: seconds })}
          className={`relative flex h-14 w-14 items-center justify-center rounded-full transition-[background-color,transform] duration-150 active:scale-90 motion-reduce:active:scale-100 ${
            pickerOpen ? "bg-white/15 text-white" : "text-white/85 hover:bg-white/10 hover:text-white"
          }`}
        >
          {numberedOk ? (
            <img
              ref={iconRef}
              src={numberedSrc}
              width={30}
              height={30}
              alt=""
              draggable={false}
              className="select-none"
              onError={() => setNumberedOk(false)}
            />
          ) : (
            <>
              <img
                src={publicAssetUrl(`/player-icons/seek-${direction}.svg`)}
                width={34}
                height={34}
                alt=""
                draggable={false}
                className="select-none"
              />
              <span className="absolute font-mono text-[10px] font-bold tabular-nums leading-none">
                {seconds}
              </span>
            </>
          )}
        </button>
      </Tooltip>
      {pickerOpen && (
        <div className="absolute bottom-[calc(100%+12px)] left-1/2 z-30 w-60 max-w-[calc(100vw-32px)] -translate-x-1/2 apple-liquid-glass p-3.5 animate-menu-pop text-white">
          <div className="mb-2.5 text-[10.5px] font-bold uppercase tracking-[0.2em] text-white/60">
            {word}
          </div>
          <SeekGroup
            label={t("Arrows")}
            value={seconds}
            options={expanded ? SEEK_STEP_OPTIONS : curatedFor(seconds)}
            onPick={commitChoice}
            ariaFor={(n) => t("{word} {n} seconds", { word, n })}
          />
          <div className="my-2.5 h-px bg-white/10" />
          <SeekGroup
            label={t("Shift + Arrows")}
            value={shortSeconds}
            options={expanded ? SEEK_STEP_OPTIONS : curatedFor(shortSeconds)}
            onPick={commitShortChoice}
            ariaFor={(n) => t("Short {word} {n} seconds", { word, n })}
          />
          <button
            type="button"
            onClick={() => setExpanded((e) => !e)}
            className="mt-2.5 flex w-full items-center justify-center gap-1 rounded-xl py-1.5 text-[11.5px] font-semibold text-white/70 transition-colors hover:bg-white/10 hover:text-white"
          >
            {expanded ? t("Show less") : t("All times")}
            <ChevronDown
              size={13}
              strokeWidth={2.4}
              className={`transition-transform ${expanded ? "rotate-180" : ""}`}
            />
          </button>
        </div>
      )}
    </div>
  );
}

function SeekGroup({
  label,
  value,
  options,
  onPick,
  ariaFor,
}: {
  label: string;
  value: number;
  options: readonly number[];
  onPick: (seconds: number) => void;
  ariaFor: (seconds: number) => string;
}) {
  return (
    <div>
      <div className="mb-1.5 text-[9.5px] font-bold uppercase tracking-[0.14em] text-white/50">
        {label}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {options.map((s) => {
          const sel = s === value;
          return (
            <button
              key={s}
              type="button"
              onClick={() => onPick(s)}
              aria-label={ariaFor(s)}
              className={`flex h-9 min-w-[44px] items-center justify-center rounded-xl px-2.5 text-[13px] tabular-nums transition-all ${
                sel
                  ? "bg-white/25 font-bold text-white ring-1 ring-white/30 shadow-xs"
                  : "bg-white/10 text-white/80 hover:bg-white/18 hover:text-white border border-white/8"
              }`}
            >
              {s}s
            </button>
          );
        })}
      </div>
    </div>
  );
}
