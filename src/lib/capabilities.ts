import type { ScoreCapabilities } from "@/lib/streams/scoring/scoring-capability";

/** Reads what the current display can show; recomputed per ranking so moving windows between screens works. */
export function detectScoreCapabilities(engine: "mpv" | "html5"): ScoreCapabilities {
  let hdrDisplay = false;
  try {
    hdrDisplay = window.matchMedia("(dynamic-range: high)").matches;
  } catch {
    /* matchMedia unavailable: treat as SDR */
  }
  return { hdrDisplay, engine };
}
