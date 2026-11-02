/**
 * ARGUS EQUITY: Discover Talent. Remove Barriers. Unlock Opportunity.
 *
 * "The larger objective is not to tell a poor child what career to pursue.
 *  It is to ensure that by the time they choose a path, poverty and lack of exposure
 *  have not already made the choice for them."
 *
 * Core Tenets:
 * 1. The Opportunity Equalizer: Discover -> Explore -> Build Foundations -> Bridge Access -> Discover Paths
 * 2. Continuous Capability Discovery: Zero early career verdicts. Measure learning velocity & curiosity, not static IQ.
 * 3. Resource & Opportunity Network: Indexed public assets (DIKSHA, NCERT, SWAYAM, NSP) & low-cost offline modes.
 * 4. 3 Deployment Models: ARGUS Personal (low-cost Android / offline), ARGUS School (teacher cohort dashboard, no public ranks), ARGUS Community (vetted hubs/NGOs).
 * 5. Strict UNICEF Child Safeguards & Pilot Blueprint (e.g. Kolkata, West Bengal district pilot).
 */

export type EquityChildProfile = {
  id: string;
  name: string;
  age: number;
  grade: string; // e.g. "Class 6"
  region: string; // e.g. "Kolkata, West Bengal"
  primaryLanguage: "Bengali" | "Hindi" | "English" | "Tamil" | "Telugu";
  deviceAccess: "shared_family_phone" | "no_personal_device_school_only" | "low_cost_android" | "personal_phone";
  connectivity: "unreliable_2g_3g" | "offline_only" | "daily_intermittent" | "broadband";
  tutorSupport: boolean;
  interestsObserved: string[];
  learningGapsIdentified: string[];
  novelExperiencesLacking: string[];
  learningVelocityScore: number; // 0-100: How quickly child adapts after 1 hands-on visual demonstration
};

export type LowCostDiscoveryMission = {
  id: string;
  title: string;
  category: "logical_reasoning" | "scientific_curiosity" | "creativity" | "communication" | "practical_engineering" | "leadership_empathy";
  materialsRequired: string; // e.g. "2 plastic cups, seeds, garden soil" or "Pencil, paper ruler"
  whatItReveals: string;
  bengaliPrompt: string;
  englishPrompt: string;
  timeMinutes: number;
  offlineReady: boolean;
};

export type PublicResourceMatch = {
  portal: "DIKSHA" | "NCERT" | "SWAYAM" | "National Scholarship Portal (NSP)" | "Community Learning Hub";
  title: string;
  officialUrl: string;
  cost: "100% Free / Open Access";
  format: "Offline Downloadable PDF" | "Bilingual Interactive Video" | "Govt Merit Scholarship" | "Physical Lab Access";
  eligibilityFilter: string;
  description: string;
};

export type OpportunityPathwayStep = {
  stage: "foundation_fix" | "hands_on_experiment" | "community_hub_access" | "mentorship_bridge";
  actionTitle: string;
  localLanguageNote: string;
  resourceNeeded: string;
  successProof: string;
};

export type EquityPilotSpecs = {
  district: string;
  targetCohortSize: number;
  durationWeeks: number;
  safeguards: {
    unicefCompliance: boolean;
    zeroMonetizationGuarantee: boolean;
    guardianSupervisedMentorship: boolean;
    noPublicRankings: boolean;
  };
};
