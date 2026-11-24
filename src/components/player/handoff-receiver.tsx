import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { ModalShell } from "@/components/modal-shell";
import { useView } from "@/lib/view";
import { useT } from "@/lib/i18n";
import {
  HANDOFF_EVENT,
  parsePlaybackHandoff,
  type PlaybackHandoff,
} from "@/lib/player/household-handoff";

function normalizeRawHandoff(raw: unknown): PlaybackHandoff | null {
  if (!raw || typeof raw !== "object") return null;
  const parsed = parsePlaybackHandoff(raw);
  if (parsed) return parsed;
  const obj = raw as Record<string, unknown>;
  const url = (obj.url ?? obj.streamUrl) as string | undefined;
  if (!url || typeof url !== "string") return null;
  return {
    id: (obj.id as string) ?? `handoff-${Date.now()}`,
    title: (obj.title as string) ?? "Playback Handoff",
    mediaId: (obj.mediaId ?? obj.metaId ?? "argus:stream") as string,
    mediaType: obj.season != null ? "series" : "movie",
    url,
    positionMs: Number(obj.positionMs) || 0,
    createdAt: Date.now(),
    season: typeof obj.season === "number" ? obj.season : undefined,
    episode: typeof obj.episode === "number" ? obj.episode : undefined,
    subtitle: (obj.subtitle as any) ?? { off: false },
  };
}

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
    const handlePayload = (raw: unknown) => {
      const payload = normalizeRawHandoff(raw);
      if (!payload) return;
      if (pending) {
        acknowledgeHandoff(payload.id, false);
        return;
      }
      pending = true;
      setOffer(payload);
    };

    const receive = (event: Event) => {
      handlePayload((event as CustomEvent).detail);
    };
    const clear = () => {
      pending = false;
    };

    window.addEventListener(HANDOFF_EVENT, receive);
    window.addEventListener("argus:handoff-dismiss", clear);

    const unlistenPromise = listen<unknown>("argus://remote-handoff", (e) => {
      handlePayload(e.payload);
    });

    return () => {
      window.removeEventListener(HANDOFF_EVENT, receive);
      window.removeEventListener("argus:handoff-dismiss", clear);
      unlistenPromise.then((unlisten) => unlisten()).catch(() => {});
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
