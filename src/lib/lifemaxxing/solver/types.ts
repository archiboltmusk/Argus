/**
 * ARGUS UNIVERSAL PROBLEM SOLVER (UPS) & 20-SECTOR AUDIT
 *
 * "The ultimate standard for ARGUS isn't 'Can it answer anything?'
 *  It's: 'Whatever problem a person brings, can ARGUS understand it, identify the next useful move,
 *  mobilize the right resources, and honestly verify whether it helped?'"
 *
 * 5 Foundational Systems:
 * 1. Human Context Graph (Circumstances, goals, limitations, permissions)
 * 2. Universal Problem Solver (Decompose, identify binding constraints, generate feasible solutions)
 * 3. Global Knowledge & Resource Graph (Verified tools, public schemes, programs)
 * 4. Action & Collaboration Network (Execute authorized tasks, bridge mentors/institutions)
 * 5. Verification & Learning Engine (Falsifiable test, measure real-world impact)
 *
 * 4 Levels of Capability:
 * L1: Understand (Identify goal and missing info)
 * L2: Guide (Recommend credible options & trade-offs)
 * L3: Execute (Permitted workflows & coordinator tasks)
 * L4: Verify (Confirm real-world result & adapt)
 */

export type SectorStatus = "designed" | "partial" | "gap";

export type SectorAuditItem = {
  id: string;
  name: string;
  status: SectorStatus;
  statusLabel: string;
  currentCapabilities: string;
  roadmapGap: string;
};

export type CapabilityLevel = "understand" | "guide" | "execute" | "verify";

export type UniversalProblemRecord = {
  id: string;
  title: string;
  personaContext: string;
  desiredOutcome: string;
  knownFacts: string[];
  bindingConstraints: string[];
  urgency: "low" | "medium" | "high" | "critical";
  riskLevel: "low" | "moderate" | "high";
  missingInformation: string[];
  recommendedIntervention: {
    level: CapabilityLevel;
    actionTitle: string;
    actionDetails: string;
    mobilizedResources: string[];
    limitsRecognized: string; // What ARGUS CANNOT do alone (e.g. Needs physical exam, money, court decree)
  };
  successCriteria: {
    falsifiableProof: string;
    reviewIntervalDays: number;
  };
};
