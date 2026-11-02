/**
 * ARGUS NOW: An Intelligence That Understands Your Life
 *
 * "What does this person need right now—and what is preventing them from getting it?"
 *
 * 3 Primary Modes:
 * - ARGUS Care: When struggling, exhausted, lonely, or in crisis.
 * - ARGUS Clarity: When seeking perspective, ethical wisdom, or making difficult decisions.
 * - ARGUS Advance: When motivated, ready to learn, execute, create, or earn.
 *
 * 6 Foundation Engines behind ARGUS NOW:
 * 1. State Intelligence (Self-reported feelings + optical/wearable cues)
 * 2. Health Guardian (WHO clinical boundaries, urgent care routing)
 * 3. Life Context (Financial triage: survival vs instability vs stability)
 * 4. Wisdom Library (Gita, Stoicism, Buddhist, Bible, Quran, Secular Ethics)
 * 5. Opportunity & Civic Intelligence (Public schemes, rights, scholarships)
 * 6. Action Engine (Minimum Effective Intervention: Exactly ONE consent-based step)
 */

export type UserReportedEmotion =
  | "lost"
  | "anxious"
  | "exhausted"
  | "lonely"
  | "motivated"
  | "confused";

export type ArgusNowMode = "care" | "clarity" | "advance";

export type FinancialTier = "survival_insecurity" | "financial_instability" | "financial_stability";

export type WisdomTraditionId =
  | "bhagavad_gita"
  | "stoicism"
  | "buddhism"
  | "biblical"
  | "quranic"
  | "secular_rationalism";

export type WisdomPassage = {
  traditionId: WisdomTraditionId;
  traditionLabel: string;
  sourceText: string;
  originalQuote: string;
  secularTranslation: string;
  contemporaryAction: string;
};

export type ArgusNowIntervention = {
  mode: ArgusNowMode;
  safetyTriaged: boolean;
  headline: string;
  initialGuidance: string;
  singleUsefulStep: {
    actionTitle: string;
    details: string;
    estimatedMinutes: number;
    targetOutcome: "useful_action" | "clearer_understanding" | "appropriate_human_connection";
  };
  wisdomPerspective?: WisdomPassage;
  clinicalBoundaryWarning?: string;
  civicOrFinancialSupport?: {
    tier: FinancialTier;
    resourceName: string;
    actionableGuidance: string;
  };
};

export type CivicServiceGuide = {
  id: string;
  title: string;
  category: "welfare_access" | "employment_rights" | "healthcare_eligibility" | "debt_relief_tribunals";
  officialPortal: string;
  neutralExplanation: string;
  checklist: string[];
};
