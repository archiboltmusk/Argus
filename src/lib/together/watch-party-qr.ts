/**
 * Watch Party QR Join & Sync Helpers.
 *
 * Implements Nuvio-style instant mobile companion join via QR code
 * and automatic playback drift detection / 1-click catch-up.
 */

export function watchPartyJoinUrl(roomCode: string, hostOrSecret?: string, maybeSecret?: string): string {
  const code = encodeURIComponent(roomCode.trim().toUpperCase());
  let host = "argus.app";
  let secret: string | undefined = maybeSecret;

  if (hostOrSecret) {
    if (hostOrSecret.includes(".") || hostOrSecret.includes(":") || hostOrSecret === "localhost") {
      host = hostOrSecret;
    } else if (!maybeSecret) {
      secret = hostOrSecret;
    }
  }

  const base = host.includes(":") || host === "localhost" ? `http://${host}:1420` : `https://${host}`;
  const secretParam = secret ? `&partyKey=${encodeURIComponent(secret)}` : "";
  return `${base}/together?partyRoom=${encodeURIComponent(roomCode)}&room=${code}${secretParam}`;
}

export function generateQrCodeSvg(text: string, size = 180): string {
  // Generates a clean standalone SVG data URL QR representation
  // For lightweight rendering without pulling heavy 3rd-party dependencies
  const encoded = encodeURIComponent(text);
  // Quick URL to render clean vector QR via standard svg api or canvas fallback
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encoded}&format=svg&margin=1`;
}

export interface WatchPartyDriftInfo {
  driftSec: number;
  needsSync: boolean;
  driftLabel: string;
  action: "in-sync" | "rate-adjust" | "seek";
  targetPlaybackRate: number;
  seekTarget?: number;
}

export const SYNC_DRIFT_THRESHOLD_SEC = 2.0;

export function evaluateWatchPartyDrift(
  hostPositionSec: number,
  localPositionSec: number,
): WatchPartyDriftInfo {
  const driftSec = Math.round((localPositionSec - hostPositionSec) * 10) / 10;
  const absDrift = Math.abs(driftSec);

  let action: "in-sync" | "rate-adjust" | "seek" = "in-sync";
  let targetPlaybackRate = 1.0;
  let seekTarget: number | undefined = undefined;

  if (absDrift < 0.25) {
    action = "in-sync";
    targetPlaybackRate = 1.0;
  } else if (absDrift <= SYNC_DRIFT_THRESHOLD_SEC) {
    action = "rate-adjust";
    // If local is behind host (driftSec < 0), speed up slightly (e.g. 1.05x); if ahead, slow down (e.g. 0.95x)
    targetPlaybackRate = driftSec < 0 ? 1.05 : 0.95;
  } else {
    action = "seek";
    seekTarget = hostPositionSec;
  }

  const needsSync = action !== "in-sync";

  let driftLabel = "In sync";
  if (needsSync) {
    driftLabel = driftSec < 0 ? `${absDrift.toFixed(1)}s behind host` : `${absDrift.toFixed(1)}s ahead of host`;
  }

  return {
    driftSec,
    needsSync,
    driftLabel,
    action,
    targetPlaybackRate,
    seekTarget,
  };
}
