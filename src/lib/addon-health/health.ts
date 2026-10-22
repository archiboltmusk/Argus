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

export function medianMs(h: AddonHealth | undefined): number | null {
  const ok = (h?.outcomes ?? []).filter((o) => o.ok).map((o) => o.ms);
  if (ok.length === 0) return null;
  ok.sort((a, b) => a - b);
  return ok[Math.floor(ok.length / 2)];
}
