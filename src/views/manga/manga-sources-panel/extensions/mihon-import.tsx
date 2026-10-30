import { Check, Download, Loader2, RefreshCw, ServerCog, Sparkles } from "lucide-react";
import { useState } from "react";
import { importMihonRepo, type MihonRepoResult } from "@/lib/manga/sources/mihon/repo";
import { useT } from "@/lib/i18n";

type Phase = "idle" | "running" | "done" | "error";

export function MihonImport({ url, count }: { url: string; count: number }) {
  const t = useT();
  const [phase, setPhase] = useState<Phase>("idle");
  const [progress, setProgress] = useState({ done: 0, total: count });
  const [result, setResult] = useState<MihonRepoResult>({ installed: 0, failed: 0, syncedWithDaemon: false });

  const run = async () => {
    setPhase("running");
    setProgress({ done: 0, total: count });
    try {
      const r = await importMihonRepo(url, (done, total) => setProgress({ done, total }));
      setResult(r);
      setPhase("done");
    } catch {
      setPhase("error");
    }
  };

  return (
    <div className="flex items-start gap-3 border-t border-edge-soft px-5 py-5">
      <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-accent/15 text-accent ring-1 ring-accent/30">
        <ServerCog size={20} />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[14.5px] font-bold text-ink">{t("Mihon / Tachiyomi Repository")}</span>
            <span className="rounded-md bg-accent/15 px-2 py-0.5 text-[10.5px] font-bold text-accent">
              {t("Supported")}
            </span>
          </div>
          <p className="mt-1 text-[13px] leading-relaxed text-ink-muted">
            {t(
              "Import all manga sources from this repository into Argus. Scrapers are mapped to your catalog and synchronized automatically with your local engine.",
            )}
          </p>
        </div>

        {phase === "done" ? (
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2 text-[13.5px] font-semibold text-emerald-400">
              <Check size={16} strokeWidth={2.6} />
              <span>
                {t("Successfully imported {n} sources", { n: result.installed })}
              </span>
            </div>
            {result.syncedWithDaemon && (
              <p className="flex items-center gap-1.5 text-xs text-ink-subtle">
                <Sparkles size={12} className="text-accent" />
                {t("Extensions synced with local daemon on port 4567.")}
              </p>
            )}
          </div>
        ) : phase === "error" ? (
          <button
            type="button"
            onClick={run}
            className="inline-flex items-center gap-2 self-start rounded-xl bg-raised px-4 py-2.5 text-[14px] font-semibold text-ink ring-1 ring-edge-soft transition-all hover:bg-elevated active:scale-[0.97]"
          >
            <RefreshCw size={16} />
            {t("Import failed, try again")}
          </button>
        ) : (
          <button
            type="button"
            onClick={run}
            disabled={phase === "running"}
            className="inline-flex items-center gap-2 self-start rounded-xl bg-accent px-4 py-2.5 text-[14px] font-semibold text-canvas shadow-sm transition-all hover:opacity-90 active:scale-[0.97] disabled:opacity-70"
          >
            {phase === "running" ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                {t("Importing {done} of {total}...", { done: progress.done, total: progress.total })}
              </>
            ) : (
              <>
                <Download size={16} />
                {count > 0 ? t("Import {n} Mihon sources", { n: count }) : t("Import Mihon sources")}
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
