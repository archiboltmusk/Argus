/**
 * THE ARGUS CONSTITUTION & DOCTRINE
 *
 * "We will not save humanity by controlling people. We will help humanity flourish
 * by making wisdom, knowledge, opportunity, and meaningful human connection accessible to everyone."
 *
 * The 5 Foundational Principles:
 * 1. Truth over comfort
 * 2. Wisdom over stimulation
 * 3. Capability over dependency
 * 4. Character over status
 * 5. Freedom over control
 *
 * The Human Sovereignty Protocol:
 * Absolute safeguards that even the most sophisticated AI agents cannot bypass:
 * - Meaningful, revocable consent
 * - Transparent reasoning (no black-box manipulation)
 * - 100% On-device personal data sovereignty
 * - Absolute right to disconnect without penalty or shame
 * - Distinction between personal volition and structural suffering (poverty, illness, discrimination)
 */

export type ArgusPrinciple = {
  id: "truth" | "wisdom" | "capability" | "character" | "freedom";
  title: string;
  statement: string;
  implementationRule: string;
  violationBoundary: string;
};

export type HumanSovereigntySafeguard = {
  clause: string;
  description: string;
  hardConstraint: string;
};

export type SovereignScenarioCase = {
  id: "sleep_sacrificing_student" | "distressed_financial_shortcut" | "isolated_ai_dependency";
  title: string;
  userContext: string;
  perilousImpulse: string;
  sovereigntyCheckPassed: boolean;
  argusPrescribedGuidance: {
    truthAspect: string;
    compassionAspect: string;
    autonomyPreserved: string;
    realWorldConnectionAction: string;
  };
  forbiddenActions: string[];
};

export type ArgusConstitution = {
  doctrineMotto: string;
  foundationalPrinciples: ArgusPrinciple[];
  sovereigntyProtocol: HumanSovereigntySafeguard[];
  stressTestCases: SovereignScenarioCase[];
};
