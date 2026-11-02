/**
 * ARGUS KNOWLEDGE MESH: Connect the World's Knowledge to Every Human
 *
 * "The internet connected documents, websites, and databases.
 *  ARGUS connects information to understanding, understanding to capability,
 *  and capability to opportunity."
 *
 * 6 Fundamental Barriers Addressed:
 * 1. Fragmentation (Federated search and unified concept indexing)
 * 2. Incompatible Formats (Structured knowledge extraction & normalization)
 * 3. Quality (Source verification, evidence tracking & peer review)
 * 4. Access (Licensed integrations & open-access alternatives, offline cached)
 * 5. Personalization (Adaptive prerequisite routing & learning velocity)
 * 6. Application (Practice, feedback, tools & sovereign proof-of-work)
 *
 * 3 Separate Forms of Intelligence:
 * - Global Intelligence (What is known, where it lives, provenance, licensing)
 * - Personal Intelligence (Private, on-device, what learner knows/struggles with)
 * - Collective Learning Intelligence (Anonymized outcome evidence of what interventions work)
 */

export type KnowledgeLicenseType = "open_access_cc" | "public_domain" | "licensed_integration" | "restricted_fair_use";

export type KnowledgeConceptNode = {
  id: string;
  name: string;
  domain: string; // e.g. "Mathematics", "Artificial Intelligence", "Medicine"
  prerequisiteConceptIds: string[];
  difficultyLevel: 1 | 2 | 3 | 4 | 5;
  firstPrincipleExplanation: string;
  provenance: {
    sourceStandard: string; // e.g. "NCERT Class 6 Math", "MIT 6.0001", "UNESCO OER"
    evidenceRating: "A_grade_meta_analysis" | "official_curriculum_standard" | "peer_reviewed";
    license: KnowledgeLicenseType;
  };
  connectedResources: {
    title: string;
    format: "offline_downloadable_pdf" | "interactive_widget" | "video_lesson" | "practice_drill";
    language: "English" | "Bengali" | "Hindi";
    url: string;
    isFree: boolean;
  }[];
  falsifiableMasteryCheck: string;
};

export type MeshPersonalizedPathway = {
  learnerContext: {
    name: string;
    goal: string;
    deviceTier: "low_cost_phone" | "laptop";
    availableHoursDaily: number;
    languagePreference: string;
    diagnosedKnowledgeState: {
      mastered: string[];
      currentGaps: string[];
      unencountered: string[];
    };
  };
  orderedMilestones: {
    stepNumber: number;
    conceptId: string;
    conceptName: string;
    prerequisiteStatus: "prerequisites_cleared" | "needs_foundation_remediation";
    prescribedResource: string;
    estimatedMinutes: number;
    deliverableProof: string;
  }[];
};
