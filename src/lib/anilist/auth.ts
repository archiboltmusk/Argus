import {
  ANILIST_AUTHORIZE_URL,
  ANILIST_TOKEN_EXCHANGE_URL,
  getAnilistClientId,
} from "./config";
import { fetchViewer } from "./queries";
import { setSession } from "./session";
import type { AnilistSession } from "./types";

const DEFAULT_TOKEN_TTL_SEC = 31536000;
const JWT_RE = /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/;

export function buildAuthorizeUrl(): string {
  const params = new URLSearchParams({
    client_id: getAnilistClientId(),
    response_type: "token",
  });
  return `${ANILIST_AUTHORIZE_URL}?${params.toString()}`;
}

export function extractAnilistCode(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return "";
  const fromTokenUrl = /[?&#]access_token=([^&\s#]+)/.exec(trimmed);
  if (fromTokenUrl) {
    try {
      return decodeURIComponent(fromTokenUrl[1]).trim();
    } catch {
      return fromTokenUrl[1].trim();
    }
  }
  const fromCodeUrl = /[?&#]code=([^&\s#]+)/.exec(trimmed);
  if (fromCodeUrl) {
    try {
      return decodeURIComponent(fromCodeUrl[1]).trim();
    } catch {
      return fromCodeUrl[1].trim();
    }
  }
  return trimmed
    .replace(/^["'\s]+|["'\s]+$/g, "")
    .replace(/^Bearer\s+/i, "")
    .trim();
}

export async function completeAuthorization(pastedCode: string): Promise<AnilistSession> {
  const code = extractAnilistCode(pastedCode);
  if (!code) throw new Error("Paste the token from AniList to continue");
  const accessToken = await exchangeCode(code);
  const viewer = await fetchViewer(accessToken);
  const now = Date.now();
  const session: AnilistSession = {
    accessToken,
    createdAt: now,
    expiresAt: now + DEFAULT_TOKEN_TTL_SEC * 1000,
    userId: viewer.id,
    userName: viewer.name,
    avatar: viewer.avatar,
  };
  setSession(session);
  return session;
}

async function exchangeCode(codeOrToken: string): Promise<string> {
  if (JWT_RE.test(codeOrToken) || codeOrToken.startsWith("eyJ") || codeOrToken.length > 180) {
    return codeOrToken;
  }
  if (!ANILIST_TOKEN_EXCHANGE_URL || ANILIST_TOKEN_EXCHANGE_URL.includes(".invalid")) {
    throw new Error(
      "AniList returned a short authorization code instead of an access token. Click 'Open AniList again' to generate a direct token, or paste the full access token (starting with eyJ...).",
    );
  }
  const isTauri = "__TAURI__" in window || "__TAURI_INTERNALS__" in window;
  const post = isTauri ? (await import("@tauri-apps/plugin-http")).fetch : fetch;
  const res = await post(ANILIST_TOKEN_EXCHANGE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ code: codeOrToken }),
  });
  if (!res.ok) throw new Error("AniList rejected that code. Authorize again and paste the newest one.");
  const json = (await res.json()) as { access_token?: string };
  if (!json.access_token) throw new Error("AniList did not return a token. Try authorizing again.");
  return json.access_token;
}
