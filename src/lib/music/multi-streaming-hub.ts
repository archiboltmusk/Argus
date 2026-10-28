import type { MusicTrack, MusicAudioQuality } from "./types";

export type StreamingServiceId =
  | "youtube"
  | "soundcloud"
  | "reverbnation"
  | "bandcamp"
  | "audius"
  | "tidal"
  | "qobuz"
  | "spotify"
  | "jamendo"
  | "subsonic"
  | "jellyfin"
  | "plex"
  | "debrid-flac";

export type StreamingServiceDescriptor = {
  id: StreamingServiceId;
  name: string;
  tagline: string;
  category: "mainstream" | "indie-community" | "audiophile-lossless" | "self-hosted" | "decentralized";
  maxFidelity: string;
  badgeColor: string;
  isLossless: boolean;
  bitrateKbps: number;
  features: string[];
  protocol: string;
  status: "active" | "ready" | "connected";
};

export const MULTI_STREAMING_SERVICES: StreamingServiceDescriptor[] = [
  {
    id: "youtube",
    name: "YouTube & YouTube Music",
    tagline: "Vast global catalog, official video-to-audio sync, live concerts, and DJ remixes",
    category: "mainstream",
    maxFidelity: "256 kbps Opus / AAC",
    badgeColor: "#FF0000",
    isLossless: false,
    bitrateKbps: 256,
    features: ["Instant Audio-to-Video toggle", "Live vs Studio switcher", "Radio familiarity tuner"],
    protocol: "ytmusic://",
    status: "active",
  },
  {
    id: "soundcloud",
    name: "SoundCloud",
    tagline: "Premier destination for underground electronic, creator bootlegs, and live DJ sets",
    category: "indie-community",
    maxFidelity: "320 kbps HQ MP3",
    badgeColor: "#FF5500",
    isLossless: false,
    bitrateKbps: 320,
    features: ["Interactive waveform scrubbing", "Timestamp comments", "Community genre tags"],
    protocol: "soundcloud://",
    status: "active",
  },
  {
    id: "reverbnation",
    name: "ReverbNation",
    tagline: "Grassroots discovery platform for emerging indie bands, acoustic songwriters, and local scenes",
    category: "indie-community",
    maxFidelity: "320 kbps MP3",
    badgeColor: "#1DB954",
    isLossless: false,
    bitrateKbps: 320,
    features: ["Emerging artist discovery", "Local indie band charts", "Unreleased demos"],
    protocol: "reverb://",
    status: "active",
  },
  {
    id: "bandcamp",
    name: "Bandcamp",
    tagline: "Direct-from-artist storefront supporting independent creators with pristine master recordings",
    category: "audiophile-lossless",
    maxFidelity: "24-bit / 96kHz Lossless FLAC / WAV",
    badgeColor: "#629AA9",
    isLossless: true,
    bitrateKbps: 2400,
    features: ["Pay-what-you-want support", "Full digital album liner notes", "Direct studio master FLAC"],
    protocol: "bandcamp://",
    status: "active",
  },
  {
    id: "audius",
    name: "Audius (Decentralized)",
    tagline: "Community-governed Web3 music network with open API stems and peer-to-peer distribution",
    category: "decentralized",
    maxFidelity: "320 kbps AAC",
    badgeColor: "#CC00FF",
    isLossless: false,
    bitrateKbps: 320,
    features: ["Decentralized node streaming", "Stem remix challenges", "Zero ads or gatekeepers"],
    protocol: "audius://",
    status: "active",
  },
  {
    id: "tidal",
    name: "Tidal & Qobuz Federation",
    tagline: "Studio master fidelity with bit-perfect hardware DAC pass-through",
    category: "audiophile-lossless",
    maxFidelity: "24-bit / 192kHz Hi-Res FLAC / MQA",
    badgeColor: "#00E5FF",
    isLossless: true,
    bitrateKbps: 9216,
    features: ["Bit-perfect CoreAudio/WASAPI mode", "Master signal path audit", "Album credits explorer"],
    protocol: "tidal://",
    status: "ready",
  },
  {
    id: "debrid-flac",
    name: "Debrid Lossless Scraper",
    tagline: "Cached torrent and NZB discographies streaming bit-perfect FLAC vinyl & CD rips",
    category: "audiophile-lossless",
    maxFidelity: "16-bit to 24-bit FLAC",
    badgeColor: "#E040FB",
    isLossless: true,
    bitrateKbps: 1411,
    features: ["Complete artist discographies", "Vinyl & SACD rips", "Zero buffering cached debrid"],
    protocol: "debrid://music",
    status: "active",
  },
  {
    id: "subsonic",
    name: "Subsonic & Navidrome Bridge",
    tagline: "Stream your private home server music collection anywhere without cloud lock-in",
    category: "self-hosted",
    maxFidelity: "Original Master FLAC / DSD",
    badgeColor: "#00C853",
    isLossless: true,
    bitrateKbps: 1411,
    features: ["Folder browsing", "Offline cache pinning", "Shared family accounts"],
    protocol: "subsonic://",
    status: "ready",
  },
  {
    id: "jellyfin",
    name: "Jellyfin & Plex Music",
    tagline: "Self-hosted media server integration with multi-library indexing and instant playback",
    category: "self-hosted",
    maxFidelity: "Direct Play PCM / FLAC",
    badgeColor: "#7C4DFF",
    isLossless: true,
    bitrateKbps: 1411,
    features: ["Direct Play zero-transcode", "Server playlist sync", "Remote LAN discovery"],
    protocol: "jellyfin://",
    status: "ready",
  },
  {
    id: "jamendo",
    name: "Jamendo & Free Music Archive",
    tagline: "Royalty-free Creative Commons catalogue for background listening, videos, and indie projects",
    category: "indie-community",
    maxFidelity: "320 kbps MP3 / FLAC",
    badgeColor: "#FF4081",
    isLossless: false,
    bitrateKbps: 320,
    features: ["Creative Commons license", "Commercial-use safety", "Curated mood playlists"],
    protocol: "jamendo://",
    status: "active",
  },
];

/**
 * Generates curated trending music tracks across federated streaming services.
 */
export function getServiceCuratedTracks(serviceId: StreamingServiceId): MusicTrack[] {
  switch (serviceId) {
    case "reverbnation":
      return [
        {
          id: "reverb-1",
          title: "Echoes of the Rustbelt",
          artist: "The Northern Lanterns",
          album: "Heartland Demos",
          artwork: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&auto=format&fit=crop&q=80",
          durationSeconds: 234,
          durationLabel: "3:54",
          connectorId: "reverbnation",
          quality: { codec: "mp3", bitrateKbps: 320, lossless: false, sampleRateHz: 44100 },
        },
        {
          id: "reverb-2",
          title: "Midnight Porch Sessions",
          artist: "Canyon Pine",
          album: "Acoustic Horizon",
          artwork: "https://images.unsplash.com/photo-1465847899084-d164df4dedc6?w=500&auto=format&fit=crop&q=80",
          durationSeconds: 198,
          durationLabel: "3:18",
          connectorId: "reverbnation",
          quality: { codec: "mp3", bitrateKbps: 320, lossless: false, sampleRateHz: 44100 },
        },
        {
          id: "reverb-3",
          title: "Neon Static in the Attic",
          artist: "Velvet Static",
          album: "Basement Tapes Vol. 2",
          artwork: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=500&auto=format&fit=crop&q=80",
          durationSeconds: 265,
          durationLabel: "4:25",
          connectorId: "reverbnation",
          quality: { codec: "mp3", bitrateKbps: 320, lossless: false, sampleRateHz: 44100 },
        },
      ];
    case "bandcamp":
      return [
        {
          id: "bc-1",
          title: "Subterranean Synthesizer Odyssey",
          artist: "Modular Dreamscape",
          album: "Analog Modular Works 2026",
          artwork: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=500&auto=format&fit=crop&q=80",
          durationSeconds: 342,
          durationLabel: "5:42",
          connectorId: "bandcamp",
          quality: { codec: "flac", bitrateKbps: 2450, lossless: true, sampleRateHz: 96000, bitDepth: 24 },
        },
        {
          id: "bc-2",
          title: "Distant Constellations",
          artist: "Solar Wind Ensemble",
          album: "Deep Field Harmonics",
          artwork: "https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=500&auto=format&fit=crop&q=80",
          durationSeconds: 288,
          durationLabel: "4:48",
          connectorId: "bandcamp",
          quality: { codec: "flac", bitrateKbps: 1820, lossless: true, sampleRateHz: 48000, bitDepth: 24 },
        },
      ];
    case "soundcloud":
      return [
        {
          id: "sc-1",
          title: "Warehouse Sunset Live Mix (Berghain Ambient)",
          artist: "Klangwerk",
          album: "Live in Berlin",
          artwork: "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=500&auto=format&fit=crop&q=80",
          durationSeconds: 520,
          durationLabel: "8:40",
          connectorId: "soundcloud",
          quality: { codec: "mp3", bitrateKbps: 320, lossless: false, sampleRateHz: 44100 },
        },
      ];
    case "tidal":
    case "debrid-flac":
      return [
        {
          id: "hi-res-master-1",
          title: "A Love Supreme (Original 1964 Master Tape)",
          artist: "John Coltrane",
          album: "A Love Supreme (24-bit / 192kHz)",
          artwork: "https://images.unsplash.com/photo-1511192336575-5a79af67a629?w=500&auto=format&fit=crop&q=80",
          durationSeconds: 462,
          durationLabel: "7:42",
          connectorId: "debrid-flac",
          quality: { codec: "flac", bitrateKbps: 9216, lossless: true, sampleRateHz: 192000, bitDepth: 24 },
        },
      ];
    default:
      return [];
  }
}
