import { Flame, Heart, Sparkles } from "lucide-react";
import { SFX } from "@/lib/sfx";
import { useBpT } from "./bp-i18n";

const SHELL =
  "relative flex w-full items-center overflow-hidden rounded-[var(--bp-r-lg)] border border-[var(--bp-edge)] bg-[var(--bp-panel)] text-start will-change-transform";

export function BpReelsBand({
  onOpen,
  onTint,
}: {
  onOpen: () => void;
  onTint: (colour: string) => void;
}) {
  const t = useBpT();

  return (
    <div
      className={SHELL}
      onMouseEnter={() => onTint("#ec4899")}
      style={{
        height: "clamp(150px, 20vh, 260px)",
        background: "linear-gradient(135deg, rgba(236,72,153,0.15), rgba(139,92,246,0.25))",
      }}
    >
      <div className="flex w-full items-center justify-between p-[clamp(18px,2vw,36px)]">
        <div className="flex flex-col gap-2 max-w-lg">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-rose-500 text-white">
              <Flame size={16} />
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-rose-400">
              TikTok & Reels Mode
            </span>
          </div>
          <h3 className="text-xl sm:text-2xl font-black text-white">
            {t("Infinite 'For You' Video Reels")}
          </h3>
          <p className="text-xs sm:text-sm text-zinc-300">
            {t("Full-bleed cinematic previews, auto-advancing hooks, and one-touch streaming.")}
          </p>
        </div>

        <button
          type="button"
          data-bp-focusable
          data-bp-tile
          data-bp-restore-key="bp-lead:reels"
          onFocus={() => onTint("#ec4899")}
          onClick={() => {
            SFX.click();
            onOpen();
          }}
          className="flex items-center gap-3 rounded-full bg-rose-500 px-6 py-3 font-bold text-white shadow-lg shadow-rose-500/30 transition hover:bg-rose-600 active:scale-95 motion-reduce:animate-none"
        >
          <Flame size={18} />
          <span>{t("Launch Feed")}</span>
        </button>
      </div>
    </div>
  );
}

export function BpTasteBlendBand({
  onOpen,
  onTint,
}: {
  onOpen: () => void;
  onTint: (colour: string) => void;
}) {
  const t = useBpT();

  return (
    <div
      className={SHELL}
      onMouseEnter={() => onTint("#f43f5e")}
      style={{
        height: "clamp(150px, 20vh, 260px)",
        background: "linear-gradient(135deg, rgba(244,63,94,0.15), rgba(168,85,247,0.25))",
      }}
    >
      <div className="flex w-full items-center justify-between p-[clamp(18px,2vw,36px)]">
        <div className="flex flex-col gap-2 max-w-lg">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-pink-500 text-white">
              <Heart size={16} className="fill-current" />
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-pink-400">
              Spotify Blend Mode
            </span>
          </div>
          <h3 className="text-xl sm:text-2xl font-black text-white">
            {t("Movie Night Taste Blend")}
          </h3>
          <p className="text-xs sm:text-sm text-zinc-300">
            {t("Merge two profiles to calculate joint cinematic synergy and zero-conflict picks.")}
          </p>
        </div>

        <button
          type="button"
          data-bp-focusable
          data-bp-tile
          data-bp-restore-key="bp-lead:blend"
          onFocus={() => onTint("#f43f5e")}
          onClick={() => {
            SFX.click();
            onOpen();
          }}
          className="flex items-center gap-3 rounded-full bg-pink-500 px-6 py-3 font-bold text-white shadow-lg shadow-pink-500/30 transition hover:bg-pink-600 active:scale-95 motion-reduce:animate-none"
        >
          <Sparkles size={18} />
          <span>{t("Blend Profiles")}</span>
        </button>
      </div>
    </div>
  );
}
