/**
 * ARGUS Accountability Engine v1.0
 * "Everyone Answers to Their Own Commitments"
 *
 * Core Principle:
 * "Your commitments matter. Your circumstances matter. Your honesty matters.
 *  And when you fall short, ARGUS helps you understand why and move forward—not feel smaller."
 *
 * Features:
 * 1. The 5-Step Universal Accountability Loop: Commit -> Plan -> Verify -> Diagnose -> Adapt
 * 2. Adaptive Persona Profiles: Student, Aspirant, Doctor, Analyst, Entrepreneur, Parent, Retiree
 * 3. The 4 Root Causes of Failure: Avoidance, Resource Deficit, Illness/Exhaustion, Conscious Priority Shift
 * 4. 5 Accountability Mechanisms: Personal, Peer, Mentor, Institutional, and AI Answerability
 * 5. Evidence-Backed Commitment Reliability Formula (excluding honest renegotiations, no streak punishment)
 * 6. 20 Realistic Test Scenarios across human circumstances
 */

export type VerificationType = 
  | "assessment_result"     // e.g. Independent quiz, code test passed
  | "tangible_deliverable"  // e.g. Document, report, code PR, customer invoice
  | "personal_reflection"   // e.g. Parent child time, retiree walking routine, mindfulness
  | "external_confirmation" // e.g. Mentor signoff, clinical supervisor review
  | "peer_acknowledgment";  // e.g. Study buddy dual check-in

export type CommitmentStatus = 
  | "active" 
  | "in_progress" 
  | "completed_verified" 
  | "completed_self_reported" 
  | "renegotiated_valid" 
  | "blocked_external" 
  | "missed_avoided" 
  | "paused_recovery";

export type FailureReason = 
  | "avoidance_friction"     // Feasible, but psychological resistance or distraction blocked starting
  | "resource_constraint"    // Genuinely lacked time, tools, quiet space, or guidance
  | "illness_exhaustion"     // Physical/mental health dipped; recovery was legitimately needed
  | "priority_evolution";    // Consciously chose a more urgent/meaningful life duty

export type PersonaType = 
  | "class6_student"
  | "neet_aspirant"
  | "medical_doctor"
  | "banking_analyst"
  | "early_entrepreneur"
  | "working_parent"
  | "elderly_retiree";

export interface EvidenceItem {
  id: string;
  type: VerificationType;
  description: string;
  timestamp: string;
  artifactRef?: string;
  verifiedBy?: string;
  verifiedScore?: string | number;
}

export interface ObstacleDiagnostic {
  category: FailureReason;
  rootCause: string;
  externalFactors: string[];
  systemicIntervention: string;
  psychologicalFrictionLevel: "low" | "medium" | "high";
  isDisciplineFailure: boolean; // Crucial guard: true ONLY if pure avoidance, NEVER for illness/resources
}

export interface Commitment {
  id: string;
  title: string;
  persona: PersonaType;
  domain: string;
  estimatedMinutes: number;
  scheduledWindow: string;
  verificationMethod: VerificationType;
  status: CommitmentStatus;
  renegotiatedBeforeDeadline?: boolean;
  renegotiationReason?: string;
  evidence?: EvidenceItem;
  obstacle?: ObstacleDiagnostic;
  adaptiveTomorrowRecommendation?: string;
  aiAccountabilityNotes?: string; // AI answerability note
}

export interface PersonaProfile {
  type: PersonaType;
  label: string;
  sampleCommitment: string;
  defaultVerification: VerificationType;
  verificationDescription: string;
  guardrails: string;
}

export const PERSONA_PROFILES: Record<PersonaType, PersonaProfile> = {
  class6_student: {
    type: "class6_student",
    label: "Class 6 Student",
    sampleCommitment: "Understand equivalent fractions and simplify 5 problem variations",
    defaultVerification: "assessment_result",
    verificationDescription: "Solve 3 novel, unfamiliar problems independently without hints",
    guardrails: "Strictly private; zero public leaderboards; warm, supportive gamification."
  },
  neet_aspirant: {
    type: "neet_aspirant",
    label: "NEET / JEE Aspirant",
    sampleCommitment: "Revise Thermodynamics formulas & solve 25 high-yield MCQs",
    defaultVerification: "assessment_result",
    verificationDescription: "Timed question accuracy (>80%) and 48-hour spaced retrieval check",
    guardrails: "Protect sleep; flag diminishing cognitive returns past 8 hours of study."
  },
  medical_doctor: {
    type: "medical_doctor",
    label: "Medical Resident / Doctor",
    sampleCommitment: "Review updated ESC Guidelines on Heart Failure management",
    defaultVerification: "tangible_deliverable",
    verificationDescription: "Clinical case application notes or CME certificate upload",
    guardrails: "Zero patient identifiable data; respect on-call clinical fatigue."
  },
  banking_analyst: {
    type: "banking_analyst",
    label: "Banking Risk Analyst",
    sampleCommitment: "Complete Basel III liquidity stress testing sensitivity audit",
    defaultVerification: "tangible_deliverable",
    verificationDescription: "Audit workbook submitted to supervisory drive with formula audit",
    guardrails: "Role-based verification without invasive keystroke or webcam monitoring."
  },
  early_entrepreneur: {
    type: "early_entrepreneur",
    label: "Early-Stage Founder",
    sampleCommitment: "Conduct 5 unscripted problem-discovery interviews with store owners",
    defaultVerification: "tangible_deliverable",
    verificationDescription: "Direct customer quotes, documented pain points, and recorded call logs",
    guardrails: "Focus on learning speed rather than vanity metrics or busywork."
  },
  working_parent: {
    type: "working_parent",
    label: "Working Parent",
    sampleCommitment: "Have 45 minutes of undistracted, device-free floor play with child",
    defaultVerification: "personal_reflection",
    verificationDescription: "Private voice note or evening gratitude reflection (no cameras/trackers)",
    guardrails: "Total sanctity of family privacy; zero judgment for parental exhaustion."
  },
  elderly_retiree: {
    type: "elderly_retiree",
    label: "Retiree / Senior Citizen",
    sampleCommitment: "Complete 30-minute morning joint mobility walk and 15 min gardening",
    defaultVerification: "personal_reflection",
    verificationDescription: "Self-reported check-in and energy reflection",
    guardrails: "Accommodate arthritis flair-ups; zero shame for required rest days."
  }
};

export const ACCOUNTABILITY_MECHANISMS = [
  {
    id: "personal",
    title: "1. Personal Sovereignty",
    description: "Daily commitments, progressive milestones, and honest private reflections.",
    safeguard: "Your personal data and failed experiments are 100% private. No public shame."
  },
  {
    id: "peer",
    title: "2. Trusted Peer Circles",
    description: "Optional 1-on-1 study buddy or workout partner with mutual opt-in visibility.",
    safeguard: "No vanity leaderboards or follower counts. Only binary completion visibility."
  },
  {
    id: "mentor",
    title: "3. Mentor & Guide Review",
    description: "Teachers, coaches, or doctors can verify specific learning or health outcomes.",
    safeguard: "Explicit cryptographic authorization for each deliverable shared."
  },
  {
    id: "institutional",
    title: "4. Institutional Trust",
    description: "Clear deliverables tracked within teams based on agreed agreements.",
    safeguard: "Strict ban on covert employee monitoring, keystroke logging, or webcam tracking."
  },
  {
    id: "ai_answerability",
    title: "5. ARGUS AI Answerability",
    description: "The AI is equally answerable to the human. Question its logic, dispute advice, or audit biases.",
    safeguard: "One-click 'Dispute Guidance' and full transparency into why ARGUS suggested any action."
  }
];

export const SCENARIOS_20: Commitment[] = [
  {
    id: "sc-1",
    title: "Solve 5 Algebra fraction word problems",
    persona: "class6_student",
    domain: "Education",
    estimatedMinutes: 30,
    scheduledWindow: "4:00 PM - 4:30 PM",
    verificationMethod: "assessment_result",
    status: "completed_verified",
    evidence: {
      id: "ev-1",
      type: "assessment_result",
      description: "Solved 5/5 fraction problems in offline workbook with 100% accuracy.",
      timestamp: "2026-11-02 16:25",
      verifiedScore: "5/5"
    },
    adaptiveTomorrowRecommendation: "Ready to advance to finding least common multiples (LCM)."
  },
  {
    id: "sc-2",
    title: "Organic Chemistry: 30 Aldehyde reaction mechanisms",
    persona: "neet_aspirant",
    domain: "Exam Prep",
    estimatedMinutes: 90,
    scheduledWindow: "7:00 PM - 8:30 PM",
    verificationMethod: "assessment_result",
    status: "missed_avoided",
    obstacle: {
      category: "avoidance_friction",
      rootCause: "Overwhelmed by mechanism complexity; scrolled social media for 40 minutes instead.",
      externalFactors: ["Phone notification pinged during transition", "Ambiguous starting problem"],
      systemicIntervention: "Break task into 1 single reaction (Cannizzaro) + put phone in another room.",
      psychologicalFrictionLevel: "high",
      isDisciplineFailure: true
    },
    adaptiveTomorrowRecommendation: "Start with just 1 worked example before opening problem sets."
  },
  {
    id: "sc-3",
    title: "Review ESC Guideline updates on HFpEF",
    persona: "medical_doctor",
    domain: "Medicine",
    estimatedMinutes: 45,
    scheduledWindow: "9:00 PM - 9:45 PM",
    verificationMethod: "tangible_deliverable",
    status: "paused_recovery",
    obstacle: {
      category: "illness_exhaustion",
      rootCause: "Emergency trauma code required 4 hours of unanticipated ICU triage; severe physical fatigue.",
      externalFactors: ["Unscheduled emergency shift", "Severe sleep deficit"],
      systemicIntervention: "ARGUS immediately pauses professional study quota. Protect 7.5 hours of uninterrupted sleep.",
      psychologicalFrictionLevel: "low",
      isDisciplineFailure: false
    },
    adaptiveTomorrowRecommendation: "Reschedule review to post-call afternoon rest period without penalty."
  },
  {
    id: "sc-4",
    title: "Finalize Counterparty Credit Risk Monte Carlo script",
    persona: "banking_analyst",
    domain: "Finance",
    estimatedMinutes: 120,
    scheduledWindow: "10:00 AM - 12:00 PM",
    verificationMethod: "tangible_deliverable",
    status: "blocked_external",
    obstacle: {
      category: "resource_constraint",
      rootCause: "Enterprise GPU cluster was down for maintenance; no local cluster compute access.",
      externalFactors: ["Internal IT server outage", "Data access ticket delayed"],
      systemicIntervention: "Switch to mock dataset unit testing and verify risk mathematical equations locally.",
      psychologicalFrictionLevel: "low",
      isDisciplineFailure: false
    },
    adaptiveTomorrowRecommendation: "Run batch simulation overnight once GPU cluster reopens."
  },
  {
    id: "sc-5",
    title: "Conduct 3 customer interviews with local kirana store owners",
    persona: "early_entrepreneur",
    domain: "Business",
    estimatedMinutes: 90,
    scheduledWindow: "2:00 PM - 3:30 PM",
    verificationMethod: "tangible_deliverable",
    status: "completed_verified",
    evidence: {
      id: "ev-5",
      type: "tangible_deliverable",
      description: "Documented interview notes & pain point pricing logs from 3 retailers.",
      timestamp: "2026-11-02 15:40",
      artifactRef: "kirana-interview-notes.md"
    },
    adaptiveTomorrowRecommendation: "Synthesize recurring inventory leakage complaint into a product feature hypothesis."
  },
  {
    id: "sc-6",
    title: "Spend 45 mins uninterrupted bedtime storytelling & drawing with child",
    persona: "working_parent",
    domain: "Family",
    estimatedMinutes: 45,
    scheduledWindow: "8:00 PM - 8:45 PM",
    verificationMethod: "personal_reflection",
    status: "completed_self_reported",
    evidence: {
      id: "ev-6",
      type: "personal_reflection",
      description: "Read 'Where the Wild Things Are' and sketched imaginary dragons together. Phone was in drawer.",
      timestamp: "2026-11-02 21:00"
    },
    adaptiveTomorrowRecommendation: "Maintain consistent evening boundary; notice child's elevated bedtime calmness."
  },
  {
    id: "sc-7",
    title: "Complete 30 min morning park walk + gentle knee rehabilitation stretches",
    persona: "elderly_retiree",
    domain: "Health",
    estimatedMinutes: 45,
    scheduledWindow: "6:30 AM - 7:15 AM",
    verificationMethod: "personal_reflection",
    status: "completed_self_reported",
    evidence: {
      id: "ev-7",
      type: "personal_reflection",
      description: "Walked 2,800 steps in morning sun with neighbor. Minimal knee stiffness reported.",
      timestamp: "2026-11-02 07:30"
    },
    adaptiveTomorrowRecommendation: "Hydrate adequately; maintain same gentle pace tomorrow."
  },
  {
    id: "sc-8",
    title: "Revise Cell Biology notes and diagrams",
    persona: "class6_student",
    domain: "Education",
    estimatedMinutes: 40,
    scheduledWindow: "5:00 PM - 5:40 PM",
    verificationMethod: "assessment_result",
    status: "renegotiated_valid",
    renegotiatedBeforeDeadline: true,
    renegotiationReason: "Elder sibling had a fever and student assisted mother in fetching medicine.",
    obstacle: {
      category: "priority_evolution",
      rootCause: "Consciously prioritized family caregiving over evening science study.",
      externalFactors: ["Family health emergency"],
      systemicIntervention: "Renegotiation validated 2 hours prior to scheduled window. Quota moved to Saturday morning.",
      psychologicalFrictionLevel: "low",
      isDisciplineFailure: false
    },
    adaptiveTomorrowRecommendation: "Review Cell Biology flashcards over breakfast for 15 minutes."
  },
  {
    id: "sc-9",
    title: "Electrodynamics: Solve 15 Irodov physics problems",
    persona: "neet_aspirant",
    domain: "Exam Prep",
    estimatedMinutes: 120,
    scheduledWindow: "3:00 PM - 5:00 PM",
    verificationMethod: "assessment_result",
    status: "blocked_external",
    obstacle: {
      category: "resource_constraint",
      rootCause: "Prerequisite vector calculus concepts (curl & divergence) were never mastered.",
      externalFactors: ["Curriculum gap in high school coaching syllabus"],
      systemicIntervention: "Bottleneck Resolver intervened: suspended problem set and redirected to 25-minute visual intuition video.",
      psychologicalFrictionLevel: "medium",
      isDisciplineFailure: false
    },
    adaptiveTomorrowRecommendation: "Consolidate Gauss's law flux proofs before attempting 3-star mechanics."
  },
  {
    id: "sc-10",
    title: "Review surgical pathology biopsies for post-op ward rounds",
    persona: "medical_doctor",
    domain: "Medicine",
    estimatedMinutes: 60,
    scheduledWindow: "6:00 AM - 7:00 AM",
    verificationMethod: "tangible_deliverable",
    status: "completed_verified",
    evidence: {
      id: "ev-10",
      type: "tangible_deliverable",
      description: "Signed off on 8 histopathology records in hospital EMR.",
      timestamp: "2026-11-02 06:55"
    },
    adaptiveTomorrowRecommendation: "Cross-reference Case 4 margin clearance with oncological board review."
  },
  {
    id: "sc-11",
    title: "Validate quarterly regulatory capital model against RBI guidelines",
    persona: "banking_analyst",
    domain: "Finance",
    estimatedMinutes: 90,
    scheduledWindow: "2:00 PM - 3:30 PM",
    verificationMethod: "tangible_deliverable",
    status: "completed_verified",
    evidence: {
      id: "ev-11",
      type: "tangible_deliverable",
      description: "Discrepancy delta report generated showing 0.04% variance within acceptable threshold.",
      timestamp: "2026-11-02 15:20"
    },
    adaptiveTomorrowRecommendation: "Package executive summary for Chief Risk Officer briefing."
  },
  {
    id: "sc-12",
    title: "Pitch 10 angel investors via warm LinkedIn introductions",
    persona: "early_entrepreneur",
    domain: "Business",
    estimatedMinutes: 60,
    scheduledWindow: "11:00 AM - 12:00 PM",
    verificationMethod: "tangible_deliverable",
    status: "missed_avoided",
    obstacle: {
      category: "avoidance_friction",
      rootCause: "Fear of rejection and impostor anxiety; spent 2 hours tweaking slide deck font colors instead.",
      externalFactors: ["Unresolved fear of critical feedback"],
      systemicIntervention: "Minimum Effective Intervention: Draft and send just 1 single informal pitch email to a supportive mentor.",
      psychologicalFrictionLevel: "high",
      isDisciplineFailure: true
    },
    adaptiveTomorrowRecommendation: "Commit to sending exactly ONE 3-sentence note before lunch."
  },
  {
    id: "sc-13",
    title: "Prepare healthy homemade lunchboxes for the school week",
    persona: "working_parent",
    domain: "Family",
    estimatedMinutes: 60,
    scheduledWindow: "4:00 PM - 5:00 PM",
    verificationMethod: "personal_reflection",
    status: "completed_self_reported",
    evidence: {
      id: "ev-13",
      type: "personal_reflection",
      description: "Batch prepped lentil rotis, roasted paneer, and cut fresh seasonal fruits.",
      timestamp: "2026-11-02 17:05"
    },
    adaptiveTomorrowRecommendation: "Freeze half of portions to preserve freshness through Thursday."
  },
  {
    id: "sc-14",
    title: "Attend community senior center book discussion on Rabindranath Tagore",
    persona: "elderly_retiree",
    domain: "Culture",
    estimatedMinutes: 90,
    scheduledWindow: "4:00 PM - 5:30 PM",
    verificationMethod: "personal_reflection",
    status: "completed_self_reported",
    evidence: {
      id: "ev-14",
      type: "personal_reflection",
      description: "Engaged in vibrant debate regarding 'Gora' with 6 local seniors.",
      timestamp: "2026-11-02 17:40"
    },
    adaptiveTomorrowRecommendation: "Note down favorite poem lines in personal journal."
  },
  {
    id: "sc-15",
    title: "Complete 20 minutes of beginner scratch coding tutorial",
    persona: "class6_student",
    domain: "Technology",
    estimatedMinutes: 20,
    scheduledWindow: "6:00 PM - 6:20 PM",
    verificationMethod: "tangible_deliverable",
    status: "blocked_external",
    obstacle: {
      category: "resource_constraint",
      rootCause: "Home power cut in rural subdivision; laptop battery depleted.",
      externalFactors: ["Grid electrical load-shedding"],
      systemicIntervention: "ARGUS pivoted to offline paper-and-pencil algorithmic maze challenge.",
      psychologicalFrictionLevel: "low",
      isDisciplineFailure: false
    },
    adaptiveTomorrowRecommendation: "Charge device during daytime solar hours."
  },
  {
    id: "sc-16",
    title: "Full length mock test: NEET Physics & Chemistry (180 mins)",
    persona: "neet_aspirant",
    domain: "Exam Prep",
    estimatedMinutes: 180,
    scheduledWindow: "9:00 AM - 12:00 PM",
    verificationMethod: "assessment_result",
    status: "completed_verified",
    evidence: {
      id: "ev-16",
      type: "assessment_result",
      description: "Scored 162/180 with 94% speed percentile; negative marking reduced by 40%.",
      timestamp: "2026-11-02 12:10",
      verifiedScore: "162/180"
    },
    adaptiveTomorrowRecommendation: "Analyze the 3 silly calculation errors in Magnetism."
  },
  {
    id: "sc-17",
    title: "Draft clinic audit on antibiotic prescription stewardship",
    persona: "medical_doctor",
    domain: "Medicine",
    estimatedMinutes: 60,
    scheduledWindow: "8:00 PM - 9:00 PM",
    verificationMethod: "tangible_deliverable",
    status: "renegotiated_valid",
    renegotiatedBeforeDeadline: true,
    renegotiationReason: "Unplanned consultation requested by senior department chair for difficult oncology case.",
    obstacle: {
      category: "priority_evolution",
      rootCause: "Clinical patient acuity took precedence over administrative documentation.",
      externalFactors: ["Critical oncology consult"],
      systemicIntervention: "Valid renegotiation. Shifted audit completion to Friday morning administrative block.",
      psychologicalFrictionLevel: "low",
      isDisciplineFailure: false
    },
    adaptiveTomorrowRecommendation: "Incorporate senior oncologist's feedback directly into audit parameters."
  },
  {
    id: "sc-18",
    title: "Audit fraud detection heuristic rules in production payment pipeline",
    persona: "banking_analyst",
    domain: "Finance",
    estimatedMinutes: 90,
    scheduledWindow: "4:00 PM - 5:30 PM",
    verificationMethod: "tangible_deliverable",
    status: "completed_verified",
    evidence: {
      id: "ev-18",
      type: "tangible_deliverable",
      description: "Flagged 2 obsolete fraud rules reducing false-positive checkout declines by 18%.",
      timestamp: "2026-11-02 17:25"
    },
    adaptiveTomorrowRecommendation: "Schedule staging deployment with security ops team."
  },
  {
    id: "sc-19",
    title: "Build landing page v1 for new B2B SaaS onboarding",
    persona: "early_entrepreneur",
    domain: "Business",
    estimatedMinutes: 120,
    scheduledWindow: "9:00 PM - 11:00 PM",
    verificationMethod: "tangible_deliverable",
    status: "completed_verified",
    evidence: {
      id: "ev-19",
      type: "tangible_deliverable",
      description: "Deployed clean Next.js landing page with working email waitlist webhook.",
      timestamp: "2026-11-02 23:05",
      artifactRef: "https://landing-preview.argus.internal"
    },
    adaptiveTomorrowRecommendation: "Install simple privacy-respecting analytics snippet."
  },
  {
    id: "sc-20",
    title: "Take prescribed blood pressure medication & record evening log",
    persona: "elderly_retiree",
    domain: "Health",
    estimatedMinutes: 10,
    scheduledWindow: "8:00 PM - 8:10 PM",
    verificationMethod: "personal_reflection",
    status: "completed_self_reported",
    evidence: {
      id: "ev-20",
      type: "personal_reflection",
      description: "BP recorded: 124/82 mmHg, resting pulse 68. Medication taken with warm water.",
      timestamp: "2026-11-02 20:15"
    },
    adaptiveTomorrowRecommendation: "Maintain consistent sodium intake; current readings are optimal."
  }
];

/**
 * Calculates Evidence-Backed Commitment Reliability
 * 
 * Formula:
 * Reliability = (Verified Completed Commitments) / (Eligible Commitments Due) * 100
 * 
 * Rules:
 * 1. Eligible Commitments = Total Commitments - Validly Renegotiated Before Deadline - Genuine Illness/Recovery Pauses
 * 2. Honest advance renegotiation is NOT a failure. It is a sign of mature executive function.
 * 3. Never penalizes sickness, caregiving emergencies, or IT outages.
 */
export function calculateCommitmentReliability(commitments: Commitment[]) {
  const total = commitments.length;
  
  // Excluded from denominator: legitimate renegotiations and protected recovery pauses
  const renegotiated = commitments.filter(c => c.renegotiatedBeforeDeadline).length;
  const illnessRecovery = commitments.filter(c => c.obstacle?.category === "illness_exhaustion").length;
  
  const eligibleDue = total - renegotiated - illnessRecovery;
  
  const verifiedCompleted = commitments.filter(c => c.status === "completed_verified").length;
  const selfReportedCompleted = commitments.filter(c => c.status === "completed_self_reported").length;
  const totalCompleted = verifiedCompleted + selfReportedCompleted;
  
  const avoidedFailures = commitments.filter(c => c.obstacle?.category === "avoidance_friction").length;
  const resourceBlocked = commitments.filter(c => c.obstacle?.category === "resource_constraint").length;
  
  const verifiedReliabilityPct = eligibleDue > 0 
    ? Math.round((verifiedCompleted / eligibleDue) * 100) 
    : 100;

  const totalReliabilityPct = eligibleDue > 0 
    ? Math.round((totalCompleted / eligibleDue) * 100) 
    : 100;

  return {
    total,
    eligibleDue,
    renegotiated,
    illnessRecovery,
    verifiedCompleted,
    selfReportedCompleted,
    avoidedFailures,
    resourceBlocked,
    verifiedReliabilityPct,
    totalReliabilityPct
  };
}
