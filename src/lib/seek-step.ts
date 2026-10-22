export const SEEK_STEP_OPTIONS = [1, 3, 5, 10, 15, 30, 60, 90] as const;

export const HOLD_SPEED_RATES = [1.5, 2, 3, 4] as const;

export function sanitizeHoldSpeedRate(value: unknown, fallback = 2): number {
  return typeof value === "number" && (HOLD_SPEED_RATES as readonly number[]).includes(value)
    ? value
    : fallback;
}

export type SeekStepSeconds = (typeof SEEK_STEP_OPTIONS)[number];

export function isSeekStepSeconds(value: unknown): value is SeekStepSeconds {
  return typeof value === "number" && SEEK_STEP_OPTIONS.includes(value as SeekStepSeconds);
}

export function sanitizeSeekStep(value: unknown, fallback: number): number {
  return isSeekStepSeconds(value) ? value : fallback;
}
