/**
 * ARGUS: UNIVERSAL HUMAN INTELLIGENCE ARCHITECTURE
 * 12 Universal Logical Engines, Dynamic Policy Gates, and Domain Packs.
 *
 * Grounded in:
 * Understand → Prioritize → Plan → Execute → Measure & Adapt
 */

export type UserAgeTier = "child" | "adolescent" | "adult" | "professional";

export type UniversalEngineId =
  | "identity"
  | "context"
  | "goal_decomposition"
  | "learning"
  | "decision"
  | "time_energy"
  | "guardian"
  | "execution"
  | "human_development"
  | "feedback"
  | "foresight"
  | "memory";

export type UniversalEngine = {
  id: UniversalEngineId;
  name: string;
  question: string;
  purpose: string;
  iconName: string;
};

export type BehavioralPattern =
  | "avoidance_loop"
  | "knowledge_gap"
  | "overcommitment"
  | "stagnation"
  | "opportunity_mismatch"
  | "recovery_deficit";

export type PolicyEvaluationRecord = {
  goalId: string;
  goalTitle: string;
  action: string;
  expectedBenefit: number; // 0.0 - 1.0
  urgency: number; // 0.0 - 1.0
  confidence: number; // 0.0 - 1.0
  timeMinutes: number;
  riskLevel: "negligible" | "low" | "moderate" | "high";
  requiresExplicitApproval: boolean;
  guardianPolicyPass: boolean;
  rationale: string;
};

export type UniversalPersonaId = "class6" | "neet_aspirant" | "bank_risk_analyst";

export type UniversalPersonaProfile = {
  id: UniversalPersonaId;
  name: string;
  age: number;
  ageTier: UserAgeTier;
  roleTitle: string;
  primaryGoal: string;
  currentBottleneck: string;
  observedPattern: BehavioralPattern;
  guardianPolicy: {
    ageAppropriateContent: boolean;
    zeroFinancialAdvice: boolean;
    unicefChildSafeguards: boolean;
    nistRiskControls: boolean;
    confidentialityIsolation: boolean;
  };
  activeDomainPack: string;
  recommendedActionRecord: PolicyEvaluationRecord;
  successMetric: string;
};
