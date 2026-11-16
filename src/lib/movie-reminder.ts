/** Release dates are provider metadata, not proof a particular stream is available. */
export function movieReminderKey(
  date: string | undefined,
  createdAt: number,
  seen: string[] = [],
  now = Date.now(),
): string | null {
  if (!date || !/^\d{4}-\d{2}-\d{2}(?:T.*)?$/.test(date)) return null;
  const at = Date.parse(date);
  const key = `movie:${date.slice(0, 10)}`;
  return Number.isFinite(at) &&
    at <= now &&
    at > createdAt &&
    now - at <= 36 * 3600_000 &&
    !seen.includes(key)
    ? key
    : null;
}
