import { useVirtualizer } from "@tanstack/react-virtual";
import { ListPlus, Play } from "lucide-react";
import { useRef, useState } from "react";
import { formatDuration } from "@/lib/music/library";
import { currentTrack, enqueue, playNext, playTracks, usePlayer } from "@/lib/music/player";
import { addToPlaylist, createPlaylist, usePlaylists } from "@/lib/music/playlists";
import type { Track } from "@/lib/music/types";
import { useT } from "@/lib/i18n";
import { Cover } from "./cover";

const ROW = 56;

export function AddToPlaylist({ trackIds }: { trackIds: string[] }) {
  const t = useT();
  const playlists = usePlaylists();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const done = () => {
    setOpen(false);
    setName("");
  };
  return (
    <div className="relative">
      <button
        type="button"
        title={t("Add to playlist")}
        onClick={() => setOpen((v) => !v)}
        className="flex h-8 w-8 items-center justify-center rounded-md text-ink-subtle transition-colors hover:bg-elevated hover:text-ink"
      >
        <ListPlus size={16} strokeWidth={2} />
      </button>
      {open && (
        <div className="absolute end-0 z-30 mt-1 w-56 rounded-xl border border-edge-soft bg-canvas p-1.5 shadow-xl">
          {playlists.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => {
                addToPlaylist(p.id, trackIds);
                done();
              }}
              className="block w-full truncate rounded-md px-2.5 py-1.5 text-start text-[13px] text-ink-muted hover:bg-elevated hover:text-ink"
            >
              {p.name}
            </button>
          ))}
          <form
            className="flex gap-1.5 p-1"
            onSubmit={(e) => {
              e.preventDefault();
              if (!name.trim()) return;
              createPlaylist(name, trackIds);
              done();
            }}
          >
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("New playlist")}
              className="min-w-0 flex-1 rounded-md border border-edge-soft bg-elevated px-2 py-1 text-[12.5px] text-ink outline-none"
            />
            <button
              type="submit"
              className="rounded-md bg-accent px-2.5 text-[12px] font-semibold text-canvas"
            >
              {t("Add")}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

/** Virtualised track table; `tracks` is the play context, so clicking a row queues the whole list. */
export function TrackList({ tracks, showAlbum = true }: { tracks: Track[]; showAlbum?: boolean }) {
  const t = useT();
  const player = usePlayer();
  const now = currentTrack(player);
  const scroller = useRef<HTMLDivElement>(null);
  const virt = useVirtualizer({
    count: tracks.length,
    getScrollElement: () => scroller.current,
    estimateSize: () => ROW,
    overscan: 10,
  });
  return (
    <div ref={scroller} className="min-h-0 flex-1 overflow-y-auto">
      <div style={{ height: virt.getTotalSize(), position: "relative" }}>
        {virt.getVirtualItems().map((v) => {
          const track = tracks[v.index];
          const active = now?.id === track.id;
          return (
            <div
              key={track.id}
              className={`group absolute inset-x-0 flex items-center gap-3 rounded-lg px-2 hover:bg-elevated/60 ${
                active ? "bg-elevated/70" : ""
              }`}
              style={{ height: ROW, transform: `translateY(${v.start}px)` }}
              onDoubleClick={() => playTracks(tracks, v.index)}
            >
              <button
                type="button"
                onClick={() => playTracks(tracks, v.index)}
                title={t("Play")}
                className="relative shrink-0"
              >
                <Cover track={track} className="h-10 w-10" />
                <span className="absolute inset-0 hidden items-center justify-center rounded-lg bg-black/45 text-white group-hover:flex">
                  <Play size={16} fill="currentColor" />
                </span>
              </button>
              <div className="flex min-w-0 flex-1 flex-col">
                <span className={`truncate text-[14px] ${active ? "text-accent" : "text-ink"}`}>
                  {track.title}
                </span>
                <span className="truncate text-[12px] text-ink-subtle">
                  {track.artist || t("Unknown artist")}
                </span>
              </div>
              {showAlbum && (
                <span className="hidden w-1/4 truncate text-[12.5px] text-ink-subtle md:block">
                  {track.album}
                </span>
              )}
              <span className="w-12 text-end text-[12.5px] tabular-nums text-ink-subtle">
                {formatDuration(track.durationMs)}
              </span>
              <div className="flex items-center opacity-0 transition-opacity group-hover:opacity-100">
                <button
                  type="button"
                  title={t("Play next")}
                  onClick={() => playNext([track])}
                  className="rounded-md px-2 py-1 text-[11.5px] font-semibold text-ink-subtle hover:bg-elevated hover:text-ink"
                >
                  {t("Next")}
                </button>
                <button
                  type="button"
                  title={t("Add to queue")}
                  onClick={() => enqueue([track])}
                  className="rounded-md px-2 py-1 text-[11.5px] font-semibold text-ink-subtle hover:bg-elevated hover:text-ink"
                >
                  {t("Queue")}
                </button>
                <AddToPlaylist trackIds={[track.id]} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
