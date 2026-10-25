import { Loader2, RotateCw } from "../icons";
import { Check } from "lucide-react";
import { useEffect, useState } from "react";
import cloudflareLogo from "@/assets/cloudflare.webp";
import { useSettings } from "@/lib/settings";
import { useT } from "@/lib/i18n";
import { InfoTip, ROW_ACTION } from "../kit";
import { runSpeedTest, type SpeedTestResult } from "./speed-test-run";

const SPEEDTEST_COOLDOWN_MS = 90_000;
const SPEEDTEST_LIMITED_COOLDOWN_MS = 300_000;

const ERROR_COPY: Record<Exclude<SpeedTestResult, { ok: true }>["reason"], string> = {
  rate_limited: "Cloudflare rate limited this test. Try again in a few minutes.",
  network: "Could not reach speed.cloudflare.com.",
  insufficient: "Not enough data transferred to measure reliably.",
};

export function formatMbps(mbps: number): string {
  if (mbps >= 1000) return `${(mbps / 1000).toFixed(2)} Gbps`;
  if (mbps >= 100) return `${mbps.toFixed(0)} Mbps`;
  return `${mbps.toFixed(1)} Mbps`;
}

function MethodTip() {
  const t = useT();
  return (
    <InfoTip
      text={t(
        "Argus opens 4 parallel requests to speed.cloudflare.com, discards the first 1.2 seconds so TCP slow-start does not tank the result, then measures until it has 150 MB or 8 seconds of steady transfer.",
      )}
      sub={t(
        "Cloudflare is a single origin, so on a very fast line this can read lower than a multi-server test. Uses up to 150 MB, with a 90 second cooldown.",
      )}
    />
  );
}

export function SpeedTestButton() {
  return <SpeedTestButtonInner />;
}

function recommendBandwidthCap(mbps: number): number {
  if (mbps >= 150) return 100;
  if (mbps >= 70) return 50;
  if (mbps >= 35) return 25;
  if (mbps >= 20) return 15;
  if (mbps >= 10) return 8;
  return 4;
}

function SpeedTestButtonInner() {
  const t = useT();
  const { settings, update } = useSettings();
  const [state, setState] = useState<"idle" | "running" | "done" | "error">("idle");
  const [mbps, setMbps] = useState<number | null>(null);
  const [liveMbps, setLiveMbps] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cooldownUntil, setCooldownUntil] = useState<number>(0);
  const [now, setNow] = useState<number>(Date.now());

  useEffect(() => {
    if (cooldownUntil <= Date.now()) return;
    const id = window.setInterval(() => setNow(Date.now()), 500);
    return () => window.clearInterval(id);
  }, [cooldownUntil]);

  const cooldownRemaining = Math.max(0, cooldownUntil - now);
  const cooling = cooldownRemaining > 0;

  const run = async () => {
    if (state === "running" || cooling) return;
    setState("running");
    setLiveMbps(null);

    const result = await runSpeedTest(setLiveMbps);
    setLiveMbps(null);

    if (result.ok) {
      setMbps(result.mbps);
      setError(null);
      setCooldownUntil(Date.now() + SPEEDTEST_COOLDOWN_MS);
      setNow(Date.now());
      setState("done");
      return;
    }

    setError(t(ERROR_COPY[result.reason]));
    if (result.reason === "rate_limited") {
      setCooldownUntil(Date.now() + SPEEDTEST_LIMITED_COOLDOWN_MS);
      setNow(Date.now());
    }
    setState("error");
  };

  const running = state === "running";
  const done = state === "done";
  const seconds = Math.ceil(cooldownRemaining / 1000);

  const cls = running
    ? "flex h-11 shrink-0 items-center gap-2 text-[15.5px] font-semibold tabular-nums text-ink"
    : done
      ? `flex h-11 shrink-0 items-center justify-center rounded-[8px] text-[15.5px] font-semibold tabular-nums text-ink-subtle transition-colors ${
          cooling ? "w-auto cursor-not-allowed px-3" : "w-11 hover:bg-elevated hover:text-ink"
        }`
      : `${ROW_ACTION}${cooling ? " pointer-events-none opacity-45" : ""}`;

  return (
    <span className="flex min-w-0 flex-wrap items-center justify-end gap-2.5">
      {state === "error" && (
        <span className="max-w-[36ch] text-end text-[15.5px] leading-[22px] text-ink-muted">
          {error}
        </span>
      )}
      {done && (
        <>
          <span className="flex h-11 shrink-0 items-center gap-2 rounded-[8px] border border-edge-soft bg-elevated px-4 text-[15.5px] font-semibold tabular-nums text-ink">
            <img
              src={cloudflareLogo}
              alt=""
              draggable={false}
              className="h-4 w-4 shrink-0 object-contain"
            />
            {mbps != null ? formatMbps(mbps) : ""}
          </span>
          {mbps != null && (() => {
            const recommended = recommendBandwidthCap(mbps);
            const isApplied = settings.bandwidthMbps === recommended;
            return (
              <button
                type="button"
                onClick={() => update({ bandwidthMbps: recommended })}
                className={`flex h-11 shrink-0 items-center gap-2 rounded-[8px] border px-3 text-[13.5px] font-semibold transition-colors ${
                  isApplied
                    ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-300"
                    : "border-edge-soft bg-raised text-ink hover:border-accent hover:text-accent"
                }`}
              >
                {isApplied ? <Check size={15} strokeWidth={2.4} /> : null}
                <span>
                  {isApplied
                    ? t("Optimal cap ({mbps}M) active", { mbps: recommended })
                    : t("Auto-apply {mbps}M cap", { mbps: recommended })}
                </span>
              </button>
            );
          })()}
          <MethodTip />
        </>
      )}
      <button
        type="button"
        onClick={running || cooling ? undefined : run}
        aria-disabled={running || cooling}
        aria-label={done ? (cooling ? t("Wait {seconds}s", { seconds }) : t("Re-test")) : undefined}
        className={cls}
      >
        {running ? (
          <>
            <Loader2 size={16} strokeWidth={2.4} className="animate-spin text-ink-subtle" />
            {liveMbps != null ? formatMbps(liveMbps) : t("Warming up…")}
          </>
        ) : cooling ? (
          `${seconds}s`
        ) : done ? (
          <RotateCw size={17} strokeWidth={2} />
        ) : state === "error" ? (
          t("Retry")
        ) : (
          t("Run speed test")
        )}
      </button>
    </span>
  );
}
