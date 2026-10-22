import type { LyricLine } from "./types";

const STAMP = /\[(\d{1,3}):(\d{1,2})(?:[.:](\d{1,3}))?\]/g;

/** Parses LRC text. Lines without timestamps are returned untimed (plain lyrics). */
export function parseLrc(raw: string): { lines: LyricLine[]; synced: boolean } {
  const out: LyricLine[] = [];
  let offset = 0;
  let synced = false;
  for (const row of raw.replace(/\r/g, "").split("\n")) {
    const meta = /^\[offset:\s*(-?\d+)\s*\]$/i.exec(row.trim());
    if (meta) {
      offset = Number(meta[1]) / 1000;
      continue;
    }
    if (/^\[[a-z]{2,}:[^\]]*\]$/i.test(row.trim())) continue;
    const stamps = [...row.matchAll(STAMP)];
    const text = row.replace(STAMP, "").trim();
    if (stamps.length === 0) {
      out.push({ time: null, text: row.trim() });
      continue;
    }
    synced = true;
    for (const m of stamps) {
      const frac = m[3] ? Number(m[3]) / 10 ** m[3].length : 0;
      out.push({ time: Number(m[1]) * 60 + Number(m[2]) + frac + offset, text });
    }
  }
  if (synced) {
    const timed = out.filter((l) => l.time !== null);
    timed.sort((a, b) => (a.time as number) - (b.time as number));
    return { lines: timed, synced: true };
  }
  return { lines: out, synced: false };
}

/** Index of the line active at `position` seconds, or -1 before the first line. */
export function activeLine(lines: LyricLine[], position: number): number {
  let lo = 0;
  let hi = lines.length - 1;
  let ans = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const t = lines[mid].time;
    if (t !== null && t <= position) {
      ans = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  return ans;
}
