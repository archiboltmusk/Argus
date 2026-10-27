export type PatientVitalSigns = {
  heartRateBpm: number;
  bloodPressureSystolic: number;
  bloodPressureDiastolic: number;
  respiratoryRate: number;
  spO2Percent: number;
  temperatureCelsius: number;
  glasgowComaScale: number;
};

export type ClinicalInvestigationType = "lab" | "imaging" | "bedside";

export type ClinicalInvestigation = {
  id: string;
  name: string;
  type: ClinicalInvestigationType;
  costPoints: number;
  turnaroundTimeSec: number;
  resultSummary: string;
  imageUrl?: string;
  highYieldLearningPoint: string;
};

export type ClinicalIntervention = {
  id: string;
  name: string;
  category: "medication" | "procedure" | "resuscitation" | "consultation";
  isCorrect: boolean;
  isFatal?: boolean;
  hemodynamicDelta?: Partial<PatientVitalSigns>;
  feedback: string;
  rationale: string;
};

export type ClinicalCaseSimulation = {
  id: string;
  title: string;
  difficulty: "Resident" | "Registrar" | "Consultant";
  department: "Emergency Department" | "Intensive Care Unit" | "Outpatient Clinic";
  patientDemographics: {
    age: number;
    gender: "Male" | "Female";
    chiefComplaint: string;
  };
  initialVitals: PatientVitalSigns;
  historyOfPresentIllness: string;
  physicalExaminationFindings: string[];
  examinerTrap: string;
  availableInvestigations: ClinicalInvestigation[];
  availableInterventions: ClinicalIntervention[];
  finalDiagnosis: string;
  clinicalPearls: string[];
};
