import { useEffect, useState } from "react";
import { CheckCircle2, AlertTriangle, Gauge, Zap } from "lucide-react";
import { useSettings } from "@/lib/settings";
import { getCachedProbeSpeed, type SpeedProbeResult } from "@/lib/streams/speed-probe";

function estimateBitrateMbps(stream: {
  size?: number | null;
  resolution?: string | null;
  codec?: string | null;
}): number {
  if (stream.size && stream.size > 0) {
    // 90 minutes average runtime = 5400s
    return (stream.size * 8) / (5400 * 1_000_000);
  }
  if (stream.resolution === "4K") return 22.0;
  if (stream.resolution === "1080p") {
    return stream.codec === "AV1" || stream.codec === "HEVC" ? 3.5 : 7.0;
  }
  if (stream.resolution === "720p") return 2.5;
  return 1.5;
}

export function BandwidthConfidenceBadge({
  stream,
  className = "",
}: {
  stream: {
    url?: string;
    size?: number | null;
    resolution?: string | null;
    codec?: string | null;
  };
  className?: string;
}) {
  const { settings } = useSettings();
  const url = stream.url;
  const [probe, setProbe] = useState<SpeedProbeResult | null>(() => (url ? getCachedProbeSpeed(url) : null));

  useEffect(() => {
    if (!url) return;
    const hit = getCachedProbeSpeed(url);
    if (hit) setProbe(hit);
  }, [url]);

  const estimatedMbps = estimateBitrateMbps(stream);
  const userBudget = settings.bandwidthMbps ? Number(settings.bandwidthMbps) : null;

  // Case 1: Active speed probe cached
  if (probe && probe.ok) {
    const ratio = probe.mbps / Math.max(estimatedMbps, 0.5);

    if (ratio >= 1.8) {
      return (
        <span
          title={`Verified CDN throughput (${probe.mbps} Mbit/s) provides ${ratio.toFixed(1)}x headroom over required bitrate (~${estimatedMbps.toFixed(1)} Mbit/s).`}
          className={`inline-flex items-center gap-1 rounded-full bg-success/15 px-2 py-0.5 text-[11px] font-semibold text-success ring-1 ring-success/30 ${className}`}
        >
          <CheckCircle2 size={11} strokeWidth={2.5} />
          <span>{probe.mbps.toFixed(0)} Mbit/s · Smooth</span>
        </span>
      );
    }

    if (ratio >= 1.0) {
      return (
        <span
          title={`Throughput (${probe.mbps} Mbit/s) meets required playback bitrate (~${estimatedMbps.toFixed(1)} Mbit/s).`}
          className={`inline-flex items-center gap-1 rounded-full bg-accent/15 px-2 py-0.5 text-[11px] font-semibold text-accent ring-1 ring-accent/30 ${className}`}
        >
          <Gauge size={11} strokeWidth={2.5} />
          <span>{probe.mbps.toFixed(0)} Mbit/s · Playable</span>
        </span>
      );
    }

    return (
      <span
        title={`Measured throughput (${probe.mbps} Mbit/s) is below needed stream bitrate (~${estimatedMbps.toFixed(1)} Mbit/s). Buffer pauses expected.`}
        className={`inline-flex items-center gap-1 rounded-full bg-danger/15 px-2 py-0.5 text-[11px] font-semibold text-danger ring-1 ring-danger/30 ${className}`}
      >
        <AlertTriangle size={11} strokeWidth={2.5} />
        <span>Stall Risk ({probe.mbps.toFixed(0)} Mbit/s)</span>
      </span>
    );
  }

  // Case 2: User specified bandwidth preset in Settings (e.g. 4, 8, 15 Mbps)
  if (userBudget && userBudget > 0) {
    if (estimatedMbps <= userBudget * 0.85) {
      return (
        <span
          title={`Stream bitrate (~${estimatedMbps.toFixed(1)} Mbit/s) fits smoothly within your ${userBudget} Mbit/s limit.`}
          className={`inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-400 ring-1 ring-emerald-500/25 ${className}`}
        >
          <Zap size={11} strokeWidth={2.5} />
          <span>Fits {userBudget}M</span>
        </span>
      );
    }

    return (
      <span
        title={`Stream bitrate (~${estimatedMbps.toFixed(1)} Mbit/s) exceeds your configured ${userBudget} Mbit/s budget.`}
        className={`inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-400 ring-1 ring-amber-500/25 ${className}`}
      >
        <AlertTriangle size={11} strokeWidth={2.5} />
        <span>High Bitrate (~{estimatedMbps.toFixed(0)}M)</span>
      </span>
    );
  }

  return null;
}
