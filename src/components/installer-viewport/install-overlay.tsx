import { Check } from "lucide-react";
import { ArgusEyeLoader } from "@/components/argus-eye-loader";
import { CustomArtwork } from "@/components/custom-artwork";
import { useT } from "@/lib/i18n";

export type OverlayPhase =
  | { kind: "installing"; name: string | null }
  | { kind: "success"; name: string; logo: string | null };

function InstallEye({ logo }: { logo: string | null }) {
  return (
    <div className="relative flex h-60 w-60 items-center justify-center" aria-hidden>
      <ArgusEyeLoader className="h-full w-full text-ink" />
      {logo && (
        <img
          src={logo}
          alt=""
          referrerPolicy="no-referrer"
          className="absolute h-12 w-12 rounded-lg object-contain"
        />
      )}
    </div>
  );
}

export function InstallOverlay({ phase, logo }: { phase: OverlayPhase; logo: string | null }) {
  const t = useT();
  const installing = phase.kind === "installing";
  const name = phase.kind === "success" ? phase.name : (phase.name ?? t("Resolving manifest"));
  const cargoLogo = logo ?? (phase.kind === "success" ? phase.logo : null);
  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-canvas/92 backdrop-blur-xl animate-in fade-in duration-200">
      <div className="flex flex-col items-center gap-3 animate-in zoom-in-95 duration-300">
        <CustomArtwork role="loading" className="h-60 w-60" fallback={<InstallEye logo={cargoLogo} />} />
        <div className="flex flex-col items-center gap-1.5">
          {installing ? (
            <span className="text-[10.5px] font-bold uppercase tracking-[0.26em] text-accent">
              {t("Installing")}
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-[0.26em] text-emerald-400">
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-white">
                <Check size={11} strokeWidth={3} />
              </span>
              {t("Added to Argus")}
            </span>
          )}
          <span className="font-display text-[24px] leading-none tracking-tight text-ink">
            {name}
          </span>
          {!installing && (
            <span className="text-[12.5px] text-ink-muted">{t("Saved to your library.")}</span>
          )}
        </div>
      </div>
    </div>
  );
}
