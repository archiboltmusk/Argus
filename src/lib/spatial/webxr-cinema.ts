/**
 * WebXR Spatial Cinema & 3D Depth Synthesizer
 *
 * Immersive VR / AR virtual screening room with customizable cinema environments,
 * curved stereoscopic displays, and real-time monocular 3D depth synthesis.
 */

export type SpatialEnvironment =
  | "deep-space-void"
  | "retro-drive-in"
  | "midnight-penthouse"
  | "imax-curved"
  | "minimalist-dark";

export type Stereoscopic3DMode =
  | "2d"
  | "3d-sbs" // Side-by-side (half or full)
  | "3d-top-bottom" // Over-under
  | "synthesized-depth"; // 2D-to-3D computational parallax

export interface SpatialCinemaConfig {
  environment: SpatialEnvironment;
  stereoscopicMode: Stereoscopic3DMode;
  screenDistanceMeters: number; // e.g. 2.0 to 12.0
  screenCurvatureDegrees: number; // 0 (flat) to 180 (wrap-around)
  screenScale: number; // 1.0 = standard, 2.0 = IMAX scale
  ambientLightLevel: number; // 0.0 (pitch black) to 1.0 (bright)
  interpupillaryDistanceMm: number; // standard average: 63-64mm
  depthSynthesisIntensity: number; // 0.0 to 1.0 for synthesized-depth mode
}

export interface StereoUVTransform {
  leftEye: { uMin: number; uMax: number; vMin: number; vMax: number };
  rightEye: { uMin: number; uMax: number; vMin: number; vMax: number };
}

const STORAGE_KEY = "argus.spatial.webxr_cinema.v1";

const DEFAULT_CONFIG: SpatialCinemaConfig = {
  environment: "imax-curved",
  stereoscopicMode: "2d",
  screenDistanceMeters: 5.0,
  screenCurvatureDegrees: 45,
  screenScale: 1.2,
  ambientLightLevel: 0.15,
  interpupillaryDistanceMm: 64,
  depthSynthesisIntensity: 0.5,
};

let configCache: SpatialCinemaConfig | null = null;
const listeners = new Set<(cfg: SpatialCinemaConfig) => void>();

export function getSpatialCinemaConfig(): SpatialCinemaConfig {
  if (configCache) return configCache;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    configCache = raw ? { ...DEFAULT_CONFIG, ...JSON.parse(raw) } : { ...DEFAULT_CONFIG };
  } catch {
    configCache = { ...DEFAULT_CONFIG };
  }
  return configCache ?? DEFAULT_CONFIG;
}

export function updateSpatialCinemaConfig(
  patch: Partial<SpatialCinemaConfig>,
): SpatialCinemaConfig {
  const current = getSpatialCinemaConfig();
  configCache = { ...current, ...patch };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(configCache));
  } catch {}
  notifyListeners();
  return configCache;
}

export function subscribeSpatialCinema(
  fn: (cfg: SpatialCinemaConfig) => void,
): () => void {
  listeners.add(fn);
  fn(getSpatialCinemaConfig());
  return () => {
    listeners.delete(fn);
  };
}

function notifyListeners(): void {
  const cfg = getSpatialCinemaConfig();
  for (const fn of listeners) {
    try {
      fn(cfg);
    } catch {}
  }
}

/**
 * Checks whether the current runtime platform supports WebXR immersive VR sessions.
 */
export async function checkWebXRSupport(): Promise<{
  isSupported: boolean;
  immersiveVR: boolean;
  immersiveAR: boolean;
}> {
  if (typeof navigator === "undefined" || !("xr" in navigator)) {
    return { isSupported: false, immersiveVR: false, immersiveAR: false };
  }

  const xr = (navigator as unknown as { xr: { isSessionSupported(mode: string): Promise<boolean> } }).xr;
  try {
    const [immersiveVR, immersiveAR] = await Promise.all([
      xr.isSessionSupported("immersive-vr").catch(() => false),
      xr.isSessionSupported("immersive-ar").catch(() => false),
    ]);
    return {
      isSupported: immersiveVR || immersiveAR,
      immersiveVR,
      immersiveAR,
    };
  } catch {
    return { isSupported: false, immersiveVR: false, immersiveAR: false };
  }
}

/**
 * Calculates UV mapping transformations for the specified 3D stereoscopic mode.
 */
export function calculateStereoUVs(mode: Stereoscopic3DMode): StereoUVTransform {
  switch (mode) {
    case "3d-sbs":
      return {
        leftEye: { uMin: 0.0, uMax: 0.5, vMin: 0.0, vMax: 1.0 },
        rightEye: { uMin: 0.5, uMax: 1.0, vMin: 0.0, vMax: 1.0 },
      };
    case "3d-top-bottom":
      return {
        leftEye: { uMin: 0.0, uMax: 1.0, vMin: 0.5, vMax: 1.0 },
        rightEye: { uMin: 0.0, uMax: 1.0, vMin: 0.0, vMax: 0.5 },
      };
    case "synthesized-depth":
    case "2d":
    default:
      return {
        leftEye: { uMin: 0.0, uMax: 1.0, vMin: 0.0, vMax: 1.0 },
        rightEye: { uMin: 0.0, uMax: 1.0, vMin: 0.0, vMax: 1.0 },
      };
  }
}

/**
 * Calculates the horizontal parallax pixel shift for monocular synthesized depth.
 * Negative for left eye, positive for right eye.
 */
export function calculateDepthParallaxShift(
  depthValue: number, // 0.0 (near foreground) to 1.0 (far background)
  intensity: number = 0.5,
  ipdMm: number = 64,
  distanceMeters: number = 5.0,
): { leftShiftU: number; rightShiftU: number } {
  // Disparity is proportional to IPD, inversely proportional to distance, modulated by depth value
  const baseDisparity = ((ipdMm / 1000) / Math.max(distanceMeters, 1.0)) * 0.05 * intensity;
  const parallax = (depthValue - 0.5) * baseDisparity;

  return {
    leftShiftU: -parallax / 2,
    rightShiftU: parallax / 2,
  };
}

/**
 * Calculates curved cylinder virtual screen vertices for WebXR rendering.
 */
export function generateCurvedScreenGeometry(
  curvatureDegrees: number,
  distanceMeters: number,
  scale: number,
  segments: number = 16,
): Array<{ x: number; y: number; z: number; u: number; v: number }> {
  const rad = (curvatureDegrees * Math.PI) / 180;
  const radius = curvatureDegrees > 0 ? distanceMeters / (rad / Math.PI) : distanceMeters;
  const height = 3.0 * scale;
  const vertices: Array<{ x: number; y: number; z: number; u: number; v: number }> = [];

  for (let i = 0; i <= segments; i++) {
    const fraction = i / segments;
    const angle = (fraction - 0.5) * rad;
    
    // Cylindrical coordinates
    const x = Math.sin(angle) * radius * scale;
    const z = -Math.cos(angle) * radius;

    // Top vertex
    vertices.push({
      x,
      y: height / 2,
      z,
      u: fraction,
      v: 1.0,
    });

    // Bottom vertex
    vertices.push({
      x,
      y: -height / 2,
      z,
      u: fraction,
      v: 0.0,
    });
  }

  return vertices;
}
