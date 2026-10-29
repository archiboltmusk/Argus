/**
 * Zero-Install QR Couch Handoff
 *
 * Generates an instant local LAN playback handoff link & QR code payload.
 * When scanned by any smartphone camera connected to the same home Wi-Fi network,
 * the mobile browser opens the native video player directly at the exact current
 * playback second and audio track — zero apps or logins required on the phone.
 */

export interface HandoffPayload {
  version: 1;
  title: string;
  streamUrl: string;
  positionSec: number;
  durationSec: number;
  audioTrackId?: string;
  subtitleTrackId?: string;
  subDelaySec?: number;
  lanHostIp?: string;
  generatedAt: number;
}

/**
 * Creates an encoded couch handoff URL.
 */
export function generateCouchHandoffUrl(
  lanHostIp: string,
  port = 11470,
  payload: Omit<HandoffPayload, "version" | "generatedAt">,
): string {
  const fullPayload: HandoffPayload = {
    ...payload,
    version: 1,
    generatedAt: Date.now(),
  };

  const encodedData = encodeURIComponent(btoa(JSON.stringify(fullPayload)));
  return `http://${lanHostIp}:${port}/handoff?data=${encodedData}`;
}

/**
 * Decodes a couch handoff payload from a URL query string.
 */
export function parseCouchHandoffUrl(urlStr: string): HandoffPayload | null {
  try {
    const url = new URL(urlStr);
    const dataParam = url.searchParams.get("data");
    if (!dataParam) return null;
    const jsonStr = atob(decodeURIComponent(dataParam));
    return JSON.parse(jsonStr) as HandoffPayload;
  } catch {
    return null;
  }
}
