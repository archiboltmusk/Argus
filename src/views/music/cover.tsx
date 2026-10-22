import { Music } from "lucide-react";
import { useEffect, useState } from "react";
import { getCover } from "@/lib/music/library";
import type { Track } from "@/lib/music/types";

export function Cover({ track, className = "" }: { track: Track | null; className?: string }) {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    setSrc(null);
    if (track) {
      void getCover(track).then((s) => {
        if (!cancelled) setSrc(s);
      });
    }
    return () => {
      cancelled = true;
    };
  }, [track?.id]);
  return (
    <div
      className={`flex shrink-0 items-center justify-center overflow-hidden rounded-lg bg-elevated text-ink-subtle ${className}`}
    >
      {src ? (
        <img src={src} alt="" className="h-full w-full object-cover" draggable={false} />
      ) : (
        <Music size={18} strokeWidth={1.8} />
      )}
    </div>
  );
}
