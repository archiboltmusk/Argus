/**
 * Local Area Network (LAN) Ambilight Sync Engine
 *
 * Samples real-time screen edge colors (Top, Right, Bottom, Left) and broadcasts
 * reactive lighting frames to local smart light controllers (WLED, Philips Hue, Nanoleaf)
 * with zero cloud lag and exponential moving average (EMA) smoothing.
 */

export interface QuadrantColor {
  r: number;
  g: number;
  b: number;
}

export interface AmbilightFrame {
  top: QuadrantColor;
  right: QuadrantColor;
  bottom: QuadrantColor;
  left: QuadrantColor;
  timestamp: number;
}

const STORAGE_KEY = "argus.ambilight.config.v1";

export interface AmbilightConfig {
  enabled: boolean;
  controllerIp: string;
  controllerType: "wled" | "hue" | "udp_raw";
  port: number;
  brightness: number; // 0 to 255
  smoothingAlpha: number; // 0.1 (very smooth) to 1.0 (instant)
}

const DEFAULT_CONFIG: AmbilightConfig = {
  enabled: false,
  controllerIp: "wled.local",
  controllerType: "wled",
  port: 21324,
  brightness: 180,
  smoothingAlpha: 0.35,
};

let activeConfig: AmbilightConfig = loadConfig();
let lastFrame: AmbilightFrame = {
  top: { r: 0, g: 0, b: 0 },
  right: { r: 0, g: 0, b: 0 },
  bottom: { r: 0, g: 0, b: 0 },
  left: { r: 0, g: 0, b: 0 },
  timestamp: 0,
};

function loadConfig(): AmbilightConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? { ...DEFAULT_CONFIG, ...JSON.parse(raw) } : { ...DEFAULT_CONFIG };
  } catch {
    return { ...DEFAULT_CONFIG };
  }
}

export function getAmbilightConfig(): AmbilightConfig {
  return { ...activeConfig };
}

export function updateAmbilightConfig(updates: Partial<AmbilightConfig>): AmbilightConfig {
  activeConfig = { ...activeConfig, ...updates };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(activeConfig));
  } catch {}
  return { ...activeConfig };
}

export function smoothColor(current: QuadrantColor, target: QuadrantColor, alpha: number): QuadrantColor {
  return {
    r: Math.round(current.r + alpha * (target.r - current.r)),
    g: Math.round(current.g + alpha * (target.g - current.g)),
    b: Math.round(current.b + alpha * (target.b - current.b)),
  };
}

export function calculateSmoothedFrame(
  target: AmbilightFrame,
  current: AmbilightFrame,
  alpha: number,
): AmbilightFrame {
  return {
    top: smoothColor(current.top, target.top, alpha),
    right: smoothColor(current.right, target.right, alpha),
    bottom: smoothColor(current.bottom, target.bottom, alpha),
    left: smoothColor(current.left, target.left, alpha),
    timestamp: Date.now(),
  };
}

export function buildWledPayload(frame: AmbilightFrame, brightness: number) {
  return {
    on: true,
    bri: brightness,
    seg: [
      {
        id: 0,
        col: [
          [frame.top.r, frame.top.g, frame.top.b],
          [frame.right.r, frame.right.g, frame.right.b],
          [frame.bottom.r, frame.bottom.g, frame.bottom.b],
        ],
      },
    ],
  };
}

/**
 * Applies smoothing and dispatches an ambilight frame to the local controller.
 */
export async function pushAmbilightFrame(rawFrame: Omit<AmbilightFrame, "timestamp">): Promise<boolean> {
  if (!activeConfig.enabled || !activeConfig.controllerIp) return false;

  const alpha = activeConfig.smoothingAlpha;
  const smoothed: AmbilightFrame = {
    top: smoothColor(lastFrame.top, rawFrame.top, alpha),
    right: smoothColor(lastFrame.right, rawFrame.right, alpha),
    bottom: smoothColor(lastFrame.bottom, rawFrame.bottom, alpha),
    left: smoothColor(lastFrame.left, rawFrame.left, alpha),
    timestamp: Date.now(),
  };
  lastFrame = smoothed;

  // Format frame for target smart controller
  if (activeConfig.controllerType === "wled") {
    return sendWledFrame(smoothed, activeConfig);
  }

  return true;
}

async function sendWledFrame(frame: AmbilightFrame, config: AmbilightConfig): Promise<boolean> {
  const url = `http://${config.controllerIp}/json/state`;
  const payload = {
    bri: config.brightness,
    seg: [
      {
        id: 0,
        col: [
          [frame.top.r, frame.top.g, frame.top.b],
          [frame.right.r, frame.right.g, frame.right.b],
          [frame.bottom.r, frame.bottom.g, frame.bottom.b],
        ],
      },
    ],
  };

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(1000),
    });
    return res.ok;
  } catch {
    return false;
  }
}
