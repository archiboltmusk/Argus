import type {
  ComputeTierSpec,
  OneMillionUsersEconomics,
  IntelligenceAssetTriad,
} from "./types";

export const FIVE_TIER_COMPUTE_PYRAMID: ComputeTierSpec[] = [
  {
    tier: 0,
    label: "Tier 0",
    categoryName: "Normal Software & Deterministic Code",
    computeBurden: "lowest",
    costPerMillionTokensUsd: 0.0,
    typicalLatencyMs: 2,
    primaryUseCases: ["Timers", "Deadlines", "Spaced intervals", "Calendar arithmetic", "Unit conversions"],
    sampleTechnologies: ["Wasm", "TypeScript", "Deterministic cron schedules", "State machines"],
  },
  {
    tier: 1,
    label: "Tier 1",
    categoryName: "Reusable Knowledge & Solution Graph",
    computeBurden: "very_low",
    costPerMillionTokensUsd: 0.05,
    typicalLatencyMs: 15,
    primaryUseCases: ["Validated science explanations", "Worked math examples", "Discharge templates", "Civic scheme checklists"],
    sampleTechnologies: ["Indexed Vector Graph", "Redis / SQLite edge cache", "Verified Lesson Library"],
  },
  {
    tier: 2,
    label: "Tier 2",
    categoryName: "Local On-Device AI",
    computeBurden: "device_dependent",
    costPerMillionTokensUsd: 0.0, // 0 server cost
    typicalLatencyMs: 35,
    primaryUseCases: ["Private habit journaling", "Daily mood logging", "Intent classification", "Offline summarization"],
    sampleTechnologies: ["Qwen 0.8B / 2B WebLLM", "ExecuTorch", "Apple Neural Engine / ONNX"],
  },
  {
    tier: 3,
    label: "Tier 3",
    categoryName: "Affordable Cloud AI (Small Server Models)",
    computeBurden: "metered",
    costPerMillionTokensUsd: 0.25,
    typicalLatencyMs: 180,
    primaryUseCases: ["Socratic tutoring", "Multi-lingual translation", "Weekly study pacing", "Routine guidance"],
    sampleTechnologies: ["Qwen 9B", "Gemini Flash-Lite", "vLLM with continuous batching & prefix caching"],
  },
  {
    tier: 4,
    label: "Tier 4",
    categoryName: "Advanced Frontier Reasoning Models",
    computeBurden: "highest",
    costPerMillionTokensUsd: 15.0,
    typicalLatencyMs: 950,
    primaryUseCases: ["Complex multi-variable career trade-offs", "Novel scientific critique", "High-stakes strategic planning"],
    sampleTechnologies: ["Frontier deep reasoning engines", "Multi-step tool orchestration"],
  },
];

export const ONE_MILLION_USERS_SIMULATION: OneMillionUsersEconomics = {
  activeUsers: 1000000,
  dailyRequestsPerUser: 5,
  totalDailyRequests: 5000000,
  percentRoutedToInexpensive: 90,
  costPerInexpensiveRequestUsd: 0.00015,
  costPerAdvancedRequestUsd: 0.008,
  allAdvancedMonthlyCostUsd: 1200000, // 5M * 30 * $0.008 = $1,200,000 / month
  argusRoutedMonthlyCostUsd: 140250, // 4.5M * 30 * $0.00015 + 0.5M * 30 * $0.008 = $20,250 + $120,000 = $140,250
  modeledInferenceReductionPercent: 88.3,
  annualCapitalSavedUsd: 12717000, // $12.7 Million per year saved
};

export const INTELLIGENCE_ASSETS: IntelligenceAssetTriad = {
  globalKnowledgeGraph: {
    description: "Verified facts, scientific literature, clinical guidelines, and civic eligibility rules. Updated when evidence changes, open to everyone.",
    privacyLevel: "public_open_access",
    updateCadence: "continuous_verified_ingestion",
    examples: ["PubMed medical reviews", "NCERT curriculum standards", "Ayushman Bharat PM-JAY hospital lists", "RBI Fair Lending regulations"],
  },
  reusableSolutionGraph: {
    description: "Reusable, tested methods for solving recurring life & learning problems. Developed once, verified with proof, reused 100,000x.",
    privacyLevel: "public_open_access",
    updateCadence: "accumulated_peer_reviewed_assets",
    examples: [
      "Metabolic alkalosis visual mechanism asset (saved 18,450 LLM calls)",
      "Cardboard truss bridge engineering experiment",
      "Village market fraction division pebble drill",
      "Standard clinical discharge summary macro",
    ],
  },
  personalLearningGraph: {
    description: "Private information about what an individual knows, needs, prefers, and has already tried. Never commercialized or sold.",
    privacyLevel: "strict_on_device_user_encrypted",
    updateCadence: "continuous_user_consented",
    examples: ["Personal mock test error logs", "Circadian HRV baseline", "Active medications", "Private journal notes"],
  },
};
