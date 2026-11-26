import {
  detectExtendedPlatform,
  isWeb,
  isSmartProjector,
  isSamsungTizen,
  isLGWebOS,
  type ExtendedPlatform,
} from "@/lib/platform";
import type { ParsedStream, Stream } from "./types";
import { hasWebCompanionServer } from "@/lib/stream-proxy";

export interface DevicePlaybackCapabilities {
  platform: ExtendedPlatform;
  isWeb: boolean;
  engine: "mpv" | "html5";
  isProjector: boolean;
  isSmartTv: boolean;
  canPlayMp4: boolean;
  canPlayWebm: boolean;
  canPlayMkv: boolean;
  canPlayHls: boolean;
  canPlayHevc: boolean;
  canPlayAv1: boolean;
  canPlayVp9: boolean;
  canPlayMpeg2: boolean;
  canPlayHi10p: boolean;
  canPlayDolbyVisionProfile5: boolean;
  canPlayDolbyVisionProfile7: boolean;
  canPlayDts: boolean;
  canPlayTrueHd: boolean;
  canPlayAc3: boolean;
  canPlayEac3: boolean;
  canPlayAac: boolean;
  maxRecommendedBitrateMbps: number;
}

export interface DeviceStreamCompatibility {
  supported: boolean;
  severity: "supported" | "degraded" | "unsupported";
  reason?: string;
  badgeLabel?: string;
}

function testMediaCanPlay(mimeType: string): boolean {
  if (typeof document === "undefined") return false;
  try {
    const video = document.createElement("video");
    const res = video.canPlayType(mimeType);
    return res === "probably" || res === "maybe";
  } catch {
    return false;
  }
}

let cachedCapabilities: DevicePlaybackCapabilities | null = null;
let cachedEngine: "mpv" | "html5" | null = null;

export function getDevicePlaybackCapabilities(engine?: "mpv" | "html5"): DevicePlaybackCapabilities {
  const currentEngine = engine ?? (isWeb() ? "html5" : "mpv");
  if (cachedCapabilities && cachedEngine === currentEngine) {
    return cachedCapabilities;
  }

  const platform = detectExtendedPlatform();
  const web = isWeb();
  const projector = isSmartProjector();
  const tizen = isSamsungTizen();
  const webos = isLGWebOS();
  const smartTv = tizen || webos || platform === "android-tv" || platform === "tvos";

  const isDesktopMpv =
    currentEngine === "mpv" &&
    (engine === "mpv" ||
      (!web &&
        (platform === "macos" || platform === "windows" || platform === "linux")));

  if (isDesktopMpv) {
    // Desktop libmpv has universal demuxers and decoders for all standard media
    cachedCapabilities = {
      platform: web ? "macos" : platform,
      isWeb: false,
      engine: "mpv",
      isProjector: false,
      isSmartTv: false,
      canPlayMp4: true,
      canPlayWebm: true,
      canPlayMkv: true,
      canPlayHls: true,
      canPlayHevc: true,
      canPlayAv1: true,
      canPlayVp9: true,
      canPlayMpeg2: true,
      canPlayHi10p: true,
      canPlayDolbyVisionProfile5: true,
      canPlayDolbyVisionProfile7: true,
      canPlayDts: true,
      canPlayTrueHd: true,
      canPlayAc3: true,
      canPlayEac3: true,
      canPlayAac: true,
      maxRecommendedBitrateMbps: 250,
    };
    cachedEngine = "mpv";
    return cachedCapabilities;
  }

  // HTML5 / Web / Smart TV / Projector detection
  const canPlayMp4 = testMediaCanPlay('video/mp4; codecs="avc1.640028"') || true;
  const canPlayWebm = testMediaCanPlay('video/webm; codecs="vp8, vorbis"') || true;
  const canPlayHls = testMediaCanPlay("application/vnd.apple.mpegurl") || true;

  // MKV is not natively demuxed by HTML5 <video> in standard browsers
  const canPlayMkv = !web;

  // HEVC in browser: Safari supports natively; Chrome only on macOS / Windows with hardware extension
  const canPlayHevc =
    testMediaCanPlay('video/mp4; codecs="hvc1.1.6.L93.B0"') ||
    testMediaCanPlay('video/mp4; codecs="hev1.1.6.L93.B0"');

  // AV1 in browser
  const canPlayAv1 = testMediaCanPlay('video/mp4; codecs="av01.0.08M.08"');

  // VP9 in browser
  const canPlayVp9 = testMediaCanPlay('video/webm; codecs="vp9"') || testMediaCanPlay('video/mp4; codecs="vp09.00.10.08"');

  // Dolby Vision Profile 5 (Single track with proprietary curves - works on Apple Safari / TV)
  const canPlayDolbyVisionProfile5 = testMediaCanPlay('video/mp4; codecs="dvh1.05.06"');

  // Profile 7 (dual-track UHD Blu-ray REMUX) requires libmpv tonemapping; standard HTML5 video shows magenta/green
  const canPlayDolbyVisionProfile7 = false;

  // Audio checks
  const canPlayAac = testMediaCanPlay('audio/mp4; codecs="mp4a.40.2"') || true;
  const canPlayAc3 = testMediaCanPlay('audio/mp4; codecs="ac-3"');
  const canPlayEac3 = testMediaCanPlay('audio/mp4; codecs="ec-3"');
  // Browsers cannot decode DTS or TrueHD natively
  const canPlayDts = !web && !tizen && !webos;
  const canPlayTrueHd = !web;

  cachedCapabilities = {
    platform,
    isWeb: web,
    engine: "html5",
    isProjector: projector,
    isSmartTv: smartTv,
    canPlayMp4,
    canPlayWebm,
    canPlayMkv,
    canPlayHls,
    canPlayHevc,
    canPlayAv1,
    canPlayVp9,
    canPlayMpeg2: false,
    canPlayHi10p: false,
    canPlayDolbyVisionProfile5,
    canPlayDolbyVisionProfile7,
    canPlayDts,
    canPlayTrueHd,
    canPlayAc3,
    canPlayEac3,
    canPlayAac,
    maxRecommendedBitrateMbps: projector ? 45 : 120,
  };
  cachedEngine = currentEngine;
  return cachedCapabilities;
}

export const detectDevicePlaybackCapabilities = getDevicePlaybackCapabilities;

const MKV_URL_RX = /\.(?:mkv|avi|wmv|ts|m2ts)(?:[?#]|$)/i;

/**
 * Evaluates whether a stream can be decoded and played smoothly on the current device and browser.
 */
export function evaluateDeviceStreamSupport(
  stream: Stream | ParsedStream,
  capabilities?: DevicePlaybackCapabilities,
  options?: { isDownload?: boolean; hasCompanion?: boolean; hasDebrid?: boolean },
): DeviceStreamCompatibility {
  if (options?.isDownload) {
    return { supported: true, severity: "supported" };
  }

  const caps = capabilities ?? getDevicePlaybackCapabilities();

  // Desktop MPV handles everything
  if (!caps.isWeb && caps.engine === "mpv") {
    return { supported: true, severity: "supported" };
  }

  const hasCompanion = options?.hasCompanion ?? (caps.isWeb && hasWebCompanionServer());
  if (caps.isWeb && hasCompanion) {
    return { supported: true, severity: "supported" };
  }

  const streamAny = stream as any;
  const filename =
    stream.behaviorHints?.filename ??
    stream.behaviorHints?.fileName ??
    stream.title ??
    stream.name ??
    streamAny.rawTitle ??
    "";
  const url = stream.url ?? "";
  const hasHttpUrl = /^https?:\/\//i.test(url);
  if (caps.isWeb && !hasHttpUrl && streamAny.infoHash && options?.hasDebrid === false) {
    return {
      supported: false,
      severity: "unsupported",
      reason: "Torrent P2P streams require a Debrid provider or the desktop app in a web browser",
      badgeLabel: "Needs Debrid / Desktop",
    };
  }
  const container = streamAny.container ?? (MKV_URL_RX.test(url) || MKV_URL_RX.test(filename) ? "mkv" : null);
  const videoCodec = (streamAny.video?.codec ?? streamAny.codec ?? "").toUpperCase();
  const audioCodec = (streamAny.audio?.codec ?? "").toUpperCase();
  const source = (streamAny.source ?? streamAny.video?.source ?? "").toUpperCase();
  const isDv7 =
    streamAny.dvProfile === 7 ||
    ((streamAny.hdrFormat === "DV" || streamAny.video?.dv === true) &&
      (source === "REMUX" || source.includes("BLURAY") || source.includes("REMUX")));

  // 1. Web Browser: notWebReady flag from indexer/debrid
  if (caps.isWeb && stream.behaviorHints?.notWebReady === true) {
    return {
      supported: false,
      severity: "unsupported",
      reason: "Requires desktop player (not playable in web browser)",
      badgeLabel: "Desktop player required",
    };
  }

  // 2. Web Browser: Matroska (MKV), AVI, WMV, TS container without browser demuxer
  if (caps.isWeb) {
    const isMkv = container === "mkv" || MKV_URL_RX.test(url) || MKV_URL_RX.test(filename);
    if (isMkv) {
      return {
        supported: false,
        severity: "unsupported",
        reason: "Matroska (MKV) format cannot be played directly in web browsers",
        badgeLabel: "Unsupported format",
      };
    }
  }

  // 3. Web Browser: Video Codecs
  if (caps.isWeb) {
    if (videoCodec === "MPEG2") {
      return {
        supported: false,
        severity: "unsupported",
        reason: "MPEG-2 video is unsupported in web browsers",
        badgeLabel: "Unsupported video",
      };
    }

    if ((videoCodec === "HEVC" || videoCodec === "H265") && !caps.canPlayHevc) {
      return {
        supported: false,
        severity: "unsupported",
        reason: "HEVC (H.265) video is not supported by this browser",
        badgeLabel: "Browser cannot decode HEVC",
      };
    }

    if (videoCodec === "AV1" && !caps.canPlayAv1) {
      return {
        supported: false,
        severity: "unsupported",
        reason: "AV1 video is not supported by this browser",
        badgeLabel: "Browser cannot decode AV1",
      };
    }

    // Dolby Vision Profile 7 (Dual-track Blu-ray REMUX) causes purple/green screen on Web
    if (isDv7) {
      return {
        supported: false,
        severity: "unsupported",
        reason: "Dual-layer Dolby Vision (Profile 7) shows distorted purple/green colors in web browsers",
        badgeLabel: "Distorted colors on web",
      };
    }
  }

  // 4. Web Browser & Smart TVs without DTS / TrueHD
  if (audioCodec) {
    if (
      caps.isWeb &&
      (audioCodec === "DTS" ||
        audioCodec.includes("DTS") ||
        audioCodec === "TRUEHD" ||
        audioCodec.includes("TRUEHD"))
    ) {
      return {
        supported: false,
        severity: "unsupported",
        reason: "DTS / TrueHD lossless audio cannot be decoded by web browsers",
        badgeLabel: "Unsupported audio",
      };
    }

    if (
      caps.isWeb &&
      !caps.canPlayAc3 &&
      (audioCodec === "AC3" || audioCodec === "DOLBY DIGITAL" || audioCodec === "DD")
    ) {
      return {
        supported: false,
        severity: "unsupported",
        reason: "Dolby Digital (AC3) audio is not supported by this browser",
        badgeLabel: "Unsupported audio",
      };
    }

    if (
      caps.isWeb &&
      !caps.canPlayEac3 &&
      (audioCodec === "EAC3" || audioCodec === "DD+" || audioCodec === "DDP")
    ) {
      return {
        supported: false,
        severity: "unsupported",
        reason: "Dolby Digital Plus (EAC3) audio is not supported by this browser",
        badgeLabel: "Unsupported audio",
      };
    }

    if (
      !caps.canPlayDts &&
      (audioCodec === "DTS" || audioCodec.includes("DTS"))
    ) {
      return {
        supported: false,
        severity: "unsupported",
        reason: "DTS audio is not supported by this TV model",
        badgeLabel: "TV cannot play DTS",
      };
    }
  }

  // 5. Smart Projector: 4K UHD Blu-ray REMUX overload protection
  if (caps.isProjector) {
    const resolution = (streamAny.video?.resolution ?? streamAny.resolution ?? "").toUpperCase();
    const size = typeof streamAny.size === "number" ? streamAny.size : 0;
    const isHuge4kRemux =
      resolution === "4K" &&
      (source === "REMUX" || (size > 35 * 1024 ** 3));
    if (isHuge4kRemux) {
      return {
        supported: false,
        severity: "degraded",
        reason: "Ultra high-bitrate 4K REMUX may stutter or exceed projector memory limits",
        badgeLabel: "Heavy for projector",
      };
    }
  }

  return { supported: true, severity: "supported" };
}

/**
 * Partitions streams into supported and unsupported lists based on device playback limits.
 */
export function partitionDeviceStreams<T extends Stream | ParsedStream>(
  streams: readonly T[],
  capabilities?: DevicePlaybackCapabilities,
  options?: {
    isDownload?: boolean;
    keepBestIfAllIncompatible?: boolean;
    allowFallbackIfAllFiltered?: boolean;
  },
): {
  supported: T[];
  unsupported: Array<{ stream: T; compatibility: DeviceStreamCompatibility }>;
  fellBack: boolean;
} {
  const caps = capabilities ?? getDevicePlaybackCapabilities();
  const supported: T[] = [];
  const unsupported: Array<{ stream: T; compatibility: DeviceStreamCompatibility }> = [];

  for (const stream of streams) {
    const compat = evaluateDeviceStreamSupport(stream, caps, { isDownload: options?.isDownload });
    if (compat.supported) {
      supported.push(stream);
    } else {
      unsupported.push({ stream, compatibility: compat });
    }
  }

  const allowFallback =
    options?.keepBestIfAllIncompatible ?? options?.allowFallbackIfAllFiltered ?? false;
  if (supported.length === 0 && streams.length > 0 && allowFallback) {
    return {
      supported: [...streams],
      unsupported,
      fellBack: true,
    };
  }

  return {
    supported,
    unsupported,
    fellBack: false,
  };
}

/**
 * Filters a list of streams to only those that can be safely loaded on the current device.
 */
export function filterDeviceSupportedStreams<T extends Stream | ParsedStream>(
  streams: readonly T[],
  capabilities?: DevicePlaybackCapabilities,
  options?: {
    isDownload?: boolean;
    keepBestIfAllIncompatible?: boolean;
    allowFallbackIfAllFiltered?: boolean;
    hasCompanion?: boolean;
    hasDebrid?: boolean;
  },
): T[] {
  return partitionDeviceStreams(streams, capabilities, options).supported;
}

/**
 * Scores a stream for browser playback reliability so Web prefers HLS/MP4/H.264/AAC
 * and cached Debrid links over raw torrents or incompatible containers.
 */
export function webPlayabilityScore(
  stream: Stream | ParsedStream,
  capabilities?: DevicePlaybackCapabilities,
): number {
  const caps = capabilities ?? getDevicePlaybackCapabilities();
  const compat = evaluateDeviceStreamSupport(stream, caps);
  let score = compat.supported ? 100 : -100;
  const s = stream as any;
  const url = (stream.url ?? "").toLowerCase();
  const name = `${stream.behaviorHints?.filename ?? ""} ${stream.title ?? ""} ${stream.name ?? ""}`.toLowerCase();
  const videoCodec = (s.video?.codec ?? s.codec ?? "").toUpperCase();
  const audioCodec = (s.audio?.codec ?? "").toUpperCase();

  if (/\.m3u8(?:[?#]|$)/i.test(url)) score += 45;
  else if (/\.mp4(?:[?#]|$)/i.test(url) || /\.webm(?:[?#]|$)/i.test(url)) score += 35;
  else if (/^https?:\/\//i.test(url)) score += 15;

  if (s.cached || s.isCached || (Array.isArray(s.cachedSlugs) && s.cachedSlugs.length > 0)) {
    score += 25;
  }
  if (!url && s.infoHash) score -= 50;
  if (stream.behaviorHints?.notWebReady) score -= 35;
  if (videoCodec === "H264" || videoCodec === "AVC" || /\b(x264|h\.?264|avc)\b/i.test(name)) score += 20;
  if (audioCodec === "AAC" || audioCodec === "OPUS" || audioCodec === "MP3" || /\b(aac|opus)\b/i.test(name)) score += 15;

  return score;
}
