/**
 * ARGUS Capability & Discovery Engine
 * "From Lost Potential to Exceptional Capability"
 *
 * Built around 3 connected pillars:
 * 1. ARGUS Diagnose: Discover what is stopping someone from progressing.
 * 2. ARGUS Accelerate: Shortest effective learning & execution pathway (Evidence-based retrieval/spacing).
 * 3. ARGUS Discover: Capability Genome & Opportunity Graph (Commitment Path vs Exploration Path).
 */

export type DiagnosticBottleneckType =
  | "conceptual_gaps"
  | "poor_retention"
  | "slow_question_solving"
  | "inconsistent_execution"
  | "misreading_questions"
  | "cognitive_exhaustion";

export type DiagnosticHypothesis = {
  bottleneck: DiagnosticBottleneckType;
  title: string;
  confidenceScore: number; // 0-100%
  description: string;
  prescribedProtocol: string;
  stopDoingProtocol: string;
  proofOfImprovement: string;
  evidenceSignals: string[];
};

export type StudentExamBaseline = {
  currentRankEstimate: string; // e.g. "AIR 1,00,000"
  targetGoal: string; // e.g. "NEET-PG Top 5,000 / Clinical Residency"
  mockTestScores: {
    testName: string;
    score: number;
    total: number;
    accuracyPercent: number;
    avgTimePerQuestionSec: number;
    date: string;
  }[];
  primaryBottleneck: DiagnosticBottleneckType;
  dailyAvailableHours: number;
  exhaustionScore: number; // 0-100
};

export type CapabilityDomainId =
  | "analytical"
  | "creative"
  | "scientific"
  | "social"
  | "entrepreneurial"
  | "practical";

export type DiscoveryExperiment = {
  id: string;
  title: string;
  shortDescription: string;
  timeCommitmentMin: number;
  difficulty: "beginner" | "intermediate" | "advanced";
  signalsObserved: string[];
  deliverable: string;
  completed?: boolean;
};

export type CapabilityDomain = {
  id: CapabilityDomainId;
  label: string;
  tagline: string;
  score: number; // dynamic inferred 0-100
  confidence: number; // 0-100 evidence-based confidence
  keyStrengths: string[];
  experiments: DiscoveryExperiment[];
};

export type OpportunityTrack = {
  id: string;
  title: string;
  category: "biomedical_data" | "health_entrepreneurship" | "epidemiology" | "scientific_programming" | "policy_ethics";
  description: string;
  whyRelevant: string;
  requiredSkills: string[];
  entryPointExperiment: string;
  estimatedHoursPerWeek: number;
  parallelMode: "exploration_mode" | "post_exam_deep_dive";
};

export type LearningTwinState = {
  baseline: StudentExamBaseline;
  activeHypothesis: DiagnosticHypothesis;
  weeklyPlan: {
    day: number;
    phase: "targeted_concept" | "untimed_retrieval" | "socratic_self_explanation" | "delayed_retest" | "exploration";
    activity: string;
    resourceType: "existing_qbank" | "single_concept_note" | "mistake_reflection" | "discovery_sandbox";
    timeBudgetMin: number;
    metric: string;
  }[];
  capabilityMap: Record<CapabilityDomainId, CapabilityDomain>;
  opportunityTracks: OpportunityTrack[];
  // Distinguishing rank competition from real human competence
  relativeSuccessMetric: {
    label: string;
    currentValue: string;
    targetValue: string;
    warning: string;
  };
  absoluteSuccessMetric: {
    label: string;
    currentValue: string;
    targetValue: string;
    durability: string;
  };
};
