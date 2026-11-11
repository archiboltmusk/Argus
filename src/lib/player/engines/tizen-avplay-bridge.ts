import type {
  PlayerBridge,
  PlayerCapabilities,
  PlayerSeekPrecision,
  PlayerSnapshot,
  PlayerSource,
  TrackInfo,
} from "../bridge";
import { initialPlayerSnapshot } from "../bridge";
import { createHtml5Bridge } from "../html5";

interface TizenTrackInfo {
  type?: "AUDIO" | "TEXT" | "VIDEO" | string;
  index?: number;
  extra_info?: string;
}

interface TizenAvPlayApi {
  open(url: string): void;
  close(): void;
  prepareAsync(onSuccess?: () => void, onError?: (err: unknown) => void): void;
  play(): void;
  pause(): void;
  stop(): void;
  seekTo(ms: number, onSuccess?: () => void, onError?: (err: unknown) => void): void;
  setDisplayRect(x: number, y: number, w: number, h: number): void;
  setDisplayMethod?(method: string): void;
  setSpeed(speed: number): void;
  setTimeoutForBuffering?(sec: number): void;
  setSilentSubtitle?(silent: boolean): void;
  setSelectTrack?(type: "AUDIO" | "TEXT" | "VIDEO", index: number): void;
  getTotalTrackInfo?(): TizenTrackInfo[];
  getCurrentStreamInfo?(): TizenTrackInfo[];
  getDuration?(): number;
  getCurrentTime?(): number;
  getState?(): string;
  setListener?(listeners: {
    onbufferingstart?: () => void;
    onbufferingprogress?: (pct: number) => void;
    onbufferingcomplete?: () => void;
    oncurrentplaytime?: (currentMs: number) => void;
    onstreamcompleted?: () => void;
    onevent?: (eventType: string, eventData: string) => void;
    onerror?: (eventType: string) => void;
    onsubtitlechange?: (duration: number, text: string) => void;
  }): void;
}

function getTizenAvPlay(): TizenAvPlayApi | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { webapis?: { avplay?: TizenAvPlayApi } };
  const api = w.webapis?.avplay;
  return api && typeof api.open === "function" && typeof api.prepareAsync === "function" ? api : null;
}

function parseTizenExtraInfo(raw?: string): { language?: string; codec?: string } {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as Record<string, string>;
    return { language: parsed.language, codec: parsed.fourCC || parsed.codec };
  } catch {
    return {};
  }
}

/**
 * Tizen AVPlay Bridge: Samsung Smart TVs (Tizen OS 5.5+)
 * Connects directly to Samsung's hardware `webapis.avplay` pipeline for
 * native MKV, MP4, TS, 4K UHD, HDR10+, AC3/EAC3/DTS audio, and embedded subtitles,
 * falling back cleanly to HTML5 outside Tizen TVs.
 */
export function createTizenAvplayBridge(): PlayerBridge {
  const capabilities: PlayerCapabilities = {
    engine: "html5",
    platformEngine: "tizen-avplay",
    pictureInPicture: false,
    airplay: false,
    chromecast: false,
    hdrPassthrough: true,
    hardwareDecode: true,
    tunneling: true,
  };

  const avplay = getTizenAvPlay();
  if (avplay) {
    let snap: PlayerSnapshot = initialPlayerSnapshot();
    const listeners = new Set<(s: PlayerSnapshot) => void>();
    let host: HTMLElement | null = null;
    let objectEl: HTMLObjectElement | null = null;
    let subVisible = true;
    let activeRevision = 0;

    const emit = () => {
      const copy = { ...snap };
      listeners.forEach((l) => l(copy));
    };

    const syncTracks = () => {
      try {
        const total = avplay.getTotalTrackInfo?.() ?? [];
        const current = avplay.getCurrentStreamInfo?.() ?? [];
        const activeIndices = new Set(current.map((t) => `${t.type}:${t.index}`));
        const audioTracks: TrackInfo[] = [];
        const subtitleTracks: TrackInfo[] = [];
        for (const t of total) {
          const info = parseTizenExtraInfo(t.extra_info);
          const idx = String(t.index ?? 0);
          if (t.type === "AUDIO") {
            audioTracks.push({
              id: idx,
              label: [info.language, info.codec].filter(Boolean).join(" · ") || `Audio ${idx}`,
              lang: info.language,
              codec: info.codec,
              kind: "audio",
              selected: activeIndices.has(`AUDIO:${t.index}`),
            });
          } else if (t.type === "TEXT") {
            subtitleTracks.push({
              id: idx,
              label: info.language || `Subtitle ${idx}`,
              lang: info.language,
              kind: "subtitle",
              selected: activeIndices.has(`TEXT:${t.index}`),
            });
          }
        }
        snap.audioTracks = audioTracks;
        snap.subtitleTracks = subtitleTracks;
      } catch {
        // track introspection unavailable until stream prepared
      }
    };

    const updateRect = () => {
      const rect = host?.getBoundingClientRect();
      const x = Math.round(rect?.left ?? 0);
      const y = Math.round(rect?.top ?? 0);
      const w = Math.round(rect?.width || window.innerWidth || 1920);
      const h = Math.round(rect?.height || window.innerHeight || 1080);
      try {
        avplay.setDisplayRect(x, y, w, h);
      } catch {
        // ignore if state not ready
      }
    };

    return {
      attach(el: HTMLElement) {
        host = el;
        // Samsung AVPlay renders onto an av-player object hole in transparent DOM
        if (!objectEl) {
          objectEl = document.createElement("object");
          objectEl.type = "application/avplayer";
          objectEl.style.cssText = "position:absolute;inset:0;width:100%;height:100%;pointer-events:none;";
          host.appendChild(objectEl);
        }
        updateRect();
      },
      detach() {
        objectEl?.remove();
        objectEl = null;
        host = null;
      },
      async load(src: PlayerSource) {
        activeRevision += 1;
        const rev = activeRevision;
        snap = initialPlayerSnapshot();
        snap.status = "loading";
        emit();
        try {
          avplay.close();
        } catch {
          // ignore if idle
        }
        avplay.open(src.url);
        try {
          avplay.setTimeoutForBuffering?.(8);
          avplay.setDisplayMethod?.("PLAYER_DISPLAY_MODE_LETTER_BOX");
        } catch {
          // optional Tizen properties
        }
        updateRect();
        avplay.setListener?.({
          onbufferingstart: () => {
            if (rev !== activeRevision) return;
            snap.buffering = true;
            emit();
          },
          onbufferingcomplete: () => {
            if (rev !== activeRevision) return;
            snap.buffering = false;
            snap.firstFrameReady = true;
            syncTracks();
            emit();
          },
          oncurrentplaytime: (ms: number) => {
            if (rev !== activeRevision) return;
            snap.positionSec = Math.max(0, ms / 1000);
            const dur = avplay.getDuration?.() ?? 0;
            if (dur > 0) snap.durationSec = dur / 1000;
            snap.firstFrameReady = true;
            emit();
          },
          onsubtitlechange: (_duration: number, text: string) => {
            if (rev !== activeRevision) return;
            snap.subText = subVisible ? text || "" : "";
            emit();
          },
          onstreamcompleted: () => {
            if (rev !== activeRevision) return;
            snap.status = "ended";
            emit();
          },
          onerror: (errType: string) => {
            if (rev !== activeRevision) return;
            snap.status = "error";
            snap.errorCode = "decode";
            snap.errorMessage = `Tizen AVPlay error: ${errType}`;
            emit();
          },
        });

        await new Promise<void>((resolve, reject) => {
          avplay.prepareAsync(
            () => {
              if (rev !== activeRevision) return resolve();
              updateRect();
              const dur = avplay.getDuration?.() ?? 0;
              if (dur > 0) snap.durationSec = dur / 1000;
              syncTracks();
              if (src.startAtSec && src.startAtSec > 0) {
                try {
                  avplay.seekTo(Math.round(src.startAtSec * 1000));
                } catch {
                  // ignore initial seek error
                }
              }
              snap.status = src.startPaused ? "paused" : "playing";
              snap.firstFrameReady = true;
              emit();
              if (!src.startPaused) avplay.play();
              resolve();
            },
            (err) => {
              if (rev !== activeRevision) return resolve();
              snap.status = "error";
              snap.errorCode = "decode";
              snap.errorMessage = String(err ?? "Tizen AVPlay prepareAsync failed");
              emit();
              reject(err);
            },
          );
        });
      },
      async play() {
        avplay.play();
        snap.status = "playing";
        emit();
      },
      pause() {
        avplay.pause();
        snap.status = "paused";
        emit();
      },
      seek(sec: number) {
        const ms = Math.max(0, Math.round(sec * 1000));
        avplay.seekTo(ms);
        snap.positionSec = sec;
        emit();
      },
      setVolume() {},
      setMuted() {},
      setRate(r: number) {
        avplay.setSpeed(r);
        snap.rate = r;
        emit();
      },
      setAudioTrack(id: string) {
        const idx = Number(id);
        if (Number.isFinite(idx)) {
          avplay.setSelectTrack?.("AUDIO", idx);
          syncTracks();
          emit();
        }
      },
      setSubtitleTrack(id: string | null) {
        if (!id) {
          avplay.setSilentSubtitle?.(true);
          subVisible = false;
          snap.subText = "";
          emit();
          return;
        }
        const idx = Number(id);
        if (Number.isFinite(idx)) {
          subVisible = true;
          avplay.setSilentSubtitle?.(false);
          avplay.setSelectTrack?.("TEXT", idx);
          syncTracks();
          emit();
        }
      },
      setSecondarySubtitleTrack() {},
      setSubVisible(on: boolean) {
        subVisible = on;
        avplay.setSilentSubtitle?.(!on);
        if (!on) snap.subText = "";
        emit();
      },
      setSubDelay() {},
      setAudioDelay() {},
      setPanscan() {},
      setVideoZoom() {},
      setAspectOverride() {},
      setStretch() {},
      setVideoEq() {},
      setAnime4kShaders() {},
      async addSubtitle() {
        return false;
      },
      getSelectedTrackCues() {
        return null;
      },
      getSelectedTrackUrl() {
        return null;
      },
      setAudioNormalize() {},
      async screenshot() {
        return { ok: false, error: "Not supported on Tizen AVPlay" };
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
        activeRevision += 1;
        listeners.clear();
        try {
          avplay.stop();
          avplay.close();
        } catch {
          // ignore
        }
        objectEl?.remove();
        objectEl = null;
        host = null;
      },
    };
  }

  // Non-Tizen browser preview fallback
  const fallback = createHtml5Bridge();
  let snap: PlayerSnapshot = initialPlayerSnapshot();
  const listeners = new Set<(s: PlayerSnapshot) => void>();

  const emit = () => {
    const copy = { ...snap };
    listeners.forEach((l) => l(copy));
  };

  return {
    attach(host: HTMLElement) {
      fallback.attach(host);
    },
    detach() {
      fallback.detach();
    },
    async load(src: PlayerSource) {
      await fallback.load(src);
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
      listeners.clear();
      fallback.destroy();
    },
  };
}
