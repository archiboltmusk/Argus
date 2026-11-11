/**
 * Local Wi-Fi Mesh Sync (Zero-Internet LAN Watch Party)
 *
 * Synchronizes video playback across devices on the same local network
 * without external relay servers, using NTP-style clock offset compensation
 * and dynamic playback-rate smoothing (< 20ms drift target).
 */

export interface LanPeer {
  id: string;
  name: string;
  deviceType: "desktop" | "mobile" | "tv";
  ip?: string;
  rttMs: number;
  clockOffsetMs: number;
  lastSeen: number;
}

export interface MeshPlaybackState {
  isPlaying: boolean;
  positionSec: number;
  timestampMs: number; // Host local time at positionSec
  playbackRate: number;
  mediaId: string;
}

export type MeshSyncAction =
  | { type: "PLAY"; positionSec: number; timestampMs: number }
  | { type: "PAUSE"; positionSec: number }
  | { type: "SEEK"; positionSec: number }
  | { type: "RATE"; rate: number };

export interface ClockSyncResult {
  rttMs: number;
  offsetMs: number;
}

/**
 * Calculates NTP clock offset and RTT from a 4-timestamp exchange:
 * t1: Client send time
 * t2: Server receive time
 * t3: Server transmit time
 * t4: Client receive time
 */
export function calculateClockSync(t1: number, t2: number, t3: number, t4: number): ClockSyncResult {
  const rttMs = Math.max(0, (t4 - t1) - (t3 - t2));
  const offsetMs = ((t2 - t1) + (t3 - t4)) / 2;
  return { rttMs, offsetMs };
}

/**
 * Calculates exact expected playback position accounting for host clock offset and elapsed time.
 */
export function estimateHostPlaybackPosition(
  hostState: MeshPlaybackState,
  clientCurrentLocalTimeMs: number,
  clockOffsetMs: number,
): number {
  if (!hostState.isPlaying) {
    return hostState.positionSec;
  }

  // Estimated host time right now = clientLocalTime + clockOffset
  const estimatedHostNow = clientCurrentLocalTimeMs + clockOffsetMs;
  const elapsedSeconds = Math.max(0, (estimatedHostNow - hostState.timestampMs) / 1000);

  return hostState.positionSec + elapsedSeconds * (hostState.playbackRate || 1.0);
}

/**
 * Determines whether client needs a micro-speed adjustment (0.98x / 1.02x)
 * or a hard seek based on drift distance.
 */
export function evaluateDriftCorrection(
  clientPositionSec: number,
  targetPositionSec: number,
): { action: "in_sync" | "smooth_speed" | "hard_seek"; adjustmentFactor: number; driftSec: number } {
  const driftSec = clientPositionSec - targetPositionSec;
  const absDrift = Math.abs(driftSec);

  // Less than 40ms drift is considered pristine sync
  if (absDrift < 0.04) {
    return { action: "in_sync", adjustmentFactor: 1.0, driftSec };
  }

  // Drift between 40ms and 1.2s: smooth playback rate steering (gentle, unnoticeable pitch)
  if (absDrift <= 1.2) {
    const factor = driftSec > 0 ? 0.96 : 1.04;
    return { action: "smooth_speed", adjustmentFactor: factor, driftSec };
  }

  // Drift exceeds 1.2s: hard seek required
  return { action: "hard_seek", adjustmentFactor: 1.0, driftSec };
}

export class LanMeshCoordinator {
  private peers = new Map<string, LanPeer>();
  private currentState: MeshPlaybackState | null = null;
  private isHost = false;
  private localId: string;

  constructor(localId = `peer_${Math.random().toString(36).slice(2, 8)}`) {
    this.localId = localId;
  }

  public setHost(host: boolean): void {
    this.isHost = host;
  }

  public getLocalId(): string {
    return this.localId;
  }

  public getIsHost(): boolean {
    return this.isHost;
  }

  public registerPeer(peer: LanPeer): void {
    this.peers.set(peer.id, peer);
  }

  public getPeers(): LanPeer[] {
    return Array.from(this.peers.values());
  }

  public updateState(state: MeshPlaybackState): void {
    this.currentState = state;
  }

  public getCurrentState(): MeshPlaybackState | null {
    return this.currentState;
  }
}
