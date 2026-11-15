import { requestMusicPanel } from "@/lib/music/navigation";
import { useState } from "react";
import { cwProfileScope } from "@/lib/cw-profile";
import { createMusicPlaylist, addTracksToMusicPlaylist } from "@/lib/music/library";
import {
  excludedFromTaste,
  setTasteExcluded,
  radioFocus,
  setRadioFocus,
  tuneRadio,
  type RadioFocus,
} from "@/lib/music/listening-controls";
import { musicUpcoming, musicPriorityNext } from "@/lib/music/transport";
import { musicTrackIdentity } from "@/lib/music/track-identity";
import { getMusicState, setMusicQueue } from "@/lib/music/player";

export function MusicListeningControls() {
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [, refresh] = useState(0);
  const state = getMusicState();
  const current = state.current;
  return (
    <details className="border-b border-edge-soft px-5 py-3 text-sm">
      <summary className="cursor-pointer font-semibold">Listening controls</summary>
      <div className="mt-3 flex flex-col gap-3">
        <button
          type="button"
          className="rounded bg-elevated p-2 text-start"
          onClick={() => requestMusicPanel("__audio")}
        >
          Audio quality and song transitions
        </button>
        {current && (
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={excludedFromTaste(current)}
              onChange={(event) => {
                setTasteExcluded(current, event.target.checked);
                refresh((value) => value + 1);
                setNotice(
                  "Taste preference saved. Reload personalized mixes to apply it. Your library and history are unchanged.",
                );
              }}
            />
            Exclude this song from personalized mix seeds
          </label>
        )}
        <label className="flex flex-col gap-1">
          Radio focus
          <select
            className="rounded bg-elevated p-2"
            value={radioFocus()}
            onChange={(event) => {
              const focus = event.target.value as RadioFocus;
              setRadioFocus(focus);
              const latest = getMusicState();
              const at = Math.max(0, latest.queueIndex + 1);
              const priority = musicPriorityNext();
              const tail = latest.queue.slice(at);
              const pinned = priority
                ? tail.filter((track) => musicTrackIdentity(track) === musicTrackIdentity(priority))
                : [];
              const rest = priority
                ? tail.filter((track) => musicTrackIdentity(track) !== musicTrackIdentity(priority))
                : tail;
              setMusicQueue([
                ...latest.queue.slice(0, at),
                ...pinned,
                ...tuneRadio(rest, [...latest.recents, ...latest.likedTracks], focus),
              ]);
              refresh((value) => value + 1);
              setNotice(
                "Upcoming songs reordered. Current playback and Play Next are preserved; shuffle still controls shuffled playback.",
              );
            }}
          >
            <option value="balanced">Balanced</option>
            <option value="familiar">Familiar first</option>
            <option value="discover">Discover first</option>
          </select>
        </label>
        <form
          className="flex flex-wrap gap-2"
          onSubmit={async (event) => {
            event.preventDefault();
            if (busy || !name.trim()) return;
            const latest = getMusicState();
            const owner = cwProfileScope().profileId;
            const priority = musicPriorityNext();
            const ahead = musicUpcoming(
              latest.queue,
              latest.queueIndex,
              latest.queue.length,
              false,
            );
            const tracks = [
              ...(latest.current ? [latest.current] : []),
              ...(priority ? [priority] : []),
              ...ahead.filter(
                (track) => !priority || musicTrackIdentity(track) !== musicTrackIdentity(priority),
              ),
            ];
            if (!tracks.length) {
              setNotice("The queue is empty.");
              return;
            }
            setBusy(true);
            try {
              const playlist = await createMusicPlaylist(name.trim());
              if (cwProfileScope().profileId !== owner)
                throw new Error("Profile changed. Saving stopped before adding tracks.");
              await addTracksToMusicPlaylist(playlist.id, tracks);
              setNotice(`Saved ${tracks.length} songs to ${playlist.name}.`);
              setName("");
            } catch {
              setNotice(
                "Could not finish saving. Check your library for a newly created empty playlist before retrying.",
              );
            } finally {
              setBusy(false);
            }
          }}
        >
          <label className="flex flex-1 flex-col gap-1">
            Save current song and upcoming queue
            <input
              required
              maxLength={120}
              className="min-w-0 rounded bg-elevated p-2"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Playlist name"
            />
          </label>
          <button
            className="self-end rounded bg-elevated px-3 py-2"
            disabled={busy || !name.trim()}
          >
            {busy ? "Saving…" : "Save queue"}
          </button>
        </form>
        <p role="status" className="text-ink-muted">
          {notice}
        </p>
      </div>
    </details>
  );
}
