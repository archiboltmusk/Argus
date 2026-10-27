import {
  MAL_AUTHORIZE_URL,
  MAL_CLIENT_ID,
  MAL_TOKEN_PROXY,
  MAL_TOKEN_URL,
  getMalClientId,
  getMalClientSecret,
} from "./config";
import { getSession, setSession } from "./session";
import type { MalSession } from "./types";
import { activeProfileId } from "@/lib/active-profile-id";

function resolveClientId(): string {
  try {
    if (typeof getMalClientId === "function") return getMalClientId();
  } catch {
    /* fallback for test fixtures */
  }
  return MAL_CLIENT_ID;
}

function resolveClientSecret(): string {
  try {
    if (typeof getMalClientSecret === "function") return getMalClientSecret();
  } catch {
    /* fallback for test fixtures */
  }
  return "";
}

function generateVerifier(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~";
  const array = new Uint8Array(64);
  crypto.getRandomValues(array);
  let result = "";
  for (let i = 0; i < 64; i++) result += chars[array[i] % chars.length];
  return result;
}

type PendingAuthorization = { verifier: string; state: string; profileId: string; createdAt: number };
const PENDING_KEY = "argus.mal.authorization.v1";
let pendingAuthorization: PendingAuthorization | null = null;

export function cancelAuthorization(): void {
  pendingAuthorization = null;
  try { sessionStorage.removeItem(PENDING_KEY); } catch {}
}

function getPendingAuthorization(): PendingAuthorization | null {
  try {
    pendingAuthorization ??= JSON.parse(sessionStorage.getItem(PENDING_KEY) || "null");
  } catch {}
  const pending = pendingAuthorization;
  if (!pending || typeof pending.verifier !== "string" || typeof pending.state !== "string" ||
    pending.profileId !== activeProfileId() || !Number.isFinite(pending.createdAt) ||
    Date.now() - pending.createdAt > 15 * 60 * 1000) return null;
  return pending;
}

export function buildAuthorizeUrl(): string {
  const verifier = generateVerifier();
  const state = generateVerifier();
  pendingAuthorization = { verifier, state, profileId: activeProfileId(), createdAt: Date.now() };
  try { sessionStorage.setItem(PENDING_KEY, JSON.stringify(pendingAuthorization)); } catch {}

  const params = new URLSearchParams({
    response_type: "code",
    client_id: resolveClientId(),
    code_challenge: verifier,
    code_challenge_method: "plain",
    state,
  });
  return `${MAL_AUTHORIZE_URL}?${params.toString()}`;
}

export function extractMalCode(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return "";
  const fromTokenUrl = /[?&#]access_token=([^&\s#]+)/.exec(trimmed);
  if (fromTokenUrl) {
    try {
      return `token:${decodeURIComponent(fromTokenUrl[1]).trim()}`;
    } catch {
      return `token:${fromTokenUrl[1].trim()}`;
    }
  }
  const fromUrl = /[?&#]code=([^&\s#]+)/.exec(trimmed);
  if (fromUrl) {
    try {
      return decodeURIComponent(fromUrl[1]).trim();
    } catch {
      return fromUrl[1].trim();
    }
  }
  return trimmed.replace(/^["'\s]+|["'\s]+$/g, "");
}

async function tauriFetch(input: string, init?: RequestInit): Promise<Response> {
  if (typeof window !== "undefined" && "__TAURI_INTERNALS__" in window) {
    const { fetch: tauriFetchFn } = await import("@tauri-apps/plugin-http");
    return tauriFetchFn(input, init as Record<string, unknown>) as unknown as Response;
  }
  return fetch(input, init);
}

export async function completeAuthorization(pastedCode: string, requireState = false): Promise<MalSession> {
  const extracted = extractMalCode(pastedCode);
  if (!extracted) throw new Error("Paste the code from MyAnimeList to continue");
  if (extracted.startsWith("token:")) {
    const accessToken = extracted.slice("token:".length);
    const userName = await fetchUserName(accessToken);
    if (userName === "unknown") {
      throw new Error("MyAnimeList rejected that access token.");
    }
    cancelAuthorization();
    const now = Date.now();
    const session: MalSession = {
      accessToken,
      refreshToken: "",
      createdAt: now,
      expiresAt: now + 30 * 24 * 3600 * 1000,
      userName,
    };
    setSession(session);
    return session;
  }

  const pending = getPendingAuthorization();
  if (!pending) throw new Error("Session expired. Start over and authorize again.");
  if (requireState) {
    const params = new URL(pastedCode).searchParams;
    if (params.get("state") !== pending.state) throw new Error("This authorization belongs to another attempt. Authorize again.");
  }
  const tokenData = await exchangeCode(extracted, pending.verifier);

  const userName = await fetchUserName(tokenData.access_token);
  if (getPendingAuthorization() !== pending) throw new Error("Authorization was cancelled. Start over and authorize again.");
  cancelAuthorization();

  const now = Date.now();
  const session: MalSession = {
    accessToken: tokenData.access_token,
    refreshToken: tokenData.refresh_token,
    createdAt: now,
    expiresAt: now + tokenData.expires_in * 1000,
    userName,
  };
  setSession(session);
  return session;
}

function hasConfiguredProxy(): boolean {
  return Boolean(MAL_TOKEN_PROXY && !MAL_TOKEN_PROXY.includes(".invalid"));
}

async function exchangeCode(
  code: string,
  codeVerifier: string,
): Promise<{ access_token: string; refresh_token: string; expires_in: number }> {
  if (hasConfiguredProxy()) {
    const res = await tauriFetch(MAL_TOKEN_PROXY, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        grant_type: "authorization_code",
        code,
        code_verifier: codeVerifier,
      }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`MAL rejected that code (HTTP ${res.status}): ${text.slice(0, 200)}`);
    }
    const json = await res.json();
    if (!json.access_token) throw new Error("MAL did not return a token. Try authorizing again.");
    return json;
  }

  const tokenEndpoint = MAL_TOKEN_URL || "https://myanimelist.net/v1/oauth2/token";
  const clientId = resolveClientId();
  const clientSecret = resolveClientSecret();
  const form = new URLSearchParams({
    client_id: clientId,
    grant_type: "authorization_code",
    code,
    code_verifier: codeVerifier,
  });
  if (clientSecret) {
    form.set("client_secret", clientSecret);
  }

  const res = await tauriFetch(tokenEndpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: form.toString(),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    if (res.status === 401 || /invalid_client/i.test(text)) {
      throw new Error(
        "MyAnimeList requires a Client Secret for this Client ID, or the Client ID is invalid. Open 'Use custom Client ID' below and enter an 'Other' (Desktop) Client ID from myanimelist.net/apiconfig.",
      );
    }
    throw new Error(`MAL rejected that code (HTTP ${res.status}): ${text.slice(0, 200)}`);
  }
  const json = await res.json();
  if (!json.access_token) throw new Error("MAL did not return a token. Try authorizing again.");
  return json;
}

export async function refreshAccessToken(): Promise<MalSession | null> {
  const current = getSession();
  if (!current?.refreshToken) return null;
  try {
    let res: Response;
    if (hasConfiguredProxy()) {
      res = await tauriFetch(MAL_TOKEN_PROXY, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          grant_type: "refresh_token",
          refresh_token: current.refreshToken,
        }),
      });
    } else {
      const tokenEndpoint = MAL_TOKEN_URL || "https://myanimelist.net/v1/oauth2/token";
      const clientId = resolveClientId();
      const clientSecret = resolveClientSecret();
      const form = new URLSearchParams({
        client_id: clientId,
        grant_type: "refresh_token",
        refresh_token: current.refreshToken,
      });
      if (clientSecret) {
        form.set("client_secret", clientSecret);
      }
      res = await tauriFetch(tokenEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Accept: "application/json",
        },
        body: form.toString(),
      });
    }
    if (!res.ok) {
      setSession(null);
      return null;
    }
    const data = (await res.json()) as {
      access_token: string;
      refresh_token: string;
      expires_in: number;
    };
    const now = Date.now();
    const next: MalSession = {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      createdAt: now,
      expiresAt: now + data.expires_in * 1000,
      userName: current.userName,
    };
    setSession(next);
    return next;
  } catch {
    if (typeof navigator !== "undefined" && !navigator.onLine) return null;
    setSession(null);
    return null;
  }
}

let inflightRefresh: Promise<MalSession | null> | null = null;

export function ensureRefreshed(): Promise<MalSession | null> {
  if (!inflightRefresh) {
    inflightRefresh = refreshAccessToken().finally(() => {
      inflightRefresh = null;
    });
  }
  return inflightRefresh;
}

async function fetchUserName(accessToken: string): Promise<string> {
  const res = await tauriFetch("https://api.myanimelist.net/v2/users/@me", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) return "unknown";
  const json = await res.json();
  return json.name ?? "unknown";
}
