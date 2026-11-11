import type {
  PlayerBridge,
  PlayerCapabilities,
  PlayerSeekPrecision,
  PlayerSnapshot,
  PlayerSource,
  PlayerStatus,
  TrackInfo,
} from "../bridge";
import { initialPlayerSnapshot } from "../bridge";
import { createHtml5Bridge } from "../html5";
import { WebAudioDownmixer } from "../web-audio-downmixer";
import { getProjectorCssFilter, isBudgetProjectorDevice } from "../projector-mode";
import { isSmartProjector, isAndroidProjector, isAndroidTv } from "@/lib/platform";

interface AndroidNativePlayerJsBridge {
  isAvailable(): boolean;
  supportedEngines?(): string;
  play(optionsJson: string): boolean;
  pause(): void;
  resume(): void;
  seekTo(positionMs: number): void;
  setRate(rate: number): void;
  setAudioTrack(trackId: string): void;
  setSubtitleTrack(trackId: string): void;
  addSubtitle(url: string): void;
  stop(): void;
  getStateJson(): string;
}

interface NativePlayerRawState {
  status?: PlayerStatus;
  engine?: string;
  positionMs?: number;
  durationMs?: number;
  bufferedMs?: number;
  rate?: number;
  errorMessage?: string | null;
  audioTracks?: Array<{ id?: string; label?: string; lang?: string; selected?: boolean }>;
  subtitleTracks?: Array<{ id?: string; label?: string; lang?: string; selected?: boolean }>;
}

declare global {
  interface Window {
    ArgusNativePlayer?: AndroidNativePlayerJsBridge;
    __argusNativePlayerUpdate?: (state: NativePlayerRawState) => void;
  }
}

export function getAndroidNativePlayerBridge(): AndroidNativePlayerJsBridge | null {
  if (typeof window === "undefined") return null;
  const candidate = window.ArgusNativePlayer;
  if (!candidate || typeof candidate.isAvailable !== "function") return null;
  try {
    return candidate.isAvailable() ? candidate : null;
  } catch {
    return null;
  }
}

export function isAndroidNativePlayerAvailable(): boolean {
  return getAndroidNativePlayerBridge() !== null;
}

function mapNativeTracks(
  raw: Array<{ id?: string; label?: string; lang?: string; selected?: boolean }> | undefined,
  kind: "audio" | "subtitle",
): TrackInfo[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((t, i) => ({
    id: String(t.id ?? i),
    label: t.label || `${kind === "audio" ? "Audio" : "Subtitle"} ${i + 1}`,
    lang: t.lang || undefined,
    kind,
    selected: Boolean(t.selected),
  }));
}

/**
 * ExoPlayer (Media3) + LibVLC Native Bridge: Android Ecosystem
 * Optimized for Android TV, Google TV, Smart Projectors (Portronics Beem, XGIMI, Nebula, Wanbo, HY300),
 * Tablets, Foldables, and Mobile.
 *
 * When running inside the Argus Android APK, delegates playback directly to the embedded dual-engine
 * Kotlin ArgusNativePlayerActivity (Media3 ExoPlayer with automatic LibVLC native FFmpeg fallback for
 * MKV, HEVC 10-bit, AC3/E-AC3/DTS/TrueHD, and ASS/SSA subtitles). Otherwise falls back to HTML5
 * with WebAudio stereo downmixing and projector CSS contrast compensation.
 */
export function createExoPlayerBridge(options?: { isProjector?: boolean; isTv?: boolean }): PlayerBridge {
  const isProj = Boolean(
    options?.isProjector ||
      isSmartProjector() ||
      isAndroidProjector() ||
      isBudgetProjectorDevice(),
  );

  const capabilities: PlayerCapabilities = {
    engine: "html5",
    platformEngine: "exoplayer",
    pictureInPicture: true,
    airplay: false,
    chromecast: true,
    hdrPassthrough: true,
    hardwareDecode: true,
    tunneling: Boolean(options?.isTv || isProj || isAndroidTv()),
    dolbyVision: true,
    spatialAudio: false,
  };

  const nativeBridge = getAndroidNativePlayerBridge();
  if (nativeBridge) {
    let snap: PlayerSnapshot = initialPlayerSnapshot();
    const listeners = new Set<(s: PlayerSnapshot) => void>();
    let pollTimer: number | null = null;
    let activeSubtitleUrl = "";

    const emit = () => {
      const copy = { ...snap };
      listeners.forEach((l) => l(copy));
    };

    const applyRawState = (raw: NativePlayerRawState) => {
      const status = raw.status ?? snap.status;
      snap = {
        ...snap,
        status,
        positionSec: Math.max(0, (raw.positionMs ?? 0) / 1000),
        durationSec: Math.max(0, (raw.durationMs ?? 0) / 1000),
        bufferedSec: Math.max(0, (raw.bufferedMs ?? 0) / 1000),
        buffering: status === "loading",
        firstFrameReady:
          snap.firstFrameReady || status === "playing" || status === "paused" || (raw.positionMs ?? 0) > 0,
        rate: raw.rate ?? snap.rate,
        audioTracks: mapNativeTracks(raw.audioTracks, "audio"),
        subtitleTracks: mapNativeTracks(raw.subtitleTracks, "subtitle"),
        errorMessage: raw.errorMessage ?? null,
        errorCode: raw.errorMessage ? "decode" : null,
      };
      emit();
    };

    const stopPolling = () => {
      if (pollTimer !== null) {
        window.clearInterval(pollTimer);
        pollTimer = null;
      }
      if (window.__argusNativePlayerUpdate) {
        window.__argusNativePlayerUpdate = undefined;
      }
    };

    const startPolling = () => {
      stopPolling();
      window.__argusNativePlayerUpdate = (raw) => applyRawState(raw);
      pollTimer = window.setInterval(() => {
        try {
          const parsed = JSON.parse(nativeBridge.getStateJson()) as NativePlayerRawState;
          applyRawState(parsed);
        } catch {
          // ignore transient serialization failure
        }
      }, 450);
    };

    return {
      attach() {},
      detach() {
        stopPolling();
      },
      async load(src: PlayerSource) {
        snap = initialPlayerSnapshot();
        snap.status = "loading";
        activeSubtitleUrl = src.subtitles?.[0]?.url ?? "";
        emit();
        startPolling();

        const started = nativeBridge.play(
          JSON.stringify({
            url: src.url,
            title: src.title ?? "Argus",
            subtitleUrl: activeSubtitleUrl,
            startPositionMs: Math.max(0, Math.round((src.startAtSec ?? 0) * 1000)),
            engine: "auto",
            headers: src.headers ?? {},
            projectorMode: isProj,
            lowRam: isProj,
          }),
        );
        if (!started) {
          snap.status = "error";
          snap.errorMessage = "Native Android player rejected media source.";
          snap.errorCode = "source";
          emit();
        }
      },
      async play() {
        nativeBridge.resume();
      },
      pause() {
        nativeBridge.pause();
      },
      seek(sec: number) {
        nativeBridge.seekTo(Math.max(0, Math.round(sec * 1000)));
      },
      setVolume() {},
      setMuted() {},
      setRate(r: number) {
        nativeBridge.setRate(r);
      },
      setAudioTrack(id: string) {
        nativeBridge.setAudioTrack(id);
      },
      setSubtitleTrack(id: string | null) {
        nativeBridge.setSubtitleTrack(id ?? "");
      },
      canAutoSelectSubtitle() {
        return true;
      },
      setSecondarySubtitleTrack() {},
      setSubVisible(on: boolean) {
        if (!on) nativeBridge.setSubtitleTrack("");
      },
      setSubHideSdh() {},
      setSubDelay() {},
      setAudioDelay() {},
      setPanscan() {},
      setVideoZoom() {},
      setAspectOverride() {},
      setStretch() {},
      setVideoEq() {},
      setAnime4kShaders() {},
      async addSubtitle(url: string) {
        if (!url) return false;
        activeSubtitleUrl = url;
        nativeBridge.addSubtitle(url);
        return true;
      },
      getSelectedTrackCues() {
        return null;
      },
      getSelectedTrackUrl() {
        return activeSubtitleUrl || null;
      },
      setAudioNormalize() {},
      async screenshot() {
        return { ok: false, error: "Screenshot not supported on native Android playback surface" };
      },
      setAbLoop() {},
      async requestPiP() {},
      async exitPiP() {},
      async requestFullscreen() {},
      async exitFullscreen() {},
      capabilities() {
        return capabilities;
      },
      subscribe(listener) {
        listeners.add(listener);
        listener({ ...snap });
        return () => {
          listeners.delete(listener);
        };
      },
      destroy() {
        stopPolling();
        listeners.clear();
        try {
          nativeBridge.stop();
        } catch {
          // ignore if activity already closed
        }
      },
    };
  }

  // Browser / non-APK fallback: HTML5 + WebAudio stereo downmixer + projector CSS filters
  const fallback = createHtml5Bridge();
  let snap: PlayerSnapshot = initialPlayerSnapshot();
  const listeners = new Set<(s: PlayerSnapshot) => void>();
  const downmixer = new WebAudioDownmixer();
  let attachedHost: HTMLElement | null = null;

  const emit = () => {
    const copy = { ...snap };
    listeners.forEach((l) => l(copy));
  };

  const applyProjectorOptimizations = (host: HTMLElement) => {
    if (!isProj) return;
    const video = host.querySelector("video");
    if (video) {
      const filter = getProjectorCssFilter({ enabled: true, contrastBoost: 8, gammaLift: 2 });
      if (filter) video.style.filter = filter;
      downmixer.attach(video, {
        profileId: "projector-beem",
        boostVolume: 1.25,
        enableCompression: true,
      });
    }
  };

  return {
    attach(host: HTMLElement) {
      attachedHost = host;
      fallback.attach(host);
      queueMicrotask(() => {
        if (attachedHost) applyProjectorOptimizations(attachedHost);
      });
    },
    detach() {
      downmixer.detach();
      attachedHost = null;
      fallback.detach();
    },
    async load(src: PlayerSource) {
      await fallback.load(src);
      snap = initialPlayerSnapshot();
      snap.status = "loading";
      emit();
      if (attachedHost) {
        setTimeout(() => {
          if (attachedHost) applyProjectorOptimizations(attachedHost);
        }, 150);
      }
    },
    play(playOptions) {
      return fallback.play(playOptions);
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
      listeners.clear();
      downmixer.detach();
      attachedHost = null;
      fallback.destroy();
    },
  };
}
