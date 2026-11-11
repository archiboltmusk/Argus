/**
 * Zero-Install Web Remote (Phone Touchpad & Scrubber Companion)
 *
 * Generates local QR code pairings for smart devices on the local Wi-Fi,
 * handling real-time remote commands (trackpad gestures, volume, playback control, search).
 */

export interface RemoteCommand {
  type:
    | "PLAY_PAUSE"
    | "SEEK_DELTA"
    | "SEEK_ABSOLUTE"
    | "VOLUME_SET"
    | "TOGGLE_SUBTITLES"
    | "TOGGLE_AUDIO"
    | "SEARCH_QUERY";
  payload?: {
    deltaSec?: number;
    positionSec?: number;
    volumePercent?: number; // 0 to 100
    query?: string;
  };
  sessionId: string;
  timestamp: number;
}

export interface RemoteSession {
  sessionId: string;
  token: string;
  lanIp: string;
  port: number;
  createdAt: number;
  expiresAt: number;
  connectedDevice?: string;
}

const SESSION_TTL_MS = 15 * 60 * 1000; // 15 minutes pairing validity
let activeSession: RemoteSession | null = null;
const commandHandlers = new Set<(cmd: RemoteCommand) => void>();

export function generateRemotePairing(lanIp = "192.168.1.100", port = 11470): RemoteSession {
  const sessionId = `ses_${Math.random().toString(36).slice(2, 10)}`;
  const token = `tok_${Math.random().toString(36).slice(2, 12)}`;
  const now = Date.now();

  activeSession = {
    sessionId,
    token,
    lanIp,
    port,
    createdAt: now,
    expiresAt: now + SESSION_TTL_MS,
  };

  return activeSession;
}

export function getActiveRemoteSession(): RemoteSession | null {
  if (!activeSession) return null;
  if (Date.now() > activeSession.expiresAt) {
    activeSession = null;
    return null;
  }
  return activeSession;
}

/**
 * Builds the URL payload for the QR Code displayed on-screen.
 */
export function buildQrCodeRemoteUrl(session: RemoteSession = generateRemotePairing()): string {
  return `http://${session.lanIp}:${session.port}/remote?session=${session.sessionId}&token=${session.token}`;
}

/**
 * Validates incoming remote command against active session before execution.
 */
export function dispatchRemoteCommand(
  cmd: RemoteCommand,
): { accepted: boolean; reason?: string } {
  const session = getActiveRemoteSession();
  if (!session) {
    return { accepted: false, reason: "No active remote session" };
  }

  if (cmd.sessionId !== session.sessionId) {
    return { accepted: false, reason: "Invalid session credentials" };
  }

  for (const handler of commandHandlers) {
    try {
      handler(cmd);
    } catch {}
  }

  return { accepted: true };
}

export function subscribeRemoteCommands(
  handler: (cmd: RemoteCommand) => void,
): () => void {
  commandHandlers.add(handler);
  return () => {
    commandHandlers.delete(handler);
  };
}
