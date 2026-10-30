/**
 * Living Room Companion & Web Remote Controller for Argus
 *
 * Provides phone-to-TV control:
 * - D-Pad navigation (Up, Down, Left, Right, OK, Back)
 * - Playback control (Play, Pause, Seek -10s, Seek +10s)
 * - Volume control & Audio track switcher
 * - Subtitle toggle & English subtitle priority trigger
 */

export type RemoteCommandType =
  | "up"
  | "down"
  | "left"
  | "right"
  | "select"
  | "back"
  | "play_pause"
  | "seek_backward"
  | "seek_forward"
  | "volume_up"
  | "volume_down"
  | "toggle_subtitles"
  | "prefer_english_subs";

export interface RemoteCommandPayload {
  command: RemoteCommandType;
  timestamp: number;
}

const commandListeners = new Set<(cmd: RemoteCommandPayload) => void>();

export function subscribeRemoteCommands(listener: (cmd: RemoteCommandPayload) => void): () => void {
  commandListeners.add(listener);
  return () => {
    commandListeners.delete(listener);
  };
}

export function dispatchRemoteCommand(command: RemoteCommandType): void {
  const payload: RemoteCommandPayload = {
    command,
    timestamp: Date.now(),
  };
  for (const listener of commandListeners) {
    listener(payload);
  }
}

/** Generates the local pairing URL for smartphone web browsers */
export function getRemotePairingUrl(localIp = "127.0.0.1", port = 11470): string {
  return `http://${localIp}:${port}/remote`;
}
