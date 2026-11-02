import type {
  RoutingDecision,
  VerifiedSolutionAsset,
  InferenceDistributionSimulation,
} from "./types";

export const VERIFIED_SOLUTIONS_LIBRARY: VerifiedSolutionAsset[] = [
  {
    id: "sol-metabolic-alkalosis",
    topic: "Renal Physiology & Acid-Base Disorders",
    misconceptionAddressed: "Confusion between vomiting-induced hypochloremic alkalosis vs hyperaldosteronism volume status",
    reusableDeliverable: "Interactive 4-step urine chloride diagnostic algorithm + 15 untimed active-recall clinical vignettes",
    usageCount: 18450,
    costSavedUsd: 1476.0, // Reused rather than invoking high-cost reasoning models 18,450 times
    falsifiableMasteryProof: "92% accuracy on novel unseen board-style acid-base vignettes across 3-day spaced retest",
  },
  {
    id: "sol-fractions-visual",
    topic: "Middle School Mathematics (Bengali/Hindi/English)",
    misconceptionAddressed: "Abstract fraction multiplication conceptual block (thinking multiplying makes numbers larger)",
    reusableDeliverable: "Visual cardboard and grid area model showing 1/2 of 1/4 equals 1/8 using village market pebble metaphors",
    usageCount: 42100,
    costSavedUsd: 3368.0,
    falsifiableMasteryProof: "Child solves 5 physical division puzzles independently with zero tutor prompts",
  },
  {
    id: "sol-residency-discharge-macro",
    topic: "Clinical Productivity & Documentation",
    misconceptionAddressed: "Re-typing generic clinical discharge summaries manually for 3.5 hours every post-call morning",
    reusableDeliverable: "Deterministic structured offline template with standard lab normalization macros compliant with patient privacy",
    usageCount: 9600,
    costSavedUsd: 768.0,
    falsifiableMasteryProof: "Average discharge summary documentation time drops from 22 minutes to 4.5 minutes",
  },
];

export const INFERENCE_DISTRIBUTION_SIMULATION: InferenceDistributionSimulation = {
  dailyQueriesTotal: 10000,
  level0_rulesAndCache: { count: 4500, percent: 45, costUsd: 0.0 }, // Deterministic rules, calendars, time math
  level1_verifiedSolutions: { count: 2500, percent: 25, costUsd: 0.25 }, // Reusable tested asset library
  level2_onDevice: { count: 1200, percent: 12, costUsd: 0.0 }, // Local on-device Qwen 0.8B / 2B
  level3_smallServer: { count: 1300, percent: 13, costUsd: 2.6 }, // Small server model (Qwen 9B / Flash)
  level4_frontierReasoning: { count: 450, percent: 4.5, costUsd: 18.0 }, // Frontier reasoning (Pro)
  level5_humanEscalation: { count: 50, percent: 0.5, costUsd: 0.0 }, // Routed to verified helplines/specialists
  totalBlendedCostUsd: 20.85,
  allFrontierCostUsd: 400.0, // If all 10,000 queries were routed to an advanced reasoning LLM at $0.04/call
  savingsPercentage: 94.8, // 94.8% cost reduction without dropping answer accuracy
};

export function routeRequest(query: string): RoutingDecision {
  const q = query.toLowerCase();

  // Level 0: Deterministic calculations, timetables, calendar deadlines
  if (
    q.includes("deadline") ||
    q.includes("calculate") ||
    q.includes("hours left") ||
    q.includes("schedule time") ||
    q.includes("timer") ||
    q.includes("convert")
  ) {
    return {
      level: 0,
      tierLabel: "Level 0: Deterministic Rules & Conventional Code",
      technique: "Deterministic JS/Wasm rule engine (Zero LLM token consumption)",
      estimatedCostPerQueryUsd: 0.0,
      latencyMs: 2,
      targetEngine: "Local Mathematical & Calendar State Engine",
      rationale: "Deadlines, hours calculation, and timetable checks are mathematical facts. High-end LLMs hallucinate dates and waste money.",
    };
  }

  // Level 1: Verified Reusable Solution Library
  if (
    q.includes("metabolic alkalosis") ||
    q.includes("acid-base") ||
    q.includes("fraction") ||
    q.includes("discharge summary")
  ) {
    return {
      level: 1,
      tierLabel: "Level 1: Verified Reusable Solution Library",
      technique: "Indexed Solution Graph lookup (Cached verified deliverable)",
      estimatedCostPerQueryUsd: 0.0001,
      latencyMs: 15,
      targetEngine: "ARGUS Verified Solution Graph",
      reusableAssetMatched: "Verified Lesson Asset #sol-metabolic-alkalosis",
      rationale: "100,000 students struggle with this exact misconception. A validated explanation, worked examples, and retest questions already exist with proof of efficacy.",
    };
  }

  // Level 5: Acute Distress / Medical Emergency / Crisis
  if (
    q.includes("suicide") ||
    q.includes("kill myself") ||
    q.includes("overdose") ||
    q.includes("chest pain") ||
    q.includes("cannot breathe") ||
    q.includes("eviction violence")
  ) {
    return {
      level: 5,
      tierLabel: "Level 5: Clinical Safety Gate & Qualified Human Escalation",
      technique: "Immediate safety intercept to verified national emergency helplines",
      estimatedCostPerQueryUsd: 0.0,
      latencyMs: 5,
      targetEngine: "Tele-MANAS (14416) / National Emergency Services",
      rationale: "WHO & Constitutional Boundary: AI must never simulate clinical crisis intervention. Route directly to licensed human care immediately.",
    };
  }

  // Level 2: Routine local classification / brief summarization
  if (q.length < 50 && (q.includes("summarize") || q.includes("classify") || q.includes("feeling"))) {
    return {
      level: 2,
      tierLabel: "Level 2: On-Device Small Model (Edge AI)",
      technique: "Local quantized on-device inference (e.g. Qwen 0.8B/2B)",
      estimatedCostPerQueryUsd: 0.0,
      latencyMs: 40,
      targetEngine: "Local Device Neural Engine / Wasm",
      rationale: "Zero server cost, zero cloud latency, 100% on-device privacy for personal thoughts and habit journaling.",
    };
  }

  // Level 4: Frontier Multi-Variable Strategic Dilemmas
  if (
    q.includes("trade-off") ||
    q.includes("conflict between") ||
    q.includes("career pivot") ||
    q.includes("10 crore") ||
    q.includes("multi-variable")
  ) {
    return {
      level: 4,
      tierLabel: "Level 4: Frontier Deep Reasoning Model",
      technique: "Advanced reasoning chain with verification and opportunity cost calculus",
      estimatedCostPerQueryUsd: 0.035,
      latencyMs: 850,
      targetEngine: "Managed Frontier Reasoning Engine (Pluggable)",
      rationale: "Requires high-dimensional opportunity cost analysis across conflicting life goals, clinical duties, and equity investments.",
    };
  }

  // Default: Level 3 Small Server Model
  return {
    level: 3,
    tierLabel: "Level 3: Small Server Model (4B-9B)",
    technique: "Specialized compact server model (e.g. Qwen 9B / Flash)",
    estimatedCostPerQueryUsd: 0.0012,
    latencyMs: 180,
    targetEngine: "High-Throughput vLLM Server Fleet",
    rationale: "Delivers 95% of frontier quality for structured tutoring and daily planning at 1/30th the operational cost.",
  };
}
