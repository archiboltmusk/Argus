/**
 * Argus CoreBTR 4-Tier Medical Taxonomy & Ontology Engine
 *
 * Tier 1: Phase (Pre-Clinical, Para-Clinical, Clinical-1, Clinical-2, Integrated)
 * Tier 2: Organ System (CVS, CNS, Respiratory, Renal, GI/HPB, Endocrine, Hema-Onc, MSK, Reproductive, Immune)
 * Tier 3: Subject & Subspecialty Module
 * Tier 4: Clinical Attributes (#ClinicalVignette, #ImageBased, #RecentUpdate, #ExaminerTrap, #HighYieldRepeat, #Controversial)
 */

import type { ClinicalQuestion } from "./qbank-types";

export type MedicalPhase =
  | "Pre-Clinical"
  | "Para-Clinical"
  | "Clinical-1"
  | "Clinical-2"
  | "Integrated";

export type OrganSystem =
  | "Cardiovascular"
  | "Central Nervous"
  | "Respiratory"
  | "Gastrointestinal & Hepato-Biliary"
  | "Renal & Electrolytes"
  | "Endocrine"
  | "Hematology & Oncology"
  | "Musculoskeletal"
  | "Reproductive & Gynecologic"
  | "Infectious & Immune"
  | "General & Multi-System";

export type ClinicalAttribute =
  | "ClinicalVignette"
  | "ImageBased"
  | "RecentUpdate"
  | "ExaminerTrap"
  | "HighYieldRepeat"
  | "Controversial";

export interface TaxonomyNode {
  phase: MedicalPhase;
  system: OrganSystem;
  subject: string;
  module: string;
  clinicalAttributes: ClinicalAttribute[];
}

export const PHASE_SUBJECT_MAP: Record<MedicalPhase, string[]> = {
  "Pre-Clinical": ["Anatomy", "Physiology", "Biochemistry"],
  "Para-Clinical": ["Pathology", "Pharmacology", "Microbiology", "FMT", "PSM"],
  "Clinical-1": ["Ophthalmology", "ENT", "Preventive & Social Medicine"],
  "Clinical-2": [
    "Medicine",
    "Surgery",
    "OBGYN",
    "Obstetrics & Gynaecology",
    "Pediatrics",
    "Orthopedics",
    "Dermatology",
    "Psychiatry",
    "Radiology",
    "Anesthesia",
  ],
  Integrated: [
    "Integrated CVS",
    "Cardiovascular",
    "Neurology",
    "Central Nervous",
    "Respiratory System",
    "GI & Hepatobiliary System",
    "Renal & Electrolytes",
    "Endocrine",
    "Hematology",
    "Immunology",
  ],
};

const SYSTEM_KEYWORD_RULES: Array<{ system: OrganSystem; keywords: RegExp }> = [
  {
    system: "Cardiovascular",
    keywords: /\b(cvs|cardio|heart|myocard|coronary|valvular|ecg|murmur|endocardi|pericardi|aort|hypertens|shock|arrhythm|infarct)\b/i,
  },
  {
    system: "Central Nervous",
    keywords: /\b(cns|neuro|brain|cerebr|stroke|seizure|epilep|mening|headache|cranial|spine|spinal|dementia|parkinson|neuropath|ataxia|epidural|subdural|intracranial)\b/i,
  },
  {
    system: "Respiratory",
    keywords: /\b(resp|lung|pulmon|copd|asthma|tuberculosis|pneumoni|pleural|bronch|hemoptysis|hypoxia|dyspnea|ards)\b/i,
  },
  {
    system: "Gastrointestinal & Hepato-Biliary",
    keywords: /\b(git|gast|intest|bowel|colon|liver|hepat|cirrhos|jaundice|pancrea|gallbladder|biliary|esophag|ulcer|gerd)\b/i,
  },
  {
    system: "Renal & Electrolytes",
    keywords: /\b(renal|nephr|kidney|glomerul|dialysis|electrolyte|potassium|sodium|acidosis|alkalosis|uremia|egfr|kdigo)\b/i,
  },
  {
    system: "Endocrine",
    keywords: /\b(endocrin|thyroid|diabetes|adrenal|cushing|addison|pituitary|parathyroid|calcium|hypoglycem|pheochromo)\b/i,
  },
  {
    system: "Hematology & Oncology",
    keywords: /\b(hemat|hema|blood|anemia|leukem|lymphom|myelom|platelet|coagul|bleeding|transfus|sickle|thalassem|apml)\b/i,
  },
  {
    system: "Musculoskeletal",
    keywords: /\b(ortho|bone|fracture|joint|arthrit|rheumat|lupus|myositis|osteomyel|ligament|dislocat|scoliosis)\b/i,
  },
  {
    system: "Reproductive & Gynecologic",
    keywords: /\b(obg|obgyn|gynec|obstetr|pregnan|labor|uterus|cervix|ovary|figo|pcos|contracep|placenta|eclampsia)\b/i,
  },
  {
    system: "Infectious & Immune",
    keywords: /\b(micro|infect|hiv|malaria|viral|bacteri|fungal|parasit|antibiotic|vaccin|immun|sepsis|fever)\b/i,
  },
];

/**
 * Resolves the Medical Phase for a subject
 */
export function getQuestionPhase(subject: string): MedicalPhase {
  const norm = (subject || "").trim().toLowerCase();
  for (const [phase, subjects] of Object.entries(PHASE_SUBJECT_MAP)) {
    if (subjects.some((s) => s.toLowerCase() === norm || norm.includes(s.toLowerCase()))) {
      return phase as MedicalPhase;
    }
  }
  return "Clinical-2";
}

/**
 * Resolves the primary Organ System for a question based on its subject, topic, and vignette
 */
export function getQuestionSystem(subject: string, topic?: string, vignette?: string): OrganSystem {
  const text = `${subject} ${topic || ""} ${vignette || ""}`;
  for (const rule of SYSTEM_KEYWORD_RULES) {
    if (rule.keywords.test(text)) {
      return rule.system;
    }
  }
  return "General & Multi-System";
}

/**
 * Infers clinical attributes (#ClinicalVignette, #ImageBased, #ExaminerTrap, etc.)
 */
export function inferQuestionAttributes(q: ClinicalQuestion): ClinicalAttribute[] {
  const attrs: ClinicalAttribute[] = [];

  // Image Based
  if (q.imageUrl || (q as any).images?.length > 0) {
    attrs.push("ImageBased");
  }

  // Clinical Vignette (age/gender presentation, history, vitals)
  const isVignette =
    /\b(year-old|yo\b|presents with|history of|complains of|admitted with|examination reveals|on examination|blood pressure|heart rate|afebrile|pulse rate)\b/i.test(
      q.vignette
    ) || q.vignette.length > 160;

  if (isVignette) {
    attrs.push("ClinicalVignette");
  }

  // Examiner Trap
  if (
    q.examinerTrap ||
    /\b(NOT|EXCEPT|FALSE|INCORRECT|LEAST LIKELY|CONTRAINDICATED)\b/i.test(q.vignette)
  ) {
    attrs.push("ExaminerTrap");
  }

  // Recent 2023-2025 Guideline Update
  if (
    /\b(FIGO 2023|BNS 2024|KDIGO 2024|GOLD 2024|Surviving Sepsis|NMC|IPC 304A|Section 106|Section 64)\b/i.test(
      `${q.vignette} ${q.explanation?.bottomLine || ""}`
    )
  ) {
    attrs.push("RecentUpdate");
  }

  // High Yield Repeat
  if (q.highYieldTags?.some((t) => /repeat|high_yield|must_know/i.test(t))) {
    attrs.push("HighYieldRepeat");
  }

  return attrs;
}

/**
 * Enriches a question with 4-tier taxonomy metadata
 */
export function enrichQuestionWithTaxonomy(q: ClinicalQuestion): ClinicalQuestion & { taxonomy: TaxonomyNode } {
  const phase = getQuestionPhase(q.subject);
  const system = getQuestionSystem(q.subject, q.topic, q.vignette);
  const clinicalAttributes = inferQuestionAttributes(q);

  return {
    ...q,
    taxonomy: {
      phase,
      system,
      subject: q.subject,
      module: q.topic || "General",
      clinicalAttributes,
    },
  };
}
