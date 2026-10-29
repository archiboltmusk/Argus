/**
 * Network Connection Profiler
 *
 * Enforces the core rule: Wi-Fi broadband is always uncapped and unlimited.
 * Metered data-saving policies (hotspot odometer, micro-encodes, daytime seeding throttle)
 * ONLY engage when on a metered mobile hotspot or when metered mode is explicitly forced.
 */

export type ConnectionMode = "auto" | "unlimited-broadband" | "metered-hotspot";

export interface NetworkProfile {
  mode: ConnectionMode;
  isUnlimitedBroadband: boolean;
  effectiveType: string;
  isSaveDataActive: boolean;
  carrierOrIspHint?: string;
}

/**
 * Evaluates whether the active connection is unlimited broadband vs a metered hotspot.
 */
export function getActiveNetworkProfile(
  preferenceMode: ConnectionMode = "unlimited-broadband",
  wifiBroadbandUnlimited = true,
): NetworkProfile {
  // If user explicitly configured unlimited broadband or preference is unlimited
  if (preferenceMode === "unlimited-broadband" || (preferenceMode === "auto" && wifiBroadbandUnlimited)) {
    // Check if browser explicitly reports saveData header/flag
    const nav = typeof navigator !== "undefined" ? (navigator as unknown as { connection?: { saveData?: boolean; type?: string; effectiveType?: string } }) : null;
    const connection = nav?.connection;

    // Even if saveData is turned on, if wifiBroadbandUnlimited is true and connection is wifi/ethernet, keep unlimited
    const isWifiOrEthernet = connection?.type === "wifi" || connection?.type === "ethernet" || !connection?.type;

    if (wifiBroadbandUnlimited && isWifiOrEthernet) {
      return {
        mode: "unlimited-broadband",
        isUnlimitedBroadband: true,
        effectiveType: connection?.effectiveType || "4g",
        isSaveDataActive: false,
        carrierOrIspHint: "Unlimited High-Speed Broadband",
      };
    }
  }

  if (preferenceMode === "metered-hotspot") {
    return {
      mode: "metered-hotspot",
      isUnlimitedBroadband: false,
      effectiveType: "4g",
      isSaveDataActive: true,
      carrierOrIspHint: "Mobile Hotspot (Metered)",
    };
  }

  return {
    mode: "unlimited-broadband",
    isUnlimitedBroadband: true,
    effectiveType: "4g",
    isSaveDataActive: false,
    carrierOrIspHint: "High-Speed Broadband",
  };
}

/**
 * Returns whether frugal/metered data-saver constraints should apply.
 */
export function shouldApplyDataSaver(
  hotspotDataSaverSetting: boolean,
  wifiBroadbandUnlimited = true,
  preferenceMode: ConnectionMode = "unlimited-broadband",
): boolean {
  if (!hotspotDataSaverSetting) return false;
  const profile = getActiveNetworkProfile(preferenceMode, wifiBroadbandUnlimited);
  // Never throttle or apply budget caps when on unlimited broadband
  if (profile.isUnlimitedBroadband) return false;
  return true;
}
