import type { MusicTrack } from "./types";

/** Explicit user input only. Never infer a playable endpoint from a provider page. */
export function directMusicStream(input: string): MusicTrack {
  let url: URL;
  try { url = new URL(input.trim()); } catch { throw new Error("Enter a complete HTTPS audio URL."); }
  if (url.protocol !== "https:" || url.username || url.password || url.hash) {
    throw new Error("Use an HTTPS audio URL without embedded credentials or a fragment.");
  }
  return {
    id: `direct:${crypto.randomUUID()}`, connectorId: "direct", playbackUrl: url.href,
    title: "Direct audio stream", artist: url.hostname, artwork: "",
    durationSeconds: 0, durationLabel: "", mediaKind: "audio",
  };
}
