import { ListMusic, Mic2, Pause, Play, Repeat, Repeat1, Shuffle, SkipBack, SkipForward, Volume2 } from "lucide-react";
import { useT } from "@/lib/i18n";
import { formatDuration } from "@/lib/music/library";
import {
  currentTrack,
  cycleRepeat,
  next,
  previous,
  seek,
  setShuffle,
  setVolume,
  togglePlay,
  usePlayer,
} from "@/lib/music/player";
import { Cover } from "./cover";

export function NowPlayingBar({
  lyricsOpen,
  onLyrics,
  onQueue,
}: {
  lyricsOpen: boolean;
  onLyrics: () => void;
  onQueue: () => void;
}) {
  const t = useT();
  const p = usePlayer();
  const track = currentTrack(p);
  const iconBtn = (on: boolean) =>
    `flex h-8 w-8 items-center justify-center rounded-md transition-colors hover:bg-elevated ${
      on ? "text-accent" : "text-ink-subtle hover:text-ink"
    }`;
  return (
    <div className="shrink-0 border-t border-edge-soft bg-canvas/95 px-4 py-2.5 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center gap-4">
        <div className="flex w-1/4 min-w-0 items-center gap-3">
          <Cover track={track} className="h-12 w-12" />
          <div className="flex min-w-0 flex-col">
            <span className="truncate text-[13.5px] font-semibold text-ink">
              {track?.title ?? t("Nothing playing")}
            </span>
            <span className="truncate text-[12px] text-ink-subtle">
              {p.error ?? track?.artist ?? ""}
            </span>
          </div>
        </div>
        <div className="flex min-w-0 flex-1 flex-col items-center gap-1">
          <div className="flex items-center gap-1">
            <button type="button" title={t("Shuffle")} onClick={() => setShuffle(!p.shuffle)} className={iconBtn(p.shuffle)}>
              <Shuffle size={15} />
            </button>
            <button type="button" title={t("Previous")} onClick={previous} className={iconBtn(false)}>
              <SkipBack size={17} fill="currentColor" />
            </button>
            <button
              type="button"
              title={p.playing ? t("Pause") : t("Play")}
              onClick={() => void togglePlay()}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-ink text-canvas"
            >
              {p.playing ? <Pause size={17} fill="currentColor" /> : <Play size={17} fill="currentColor" />}
            </button>
            <button type="button" title={t("Next")} onClick={next} className={iconBtn(false)}>
              <SkipForward size={17} fill="currentColor" />
            </button>
            <button type="button" title={t("Repeat")} onClick={cycleRepeat} className={iconBtn(p.repeat !== "off")}>
              {p.repeat === "one" ? <Repeat1 size={15} /> : <Repeat size={15} />}
            </button>
          </div>
          <div className="flex w-full items-center gap-2 text-[11.5px] tabular-nums text-ink-subtle">
            <span className="w-10 text-end">{formatDuration(p.position * 1000)}</span>
            <input
              type="range"
              min={0}
              max={Math.max(1, p.duration)}
              step={0.5}
              value={Math.min(p.position, p.duration || 0)}
              onChange={(e) => seek(Number(e.target.value))}
              disabled={!track}
              aria-label={t("Seek")}
              className="h-1 flex-1 accent-[var(--color-accent)]"
            />
            <span className="w-10">{formatDuration(p.duration * 1000)}</span>
          </div>
        </div>
        <div className="flex w-1/4 items-center justify-end gap-1">
          <button type="button" title={t("Lyrics")} onClick={onLyrics} className={iconBtn(lyricsOpen)}>
            <Mic2 size={15} />
          </button>
          <button type="button" title={t("Queue")} onClick={onQueue} className={iconBtn(false)}>
            <ListMusic size={15} />
          </button>
          <Volume2 size={15} className="ms-1 text-ink-subtle" />
          <input
            type="range"
            min={0}
            max={1}
            step={0.02}
            value={p.volume}
            onChange={(e) => setVolume(Number(e.target.value))}
            aria-label={t("Volume")}
            className="h-1 w-20 accent-[var(--color-accent)]"
          />
        </div>
      </div>
    </div>
  );
}
