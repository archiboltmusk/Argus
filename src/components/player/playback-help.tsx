import { getPlaybackPosition } from "@/lib/player/playback-clock";
import type { PlayerSrc } from "@/lib/view";
import { sendPlaybackHandoff, transferableUrl } from "@/lib/player/household-handoff";
import { playbackAudioChoice } from "@/lib/player/audio-choice";
import { useEffect, useState } from "react";
import type { PlayerBridge, PlayerSnapshot } from "@/lib/player/bridge";
import { PLAYBACK_HELP_EVENT, playbackAdvice } from "@/lib/player/playback-help";
import { useT } from "@/lib/i18n";
import { ModalShell } from "@/components/modal-shell";
import { copyText } from "./copy-link-button";
export function PlaybackHelp({
  snap,
  bridge,
  chooseSource,
  reload,
  src,
}: {
  snap: PlayerSnapshot;
  bridge: PlayerBridge | null;
  chooseSource: () => void;
  reload: () => void;
  src: PlayerSrc;
}) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [address, setAddress] = useState("");
  const [handoffState, setHandoffState] = useState("");
  const [sending, setSending] = useState(false);
  const t = useT();
  useEffect(() => {
    const show = () => {
      setCopied(false);
      setOpen(true);
    };
    window.addEventListener(PLAYBACK_HELP_EVENT, show);
    return () => window.removeEventListener(PLAYBACK_HELP_EVENT, show);
  }, []);
  if (!open) return null;
  const advice = playbackAdvice(snap, navigator.onLine);
  const run = (action: () => void) => {
    setOpen(false);
    action();
  };
  return (
    <ModalShell closing={false} onDismiss={() => setOpen(false)} labelledBy="playback-help-title">
      <div className="space-y-4 p-5 text-ink">
        <h2 id="playback-help-title" className="text-xl font-semibold">
          {t("Fix playback")}
        </h2>
        <button type="button" onClick={() => setOpen(false)}>
          {t("Close")}
        </button>
        <ul className="list-disc space-y-2 ps-5">
          {advice.map((line) => (
            <li key={line}>{t(line)}</li>
          ))}
        </ul>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="rounded-lg border border-edge px-4 py-3"
            onClick={() => run(chooseSource)}
          >
            {t("Choose another source")}
          </button>
          <button
            type="button"
            className="rounded-lg border border-edge px-4 py-3"
            onClick={() => run(reload)}
          >
            {t("Reload source")}
          </button>
          {(snap.muted || snap.volume === 0) && (
            <button
              type="button"
              className="rounded-lg border border-edge px-4 py-3"
              onClick={() =>
                run(() => {
                  bridge?.setMuted(false);
                  bridge?.setVolume(70);
                })
              }
            >
              {t("Restore sound")}
            </button>
          )}
          <button
            type="button"
            className="rounded-lg border border-edge px-4 py-3"
            onClick={() =>
              void copyText(
                JSON.stringify(
                  {
                    status: snap.status,
                    firstFrameReady: snap.firstFrameReady,
                    buffering: snap.buffering,
                    bufferedSec: snap.bufferedSec,
                    errorCode: snap.errorCode,
                    video: [snap.videoWidth, snap.videoHeight],
                    audioTracks: snap.audioTracks.length,
                    subtitleTracks: snap.subtitleTracks.length,
                    online: navigator.onLine,
                  },
                  null,
                  2,
                ),
              ).then(setCopied)
            }
          >
            {copied ? t("Copied") : t("Copy playback diagnostics")}
          </button>
        </div>
        <section className="space-y-2 border-t border-edge pt-4">
          <h3 className="font-semibold">{t("Continue on another device")}</h3>
          <p className="text-sm">
            {t(
              "Enable Phone remote on the receiving Argus device, enter its address, then accept the request there. Your current player keeps running until you choose to stop it.",
            )}
          </p>
          <p className="text-sm text-ink-subtle">
            {t(
              "The stream link is shared over your home network. Use only a trusted network and device. Local-only streams cannot be transferred.",
            )}
          </p>
          <input
            aria-label={t("Receiving device address")}
            placeholder="192.168.1.20:11471"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className="rounded-lg border border-edge bg-canvas p-3"
          />
          <button
            type="button"
            disabled={sending || !address || !transferableUrl(src.url)}
            className="rounded-lg border border-edge px-4 py-3 disabled:opacity-50"
            onClick={() => {
              setSending(true);
              setHandoffState(t("Waiting for the receiving device…"));
              const audio = snap.audioTracks.find((track) => track.selected);
              const subtitle = snap.subtitleTracks.find((track) => track.selected);
              void Promise.resolve()
                .then(() =>
                  sendPlaybackHandoff(address.trim(), {
                    id: crypto.randomUUID(),
                    title: src.meta.name,
                    mediaId: src.meta.id,
                    mediaType: src.episode || src.meta.type === "series" ? "series" : "movie",
                    url: src.url,
                    positionMs: getPlaybackPosition() * 1000,
                    createdAt: Date.now(),
                    season: src.episode?.season,
                    episode: src.episode?.episode,
                    audio: audio ? playbackAudioChoice(audio) : undefined,
                    subtitle: subtitle
                      ? {
                          off: false,
                          lang: subtitle.lang,
                          title: subtitle.title ?? subtitle.label,
                          url: subtitle.originalUrl || subtitle.url,
                        }
                      : { off: true },
                  }),
                )
                .then((ok) =>
                  setHandoffState(
                    t(
                      ok
                        ? "Playback verified on the receiving device."
                        : "Handoff was not verified. Your original playback is still available.",
                    ),
                  ),
                )
                .catch(() => setHandoffState(t("Could not reach that device.")))
                .finally(() => setSending(false));
            }}
          >
            {t("Send playback")}
          </button>
          {handoffState && <p role="status">{handoffState}</p>}
        </section>
        <p className="text-sm text-ink-subtle">
          {t("Diagnostics exclude stream links, titles and account credentials.")}
        </p>
      </div>
    </ModalShell>
  );
}
