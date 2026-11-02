/**
 * ARGUS HEALTH: Personal Healthcare Intelligence
 * "Your health. In context."
 *
 * Grounded in:
 * Understand → Check Safety → Personalize → Make Action Feasible → Follow Through → Verify
 *
 * 7 Engines Architecture:
 * 1. Personal Health Graph (Conditions, medications, allergies, labs, ABHA / Ayushman Bharat link)
 * 2. Health State Engine (Symptom trends, HRV, sleep, recovery without pretending to diagnose)
 * 3. Clinical Evidence Engine (PubMed, WHO, ICMR guidelines, evidence citations)
 * 4. Safety & Triage Engine (Red-flag triage, emergency dispatch, clinical care escalation)
 * 5. Prevention Engine (Age/gender risk-appropriate cancer/metabolic screening reminders)
 * 6. Care Navigation Engine (Affordable district hospitals, Ayushman PM-JAY, prescription decoder)
 * 7. Longitudinal Learning Engine (Track reported outcomes, avoid medical gaslighting)
 */

export type ClinicalRedFlag =
  | "unexplained_weight_loss"
  | "chest_pain_shortness_of_breath"
  | "melena_or_blood_in_stool"
  | "persistent_fever_over_2_weeks"
  | "new_neurological_deficit"
  | "hypoglycemia_confusion";

export type PersonalHealthGraph = {
  abhaId?: string; // Ayushman Bharat Health Account ID
  age: number;
  gender: "male" | "female" | "other";
  chronicConditions: string[];
  currentMedications: {
    name: string;
    dosage: string;
    frequency: string;
    purpose: string;
  }[];
  knownAllergies: string[];
  recentLabBiomarkers: {
    testName: string;
    value: string;
    normalRange: string;
    isAbnormal: boolean;
    date: string;
  }[];
};

export type FatigueClinicalPersona = {
  id: "student_exam_fatigue" | "doctor_shift_fatigue" | "elder_diabetic_fatigue";
  patientTitle: string;
  age: number;
  chiefComplaint: string; // "I'm tired all the time"
  contextSummary: string;
  healthGraph: PersonalHealthGraph;
  redFlagsDetected: ClinicalRedFlag[];
  triageVerdict: "self_care_lifestyle" | "workplace_schedule_recovery" | "mandatory_clinical_evaluation";
  argusResponse: {
    headline: string;
    evidenceRationale: string;
    nextUsefulAction: string;
    questionsForDoctor: string[];
    affordableCareGuidance: string;
  };
};

export type HealthActionStep = {
  stepNumber: string;
  stageName: "Understand" | "Check Safety" | "Personalize" | "Make Action Feasible" | "Follow Through" | "Verify";
  description: string;
  actionableCheck: string;
};
