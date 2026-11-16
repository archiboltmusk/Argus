export type LocalDevice = {
  id: string;
  name: string;
  type: "mac" | "windows" | "linux" | "tv" | "mobile";
  address: string;
  isOnline: boolean;
  activeMedia?: string;
  lastSeen: number;
};

export type HandoffPayload = {
  title: string;
  streamUrl: string;
  positionMs: number;
  durationMs?: number;
  metaId?: string;
  season?: number;
  episode?: number;
  timestamp: number;
};

const DISCOVERED_DEVICES_KEY = "argus:lan:devices:v1";

export function getDiscoveredLocalDevices(): LocalDevice[] {
  try {
    const raw = localStorage.getItem(DISCOVERED_DEVICES_KEY);
    if (!raw) {
      return [];
    }
    return JSON.parse(raw) as LocalDevice[];
  } catch {
    return [];
  }
}

export function saveDiscoveredLocalDevices(devices: LocalDevice[]): void {
  try {
    localStorage.setItem(DISCOVERED_DEVICES_KEY, JSON.stringify(devices));
  } catch {
    /* ignore */
  }
}

export async function sendHandoffToDevice(
  device: LocalDevice,
  payload: HandoffPayload,
): Promise<{ ok: boolean; message: string }> {
  try {
    // Attempt local LAN REST dispatch if device is reachable
    const endpoint = `http://${device.address}/api/handoff`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 2500);

    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
    }).finally(() => clearTimeout(timer));

    if (res.ok) {
      return { ok: true, message: `Successfully transferred playback to ${device.name}` };
    }
    return { ok: false, message: `Device responded with ${res.status}` };
  } catch {
    return { ok: false, message: `Could not reach ${device.name}. Keep playing on this device.` };
  }
}
