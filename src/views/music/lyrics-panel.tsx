import { useEffect, useRef, useState } from "react";
import { useT } from "@/lib/i18n";
import { activeLine } from "@/lib/music/lrc";
import { getLyrics, type Lyrics } from "@/lib/music/lyrics";
import { seek } from "@/lib/music/player";
import type { Track } from "@/lib/music/types";

export function LyricsPanel({
  track,
  position,
  online,
}: {
  track: Track | null;
  position: number;
  online: boolean;
}) {
  const t = useT();
  const [lyrics, setLyrics] = useState<Lyrics | null>(null);
  const [loading, setLoading] = useState(false);
  const activeRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLyrics(null);
    if (!track) return;
    setLoading(true);
    void getLyrics(track, online).then((l) => {
      if (cancelled) return;
      setLyrics(l);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [track?.id, online]);

  const current = lyrics?.synced ? activeLine(lyrics.lines, position) : -1;
  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [current]);

  if (!track) return null;
  if (!lyrics) {
    return (
      <p className="p-6 text-center text-[13px] text-ink-subtle">
        {loading
          ? t("Looking for lyrics...")
          : online
            ? t("No lyrics found. Add a .lrc file next to the track or embed lyrics in its tags.")
            : t("No local lyrics. Add a .lrc file next to the track, or turn on online lyrics in Settings.")}
      </p>
    );
  }
  return (
    <div className="flex flex-col gap-1 overflow-y-auto px-6 py-10">
      {lyrics.lines.map((line, i) => (
        <button
          key={i}
          ref={i === current ? activeRef : undefined}
          type="button"
          disabled={line.time === null}
          onClick={() => line.time !== null && seek(line.time)}
          className={`text-start text-[20px] font-semibold leading-snug transition-colors ${
            i === current ? "text-ink" : lyrics.synced ? "text-ink-subtle/60 hover:text-ink-muted" : "text-ink-muted"
          } ${line.text ? "" : "h-4"}`}
        >
          {line.text}
        </button>
      ))}
    </div>
  );
}
