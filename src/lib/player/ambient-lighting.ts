/**
 * Dynamic Screen-Edge Ambient Lighting Sync Engine
 * Real-time video frame border sampling with exponential smoothing,
 * dynamic multi-sector CSS glow projection, and WLED DDP / UDP smart room lighting integration.
 */

export interface EdgeRgb {
  r: number;
  g: number;
  b: number;
}

export interface AmbientFrameColors {
  top: EdgeRgb;
  right: EdgeRgb;
  bottom: EdgeRgb;
  left: EdgeRgb;
  dominant: EdgeRgb;
}

export interface AmbientLightingConfig {
  enabled: boolean;
  smoothingAlpha: number; // 0.05 to 0.4 (lower = smoother, higher = more responsive)
  intensity: number;      // 0.0 to 1.0
  saturationBoost: number;// 1.0 to 2.0
  spreadPx: number;       // Glow blur distance
  wledIp?: string;
  wledPort?: number;      // Default 4048 for DDP
}

export const DEFAULT_AMBIENT_CONFIG: AmbientLightingConfig = {
  enabled: true,
  smoothingAlpha: 0.18,
  intensity: 0.65,
  saturationBoost: 1.35,
  spreadPx: 120,
  wledPort: 4048,
};

/**
 * Applies saturation boost and clamping to an RGB color.
 */
export function enhanceColor(c: EdgeRgb, boost: number = 1.3): EdgeRgb {
  const max = Math.max(c.r, c.g, c.b);
  const min = Math.min(c.r, c.g, c.b);
  const l = (max + min) / 2;

  if (max === min) {
    return { ...c };
  }

  const d = max - min;
  const s = l > 127.5 ? d / (510 - max - min) : d / (max + min);
  const newS = Math.min(1.0, s * boost);

  // Scaled deviation from luminance
  const factor = (newS / (s || 1));
  const r = Math.min(255, Math.max(0, Math.round(l + (c.r - l) * factor)));
  const g = Math.min(255, Math.max(0, Math.round(l + (c.g - l) * factor)));
  const b = Math.min(255, Math.max(0, Math.round(l + (c.b - l) * factor)));

  return { r, g, b };
}

/**
 * Exponential moving average filter for smooth transitions between video frames.
 */
export function smoothEdgeColor(current: EdgeRgb, target: EdgeRgb, alpha: number): EdgeRgb {
  return {
    r: Math.round(current.r * (1 - alpha) + target.r * alpha),
    g: Math.round(current.g * (1 - alpha) + target.g * alpha),
    b: Math.round(current.b * (1 - alpha) + target.b * alpha),
  };
}

export function smoothAmbientFrame(
  current: AmbientFrameColors,
  target: AmbientFrameColors,
  alpha: number
): AmbientFrameColors {
  return {
    top: smoothEdgeColor(current.top, target.top, alpha),
    right: smoothEdgeColor(current.right, target.right, alpha),
    bottom: smoothEdgeColor(current.bottom, target.bottom, alpha),
    left: smoothEdgeColor(current.left, target.left, alpha),
    dominant: smoothEdgeColor(current.dominant, target.dominant, alpha),
  };
}

/**
 * Generates an ultra-smooth multi-quadrant CSS background gradient based on the 4 edge colors.
 */
export function buildAmbientGlowCss(colors: AmbientFrameColors, intensity: number = 0.65): string {
  const toRgba = (c: EdgeRgb, a: number) => `rgba(${c.r}, ${c.g}, ${c.b}, ${(a * intensity).toFixed(3)})`;

  return [
    `radial-gradient(at 50% 0%, ${toRgba(colors.top, 0.75)} 0px, transparent 65%)`,
    `radial-gradient(at 100% 50%, ${toRgba(colors.right, 0.75)} 0px, transparent 65%)`,
    `radial-gradient(at 50% 100%, ${toRgba(colors.bottom, 0.75)} 0px, transparent 65%)`,
    `radial-gradient(at 0% 50%, ${toRgba(colors.left, 0.75)} 0px, transparent 65%)`,
    `radial-gradient(circle at center, ${toRgba(colors.dominant, 0.35)} 0px, transparent 75%)`,
  ].join(", ");
}

/**
 * Constructs a Distributed Display Protocol (DDP) UDP packet for WLED / addressable LED hardware.
 * Header format: 10 bytes:
 * [0x41, 0x01, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00, (len >> 8) & 0xff, len & 0xff]
 */
export function buildDdpPacket(colors: AmbientFrameColors): Uint8Array {
  // 4 sectors (Top, Right, Bottom, Left) * 3 bytes (RGB) = 12 payload bytes
  const payloadLength = 12;
  const packet = new Uint8Array(10 + payloadLength);

  // DDP Header
  packet[0] = 0x41; // DDP Flags (push)
  packet[1] = 0x01; // Sequence
  packet[2] = 0x00; // Data type (RGB)
  packet[3] = 0x01; // Device ID
  packet[4] = 0x00; // Offset (32-bit)
  packet[5] = 0x00;
  packet[6] = 0x00;
  packet[7] = 0x00;
  packet[8] = (payloadLength >> 8) & 0xff; // Payload length MSB
  packet[9] = payloadLength & 0xff;        // Payload length LSB

  // Payloads in clockwise order: Top, Right, Bottom, Left
  const sectors = [colors.top, colors.right, colors.bottom, colors.left];
  let offset = 10;
  for (const s of sectors) {
    packet[offset++] = s.r;
    packet[offset++] = s.g;
    packet[offset++] = s.b;
  }

  return packet;
}
