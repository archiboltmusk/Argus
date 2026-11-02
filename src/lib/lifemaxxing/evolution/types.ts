/**
 * ARGUS: THE LIFE EVOLUTION ENGINE
 * "Make every moment matter."
 *
 * An adaptive intelligence that helps every person learn, create, connect,
 * recover, contribute, and become more capable throughout life.
 *
 * Core Tenets:
 * 1. Leisure is NOT Waste: A film develops imagination. A conversation deepens love. Rest restores judgment.
 *    The enemy is UNCONSCIOUS living—spending finite time in ways neither chosen nor valued.
 * 2. The Foundational Question: "Considering my current health, energy, obligations, opportunities,
 *    and goals, what is the most worthwhile thing I can do now?"
 * 3. 6 Types of Worthwhile Time: Learn, Build, Connect, Recover, Explore, Contribute.
 * 4. Intentional Living Engine: Conscious choice vs mindless loop (friction on regret, honor intentional play).
 * 5. Life Evolution Review: Progress against self-chosen goals, ZERO universal happiness/productivity scores.
 * 6. Contribution Intelligence: Volunteer skill matching (Human needs <-> Available skills <-> Verified opportunities).
 * 7. Anti-Compulsive Safeguards: No guilt, no false certainty, zero engineered dependence.
 */

export type WorthwhileTimeMode =
  | "learn"
  | "build"
  | "connect"
  | "recover"
  | "explore"
  | "contribute";

export type TimeAvailableSlot = "5min" | "30min" | "2hours";

export type LifeEvolutionProgress = {
  dimension: "Learning" | "Health" | "Relationships" | "Creation" | "Contribution";
  targetGoal: string;
  percentAccomplished: number;
  subtextEvidence: string;
};

export type IntentionalChoiceOption = {
  title: string;
  mode: WorthwhileTimeMode;
  deliberateChoice: boolean;
  actionDetails: string;
  rationale: string;
};

export type VolunteerContributionMatch = {
  id: string;
  needHeadline: string;
  organizationOrPeer: string;
  skillsUtilized: string[];
  hoursPerMonth: number;
  impactCreated: string;
};
