import { openUrl } from "@/lib/window";
import type { GameSummary } from "./types";

export type CloudProviderId =
  | "geforce_now"
  | "xbox_cloud"
  | "luna"
  | "boosteroid"
  | "moonlight";

export type CloudProviderInfo = {
  id: CloudProviderId;
  name: string;
  tagline: string;
  description: string;
  badge: string;
  accentColor: string;
  baseUrl: string;
  freeTier: boolean;
  controllerSupported: boolean;
  resolutionInfo: string;
};

export const CLOUD_PROVIDERS: Record<CloudProviderId, CloudProviderInfo> = {
  geforce_now: {
    id: "geforce_now",
    name: "GeForce NOW",
    tagline: "RTX 4080 Cloud Rig",
    description: "Stream games you already own on Steam, Epic, Ubisoft, or Xbox PC with full ray tracing, DLSS 3.5, and zero disk space.",
    badge: "RTX Cloud",
    accentColor: "from-emerald-500/20 to-emerald-950/40 text-emerald-400 border-emerald-500/30",
    baseUrl: "https://play.geforcenow.com",
    freeTier: true,
    controllerSupported: true,
    resolutionInfo: "Up to 4K 120 FPS / 1080p 240 FPS",
  },
  xbox_cloud: {
    id: "xbox_cloud",
    name: "Xbox Cloud Gaming",
    tagline: "Xbox Game Pass Ultimate",
    description: "Instant access to hundreds of console and PC Game Pass titles streaming directly via low-latency WebRTC with full controller support.",
    badge: "xCloud",
    accentColor: "from-green-500/20 to-green-950/40 text-green-400 border-green-500/30",
    baseUrl: "https://www.xbox.com/play",
    freeTier: false,
    controllerSupported: true,
    resolutionInfo: "1080p 60 FPS Custom Series X blades",
  },
  boosteroid: {
    id: "boosteroid",
    name: "Boosteroid",
    tagline: "Ultra Browser Gaming",
    description: "Fast cloud gaming right in your browser with high-end server rigs in North America and Europe.",
    badge: "Boosteroid",
    accentColor: "from-cyan-500/20 to-blue-950/40 text-cyan-400 border-cyan-500/30",
    baseUrl: "https://cloud.boosteroid.com",
    freeTier: false,
    controllerSupported: true,
    resolutionInfo: "Up to 4K 120 FPS",
  },
  luna: {
    id: "luna",
    name: "Amazon Luna",
    tagline: "Prime & Ubisoft+ Cloud",
    description: "Stream rotating Prime Gaming titles, Ubisoft+ games, and Jackbox party games with instant Luna Couch multiplayer.",
    badge: "Luna",
    accentColor: "from-purple-500/20 to-purple-950/40 text-purple-400 border-purple-500/30",
    baseUrl: "https://luna.amazon.com",
    freeTier: true,
    controllerSupported: true,
    resolutionInfo: "1080p 60 FPS",
  },
  moonlight: {
    id: "moonlight",
    name: "Moonlight / Sunshine",
    tagline: "Self-Hosted Remote Stream",
    description: "Stream directly from your personal desktop PC (NVIDIA/AMD/Intel) to Argus over local Wi-Fi or internet with sub-5ms latency and zero subscriptions.",
    badge: "Local Host",
    accentColor: "from-amber-500/20 to-amber-950/40 text-amber-400 border-amber-500/30",
    baseUrl: "http://localhost:47990", // Default Sunshine Web Config UI
    freeTier: true,
    controllerSupported: true,
    resolutionInfo: "4K 144 FPS AV1/HEVC Low-Latency",
  },
};

export type CloudGameOption = {
  providerId: CloudProviderId;
  providerName: string;
  gameTitle: string;
  launchUrl: string;
  badge: string;
  freeTier: boolean;
  notes?: string;
};

// Known cloud-supported game registry mapped by Steam ID or name tokens
type KnownCloudEntry = {
  keywords: string[];
  steamIds?: number[];
  providers: Array<{
    providerId: CloudProviderId;
    launchUrl: string;
    notes?: string;
    freeTier?: boolean;
  }>;
};

const KNOWN_CLOUD_CATALOG: KnownCloudEntry[] = [
  {
    keywords: ["cyberpunk", "cyberpunk 2077"],
    steamIds: [1091500],
    providers: [
      {
        providerId: "geforce_now",
        launchUrl: "https://play.geforcenow.com",
        notes: "Full Path Tracing & DLSS 3.5 on RTX 4080 tier",
        freeTier: true,
      },
      {
        providerId: "boosteroid",
        launchUrl: "https://cloud.boosteroid.com",
        notes: "Steam & GOG library stream",
        freeTier: false,
      },
    ],
  },
  {
    keywords: ["fortnite"],
    providers: [
      {
        providerId: "xbox_cloud",
        launchUrl: "https://www.xbox.com/play/games/fortnite/BT5P2X999VH2",
        notes: "100% Free — No Xbox Game Pass subscription required",
        freeTier: true,
      },
      {
        providerId: "geforce_now",
        launchUrl: "https://play.geforcenow.com",
        notes: "100% Free with GeForce NOW Free Membership",
        freeTier: true,
      },
      {
        providerId: "luna",
        launchUrl: "https://luna.amazon.com/game/fortnite/B0B5NPM4HQ",
        notes: "Free for Amazon Prime members",
        freeTier: true,
      },
    ],
  },
  {
    keywords: ["grand theft auto v", "gta v", "gtav", "gta 5"],
    steamIds: [271590],
    providers: [
      {
        providerId: "geforce_now",
        launchUrl: "https://play.geforcenow.com",
        notes: "Steam & Epic Games version supported",
        freeTier: true,
      },
      {
        providerId: "boosteroid",
        launchUrl: "https://cloud.boosteroid.com",
        notes: "Steam & Rockstar launcher cloud session",
        freeTier: false,
      },
    ],
  },
  {
    keywords: ["starfield"],
    steamIds: [1716740],
    providers: [
      {
        providerId: "xbox_cloud",
        launchUrl: "https://www.xbox.com/play/games/starfield/9NCVJGNZT9SN",
        notes: "Included in Xbox Game Pass Ultimate",
        freeTier: false,
      },
      {
        providerId: "geforce_now",
        launchUrl: "https://play.geforcenow.com",
        notes: "Stream via PC Game Pass or Steam",
        freeTier: true,
      },
    ],
  },
  {
    keywords: ["forza horizon 5"],
    steamIds: [1551360],
    providers: [
      {
        providerId: "xbox_cloud",
        launchUrl: "https://www.xbox.com/play/games/forza-horizon-5-standard-edition/9NKX70BBC2TN",
        notes: "Included in Xbox Game Pass Ultimate",
        freeTier: false,
      },
      {
        providerId: "geforce_now",
        launchUrl: "https://play.geforcenow.com",
        notes: "Stream your Steam or Xbox copy in 4K",
        freeTier: true,
      },
    ],
  },
  {
    keywords: ["halo infinite"],
    steamIds: [1240440],
    providers: [
      {
        providerId: "xbox_cloud",
        launchUrl: "https://www.xbox.com/play/games/halo-infinite/9PP5G1F0C2B6",
        notes: "Multiplayer is free to stream",
        freeTier: true,
      },
      {
        providerId: "geforce_now",
        launchUrl: "https://play.geforcenow.com",
        notes: "Steam or Xbox PC launcher supported",
        freeTier: true,
      },
    ],
  },
  {
    keywords: ["baldur's gate 3", "baldurs gate 3"],
    steamIds: [1086940],
    providers: [
      {
        providerId: "geforce_now",
        launchUrl: "https://play.geforcenow.com",
        notes: "Stream your Steam or GOG copy with cross-saves",
        freeTier: true,
      },
      {
        providerId: "boosteroid",
        launchUrl: "https://cloud.boosteroid.com",
        notes: "High performance cloud rig",
        freeTier: false,
      },
    ],
  },
  {
    keywords: ["genshin impact"],
    providers: [
      {
        providerId: "geforce_now",
        launchUrl: "https://play.geforcenow.com",
        notes: "Free to play — zero local storage needed",
        freeTier: true,
      },
    ],
  },
  {
    keywords: ["black myth wukong", "black myth: wukong"],
    steamIds: [2358720],
    providers: [
      {
        providerId: "geforce_now",
        launchUrl: "https://play.geforcenow.com",
        notes: "Full ray tracing on RTX 4080 tier",
        freeTier: true,
      },
      {
        providerId: "boosteroid",
        launchUrl: "https://cloud.boosteroid.com",
        notes: "Steam copy stream",
        freeTier: false,
      },
    ],
  },
  {
    keywords: ["palworld"],
    steamIds: [1623730],
    providers: [
      {
        providerId: "xbox_cloud",
        launchUrl: "https://www.xbox.com/play/games/palworld-game-preview/9NKVB3GQSRW5",
        notes: "Included in Xbox Game Pass",
        freeTier: false,
      },
      {
        providerId: "geforce_now",
        launchUrl: "https://play.geforcenow.com",
        notes: "Steam & Xbox PC versions",
        freeTier: true,
      },
    ],
  },
  {
    keywords: ["destiny 2"],
    steamIds: [1085660],
    providers: [
      {
        providerId: "geforce_now",
        launchUrl: "https://play.geforcenow.com",
        notes: "Free to play base game",
        freeTier: true,
      },
    ],
  },
  {
    keywords: ["apex legends"],
    steamIds: [1172470],
    providers: [
      {
        providerId: "geforce_now",
        launchUrl: "https://play.geforcenow.com",
        notes: "Free to play with 240 FPS competitive stream",
        freeTier: true,
      },
    ],
  },
  {
    keywords: ["witcher 3", "the witcher 3: wild hunt"],
    steamIds: [292030],
    providers: [
      {
        providerId: "geforce_now",
        launchUrl: "https://play.geforcenow.com",
        notes: "Next-gen ray traced update supported",
        freeTier: true,
      },
    ],
  },
];

/**
 * Resolves cloud gaming options for a given game summary or ID.
 */
export function resolveCloudGamingOptions(
  game: GameSummary,
  steamId?: number,
  _igdbId?: number,
): CloudGameOption[] {
  const normName = game.name.toLowerCase().trim();
  const options: CloudGameOption[] = [];

  // 1. Check known catalog matches
  for (const entry of KNOWN_CLOUD_CATALOG) {
    const matchesId = steamId && entry.steamIds?.includes(steamId);
    const matchesKeyword = entry.keywords.some((kw) => normName.includes(kw));

    if (matchesId || matchesKeyword) {
      for (const p of entry.providers) {
        const info = CLOUD_PROVIDERS[p.providerId];
        options.push({
          providerId: p.providerId,
          providerName: info.name,
          gameTitle: game.name,
          launchUrl: p.launchUrl,
          badge: info.badge,
          freeTier: p.freeTier ?? info.freeTier,
          notes: p.notes,
        });
      }
      break;
    }
  }

  // 2. Generic GeForce NOW fallback (if game is on Steam or PC, it can often be launched on GFN)
  if (steamId && !options.some((o) => o.providerId === "geforce_now")) {
    const info = CLOUD_PROVIDERS.geforce_now;
    options.push({
      providerId: "geforce_now",
      providerName: info.name,
      gameTitle: game.name,
      launchUrl: `https://play.geforcenow.com`,
      badge: info.badge,
      freeTier: true,
      notes: "Check availability on your linked Steam/Epic account",
    });
  }

  // 3. Always provide Self-Hosted Moonlight / Sunshine streaming option
  const moonlightInfo = CLOUD_PROVIDERS.moonlight;
  options.push({
    providerId: "moonlight",
    providerName: moonlightInfo.name,
    gameTitle: game.name,
    launchUrl: "http://localhost:47990",
    badge: moonlightInfo.badge,
    freeTier: true,
    notes: "Stream from your personal PC / Sunshine host",
  });

  return options;
}

/**
 * Launches a cloud game option in the user's browser or native gaming window.
 */
export function launchCloudGame(option: CloudGameOption | CloudProviderInfo): void {
  const url = "launchUrl" in option ? option.launchUrl : option.baseUrl;
  openUrl(url);
}
