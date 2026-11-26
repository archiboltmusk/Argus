import { invoke } from "@tauri-apps/api/core";
import { ARGUS_COMPANION_URL, ARGUS_STREAM_RELAY_URL } from "@/lib/config/endpoints";

export type ProxyResult = {
  sessionId: string;
  url: string;
};

const WEB_RELAY_STORAGE_KEY = "argus.webStreamRelayUrl";
const WEB_COMPANION_STORAGE_KEY = "argus.webCompanionUrl";

const pendingRelease = new Map<string, number>();

function isTauriRuntime(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

function normalizeHttpBase(raw: string | null | undefined): string {
  const trimmed = (raw ?? "").trim().replace(/\/+$/, "");
  if (!trimmed) return "";
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return "";
    return `${parsed.origin}${parsed.pathname}`.replace(/\/+$/, "");
  } catch {
    return "";
  }
}

export function getWebRelayUrl(): string {
  if (typeof window !== "undefined") {
    try {
      const stored = normalizeHttpBase(window.localStorage.getItem(WEB_RELAY_STORAGE_KEY));
      if (stored) return stored;
    } catch {
      /* ignore storage errors */
    }
  }
  return normalizeHttpBase(ARGUS_STREAM_RELAY_URL);
}

export function setWebRelayUrl(url: string): void {
  if (typeof window === "undefined") return;
  const clean = normalizeHttpBase(url);
  try {
    if (clean) window.localStorage.setItem(WEB_RELAY_STORAGE_KEY, clean);
    else window.localStorage.removeItem(WEB_RELAY_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

export function getWebCompanionUrl(): string {
  if (typeof window !== "undefined") {
    try {
      const stored = normalizeHttpBase(window.localStorage.getItem(WEB_COMPANION_STORAGE_KEY));
      if (stored) return stored;
    } catch {
      /* ignore storage errors */
    }
  }
  return normalizeHttpBase(ARGUS_COMPANION_URL);
}

export function setWebCompanionUrl(url: string): void {
  if (typeof window === "undefined") return;
  const clean = normalizeHttpBase(url);
  try {
    if (clean) window.localStorage.setItem(WEB_COMPANION_STORAGE_KEY, clean);
    else window.localStorage.removeItem(WEB_COMPANION_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

export function hasWebStreamRelay(): boolean {
  return !isTauriRuntime() && Boolean(getWebRelayUrl() || getWebCompanionUrl());
}

export function hasWebCompanionServer(): boolean {
  return !isTauriRuntime() && Boolean(getWebCompanionUrl());
}

const LOCAL_COMPANION_CANDIDATES = [
  "http://127.0.0.1:8787",
  "http://localhost:8787",
  "http://127.0.0.1:11470",
  "http://localhost:11470",
];

/**
 * Probes standard local Argus Companion / Desktop bridge ports and returns the first healthy URL.
 */
export async function probeLocalWebCompanion(
  candidates: readonly string[] = LOCAL_COMPANION_CANDIDATES,
  timeoutMs = 900,
): Promise<string | null> {
  if (typeof fetch !== "function") return null;
  for (const raw of candidates) {
    const base = normalizeHttpBase(raw);
    if (!base) continue;
    try {
      const signal =
        typeof AbortSignal !== "undefined" && typeof AbortSignal.timeout === "function"
          ? AbortSignal.timeout(timeoutMs)
          : undefined;
      const res = await fetch(`${base}/health`, { signal });
      if (res.ok) return base;
    } catch {
      /* try next candidate */
    }
  }
  return null;
}

function encodeBase64UrlUtf8(input: string): string {
  const bytes = new TextEncoder().encode(input);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

export function buildWebRelayUrl(
  relayBase: string,
  targetUrl: string,
  headers?: Record<string, string>,
): string {
  const base = normalizeHttpBase(relayBase);
  if (!base) return targetUrl;
  const params = new URLSearchParams({ url: targetUrl });
  if (headers && Object.keys(headers).length > 0) {
    params.set("headers", encodeBase64UrlUtf8(JSON.stringify(headers)));
  }
  return `${base}/proxy?${params.toString()}`;
}

export async function registerStreamProxy(
  url: string,
  headers?: Record<string, string>,
  opts?: { transcode?: boolean; prebufferBytes?: number },
): Promise<ProxyResult> {
  if (isTauriRuntime()) {
    const args: Record<string, unknown> = { url, headers: headers ?? {} };
    if (opts?.transcode) {
      args.transcode = true;
      args.profile = { force_h264: false, force_aac: false };
    }
    if (opts?.prebufferBytes && opts.prebufferBytes > 0) {
      args.prebufferBytes = opts.prebufferBytes;
    }
    const r = await invoke<{ session_id: string; url: string }>("proxy_register", { args });
    return { sessionId: r.session_id, url: r.url };
  }

  const companion = getWebCompanionUrl();
  if (companion) {
    const response = await fetch(`${companion}/api/proxy/register`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        url,
        headers: headers ?? {},
        transcode: Boolean(opts?.transcode),
        profile: { force_h264: true, force_aac: true },
      }),
    });
    if (!response.ok) {
      throw new Error(`Companion proxy error (${response.status})`);
    }
    const data = (await response.json()) as { session_id: string; url: string };
    const resolvedUrl = /^https?:\/\//i.test(data.url)
      ? data.url
      : `${companion}${data.url.startsWith("/") ? "" : "/"}${data.url}`;
    return { sessionId: data.session_id, url: resolvedUrl };
  }

  const relay = getWebRelayUrl();
  if (relay && !opts?.transcode) {
    return {
      sessionId: "web-relay",
      url: buildWebRelayUrl(relay, url, headers),
    };
  }

  throw new Error("Stream proxy requires Tauri runtime or a configured Web Relay / Companion server");
}

export async function unregisterStreamProxy(sessionId: string): Promise<void> {
  if (isTauriRuntime()) {
    await invoke("proxy_unregister", { sessionId });
    return;
  }
  if (!sessionId || sessionId === "web-relay") return;
  const companion = getWebCompanionUrl();
  if (!companion) return;
  await fetch(`${companion}/api/proxy/unregister`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ session_id: sessionId }),
  }).catch(() => {});
}

export function retainStreamProxy(sessionId: string): void {
  const timer = pendingRelease.get(sessionId);
  if (timer == null) return;
  window.clearTimeout(timer);
  pendingRelease.delete(sessionId);
}

export function releaseStreamProxy(sessionId: string): void {
  retainStreamProxy(sessionId);
  const timer = window.setTimeout(() => {
    pendingRelease.delete(sessionId);
    void unregisterStreamProxy(sessionId).catch(() => {});
  }, 1500);
  pendingRelease.set(sessionId, timer);
}
