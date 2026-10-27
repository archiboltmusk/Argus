import { useEffect, useRef, useState } from "react";
import { Gauge, Loader2 } from "lucide-react";
import { useT } from "@/lib/i18n";
import {
  gradeSpeed,
  probeStreamSpeed,
  getCachedProbeSpeed,
  type SpeedGrade,
  type SpeedProbeResult,
} from "@/lib/streams/speed-probe";
import type { Stream } from "@/lib/streams/types";

// Rough sustained bitrate each tier needs, in Mbit/s.
const NEEDED_MBPS: Record<string, number> = { "4K": 40, "1080p": 15, "720p": 6, "480p": 3, SD: 2 };

const GRADE_CLASS: Record<SpeedGrade, string> = {
  fast: "text-success",
  ok: "text-ink",
  slow: "text-danger",
};

function headersOf(stream: Stream): Record<string, string> | undefined {
  const hints = stream.behaviorHints;
  const h = hints?.proxyHeaders as { request?: Record<string, string> } | undefined;
  return h?.request ?? hints?.headers;
}

export function StreamSpeedButton({
  stream,
  className = "",
}: {
  stream: Stream & { resolution?: string };
  className?: string;
}) {
  const t = useT();
  const url = stream.url;
  const cachedHit = url ? getCachedProbeSpeed(url) : null;
  const [state, setState] = useState<"idle" | "running" | SpeedProbeResult>(cachedHit ?? "idle");
  const ctrlRef = useRef<AbortController | null>(null);
  useEffect(() => () => ctrlRef.current?.abort(), []);

  useEffect(() => {
    if (url) {
      const hit = getCachedProbeSpeed(url);
      if (hit) setState(hit);
    }
  }, [url]);

  if (!url || !/^https?:/i.test(url)) return null;

  const run = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    ctrlRef.current?.abort();
    const ctrl = new AbortController();
    ctrlRef.current = ctrl;
    setState("running");
    const result = await probeStreamSpeed(url, { headers: headersOf(stream), signal: ctrl.signal });
    if (!ctrl.signal.aborted) setState(result);
  };

  let label = t("Test speed");
  let tone = "text-ink-muted";
  if (state === "running") label = t("Testing…");
  else if (state !== "idle") {
    if (state.ok) {
      const grade = gradeSpeed(state.mbps, NEEDED_MBPS[stream.resolution ?? ""]);
      label = `${state.latencyMs} ms · ${state.mbps} Mbit/s`;
      tone = GRADE_CLASS[grade];
    } else {
      label = state.reason === "timeout" ? t("Too slow to measure") : t("Unreachable");
      tone = "text-danger";
    }
  }
  return (
    <button
      type="button"
      onClick={run}
      disabled={state === "running"}
      title={t("Download the first 1.5 MB of this link to measure latency and speed.")}
      className={`inline-flex items-center gap-1.5 rounded-full bg-raised px-2.5 py-1 text-[11.5px] font-semibold ring-1 ring-edge-soft transition-colors hover:bg-elevated ${tone} ${className}`}
    >
      {state === "running" ? <Loader2 size={12} className="animate-spin" /> : <Gauge size={12} strokeWidth={2.2} />}
      {label}
    </button>
  );
}
