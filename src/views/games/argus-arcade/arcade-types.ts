export type ArcadeGameId = "kafila" | "autodrift" | "nighter" | "chaiwala" | "carrom";

export interface ArcadeGameInfo {
  id: ArcadeGameId;
  title: string;
  subtitle: string;
  description: string;
  tags: string[];
  gradient: string;
  accentColor: string;
  icon: string;
  gamepadHints: { action: string; key: string }[];
}

export const ARCADE_GAMES: ArcadeGameInfo[] = [
  {
    id: "kafila",
    title: "Kafila Surge",
    subtitle: "Chalo Jantar Mantar",
    description: "Flock dynamic crowds, smash police barricades with mass momentum, dodge water cannons, and hold the central sanctuary.",
    tags: ["Crowd Flocking", "Action Strategy", "Satire"],
    gradient: "from-orange-600 to-amber-700",
    accentColor: "#ea580c",
    icon: "Users",
    gamepadHints: [
      { action: "Move / Sprint", key: "Left Stick / D-Pad" },
      { action: "Mega Chant", key: "A / Cross" },
      { action: "Crowd Surge", key: "RT / Right Trigger" },
    ],
  },
  {
    id: "autodrift",
    title: "Auto Drift",
    subtitle: "Peak Hour Grand Prix",
    description: "Top-down retro drift racing with an auto-rickshaw! Slide around tight corners, dodge traffic and potholes, and collect fare multipliers.",
    tags: ["Arcade Racing", "Drift Physics", "Multipliers"],
    gradient: "from-yellow-500 to-emerald-600",
    accentColor: "#eab308",
    icon: "Car",
    gamepadHints: [
      { action: "Steer", key: "Left Stick" },
      { action: "Accelerate", key: "RT / R2" },
      { action: "Handbrake Drift", key: "LT / L2 or B" },
      { action: "Horn / Scatter", key: "A / Cross" },
    ],
  },
  {
    id: "nighter",
    title: "Night ER: Resident Survival",
    subtitle: "Survive the 36-Hour Call",
    description: "Twin-stick horde survival! Upgrade coffee intake, deploy automated defibrillators, wield cautery arcs, and survive endless shifts of consults.",
    tags: ["Twin-Stick Roguelike", "Horde Defense", "Medical Satire"],
    gradient: "from-cyan-600 to-blue-800",
    accentColor: "#06b6d4",
    icon: "Activity",
    gamepadHints: [
      { action: "Move", key: "Left Stick" },
      { action: "Aim & Shoot", key: "Right Stick / RT" },
      { action: "Adrenaline Dash", key: "LB / L1" },
    ],
  },
  {
    id: "chaiwala",
    title: "Chai Wala Rush",
    subtitle: "Platform 1 Express",
    description: "High-speed platform tea stall management! Brew cutting chai, toast bun maska, and toss kulhads to passengers before the train departs.",
    tags: ["Time Management", "Reflex Arcade", "Culinary"],
    gradient: "from-amber-600 to-red-700",
    accentColor: "#d97706",
    icon: "Coffee",
    gamepadHints: [
      { action: "Move Counter", key: "Left Stick" },
      { action: "Pour & Toss", key: "A / Cross" },
      { action: "Crush Ginger", key: "X / Square" },
      { action: "Speed Boil", key: "RT / R2" },
    ],
  },
  {
    id: "carrom",
    title: "Carrom Masters Pro",
    subtitle: "Classic Wooden Board Physics",
    description: "Authentic 2D rigid-body carrom physics board game. Pocket carrom men, control strike power and angles, and master the Queen cover.",
    tags: ["Physics Board Game", "Single & Couch 2P", "Precision"],
    gradient: "from-amber-800 to-stone-900",
    accentColor: "#b45309",
    icon: "Disc",
    gamepadHints: [
      { action: "Position Striker", key: "Left Stick" },
      { action: "Aim Direction", key: "Right Stick" },
      { action: "Hold & Release Power", key: "A / RT" },
    ],
  },
];
