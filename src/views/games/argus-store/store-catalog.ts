import { StoreGame } from "./store-types";
import { generateOfflineAIGame } from "./ai-game-forge";

const STORAGE_KEY = "argus_game_store_library_v2";

const DEFAULT_STORE_GAMES: StoreGame[] = [
  {
    id: "twinstick_arena_blast",
    title: "Void Swarm: Overdrive",
    subtitle: "AI-Forged Twin-Stick Arena",
    description: "High-intensity arena twin-stick shooter with dual stick 360-degree aiming, tactical dash, particle sparks, and crunchy hit-stop impacts.",
    author: "Argus AI Forge (Gemma 4)",
    category: "ai_forged",
    tags: ["Twin-Stick", "Game Feel Juice", "Action"],
    rating: 5.0,
    downloads: 11200,
    gamepadVerified: true,
    coverGradient: "from-blue-600 to-indigo-900",
    accentColor: "#38bdf8",
    icon: "Crosshair",
    promptUsed: "Twin stick arena shooter with 360 aiming, dash evasions, and heavy screen shake.",
    modelUsed: "Gemma 4 26B",
    playableType: "html5_canvas",
    sourceCode: generateOfflineAIGame({
      title: "Void Swarm: Overdrive",
      genre: "twinstick",
      artStyle: "neon_cyberpunk",
      prompt: "Twin-stick arena shooter with dash mechanics",
    }).code,
    installed: true,
    featured: true,
  },
  {
    id: "chrono_blade",
    title: "Chrono Blade: Neon Abyss",
    subtitle: "AI-Forged Katana Platformer",
    description: "Fast-paced 2D action platformer featuring coyote time, jump buffering, katana slash arcs, and dynamic enemy knockback physics.",
    author: "Argus AI Forge (Gemma 4)",
    category: "ai_forged",
    tags: ["Action Platformer", "Coyote Time", "Katana"],
    rating: 4.9,
    downloads: 13800,
    gamepadVerified: true,
    coverGradient: "from-emerald-600 to-teal-900",
    accentColor: "#10b981",
    icon: "Flame",
    promptUsed: "2D katana platformer with coyote time, jump buffering, and slash arcs.",
    modelUsed: "Gemma 4 26B",
    playableType: "html5_canvas",
    sourceCode: generateOfflineAIGame({
      title: "Chrono Blade: Neon Abyss",
      genre: "metroidvania",
      artStyle: "vector_minimal",
      prompt: "Katana action platformer with coyote time",
    }).code,
    installed: true,
    featured: true,
  },
  {
    id: "danmaku_core",
    title: "Danmaku Core: Bullet Horizon",
    subtitle: "AI-Forged Bullet Hell",
    description: "Hypnotic geometric bullet curtains, precision core hitbox, bullet grazing rewards, and screen-clearing EMP bombs with decay shake.",
    author: "Argus AI Forge (Gemini 3.5)",
    category: "ai_forged",
    tags: ["Bullet Hell", "Danmaku", "Grazing"],
    rating: 4.9,
    downloads: 8700,
    gamepadVerified: true,
    coverGradient: "from-purple-600 to-rose-900",
    accentColor: "#f43f5e",
    icon: "Target",
    promptUsed: "Danmaku bullet hell with spiral patterns, graze scoring, and EMP bomb clearance.",
    modelUsed: "Gemini 3.5 Flash",
    playableType: "html5_canvas",
    sourceCode: generateOfflineAIGame({
      title: "Danmaku Core: Bullet Horizon",
      genre: "danmaku",
      artStyle: "neon_cyberpunk",
      prompt: "Bullet hell danmaku pattern generator",
    }).code,
    installed: true,
  },
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
