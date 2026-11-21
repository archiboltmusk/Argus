import { useEffect, useState } from "react";
import {
  ArrowUpCircle,
  Check,
  ChevronDown,
  Download,
  Loader2,
  RefreshCw,
  RotateCw,
  X,
} from "lucide-react";
import {
  closeUpdatePanel,
  downloadUpdate,
  installUpdate,
  dismissUpdate,
  checkForUpdate,
  openManualDownload,
  openHandoffDownload,
  useUpdate,
} from "@/lib/updater/use-update";
import { releaseNote, type ReleaseNote } from "@/lib/updater/release-notes";
import { useT } from "@/lib/i18n";
import { RichNote } from "./rich-notes";
import { experimentalReleaseNote } from "@/lib/updater/experimental-notes";

function mb(bytes: number): string {
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function UpdateCard() {
  const t = useT();
  const u = useUpdate();
  const [shown, setShown] = useState(false);
  const [rich, setRich] = useState<ReleaseNote | null>(null);
  useEffect(() => {
    const id = requestAnimationFrame(() => setShown(true));
    return () => cancelAnimationFrame(id);
  }, []);
  useEffect(() => {
    let ok = true;
    if (u.channel === "experimental") {
      setRich(experimentalReleaseNote(u.version));
    } else if (u.version) {
      setRich(null);
      releaseNote(u.version).then((n) => ok && setRich(n));
    } else {
      setRich(null);
    }
    return () => {
      ok = false;
    };
  }, [u.status, u.version, u.channel]);

  const pct = Math.round(u.progress * 100);
  const determinate = u.totalBytes > 0;

  return (
    <div
      className="fixed inset-0 z-[150] flex items-center justify-center bg-black/65 p-4 backdrop-blur-md transition-opacity duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget && u.status !== "installing") closeUpdatePanel();
      }}
    >
      <div
        className={`w-full max-w-[500px] overflow-hidden rounded-[26px] border border-edge bg-elevated shadow-[0_32px_90px_rgba(0,0,0,0.7)] transition-all duration-300 ${
          shown ? "scale-100 opacity-100" : "scale-95 opacity-0"
        }`}
      >
        <div className="flex items-start gap-3.5 px-6 pt-5 pb-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent/15 text-accent">
            {u.status === "installing" ? (
              <Loader2 size={22} className="animate-spin" />
            ) : (
              <ArrowUpCircle size={22} strokeWidth={2.2} />
            )}
          </div>
          <div className="flex min-w-0 flex-1 flex-col">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[17px] font-semibold text-ink">
                {u.intent === "return-beta"
                  ? t("Return to beta")
                  : u.status === "downloaded"
                    ? t("update.ready")
                    : u.status === "installing"
                      ? t("update.installing")
                      : u.status === "downloading"
                        ? t("update.downloading")
                        : u.status === "error"
                          ? u.installFailed
                            ? t("Finish updating Argus")
                            : t("update.failed")
                          : t("update.available")}
              </span>
              {u.version && (
                <span className="rounded-full bg-accent/15 px-2.5 py-0.5 text-[11px] font-semibold text-accent">
                  Argus {u.version}
                </span>
              )}
            </div>
            {u.version && (
              <span className="text-[12.5px] text-ink-subtle">
                {u.channel === "experimental" && u.experimentalVersion
                  ? t("Experimental {version} · Build {buildId}", {
                      version: u.experimentalVersion,
                      buildId: u.buildId ?? "—",
                    })
                  : t("update.argusVersion", { version: u.version })}
              </span>
            )}
          </div>
          {u.status !== "installing" && (
            <button
              onClick={closeUpdatePanel}
              aria-label={t(u.status === "downloading" ? "chrome.minimize" : "common.close")}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-ink-subtle transition-colors hover:bg-raised hover:text-ink"
            >
              {u.status === "downloading" ? (
                <ChevronDown size={18} strokeWidth={2.2} />
              ) : (
                <X size={18} strokeWidth={2.2} />
              )}
            </button>
          )}
        </div>

        {u.handoff && u.status !== "error" && (
          <p className="mx-6 mb-3 text-[13px] leading-relaxed text-ink-muted">
            {u.handoff.verifiable
              ? t(
                  "This one also replaces Argus's bundled players and tools, so it installs through Argus Shipyard. Argus closes, the installer finishes, then Argus reopens.",
                )
              : t(
                  "This one installs through Argus Shipyard, but the update manifest carries no signature for it. Argus will not run an installer it cannot verify. Download it and run it yourself.",
                )}
          </p>
        )}

        {["available", "downloading", "downloaded"].includes(u.status) && (rich || u.notes) && (
          <div className="mx-6 mb-3 max-h-[220px] overflow-y-auto rounded-xl border border-edge-soft/60 bg-canvas/60 px-4 py-3">
            {rich ? (
              <RichNote note={rich} />
            ) : (
              <p className="whitespace-pre-line text-[13px] leading-relaxed text-ink-muted">
                {u.notes?.trim()}
              </p>
            )}
          </div>
        )}

        {(u.status === "downloading" || u.status === "downloaded") && (
          <div className="px-6 pb-2">
            <div className="h-2 overflow-hidden rounded-full bg-raised">
              <div
                className={`h-full rounded-full bg-accent transition-[width] duration-300 ${
                  u.status === "downloading" && !determinate ? "w-2/5 animate-pulse" : ""
                }`}
                style={determinate ? { width: `${Math.max(4, pct)}%` } : undefined}
              />
            </div>
            <div className="mt-2 flex items-center justify-between text-[12px] font-medium text-ink-subtle">
              <span>
                {u.status === "downloaded"
                  ? t("update.downloadComplete")
                  : determinate
                    ? t("update.of", {
                        downloaded: mb(u.downloadedBytes),
                        total: mb(u.totalBytes),
                      })
                    : t("update.fetching")}
              </span>
              {u.status === "downloading" && determinate && (
                <span className="font-semibold text-accent">{pct}%</span>
              )}
            </div>
          </div>
        )}

        {u.status === "error" && (
          <div className="mx-6 mb-3 rounded-xl border border-danger/40 bg-danger/10 px-4 py-3 text-[12.5px] leading-relaxed text-ink-muted">
            {u.error ?? t("update.errorServer")}
            {u.installFailed && u.channel !== "experimental" && u.intent !== "return-beta" && (
              <span className="mt-1.5 block text-ink-subtle">
                {t(
                  "Download and run the installer to finish updating. If it keeps failing, run it as administrator once.",
                )}
              </span>
            )}
          </div>
        )}

        <div className="flex items-center justify-end gap-2 px-6 pb-5 pt-3">
          {u.status === "available" && (
            <>
              <GhostButton onClick={dismissUpdate}>{t("update.later")}</GhostButton>
              <PrimaryButton onClick={() => void downloadUpdate()}>
                <Download size={16} strokeWidth={2.2} />{" "}
                {u.handoff && !u.handoff.verifiable
                  ? t("Download installer")
                  : t("update.download")}
              </PrimaryButton>
            </>
          )}
          {u.status === "downloaded" && (
            <>
              <GhostButton onClick={dismissUpdate}>{t("update.later")}</GhostButton>
              <PrimaryButton onClick={() => void installUpdate()}>
                <RotateCw size={16} strokeWidth={2.2} />{" "}
                {u.handoff ? t("Install and reopen") : t("update.installRestart")}
              </PrimaryButton>
            </>
          )}
          {u.status === "installing" && (
            <span className="text-[12px] text-ink-subtle">
              {u.handoff
                ? t("Argus is closing. Argus Shipyard will finish and reopen it.")
                : t("update.restartAuto")}
            </span>
          )}
          {u.status === "error" && (
            <>
              <GhostButton onClick={closeUpdatePanel}>{t("common.close")}</GhostButton>
              {u.intent === "return-beta" ? null : u.installFailed &&
                u.channel !== "experimental" ? (
                <PrimaryButton
                  onClick={() => void (u.handoff ? openHandoffDownload() : openManualDownload())}
                >
                  <Download size={16} strokeWidth={2.2} /> {t("Download installer")}
                </PrimaryButton>
              ) : (
                <PrimaryButton onClick={() => void checkForUpdate(true)}>
                  <RefreshCw size={16} strokeWidth={2.2} /> {t("update.tryAgain")}
                </PrimaryButton>
              )}
            </>
          )}
          {u.status === "downloading" && (
            <div className="flex w-full items-center justify-center">
              <button
                onClick={closeUpdatePanel}
                className="inline-flex items-center gap-2 rounded-full border border-edge bg-raised/80 px-5 py-2.5 text-[13.5px] font-medium text-ink transition-colors hover:border-edge-soft hover:bg-raised"
              >
                <Check size={15} strokeWidth={2.4} className="text-accent" /> {t("update.keepUsing")}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function PrimaryButton({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex h-11 items-center gap-2 rounded-xl bg-accent px-4 text-[14px] font-semibold text-canvas transition-[filter] hover:brightness-105"
    >
      {children}
    </button>
  );
}

function GhostButton({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex h-11 items-center rounded-xl px-4 text-[14px] font-medium text-ink-muted transition-colors hover:bg-raised hover:text-ink"
    >
      {children}
    </button>
  );
}
