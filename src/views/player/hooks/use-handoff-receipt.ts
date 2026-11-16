import { useEffect, useRef } from "react";
import type { PlayerSnapshot } from "@/lib/player/bridge";
import type { PlayerSrc } from "@/lib/view";
import { handoffPlaybackMatches } from "@/lib/player/household-handoff";
import { acknowledgeHandoff } from "@/components/player/handoff-receiver";
import { getPlaybackPosition, subscribePlaybackClock } from "@/lib/player/playback-clock";
export function useHandoffReceipt(src: PlayerSrc, snap: PlayerSnapshot) {
  const latest = useRef(snap);
  latest.current = snap;
  const done = useRef("");
  useEffect(() => {
    const request = src.handoff;
    if (!request || done.current === request.id) return;
    const observe = () => {
      if (done.current === request.id) return;
      if (handoffPlaybackMatches(request, latest.current, getPlaybackPosition())) {
        acknowledgeHandoff(request.id, true);
        done.current = request.id;
      } else if (latest.current.status === "error") {
        acknowledgeHandoff(request.id, false);
        done.current = request.id;
      }
    };
    const timer = setTimeout(() => {
      if (done.current !== request.id) {
        acknowledgeHandoff(request.id, false);
        done.current = request.id;
      }
    }, 25_000);
    observe();
    const unsubscribe = subscribePlaybackClock(observe);
    return () => {
      clearTimeout(timer);
      unsubscribe();
    };
  }, [src.handoff]);
}
