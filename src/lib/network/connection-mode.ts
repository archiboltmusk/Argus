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

export type ConnectionHints = {
  saveData?: boolean;
  type?: string;
  effectiveType?: string;
};

function navigatorConnection(): ConnectionHints | undefined {
  if (typeof navigator === "undefined") return undefined;
  return (navigator as unknown as { connection?: ConnectionHints }).connection;
}

/**
 * Evaluates whether the active connection is unlimited broadband vs a metered hotspot.
 */
export function getActiveNetworkProfile(
  preferenceMode: ConnectionMode = "unlimited-broadband",
  wifiBroadbandUnlimited = true,
  connection: ConnectionHints | undefined = navigatorConnection(),
): NetworkProfile {
  const unlimited = (): NetworkProfile => ({
    mode: "unlimited-broadband",
    isUnlimitedBroadband: true,
    effectiveType: connection?.effectiveType || "4g",
    isSaveDataActive: false,
    carrierOrIspHint: "Unlimited High-Speed Broadband",
  });
  const metered = (): NetworkProfile => ({
    mode: "metered-hotspot",
    isUnlimitedBroadband: false,
    effectiveType: connection?.effectiveType || "4g",
    isSaveDataActive: true,
    carrierOrIspHint: "Mobile Hotspot (Metered)",
  });

  // Explicit user intent must always win over browser hints.
  if (preferenceMode === "unlimited-broadband") return unlimited();
  if (preferenceMode === "metered-hotspot") return metered();

  // Automatic mode takes the browser's metered signal seriously. Previously it
  // could label a cellular/save-data connection as unlimited whenever the
  // broadband preference was enabled, defeating the travel data-saver.
  const type = connection?.type?.toLowerCase();
  const isMetered = connection?.saveData === true || type === "cellular";
  if (isMetered) return metered();
  if (wifiBroadbandUnlimited && (type === "wifi" || type === "ethernet" || !type)) return unlimited();

  // With no proof of an unlimited connection, prefer the safe travel policy.
  return metered();
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
