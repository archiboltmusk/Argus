import { invoke } from "@tauri-apps/api/core";

export const DEFAULT_BUNDLED_PORT = 11470;
export const DEFAULT_HTTPS_PORT = 12470;
const PROBE_TIMEOUT_MS = 1500;
const PROBE_TTL_MS = 30_000;
const READY_WAIT_POLL_MS = 250;

const isTauri = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

let bundledPort = DEFAULT_BUNDLED_PORT;

export type TorrentProfileId = "default" | "soft" | "fast" | "ultra-fast";

export type StremioTorrentParams = {
  btMaxConnections: number;
  btHandshakeTimeout: number;
  btRequestTimeout: number;
  btDownloadSpeedSoftLimit: number;
  btDownloadSpeedHardLimit: number;
  btMinPeersForStable: number;
};

export const TORRENT_PROFILE_PRESETS: Record<TorrentProfileId, StremioTorrentParams> = {
  default: {
    btMaxConnections: 55,
    btHandshakeTimeout: 20000,
    btRequestTimeout: 4000,
    btDownloadSpeedSoftLimit: 2621440,
    btDownloadSpeedHardLimit: 3670016,
    btMinPeersForStable: 5,
  },
  soft: {
    btMaxConnections: 35,
    btHandshakeTimeout: 20000,
    btRequestTimeout: 4000,
    btDownloadSpeedSoftLimit: 1677721.6,
    btDownloadSpeedHardLimit: 1677721.6,
    btMinPeersForStable: 5,
  },
  fast: {
    btMaxConnections: 200,
    btHandshakeTimeout: 20000,
    btRequestTimeout: 4000,
    btDownloadSpeedSoftLimit: 4194304,
    btDownloadSpeedHardLimit: 39321600,
    btMinPeersForStable: 5,
  },
  "ultra-fast": {
    btMaxConnections: 500,
    btHandshakeTimeout: 25000,
    btRequestTimeout: 6000,
    btDownloadSpeedSoftLimit: 8388608,
    btDownloadSpeedHardLimit: 78643200,
    btMinPeersForStable: 10,
  },
};

export function inferTorrentProfileFromServer(
  values?: Partial<StremioTorrentParams> | null,
): TorrentProfileId | null {
  if (!values || typeof values.btMaxConnections !== "number") return null;
  if (values.btMaxConnections >= 400) return "ultra-fast";
  if (values.btMaxConnections >= 150) return "fast";
  if (values.btMaxConnections <= 40) return "soft";
  return "default";
}

export function bundledServerPort(): number {
  return bundledPort;
}

export function bundledServerUrl(): string {
  return `http://127.0.0.1:${bundledPort}`;
}

type StoredStreamingSettings = {
  remoteStreamServerUrl?: string;
  remoteStreamServerStrict?: boolean;
  streamServerUrls?: string[];
  selectedStreamServerUrl?: string;
  streamingHttpsEndpoint?: string;
  torrentProfile?: TorrentProfileId;
  transcodeProfile?: string;
};

function readRawStreamingSettings(): StoredStreamingSettings {
  try {
    const raw = localStorage.getItem("argus.settings");
    if (!raw) return {};
    return JSON.parse(raw) as StoredStreamingSettings;
  } catch {
    return {};
  }
}

export function formatTrailingSlashUrl(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  const withProto = /^https?:\/\//i.test(trimmed) ? trimmed : `http://${trimmed}`;
  return `${withProto.replace(/\/+$/, "")}/`;
}

export function isLoopbackServerUrl(url: string | undefined | null): boolean {
  if (!url) return false;
  return /^https?:\/\/(?:127\.0\.0\.1|localhost|\[::1\]):\d+\/?$/i.test(url.trim());
}

export function getConfiguredStreamServerUrls(): string[] {
  const parsed = readRawStreamingSettings();
  const baseDefaults = [
    `http://127.0.0.1:${bundledPort}/`,
    `http://localhost:${bundledPort}/`,
  ];
  const seen = new Set<string>();
  const out: string[] = [];
  const push = (u: string | undefined) => {
    if (!u) return;
    const formatted = formatTrailingSlashUrl(u);
    if (!formatted || seen.has(formatted)) return;
    seen.add(formatted);
    out.push(formatted);
  };
  for (const d of baseDefaults) push(d);
  if (Array.isArray(parsed.streamServerUrls)) {
    for (const u of parsed.streamServerUrls) push(u);
  }
  if (parsed.remoteStreamServerUrl) {
    push(parsed.remoteStreamServerUrl);
  }
  if (parsed.selectedStreamServerUrl) {
    push(parsed.selectedStreamServerUrl);
  }
  return out;
}

export function getSelectedStreamServerUrl(): string {
  const parsed = readRawStreamingSettings();
  if (parsed.remoteStreamServerUrl?.trim()) {
    return formatTrailingSlashUrl(parsed.remoteStreamServerUrl);
  }
  if (parsed.selectedStreamServerUrl?.trim()) {
    return formatTrailingSlashUrl(parsed.selectedStreamServerUrl);
  }
  return `http://localhost:${bundledPort}/`;
}

export function getStreamingHttpsEndpoint(): string {
  const parsed = readRawStreamingSettings();
  return typeof parsed.streamingHttpsEndpoint === "string"
    ? parsed.streamingHttpsEndpoint.trim()
    : "";
}

export function getTorrentProfile(): TorrentProfileId {
  const parsed = readRawStreamingSettings();
  const p = parsed.torrentProfile;
  if (p === "soft" || p === "fast" || p === "ultra-fast") return p;
  return "default";
}

export function getTranscodeProfile(): string {
  const parsed = readRawStreamingSettings();
  return typeof parsed.transcodeProfile === "string" ? parsed.transcodeProfile.trim() : "";
}

export function remoteStreamServerUrl(): string {
  const parsed = readRawStreamingSettings();
  const url = parsed.remoteStreamServerUrl;
  if (typeof url === "string" && url.trim()) {
    return url.trim().replace(/\/+$/, "");
  }
  const selected = parsed.selectedStreamServerUrl;
  if (typeof selected === "string" && selected.trim() && !isLoopbackServerUrl(selected)) {
    return selected.trim().replace(/\/+$/, "");
  }
  return "";
}

export function remoteStreamServerStrict(): boolean {
  if (!remoteStreamServerUrl()) return false;
  const parsed = readRawStreamingSettings();
  return parsed.remoteStreamServerStrict === true;
}

export function isBundledEngineUrl(url: string | undefined | null): boolean {
  if (!url) return false;
  const loopback = /^https?:\/\/(?:127\.0\.0\.1|localhost):(\d+)\//i.exec(url);
  if (loopback) {
    const port = Number(loopback[1]);
    if (port === bundledPort || port === DEFAULT_BUNDLED_PORT) return true;
  }
  const remote = remoteStreamServerUrl();
  return !!remote && url.startsWith(`${remote}/`);
}

export function isLocalEngineUrl(url: string | undefined | null): boolean {
  if (!url) return false;
  return /^https?:\/\/(127\.0\.0\.1|localhost):\d+\/stream\//i.test(url);
}

let probeCache: { ok: boolean; at: number; base: string } | null = null;

export type CastServerStatus = {
  bundled: boolean;
  running: boolean;
  ready: boolean;
  port: number | null;
  last_error: string | null;
  restart_count: number;
};

export async function getCastServerStatus(): Promise<CastServerStatus | null> {
  if (!isTauri) return null;
  try {
    const status = await invoke<CastServerStatus>("cast_server_status");
    if (typeof status.port === "number" && status.port > 0 && status.port !== bundledPort) {
      bundledPort = status.port;
      probeCache = null;
    }
    return status;
  } catch {
    return null;
  }
}

export async function restartCastServer(): Promise<string | null> {
  if (!isTauri) return "Argus's streaming server only runs in the desktop app.";
  try {
    await invoke("cast_server_restart");
    probeCache = null;
    return null;
  } catch (e) {
    probeCache = null;
    return String(e);
  }
}

export async function awaitCastServerReady(timeoutMs = 5000): Promise<boolean> {
  const remote = remoteStreamServerUrl();
  if (remote) {
    if (await probeStremioServer(true)) return true;
    if (remoteStreamServerStrict()) return false;
  }
  if (!isTauri) return probeStremioServer(!!remote, bundledServerUrl());
  const status = await getCastServerStatus();
  if (!status?.bundled) return false;
  if (status.ready) return true;
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    await new Promise((r) => window.setTimeout(r, READY_WAIT_POLL_MS));
    const s = await getCastServerStatus();
    if (s?.ready) return true;
    if (await httpProbe(true, bundledServerUrl())) return true;
    if (s && !s.running && s.restart_count >= 3) return false;
  }
  return false;
}

export async function probeStremioServer(force = false, base?: string): Promise<boolean> {
  const target = (base ?? getStremioServerUrl()).replace(/\/+$/, "");
  if (
    target !== bundledServerUrl() &&
    target !== `http://localhost:${bundledPort}` &&
    target !== `http://127.0.0.1:${DEFAULT_BUNDLED_PORT}` &&
    target !== `http://localhost:${DEFAULT_BUNDLED_PORT}`
  ) {
    return httpProbe(force, target);
  }
  if (isTauri) {
    const status = await getCastServerStatus();
    if (status?.ready) return true;
  }
  return httpProbe(force, target);
}

async function httpProbe(force: boolean, base: string): Promise<boolean> {
  const cleanBase = base.replace(/\/+$/, "");
  if (
    !force &&
    probeCache &&
    probeCache.base === cleanBase &&
    Date.now() - probeCache.at < PROBE_TTL_MS
  ) {
    return probeCache.ok;
  }
  try {
    const ctrl = new AbortController();
    const timer = window.setTimeout(() => ctrl.abort(), PROBE_TIMEOUT_MS);
    const res = await fetch(`${cleanBase}/settings`, {
      method: "GET",
      signal: ctrl.signal,
    });
    window.clearTimeout(timer);
    const ok = res.ok;
    if (ok) probeCache = { ok, at: Date.now(), base: cleanBase };
    else probeCache = null;
    return ok;
  } catch {
    probeCache = null;
    return false;
  }
}

export type StremioServerSettingsResponse = {
  baseUrl?: string;
  options?: Array<{
    id: string;
    label?: string;
    type?: string;
    selections?: Array<{ name: string; val: string | number | null }>;
  }>;
  values?: {
    serverVersion?: string;
    appPath?: string;
    cacheRoot?: string;
    cacheSize?: number | null;
    btMaxConnections?: number;
    btHandshakeTimeout?: number;
    btRequestTimeout?: number;
    btDownloadSpeedSoftLimit?: number;
    btDownloadSpeedHardLimit?: number;
    btMinPeersForStable?: number;
    transcodeProfile?: string | null;
    remoteHttps?: string | null;
    httpsEndpoint?: string | null;
  };
};

export async function fetchStremioServerSettings(
  base?: string,
): Promise<StremioServerSettingsResponse | null> {
  const cleanBase = (base ?? getStremioServerUrl()).replace(/\/+$/, "");
  try {
    const ctrl = new AbortController();
    const timer = window.setTimeout(() => ctrl.abort(), PROBE_TIMEOUT_MS);
    const res = await fetch(`${cleanBase}/settings`, {
      method: "GET",
      signal: ctrl.signal,
    });
    window.clearTimeout(timer);
    if (!res.ok) return null;
    return (await res.json()) as StremioServerSettingsResponse;
  } catch {
    return null;
  }
}

export async function updateStremioServerSettings(
  patch: Record<string, unknown>,
  base?: string,
): Promise<boolean> {
  const cleanBase = (base ?? getStremioServerUrl()).replace(/\/+$/, "");
  try {
    const ctrl = new AbortController();
    const timer = window.setTimeout(() => ctrl.abort(), PROBE_TIMEOUT_MS);
    const res = await fetch(`${cleanBase}/settings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
      signal: ctrl.signal,
    });
    window.clearTimeout(timer);
    return res.ok;
  } catch {
    return false;
  }
}

export function buildRemoteStreamingUrl(opts: {
  selectedUrl: string;
  httpsEndpoint: string;
  lanIp: string | null;
  serverBaseUrl?: string | null;
}): string {
  const endpoint = opts.httpsEndpoint.trim() || getStreamingHttpsEndpoint();
  if (opts.serverBaseUrl && /^https:\/\//i.test(opts.serverBaseUrl)) {
    return opts.serverBaseUrl;
  }
  if (endpoint) {
    const dashed = endpoint.replace(/\./g, "-");
    return `https://${dashed}.519b6502d940.stremio.rocks:${DEFAULT_HTTPS_PORT}`;
  }
  if (!isLoopbackServerUrl(opts.selectedUrl)) {
    return opts.selectedUrl;
  }
  if (opts.lanIp) {
    return `http://${opts.lanIp}:${bundledPort}/`;
  }
  return opts.selectedUrl;
}

function randomId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID().replace(/-/g, "");
  }
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function buildTranscodedUrl(sourceUrl: string): string {
  const id = randomId();
  const params = new URLSearchParams();
  params.set("mediaURL", sourceUrl);
  params.set("videoCodecs", "h264");
  params.set("audioCodecs", "aac");
  params.set("audioChannels", "2");
  const profile = getTranscodeProfile();
  if (profile && profile !== "none") {
    params.set("transcodeProfile", profile);
  }
  return `${engineBaseFor(sourceUrl)}/hlsv2/${id}/master.m3u8?${params.toString()}`;
}

export function engineBaseFor(url: string): string {
  const bundled = bundledServerUrl();
  if (url.startsWith(`${bundled}/`)) return bundled;
  const remote = remoteStreamServerUrl();
  if (remote && url.startsWith(`${remote}/`)) return remote;
  return getStremioServerUrl();
}

export function getStremioServerUrl(): string {
  const remote = remoteStreamServerUrl();
  if (remote) return remote;
  const selected = getSelectedStreamServerUrl().replace(/\/+$/, "");
  if (selected) return selected;
  if (!isTauri && typeof window !== "undefined" && window.location.port === "11471") {
    return `http://${window.location.hostname}:${DEFAULT_BUNDLED_PORT}`;
  }
  return bundledServerUrl();
}
