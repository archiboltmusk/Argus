import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { ModalShell } from "@/components/modal-shell";
import { useView } from "@/lib/view";
import { useT } from "@/lib/i18n";
import {
  HANDOFF_EVENT,
  parsePlaybackHandoff,
  type PlaybackHandoff,
} from "@/lib/player/household-handoff";
export function acknowledgeHandoff(id: string, ok: boolean) {
  void invoke("remote_ws_broadcast", {
    payload: JSON.stringify({ t: "handoff-result", id, ok }),
  }).catch(() => {});
}
export function HandoffReceiver() {
  const { openPlayer } = useView();
  const [offer, setOffer] = useState<PlaybackHandoff | null>(null);
  const t = useT();
  useEffect(() => {
    let pending = false;
    const receive = (event: Event) => {
      const payload = parsePlaybackHandoff((event as CustomEvent).detail);
      if (!payload) return;
      if (pending) {
        acknowledgeHandoff(payload.id, false);
        return;
      }
      pending = true;
      setOffer(payload);
    };
    const clear = () => {
      pending = false;
    };
    window.addEventListener(HANDOFF_EVENT, receive);
    window.addEventListener("argus:handoff-dismiss", clear);
    return () => {
      window.removeEventListener(HANDOFF_EVENT, receive);
      window.removeEventListener("argus:handoff-dismiss", clear);
    };
  }, []);
  useEffect(() => {
    if (!offer) return;
    const timer = setTimeout(() => {
      acknowledgeHandoff(offer.id, false);
      setOffer(null);
      window.dispatchEvent(new Event("argus:handoff-dismiss"));
    }, 40_000);
    return () => clearTimeout(timer);
  }, [offer]);
  if (!offer) return null;
  const close = () => {
    acknowledgeHandoff(offer.id, false);
    setOffer(null);
    window.dispatchEvent(new Event("argus:handoff-dismiss"));
  };
  return (
    <ModalShell closing={false} onDismiss={close} labelledBy="handoff-title">
      <div className="space-y-4 p-6 text-ink">
        <h2 id="handoff-title" className="text-xl font-semibold">
          {t("Continue playback here?")}
        </h2>
        <p>
          {offer.title} · {Math.floor(offer.positionMs / 60000)}:
          {String(Math.floor(offer.positionMs / 1000) % 60).padStart(2, "0")}
        </p>
        <p>{t("Only accept a request from someone you trust on your home network.")}</p>
        <button
          type="button"
          className="rounded-lg border border-edge px-4 py-3"
          onClick={() => {
            const accepted = parsePlaybackHandoff(offer);
            if (!accepted) {
              close();
              return;
            }
            openPlayer({
              meta: { id: accepted.mediaId, name: accepted.title, type: accepted.mediaType },
              title: accepted.title,
              url: accepted.url,
              startPositionMs: accepted.positionMs,
              resume: false,
              suppressCloudSync: true,
              episode:
                accepted.season != null && accepted.episode != null
                  ? { season: accepted.season, episode: accepted.episode }
                  : undefined,
              subtitlePreselect: accepted.subtitle,
              handoff: accepted,
            });
            setOffer(null);
            window.dispatchEvent(new Event("argus:handoff-dismiss"));
          }}
        >
          {t("Continue here")}
        </button>
        <button type="button" className="rounded-lg border border-edge px-4 py-3" onClick={close}>
          {t("Decline")}
        </button>
      </div>
    </ModalShell>
  );
}
