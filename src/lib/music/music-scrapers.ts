import type { MusicTrack } from "./types";
import { musicTrackKey } from "./sources";
import {
  resolveMonochromeFlacStream,
  resolveTidalProxyFlacStream,
  resolveTorrentLosslessDiscography,
  type TorrentLosslessRelease,
} from "./monochrome-flac";

export type FederatedMusicSource = {
  connectorId: string;
  name: string;
  badge: string;
  isLossless: boolean;
  bitrateKbps: number;
  format: "FLAC" | "ALAC" | "WAV" | "Opus" | "AAC" | "MP3";
  streamUrl: string;
  latencyMs: number;
  provider:
    | "Monochrome Hi-Res FLAC"
    | "Tidal HiFi Master Proxy"
    | "Torrent Lossless Swarm"
    | "Debrid / Stremio Addon"
    | "Local Lossless"
    | "YouTube Music"
    | "SoundCloud"
    | "Spotify";
  editionDetail?: string;
  seeders?: number;
};

/**
 * Discovers and federates candidate audio streams from local storage, debrid caches,
 * online music catalog scrapers, and Monochrome's lossless API (tracks.monochrome.st),
 * sorting by fidelity (Hi-Res Lossless FLAC first).
 */
export async function resolveLosslessAudioSources(
  track: MusicTrack,
): Promise<FederatedMusicSource[]> {
  const sources: FederatedMusicSource[] = [];

  // 1. Monochrome Hi-Res Lossless Stream (tracks.monochrome.st)
  try {
    const monoStream = await resolveMonochromeFlacStream(track);
    if (monoStream) {
      sources.push({
        connectorId: "monochrome-flac",
        name: "Monochrome Studio Master",
        badge: monoStream.badge,
        isLossless: true,
        bitrateKbps: monoStream.bitrateKbps,
        format: "FLAC",
        streamUrl: monoStream.streamUrl,
        latencyMs: 45,
        provider: "Monochrome Hi-Res FLAC",
        editionDetail: "Direct uncompressed FLAC stream from Monochrome API",
      });
    }
  } catch (err) {
    console.debug("[FederatedSources] Monochrome FLAC lookup error", err);
  }

  // 2. Tidal HiFi Master Proxy (tidal-proxy.monochrome.tf)
  try {
    const tidalStream = await resolveTidalProxyFlacStream(track);
    if (tidalStream) {
      sources.push({
        connectorId: "tidal-proxy-flac",
        name: "Tidal Studio Master (Monochrome Gateway)",
        badge: tidalStream.badge,
        isLossless: true,
        bitrateKbps: tidalStream.bitrateKbps,
        format: "FLAC",
        streamUrl: tidalStream.streamUrl,
        latencyMs: 65,
        provider: "Tidal HiFi Master Proxy",
        editionDetail: "24-bit bit-perfect master audio pass-through",
      });
    }
  } catch (err) {
    console.debug("[FederatedSources] Tidal proxy lookup error", err);
  }

  // 3. Local High-Res FLAC stream candidate
  if (track.connectorId === "local" || track.quality?.lossless) {
    sources.push({
      connectorId: "local",
      name: "Local FLAC Master",
      badge: "24-bit / 96kHz Lossless",
      isLossless: true,
      bitrateKbps: 2450,
      format: "FLAC",
      streamUrl: track.playbackUrl ?? "",
      latencyMs: 8,
      provider: "Local Lossless",
      editionDetail: "Bit-perfect local disk playback",
    });
  }

  // 4. Torrent Lossless Swarm (Vinyl & SACD Rips via Debrid Cache)
  try {
    const torrentReleases: TorrentLosslessRelease[] = resolveTorrentLosslessDiscography(track);
    for (const rel of torrentReleases.slice(0, 2)) {
      sources.push({
        connectorId: rel.id,
        name: rel.title,
        badge: `${rel.edition} (${rel.seeders} seeders)`,
        isLossless: true,
        bitrateKbps: rel.bitrateKbps,
        format: "FLAC",
        streamUrl: rel.debridStreamUrl,
        latencyMs: 110,
        provider: "Torrent Lossless Swarm",
        editionDetail: `${rel.sourceTracker} · Instant Debrid Cache`,
        seeders: rel.seeders,
      });
    }
  } catch (err) {
    console.debug("[FederatedSources] Torrent discography error", err);
  }

  // 5. Debrid & Stremio Addon cached release
  sources.push({
    connectorId: "debrid-music",
    name: "Cached Lossless Studio Master",
    badge: "16-bit / 44.1kHz Hi-Fi FLAC",
    isLossless: true,
    bitrateKbps: 1411,
    format: "FLAC",
    streamUrl: `debrid://music/${musicTrackKey(track)}`,
    latencyMs: 130,
    provider: "Debrid / Stremio Addon",
    editionDetail: "Multi-tracker debrid cache",
  });

  // 6. YouTube Music High-Bitrate AAC / Opus Stream
  sources.push({
    connectorId: "youtube",
    name: "YouTube Music Premium",
    badge: "256 kbps Opus / AAC",
    isLossless: false,
    bitrateKbps: 256,
    format: "Opus",
    streamUrl: `ytmusic://${track.id}`,
    latencyMs: 95,
    provider: "YouTube Music",
  });

  // 7. SoundCloud High Quality
  sources.push({
    connectorId: "soundcloud",
    name: "SoundCloud HQ Audio",
    badge: "320 kbps MP3",
    isLossless: false,
    bitrateKbps: 320,
    format: "MP3",
    streamUrl: `sc://${track.id}`,
    latencyMs: 115,
    provider: "SoundCloud",
  });

  // Sort: Lossless first, then highest bitrate, then lowest latency
  return sources.sort((a, b) => {
    if (a.isLossless !== b.isLossless) return a.isLossless ? -1 : 1;
    if (b.bitrateKbps !== a.bitrateKbps) return b.bitrateKbps - a.bitrateKbps;
    return a.latencyMs - b.latencyMs;
  });
}
