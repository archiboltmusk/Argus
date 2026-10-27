import { ARGUS_MAL_BASE } from "@/lib/config/endpoints";

export const MAL_AUTHORIZE_URL = "https://myanimelist.net/v1/oauth2/authorize";
export const MAL_TOKEN_URL = "https://myanimelist.net/v1/oauth2/token";
export const MAL_API_BASE = "https://api.myanimelist.net/v2";
export const MAL_REDIRECT_URI = `${ARGUS_MAL_BASE}/mal/`;
export const MAL_DEVELOPER_URL = "https://myanimelist.net/apiconfig";
export const MAL_CLIENT_ID = "8d7dac2f8cfd72abf79f59288bf6b0ed";
export const MAL_TOKEN_PROXY = `${ARGUS_MAL_BASE}/api/mal/token`;

const CUSTOM_MAL_CLIENT_ID_KEY = "argus.mal.clientId";
const CUSTOM_MAL_CLIENT_SECRET_KEY = "argus.mal.clientSecret";

export function getMalClientId(): string {
  try {
    const custom = localStorage.getItem(CUSTOM_MAL_CLIENT_ID_KEY)?.trim();
    if (custom) return custom;
  } catch {
    /* ignore */
  }
  return MAL_CLIENT_ID;
}

export function setMalClientId(clientId: string): void {
  try {
    const clean = clientId.trim();
    if (clean) localStorage.setItem(CUSTOM_MAL_CLIENT_ID_KEY, clean);
    else localStorage.removeItem(CUSTOM_MAL_CLIENT_ID_KEY);
  } catch {
    /* ignore */
  }
}

export function getMalClientSecret(): string {
  try {
    return localStorage.getItem(CUSTOM_MAL_CLIENT_SECRET_KEY)?.trim() ?? "";
  } catch {
    return "";
  }
}

export function setMalClientSecret(secret: string): void {
  try {
    const clean = secret.trim();
    if (clean) localStorage.setItem(CUSTOM_MAL_CLIENT_SECRET_KEY, clean);
    else localStorage.removeItem(CUSTOM_MAL_CLIENT_SECRET_KEY);
  } catch {
    /* ignore */
  }
}
