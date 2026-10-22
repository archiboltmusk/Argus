import type { TraktTarget } from "./types";

const KEY = "argus.trakt.pendingWatched.v1";
const MAX = 200;

type Pending = { target: TraktTarget; watchedAt: string };

function read(): Pending[] {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? (parsed as Pending[]) : [];
  } catch {
    return [];
  }
}

function write(list: Pending[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(list.slice(-MAX)));
  } catch {
    /* storage unavailable */
  }
}

function sameTarget(a: TraktTarget, b: TraktTarget): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

/** Keeps a finished item whose scrobble could not be delivered, so it is not lost offline. */
export function queueWatched(target: TraktTarget): void {
  if (target.kind === "show") return;
  const list = read();
  if (list.some((p) => sameTarget(p.target, target))) return;
  list.push({ target, watchedAt: new Date().toISOString() });
  write(list);
}

/** Retries queued items in order; keeps whatever still fails. */
export async function flushPendingWatched(
  push: (target: TraktTarget, watchedAt: string) => Promise<boolean>,
): Promise<number> {
  const list = read();
  if (list.length === 0) return 0;
  const left: Pending[] = [];
  let sent = 0;
  for (const p of list) {
    if (await push(p.target, p.watchedAt)) sent++;
    else left.push(p);
  }
  write(left);
  return sent;
}
