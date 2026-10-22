import { ArrowDown, ArrowUp, Download, ListPlus, Play, Trash2, X } from "lucide-react";
import { useMemo, useState } from "react";
import { save } from "@tauri-apps/plugin-dialog";
import { writeTextFile } from "@tauri-apps/plugin-fs";
import { useT } from "@/lib/i18n";
import { formatDuration } from "@/lib/music/library";
import { enqueue, playTracks } from "@/lib/music/player";
import {
  createPlaylist,
  deletePlaylist,
  moveInPlaylist,
  removeFromPlaylist,
  renamePlaylist,
  toM3u,
  usePlaylists,
} from "@/lib/music/playlists";
import type { Track } from "@/lib/music/types";
import { Cover } from "./cover";

export function PlaylistsTab({ tracks }: { tracks: Track[] }) {
  const t = useT();
  const playlists = usePlaylists();
  const byId = useMemo(() => new Map(tracks.map((x) => [x.id, x])), [tracks]);
  const [selected, setSelected] = useState<string | null>(null);
  const [name, setName] = useState("");
  const current = playlists.find((p) => p.id === selected) ?? null;
  // Tracks removed from disk are skipped rather than breaking the playlist.
  const items = current ? current.trackIds.map((id) => byId.get(id)).filter((x): x is Track => !!x) : [];

  const exportM3u = async () => {
    if (!current) return;
    try {
      const dest = await save({ defaultPath: `${current.name}.m3u8` });
      if (dest) await writeTextFile(dest, toM3u(current.name, items.map((x) => x.path)));
    } catch {
      /* dialog cancelled or write refused */
    }
  };

  return (
    <div className="flex min-h-0 flex-1 gap-4">
      <div className="flex w-56 shrink-0 flex-col gap-2">
        <form
          className="flex gap-1.5"
          onSubmit={(e) => {
            e.preventDefault();
            if (!name.trim()) return;
            setSelected(createPlaylist(name).id);
            setName("");
          }}
        >
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("New playlist")}
            className="min-w-0 flex-1 rounded-lg border border-edge-soft bg-elevated px-2.5 py-1.5 text-[13px] text-ink outline-none"
          />
          <button type="submit" title={t("Create playlist")} className="rounded-lg bg-accent px-2.5 text-canvas">
            <ListPlus size={15} />
          </button>
        </form>
        <ul className="flex flex-col gap-0.5 overflow-y-auto">
          {playlists.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => setSelected(p.id)}
                className={`flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-start text-[13.5px] ${
                  p.id === selected ? "bg-elevated text-ink" : "text-ink-muted hover:bg-elevated/60"
                }`}
              >
                <span className="truncate">{p.name}</span>
                <span className="text-[11.5px] text-ink-subtle">{p.trackIds.length}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        {!current ? (
          <p className="p-10 text-center text-[13.5px] text-ink-subtle">
            {playlists.length === 0 ? t("Create a playlist to get started.") : t("Select a playlist.")}
          </p>
        ) : (
          <>
            <div className="mb-3 flex items-center gap-2">
              <input
                key={current.id}
                defaultValue={current.name}
                onBlur={(e) => renamePlaylist(current.id, e.target.value)}
                className="min-w-0 flex-1 bg-transparent text-[20px] font-semibold text-ink outline-none"
              />
              <button type="button" title={t("Play")} disabled={items.length === 0} onClick={() => playTracks(items)} className="rounded-md p-2 text-ink-muted hover:bg-elevated hover:text-ink disabled:opacity-40">
                <Play size={16} />
              </button>
              <button type="button" title={t("Add to queue")} disabled={items.length === 0} onClick={() => enqueue(items)} className="rounded-md p-2 text-ink-muted hover:bg-elevated hover:text-ink disabled:opacity-40">
                <ListPlus size={16} />
              </button>
              <button type="button" title={t("Export M3U8")} disabled={items.length === 0} onClick={() => void exportM3u()} className="rounded-md p-2 text-ink-muted hover:bg-elevated hover:text-ink disabled:opacity-40">
                <Download size={16} />
              </button>
              <button
                type="button"
                title={t("Delete playlist")}
                onClick={() => {
                  deletePlaylist(current.id);
                  setSelected(null);
                }}
                className="rounded-md p-2 text-ink-muted hover:bg-elevated hover:text-ink"
              >
                <Trash2 size={16} />
              </button>
            </div>
            <ul className="min-h-0 flex-1 overflow-y-auto">
              {items.map((track, i) => (
                <li key={track.id} className="group flex items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-elevated/60">
                  <button type="button" onClick={() => playTracks(items, i)} className="flex min-w-0 flex-1 items-center gap-3 text-start">
                    <Cover track={track} className="h-9 w-9" />
                    <span className="flex min-w-0 flex-col">
                      <span className="truncate text-[13.5px] text-ink">{track.title}</span>
                      <span className="truncate text-[12px] text-ink-subtle">{track.artist}</span>
                    </span>
                  </button>
                  <span className="text-[12px] tabular-nums text-ink-subtle">{formatDuration(track.durationMs)}</span>
                  <div className="flex opacity-0 group-hover:opacity-100">
                    <button type="button" title={t("Move up")} onClick={() => moveInPlaylist(current.id, i, i - 1)} className="p-1.5 text-ink-subtle hover:text-ink">
                      <ArrowUp size={14} />
                    </button>
                    <button type="button" title={t("Move down")} onClick={() => moveInPlaylist(current.id, i, i + 1)} className="p-1.5 text-ink-subtle hover:text-ink">
                      <ArrowDown size={14} />
                    </button>
                    <button type="button" title={t("Remove")} onClick={() => removeFromPlaylist(current.id, track.id)} className="p-1.5 text-ink-subtle hover:text-ink">
                      <X size={14} />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}
