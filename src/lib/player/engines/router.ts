import {
  detectExtendedPlatform,
  getRecommendedPlayerEngine,
  isAndroidProjector,
  isAndroidTv,
  isSmartProjector,
} from "@/lib/platform";
import type { PlayerBridge, PlayerEngine, PlayerPlatformEngine } from "../bridge";
import { createHtml5Bridge } from "../html5";
import { createMpvBridge, probeMpv, type MpvRect } from "../mpv";
import { createExternalMpvBridge, type ExternalMpvOptions } from "../external-mpv";
import { createAvPlayerBridge } from "./avplayer-bridge";
import { createExoPlayerBridge } from "./exoplayer-bridge";
import { createTizenAvplayBridge } from "./tizen-avplay-bridge";
import { createWebosMediaBridge } from "./webos-media-bridge";
import type { MonitorInfo } from "@/lib/monitors";

export interface PlayerEngineSelectionOptions {
  anime4k: boolean;
  hdrToSdr: boolean;
  rtxHdr?: boolean;
  rtxVsr?: boolean;
  embed?: boolean;
  anime4kShaders?: string[];
  d3d11Flip?: boolean;
  macEdr?: boolean;
  renderer?: "gpu-next" | "gpu";
  forceYuv420p?: boolean;
  extraOptions?: string;
  fullDownload?: boolean;
  separateDisplay?: MonitorInfo | null;
  separateCoverTaskbar?: boolean;
  cacheDir?: string;
  getEmbedRect?: () => Promise<MpvRect | null> | MpvRect | null;
  external?: ExternalMpvOptions | null;
}

/**
 * Intelligent Cross-Platform Player Router
 * Automatically determines and loads the highest-performing video engine for each OS:
 *
 * - Apple (iOS, iPadOS, tvOS, visionOS): AVPlayer / AVKit (+ MPVKit native targets)
 * - Android (Phone, Tablet, TV, Projector): Media3 ExoPlayer + LibVLC native fallback
 * - Samsung Smart TV (Tizen OS): Tizen AVPlay (`webapis.avplay`)
 * - LG Smart TV (webOS): webOS Media Pipeline (`com.webos.media`)
 * - Windows / macOS / Linux Desktop: libmpv (D3D11 / Metal / Vulkan + Anime4K)
 * - ChromeOS & Web: HTML5 + Hls.js + mpegts.js
 */
export async function resolveAdaptivePlayerBridge(
  want: "auto" | PlayerPlatformEngine,
  notWebReady: boolean,
  mpvOpts: PlayerEngineSelectionOptions,
): Promise<{ bridge: PlayerBridge; engine: PlayerEngine }> {
  if (mpvOpts.external) {
    return { bridge: createExternalMpvBridge(mpvOpts.external), engine: "html5" };
  }

  const platform = detectExtendedPlatform();
  const isDesktop =
    platform === "macos" ||
    platform === "windows" ||
    platform === "windows-handheld" ||
    platform === "linux";

  const tunedMpvOpts: PlayerEngineSelectionOptions = {
    ...mpvOpts,
    renderer: mpvOpts.renderer ?? "gpu-next",
    macEdr: platform === "macos" ? (mpvOpts.macEdr ?? true) : mpvOpts.macEdr,
    d3d11Flip:
      platform === "windows" || platform === "windows-handheld"
        ? (mpvOpts.d3d11Flip ?? true)
        : mpvOpts.d3d11Flip,
  };

  let cachedProbe: Awaited<ReturnType<typeof probeMpv>> | null = null;
  const getMpvProbe = async () => {
    if (!cachedProbe) cachedProbe = await probeMpv();
    return cachedProbe;
  };

  // Non-web-ready formats (VC-1, DTS-HD, TrueHD, raw MKV) escalate to libmpv on desktop
  if (notWebReady && isDesktop) {
    const probe = await getMpvProbe();
    if (probe.available) {
      return { bridge: createMpvBridge(tunedMpvOpts), engine: "mpv" };
    }
  }

  const targetEngine: PlayerPlatformEngine =
    want === "auto" ? getRecommendedPlayerEngine(platform) : want;

  switch (targetEngine) {
    case "avplayer":
      return {
        bridge: createAvPlayerBridge({ platform, notWebReady }),
        engine: "html5",
      };

    case "exoplayer":
      return {
        bridge: createExoPlayerBridge({
          isProjector: isAndroidProjector() || isSmartProjector(),
          isTv: isAndroidTv() || platform === "android-tv",
        }),
        engine: "html5",
      };

    case "tizen-avplay":
      return { bridge: createTizenAvplayBridge(), engine: "html5" };

    case "webos-media":
      return { bridge: createWebosMediaBridge(), engine: "html5" };

    case "mpv": {
      const probe = await getMpvProbe();
      if (probe.available) {
        return { bridge: createMpvBridge(tunedMpvOpts), engine: "mpv" };
      }
      console.warn(
        `[argus] libmpv requested on ${platform} but probe failed (${probe.error}); falling back to hardware-optimized HTML5 bridge.`,
      );
      return { bridge: createHtml5Bridge(), engine: "html5" };
    }

    case "html5":
    default:
      return { bridge: createHtml5Bridge(), engine: "html5" };
  }
}
