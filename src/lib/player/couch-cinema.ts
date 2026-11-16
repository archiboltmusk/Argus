/**
 * P2P Couch Cinema: Low-Latency Sync, Spatial Voice, & Timeline Reactions
 * Provides synchronized group watch sessions with spatial stereo voice positioning,
 * voice-activated movie audio ducking, and communal seekbar reaction hotspots.
 */

export interface PeerPlaybackState {
  peerId: string;
  displayName: string;
  currentSec: number;
  status: "playing" | "paused";
  clockSkewMs: number;
  speaking: boolean;
  lastUpdatedEpochMs?: number;
}

export interface SpatialAudioConfig {
  pan: number; // -1.0 (Full Left) to +1.0 (Full Right)
  gain: number;// 0.0 to 1.0
}

export interface ReactionHotspot {
  timestampSec: number;
  emoji: "🔥" | "😂" | "😱" | "❤️" | "👏";
  count: number;
}

export class CouchCinemaSyncEngine {
  private peers: Map<string, PeerPlaybackState> = new Map();
  private reactions: ReactionHotspot[] = [];

  public updatePeerState(state: PeerPlaybackState) {
    this.peers.set(state.peerId, {
      ...state,
      lastUpdatedEpochMs: Date.now(),
    });
  }

  public removePeer(peerId: string) {
    this.peers.delete(peerId);
  }

  /**
   * Calculates required synchronization action based on peer drift.
   * Drift < 100ms: in sync.
   * Drift 100ms - 1500ms: smooth playback rate compensation (0.97x to 1.03x).
   * Drift > 1500ms: hard seek alignment.
   */
  public evaluateSyncDrift(localSec: number, leaderSec: number): {
    action: "in-sync" | "rate-adjust" | "hard-seek";
    recommendedRate: number;
    targetSeekSec?: number;
    driftSec: number;
  } {
    const driftSec = parseFloat((localSec - leaderSec).toFixed(3));
    const absDrift = Math.abs(driftSec);

    if (absDrift <= 0.08) {
      return { action: "in-sync", recommendedRate: 1.0, driftSec };
    }

    if (absDrift <= 1.5) {
      // If local is ahead, slow down slightly; if local is behind, speed up
      const rate = driftSec > 0 ? 0.96 : 1.04;
      return { action: "rate-adjust", recommendedRate: rate, driftSec };
    }

    return {
      action: "hard-seek",
      recommendedRate: 1.0,
      targetSeekSec: leaderSec,
      driftSec,
    };
  }

  /**
   * Assigns spatial panning coordinates to connected voice peers.
   */
  public calculateSpatialPan(peerIndex: number, totalPeers: number): SpatialAudioConfig {
    if (totalPeers <= 1) {
      return { pan: 0.0, gain: 1.0 }; // Center
    }

    // Distribute peers evenly from -0.75 (left couch) to +0.75 (right couch)
    const step = 1.5 / (totalPeers - 1);
    const pan = parseFloat((-0.75 + peerIndex * step).toFixed(2));
    return { pan, gain: 1.0 };
  }

  /**
   * Voice Activity Ducking:
   * If any peer is speaking, ducks the movie's background audio so their voice is clearly heard.
   * Features automatic 3.0s speech timeout to eliminate stuck-ducking bugs if a peer disconnects.
   */
  public calculateMovieAudioDucking(maxSpeechAgeMs: number = 3000): { duckActive: boolean; volumeMultiplier: number } {
    const now = Date.now();
    for (const peer of this.peers.values()) {
      const isStale = peer.lastUpdatedEpochMs ? now - peer.lastUpdatedEpochMs > maxSpeechAgeMs : false;
      if (peer.speaking && !isStale) {
        return { duckActive: true, volumeMultiplier: 0.42 }; // -7.5 dB duck
      }
    }
    return { duckActive: false, volumeMultiplier: 1.0 };
  }

  /**
   * Adds a user reaction hotspot to the timeline.
   */
  public addReaction(sec: number, emoji: ReactionHotspot["emoji"]): ReactionHotspot[] {
    const roundedSec = Math.round(sec);
    const existing = this.reactions.find((r) => Math.abs(r.timestampSec - roundedSec) <= 4 && r.emoji === emoji);

    if (existing) {
      existing.count++;
    } else {
      this.reactions.push({ timestampSec: roundedSec, emoji, count: 1 });
    }

    // Sort chronologically
    this.reactions.sort((a, b) => a.timestampSec - b.timestampSec);
    return [...this.reactions];
  }

  public getReactions(): ReactionHotspot[] {
    return [...this.reactions];
  }
}
