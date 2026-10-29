import { Smartphone, Wifi } from "lucide-react";
import { formatDataOdometer } from "@/lib/streams/hotspot-frugal-filter";

export function HotspotOdometerChip({
  visible,
  currentTimeSec,
  durationSec,
  sizeBytes,
  dailyBudgetMb,
  isUnlimited = false,
}: {
  visible: boolean;
  currentTimeSec: number;
  durationSec: number;
  sizeBytes?: number | null;
  dailyBudgetMb: number;
  isUnlimited?: boolean;
}) {
  if (!visible) return null;

  // Estimate consumption from duration & file size, or default reasonable bitrate (2.5 Mbps = ~300KB/s)
  let consumedMb = 0;
  if (durationSec > 0 && typeof sizeBytes === "number" && sizeBytes > 0) {
    const streamMb = sizeBytes / (1024 * 1024);
    const progress = Math.min(1, Math.max(0, currentTimeSec / durationSec));
    consumedMb = streamMb * progress;
  } else if (currentTimeSec > 0) {
    // 2.5 Mbps default stream bitrate estimation
    consumedMb = (currentTimeSec * 2.5) / 8;
  }

  const { consumedStr, remainingStr, percentUsed } = formatDataOdometer(
    consumedMb,
    dailyBudgetMb,
    isUnlimited,
  );

  return (
    <div
      className="pointer-events-none absolute top-32 end-24 z-30 flex items-center gap-2 rounded-full border border-white/12 bg-black/80 py-1.5 ps-2.5 pe-3.5 shadow-[0_12px_32px_-14px_rgba(0,0,0,0.8),inset_0_1px_0_rgba(255,255,255,0.05)] backdrop-blur-2xl animate-in fade-in duration-300"
      role="status"
    >
      <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${isUnlimited ? "bg-emerald-500/20 text-emerald-400" : "bg-accent/20 text-accent"}`}>
        {isUnlimited ? <Wifi size={11} strokeWidth={2.4} /> : <Smartphone size={11} strokeWidth={2.4} />}
      </span>
      <div className="flex items-center gap-2 text-[11.5px] font-semibold leading-none tabular-nums text-white/90">
        <span>{consumedStr} streamed</span>
        <span className="text-white/25">|</span>
        <span className={isUnlimited ? "text-emerald-400 font-bold" : percentUsed > 80 ? "text-amber-400 font-bold" : "text-white/70"}>
          {remainingStr}
        </span>
      </div>
    </div>
  );
}
