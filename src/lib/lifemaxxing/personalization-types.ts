/**
 * ARGUS — Dynamic Personalization & Adaptive Life Operating System
 * Universal core capability platform with continuous identity/context memory.
 */

export type PersonaId = "student" | "doctor" | "working_parent" | "entrepreneur" | "retiree";

export type DomainState = "active" | "maintenance" | "dormant";

export type LifeDomainAllocation = {
  learning: number; // 0 - 100%
  health: number;
  relationships: number;
  career: number;
  purpose: number;
  finance: number;
};

export type UserPersonaProfile = {
  id: PersonaId;
  label: string;
  age: number;
  roleTitle: string;
  primaryAmbition: string;
  bottleneck: string;
  focusAllocations: LifeDomainAllocation;
  recommendedActiveModules: string[];
  todayRecommendation: {
    headline: string;
    action: string;
    reasoning: string;
  };
  domainStates: Record<string, DomainState>;
};

export type CandidateAction = {
  id: string;
  title: string;
  domain: keyof LifeDomainAllocation;
  goalImportance: number; // G: 1 - 10
  urgency: number; // U: 1 - 10
  relevance: number; // R: 1 - 10
  effort: number; // E: 1 - 10
  estimatedMinutes: number;
  isNonNegotiable?: boolean;
};

/**
 * Calculates priority score: P_i = (G_i * U_i * R_i) / E_i
 * If non-negotiable, receives priority weighting boost.
 */
export function calculatePriorityScore(action: CandidateAction): number {
  const effortFactor = Math.max(1, action.effort);
  const baseScore = (action.goalImportance * action.urgency * action.relevance) / effortFactor;
  return action.isNonNegotiable ? baseScore * 1.5 : baseScore;
}
