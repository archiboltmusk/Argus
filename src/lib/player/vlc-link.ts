export type VlcPlatform = "ios" | "android" | "desktop";

export function detectVlcPlatform(userAgent: string): VlcPlatform {
  if (/iPhone|iPad|iPod/i.test(userAgent)) return "ios";
  if (/Android/i.test(userAgent)) return "android";
  return "desktop";
}

/** Only http(s) media can be handed to VLC; magnets and file paths cannot. */
export function isVlcPlayableUrl(url: string): boolean {
  return /^https?:\/\//i.test(url);
}

/**
 * Link that asks the OS to open `url` in VLC. It is a best-effort handoff:
 * it only works when VLC is installed and registered for the scheme.
 */
export function vlcOpenLink(url: string, platform: VlcPlatform): string | null {
  if (!isVlcPlayableUrl(url)) return null;
  if (platform === "ios") {
    return `vlc-x-callback://x-callback-url/stream?url=${encodeURIComponent(url)}`;
  }
  if (platform === "android") {
    const parsed = new URL(url);
    const target = `${parsed.host}${parsed.pathname}${parsed.search}`;
    const scheme = parsed.protocol.replace(":", "");
    return `intent://${target}#Intent;scheme=${scheme};package=org.videolan.vlc;type=video/*;end`;
  }
  return `vlc://${url}`;
}

export function m3uPlaylist(url: string, title: string): string {
  const safeTitle = title.replace(/[\r\n]+/g, " ");
  return `#EXTM3U\n#EXTINF:-1,${safeTitle}\n${url}\n`;
}
