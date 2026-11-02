import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { EngineStats } from "@/lib/torrent/engine-stats";

const isTauri = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

async function getMpvProp<T = unknown>(name: string): Promise<T | null> {
  if (!isTauri) return null;
  try {
    const v = await invoke<T>("mpv_get_property", { name });
    return v ?? null;
  } catch {
    return null;
  }
}

function formatBytesPerSec(bytes: number): string {
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB/s`;
  }
  if (bytes >= 1024) {
    return `${(bytes / 1024).toFixed(0)} KB/s`;
  }
  return `${Math.round(bytes)} B/s`;
}

export function BufferingIndicator({
  show,
  engine = "mpv",
  engineStats,
  bufferedSec = 0,
}: {
  show: boolean;
  engine?: "html5" | "mpv";
  engineStats?: EngineStats | null;
  bufferedSec?: number;
}) {
  const [visible, setVisible] = useState(false);
  const [cacheBuffering, setCacheBuffering] = useState<number | null>(null);
  const [cacheSpeed, setCacheSpeed] = useState<number | null>(null);
  const [demuxerRunway, setDemuxerRunway] = useState<number | null>(null);

  useEffect(() => {
    if (!show) {
      setVisible(false);
      setCacheBuffering(null);
      setCacheSpeed(null);
      setDemuxerRunway(null);
      return;
    }
    const timer = window.setTimeout(() => setVisible(true), 250);
    return () => window.clearTimeout(timer);
  }, [show]);

  // Real-time polling of exact player buffer state while buffering indicator is active
  useEffect(() => {
    if (!visible || engine !== "mpv") return;
    let cancelled = false;

    const poll = async () => {
      const [cb, cs, dcd] = await Promise.all([
        getMpvProp<number>("cache-buffering-state"),
        getMpvProp<number>("cache-speed"),
        getMpvProp<number>("demuxer-cache-duration"),
      ]);
      if (cancelled) return;
      if (typeof cb === "number" && Number.isFinite(cb)) setCacheBuffering(cb);
      if (typeof cs === "number" && Number.isFinite(cs)) setCacheSpeed(cs);
      if (typeof dcd === "number" && Number.isFinite(dcd)) setDemuxerRunway(dcd);
    };

    void poll();
    const interval = window.setInterval(() => void poll(), 350);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [visible, engine]);

  if (!visible) return null;

  // Determine true buffering status
  const bufferPercent =
    cacheBuffering != null && Number.isFinite(cacheBuffering)
      ? Math.max(0, Math.min(100, Math.round(cacheBuffering)))
      : null;

  const speedBytes =
    engineStats && engineStats.downloadSpeed > 0
      ? engineStats.downloadSpeed
      : cacheSpeed != null && cacheSpeed > 0
        ? cacheSpeed
        : null;

  const runwaySec = demuxerRunway ?? (bufferedSec > 0 ? bufferedSec : null);

  // Status subtitle: precise truth
  let statusDetail = "Buffering stream…";
  if (engineStats && (engineStats.peers > 0 || engineStats.downloadSpeed > 0)) {
    const peers = engineStats.unchoked > 0 ? engineStats.unchoked : engineStats.peers;
    statusDetail = `${peers} peers · ${formatBytesPerSec(engineStats.downloadSpeed)}`;
  } else if (speedBytes != null && speedBytes > 0) {
    statusDetail = `${formatBytesPerSec(speedBytes)}${runwaySec ? ` · ${runwaySec.toFixed(1)}s cached` : ""}`;
  } else if (bufferPercent === 0 || (speedBytes === 0 && runwaySec === 0)) {
    statusDetail = "Awaiting response from host…";
  } else if (runwaySec != null && runwaySec > 0) {
    statusDetail = `${runwaySec.toFixed(1)}s ahead`;
  }

  return (
    <div className="pointer-events-none absolute inset-0 z-[15]">
      {/* Top-left Telemetry HUD: Real-time network speed & runway buffer stats */}
      <div className="absolute top-6 left-6 flex items-center gap-2 rounded-full border border-white/10 bg-black/70 px-3.5 py-1.5 backdrop-blur-md shadow-[0_8px_20px_-6px_rgba(0,0,0,0.7)] animate-in fade-in slide-in-from-top-2 duration-300">
        <span
          className={`h-2 w-2 rounded-full ${
            speedBytes != null && speedBytes > 0
              ? "bg-emerald-400 animate-pulse"
              : bufferPercent != null && bufferPercent > 0
                ? "bg-amber-400 animate-pulse"
                : "bg-rose-400"
          }`}
          aria-hidden
        />
        <span className="text-[12px] font-medium tracking-wide text-white/90 tabular-nums font-mono">
          {statusDetail}
        </span>
      </div>

      {/* Dead-center Circular Buffer Progress Meter */}
      <div className="flex h-full w-full items-center justify-center motion-safe:animate-in motion-safe:fade-in motion-safe:duration-250">
        <div className="relative flex h-18 w-18 items-center justify-center rounded-2xl border border-white/10 bg-black/60 backdrop-blur-xl shadow-[0_12px_36px_-8px_rgba(0,0,0,0.85)]">
          {/* Circular buffer meter */}
          <svg
            className="h-11 w-11 -rotate-90"
            viewBox="0 0 44 44"
            fill="none"
          >
            <circle cx="22" cy="22" r="18" stroke="currentColor" strokeOpacity="0.15" strokeWidth="3" className="text-white" />
            <circle
              cx="22"
              cy="22"
              r="18"
              stroke="currentColor"
              strokeWidth="3.5"
              strokeLinecap="round"
              strokeDasharray="113.1"
              strokeDashoffset={
                bufferPercent != null
                  ? 113.1 - (113.1 * bufferPercent) / 100
                  : 80
              }
              className={`${bufferPercent != null ? "text-amber-400 transition-[stroke-dashoffset] duration-300" : "text-white/80 motion-safe:animate-spin origin-center"}`}
            />
          </svg>

          {bufferPercent != null ? (
            <span className="absolute font-mono text-[11px] font-bold tracking-tight text-white tabular-nums">
              {bufferPercent}%
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
}
