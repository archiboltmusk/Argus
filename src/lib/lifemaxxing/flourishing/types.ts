/**
 * ARGUS: The Human Flourishing Engine
 * "Unlock the extraordinary in everyone."
 *
 * An intelligence system dedicated to helping every human discover their potential,
 * overcome avoidable limitations, and build a life of freedom, capability, connection, and meaning.
 *
 * Core Tenets:
 * 1. Universal Bottleneck Resolver (12 Finite Obstacle Categories)
 * 2. 6 Distinct Interventions: Teach, Simplify, Automate, Connect, Redesign, Support/Escalate
 * 3. 6-Stage Resolution Loop (Outcome -> Constraint -> Options -> Safety/Feasibility -> Consent -> Measure & Adapt)
 * 4. Measure Freedom Gained, Not Engagement Captured (Time Reclaimed, Skills Demonstrated, Obstacles Resolved, Opportunities Explored)
 * 5. Freedom Preservation: Eliminate dependency on ARGUS.
 */

export type BottleneckCategory =
  | "knowledge"
  | "skill"
  | "time"
  | "money"
  | "access"
  | "direction"
  | "execution"
  | "health_energy"
  | "environment"
  | "confidence_exposure"
  | "relationships"
  | "systems";

export type InterventionType =
  | "teach"
  | "simplify"
  | "automate"
  | "connect"
  | "redesign"
  | "support_escalate";

export type BottleneckSpec = {
  category: BottleneckCategory;
  label: string;
  coreQuestion: string;
  engineAction: string;
  isStructuralOrExternal: boolean; // Distinction between internal discipline vs infrastructure/structural
  primaryIntervention: InterventionType;
};

export type BreakthroughJourney = {
  id: string;
  personaName: string;
  personaRole: string;
  goal: string;
  obstacleDescription: string;
  identifiedCategory: BottleneckCategory;
  bindingConstraint: string;
  isInfrastructureBarrier: boolean;
  interventionType: InterventionType;
  interventionTitle: string;
  smallestAction: string;
  safetyCheck: {
    isAppropriate: boolean;
    isAffordable: boolean;
    isPermitted: boolean;
    rationale: string;
  };
  freedomImpact: {
    hoursReclaimedPerWeek: number;
    skillGained: string;
    obstacleResolutionPercent: number;
  };
  falsifiableAdaptationTest: string;
};

export type ImpactDashboardMetrics = {
  weeklyTimeReclaimedHours: number;
  newSkillsDemonstratedCount: number;
  obstaclesResolvedCount: number;
  opportunitiesExploredCount: number;
  dependencyReductionScore: number; // 0-100: Higher score = user needs ARGUS LESS because they learned first-principles
};
