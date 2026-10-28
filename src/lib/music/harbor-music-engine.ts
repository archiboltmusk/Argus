import type { MusicTrack, MusicAudioQuality } from "./types";

export type HarborMusicTheme = {
  id: string;
  name: string;
  description: string;
  backgroundGradient: string;
  accentColor: string;
  cardRadius: string;
  glassOpacity: number;
  seekBarStyle: "flat" | "glass" | "pinstripe" | "rainbow" | "waveform";
  fontPairing: string;
};

export const HARBOR_MUSIC_THEMES: HarborMusicTheme[] = [
  {
    id: "midnight-harbor",
    name: "Midnight Harbor Glass",
    description: "Deep obsidian cyan gradient with frosted glass cards and cyan neon accents",
    backgroundGradient: "linear-gradient(145deg, #070d18 0%, #0b1526 50%, #060910 100%)",
    accentColor: "#00E5FF",
    cardRadius: "1.25rem",
    glassOpacity: 0.15,
    seekBarStyle: "glass",
    fontPairing: "Plus Jakarta Sans & JetBrains Mono",
  },
  {
    id: "analog-tape",
    name: "Studio Analog Tape",
    description: "Vintage warm tape warmth, amber vu-meters, and mechanical tactile switches",
    backgroundGradient: "linear-gradient(145deg, #181410 0%, #201a14 50%, #120f0c 100%)",
    accentColor: "#FF9900",
    cardRadius: "0.75rem",
    glassOpacity: 0.08,
    seekBarStyle: "waveform",
    fontPairing: "Inter & Space Mono",
  },
  {
    id: "neon-cyberpunk",
    name: "Neon Cyberpunk Horizon",
    description: "High-contrast electric magenta and vivid violet with animated equalizer beams",
    backgroundGradient: "linear-gradient(145deg, #150624 0%, #1a0833 50%, #090214 100%)",
    accentColor: "#F50057",
    cardRadius: "1.5rem",
    glassOpacity: 0.22,
    seekBarStyle: "rainbow",
    fontPairing: "Space Grotesk & Fira Code",
  },
  {
    id: "obsidian-audiophile",
    name: "Obsidian Audiophile Reference",
    description: "Monochrome pitch-black OLED background with precision signal measurements",
    backgroundGradient: "linear-gradient(180deg, #000000 0%, #050505 100%)",
    accentColor: "#FFFFFF",
    cardRadius: "0.5rem",
    glassOpacity: 0.05,
    seekBarStyle: "flat",
    fontPairing: "Geist & Geist Mono",
  },
  {
    id: "sakura-lofi",
    name: "Sakura Lofi Sunset",
    description: "Pastel peach and sunset rose tones with mellow soft-glow corners",
    backgroundGradient: "linear-gradient(145deg, #24141d 0%, #2b1725 50%, #140b11 100%)",
    accentColor: "#FF80AB",
    cardRadius: "1.75rem",
    glassOpacity: 0.18,
    seekBarStyle: "pinstripe",
    fontPairing: "Outfit & Poppins",
  },
];

/**
 * Harbor 4-Stage Stream Ranking Engine for Music:
 * parse -> trust -> score -> rank
 */
export type HarborAudioStreamCandidate = {
  id: string;
  source: string;
  codec: string;
  sampleRateHz: number;
  bitDepth: number;
  bitrateKbps: number;
  lossless: boolean;
  isFakeUpsample: boolean;
  score: number;
  reasons: string[];
};

export function parseAndScoreAudioStream(
  rawStream: { source: string; codec?: string; bitrate?: number; sampleRate?: number; depth?: number; url?: string }
): HarborAudioStreamCandidate {
  // Stage 1: Parse
  const codec = (rawStream.codec ?? "aac").toLowerCase();
  const sampleRateHz = rawStream.sampleRate ?? 44100;
  const bitDepth = rawStream.depth ?? 16;
  const bitrateKbps = rawStream.bitrate ?? 256;
  const lossless = ["flac", "alac", "wav", "dsd", "pcm"].includes(codec);

  // Stage 2: Trust (Detect fake upsamples: e.g. 128kbps encoded as 96kHz FLAC)
  const isFakeUpsample = lossless && bitrateKbps < 500;

  // Stage 3: Score
  let score = 50;
  const reasons: string[] = [];

  if (lossless && !isFakeUpsample) {
    score += 40;
    reasons.push("True Lossless Stream (+40)");
    if (sampleRateHz >= 96000 && bitDepth >= 24) {
      score += 20;
      reasons.push("Hi-Res Studio Master (+20)");
    }
  } else if (bitrateKbps >= 320) {
    score += 15;
    reasons.push("High-Bitrate 320k (+15)");
  } else if (isFakeUpsample) {
    score -= 30;
    reasons.push("Demoted: Suspected Lossy Transcode / Fake Upsample (-30)");
  }

  // Stage 4: Rank
  return {
    id: `${rawStream.source}-${codec}-${bitrateKbps}`,
    source: rawStream.source,
    codec: codec.toUpperCase(),
    sampleRateHz,
    bitDepth,
    bitrateKbps,
    lossless,
    isFakeUpsample,
    score: Math.max(0, Math.min(100, score)),
    reasons,
  };
}

export type HarborMusicTogetherRoom = {
  roomCode: string;
  hostName: string;
  activeListeners: number;
  currentTrack: MusicTrack | null;
  positionSeconds: number;
  votingQueue: Array<{ track: MusicTrack; votes: number; addedBy: string }>;
};

export function createHarborMusicRoom(hostName: string, initialTrack: MusicTrack | null): HarborMusicTogetherRoom {
  // Deterministic 6-character room code like Harbor Together
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let roomCode = "";
  for (let i = 0; i < 6; i++) {
    roomCode += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  return {
    roomCode,
    hostName,
    activeListeners: 1,
    currentTrack: initialTrack,
    positionSeconds: 0,
    votingQueue: [],
  };
}
