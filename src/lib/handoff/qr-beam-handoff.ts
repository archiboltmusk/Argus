/**
 * Instant Zero-Config QR Beam & Device Handoff
 *
 * Encodes active playback state (stream URL, millisecond position, track language)
 * into a lightweight transient QR payload and universal beam token for instant 1-second
 * playback handoff between Desktop, Mobile, and Android TV without requiring account pairing.
 */

export interface PlaybackBeamSession {
  mediaKey: string;
  title: string;
  streamUrl: string;
  positionSec: number;
  totalDurationSec: number;
  audioLanguage?: string;
  subtitleLanguage?: string;
  timestampMs: number;
  token?: string;
}

const BEAM_TTL_MS = 10 * 60 * 1000; // 10 minutes

/**
 * Creates an encrypted/encoded QR beam payload string from current playback state.
 */
export function generateBeamPayload(
  session: Omit<PlaybackBeamSession, "timestampMs" | "token">,
): { payload: string; beamUrl: string; deepLink: string } {
  const fullSession: PlaybackBeamSession = {
    ...session,
    timestampMs: Date.now(),
  };

  const rawJson = JSON.stringify(fullSession);
  const base64 = typeof btoa !== "undefined"
    ? btoa(unescape(encodeURIComponent(rawJson)))
    : Buffer.from(rawJson).toString("base64");

  const beamUrl = `https://argus.app/beam#${base64}`;
  const deepLink = `argus://beam?data=${base64}`;

  return {
    payload: base64,
    beamUrl,
    deepLink,
  };
}

/**
 * Decodes and validates a QR beam payload string.
 * Rejects expired tokens (>10 minutes).
 */
export function decodeAndValidateBeamPayload(
  base64Payload: string,
): { valid: boolean; session?: PlaybackBeamSession; error?: string } {
  try {
    const rawJson = typeof atob !== "undefined"
      ? decodeURIComponent(escape(atob(base64Payload)))
      : Buffer.from(base64Payload, "base64").toString("utf-8");

    const session = JSON.parse(rawJson) as PlaybackBeamSession;

    if (!session.streamUrl || !session.mediaKey) {
      return { valid: false, error: "Invalid session structure." };
    }

    const elapsed = Date.now() - session.timestampMs;
    if (elapsed > BEAM_TTL_MS) {
      return { valid: false, error: "Beam token expired (TTL 10m)." };
    }

    return {
      valid: true,
      session,
    };
  } catch {
    return { valid: false, error: "Malformed payload encoding." };
  }
}
