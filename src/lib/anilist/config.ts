import { ARGUS_BUGS_BASE } from "@/lib/config/endpoints";

export const ANILIST_GRAPHQL_URL = "https://graphql.anilist.co";
export const ANILIST_AUTHORIZE_URL = "https://anilist.co/api/v2/oauth/authorize";
export const ANILIST_PIN_REDIRECT_URI = "https://anilist.co/api/v2/oauth/pin";
export const ANILIST_DEVELOPER_URL = "https://anilist.co/settings/developer";
export const ANILIST_CLIENT_ID = "54032";
export const ANILIST_TOKEN_EXCHANGE_URL = `${ARGUS_BUGS_BASE}/v1/anilist/token`;

const CUSTOM_CLIENT_ID_KEY = "argus.anilist.clientId";

export function getAnilistClientId(): string {
  try {
    const custom = localStorage.getItem(CUSTOM_CLIENT_ID_KEY)?.trim();
    if (custom) return custom;
  } catch {
    /* ignore */
  }
  return ANILIST_CLIENT_ID;
}

export function setAnilistClientId(clientId: string): void {
  try {
    const clean = clientId.trim();
    if (clean) localStorage.setItem(CUSTOM_CLIENT_ID_KEY, clean);
    else localStorage.removeItem(CUSTOM_CLIENT_ID_KEY);
  } catch {
    /* ignore */
  }
}
