import { normalizeLang } from "@/lib/subtitles/language";
import type { PlayerBridge, PlayerSnapshot, PlayerSource, TrackInfo } from "./bridge";

function matchingTrack(old: TrackInfo, tracks: TrackInfo[]): TrackInfo | undefined {
  const url = old.originalUrl || old.url;
  if (url) return tracks.find((track) => (track.originalUrl || track.url) === url);
  // IDs belong to a file, so match meaning before considering any new file's ID.
  return (
    tracks.find(
      (track) =>
        normalizeLang(track.lang) === normalizeLang(old.lang) &&
        track.label === old.label &&
        track.title === old.title,
    ) ??
    (old.lang
      ? tracks.find(
          (track) =>
            normalizeLang(track.lang) === normalizeLang(old.lang) && track.forced === old.forced,
        )
      : undefined)
  );
}

async function loadReady(
  bridge: PlayerBridge,
  source: PlayerSource,
  signal: AbortSignal,
  timeoutMs: number,
): Promise<PlayerSnapshot> {
  if (signal.aborted) throw new DOMException("Stream switch canceled", "AbortError");
  let unsubscribe = () => {};
  let timer: ReturnType<typeof setTimeout> | undefined;
  let armed = false;
  let abort = () => {};
  const ready = new Promise<PlayerSnapshot>((resolve, reject) => {
    abort = () => reject(new DOMException("Stream switch canceled", "AbortError"));
    if (signal.aborted) {
      abort();
      return;
    }
    signal.addEventListener("abort", abort, { once: true });
    timer = setTimeout(() => reject(new Error("Stream did not start in time")), timeoutMs);
    unsubscribe = bridge.subscribe((snapshot) => {
      if (!armed) return;
      if (snapshot.status === "error") reject(new Error(snapshot.errorMessage || "Stream failed"));
      else if (snapshot.firstFrameReady && ["ready", "playing", "paused"].includes(snapshot.status))
        resolve(snapshot);
    });
  });
  // Attach rejection handling before load, which can synchronously emit an error.
  const observed = ready.then(
    (snapshot) => ({ snapshot }),
    (error: unknown) => ({ error }),
  );
  try {
    armed = true;
    await Promise.race([
      bridge.load(source).then(async () => {
        if (!source.startPaused && !signal.aborted) await bridge.play({ reason: "stream-switch" });
      }),
      observed.then((result) => {
        if ("error" in result) throw result.error;
      }),
    ]);
    const result = await observed;
    if ("error" in result) throw result.error;
    return result.snapshot;
  } finally {
    unsubscribe();
    clearTimeout(timer);
    signal.removeEventListener("abort", abort);
  }
}

async function restoreSelection(
  bridge: PlayerBridge,
  before: PlayerSnapshot,
  after: PlayerSnapshot,
) {
  const audio = before.audioTracks.find((track) => track.selected);
  const subtitle = before.subtitleTracks.find((track) => track.selected && !track.secondary);
  const matchedAudio = audio && matchingTrack(audio, after.audioTracks);
  if (matchedAudio) bridge.setAudioTrack(matchedAudio.id);
  if (!subtitle) bridge.setSubtitleTrack(null, "manual");
  else {
    const matchedSubtitle = matchingTrack(subtitle, after.subtitleTracks);
    if (matchedSubtitle) bridge.setSubtitleTrack(matchedSubtitle.id, "manual");
    else if (subtitle.originalUrl || subtitle.url) {
      await bridge.addSubtitle(
        subtitle.originalUrl || subtitle.url!,
        subtitle.lang,
        subtitle.title || subtitle.label,
        true,
        {
          downloadAuth: subtitle.downloadAuth,
          format: subtitle.format,
          localTrusted: subtitle.localTrusted,
          providerDerived: subtitle.providerDerived,
        },
        "manual",
      );
    }
  }
  bridge.setRate(before.rate);
  bridge.setSubDelay(before.subDelaySec);
  bridge.setAudioDelay(before.audioDelaySec);
  bridge.setVolume(before.volume);
  bridge.setMuted(before.muted);
}

/** Commit a source only after decoded playback; failure restores the previous source and selections. */
export async function transitionStream(
  bridge: PlayerBridge,
  next: PlayerSource,
  previous: PlayerSource,
  snapshot: PlayerSnapshot,
  signal: AbortSignal,
  timeoutMs = 30_000,
): Promise<void> {
  try {
    const after = await loadReady(bridge, next, signal, timeoutMs);
    if (signal.aborted) return;
    await restoreSelection(bridge, snapshot, after);
  } catch (error) {
    // Another movie/switch owns the bridge after cancellation. Never load over it.
    if (signal.aborted) return;
    const restored = await loadReady(bridge, previous, signal, timeoutMs);
    if (!signal.aborted) await restoreSelection(bridge, snapshot, restored);
    throw error;
  }
}
