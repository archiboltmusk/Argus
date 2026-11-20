export type GameMode = "journey" | "survival" | "police";

export type CitizenRole = "regular" | "orator" | "drummer" | "banner" | "medic";

export type EntityState = "walking" | "stunned" | "fleeing" | "chanting" | "down";

export interface Vector2D {
  x: number;
  y: number;
}

export interface Citizen {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  targetX: number;
  targetY: number;
  role: CitizenRole;
  state: EntityState;
  health: number;
  maxHealth: number;
  radius: number;
  color: string;
  isRecruited: boolean;
  stunTimer: number;
  animPhase: number;
  heading: number;
}

export type PoliceType = "patrol" | "riot" | "cannon_truck";

export interface PoliceOfficer {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  type: PoliceType;
  health: number;
  radius: number;
  attackCooldown: number;
  heading: number;
  hasLathi: boolean;
  state: "chasing" | "blocking" | "spraying" | "stunned";
  stunTimer: number;
}

export interface Barricade {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
  health: number;
  maxHealth: number;
  broken: boolean;
  angle: number;
}

export interface WaterParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
}

export interface ChantPulse {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  alpha: number;
  text?: string;
}

export interface SmokeCloud {
  x: number;
  y: number;
  radius: number;
  alpha: number;
  life: number;
}

export interface LandmarkZone {
  name: string;
  x: number;
  y: number;
  radius: number;
  holdTimeSeconds: number;
  currentHoldProgress: number;
}

export interface GameStats {
  score: number;
  crowdCount: number;
  maxCrowdCount: number;
  barricadesBust: number;
  chantsEmitted: number;
  copsStunned: number;
  timeSurvivedSec: number;
}
