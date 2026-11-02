/**
 * ARGUS — LifeMaxxing OS Core Types
 * Grounded in integrity, clarity, self-discipline, and genuine human vitality.
 */

export type LifeDimensionId = "mind" | "body" | "character" | "relationships" | "wealth" | "purpose";

export type LifeDimension = {
  id: LifeDimensionId;
  name: string;
  tagline: string;
  score: number; // 0 - 100
  metricLabel: string;
  metricValue: string;
  status: "optimal" | "balanced" | "needs_attention";
};

export type DailyPriorityMission = {
  id: string;
  dimension: LifeDimensionId;
  title: string;
  subtext: string;
  completed: boolean;
  estimatedMinutes: number;
};

export type EnergySlot = {
  timeWindow: string; // e.g. "08:00 - 11:30"
  phase: "peak_focus" | "social_execution" | "dip_recovery" | "reflective_winddown";
  label: string;
  energyLevel: number; // 0 - 100
};

export type SocraticPrompt = {
  id: string;
  question: string;
  context: string;
  category: "impulse_check" | "clarity" | "courage" | "gratitude";
};

export type DailyReflection = {
  date: string;
  completedMissionIds: string[];
  focusScore: number;
  recoveryScore: number;
  honestNote: string;
};
