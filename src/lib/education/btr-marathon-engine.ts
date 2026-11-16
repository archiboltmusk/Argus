/**
 * Core BTR 72-Hour Mega Marathon Engine
 * Paces Dr. Zainab Vora's 6 Mega BTR Marathon lectures for rapid 72-hour pre-exam sweep.
 */

export interface BTRMarathonModule {
  id: string;
  title: string;
  targetFileName: string;
  category: "inicet_special" | "short_subjects" | "intermediate" | "integrated" | "long_clinical";
  estimatedMinutes: number;
  subjectsCovered: string[];
  highYieldFoci: string[];
  completedMinutes?: number;
}

export const MEGA_BTR_MARATHON_CATALOG: BTRMarathonModule[] = [
  {
    id: "mega-ini-1",
    title: "Mega BTR Part 1 (INI-CET Special Focus)",
    targetFileName: "MegaBTR Part 1 INICET.mp4",
    category: "inicet_special",
    estimatedMinutes: 195, // ~3.25 hrs
    subjectsCovered: ["Anatomy", "Physiology", "Biochemistry", "Pathology", "Microbiology"],
    highYieldFoci: ["Cross-sectional neuroanatomy", "Metabolic inborn errors", "Flow cytometry CD markers", "Gram stain spotters"],
  },
  {
    id: "mega-ini-2",
    title: "Mega BTR Part 2 (INI-CET Clinical Integration)",
    targetFileName: "MegaBTR Part 2 INICET.mp4",
    category: "inicet_special",
    estimatedMinutes: 210, // ~3.5 hrs
    subjectsCovered: ["Pharmacology", "FMT", "PSM", "Radiology", "Medicine", "Surgery"],
    highYieldFoci: ["Toxicity antidotes", "IPC legal sections & autopsy", "Biostatistics tables", "CT/MRI signs"],
  },
  {
    id: "mega-1-short",
    title: "Mega BTR 1: Short Subjects Blitz",
    targetFileName: "Mega BTR 1 Short.mp4",
    category: "short_subjects",
    estimatedMinutes: 185,
    subjectsCovered: ["Dermatology", "Anesthesia", "Psychiatry", "Radiology", "Orthopedics"],
    highYieldFoci: ["Immunobullous diseases", "Inhalational agents MAC", "Schizophrenia DSM-5", "Fracture classifications"],
  },
  {
    id: "mega-2-inter",
    title: "Mega BTR 2: Intermediate Subjects Blitz",
    targetFileName: "Mega BTR 2 Intermediate.mp4",
    category: "intermediate",
    estimatedMinutes: 220,
    subjectsCovered: ["Ophthalmology", "ENT", "Forensic Medicine", "Preventive & Social Medicine"],
    highYieldFoci: ["Glaucoma algorithms", "Audiometry & Stapes surgery", "Poisons & Drowning signs", "National health programs"],
  },
  {
    id: "mega-3-integ",
    title: "Mega BTR 3: Integrated Systemic Blitz",
    targetFileName: "Mega BTR 3 Integrated.mp4",
    category: "integrated",
    estimatedMinutes: 240,
    subjectsCovered: ["CVS", "Respiratory", "Renal", "Endocrine", "Neurology", "Rheumatology"],
    highYieldFoci: ["Heart murmurs & ECG", "PFTs & ABG", "Glomerulonephritis", "Thyroid nodules & Adrenal mass"],
  },
  {
    id: "mega-4-long",
    title: "Mega BTR 4: Long Clinical Masters",
    targetFileName: "Mega BTR 4 Long.mp4",
    category: "long_clinical",
    estimatedMinutes: 260,
    subjectsCovered: ["General Surgery", "Obstetrics & Gynecology", "Pediatrics"],
    highYieldFoci: ["Trauma ATLS protocols", "CTG & Labor management", "Neonatal resuscitation (NRP)"],
  },
];

export interface MarathonPacingMetrics {
  totalRuntimeMinutes: number;
  totalRuntimeHours: number;
  hoursAt1_0x: number;
  hoursAt1_5x: number;
  hoursAt1_75x: number;
  hoursAt2_0x: number;
  dailyHoursAt1_75xOver3Days: number;
}

export function calculateMarathonPacing(modules: BTRMarathonModule[] = MEGA_BTR_MARATHON_CATALOG): MarathonPacingMetrics {
  const totalMins = modules.reduce((acc, m) => acc + m.estimatedMinutes, 0);
  const totalHours = totalMins / 60;

  return {
    totalRuntimeMinutes: totalMins,
    totalRuntimeHours: Number(totalHours.toFixed(1)),
    hoursAt1_0x: Number(totalHours.toFixed(1)),
    hoursAt1_5x: Number((totalHours / 1.5).toFixed(1)),
    hoursAt1_75x: Number((totalHours / 1.75).toFixed(1)),
    hoursAt2_0x: Number((totalHours / 2.0).toFixed(1)),
    dailyHoursAt1_75xOver3Days: Number(((totalHours / 1.75) / 3).toFixed(1)),
  };
}
