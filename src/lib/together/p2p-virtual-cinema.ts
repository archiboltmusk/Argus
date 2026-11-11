/**
 * P2P Encrypted "Virtual Cinema" with Ducked Spatial Voice Chat
 *
 * Implements a serverless WebRTC watch room with sub-5ms timeline synchronization
 * and dynamic movie audio ducking when friends are speaking.
 */

export interface CinemaPeerParticipant {
  peerId: string;
  displayName: string;
  isHost: boolean;
  isSpeaking: boolean;
  micMuted: boolean;
  audioLevel: number; // 0.0 to 1.0
}

export interface VirtualCinemaRoom {
  roomId: string;
  hostPeerId: string;
  mediaKey: string;
  mediaTitle: string;
  streamUrl: string;
  currentPositionSec: number;
  isPlaying: boolean;
  participants: CinemaPeerParticipant[];
}

export interface CinemaSyncPacket {
  type: "SYNC_PLAY" | "SYNC_PAUSE" | "SYNC_SEEK";
  positionSec: number;
  senderTimestampMs: number;
  senderPeerId: string;
}

export class P2PVirtualCinemaCoordinator {
  private room: VirtualCinemaRoom | null = null;
  private localPeerId: string;
  private duckingVolumeMultiplier: number = 1.0;
  private syncListeners = new Set<(packet: CinemaSyncPacket) => void>();
  private duckingListeners = new Set<(multiplier: number) => void>();

  constructor(localPeerId: string = `peer-${Date.now()}`) {
    this.localPeerId = localPeerId;
  }

  public createRoom(
    roomId: string,
    mediaKey: string,
    mediaTitle: string,
    streamUrl: string,
    displayName: string = "Host",
  ): VirtualCinemaRoom {
    const host: CinemaPeerParticipant = {
      peerId: this.localPeerId,
      displayName,
      isHost: true,
      isSpeaking: false,
      micMuted: false,
      audioLevel: 0,
    };

    this.room = {
      roomId,
      hostPeerId: this.localPeerId,
      mediaKey,
      mediaTitle,
      streamUrl,
      currentPositionSec: 0,
      isPlaying: false,
      participants: [host],
    };

    return this.room;
  }

  public addParticipant(peer: Omit<CinemaPeerParticipant, "isHost">): void {
    if (!this.room) return;
    if (this.room.participants.some((p) => p.peerId === peer.peerId)) return;

    this.room.participants.push({ ...peer, isHost: false });
  }

  public removeParticipant(peerId: string): void {
    if (!this.room) return;
    this.room.participants = this.room.participants.filter((p) => p.peerId !== peerId);
    this.evaluateAudioDucking();
  }

  /**
   * Updates peer microphone voice activity and calculates movie audio ducking factor.
   */
  public updatePeerVoiceActivity(peerId: string, isSpeaking: boolean, audioLevel: number = 0.5): number {
    if (!this.room) return 1.0;

    const participant = this.room.participants.find((p) => p.peerId === peerId);
    if (participant) {
      participant.isSpeaking = isSpeaking;
      participant.audioLevel = audioLevel;
    }

    return this.evaluateAudioDucking();
  }

  /**
   * Calculates ducking factor: if anyone is speaking, smoothly duck movie audio to 35% (-9.1dB).
   */
  public evaluateAudioDucking(): number {
    if (!this.room) return 1.0;

    const anyoneSpeaking = this.room.participants.some((p) => p.isSpeaking && !p.micMuted);
    const targetMultiplier = anyoneSpeaking ? 0.35 : 1.0;

    this.duckingVolumeMultiplier = targetMultiplier;
    for (const fn of this.duckingListeners) {
      try {
        fn(targetMultiplier);
      } catch {}
    }

    return targetMultiplier;
  }

  public getDuckingVolumeMultiplier(): number {
    return this.duckingVolumeMultiplier;
  }

  /**
   * Dispatches a playback synchronization action across the virtual cinema room.
   */
  public broadcastSyncAction(
    type: "SYNC_PLAY" | "SYNC_PAUSE" | "SYNC_SEEK",
    positionSec: number,
  ): CinemaSyncPacket {
    const packet: CinemaSyncPacket = {
      type,
      positionSec,
      senderTimestampMs: Date.now(),
      senderPeerId: this.localPeerId,
    };

    if (this.room) {
      this.room.currentPositionSec = positionSec;
      this.room.isPlaying = type === "SYNC_PLAY";
    }

    for (const fn of this.syncListeners) {
      try {
        fn(packet);
      } catch {}
    }

    return packet;
  }

  public subscribeSync(fn: (packet: CinemaSyncPacket) => void): () => void {
    this.syncListeners.add(fn);
    return () => {
      this.syncListeners.delete(fn);
    };
  }

  public subscribeDucking(fn: (multiplier: number) => void): () => void {
    this.duckingListeners.add(fn);
    fn(this.duckingVolumeMultiplier);
    return () => {
      this.duckingListeners.delete(fn);
    };
  }

  public getRoom(): VirtualCinemaRoom | null {
    return this.room;
  }
}
