import type { ParsedStream, ScoreReason } from "../types";

export type ScoreCapabilities = {
  /** The active display can show HDR (EDR headroom on macOS). */
  hdrDisplay: boolean;
  /** "mpv" tone-maps and handles Dolby Vision itself; the web engine cannot. */
  engine: "mpv" | "html5";
  /** Running in web browser sandbox */
  isWeb?: boolean;
};

/**
 * Adjusts the plain HDR bonus to what the screen and player can actually show,
 * so a DV or HDR file is not preferred blindly on a display that cannot use it.
 * Returns the delta to add on top of the base score (negative cancels the bonus).
 */
export function capabilityAdjust(s: ParsedStream, caps: ScoreCapabilities | undefined): ScoreReason | null {
  if (!caps || !s.hdrFormat) return null;
  const isDv = s.hdrFormat === "DV" || s.hdrFormat === "DV+HDR10";
  const base = isDv ? 6 : 5;
  if (caps.engine === "html5" && s.hdrFormat === "DV") {
    // Profile 5 files have no HDR10 base layer and show purple/green without a DV decoder.
    return { signal: "dv-unsupported", delta: -(base + 10) };
  }
  if (!caps.hdrDisplay) {
    return { signal: "sdr-display", delta: -(base + 3) };
  }
  return null;
}
