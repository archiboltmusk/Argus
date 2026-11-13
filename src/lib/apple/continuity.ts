export type ContinuityKind = "video" | "manga" | "music";

export interface ContinuityActivity {
  kind: ContinuityKind;
  id: string;
  title: string;
  subtitle?: string;
  position: number;
  updatedAt: number;
}

const ACTIVITY_KEY = "argus.apple.continuity.v1";
const SPOTLIGHT_KEY = "argus.apple.spotlight.v1";

export function buildHandoffDeepLink(activity: ContinuityActivity): string {
  const params = new URLSearchParams({
    kind: activity.kind,
    id: activity.id,
    pos: String(Math.max(0, Math.round(activity.position))),
  });
  return `argus://handoff?${params.toString()}`;
}

export function publishContinuityActivity(activity: ContinuityActivity): void {
  try {
    localStorage.setItem(ACTIVITY_KEY, JSON.stringify(activity));
    if (typeof BroadcastChannel !== "undefined") {
      const ch = new BroadcastChannel("argus-continuity");
      ch.postMessage(activity);
      ch.close();
    }
  } catch {}
}

export function readContinuityActivity(): ContinuityActivity | null {
  try {
    const raw = localStorage.getItem(ACTIVITY_KEY);
    return raw ? (JSON.parse(raw) as ContinuityActivity) : null;
  } catch {
    return null;
  }
}

export function indexSpotlightItem(item: {
  id: string;
  kind: ContinuityKind;
  title: string;
  subtitle?: string;
}): void {
  try {
    const raw = localStorage.getItem(SPOTLIGHT_KEY);
    const list = raw ? (JSON.parse(raw) as Array<typeof item & { indexedAt: number }>) : [];
    const filtered = list.filter((x) => !(x.id === item.id && x.kind === item.kind));
    filtered.unshift({ ...item, indexedAt: Date.now() });
    localStorage.setItem(SPOTLIGHT_KEY, JSON.stringify(filtered.slice(0, 120)));
  } catch {}
}
