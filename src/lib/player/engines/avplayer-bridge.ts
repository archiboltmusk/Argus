import type {
  PlayerBridge,
  PlayerCapabilities,
  PlayerSeekPrecision,
  PlayerSource,
} from "../bridge";
import { createHtml5Bridge } from "../html5";

interface AppleWebKitVideoElement extends HTMLVideoElement {
  webkitSupportsPresentationMode?: (mode: string) => boolean;
  webkitSetPresentationMode?: (mode: string) => void;
}

/**
 * Builds an Apple ecosystem external-player URL handoff (VLC Mobile, Infuse, Outplayer)
 * when an iOS/iPadOS/tvOS user wants raw non-WebKit formats (MKV/DTS-HD/TrueHD)
 * without server-side remuxing.
 */
export function buildAppleExternalPlayerUrl(
  playerApp: "vlc" | "infuse" | "outplayer",
  streamUrl: string,
  subtitleUrl?: string,
): string {
  const encodedUrl = encodeURIComponent(streamUrl);
  switch (playerApp) {
    case "vlc":
      return `vlc-x-callback://x-callback-url/stream?url=${encodedUrl}${
        subtitleUrl ? `&sub=${encodeURIComponent(subtitleUrl)}` : ""
      }`;
    case "infuse":
      return `infuse://x-callback-url/play?url=${encodedUrl}`;
    case "outplayer":
      return `outplayer://${streamUrl.replace(/^https?:\/\//i, "")}`;
  }
}

/**
 * AVPlayer Bridge: Apple Ecosystem (iOS, iPadOS, tvOS, visionOS, macOS native)
 * Harnesses VideoToolbox, Apple AVKit, AirPlay 2, Spatial Audio, and WebKit PiP.
 */
export function createAvPlayerBridge(_options?: {
  platform?: string;
  notWebReady?: boolean;
}): PlayerBridge {
  const fallback = createHtml5Bridge();
  let attachedHost: HTMLElement | null = null;

  const getVideo = (): AppleWebKitVideoElement | null =>
    (attachedHost?.querySelector("video") as AppleWebKitVideoElement | null) ?? null;

  const configureAppleVideoAttributes = () => {
    const video = getVideo();
    if (!video) return;
    video.playsInline = true;
    video.disableRemotePlayback = false;
    video.setAttribute("webkit-playsinline", "true");
    video.setAttribute("x-webkit-airplay", "allow");
  };

  const capabilities: PlayerCapabilities = {
    engine: "html5",
    platformEngine: "avplayer",
    pictureInPicture: true,
    airplay: true,
    chromecast: false,
    hdrPassthrough: true,
    hardwareDecode: true,
    spatialAudio: true,
    dolbyVision: true,
  };

  return {
    attach(host: HTMLElement) {
      attachedHost = host;
      fallback.attach(host);
      queueMicrotask(configureAppleVideoAttributes);
    },
    detach() {
      attachedHost = null;
      fallback.detach();
    },
    async load(src: PlayerSource) {
      await fallback.load(src);
      queueMicrotask(configureAppleVideoAttributes);
    },
    play(options) {
      return fallback.play(options);
    },
    pause(reason) {
      fallback.pause(reason);
    },
    seek(sec: number, precision?: PlayerSeekPrecision) {
      fallback.seek(sec, precision);
    },
    frameStep(dir) {
      fallback.frameStep?.(dir);
    },
    setVolume(v: number) {
      fallback.setVolume(v);
    },
    setMuted(m: boolean) {
      fallback.setMuted(m);
    },
    setRate(r: number) {
      fallback.setRate(r);
    },
    setAudioTrack(id: string) {
      fallback.setAudioTrack(id);
    },
    setSubtitleTrack(id: string | null, origin) {
      fallback.setSubtitleTrack(id, origin);
    },
    canAutoSelectSubtitle() {
      return fallback.canAutoSelectSubtitle?.() ?? true;
    },
    setSecondarySubtitleTrack(id: string | null) {
      fallback.setSecondarySubtitleTrack(id);
    },
    setSubVisible(on: boolean) {
      fallback.setSubVisible(on);
    },
    setSubHideSdh(on: boolean) {
      fallback.setSubHideSdh?.(on);
    },
    setSubDelay(sec: number) {
      fallback.setSubDelay(sec);
    },
    setAudioDelay(sec: number) {
      fallback.setAudioDelay(sec);
    },
    setPanscan(val: number) {
      fallback.setPanscan(val);
    },
    setVideoZoom(log2: number) {
      fallback.setVideoZoom(log2);
    },
    setAspectOverride(ratio: string) {
      fallback.setAspectOverride(ratio);
    },
    setStretch(on: boolean) {
      fallback.setStretch(on);
    },
    setVideoEq(name: string, value: number) {
      fallback.setVideoEq(name, value);
    },
    setAnime4kShaders(shaders: string[]) {
      fallback.setAnime4kShaders(shaders);
    },
    addSubtitle(url, lang, title, select, metadata, origin) {
      return fallback.addSubtitle(url, lang, title, select, metadata, origin);
    },
    getSelectedTrackCues() {
      return fallback.getSelectedTrackCues();
    },
    getSelectedTrackUrl() {
      return fallback.getSelectedTrackUrl();
    },
    setAudioNormalize(on: boolean) {
      fallback.setAudioNormalize(on);
    },
    screenshot(path: string) {
      return fallback.screenshot(path);
    },
    setAbLoop(a, b) {
      fallback.setAbLoop(a, b);
    },
    async requestPiP() {
      const video = getVideo();
      if (video?.webkitSupportsPresentationMode?.("picture-in-picture") && video.webkitSetPresentationMode) {
        video.webkitSetPresentationMode("picture-in-picture");
        return;
      }
      return fallback.requestPiP();
    },
    async exitPiP() {
      const video = getVideo();
      if (video?.webkitSupportsPresentationMode?.("inline") && video.webkitSetPresentationMode) {
        video.webkitSetPresentationMode("inline");
        return;
      }
      return fallback.exitPiP();
    },
    requestFullscreen() {
      return fallback.requestFullscreen();
    },
    exitFullscreen() {
      return fallback.exitFullscreen();
    },
    capabilities() {
      return capabilities;
    },
    subscribe(listener) {
      return fallback.subscribe(listener);
    },
    destroy() {
      attachedHost = null;
      fallback.destroy();
    },
  };
}
