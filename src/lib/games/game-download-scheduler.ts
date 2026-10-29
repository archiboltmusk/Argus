import { getNightOwlWindowStatus, type NightOwlStatus } from "@/lib/downloads/night-owl";

export type GameDownloadPriority = "normal" | "night_owl_only" | "immediate";

export type ScheduledGameTransfer = {
  id: string;
  gameTitle: string;
  totalBytes: number;
  priority: GameDownloadPriority;
  status: "active" | "waiting_night_window" | "paused_budget" | "complete";
  addedAt: number;
};

/**
 * Evaluates whether a game download should be permitted to transfer right now
 * based on Night-Owl unlimited off-peak rules and daily hotspot limits.
 */
export function evaluateGameDownloadExecution(
  transfer: ScheduledGameTransfer,
  hotspotDataSaverEnabled: boolean,
  nightOwlEnabled: boolean,
  dailyBudgetMb: number = 1500,
  now: Date = new Date(),
): {
  canExecuteNow: boolean;
  status: ScheduledGameTransfer["status"];
  reason: string;
  nightStatus: NightOwlStatus;
} {
  const nightStatus = getNightOwlWindowStatus(now);

  // If user marked as immediate or neither frugal feature is enabled, download directly
  if (transfer.priority === "immediate" || (!hotspotDataSaverEnabled && !nightOwlEnabled)) {
    return {
      canExecuteNow: true,
      status: "active",
      reason: "Unrestricted execution",
      nightStatus,
    };
  }

  // Night-owl priority or general night-owl enabled for large files (> 2 GB)
  const isLargeGame = transfer.totalBytes > 2 * 1024 * 1024 * 1024;
  const shouldGateOnNightWindow =
    transfer.priority === "night_owl_only" || (nightOwlEnabled && isLargeGame);

  if (shouldGateOnNightWindow) {
    if (nightStatus.isNightWindowActive) {
      return {
        canExecuteNow: true,
        status: "active",
        reason: "Midnight unlimited free window is active (00:00 - 06:00 IST)",
        nightStatus,
      };
    }

    return {
      canExecuteNow: false,
      status: "waiting_night_window",
      reason: nightStatus.message,
      nightStatus,
    };
  }

  // Hotspot budget guard
  const transferMb = transfer.totalBytes / (1024 * 1024);
  if (hotspotDataSaverEnabled && transferMb > dailyBudgetMb * 0.8) {
    return {
      canExecuteNow: false,
      status: "paused_budget",
      reason: `Transfer (${(transferMb / 1024).toFixed(1)} GB) exceeds 80% of daily mobile quota (${(dailyBudgetMb / 1024).toFixed(1)} GB). Scheduled for midnight free data.`,
      nightStatus,
    };
  }

  return {
    canExecuteNow: true,
    status: "active",
    reason: "Transfer within safe budget",
    nightStatus,
  };
}
