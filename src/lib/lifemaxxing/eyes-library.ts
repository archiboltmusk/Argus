/**
 * ARGUS — 100 EYES OF ARGUS ARCHITECTURE
 * 10 Systems, 100 Capabilities, Situational Intervention Engine.
 */

export type EyeSystemId =
  | "mind"
  | "health"
  | "character"
  | "relationships"
  | "career"
  | "wealth"
  | "time"
  | "sovereignty"
  | "purpose"
  | "agent";

export type ArgusEye = {
  id: string;
  name: string;
  system: EyeSystemId;
  description: string;
  active: boolean;
};

export type EyeSystem = {
  id: EyeSystemId;
  name: string;
  tagline: string;
  iconName: string;
  eyes: ArgusEye[];
};

export type LifeIntervention = {
  id: string;
  patternNoticed: string; // "You've postponed your primary goal 3 times this week."
  evidence: string; // "90 minutes of unscheduled evening time detected."
  recommendation: string; // "One focused study session (60m), followed by a call home (30m)."
  expectedOutcome: string;
  status: "pending" | "accepted" | "dismissed" | "completed";
  actionSlots: Array<{ title: string; durationMin: number; scheduledTime?: string }>;
};

export type UserLifeContext = {
  optInGoals: string[];
  coreValues: string[];
  activeInterventions: LifeIntervention[];
  todayDecisionQuestion?: string;
};
