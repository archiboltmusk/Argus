/**
 * Argus Arcade Universal Meta-Progression & Workshop
 * Tracks arcade credits and unlocks persistent upgrades across all native games.
 */

export interface MetaUpgrade {
  id: string;
  name: string;
  description: string;
  cost: number;
  icon: string;
  level: number;
  maxLevel: number;
  effectLabel: string;
}

export interface ArcadeMetaState {
  credits: number;
  totalEarned: number;
  upgrades: Record<string, number>; // upgradeId -> level
  crtFilterEnabled: boolean;
  hapticsEnabled: boolean;
}

const STORAGE_KEY = "argus_arcade_meta_progression_v1";

const DEFAULT_UPGRADES: MetaUpgrade[] = [
  {
    id: "kinetic_shield",
    name: "Kinetic Deflector Shield",
    description: "Absorb lethal barricade or vehicle impacts before losing your run.",
    cost: 500,
    icon: "Shield",
    level: 0,
    maxLevel: 3,
    effectLabel: "+1 Emergency Impact Shield",
  },
  {
    id: "overdrive_nitro",
    name: "Twin-Cam Nitro Overdrive",
    description: "Increases top velocity and cuts dash/horn cooldowns across all vehicles & runners.",
    cost: 400,
    icon: "Zap",
    level: 0,
    maxLevel: 3,
    effectLabel: "+12% Speed & Cooldown Haste",
  },
  {
    id: "fare_magnet",
    name: "Magnetic Coin Collector",
    description: "Draw nearby fares, tea kulhads, and score powerups directly into your range.",
    cost: 350,
    icon: "Compass",
    level: 0,
    maxLevel: 3,
    effectLabel: "+40px Pickup Radius",
  },
  {
    id: "crt_phosphor",
    name: "1994 Phosphor CRT Glass",
    description: "Unlocks real-time retro arcade scanlines, phosphor glow, and screen curvature.",
    cost: 200,
    icon: "Tv",
    level: 0,
    maxLevel: 1,
    effectLabel: "Visual Arcade CRT Filter",
  },
];

export function getMetaState(): ArcadeMetaState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return {
        credits: 850, // Starter bonus credits
        totalEarned: 850,
        upgrades: {},
        crtFilterEnabled: false,
        hapticsEnabled: true,
      };
    }
    return JSON.parse(raw);
  } catch {
    return {
      credits: 850,
      totalEarned: 850,
      upgrades: {},
      crtFilterEnabled: false,
      hapticsEnabled: true,
    };
  }
}

export function saveMetaState(state: ArcadeMetaState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {}
}

export function earnArcadeCredits(amount: number): number {
  const state = getMetaState();
  state.credits += Math.max(0, amount);
  state.totalEarned += Math.max(0, amount);
  saveMetaState(state);
  return state.credits;
}

export function buyUpgrade(upgradeId: string): boolean {
  const state = getMetaState();
  const upDef = DEFAULT_UPGRADES.find((u) => u.id === upgradeId);
  if (!upDef) return false;

  const currentLevel = state.upgrades[upgradeId] || 0;
  if (currentLevel >= upDef.maxLevel) return false;

  const cost = upDef.cost * (currentLevel + 1);
  if (state.credits < cost) return false;

  state.credits -= cost;
  state.upgrades[upgradeId] = currentLevel + 1;
  saveMetaState(state);
  return true;
}

export function getAvailableUpgrades(): MetaUpgrade[] {
  const state = getMetaState();
  return DEFAULT_UPGRADES.map((u) => ({
    ...u,
    level: state.upgrades[u.id] || 0,
  }));
}

export function toggleCrtFilter(): boolean {
  const state = getMetaState();
  state.crtFilterEnabled = !state.crtFilterEnabled;
  saveMetaState(state);
  return state.crtFilterEnabled;
}
