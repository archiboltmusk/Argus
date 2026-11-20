import { StoreGame } from "./store-types";
import { generateOfflineAIGame } from "./ai-game-forge";

const STORAGE_KEY = "argus_game_store_library_v1";

const DEFAULT_STORE_GAMES: StoreGame[] = [
  {
    id: "cyber_neon_runner",
    title: "Cyber Neon: Void Runner",
    subtitle: "AI-Forged Synthwave Dash",
    description: "An adrenaline-fueled endless runner generated with procedural synth audio. Jump over laser barricades and maintain velocity through high-speed neon corridors.",
    author: "Argus AI Forge (Gemma 4)",
    category: "ai_forged",
    tags: ["AI Generated", "Endless Runner", "Synthwave"],
    rating: 4.9,
    downloads: 14200,
    gamepadVerified: true,
    coverGradient: "from-cyan-600 to-rose-700",
    accentColor: "#06b6d4",
    icon: "Zap",
    promptUsed: "A fast-paced neon cyberpunk runner where I dodge traffic, collect battery cells, and hear retro synthwave audio.",
    modelUsed: "Gemma 4 26B",
    playableType: "html5_canvas",
    sourceCode: generateOfflineAIGame({
      title: "Cyber Neon: Void Runner",
      genre: "runner",
      artStyle: "neon_cyberpunk",
      prompt: "Endless cyberpunk neon runner with high-speed jumps",
    }).code,
    installed: true,
    featured: true,
  },
  {
    id: "orbital_defense",
    title: "Orbital Defense: Deep Space",
    subtitle: "Top-Down Tactical Arcade Shooter",
    description: "Defend orbital relays from descending hostile alien swarms. Features autofire weapon arrays, shield management, and procedural chiptune effects.",
    author: "Argus AI Forge (Gemini 3.5)",
    category: "ai_forged",
    tags: ["AI Generated", "Arcade Shooter", "Retro"],
    rating: 4.8,
    downloads: 9800,
    gamepadVerified: true,
    coverGradient: "from-indigo-700 to-purple-900",
    accentColor: "#8b5cf6",
    icon: "Shield",
    promptUsed: "Top-down space arena shooter with bullet salvos and shield recharge.",
    modelUsed: "Gemini 3.5 Flash",
    playableType: "html5_canvas",
    sourceCode: generateOfflineAIGame({
      title: "Orbital Defense: Deep Space",
      genre: "shooter",
      artStyle: "retro_pixel",
      prompt: "Top down tactical space shooter",
    }).code,
    installed: true,
    featured: true,
  },
  {
    id: "autodrift",
    title: "Auto Drift: Peak Hour",
    subtitle: "Delhi Street Grand Prix",
    description: "Top-down retro drift racing with an auto-rickshaw! Slide around tight corners, dodge traffic and potholes, and collect fare multipliers.",
    author: "Argus Studio",
    category: "racing",
    tags: ["Drift Physics", "Arcade Racing", "Satire"],
    rating: 4.9,
    downloads: 28400,
    gamepadVerified: true,
    coverGradient: "from-yellow-500 to-emerald-600",
    accentColor: "#eab308",
    icon: "Car",
    playableType: "native_arcade",
    installed: true,
    featured: true,
  },
  {
    id: "kafila",
    title: "Kafila Surge",
    subtitle: "Chalo Jantar Mantar",
    description: "Flock dynamic crowds, smash police barricades with mass momentum, dodge water cannons, and hold the central sanctuary.",
    author: "Argus Studio",
    category: "action",
    tags: ["Crowd Flocking", "Action Strategy", "Satire"],
    rating: 5.0,
    downloads: 41200,
    gamepadVerified: true,
    coverGradient: "from-orange-600 to-amber-700",
    accentColor: "#ea580c",
    icon: "Users",
    playableType: "native_arcade",
    installed: true,
  },
  {
    id: "nighter",
    title: "Night ER: Resident Survival",
    subtitle: "Survive the 36-Hour Shift",
    description: "Twin-stick horde survival! Upgrade coffee intake, deploy automated defibrillators, wield cautery arcs, and survive endless shifts of consults.",
    author: "Argus Studio",
    category: "roguelike",
    tags: ["Horde Defense", "Twin-Stick", "Medical"],
    rating: 4.9,
    downloads: 19300,
    gamepadVerified: true,
    coverGradient: "from-cyan-600 to-blue-800",
    accentColor: "#06b6d4",
    icon: "Activity",
    playableType: "native_arcade",
    installed: true,
  },
  {
    id: "chaiwala",
    title: "Chai Wala Rush",
    subtitle: "Platform 1 Express",
    description: "High-speed platform tea stall management! Brew cutting chai, toast bun maska, and toss kulhads to passengers before the train departs.",
    author: "Argus Studio",
    category: "arcade",
    tags: ["Time Management", "Reflex Arcade", "Culinary"],
    rating: 4.8,
    downloads: 16700,
    gamepadVerified: true,
    coverGradient: "from-amber-600 to-red-700",
    accentColor: "#d97706",
    icon: "Coffee",
    playableType: "native_arcade",
    installed: true,
  },
  {
    id: "carrom",
    title: "Carrom Masters Pro",
    subtitle: "Classic Wooden Board Physics",
    description: "Authentic 2D rigid-body carrom physics board game. Pocket carrom men, control strike power and angles, and master the Queen cover.",
    author: "Argus Studio",
    category: "puzzle",
    tags: ["Physics Board Game", "Single & Couch 2P", "Precision"],
    rating: 4.9,
    downloads: 32100,
    gamepadVerified: true,
    coverGradient: "from-amber-800 to-stone-900",
    accentColor: "#b45309",
    icon: "Disc",
    playableType: "native_arcade",
    installed: true,
  },
];

export function getStoreCatalog(): StoreGame[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_STORE_GAMES;
    const userCustom: StoreGame[] = JSON.parse(raw);
    const existingIds = new Set(userCustom.map((g) => g.id));
    const merged = [...userCustom];
    for (const g of DEFAULT_STORE_GAMES) {
      if (!existingIds.has(g.id)) merged.push(g);
    }
    return merged;
  } catch {
    return DEFAULT_STORE_GAMES;
  }
}

export function saveGameToStoreLibrary(game: StoreGame): void {
  try {
    const games = getStoreCatalog();
    const idx = games.findIndex((g) => g.id === game.id);
    if (idx >= 0) {
      games[idx] = { ...game, installed: true, installedAt: new Date().toISOString() };
    } else {
      games.unshift({ ...game, installed: true, installedAt: new Date().toISOString() });
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(games));
  } catch {
    // LocalStorage write fallback
  }
}

export function toggleInstallGame(gameId: string): boolean {
  try {
    const games = getStoreCatalog();
    const target = games.find((g) => g.id === gameId);
    if (!target) return false;
    target.installed = !target.installed;
    if (target.installed) target.installedAt = new Date().toISOString();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(games));
    return target.installed;
  } catch {
    return false;
  }
}
