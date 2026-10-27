/**
 * Smart Battery & Power Awareness:
 * Detects whether the device is on battery power or experiencing thermal constraints
 * so the stream ranker can prioritize power-efficient 1080p/HEVC profiles.
 */

let isBatteryPowered = false;
let batteryLevel: number | null = null;

if (typeof navigator !== "undefined" && "getBattery" in navigator) {
  try {
    (navigator as any).getBattery().then((battery: any) => {
      isBatteryPowered = !battery.charging;
      batteryLevel = battery.level;

      battery.addEventListener("chargingchange", () => {
        isBatteryPowered = !battery.charging;
      });
      battery.addEventListener("levelchange", () => {
        batteryLevel = battery.level;
      });
    }).catch(() => {});
  } catch {}
}

export function isDeviceOnBattery(): boolean {
  return isBatteryPowered;
}

export function getBatteryLevel(): number | null {
  return batteryLevel;
}

export function shouldConserveBatteryPower(): boolean {
  // Conserve power if on battery with < 40% charge
  if (!isBatteryPowered) return false;
  if (batteryLevel != null && batteryLevel < 0.4) return true;
  return isBatteryPowered;
}
