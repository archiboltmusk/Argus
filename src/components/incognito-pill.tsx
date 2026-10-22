import { EyeOff } from "lucide-react";
import { setIncognito, useIncognito } from "@/lib/incognito";
import { useT } from "@/lib/i18n";

export function IncognitoPill() {
  const t = useT();
  const on = useIncognito();
  if (!on) return null;
  return (
    <button
      type="button"
      onClick={() => setIncognito(false)}
      title={t("Tracking is paused. Click to turn incognito off.")}
      className="fixed bottom-4 start-4 z-[70] inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-black/70 px-3 py-1.5 text-[11.5px] font-semibold uppercase tracking-[0.14em] text-white/80 backdrop-blur-md transition-colors hover:bg-black/85"
    >
      <EyeOff size={12} strokeWidth={2.4} />
      {t("Incognito")}
    </button>
  );
}
