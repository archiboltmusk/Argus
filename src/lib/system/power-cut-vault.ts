/**
 * Power-Cut & Load-Shedding Snapshot Vault
 *
 * Designed for regions experiencing frequent load shedding, voltage drops, or abrupt battery deaths.
 * Atomically journals active player timestamps, playlist context, and download states every 5 seconds.
 * On subsequent boot, detects unexpected termination and provides immediate 1-click state recovery.
 */

export interface PowerCutSnapshot {
  timestamp: number;
  cleanExit: boolean;
  media: {
    metaId: string;
    title: string;
    streamUrl?: string;
    positionSec: number;
    durationSec: number;
    audioTrackId?: string;
    subtitleTrackId?: string;
    subtitleDelaySec?: number;
    season?: number;
    episode?: number;
  };
  activeDownloads: Array<{
    id: string;
    title: string;
    progress: number;
    etaSec?: number;
  }>;
}

const VAULT_STORAGE_KEY = "argus.power_cut_vault";
const HEARTBEAT_INTERVAL_MS = 5000;

class PowerCutVault {
  private timer: ReturnType<typeof setInterval> | null = null;
  private currentSnapshot: PowerCutSnapshot | null = null;
  private inMemoryFallback: string | null = null;

  constructor() {
    this.markSessionStarted();
    if (typeof window !== "undefined") {
      window.addEventListener("beforeunload", () => this.markSessionCleanExit());
    }
  }

  /**
   * Initializes or updates atomic snapshot of current playback & queue state.
   */
  public updateSnapshot(data: Partial<PowerCutSnapshot["media"]>, downloads: PowerCutSnapshot["activeDownloads"] = []) {
    const existing = this.getStoredSnapshot();
    const updated: PowerCutSnapshot = {
      timestamp: Date.now(),
      cleanExit: false,
      media: {
        metaId: data.metaId || existing?.media?.metaId || "",
        title: data.title || existing?.media?.title || "",
        streamUrl: data.streamUrl || existing?.media?.streamUrl,
        positionSec: typeof data.positionSec === "number" ? Math.max(0, data.positionSec) : existing?.media?.positionSec || 0,
        durationSec: typeof data.durationSec === "number" ? data.durationSec : existing?.media?.durationSec || 0,
        audioTrackId: data.audioTrackId || existing?.media?.audioTrackId,
        subtitleTrackId: data.subtitleTrackId || existing?.media?.subtitleTrackId,
        subtitleDelaySec: data.subtitleDelaySec ?? existing?.media?.subtitleDelaySec ?? 0,
        season: data.season ?? existing?.media?.season,
        episode: data.episode ?? existing?.media?.episode,
      },
      activeDownloads: downloads.length > 0 ? downloads : existing?.activeDownloads || [],
    };

    this.currentSnapshot = updated;
    this.writeToStorage(updated);
  }

  /**
   * Checks if the previous launch ended unexpectedly (e.g. power outage or crash).
   */
  public checkOutageRecovery(): { hasRecovery: boolean; snapshot: PowerCutSnapshot | null } {
    const snap = this.getStoredSnapshot();
    if (!snap) return { hasRecovery: false, snapshot: null };

    // If session was not cleanly closed and had meaningful progress (> 15 seconds)
    if (!snap.cleanExit && snap.media && snap.media.positionSec > 15) {
      return {
        hasRecovery: true,
        snapshot: snap,
      };
    }

    return { hasRecovery: false, snapshot: null };
  }

  /**
   * Marks session active with periodic heartbeat.
   */
  public markSessionStarted() {
    const snap = this.getStoredSnapshot();
    if (snap) {
      snap.cleanExit = false;
      this.writeToStorage(snap);
    }

    if (this.timer) clearInterval(this.timer);
    this.timer = setInterval(() => {
      if (this.currentSnapshot) {
        this.currentSnapshot.timestamp = Date.now();
        this.writeToStorage(this.currentSnapshot);
      }
    }, HEARTBEAT_INTERVAL_MS);
    if (this.timer && typeof (this.timer as unknown as { unref?: () => void }).unref === "function") {
      (this.timer as unknown as { unref: () => void }).unref();
    }
  }

  /**
   * Marks session cleanly exited during graceful app shutdown.
   */
  public markSessionCleanExit() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    const snap = this.getStoredSnapshot();
    if (snap) {
      snap.cleanExit = true;
      this.writeToStorage(snap);
    }
  }

  /**
   * Clears the current recovery checkpoint once restored or dismissed.
   */
  public clearRecoveryCheckpoint() {
    this.inMemoryFallback = null;
    this.currentSnapshot = null;
    if (typeof localStorage === "undefined") return;
    try {
      localStorage.removeItem(VAULT_STORAGE_KEY);
    } catch {}
  }

  private getStoredSnapshot(): PowerCutSnapshot | null {
    try {
      if (typeof localStorage !== "undefined") {
        const raw = localStorage.getItem(VAULT_STORAGE_KEY);
        if (raw) return JSON.parse(raw);
      }
    } catch {}
    if (this.inMemoryFallback) {
      try {
        return JSON.parse(this.inMemoryFallback);
      } catch {}
    }
    return null;
  }

  private writeToStorage(snap: PowerCutSnapshot) {
    const raw = JSON.stringify(snap);
    this.inMemoryFallback = raw;
    if (typeof localStorage === "undefined") return;
    try {
      localStorage.setItem(VAULT_STORAGE_KEY, raw);
    } catch {}
  }
}

export const powerCutVault = new PowerCutVault();
