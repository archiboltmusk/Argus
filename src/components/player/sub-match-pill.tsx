import { Captions, Loader2, SkipForward } from "lucide-react";
import { useEffect, useState } from "react";
import { useAutoSub } from "@/lib/subtitles/auto-candidates";
import { useT } from "@/lib/i18n";

const VISIBLE_MS = 10_000;

export function SubMatchPill({ chromeVisible }: { chromeVisible: boolean }) {
  const t = useT();
  const auto = useAutoSub();
  const [fresh, setFresh] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!auto.tryNext) {
      setFresh(false);
      return;
    }
    setFresh(true);
    const id = window.setTimeout(() => setFresh(false), VISIBLE_MS);
    return () => window.clearTimeout(id);
  }, [auto.tryNext, auto.index]);

  if (!auto.tryNext || auto.total < 2 || !(fresh || chromeVisible)) return null;
  const hasNext = auto.index + 1 < auto.total;

  return (
    <div className="absolute left-1/2 top-[5.5rem] z-30 flex -translate-x-1/2 items-center gap-2 rounded-full border border-edge-soft bg-canvas/85 px-3 py-1.5 text-[11px] font-semibold text-ink/85 shadow-[0_8px_24px_-12px_rgba(0,0,0,0.6)] backdrop-blur-md">
      <Captions size={13} className="text-accent" />
      <span className="max-w-[16rem] truncate">{auto.label}</span>
      {auto.matchScore != null && (
        <span className="text-ink-subtle">{t("{count}% match", { count: auto.matchScore })}</span>
      )}
      {hasNext && (
        <button
          type="button"
          disabled={busy}
          onClick={() => {
            setBusy(true);
            void auto.tryNext?.().finally(() => setBusy(false));
          }}
          className="flex items-center gap-1 rounded-full bg-white/10 px-2 py-0.5 text-ink hover:bg-white/20 disabled:opacity-60"
        >
          {busy ? <Loader2 size={12} className="animate-spin" /> : <SkipForward size={12} />}
          {t("Try next subtitle")}
        </button>
      )}
    </div>
  );
}
