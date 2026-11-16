import type {
  PlayerBridge,
  PlayerCapabilities,
  PlayerSeekPrecision,
  PlayerSnapshot,
  PlayerSource,
} from "../bridge";
import { initialPlayerSnapshot } from "../bridge";
import { createHtml5Bridge } from "../html5";

export interface WebOsMediaOption {
  mediaTransportType?: "URI";
  option?: {
    transmission?: {
      playType?: "DLNA" | "LOCAL" | "REMOTE";
    };
  };
  htmlMediaOption?: {
    useSystemSubtitle?: boolean;
    useUMSMediaInfo?: boolean;
  };
}

export function buildWebOsMediaOptionString(custom?: Partial<WebOsMediaOption>): string {
  const opt: WebOsMediaOption = {
    mediaTransportType: "URI",
    option: {
      transmission: {
        playType: "DLNA",
      },
    },
    htmlMediaOption: {
      useSystemSubtitle: false,
      useUMSMediaInfo: true,
    },
    ...custom,
  };
  return JSON.stringify(opt);
}

export function getWebOsDeviceInfo(): { modelName: string; version: string; uhd: boolean; hdr10: boolean } {
  if (typeof window === "undefined") return { modelName: "webOS TV", version: "6.0", uhd: true, hdr10: true };
  const w = window as unknown as { webOS?: { deviceInfo?: (cb: (info: Record<string, unknown>) => void) => void } };
  let detected = { modelName: "webOS TV", version: "6.0", uhd: true, hdr10: true };
  try {
    w.webOS?.deviceInfo?.((info) => {
      detected = {
        modelName: String(info.modelName || "webOS TV"),
        version: String(info.version || "6.0"),
        uhd: Boolean(info.uhd ?? true),
        hdr10: Boolean(info.hdr10 ?? true),
      };
    });
  } catch {}
  return detected;
}

/**
 * webOS Media Bridge: LG Smart TVs (webOS 5.0+)
 * Utilizes LG webOS media pipeline, Luna service media registration,
 * and Magic Remote pointer/scroll navigation.
 */
export function createWebosMediaBridge(): PlayerBridge {
  const fallback = createHtml5Bridge();
  let snap: PlayerSnapshot = initialPlayerSnapshot();
  const listeners = new Set<(s: PlayerSnapshot) => void>();
  let attachedHost: HTMLElement | null = null;
  let currentSourceUrl: string | null = null;

  const configureWebosVideoAttributes = (sourceUrl?: string) => {
    const video = attachedHost?.querySelector("video");
    if (!video) return;
    const url = sourceUrl ?? currentSourceUrl;
    // LG webOS Starfish hardware media pipeline handles inline 4K/HDR10/MKV/AC3 directly on <video>
    video.playsInline = true;
    video.setAttribute("x-webkit-airplay", "allow");
    const mediaOption = buildWebOsMediaOptionString();
    video.setAttribute("data-webos-media-option", mediaOption);
    if (url) {
      const isHls = url.includes(".m3u8");
      const baseMime = isHls ? "application/vnd.apple.mpegurl" : "video/mp4";
      const sourceTag = video.querySelector("source");
      if (sourceTag) {
        sourceTag.setAttribute("type", `${baseMime};mediaOption=${encodeURIComponent(mediaOption)}`);
      }
    }
  };

  const handleVisibility = () => {
    if (typeof document !== "undefined" && document.hidden) {
      fallback.pause("background");
    }
  };
  if (typeof document !== "undefined") {
    document.addEventListener("visibilitychange", handleVisibility);
  }

  const emit = () => {
    const copy = { ...snap };
    listeners.forEach((l) => l(copy));
  };

  const capabilities: PlayerCapabilities = {
    engine: "html5",
    platformEngine: "webos-media",
    pictureInPicture: false,
    airplay: true,
    chromecast: false,
    hdrPassthrough: true,
    hardwareDecode: true,
    tunneling: true,
  };

  return {
    attach(host: HTMLElement) {
      attachedHost = host;
      fallback.attach(host);
      queueMicrotask(() => configureWebosVideoAttributes());
    },
    detach() {
      attachedHost = null;
      fallback.detach();
    },
    async load(src: PlayerSource) {
      currentSourceUrl = src.url;
      await fallback.load(src);
      queueMicrotask(() => configureWebosVideoAttributes(src.url));
      snap = initialPlayerSnapshot();
      snap.status = "loading";
      emit();
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
    requestPiP() {
      return fallback.requestPiP();
    },
    exitPiP() {
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
      listeners.add(listener);
      const unsubFallback = fallback.subscribe((s) => {
        snap = s;
        listener(s);
      });
      return () => {
        listeners.delete(listener);
        unsubFallback();
      };
    },
    destroy() {
      if (typeof document !== "undefined") {
        document.removeEventListener("visibilitychange", handleVisibility);
      }
      listeners.clear();
      fallback.destroy();
    },
  };
}
