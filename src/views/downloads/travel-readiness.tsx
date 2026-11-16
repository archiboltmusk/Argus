import { useRef, useState } from "react";
import { exists } from "@tauri-apps/plugin-fs";
import { downloadDir } from "@tauri-apps/api/path";
import { invoke } from "@tauri-apps/api/core";
import { useSettings } from "@/lib/settings";
import { useT } from "@/lib/i18n";
import type { DownloadItem } from "@/lib/download/downloads-store";
import { checkTravelItem, type TravelCheck } from "@/lib/download/travel-readiness";
import { fmtBytes } from "./downloads-format";
export function TravelReadiness({ items }: { items: DownloadItem[] }) {
  const { settings } = useSettings();
  const t = useT();
  const [checks, setChecks] = useState<TravelCheck[] | null>(null);
  const [free, setFree] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const generation = useRef(0);
  async function check() {
    const current = ++generation.current;
    setBusy(true);
    try {
      const results: TravelCheck[] = [];
      for (const item of items.filter((item) => item.status === "done"))
        results.push(await checkTravelItem(item, exists));
      const parent = settings.downloadDir || (await downloadDir().catch(() => ""));
      const storage = await invoke<{ selected: { availableBytes: number | null } | null }>(
        "games_download_locations",
        { parent },
      ).catch(() => null);
      if (current === generation.current) {
        setChecks(results);
        setFree(storage?.selected?.availableBytes ?? null);
      }
    } finally {
      if (current === generation.current) setBusy(false);
    }
  }
  return (
    <section className="mb-5 rounded-xl border border-edge p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-semibold">{t("Offline travel check")}</h2>
        <button
          type="button"
          disabled={busy}
          onClick={() => void check()}
          className="rounded-lg border border-edge px-4 py-3"
        >
          {busy ? t("Checking…") : t("Check saved files")}
        </button>
      </div>
      {checks && (
        <div role="status" className="mt-3 space-y-2 text-sm">
          <p>
            {t("{count} saved files available", {
              count: checks.filter((c) => c.file === "present").length,
            })}{" "}
            ·{" "}
            {free == null
              ? t("Free space unavailable")
              : t("{size} free", { size: fmtBytes(free) })}
          </p>
          {checks.map((c) => (
            <p key={c.id}>
              {items.find((i) => i.id === c.id)?.title}:{" "}
              {t(
                c.file === "present"
                  ? "File found"
                  : c.file === "missing"
                    ? "File missing"
                    : "File could not be checked",
              )}{" "}
              ·{" "}
              {t(
                c.subtitles === "sidecar"
                  ? "External subtitle found"
                  : c.subtitles === "not-applicable"
                    ? "No subtitles needed"
                    : "Embedded subtitles not checked; open the file to verify your language.",
              )}
            </p>
          ))}
          <p className="text-ink-subtle">
            {t(
              "Checks describe files on this device now. Recheck after deleting or moving downloads.",
            )}
          </p>
        </div>
      )}
    </section>
  );
}
