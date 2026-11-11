import { openUrl as tauriOpenUrl } from "@tauri-apps/plugin-opener";
import { isAndroid, isAndroidTv, isSmartProjector } from "@/lib/platform";

export type AndroidPlayerId =
  | "justplayer"
  | "vlc"
  | "nova"
  | "mxplayer"
  | "vimu"
  | "exoplayer"
  | "generic"
  | "in-app";

export interface AndroidPlayerOption {
  id: AndroidPlayerId;
  name: string;
  packageName?: string;
  tagline: string;
  recommended?: boolean;
}

export const ANDROID_PLAYER_OPTIONS: AndroidPlayerOption[] = [
  {
    id: "justplayer",
    name: "Just Player",
    packageName: "com.brouken.player",
    tagline: "ExoPlayer native · Dolby Vision, HDR10+ & DTS passthrough",
    recommended: true,
  },
  {
    id: "vimu",
    name: "Vimu Media Player",
    packageName: "net.gtvbox.videoplayer",
    tagline: "Built for Android TV & Smart Projectors · AC3/EAC3 downmix",
  },
  {
    id: "nova",
    name: "Nova Video Player",
    packageName: "org.courville.nova",
    tagline: "Open-source Android TV cinema player · Trakt & Subtitles",
  },
  {
    id: "vlc",
    name: "VLC for Android",
    packageName: "org.videolan.vlc",
    tagline: "Full hardware acceleration & universal audio/video codec support",
  },
  {
    id: "mxplayer",
    name: "MX Player",
    packageName: "com.mxtech.videoplayer.ad",
    tagline: "Hardware HW+ decoder & audio boost",
  },
  {
    id: "generic",
    name: "System Video Player",
    tagline: "Android default View Intent (ExoPlayer / Media3)",
  },
];

export interface AndroidLaunchOptions {
  title?: string;
  subtitleUrl?: string;
  startPositionMs?: number;
}

/**
 * Builds an Android intent URI to play a video stream natively in an external player.
 */
export function buildAndroidIntentUri(
  streamUrl: string,
  pkg?: string,
  options: AndroidLaunchOptions = {},
): string {
  const parts: string[] = [
    `#Intent`,
    `action=android.intent.action.VIEW`,
    `type=video/*`,
    `data=${encodeURIComponent(streamUrl)}`,
  ];

  if (pkg) {
    parts.push(`package=${pkg}`);
  }

  if (options.title) {
    parts.push(`S.title=${encodeURIComponent(options.title)}`);
  }

  if (options.startPositionMs && options.startPositionMs > 0) {
    parts.push(`i.position=${Math.floor(options.startPositionMs)}`);
  }

  if (options.subtitleUrl) {
    parts.push(`S.subs=${encodeURIComponent(options.subtitleUrl)}`);
  }

  parts.push("end");
  return `intent:${parts.join(";")}`;
}

/**
 * Launches the chosen external player on Android TV or Smart Projector.
 */
export async function launchAndroidPlayer(
  playerId: AndroidPlayerId,
  streamUrl: string,
  options: AndroidLaunchOptions = {},
): Promise<boolean> {
  if (!isAndroid()) return false;

  const target = ANDROID_PLAYER_OPTIONS.find((p) => p.id === playerId);
  const intentUri = buildAndroidIntentUri(streamUrl, target?.packageName, options);

  try {
    await tauriOpenUrl(intentUri);
    return true;
  } catch (err) {
    console.warn(`[argus] Android player launch failed for ${playerId}:`, err);
    // Fallback to standard HTTP stream open
    try {
      await tauriOpenUrl(streamUrl);
      return true;
    } catch {
      return false;
    }
  }
}
