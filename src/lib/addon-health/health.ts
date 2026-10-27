/**
 * Local-only reliability tracking for installed addons. Outcomes of real requests
 * (and optional probes) are kept on this device; nothing is sent anywhere.
 */

export type Outcome = { ok: boolean; ms: number; at: number; reason?: string };
export type HealthStatus = "unknown" | "healthy" | "degraded" | "failing";
export type AddonHealth = { outcomes: Outcome[] };

const WINDOW = 20;
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const MIN_SAMPLES = 4;

export function pushOutcome(h: AddonHealth | undefined, o: Outcome): AddonHealth {
  const fresh = (h?.outcomes ?? []).filter((x) => o.at - x.at < MAX_AGE_MS);
  return { outcomes: [...fresh, o].slice(-WINDOW) };
}

export function failureRate(h: AddonHealth | undefined): number {
  const list = h?.outcomes ?? [];
  if (list.length === 0) return 0;
  return list.filter((o) => !o.ok).length / list.length;
}

export function statusOf(h: AddonHealth | undefined): HealthStatus {
  const list = h?.outcomes ?? [];
  if (list.length < MIN_SAMPLES) return "unknown";
  const rate = failureRate(h);
  const recent = list.slice(-3);
  if (rate >= 0.8 || recent.every((o) => !o.ok)) return "failing";
  if (rate >= 0.4) return "degraded";
  return "healthy";
}

/** 0-100 from recent success rate and speed; null until there are enough samples. */
export function reliabilityScore(h: AddonHealth | undefined): number | null {
  if ((h?.outcomes.length ?? 0) < MIN_SAMPLES) return null;
  const median = medianMs(h);
  const slow = median == null ? 0 : Math.min(20, Math.max(0, (median - 1500) / 250));
  return Math.max(0, Math.round(100 - failureRate(h) * 80 - slow));
}

export function medianMs(h: AddonHealth | undefined): number | null {
  const ok = (h?.outcomes ?? []).filter((o) => o.ok).map((o) => o.ms);
  if (ok.length === 0) return null;
  ok.sort((a, b) => a - b);
  return ok[Math.floor(ok.length / 2)];
}

export function lastSuccessAt(h: AddonHealth | undefined): number | null {
  const ok = (h?.outcomes ?? []).filter((o) => o.ok);
  if (ok.length === 0) return null;
  return ok[ok.length - 1].at;
}

export function sampleCount(h: AddonHealth | undefined): number {
  return h?.outcomes.length ?? 0;
}

export function recentFailureReason(h: AddonHealth | undefined): string | null {
  const bad = (h?.outcomes ?? []).filter((o) => !o.ok);
  if (bad.length === 0) return null;
  return bad[bad.length - 1].reason ?? null;
}

export type AddonRecommendation = "keep" | "investigate" | "quarantine" | "remove" | "needs-data";

export function recommendAction(h: AddonHealth | undefined, enabled: boolean): AddonRecommendation {
  if (!enabled) return "remove";
  const count = sampleCount(h);
  if (count < MIN_SAMPLES) return "needs-data";
  const st = statusOf(h);
  if (st === "healthy") return "keep";
  if (st === "degraded") return "investigate";
  if (st === "failing") return "quarantine";
  return "needs-data";
}
