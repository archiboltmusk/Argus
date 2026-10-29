/**
 * Daytime-Leech & Midnight-Seed Torrent Time Policy
 *
 * Core rule:
 * - On Unlimited Wi-Fi Broadband: Completely uncapped 24/7. Maximum upload and download line speeds at all times.
 * - On Metered Mobile Hotspot: Throttles background seeding during the daytime (06:00 - 24:00 IST) to 1 KB/s
 *   to safeguard daily mobile quotas, then unlocks uncapped seeding during the midnight unmetered window (00:00 - 06:00 IST).
 */

import { getNightOwlWindowStatus } from "./night-owl";

export interface TorrentBandwidthRules {
  uploadLimitKbps: number; // 0 = unlimited
  downloadLimitKbps: number; // 0 = unlimited
  policyLabel: string;
  isUncapped: boolean;
}

export function evaluateTorrentPolicy(
  isUnlimitedBroadband = true,
  hotspotDataSaver = false,
): TorrentBandwidthRules {
  // If broadband is unlimited, NEVER throttle
  if (isUnlimitedBroadband) {
    return {
      uploadLimitKbps: 0,
      downloadLimitKbps: 0,
      policyLabel: "⚡ Unlimited Wi-Fi: Uncapped 24/7 Seeding & Leeching",
      isUncapped: true,
    };
  }

  // If on metered hotspot, check night owl window
  if (hotspotDataSaver) {
    const { isNightWindowActive } = getNightOwlWindowStatus();
    if (isNightWindowActive) {
      return {
        uploadLimitKbps: 0,
        downloadLimitKbps: 0,
        policyLabel: "🌙 Midnight Unmetered: Full-Speed Seeding Active (00:00 - 06:00 IST)",
        isUncapped: true,
      };
    }

    // Daytime on mobile hotspot: preserve daily quota
    return {
      uploadLimitKbps: 1, // 1 KB/s trickle
      downloadLimitKbps: 0, // allow user's explicit downloads
      policyLabel: "🛡️ Mobile Hotspot Day Mode: Seeding Throttled to 1 KB/s to Protect Quota",
      isUncapped: false,
    };
  }

  return {
    uploadLimitKbps: 0,
    downloadLimitKbps: 0,
    policyLabel: "Uncapped Standard Policy",
    isUncapped: true,
  };
}
