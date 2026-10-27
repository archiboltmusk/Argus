import type { TrackInfo } from "@/lib/player/bridge";
import { normalizeLang } from "@/lib/subtitles/language";

type PreflightTrack = Pick<TrackInfo, "external" | "lang" | "prepared" | "timingStatus" | "localTrusted">;

export function hasNaturallyAlignedPreparedCandidate(
  tracks: readonly PreflightTrack[],
  selectedLanguage?: string | null,
): boolean {
  const selected = normalizeLang(selectedLanguage ?? "").split("-")[0];
  if (!selected) return false;
  return tracks.some((track) => {
    const langMatch = normalizeLang(track.lang ?? "").split("-")[0] === selected;
    if (!langMatch) return false;
    // 1) Aligned by preflight or naturally prepared
    if (track.timingStatus === "aligned") return true;
    // 2) Local trusted subtitle from the user's filesystem or trusted provider
    if (track.localTrusted === true) return true;
    return false;
  });
}

export function automaticAutoSyncMayStart(input: {
  preflightSettled: boolean;
  tracks: readonly PreflightTrack[];
  selectedLanguage?: string | null;
  selectedTrack?: PreflightTrack | null;
}): boolean {
  // If the currently selected track is already verified as aligned or local trusted, do not auto-sync
  if (
    input.selectedTrack &&
    (input.selectedTrack.timingStatus === "aligned" || input.selectedTrack.localTrusted === true)
  ) {
    return false;
  }

  return (
    input.preflightSettled &&
    !hasNaturallyAlignedPreparedCandidate(input.tracks, input.selectedLanguage)
  );
}
