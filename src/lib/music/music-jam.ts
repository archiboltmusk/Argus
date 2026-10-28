import { getMusicState, playMusic, seekMusic, toggleMusicPlayback, subscribeMusic } from "./player";
import type { MusicTrack } from "./types";

export type JamParticipant = {
  id: string;
  name: string;
  avatar?: string;
  isHost: boolean;
};

export type MusicJamState = {
  active: boolean;
  roomId: string | null;
  roomName: string | null;
  isHost: boolean;
  participants: JamParticipant[];
  syncedTrack: MusicTrack | null;
};

let jamState: MusicJamState = {
  active: false,
  roomId: null,
  roomName: null,
  isHost: false,
  participants: [],
  syncedTrack: null,
};

const listeners = new Set<() => void>();

function notify() {
  for (const l of listeners) l();
}

export function subscribeMusicJam(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function getMusicJamState(): MusicJamState {
  return jamState;
}

/**
 * Starts a new Music Jam room as the host.
 */
export function startMusicJam(roomName = "Music Room"): { roomId: string; inviteUrl: string } {
  const roomId = `jam-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
  jamState = {
    active: true,
    roomId,
    roomName,
    isHost: true,
    participants: [{ id: "host", name: "Host (You)", isHost: true }],
    syncedTrack: getMusicState().current,
  };
  notify();

  const inviteUrl = `argus://music/jam/${roomId}`;
  return { roomId, inviteUrl };
}

/**
 * Joins an existing Music Jam session via room code or invite URL.
 */
export function joinMusicJam(roomId: string, participantName = "Guest"): void {
  jamState = {
    active: true,
    roomId,
    roomName: "Shared Jam Session",
    isHost: false,
    participants: [
      { id: "host", name: "Host", isHost: true },
      { id: "guest", name: participantName, isHost: false },
    ],
    syncedTrack: null,
  };
  notify();
}

/**
 * Leaves the active Music Jam room.
 */
export function leaveMusicJam(): void {
  jamState = {
    active: false,
    roomId: null,
    roomName: null,
    isHost: false,
    participants: [],
    syncedTrack: null,
  };
  notify();
}

/**
 * Handles incoming remote playback actions from group participants.
 */
export async function applyJamRemoteAction(action: {
  type: "play" | "pause" | "seek" | "changeTrack";
  track?: MusicTrack;
  position?: number;
}): Promise<void> {
  if (!jamState.active) return;

  if (action.type === "changeTrack" && action.track) {
    await playMusic(action.track);
    if (action.position && action.position > 0) seekMusic(action.position);
  } else if (action.type === "pause" || action.type === "play") {
    toggleMusicPlayback();
  } else if (action.type === "seek" && action.position != null) {
    seekMusic(action.position);
  }
}

// Host sync loop: sends state changes when playing in a room
if (typeof window !== "undefined") {
  let lastTrackId: string | null = null;
  subscribeMusic(() => {
    if (!jamState.active || !jamState.isHost) return;
    const s = getMusicState();
    if (s.current && s.current.id !== lastTrackId) {
      lastTrackId = s.current.id;
      jamState.syncedTrack = s.current;
      notify();
    }
  });
}
