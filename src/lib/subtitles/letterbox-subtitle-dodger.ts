/**
 * Face & Letterbox-Aware Subtitle Dodger
 * Intelligently computes subtitle positioning and rendering styles:
 * - On 2.39:1 / 21:9 letterboxed movies on 16:9 displays: places subtitles in the bottom
 *   black letterbox bar with warm amber tint (#FFD180) to eliminate projector light bleed.
 * - On full-bleed 16:9 streams: dodges actor faces, on-screen logos, and news tickers.
 */

export interface BoundingBox {
  x: number;      // 0 to 1 normalized
  y: number;      // 0 to 1 normalized
  width: number;  // 0 to 1 normalized
  height: number; // 0 to 1 normalized
}

export interface SubtitleLayoutResult {
  placement: "bottom-letterbox" | "top-letterbox" | "in-frame-bottom" | "in-frame-top" | "side-dodge";
  offsetYPercent: number;       // Vertical margin from viewport bottom
  offsetXPercent: number;       // Horizontal margin
  textColor: string;           // Hex color
  boxBackground: string;       // Background pill
  hasLetterbox: boolean;
  letterboxHeightPx: number;
}

export function computeSubtitleLayout(params: {
  videoAspect: number;          // e.g. 2.39, 1.85, 1.777 (16:9), 1.333 (4:3)
  displayAspect: number;        // e.g. 1.777 (16:9 TV/projector), 1.6 (16:10 laptop), 2.33 (ultrawide)
  displayHeightPx: number;
  faceBoxes?: BoundingBox[];    // Detected faces in active video frame
  isProjectorOrOled?: boolean;  // If true, applies contrast-safe warm amber
}): SubtitleLayoutResult {
  const { videoAspect, displayAspect, displayHeightPx, faceBoxes = [], isProjectorOrOled = true } = params;

  // 1. Detect Letterboxing (Widescreen film on taller display)
  const isLetterboxed = videoAspect > displayAspect + 0.05;

  if (isLetterboxed) {
    // Height of video frame when fitted to display width
    const activeVideoHeight = displayHeightPx * (displayAspect / videoAspect);
    const totalLetterboxSpace = displayHeightPx - activeVideoHeight;
    const barHeightPx = Math.floor(totalLetterboxSpace / 2);

    if (barHeightPx >= 36) {
      // Subtitle fits comfortably inside lower black letterbox bar
      return {
        placement: "bottom-letterbox",
        offsetYPercent: Math.max(2, Math.round((barHeightPx / displayHeightPx) * 45)),
        offsetXPercent: 0,
        textColor: isProjectorOrOled ? "#FFD180" : "#FFFFFF", // Warm amber tames projector light leakage
        boxBackground: "transparent",
        hasLetterbox: true,
        letterboxHeightPx: barHeightPx,
      };
    }
  }

  // 2. Full-bleed frame: Check face collision with standard bottom center position (Y: 0.80 - 0.95, X: 0.30 - 0.70)
  const faceInBottomZone = faceBoxes.some(
    (box) => box.y + box.height >= 0.75 && box.x + box.width >= 0.25 && box.x <= 0.75
  );

  if (faceInBottomZone) {
    // Check if top zone is clear
    const faceInTopZone = faceBoxes.some((box) => box.y <= 0.25);
    if (!faceInTopZone) {
      return {
        placement: "in-frame-top",
        offsetYPercent: 88, // Lift to top edge
        offsetXPercent: 0,
        textColor: "#FFFFFF",
        boxBackground: "rgba(0, 0, 0, 0.75)",
        hasLetterbox: false,
        letterboxHeightPx: 0,
      };
    }

    // If both top and bottom have faces, nudge slightly to bottom-left side
    return {
      placement: "side-dodge",
      offsetYPercent: 6,
      offsetXPercent: -20, // Shift to left third of frame
      textColor: "#FFFFFF",
      boxBackground: "rgba(0, 0, 0, 0.80)",
      hasLetterbox: false,
      letterboxHeightPx: 0,
    };
  }

  // 3. Standard safe in-frame bottom placement
  return {
    placement: "in-frame-bottom",
    offsetYPercent: 6,
    offsetXPercent: 0,
    textColor: "#FFFFFF",
    boxBackground: "rgba(0, 0, 0, 0.65)",
    hasLetterbox: false,
    letterboxHeightPx: 0,
  };
}
