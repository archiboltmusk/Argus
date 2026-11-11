/**
 * Multi-Debrid CDN Speed-Race & Instant Failover Engine
 *
 * Simultaneously probes candidate debrid CDN endpoints (Real-Debrid, AllDebrid,
 * TorBox, Premiumize) to select the lowest-latency route, with seamless in-stream
 * failover if an active CDN throttles or encounters server errors.
 */

export interface DebridMirrorCandidate {
  providerId: "realdebrid" | "alldebrid" | "torbox" | "premiumize" | "debridlink";
  streamUrl: string;
  sourceLabel: string;
  measuredLatencyMs?: number;
  isAlive: boolean;
}

export interface SpeedRaceResult {
  winner: DebridMirrorCandidate;
  candidates: DebridMirrorCandidate[];
  benchmarkDurationMs: number;
}

export interface MultiDebridRaceConfig {
  parallelRaceEnabled: boolean;
  probeTimeoutMs: number; // default: 1200ms
  autoFailoverOnStall: boolean;
  maxStallDurationSec: number; // trigger failover after 6s of buffer starvation
}

const STORAGE_KEY = "argus.debrid.speed_race.v1";

const DEFAULT_CONFIG: MultiDebridRaceConfig = {
  parallelRaceEnabled: true,
  probeTimeoutMs: 1200,
  autoFailoverOnStall: true,
  maxStallDurationSec: 6,
};

let configCache: MultiDebridRaceConfig | null = null;

export function getMultiDebridRaceConfig(): MultiDebridRaceConfig {
  if (configCache) return configCache;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    configCache = raw ? { ...DEFAULT_CONFIG, ...JSON.parse(raw) } : { ...DEFAULT_CONFIG };
  } catch {
    configCache = { ...DEFAULT_CONFIG };
  }
  return configCache ?? DEFAULT_CONFIG;
}

export function updateMultiDebridRaceConfig(
  patch: Partial<MultiDebridRaceConfig>,
): MultiDebridRaceConfig {
  const current = getMultiDebridRaceConfig();
  configCache = { ...current, ...patch };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(configCache));
  } catch {}
  return configCache;
}

/**
 * Probes a candidate URL via lightweight HTTP HEAD request with timeout.
 */
export async function probeCandidateLatency(
  candidate: DebridMirrorCandidate,
  timeoutMs: number = 1200,
): Promise<DebridMirrorCandidate> {
  const start = Date.now();
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    const res = await fetch(candidate.streamUrl, {
      method: "HEAD",
      signal: controller.signal,
    });
    clearTimeout(timer);

    const elapsed = Date.now() - start;
    return {
      ...candidate,
      measuredLatencyMs: elapsed,
      isAlive: res.ok || res.status === 416 || res.status === 206,
    };
  } catch {
    return {
      ...candidate,
      measuredLatencyMs: 9999,
      isAlive: false,
    };
  }
}

/**
 * Races multiple mirror stream candidates in parallel and returns the fastest responsive provider.
 */
export async function executeDebridSpeedRace(
  candidates: DebridMirrorCandidate[],
  config: MultiDebridRaceConfig = getMultiDebridRaceConfig(),
): Promise<SpeedRaceResult> {
  if (candidates.length === 0) {
    throw new Error("No debrid mirror candidates provided for speed race.");
  }

  if (!config.parallelRaceEnabled || candidates.length === 1) {
    return {
      winner: candidates[0],
      candidates,
      benchmarkDurationMs: 0,
    };
  }

  const raceStart = Date.now();
  const tested = await Promise.all(
    candidates.map((c) => probeCandidateLatency(c, config.probeTimeoutMs)),
  );
  const benchmarkDurationMs = Date.now() - raceStart;

  // Sort by alive status, then lowest latency
  const sorted = [...tested].sort((a, b) => {
    if (a.isAlive !== b.isAlive) return a.isAlive ? -1 : 1;
    return (a.measuredLatencyMs ?? 9999) - (b.measuredLatencyMs ?? 9999);
  });

  const winner = sorted[0];
  return {
    winner,
    candidates: sorted,
    benchmarkDurationMs,
  };
}

/**
 * Mid-stream failover coordinator: selects the next available alive mirror candidate.
 */
export class StreamFailoverCoordinator {
  private activeCandidate: DebridMirrorCandidate | null = null;
  private backupPool: DebridMirrorCandidate[] = [];

  public initialize(winner: DebridMirrorCandidate, backups: DebridMirrorCandidate[]): void {
    this.activeCandidate = winner;
    this.backupPool = backups.filter((b) => b.streamUrl !== winner.streamUrl);
  }

  public getActive(): DebridMirrorCandidate | null {
    return this.activeCandidate;
  }

  public getBackups(): DebridMirrorCandidate[] {
    return [...this.backupPool];
  }

  /**
   * Promotes the next best backup provider when the active stream fails.
   */
  public triggerFailover(currentPositionSec: number): {
    newCandidate: DebridMirrorCandidate;
    resumePositionSec: number;
  } | null {
    const next = this.backupPool.find((b) => b.isAlive);
    if (!next) return null;

    // Remove promoted backup
    this.backupPool = this.backupPool.filter((b) => b.streamUrl !== next.streamUrl);
    this.activeCandidate = next;

    return {
      newCandidate: next,
      resumePositionSec: Math.max(0, currentPositionSec),
    };
  }
}
