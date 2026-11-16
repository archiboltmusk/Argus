import { useEffect, useRef } from "react";
import type { PlayerSnapshot } from "@/lib/player/bridge";
import type { PlayerStreamRef } from "@/lib/view";
import { rememberWorkingSource } from "@/lib/player/source-memory";
import { activeScopedProfileId } from "@/lib/active-profile-id";
import { getPlaybackPosition, subscribePlaybackClock } from "@/lib/player/playback-clock";
export function useSourceMemory(
  url: string,
  stream: PlayerStreamRef | undefined,
  snap: PlayerSnapshot,
) {
  const latest = useRef({ stream, snap });
  latest.current = { stream, snap };
  const owner = activeScopedProfileId();
  useEffect(() => {
    let start = Date.now(),
      position = getPlaybackPosition(),
      saved = false;
    const observe = () => {
      const { stream, snap } = latest.current;
      const current = getPlaybackPosition();
      if (
        owner !== activeScopedProfileId() ||
        snap.status !== "playing" ||
        snap.buffering ||
        !snap.firstFrameReady
      ) {
        start = Date.now();
        position = current;
        return;
      }
      if (!saved && Date.now() - start >= 10_000 && current - position >= 5 && stream?.addonId) {
        rememberWorkingSource({
          addonId: stream.addonId,
          resolution: stream.resolution ?? "",
          audioLanguage: snap.audioTracks.find((track) => track.selected)?.lang,
        });
        saved = true;
      }
    };
    observe();
    return subscribePlaybackClock(observe);
  }, [url, owner]);
}
