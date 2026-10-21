export const REMOTE_PROTO = 1;
export const REMOTE_WS_PATH = "/api/remote";
export const WEB_PORT = 11471;

export type RemoteEpisodeRef = {
  season: number;
  episode: number;
  name?: string;
};

export type RemoteCastDevice = {
  id: string;
  name: string;
  kind: "chromecast" | "dlna" | "roku" | "airplay";
  host: string;
  port: number;
  model?: string | null;
  controlUrl?: string | null;
  audioOnly?: boolean;
};

export type RemoteTarget =
  | { kind: "local"; label: string }
  | { kind: "cast"; deviceId: string; label: string; castKind: RemoteCastDevice["kind"] };

export type RemoteSourceInfo = {
  label: string | null;
  resolution: string | null;
  quality: string | null;
  releaseGroup: string | null;
};

/** Host has a text field ready for phone typing. */
export type RemoteTextEntry = {
  value: string;
  placeholder: string;
};

export type RemoteSnapshot = {
  proto: number;
  idle: boolean;
  mediaId: string | null;
  mediaTitle: string | null;
  posterUrl: string | null;
  episode: RemoteEpisodeRef | null;
  source: RemoteSourceInfo | null;
  positionSec: number;
  durationSec: number;
  playing: boolean;
  volume: number;
  muted: boolean;
  target: RemoteTarget;
  castDevices: RemoteCastDevice[];
  castDiscovering: boolean;
  hasPrevEpisode: boolean;
  hasNextEpisode: boolean;
  /** True when a subtitle track is selected on the local player. */
  subtitlesOn: boolean;
  /** Local player has ≥1 subtitle track and isn't casting. */
  canToggleSubtitles: boolean;
  /** Non-null when the host focus is in a text field. */
  textEntry: RemoteTextEntry | null;
  updatedAt: number;
};

/** Host UI navigation (library browse via phone touchpad). */
export type RemoteNavKey = "up" | "down" | "left" | "right" | "select" | "back";

export type RemoteCommand =
  | { action: "play" }
  | { action: "pause" }
  | { action: "seek"; positionSec: number }
  | { action: "setVolume"; volume: number }
  | { action: "setMuted"; muted: boolean }
  | { action: "setTarget"; target: "local" | { castDeviceId: string } }
  | { action: "castDiscover" }
  | { action: "castStop" }
  | { action: "prevEpisode" }
  | { action: "nextEpisode" }
  /** Toggle subtitles on/off. Local player only. */
  | { action: "toggleSubtitles" }
  /** Drive host keyboard/TV focus navigation (swipe/tap on touchpad / now-playing poster). */
  | { action: "nav"; key: RemoteNavKey }
  /** Replace value of the focused host text field. */
  | { action: "setText"; value: string }
  /** Submit the focused host text field (Enter). Optional value flushes text first. */
  | { action: "submitText"; value?: string }
  /** Blur the focused host text field (phone dismissed the typing UI). */
  | { action: "blurText" }
  /** Open host search (same as the "/" hotkey). */
  | { action: "openSearch" }
  | { action: "ping" };

export type RemoteServerMessage =
  | { t: "snapshot"; snapshot: RemoteSnapshot }
  | { t: "hello"; proto: number; server: "argus-remote" }
  | { t: "pong"; at: number }
  | { t: "error"; message: string };

export type RemoteClientMessage =
  | { t: "cmd"; command: RemoteCommand }
  | { t: "hello"; client: "argus-remote"; proto: number };

export function idleSnapshot(partial?: Partial<RemoteSnapshot>): RemoteSnapshot {
  return {
    proto: REMOTE_PROTO,
    idle: true,
    mediaId: null,
    mediaTitle: null,
    posterUrl: null,
    episode: null,
    source: null,
    positionSec: 0,
    durationSec: 0,
    playing: false,
    volume: 1,
    muted: false,
    target: { kind: "local", label: "This PC" },
    castDevices: [],
    castDiscovering: false,
    hasPrevEpisode: false,
    hasNextEpisode: false,
    subtitlesOn: false,
    canToggleSubtitles: false,
    textEntry: null,
    updatedAt: Date.now(),
    ...partial,
  };
}

export function parseClientMessage(raw: string): RemoteClientMessage | null {
  try {
    const parsed = JSON.parse(raw) as RemoteClientMessage;
    if (!parsed || typeof parsed !== "object" || !("t" in parsed)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function remoteWsUrl(host: string, port = WEB_PORT): string {
  const proto = typeof location !== "undefined" && location.protocol === "https:" ? "wss" : "ws";
  return `${proto}://${host}:${port}${REMOTE_WS_PATH}`;
}

export function remoteUiUrl(host: string, port = WEB_PORT): string {
  return `http://${host}:${port}/remote`;
}
