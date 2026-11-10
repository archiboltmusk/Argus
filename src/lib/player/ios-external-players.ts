import { isIOS, isIPadOS } from "@/lib/platform";
import { openUrl as tauriOpenUrl } from "@tauri-apps/plugin-opener";

export type IosPlayerId =
  | "outplayer"
  | "infuse"
  | "vlc"
  | "vidhub"
  | "nplayer"
  | "iina"
  | "in-app"
  | "copy";

export interface IosPlayerOption {
  id: IosPlayerId;
  name: string;
  tagline: string;
  scheme: string;
  recommended?: boolean;
}

export const IOS_PLAYER_OPTIONS: IosPlayerOption[] = [
  {
    id: "outplayer",
    name: "Outplayer",
    tagline: "Recommended for iOS · Smooth HDR & Spatial Audio",
    scheme: "outplayer://",
    recommended: true,
  },
  {
    id: "infuse",
    name: "Infuse",
    tagline: "Popular Apple media player · Dolby Vision & Trakt sync",
    scheme: "infuse://",
  },
  {
    id: "vlc",
    name: "VLC",
    tagline: "Open-source classic · Full codec & container support",
    scheme: "vlc-x-callback://",
  },
  {
    id: "vidhub",
    name: "VidHub",
    tagline: "Clean iOS & iPadOS native video player",
    scheme: "vidhub://",
  },
  {
    id: "nplayer",
    name: "nPlayer",
    tagline: "High-performance DTS & multi-track audio playback",
    scheme: "nplayer-",
  },
];

/**
 * Checks whether the stream URL container/codec is reliably supported by iOS Safari/WebKit.
 * WebKit on iOS cannot demux MKV, AVI, WMV, FLV or decode multi-channel DTS/AC3 without transcode.
 */
export function isWebPlayableFormat(url: string): boolean {
  if (!url) return false;
  const clean = url.split("?")[0].toLowerCase();
  if (clean.endsWith(".m3u8") || url.includes("/playlist/") || clean.includes("m3u8")) {
    return true; // Native HLS supported in Safari
  }
  if (clean.endsWith(".mp4") || clean.endsWith(".m4v") || clean.endsWith(".mov")) {
    return true;
  }
  return false;
}

/**
 * Builds the exact OS URL-scheme string to hand off a stream to an external media player on iOS.
 */
export function buildIosPlayerUrl(playerId: IosPlayerId, streamUrl: string, title?: string): string | null {
  if (!streamUrl) return null;
  const cleanTitle = title ? encodeURIComponent(title.replace(/[\r\n]+/g, " ").trim()) : "";

  switch (playerId) {
    case "outplayer":
      // Outplayer accepts outplayer://<full_url>
      return `outplayer://${streamUrl}`;

    case "infuse":
      // Infuse supports x-callback-url with url and optional title
      return cleanTitle
        ? `infuse://x-callback-url/play?url=${encodeURIComponent(streamUrl)}&title=${cleanTitle}`
        : `infuse://x-callback-url/play?url=${encodeURIComponent(streamUrl)}`;

    case "vlc":
      // VLC for iOS supports vlc-x-callback:// and vlc://
      return `vlc-x-callback://x-callback-url/stream?url=${encodeURIComponent(streamUrl)}`;

    case "vidhub":
      // VidHub supports vidhub://play?url=
      return `vidhub://play?url=${encodeURIComponent(streamUrl)}`;

    case "nplayer":
      // nPlayer supports nplayer-<url>
      return `nplayer-${streamUrl}`;

    case "iina":
      return `iina://weblink?url=${encodeURIComponent(streamUrl)}`;

    default:
      return null;
  }
}

/**
 * Launches the selected external player on iOS / iPadOS or copies the stream URL.
 */
export async function launchIosExternalPlayer(
  playerId: IosPlayerId,
  streamUrl: string,
  title?: string,
): Promise<{ success: boolean; fallbackUrl?: string }> {
  if (playerId === "copy") {
    try {
      await navigator.clipboard.writeText(streamUrl);
      return { success: true };
    } catch {
      return { success: false };
    }
  }

  const schemeUrl = buildIosPlayerUrl(playerId, streamUrl, title);
  if (!schemeUrl) return { success: false };

  // If in Tauri native iOS environment, invoke opener plugin
  if (typeof window !== "undefined" && "__TAURI_INTERNALS__" in window) {
    try {
      await tauriOpenUrl(schemeUrl);
      return { success: true };
    } catch {
      // Fall through to window navigation
    }
  }

  // In WebKit / Safari on iOS, window.location.assign triggers custom scheme prompts cleanly
  try {
    if (typeof window !== "undefined") {
      const isApple = isIOS() || isIPadOS();
      if (isApple) {
        window.location.href = schemeUrl;
      } else {
        const link = document.createElement("a");
        link.href = schemeUrl;
        link.rel = "noopener noreferrer";
        link.click();
      }
      return { success: true, fallbackUrl: schemeUrl };
    }
  } catch (err) {
    console.error("[argus] Failed to launch external iOS player scheme:", err);
  }

  return { success: false, fallbackUrl: schemeUrl };
}
