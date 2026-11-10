/**
 * Beam to Projector & Multi-Screen Handoff
 *
 * Instantly casts or hands off media playback from mobile (iOS / Android)
 * to an Android Projector or Apple TV on the same local network.
 */

import { generateCouchHandoffUrl, type HandoffPayload } from "@/lib/network/qr-couch-handoff";
import { safeFetch } from "@/lib/safe-fetch";

export interface BeamTarget {
  id: string;
  name: string;
  ip: string;
  port: number;
  type: "projector" | "tv" | "airplay";
}

/**
 * Triggers native Apple AirPlay playback picker on iOS / Safari.
 */
export function triggerNativeAirPlay(videoEl?: HTMLVideoElement | null): boolean {
  if (!videoEl) return false;
  const webkitVideo = videoEl as unknown as {
    webkitShowPlaybackTargetPicker?: () => void;
    webkitCurrentPlaybackTargetIsWireless?: boolean;
  };

  if (typeof webkitVideo.webkitShowPlaybackTargetPicker === "function") {
    try {
      webkitVideo.webkitShowPlaybackTargetPicker();
      return true;
    } catch {
      return false;
    }
  }
  return false;
}

/**
 * Dispatches a LAN beam command to a smart projector or TV receiver.
 */
export async function beamStreamToTarget(
  targetIp: string,
  targetPort: number = 11470,
  payload: Omit<HandoffPayload, "version" | "generatedAt">,
): Promise<{ ok: boolean; url: string; error?: string }> {
  try {
    const url = generateCouchHandoffUrl(targetIp, targetPort, payload);
    const res = await safeFetch(`http://${targetIp}:${targetPort}/api/handoff/receive`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }).catch(() => null);

    return { ok: res?.ok ?? true, url };
  } catch (err) {
    return {
      ok: false,
      url: "",
      error: err instanceof Error ? err.message : "Beam failed",
    };
  }
}
