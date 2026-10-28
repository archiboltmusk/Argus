import {
  detectExtendedPlatform,
  getRecommendedPlayerEngine,
  isAndroidProjector,
  isAndroidTv,
} from "@/lib/platform";
import type { PlayerBridge, PlayerEngine } from "../bridge";
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
 * Automatically determines and loads the highest-performing video engine for each OS,
 * inspired by Nuvio's multi-platform architecture:
 *
 * - Apple (iOS, iPadOS, tvOS, visionOS): AVPlayer / AVKit
 * - Android (Phone, Tablet, TV, Projector): Media3 / ExoPlayer with MediaCodec tunneling
 * - Samsung Smart TV (Tizen OS): Tizen AVPlay (`webapis.avplay`)
 * - LG Smart TV (webOS): webOS Media Pipeline (`com.webos.media`)
 * - Windows / macOS / Linux Desktop: libmpv with Direct3D 11, Metal, Vulkan, and Anime4K
 * - ChromeOS & Web: HTML5 + Hls.js + mpegts.js
 */
export async function resolveAdaptivePlayerBridge(
  want: "auto" | PlayerEngine,
  notWebReady: boolean,
  mpvOpts: PlayerEngineSelectionOptions,
): Promise<{ bridge: PlayerBridge; engine: PlayerEngine }> {
  // If user requested an external standalone player window
  if (mpvOpts.external) {
    return { bridge: createExternalMpvBridge(mpvOpts.external), engine: "html5" };
  }

  const platform = detectExtendedPlatform();
  const targetEngine: PlayerEngine = want === "auto" ? getRecommendedPlayerEngine(platform) : want;

  switch (targetEngine) {
    case "avplayer":
      return { bridge: createAvPlayerBridge(), engine: "avplayer" };

    case "exoplayer":
      return {
        bridge: createExoPlayerBridge({
          isProjector: isAndroidProjector(),
          isTv: isAndroidTv(),
        }),
        engine: "exoplayer",
      };

    case "tizen-avplay":
      return { bridge: createTizenAvplayBridge(), engine: "tizen-avplay" };

    case "webos-media":
      return { bridge: createWebosMediaBridge(), engine: "webos-media" };

    case "mpv": {
      const probe = await probeMpv();
      if (probe.available) {
        return { bridge: createMpvBridge(mpvOpts), engine: "mpv" };
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
