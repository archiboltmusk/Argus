/**
 * ARGUS INTELLIGENCE ROUTER & COLLECTIVE INTELLIGENCE ARCHITECTURE
 * "Never spend intelligence where knowledge, computation, or a verified reusable solution will suffice."
 *
 * 6 Levels of Intelligence arranged by cost:
 * Level 0: Deterministic rules & conventional software (calculators, timetable sync, calendar, deadlines)
 * Level 1: Cached verified solutions (Reusable Solution Library - solved once, reused 10,000x)
 * Level 2: On-device models (Edge/Local LLM e.g. Qwen 0.8B/2B - private, zero cost, latency <50ms)
 * Level 3: Small server models (4B-9B e.g. Qwen 9B / Flash - personalized tutoring, intent classification)
 * Level 4: Large reasoning models (Pro/Advanced reasoning - complex diagnostic dilemmas, multi-variable strategy)
 * Level 5: Specialist tools & qualified human experts (Medical triage, legal aid, mental health escalation)
 */

export type IntelligenceLevel = 0 | 1 | 2 | 3 | 4 | 5;

export type RoutingTaskCategory =
  | "deadline_calculation"
  | "spaced_retrieval_schedule"
  | "recurring_concept_explanation"
  | "routine_intent_classification"
  | "personalized_study_adaptation"
  | "multi_goal_tradeoff_reasoning"
  | "medical_triage_escalation";

export type RoutingDecision = {
  level: IntelligenceLevel;
  tierLabel: string;
  technique: string;
  estimatedCostPerQueryUsd: number;
  latencyMs: number;
  targetEngine: string;
  reusableAssetMatched?: string;
  rationale: string;
};

export type VerifiedSolutionAsset = {
  id: string;
  topic: string;
  misconceptionAddressed: string;
  reusableDeliverable: string;
  usageCount: number; // e.g. 14,280 students served
  costSavedUsd: number; // accumulated compute saved vs repeating frontier LLM calls
  falsifiableMasteryProof: string;
};

export type InferenceDistributionSimulation = {
  dailyQueriesTotal: number;
  level0_rulesAndCache: { count: number; percent: number; costUsd: number };
  level1_verifiedSolutions: { count: number; percent: number; costUsd: number };
  level2_onDevice: { count: number; percent: number; costUsd: number };
  level3_smallServer: { count: number; percent: number; costUsd: number };
  level4_frontierReasoning: { count: number; percent: number; costUsd: number };
  level5_humanEscalation: { count: number; percent: number; costUsd: number };
  totalBlendedCostUsd: number;
  allFrontierCostUsd: number;
  savingsPercentage: number;
};
