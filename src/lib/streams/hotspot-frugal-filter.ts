export type FrugalStreamRating = {
  isFrugalRecommended: boolean;
  exceedsDailyBudget: boolean;
  sizeMb: number | null;
  codecBadge: string | null;
  badgeLabel: string;
};

const EFFICIENT_CODEC_REGEX = /(?:hevc|x265|h\.?265|av0?1)/i;
const MICRO_ENCODE_GROUPS = ["psa", "pahe", "galaxyrg", "qxr", "yify", "yts", "megusta"];

/**
 * Assesses whether a stream fits comfortably within typical Indian daily mobile hotspot limits
 * (1.5 GB - 2.5 GB / day) and rewards modern high-efficiency compression (HEVC/x265/AV1).
 */
export function evaluateHotspotStream(
  title: string | undefined | null,
  sizeBytes: number | undefined | null,
  dailyBudgetMb = 1500,
): FrugalStreamRating {
  const text = (title || "").toLowerCase();
  const sizeMb = typeof sizeBytes === "number" && sizeBytes > 0 ? sizeBytes / (1024 * 1024) : null;

  const hasEfficientCodec = EFFICIENT_CODEC_REGEX.test(text);
  const isMicroGroup = MICRO_ENCODE_GROUPS.some((g) => text.includes(g));

  let codecBadge: string | null = null;
  if (text.includes("av1") || text.includes("av01")) codecBadge = "AV1";
  else if (text.includes("265") || text.includes("hevc")) codecBadge = "HEVC";

  // Stream is considered frugal recommended if it has efficient codec and reasonable size
  const isFrugalRecommended =
    (hasEfficientCodec || isMicroGroup) && (sizeMb === null || sizeMb <= 1400);

  // Exceeds budget if single stream takes more than 75% of daily quota
  const exceedsDailyBudget = sizeMb !== null && sizeMb > dailyBudgetMb * 0.75;

  let badgeLabel = "Standard";
  if (isFrugalRecommended) {
    badgeLabel = "⚡ Frugal 1080p";
  } else if (exceedsDailyBudget) {
    badgeLabel = "⚠️ Heavy Data";
  }

  return {
    isFrugalRecommended,
    exceedsDailyBudget,
    sizeMb: sizeMb ? Math.round(sizeMb) : null,
    codecBadge,
    badgeLabel,
  };
}

/**
 * Formats a clean odometer string for live player data tracking.
 */
export function formatDataOdometer(
  consumedMb: number,
  dailyBudgetMb: number,
): {
  consumedStr: string;
  remainingStr: string;
  percentUsed: number;
} {
  const safeConsumed = Math.max(0, consumedMb);
  const remaining = Math.max(0, dailyBudgetMb - safeConsumed);
  const pct = Math.min(100, Math.round((safeConsumed / Math.max(1, dailyBudgetMb)) * 100));

  return {
    consumedStr: safeConsumed >= 1000 ? `${(safeConsumed / 1024).toFixed(2)} GB` : `${Math.round(safeConsumed)} MB`,
    remainingStr: remaining >= 1000 ? `${(remaining / 1024).toFixed(2)} GB` : `${Math.round(remaining)} MB`,
    percentUsed: pct,
  };
}
