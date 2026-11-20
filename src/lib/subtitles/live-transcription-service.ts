import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";

const isTauri = typeof window !== "undefined" && ("__TAURI__" in window || "__TAURI_INTERNALS__" in window);

export type GenerationMode = "verbatim" | "translate" | "bilingual" | "academic";

export interface GenerationProfile {
  id: GenerationMode;
  name: string;
  description: string;
  badge?: string;
}

export const GENERATION_PROFILES: GenerationProfile[] = [
  {
    id: "verbatim",
    name: "Original Speech",
    description: "Generate captions in the spoken language.",
  },
  {
    id: "translate",
    name: "Translate to English",
    description: "Generate English subtitles from supported spoken languages.",
    badge: "Popular",
  },
  {
    id: "bilingual",
    name: "Dual Subtitles",
    description: "Displays original speech and English translation together for language learning.",
    badge: "Bilingual",
  },
  {
    id: "academic",
    name: "Lecture & Exam Focus",
    description: "Preserves fast-paced speech and technical/medical terms (CoreBTR, NEET-PG, Science).",
    badge: "High-Yield",
  },
];

export interface SubtitleLanguageOption {
  code: string;
  label: string;
  nativeLabel?: string;
}

export const SUBTITLE_LANGUAGES: SubtitleLanguageOption[] = [
  { code: "auto", label: "Auto Detect", nativeLabel: "Smart Multilingual" },
  { code: "en", label: "English", nativeLabel: "English" },
  { code: "bn", label: "Bengali", nativeLabel: "বাংলা" },
  { code: "hi", label: "Hindi", nativeLabel: "हिन्दी" },
  { code: "ja", label: "Japanese", nativeLabel: "日本語" },
  { code: "es", label: "Spanish", nativeLabel: "Español" },
  { code: "ko", label: "Korean", nativeLabel: "한국어" },
  { code: "zh", label: "Mandarin Chinese", nativeLabel: "中文" },
  { code: "fr", label: "French", nativeLabel: "Français" },
  { code: "de", label: "German", nativeLabel: "Deutsch" },
  { code: "ta", label: "Tamil", nativeLabel: "தமிழ்" },
  { code: "te", label: "Telugu", nativeLabel: "తెలుగు" },
  { code: "ru", label: "Russian", nativeLabel: "Русский" },
  { code: "ar", label: "Arabic", nativeLabel: "العربية" },
  { code: "pt", label: "Portuguese", nativeLabel: "Português" },
  { code: "it", label: "Italian", nativeLabel: "Italiano" },
];

export interface LiveTranscriptionState {
  isActive: boolean;
  status: "idle" | "preparing" | "transcribing" | "completed" | "error";
  progressPct: number;
  currentSec: number;
  totalSec: number;
  cueCount: number;
  latestSnippet: string | null;
  speedMultiplier: number;
  estimatedRemainingSec: number;
  mediaUrl: string | null;
  filePath: string | null;
  translate: boolean;
  lang: string | null;
  mode: GenerationMode;
  cleanSdh: boolean;
  error: string | null;
  missingRanges: Array<[number, number]>;
}

type Listener = () => void;

class LiveTranscriptionManager {
  private static instance: LiveTranscriptionManager;

  private state: LiveTranscriptionState = {
    isActive: false,
    status: "idle",
    progressPct: 0,
    currentSec: 0,
    totalSec: 0,
    cueCount: 0,
    latestSnippet: null,
    speedMultiplier: 1.0,
    estimatedRemainingSec: 0,
    mediaUrl: null,
    filePath: null,
    translate: false,
    lang: null,
    mode: "verbatim",
    cleanSdh: true,
    error: null,
    missingRanges: [],
  };

  private listeners = new Set<Listener>();
  private unlistenProgress: (() => void) | null = null;
  private unlistenLive: (() => void) | null = null;
  private onAddTrackCallback:
    | ((path: string, lang: string, name: string) => Promise<boolean | void>)
    | null = null;
  private trackMounted = false;
  private runStartTime = 0;
  private running = false;

  public static getInstance(): LiveTranscriptionManager {
    if (!LiveTranscriptionManager.instance) {
      LiveTranscriptionManager.instance = new LiveTranscriptionManager();
    }
    return LiveTranscriptionManager.instance;
  }

  public getState(): LiveTranscriptionState {
    return this.state;
  }

  public subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    for (const listener of this.listeners) {
      try {
        listener();
      } catch (err) {
        console.error("[LiveTranscriptionManager] notify error:", err);
      }
    }
  }

  private updateState(patch: Partial<LiveTranscriptionState>) {
    this.state = { ...this.state, ...patch };
    this.notify();
  }

  public async start(options: {
    mediaUrl: string;
    headers?: Record<string, string> | null;
    durationSec?: number | null;
    audioStreamIndex?: number;
    lang?: string | null;
    translate?: boolean;
    mode?: GenerationMode;
    cleanSdh?: boolean;
    onAddTrack?: (path: string, lang: string, name: string) => Promise<boolean | void>;
  }): Promise<void> {
    if (!isTauri) {
      this.updateState({
        error: "Whisper speech-to-text requires desktop Tauri environment.",
        status: "error",
      });
      return;
    }

    if (this.running) return;
    this.running = true;

    this.onAddTrackCallback = options.onAddTrack ?? null;
    this.trackMounted = false;
    this.runStartTime = Date.now();

    const isTranslate = options.translate || options.mode === "translate";
    const selectedMode: GenerationMode = options.mode || (isTranslate ? "translate" : "verbatim");
    const cleanSdh = options.cleanSdh ?? true;

    try {
      const pathMod = await import("@tauri-apps/api/path");
      const dir = await pathMod.join(await pathMod.tempDir(), "argus-subs");
      const fileName = `whisper-live-${Date.now()}.srt`;
      const filePath = await pathMod.join(dir, fileName);

      try {
        const { mkdir } = await import("@tauri-apps/plugin-fs");
        await mkdir(dir, { recursive: true });
      } catch {
        // Rust also guarantees recursive dir creation
      }

      this.updateState({
        isActive: true,
        status: "preparing",
        progressPct: 0,
        currentSec: 0,
        totalSec: options.durationSec ?? 0,
        cueCount: 0,
        latestSnippet: null,
        speedMultiplier: 1.0,
        estimatedRemainingSec: 0,
        mediaUrl: options.mediaUrl,
        filePath,
        translate: isTranslate,
        lang: options.lang ?? null,
        mode: selectedMode,
        cleanSdh,
        error: null,
        missingRanges: [],
      });

      // Hook global Tauri event listeners that persist even when minimized
      const { listen } = await import("@tauri-apps/api/event");

      this.unlistenProgress = await listen<{
        current: number;
        total: number;
        currentSec: number;
        totalSec: number;
        count?: number;
      }>("asr://progress", (event) => {
        const { current, total, currentSec, totalSec, count } = event.payload;
        const pct = Math.min(100, Math.max(0, Math.round((current / total) * 100)));
        
        // Calculate speed & remaining ETA
        const elapsedSec = Math.max(0.1, (Date.now() - this.runStartTime) / 1000);
        const speed = currentSec > 0 ? Math.round((currentSec / elapsedSec) * 10) / 10 : 1.0;
        const remainingSec = speed > 0 && totalSec > currentSec ? Math.round((totalSec - currentSec) / speed) : 0;

        this.updateState({
          status: "transcribing",
          progressPct: pct,
          currentSec,
          totalSec,
          cueCount: count ?? this.state.cueCount,
          speedMultiplier: speed,
          estimatedRemainingSec: remainingSec,
        });
      });

      this.unlistenLive = await listen<{
        chunk: number;
        total: number;
        srt: string;
        count: number;
        filePath?: string;
        latestText?: string;
      }>("asr://live-cues", async (event) => {
        let snippet = event.payload.latestText || null;
        if (!snippet && event.payload.srt) {
          const lines = event.payload.srt.trim().split("\n");
          snippet = lines[lines.length - 1] || null;
        }

        this.updateState({
          cueCount: event.payload.count,
          latestSnippet: snippet,
        });

        if (event.payload.srt) {
          try {
            const { parseSubtitle } = await import("./parser");
            const { setTranscriptCues } = await import("./transcript-store");
            const parsed = parseSubtitle(event.payload.srt);
            if (parsed.length > 0) {
              setTranscriptCues(parsed, options.mediaUrl);
            }
          } catch {}
        }

        // Mount track in player as soon as the first dialogue cues are available
        if (!this.trackMounted && this.onAddTrackCallback && filePath) {
          this.trackMounted = true;
          const trackLabel = isTranslate
            ? "Whisper AI (English Translation)"
            : selectedMode === "academic"
            ? "Whisper AI (Lecture & Exam Focus)"
            : selectedMode === "bilingual"
            ? "Whisper AI (Dual Subtitles)"
            : "Whisper AI (Dialogue)";

          try {
            const mounted = await this.onAddTrackCallback(filePath, isTranslate ? "en" : (options.lang || "en"), trackLabel);
            this.trackMounted = mounted !== false;
          } catch (err) {
            this.trackMounted = false;
            console.warn("[LiveTranscriptionManager] onAddTrackCallback error:", err);
          }
        }
      });

      // Normalize convertFileSrc / asset:// URLs to absolute filesystem paths for ffmpeg
      let resolvedUrl = options.mediaUrl;
      if (
        resolvedUrl.startsWith("http://asset.localhost/") ||
        resolvedUrl.startsWith("https://asset.localhost/") ||
        resolvedUrl.startsWith("asset://localhost/") ||
        resolvedUrl.startsWith("asset://")
      ) {
        const encoded = resolvedUrl
          .replace(/^https?:\/\/asset\.localhost\//, "")
          .replace(/^asset:\/\/localhost\//, "")
          .replace(/^asset:\/\//, "");
        resolvedUrl = decodeURIComponent(encoded);
        if (!resolvedUrl.startsWith("/") && !resolvedUrl.includes(":")) {
          resolvedUrl = "/" + resolvedUrl;
        }
      } else if (resolvedUrl.startsWith("file://")) {
        resolvedUrl = decodeURIComponent(resolvedUrl.replace(/^file:\/\//, ""));
      }

      // Kick off native Rust background task
      // Rust writes directly to `output_path` on each chunk and triggers `sub-reload` on mpv
      const { srt, missingRanges } = await invoke<{ srt: string; missingRanges: Array<[number, number]> }>("asr_generate_subtitles", {
        url: resolvedUrl,
        headers: options.headers ?? null,
        durationSec: options.durationSec ?? null,
        audioStreamIndex: options.audioStreamIndex ?? null,
        lang: options.lang ?? null,
        translate: isTranslate,
        outputPath: filePath,
      });

      if (missingRanges.length > 0) {
        const format = (seconds: number) => {
          const whole = Math.floor(seconds);
          return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, "0")}`;
        };
        const list = missingRanges.map(([from, to]) => `${format(from)}–${format(to)}`).join(", ");
        this.updateState({
          isActive: false,
          status: "error",
          missingRanges,
          error: `Incomplete subtitles. Missing audio ranges: ${list}.`,
        });
      } else if (!srt || srt.trim().length === 0) {
        this.updateState({
          status: "error",
          error: "No intelligible speech detected in media stream.",
          isActive: false,
        });
      } else {
        this.updateState({
          status: "completed",
          progressPct: 100,
          isActive: false,
        });
      }
    } catch (err: any) {
      if (err === "cancelled") {
        this.updateState({
          status: "idle",
          isActive: false,
          error: null,
        });
      } else {
        console.error("[LiveTranscriptionManager] transcription error:", err);
        this.updateState({
          status: "error",
          error: typeof err === "string" ? err : (err?.message ?? "Transcription failed."),
          isActive: false,
        });
      }
    } finally {
      this.cleanupListeners();
      this.running = false;
    }
  }

  public async exportSrt(customFilename?: string): Promise<string | null> {
    if (!isTauri || !this.state.filePath) return null;
    try {
      const { save } = await import("@tauri-apps/plugin-dialog");
      const { copyFile } = await import("@tauri-apps/plugin-fs");
      const defaultName = customFilename || `Argus-Whisper-Subtitles-${Date.now()}.srt`;
      const targetPath = await save({
        defaultPath: defaultName,
        filters: [{ name: "Subtitles (*.srt)", extensions: ["srt"] }],
      });
      if (typeof targetPath === "string") {
        await copyFile(this.state.filePath, targetPath);
        return targetPath;
      }
    } catch (err) {
      console.warn("[LiveTranscriptionManager] exportSrt error:", err);
    }
    return null;
  }

  public async stop(): Promise<void> {
    if (isTauri) {
      try {
        await invoke("asr_cancel_subtitles");
      } catch (err) {
        console.warn("[LiveTranscriptionManager] asr_cancel_subtitles error:", err);
      }
    }
    this.cleanupListeners();
    this.updateState({
      isActive: false,
      status: "idle",
      progressPct: 0,
      currentSec: 0,
      totalSec: 0,
      latestSnippet: null,
      speedMultiplier: 1.0,
      estimatedRemainingSec: 0,
    });
  }

  private cleanupListeners() {
    if (this.unlistenProgress) {
      this.unlistenProgress();
      this.unlistenProgress = null;
    }
    if (this.unlistenLive) {
      this.unlistenLive();
      this.unlistenLive = null;
    }
  }
}

export const liveTranscription = LiveTranscriptionManager.getInstance();

export function useLiveTranscriptionSession(): LiveTranscriptionState & {
  start: typeof liveTranscription.start;
  stop: typeof liveTranscription.stop;
  exportSrt: typeof liveTranscription.exportSrt;
} {
  const [state, setState] = useState<LiveTranscriptionState>(() => liveTranscription.getState());

  useEffect(() => {
    return liveTranscription.subscribe(() => {
      setState(liveTranscription.getState());
    });
  }, []);

  return {
    ...state,
    start: liveTranscription.start.bind(liveTranscription),
    stop: liveTranscription.stop.bind(liveTranscription),
    exportSrt: liveTranscription.exportSrt.bind(liveTranscription),
  };
}
