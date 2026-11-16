import type { PlayerSnapshot } from "./bridge";
export const PLAYBACK_HELP_EVENT = "argus:playback-help";
export function openPlaybackHelp(): void {
  window.dispatchEvent(new Event(PLAYBACK_HELP_EVENT));
}
export function playbackAdvice(s: PlayerSnapshot, online: boolean): string[] {
  const advice: string[] = [];
  if (!online) advice.push("You are offline. Open a completed download or reconnect to stream.");
  if (s.errorCode === "codec" || s.errorCode === "decode")
    advice.push(
      "This format could not be decoded. Choose an H.264 / AAC source or use the native player.",
    );
  else if (s.errorCode === "network" || s.buffering)
    advice.push(
      "The source is not delivering video fast enough. Try a lower bitrate or another source.",
    );
  else if (s.status === "error")
    advice.push(
      "This source could not be opened. Choose another source; your current position is retained.",
    );
  if (s.muted || s.volume === 0) advice.push("Sound is muted. Restore volume to hear this stream.");
  else if (s.firstFrameReady && s.audioTracks.length === 0)
    advice.push("No audio track is available. Choose another source with audio.");
  if (s.firstFrameReady && s.subtitleTracks.length === 0)
    advice.push("No subtitles are loaded. Use the subtitle menu to find or add a subtitle.");
  if (!advice.length)
    advice.push(
      s.firstFrameReady
        ? "Playback is decoding normally. Select another source if the content or quality is wrong."
        : "Waiting for the first decoded frame. If this continues, choose another source.",
    );
  return advice;
}
