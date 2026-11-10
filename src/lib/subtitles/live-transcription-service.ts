import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";

const isTauri = typeof window !== "undefined" && ("__TAURI__" in window || "__TAURI_INTERNALS__" in window);

export interface LiveTranscriptionState {
  isActive: boolean;
  status: "idle" | "preparing" | "transcribing" | "completed" | "error";
  progressPct: number;
  currentSec: number;
  totalSec: number;
  cueCount: number;
  mediaUrl: string | null;
  filePath: string | null;
  translate: boolean;
  error: string | null;
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
    mediaUrl: null,
    filePath: null,
    translate: false,
    error: null,
  };

  private listeners = new Set<Listener>();
  private unlistenProgress: (() => void) | null = null;
  private unlistenLive: (() => void) | null = null;
  private onAddTrackCallback:
    | ((path: string, lang: string, name: string) => Promise<boolean | void>)
    | null = null;
  private trackMounted = false;

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
    lang?: string | null;
    translate?: boolean;
    onAddTrack?: (path: string, lang: string, name: string) => Promise<boolean | void>;
  }): Promise<void> {
    if (!isTauri) {
      this.updateState({
        error: "Whisper speech-to-text requires desktop Tauri environment.",
        status: "error",
      });
      return;
    }

    // Cancel existing session
    await this.stop();

    this.onAddTrackCallback = options.onAddTrack ?? null;
    this.trackMounted = false;

    try {
      const pathMod = await import("@tauri-apps/api/path");
      const dir = await pathMod.join(await pathMod.tempDir(), "argus-subs");
      const fileName = `whisper-live-${Date.now()}.srt`;
      const filePath = await pathMod.join(dir, fileName);

      this.updateState({
        isActive: true,
        status: "preparing",
        progressPct: 0,
        currentSec: 0,
        totalSec: options.durationSec ?? 0,
        cueCount: 0,
        mediaUrl: options.mediaUrl,
        filePath,
        translate: !!options.translate,
        error: null,
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
        this.updateState({
          status: "transcribing",
          progressPct: pct,
          currentSec,
          totalSec,
          cueCount: count ?? this.state.cueCount,
        });
      });

      this.unlistenLive = await listen<{
        chunk: number;
        total: number;
        srt: string;
        count: number;
        filePath?: string;
      }>("asr://live-cues", async (event) => {
        this.updateState({
          cueCount: event.payload.count,
        });

        // Mount track in player as soon as the first dialogue cues are available
        if (!this.trackMounted && this.onAddTrackCallback && filePath) {
          this.trackMounted = true;
          const trackLabel = options.translate
            ? "Whisper AI (Live English Translation)"
            : "Whisper AI (Live Transcription)";
          try {
            await this.onAddTrackCallback(filePath, options.translate ? "en" : (options.lang || "en"), trackLabel);
          } catch (err) {
            console.warn("[LiveTranscriptionManager] onAddTrackCallback error:", err);
          }
        }
      });

      // Kick off native Rust background task
      // Rust writes directly to `output_path` on each chunk and triggers `sub-reload` on mpv
      const srt = await invoke<string>("asr_generate_subtitles", {
        url: options.mediaUrl,
        headers: options.headers ?? null,
        durationSec: options.durationSec ?? null,
        lang: options.lang ?? null,
        translate: options.translate ?? false,
        outputPath: filePath,
      });

      if (!srt || srt.trim().length === 0) {
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
    }
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
  };
}
