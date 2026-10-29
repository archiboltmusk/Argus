/**
 * Multi-Commentary Instant Audio Switcher
 *
 * Designed for Indian cricket and live sports broadcasts.
 * Seamlessly hot-swaps between broadcast television audio and live radio feeds:
 * - English (International Broadcast / BBC TMS)
 * - Hindi (Sports Flashes / AIR Sports)
 * - Bengali (Akashvani Kolkata / AIR Bangla - Purulia & Bengal broadcast)
 *
 * Keeps video stream running uninterrupted with independent time-offset calibration.
 */

import { POPULAR_INDIAN_CRICKET_RADIOS } from "./cricket-radio";

export type CommentaryLanguage = "broadcast_original" | "bengali" | "hindi" | "english";

export interface CommentaryChoice {
  id: CommentaryLanguage;
  label: string;
  nativeLabel: string;
  commentatorTeam: string;
  badge: string;
  feedUrl?: string;
  defaultDelaySec: number;
}

export const COMMENTARY_CHOICES: CommentaryChoice[] = [
  {
    id: "broadcast_original",
    label: "Broadcast Audio",
    nativeLabel: "মূল সম্প্রচার",
    commentatorTeam: "Official TV Feed (English / World Feed)",
    badge: "TV",
    defaultDelaySec: 0,
  },
  {
    id: "bengali",
    label: "Bengali Commentary",
    nativeLabel: "বাংলা ধারাভাষ্য",
    commentatorTeam: "Akashvani Kolkata / AIR Sports Bangla",
    badge: "বাংলা",
    feedUrl: POPULAR_INDIAN_CRICKET_RADIOS.find((r) => r.id === "air-bangla")?.streamUrl,
    defaultDelaySec: 1.5,
  },
  {
    id: "hindi",
    label: "Hindi Commentary",
    nativeLabel: "हिंदी कमेंट्री",
    commentatorTeam: "Sports Flashes / All India Radio Hindi",
    badge: "हिंदी",
    feedUrl: POPULAR_INDIAN_CRICKET_RADIOS.find((r) => r.id === "sports-flashes-hindi")?.streamUrl,
    defaultDelaySec: 1.0,
  },
  {
    id: "english",
    label: "English Radio",
    nativeLabel: "English TMS",
    commentatorTeam: "BBC Test Match Special / AIR English",
    badge: "ENG",
    feedUrl: POPULAR_INDIAN_CRICKET_RADIOS.find((r) => r.id === "bbc-tms")?.streamUrl,
    defaultDelaySec: 0.5,
  },
];

export function getCommentaryChoice(id: CommentaryLanguage): CommentaryChoice {
  return COMMENTARY_CHOICES.find((c) => c.id === id) || COMMENTARY_CHOICES[0];
}

export function formatCommentaryMpvLoadArgs(
  choice: CommentaryChoice,
  userDelayOffsetSec = 0,
): { audioUrl?: string; delaySec: number } {
  if (choice.id === "broadcast_original" || !choice.feedUrl) {
    return { delaySec: 0 };
  }

  const netDelay = choice.defaultDelaySec + userDelayOffsetSec;
  return {
    audioUrl: choice.feedUrl,
    delaySec: netDelay,
  };
}
