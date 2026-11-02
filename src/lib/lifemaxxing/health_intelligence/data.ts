import type {
  FatigueClinicalPersona,
  HealthActionStep,
} from "./types";

export const THREE_FATIGUE_PERSONAS: FatigueClinicalPersona[] = [
  {
    id: "student_exam_fatigue",
    patientTitle: "Student (Age 18) · Exam Cramming",
    age: 18,
    chiefComplaint: "I'm tired all the time and having trouble focusing on books.",
    contextSummary: "Sleeping 4.5–5 hours per night for the last 3 weeks preparing for high-stakes entrance exams. High caffeine intake (4 coffees/day). No known chronic illness.",
    healthGraph: {
      age: 18,
      gender: "male",
      chronicConditions: ["None"],
      currentMedications: [],
      knownAllergies: ["None"],
      recentLabBiomarkers: [
        { testName: "Hemoglobin", value: "14.2 g/dL", normalRange: "13.0 - 17.0", isAbnormal: false, date: "6 months ago" },
      ],
    },
    redFlagsDetected: [],
    triageVerdict: "self_care_lifestyle",
    argusResponse: {
      headline: "Acute Circadian Sleep Debt & Caffeine Rebound",
      evidenceRationale: "Sleep restriction below 6 hours severely limits slow-wave sleep and prefrontal alertness. Excessive caffeine after 2 PM fragments REM architecture, inducing day-long brain fog.",
      nextUsefulAction: "Enforce a non-negotiable 7.5-hour sleep window for 5 nights. Shift caffeine cutoff to 13:00. Replace late-night cramming with 45m morning active recall.",
      questionsForDoctor: [
        "If fatigue persists after 7 days of 8-hour sleep, request routine Ferritin and Vitamin D check.",
      ],
      affordableCareGuidance: "Lifestyle protocol requires zero medication or paid tools. Sleep is free.",
    },
  },
  {
    id: "doctor_shift_fatigue",
    patientTitle: "Doctor (Age 29) · Shift Work Disruption",
    age: 29,
    chiefComplaint: "I'm tired all the time, feeling sluggish during ward rounds.",
    contextSummary: "Rotates through three 24-hour hospital on-call duties per week. Erratic daylight exposure and fragmented post-call recovery sleep.",
    healthGraph: {
      age: 29,
      gender: "female",
      chronicConditions: ["Shift Work Sleep Disorder"],
      currentMedications: [],
      knownAllergies: ["Penicillin"],
      recentLabBiomarkers: [
        { testName: "Serum TSH", value: "2.1 mIU/L", normalRange: "0.4 - 4.0", isAbnormal: false, date: "3 months ago" },
      ],
    },
    redFlagsDetected: [],
    triageVerdict: "workplace_schedule_recovery",
    argusResponse: {
      headline: "Circadian Phase Inversion & Post-Call Depletion",
      evidenceRationale: "Frequent 24-hour duty spikes cortisol while depleting melatonin rhythm. Chronic social jetlag impairs cognitive reaction time by ~25%.",
      nextUsefulAction: "Dark-room blackout curtains + eye mask for post-duty 4-hour core anchor sleep. Zero marathon INI-CET study blocks on post-duty recovery days.",
      questionsForDoctor: [
        "Consider discussing shift rotation frequency with clinical residency supervisor if micro-sleep incidents occur during driving.",
      ],
      affordableCareGuidance: "Prioritize physiological recovery over secondary goals; avoid polypharmacy or unproven stimulant stacks.",
    },
  },
  {
    id: "elder_diabetic_fatigue",
    patientTitle: "Adult (Age 55) · Type 2 Diabetes & Polypharmacy",
    age: 55,
    chiefComplaint: "I'm tired all the time, feeling weak in the legs even after 8 hours of sleep.",
    contextSummary: "Known Type 2 Diabetes (6 years), Hypertension. Taking Metformin and Amlodipine. Reports unexplained 4 kg weight loss over 2 months.",
    healthGraph: {
      abhaId: "91-4821-9920-1123 (ABHA Linked)",
      age: 55,
      gender: "female",
      chronicConditions: ["Type 2 Diabetes Mellitus", "Essential Hypertension"],
      currentMedications: [
        { name: "Metformin", dosage: "1000 mg", frequency: "Twice daily", purpose: "Glycemic control" },
        { name: "Amlodipine", dosage: "5 mg", frequency: "Once daily", purpose: "Blood pressure regulation" },
      ],
      knownAllergies: ["Sulfa drugs"],
      recentLabBiomarkers: [
        { testName: "HbA1c", value: "9.2%", normalRange: "< 6.5%", isAbnormal: true, date: "1 week ago" },
        { testName: "Serum Creatinine", value: "1.4 mg/dL", normalRange: "0.6 - 1.1", isAbnormal: true, date: "1 week ago" },
      ],
    },
    redFlagsDetected: ["unexplained_weight_loss"],
    triageVerdict: "mandatory_clinical_evaluation",
    argusResponse: {
      headline: "Clinical Red-Flag Warning: Mandatory Physician Evaluation Required",
      evidenceRationale: "HbA1c is markedly elevated (9.2%) with elevated creatinine and unexplained weight loss. This is NOT simple lifestyle tiredness—it may indicate uncontrolled hyperglycemia, diabetic nephropathy, or Metformin-induced B12 deficiency.",
      nextUsefulAction: "Schedule an in-person appointment with your physician/endocrinologist within 48 hours. Bring current medication strips and recent lab prints.",
      questionsForDoctor: [
        "Could my uncontrolled HbA1c (9.2%) or medication dosing be causing this weakness?",
        "Should we screen for Vitamin B12 deficiency associated with long-term Metformin?",
        "Do we need an updated urine albumin-to-creatinine ratio (ACR) to evaluate kidney function?",
      ],
      affordableCareGuidance: "Check free OPD consultations at nearest District Hospital under Ayushman Bharat (PM-JAY) or CGHS wellness centers.",
    },
  },
];

export const HEALTH_ACTION_ENGINE_STEPS: HealthActionStep[] = [
  {
    stepNumber: "01",
    stageName: "Understand",
    description: "Connect reported symptoms with personal health graph, medications, and chronic history. Never treat numbers in isolation.",
    actionableCheck: "Verified ABHA records, active medications, and symptom duration.",
  },
  {
    stepNumber: "02",
    stageName: "Check Safety",
    description: "Identify potential emergencies and red flags (chest pain, weight loss, neurological deficits) before offering general advice.",
    actionableCheck: "Zero self-care advice offered if clinical red flags exist.",
  },
  {
    stepNumber: "03",
    stageName: "Personalize",
    description: "Match current guidelines (WHO, ICMR, ADA, AHA) to age, comorbidities, and specific lifestyle constraints.",
    actionableCheck: "Guidance differentiated between student, shift worker, and diabetic adult.",
  },
  {
    stepNumber: "04",
    stageName: "Make Action Feasible",
    description: "Factor in financial constraints, local healthcare affordability, language, and real-world care availability.",
    actionableCheck: "Indexes public schemes (Ayushman Bharat PM-JAY, Jan Aushadhi generic medicines).",
  },
  {
    stepNumber: "05",
    stageName: "Follow Through",
    description: "Provide structured questions to ask the doctor during appointments, appointment reminders, and symptom logs.",
    actionableCheck: "Generates 3 doctor-ready clinical questions for the physician visit.",
  },
  {
    stepNumber: "06",
    stageName: "Verify",
    description: "Track user-reported outcomes over 7–14 days. Recognize when symptoms do not improve and escalate care appropriately.",
    actionableCheck: "Mandatory check-in prompt: 'Did fatigue improve after 5 days?'.",
  },
];
