import { useState } from "react";
import { History } from "./icons";
import { IS_BETA_BUILD } from "@/lib/build-info";
import { useT } from "@/lib/i18n";
import { useSettings } from "@/lib/settings";
import { currentVersion, type VersionEntry } from "@/lib/updater/versions";
import { openUrl } from "@/lib/window";
import { ROW_DESC, SettingRow } from "./kit";
import { SButton } from "./ui";
import { useVersionHistory } from "./rollback-row/use-version-history";
import { VERSION_BADGE } from "./rollback-row/badge";
import { VersionItem } from "./rollback-row/version-item";

const RELEASES_URL = "https://github.com/archiboltmusk/Argus/releases";

export function RollbackRow() {
  const t = useT();
  const { settings } = useSettings();
  const [expanded, setExpanded] = useState(false);
  const { state, reload } = useVersionHistory(expanded);

  return (
    <SettingRow
      wide
      icon={<History size={20} strokeWidth={2.1} className="text-ink-muted" />}
      label={
        <span className="inline-flex min-w-0 flex-wrap items-center gap-2">
          <span className="min-w-0">{t("Roll back to an earlier build")}</span>
          {IS_BETA_BUILD && (
            <span className={`${VERSION_BADGE} bg-accent-soft text-accent`}>{t("Beta")}</span>
          )}
        </span>
      }
      desc={t(
        "Having trouble after an update? Back up your setup with the controls below, then download an earlier installer.",
      )}
    >
      <div className="flex w-full min-w-0 flex-col gap-3">
        <SButton onClick={() => setExpanded((value) => !value)}>
          {expanded ? t("Hide earlier builds") : t("Browse earlier builds")}
        </SButton>
        {expanded && (
          <div className="w-full min-w-0 rounded-[10px] border border-edge-soft">
            {state.status === "loading" ? (
              <HistorySkeleton />
            ) : state.status === "error" ? (
              <HistoryError onRetry={reload} />
            ) : (
              <VersionList
                versions={state.versions.filter(
                  (entry) => settings.betaUpdates || entry.channel !== "beta",
                )}
              />
            )}
          </div>
        )}

        {expanded && (
          <p className={`max-w-[70ch] ${ROW_DESC}`}>
            {t("Use the backup controls below to save or restore your setup.")}
          </p>
        )}
      </div>
    </SettingRow>
  );
}

function VersionList({ versions }: { versions: VersionEntry[] }) {
  const t = useT();
  const display = withCurrent(versions);
  const hasOthers = display.some((v) => v.version !== currentVersion);

  if (!hasOthers) {
    return (
      <p className={`px-4 py-5 text-center ${ROW_DESC}`}>
        {t("You're on the latest build. Earlier builds show up here as new versions ship.")}
      </p>
    );
  }

  return (
    <div className="flex max-h-[560px] flex-col overflow-y-auto rounded-[10px] border border-edge-soft">
      {display.map((v) => (
        <VersionItem key={v.version} entry={v} isCurrent={v.version === currentVersion} />
      ))}
    </div>
  );
}

function HistorySkeleton() {
  return (
    <div className="flex flex-col">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="flex min-h-[68px] items-center justify-between gap-3 border-t border-edge-soft px-4 py-3 first:border-t-0"
        >
          <div className="flex flex-col gap-2">
            <div className="h-4 w-20 animate-pulse rounded bg-elevated" />
            <div className="h-3.5 w-32 animate-pulse rounded bg-elevated" />
          </div>
          <div className="h-11 w-28 animate-pulse rounded-[8px] bg-elevated" />
        </div>
      ))}
    </div>
  );
}

function HistoryError({ onRetry }: { onRetry: () => void }) {
  const t = useT();
  return (
    <div className="flex flex-col items-start gap-3 px-4 py-4">
      <p className={`max-w-[66ch] ${ROW_DESC}`}>
        {t("Couldn't load earlier builds. Check your connection and try again.")}
      </p>
      <div className="flex flex-wrap items-center gap-2.5">
        <SButton onClick={onRetry}>{t("Try again")}</SButton>
        <SButton onClick={() => openUrl(RELEASES_URL)}>{t("Browse all releases")}</SButton>
      </div>
    </div>
  );
}

function withCurrent(versions: VersionEntry[]): VersionEntry[] {
  const list = versions.filter(
    (v) => v && typeof v.version === "string" && compareVersions(v.version, currentVersion) <= 0,
  );
  if (!list.some((v) => v.version === currentVersion)) {
    list.push({ version: currentVersion });
  }
  return list.sort((a, b) => compareVersions(b.version, a.version));
}

function compareVersions(a: string, b: string): number {
  const pa = a.split(".").map((n) => parseInt(n, 10) || 0);
  const pb = b.split(".").map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (d) return d;
  }
  return 0;
}
