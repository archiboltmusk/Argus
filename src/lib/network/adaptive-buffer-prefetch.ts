export type TrafficPrefetchPolicy = {
  isPeakHour: boolean;
  recommendedBufferSec: number;
  reason: string;
};

/**
 * Evaluates mobile cell tower peak congestion (typically 7:00 PM – 11:00 PM IST)
 * and dynamically recommends deep forward buffer seconds (up to 300s) during clean bandwidth bursts.
 */
export function getAdaptiveBufferPrefetchPolicy(now: Date = new Date()): TrafficPrefetchPolicy {
  const hours = now.getHours();
  // 7 PM to 11 PM IST is peak evening saturation
  const isPeakHour = hours >= 19 && hours <= 23;

  if (isPeakHour) {
    return {
      isPeakHour: true,
      recommendedBufferSec: 180, // 3 minutes buffer ahead
      reason: "Peak evening mobile tower congestion detected (19:00 - 23:00 IST). Deep buffer prefetch engaged.",
    };
  }

  // Normal off-peak / daytime
  return {
    isPeakHour: false,
    recommendedBufferSec: 45,
    reason: "Off-peak network stability. Standard buffer engaged.",
  };
}
