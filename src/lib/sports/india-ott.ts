export type IndiaOttProvider = {
  id: string;
  name: string;
  color: string;
  textColor: string;
  watchUrl: string;
  badge: string;
};

export const INDIA_OTT_PROVIDERS: Record<string, IndiaOttProvider> = {
  jiohotstar: {
    id: "jiohotstar",
    name: "JioHotstar",
    color: "#0c2044",
    textColor: "#38bdf8",
    watchUrl: "https://www.hotstar.com/in/sports",
    badge: "JioHotstar",
  },
  sonyliv: {
    id: "sonyliv",
    name: "SonyLIV",
    color: "#1e1e24",
    textColor: "#fbbf24",
    watchUrl: "https://www.sonyliv.com/sports",
    badge: "SonyLIV",
  },
  fancode: {
    id: "fancode",
    name: "FanCode",
    color: "#e11d48",
    textColor: "#ffffff",
    watchUrl: "https://www.fancode.com",
    badge: "FanCode",
  },
  prime_in: {
    id: "prime_in",
    name: "Prime Video IN",
    color: "#00a8e1",
    textColor: "#ffffff",
    watchUrl: "https://www.primevideo.com",
    badge: "Prime Video",
  },
  hoichoi: {
    id: "hoichoi",
    name: "Hoichoi",
    color: "#e50914",
    textColor: "#ffffff",
    watchUrl: "https://www.hoichoi.tv",
    badge: "Hoichoi",
  },
  zee5: {
    id: "zee5",
    name: "ZEE5",
    color: "#831843",
    textColor: "#f472b6",
    watchUrl: "https://www.zee5.com",
    badge: "ZEE5",
  },
};

/**
 * Maps sports leagues and tournaments to their official broadcast rights holder in India.
 */
export function getIndiaSportsBroadcastRights(leagueTag: string): IndiaOttProvider | null {
  const tag = (leagueTag || "").toUpperCase();

  // Cricket & Football rights in India
  if (["IPL", "WPL", "ICC", "WTC", "ICCWC", "RANJI", "EPL"].includes(tag)) {
    return INDIA_OTT_PROVIDERS.jiohotstar;
  }
  if (["UCL", "LALIGA", "SERIEA", "BUNDESLIGA", "FACUP", "CARABAO", "ROSHN"].includes(tag)) {
    return INDIA_OTT_PROVIDERS.sonyliv;
  }
  if (["F1", "MOTOGP", "CARIBBEAN_PL", "SUPER_SMASH", "BBL"].includes(tag)) {
    return INDIA_OTT_PROVIDERS.fancode;
  }
  if (tag === "ISL" || tag === "PKL") {
    return INDIA_OTT_PROVIDERS.jiohotstar;
  }

  return null;
}
