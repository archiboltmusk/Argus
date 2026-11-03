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

/**
 * Minimal, elegant buffering indicator adhering to Harbor design language.
 * Free of harsh colored badges, blocky percentage meters, or screen clutter.
 */
export function BufferingIndicator({
  show,
  engine = "mpv",
}: {
  show: boolean;
  engine?: "html5" | "mpv";
  engineStats?: EngineStats | null;
  bufferedSec?: number;
}) {
  const [visible, setVisible] = useState(false);
  const [cacheBuffering, setCacheBuffering] = useState<number | null>(null);

  useEffect(() => {
    if (!show) {
      setVisible(false);
      setCacheBuffering(null);
      return;
    }
    // Subtle delay prevents rapid flashing during micro-seeks or instant frame drops
    const timer = window.setTimeout(() => setVisible(true), 180);
    return () => window.clearTimeout(timer);
  }, [show]);

  useEffect(() => {
    if (!visible || engine !== "mpv") return;
    let cancelled = false;

    const poll = async () => {
      const cb = await getMpvProp<number>("cache-buffering-state");
      if (cancelled) return;
      if (typeof cb === "number" && Number.isFinite(cb)) setCacheBuffering(cb);
    };

    void poll();
    const interval = window.setInterval(() => void poll(), 250);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [visible, engine]);

  // If the cache is full (>= 98%) or not visible, hide immediately
  if (!visible) return null;
  if (cacheBuffering != null && cacheBuffering >= 98) return null;

  return (
    <div className="pointer-events-none absolute inset-0 z-[15] flex items-center justify-center">
      {/* Minimal Harbor-style ethereal spinner */}
      <div className="flex items-center justify-center motion-safe:animate-in motion-safe:fade-in motion-safe:duration-200">
        <div className="relative flex h-13 w-13 items-center justify-center rounded-full bg-black/40 backdrop-blur-md shadow-[0_8px_24px_-4px_rgba(0,0,0,0.5)]">
          <svg
            className="h-7 w-7 motion-safe:animate-spin"
            viewBox="0 0 32 32"
            fill="none"
          >
            <circle
              cx="16"
              cy="16"
              r="13"
              stroke="currentColor"
              strokeOpacity="0.15"
              strokeWidth="2.5"
              className="text-white"
            />
            <path
              d="M16 3 A 13 13 0 0 1 29 16"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              className="text-white"
            />
          </svg>
        </div>
      </div>
    </div>
  );
}
