// Self-contained so `node --test` can load it.

export type DeepLinkLocal = { id: string; t?: number; speed?: number };

/** `argus://open?id=local:<library entry id>&t=<seconds>&speed=<rate>`: opens a local library file. */
export function localDeepLink(entryId: string, positionSec?: number, speed?: number): string {
  const params = new URLSearchParams({ id: `local:${entryId}` });
  if (positionSec != null && positionSec >= 1) params.set("t", String(Math.floor(positionSec)));
  if (speed != null && Math.abs(speed - 1) > 0.001) params.set("speed", String(+speed.toFixed(2)));
  return `argus://open?${params}`;
}

export function parseLocalDeepLink(url: string): DeepLinkLocal | null {
  const match = url.match(/^argus:\/\/open\?([^#]*)/);
  if (!match) return null;
  const params = new URLSearchParams(match[1]);
  const raw = params.get("id") ?? "";
  if (!raw.startsWith("local:") || raw.length <= "local:".length) return null;
  const t = Number(params.get("t"));
  const speed = Number(params.get("speed"));
  return {
    id: raw.slice("local:".length),
    t: Number.isFinite(t) && t > 0 ? Math.floor(t) : undefined,
    speed: Number.isFinite(speed) && speed >= 0.25 && speed <= 4 ? speed : undefined,
  };
}
