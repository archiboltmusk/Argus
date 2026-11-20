/**
 * Universal Gamepad Haptics & Vibration Engine
 * Supports DualSense, Xbox Wireless, and standard Dual-Rumble controllers
 * via the HTML5 Gamepad VibrationActuator API.
 */

export type HapticPattern = "tap" | "light" | "medium" | "heavy" | "drift" | "heartbeat" | "explosion";

export function playGamepadHaptics(pattern: HapticPattern = "medium", padIndex: number = -1): void {
  try {
    if (typeof navigator === "undefined" || !navigator.getGamepads) return;
    const pads = navigator.getGamepads();

    const targets = padIndex >= 0 && pads[padIndex] ? [pads[padIndex]!] : Array.from(pads).filter(Boolean);

    for (const pad of targets) {
      const actuator = (pad as any)?.vibrationActuator;
      if (!actuator || typeof actuator.playEffect !== "function") continue;

      let effect: {
        startDelay?: number;
        duration: number;
        weakMagnitude: number;
        strongMagnitude: number;
      };

      switch (pattern) {
        case "tap":
          effect = { duration: 40, weakMagnitude: 0.35, strongMagnitude: 0.1 };
          break;
        case "light":
          effect = { duration: 80, weakMagnitude: 0.5, strongMagnitude: 0.2 };
          break;
        case "drift":
          effect = { duration: 100, weakMagnitude: 0.65, strongMagnitude: 0.3 };
          break;
        case "medium":
          effect = { duration: 150, weakMagnitude: 0.7, strongMagnitude: 0.5 };
          break;
        case "heavy":
          effect = { duration: 250, weakMagnitude: 0.9, strongMagnitude: 0.85 };
          break;
        case "explosion":
          effect = { duration: 350, weakMagnitude: 1.0, strongMagnitude: 1.0 };
          break;
        case "heartbeat":
          effect = { duration: 60, weakMagnitude: 0.8, strongMagnitude: 0.4 };
          break;
        default:
          effect = { duration: 100, weakMagnitude: 0.5, strongMagnitude: 0.3 };
      }

      actuator.playEffect("dual-rumble", effect).catch(() => {
        // Silently catch unsupported gamepad effects
      });
    }
  } catch {
    // Haptics safety fallback
  }
}
