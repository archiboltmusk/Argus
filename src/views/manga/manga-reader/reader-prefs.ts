import type { CSSProperties } from "react";
import type { ReaderBg, ReaderColorFilter, ReaderFit, ReaderPrefs } from "./reader-types";

export const PREFS_KEY = "argus.manga.reader.v1";

export const DEFAULT_PREFS: ReaderPrefs = {
  mode: "long",
  fit: "width",
  bg: "dark",
  colorFilter: "none",
  autoScrollSpeed: 0,
  zoom: 1,
  rtl: true,
  autoNextChapter: true,
  navPos: "stack-br",
  doubleGap: 8,
  flipSound: true,
  focusMode: false,
  hideChapterEndHint: false,
  enablePageDownload: false,
};

export function loadPrefs(key = PREFS_KEY): ReaderPrefs {
  try {
    return { ...DEFAULT_PREFS, ...JSON.parse(localStorage.getItem(key) || "{}") };
  } catch {
    return DEFAULT_PREFS;
  }
}

export const BG: Record<ReaderBg, string> = {
  dark: "bg-[#0b0b0d]",
  gray: "bg-neutral-800",
  light: "bg-neutral-100",
};

export const BG_HEX: Record<ReaderBg, string> = {
  dark: "#0b0b0d",
  gray: "#262626",
  light: "#f5f5f5",
};

export const COLOR_FILTER_CSS: Record<ReaderColorFilter, string | undefined> = {
  none: undefined,
  sepia: "sepia(0.38) contrast(1.04) brightness(0.96)",
  eink: "grayscale(1) contrast(1.22) brightness(0.98)",
  "warm-night": "sepia(0.28) brightness(0.84) contrast(1.05)",
  contrast: "contrast(1.25) brightness(1.02)",
  invert: "invert(0.92) hue-rotate(180deg)",
};

export function pageStyle(fit: ReaderFit, zoom: number): CSSProperties {
  if (fit === "height")
    return { height: `${Math.round(94 * zoom)}vh`, width: "auto", maxWidth: "100%" };
  if (fit === "original") return { width: `${Math.round(zoom * 100)}%`, maxWidth: "none" };
  return { width: "100%", maxWidth: `${Math.round(880 * zoom)}px` };
}

export function doublePageStyle(fit: ReaderFit, zoom: number): CSSProperties {
  if (fit === "width") return { width: "100%", maxWidth: `${Math.round(440 * zoom)}px` };
  if (fit === "original") return { width: `${Math.round(zoom * 100)}%`, maxWidth: "none" };
  return { maxHeight: `${Math.round(92 * zoom)}vh`, maxWidth: "100%", width: "auto" };
}
