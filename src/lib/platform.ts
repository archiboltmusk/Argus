import { platform as nativePlatform } from "@tauri-apps/plugin-os";

function isTauri(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

export function isWeb(): boolean {
  return typeof window !== "undefined" && !("__TAURI_INTERNALS__" in window);
}

export type OsClass = "linux" | "macos" | "windows" | "android" | "web";

function detectOs(): OsClass {
  if (!isTauri()) return "web";
  const platform = nativePlatform();
  if (platform === "linux") return "linux";
  if (platform === "macos") return "macos";
  if (platform === "windows") return "windows";
  if (platform === "android") return "android";
  return "web";
}

let cachedOs: OsClass | null = null;

export function osClass(): OsClass {
  if (cachedOs === null) cachedOs = detectOs();
  return cachedOs;
}

export function applyOsDataset(): void {
  if (typeof document === "undefined") return;
  document.documentElement.dataset.os = osClass();
}

export function isLinuxDesktop(): boolean {
  return osClass() === "linux";
}

export function isMacDesktop(): boolean {
  return osClass() === "macos";
}

export function isWindowsDesktop(): boolean {
  return osClass() === "windows";
}

/** Whether user-installed script plugins may run here. They are a desktop capability: on mobile and
 * TV builds, and in the browser, Argus keeps to declarative feeds, because store guidelines (Apple
 * 2.5.2 among them) do not allow an app to download and run code that changes what it does. */
export function scriptPluginsSupported(): boolean {
  const os = osClass();
  return os === "linux" || os === "macos" || os === "windows";
}

export function isAndroid(): boolean {
  return osClass() === "android";
}

// Every other platform answers from plugin-os, which reports only "android" for
// a phone and a television alike. Leanback is not an OS, so the panel can only
// be told apart by the strings the WebView carries.
const TV_UA = /\b(tv|leanback|androidtv|aft[a-z]*|bravia|firetv|googletv|shield)\b/;

let cachedTv: boolean | null = null;

export function isAndroidTv(): boolean {
  if (cachedTv !== null) return cachedTv;
  if (!isAndroid() || typeof navigator === "undefined") {
    cachedTv = false;
    return false;
  }
  const ua = (navigator.userAgent || "").toLowerCase();
  cachedTv = TV_UA.test(ua) || ua.includes("android tv") || ua.includes("google tv");
  return cachedTv;
}

export function isMobileDevice(): boolean {
  if (typeof navigator === "undefined" || typeof window === "undefined") return false;
  // A television reports Android and answers the touch heuristics below with a
  // 1080p viewport, so without this it is classed as a phone and served the
  // mobile remote instead of Big Picture.
  if (isAndroidTv()) return false;
  const ua = navigator.userAgent || "";
  if (/Android|webOS|iPhone|iPod|BlackBerry|IEMobile|Opera Mini|iPad/i.test(ua)) return true;
  if (/Macintosh/i.test(ua) && (navigator.maxTouchPoints ?? 0) > 1) return true;
  if ((navigator.maxTouchPoints ?? 0) > 0 && Math.min(window.innerWidth, window.innerHeight) < 640) {
    return true;
  }
  return false;
}

export function isMangaReaderRoute(): boolean {
  try {
    const path = window.location.pathname.replace(/\/+$/, "") || "/";
    if (path === "/reader" || path.endsWith("/reader")) return true;
    return new URLSearchParams(window.location.search).get("reader") === "1";
  } catch {
    return false;
  }
}

export function isRemoteRoute(): boolean {
  try {
    const path = window.location.pathname.replace(/\/+$/, "") || "/";
    if (path === "/remote" || path.endsWith("/remote")) return true;
    if (path === "/setup" || path.endsWith("/setup")) return true;
    if (path === "/reader" || path.endsWith("/reader")) return true;
    const q = new URLSearchParams(window.location.search);
    return q.get("remote") === "1" || q.get("reader") === "1" || q.get("setup") !== null;
  } catch {
    return false;
  }
}

let mobileWebCache: boolean | null = null;

export function isMobileWeb(): boolean {
  if (mobileWebCache !== null) return mobileWebCache;
  let forcedOn = false;
  try {
    const q = new URLSearchParams(window.location.search);
    if (q.get("desktop") === "1") {
      mobileWebCache = false;
      return false;
    }
    if (q.get("mobile") === "1") forcedOn = true;
  } catch {
    /* ignore */
  }
  mobileWebCache = forcedOn || (isWeb() && isMobileDevice());
  return mobileWebCache;
}

export function isSetupRoute(): boolean {
  try {
    const path = window.location.pathname.replace(/\/+$/, "") || "/";
    return path === "/setup" || path.endsWith("/setup");
  } catch {
    return false;
  }
}

export type ExtendedPlatform =
  | "ios"
  | "ipados"
  | "tvos"
  | "visionos"
  | "macos"
  | "android-phone"
  | "android-tablet"
  | "android-tv"
  | "android-projector"
  | "chromeos"
  | "windows"
  | "windows-handheld"
  | "tizen"
  | "webos"
  | "linux"
  | "web";

export type PlatformFamily = "apple" | "android" | "windows" | "smarttv" | "linux" | "web";

const PROJECTOR_UA = /\b(xgimi|nebula|dangbei|formovie|jmgo|projector|alpd|portronics|beem|wanbo|egate|zebronics)\b/i;
const TIZEN_UA = /\b(tizen|smart-tv.*samsung|samsung.*smart-tv)\b/i;
const WEBOS_UA = /\b(webos|web0s|netcast|smarttv.*lg|lg.*smarttv)\b/i;
const CHROMEOS_UA = /\b(cros|chromebook)\b/i;
const TVOS_UA = /\b(appletv|tvos)\b/i;
const VISIONOS_UA = /\b(realityos|visionos|apple vision)\b/i;
const HANDHELD_UA = /\b(steamdeck|rog ally|legion go|msi claw|gpd win|ayaneo|onexplayer)\b/i;

export function isSmartTv(): boolean {
  return isAndroidTv() || isSamsungTizen() || isLGWebOS() || isTvOS();
}

export function isSamsungTizen(): boolean {
  if (typeof window === "undefined") return false;
  if ("tizen" in window || "webapis" in window) return true;
  const ua = (navigator.userAgent || "").toLowerCase();
  return TIZEN_UA.test(ua);
}

export function isLGWebOS(): boolean {
  if (typeof window === "undefined") return false;
  if ("webOS" in window || "PalmSystem" in window) return true;
  const ua = (navigator.userAgent || "").toLowerCase();
  return WEBOS_UA.test(ua);
}

export function isTvOS(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = (navigator.userAgent || "").toLowerCase();
  return TVOS_UA.test(ua);
}

export function isVisionOS(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = (navigator.userAgent || "").toLowerCase();
  return VISIONOS_UA.test(ua);
}

export function isIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  return /iPhone|iPod/i.test(ua) && !isTvOS();
}

export function isIPadOS(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  if (/iPad/i.test(ua)) return true;
  return /Macintosh/i.test(ua) && (navigator.maxTouchPoints ?? 0) > 1 && !isVisionOS();
}

export function isApplePlatform(): boolean {
  return isMacDesktop() || isIOS() || isIPadOS() || isTvOS() || isVisionOS();
}

export function isAndroidProjector(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = (navigator.userAgent || "").toLowerCase();
  return isAndroid() && PROJECTOR_UA.test(ua);
}

export function isChromeOS(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = (navigator.userAgent || "").toLowerCase();
  return CHROMEOS_UA.test(ua);
}

export function isWindowsHandheld(): boolean {
  if (!isWindowsDesktop() || typeof navigator === "undefined") return false;
  const ua = (navigator.userAgent || "").toLowerCase();
  if (HANDHELD_UA.test(ua)) return true;
  if (typeof window !== "undefined") {
    const minDim = Math.min(window.screen.width, window.screen.height);
    const maxDim = Math.max(window.screen.width, window.screen.height);
    if (minDim <= 1200 && maxDim <= 1920 && (navigator.maxTouchPoints ?? 0) > 0) return true;
  }
  return false;
}

export function detectExtendedPlatform(): ExtendedPlatform {
  if (isSamsungTizen()) return "tizen";
  if (isLGWebOS()) return "webos";
  if (isTvOS()) return "tvos";
  if (isVisionOS()) return "visionos";
  if (isIPadOS()) return "ipados";
  if (isIOS()) return "ios";
  if (isMacDesktop()) return "macos";
  if (isAndroidProjector()) return "android-projector";
  if (isAndroidTv()) return "android-tv";
  if (isChromeOS()) return "chromeos";
  if (isAndroid()) {
    if (typeof window !== "undefined") {
      const minDim = Math.min(window.screen.width, window.screen.height);
      if (minDim >= 600) return "android-tablet";
    }
    return "android-phone";
  }
  if (isWindowsHandheld()) return "windows-handheld";
  if (isWindowsDesktop()) return "windows";
  if (isLinuxDesktop()) return "linux";
  return "web";
}

export function platformFamily(): PlatformFamily {
  const p = detectExtendedPlatform();
  switch (p) {
    case "ios":
    case "ipados":
    case "tvos":
    case "visionos":
    case "macos":
      return "apple";
    case "android-phone":
    case "android-tablet":
    case "android-tv":
    case "android-projector":
    case "chromeos":
      return "android";
    case "windows":
    case "windows-handheld":
      return "windows";
    case "tizen":
    case "webos":
      return "smarttv";
    case "linux":
      return "linux";
    default:
      return "web";
  }
}

import type { PlayerPlatformEngine } from "@/lib/player/bridge";

/** Optimal video playback engine tailored to each platform's hardware capabilities. */
export function getRecommendedPlayerEngine(platform = detectExtendedPlatform()): PlayerPlatformEngine {
  switch (platform) {
    case "tvos":
    case "visionos":
    case "ios":
    case "ipados":
      return "avplayer";
    case "android-tv":
    case "android-projector":
    case "android-phone":
    case "android-tablet":
      return "exoplayer";
    case "tizen":
      return "tizen-avplay";
    case "webos":
      return "webos-media";
    case "macos":
    case "windows":
    case "windows-handheld":
    case "linux":
      return "mpv";
    case "chromeos":
    case "web":
    default:
      return "html5";
  }
}
