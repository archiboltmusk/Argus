import { ArrowDown, ArrowUp, X } from "lucide-react";
import { useT } from "@/lib/i18n";
import { formatDuration } from "@/lib/music/library";
import { clearQueue, moveInQueue, playQueueIndex, removeFromQueue, usePlayer } from "@/lib/music/player";
import { Cover } from "./cover";

export function QueueTab() {
  const t = useT();
  const p = usePlayer();
  if (p.queue.length === 0) {
    return <p className="p-10 text-center text-[13.5px] text-ink-subtle">{t("The queue is empty.")}</p>;
  }
  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="mb-2 flex items-center justify-between px-2">
        <span className="text-[12px] text-ink-subtle">
          {t("{n} tracks", { n: p.queue.length })}
        </span>
        <button type="button" onClick={clearQueue} className="text-[12px] font-semibold text-ink-subtle hover:text-ink">
          {t("Clear queue")}
        </button>
      </div>
      <ul className="flex flex-col">
        {p.queue.map((track, i) => (
          <li
            key={`${track.id}:${i}`}
            className={`group flex items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-elevated/60 ${
              i === p.index ? "bg-elevated/70" : ""
            }`}
          >
            <button type="button" onClick={() => playQueueIndex(i)} className="flex min-w-0 flex-1 items-center gap-3 text-start">
              <Cover track={track} className="h-9 w-9" />
              <span className="flex min-w-0 flex-col">
                <span className={`truncate text-[13.5px] ${i === p.index ? "text-accent" : "text-ink"}`}>{track.title}</span>
                <span className="truncate text-[12px] text-ink-subtle">{track.artist}</span>
              </span>
            </button>
            <span className="text-[12px] tabular-nums text-ink-subtle">{formatDuration(track.durationMs)}</span>
            <div className="flex opacity-0 group-hover:opacity-100">
              <button type="button" title={t("Move up")} onClick={() => moveInQueue(i, i - 1)} className="p-1.5 text-ink-subtle hover:text-ink">
                <ArrowUp size={14} />
              </button>
              <button type="button" title={t("Move down")} onClick={() => moveInQueue(i, i + 1)} className="p-1.5 text-ink-subtle hover:text-ink">
                <ArrowDown size={14} />
              </button>
              <button type="button" title={t("Remove")} onClick={() => removeFromQueue(i)} className="p-1.5 text-ink-subtle hover:text-ink">
                <X size={14} />
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
