/**
 * ARGUS ECONOMICS & COST-AWARE INTELLIGENCE ROUTER
 *
 * "How do we deliver the greatest verified improvement in a human life
 *  per rupee of computing and operating cost?"
 *
 * Core Tenets:
 * 1. 280x Drop in Inference Costs (Stanford HAI 2025: $20/M tokens in 2022 -> $0.07 in 2024).
 * 2. 5-Tier Intelligence Pyramid (Tier 0 Normal software -> Tier 1 Reusable Solution Graph -> Tier 2 Local On-Device -> Tier 3 Small Cloud AI -> Tier 4 Frontier Reasoning).
 * 3. 1,000,000 Active Users Cost Simulation (5M daily requests: $1.2M/mo all-frontier down to $140,250/mo with ARGUS routing = 88.3% cost reduction).
 * 4. The 3 Intellectual Assets: Global Knowledge Graph, Solution Graph (shared), Personal Learning Graph (100% private & user-controlled).
 * 5. Funding Triad: Universal Free Layer, Institutional/Public Funding (schools, hospitals, charities), Optional Paid Enterprise tiers.
 */

export type ComputeTier = 0 | 1 | 2 | 3 | 4;

export type ComputeTierSpec = {
  tier: ComputeTier;
  label: string;
  categoryName: string;
  computeBurden: "lowest" | "very_low" | "device_dependent" | "metered" | "highest";
  costPerMillionTokensUsd: number;
  typicalLatencyMs: number;
  primaryUseCases: string[];
  sampleTechnologies: string[];
};

export type OneMillionUsersEconomics = {
  activeUsers: number; // 1,000,000
  dailyRequestsPerUser: number; // 5
  totalDailyRequests: number; // 5,000,000
  percentRoutedToInexpensive: number; // 90%
  costPerInexpensiveRequestUsd: number; // $0.00015
  costPerAdvancedRequestUsd: number; // $0.008
  allAdvancedMonthlyCostUsd: number; // $1,200,000
  argusRoutedMonthlyCostUsd: number; // $140,250
  modeledInferenceReductionPercent: number; // 88.3%
  annualCapitalSavedUsd: number; // ~$12.7 Million / year
};

export type IntelligenceAssetTriad = {
  globalKnowledgeGraph: {
    description: string;
    privacyLevel: "public_open_access";
    updateCadence: "continuous_verified_ingestion";
    examples: string[];
  };
  reusableSolutionGraph: {
    description: string;
    privacyLevel: "public_open_access";
    updateCadence: "accumulated_peer_reviewed_assets";
    examples: string[];
  };
  personalLearningGraph: {
    description: string;
    privacyLevel: "strict_on_device_user_encrypted";
    updateCadence: "continuous_user_consented";
    examples: string[];
  };
};
