/**
 * High-Yield Medical & Academic Subtitle Glossary
 *
 * Provides instant clinical definitions, exam pearls, and high-yield takeaways
 * for lectures (CoreBTR, NEET-PG, INI-CET, Cerebellum, USMLE) and general academic content.
 */

export interface MedicalPearl {
  term: string;
  category: "pharmacology" | "pathology" | "anatomy" | "microbiology" | "biostatistics" | "radiology" | "general";
  pearl: string;
  definition: string;
  examTag?: string;
}

export const HIGH_YIELD_PEARLS: Record<string, MedicalPearl> = {
  horner: {
    term: "Horner Syndrome",
    category: "pathology",
    pearl: "Triad: Ptosis (partial), Miosis, Anhidrosis. Caused by interruption of sympathetic chain (e.g. Pancoast tumor, carotid dissection).",
    definition: "Disruption of cervical sympathetic pathway to the eye and face.",
    examTag: "INI-CET High Yield",
  },
  warfarin: {
    term: "Warfarin",
    category: "pharmacology",
    pearl: "Inhibits Vitamin K Epoxide Reductase (VKORC1). Monitored via PT/INR. Teratogenic (causes bone/nasal hypoplasia). Reversal: Vitamin K + 4-Factor PCC.",
    definition: "Oral vitamin K antagonist anticoagulant.",
    examTag: "NEET-PG Core",
  },
  heparin: {
    term: "Heparin",
    category: "pharmacology",
    pearl: "Activates Antithrombin III, inactivates Thrombin (IIa) and Factor Xa. Monitored via aPTT. Reversal: Protamine sulfate. Watch for HIT (Type II immune thrombocytopenia).",
    definition: "Fast-acting parenteral anticoagulant.",
    examTag: "NEET-PG Core",
  },
  metformin: {
    term: "Metformin",
    category: "pharmacology",
    pearl: "First-line for Type 2 DM. Inhibits mitochondrial complex I, activates AMPK, reduces hepatic gluconeogenesis. Rare fatal adverse effect: Lactic acidosis (withhold before IV contrast).",
    definition: "Biguanide antihyperglycemic agent.",
    examTag: "High-Yield Pharma",
  },
  fallot: {
    term: "Tetralogy of Fallot",
    category: "pathology",
    pearl: "PROVe: Pulmonary stenosis (determines prognosis), Right ventricular hypertrophy, Overriding aorta, VSD. Boot-shaped heart on chest X-ray.",
    definition: "Most common cyanotic congenital heart defect.",
    examTag: "Pediatrics / Anatomy",
  },
  troponin: {
    term: "Cardiac Troponin (cTnI / cTnT)",
    category: "pathology",
    pearl: "Gold standard biomarker for myocardial infarction. Rises at 3-4 hours, peaks at 24 hours, remains elevated for 7-10 days (use CK-MB to detect re-infarction).",
    definition: "Regulatory protein complex specific to myocardial injury.",
    examTag: "Cardiology Pearl",
  },
  sensitivity: {
    term: "Sensitivity",
    category: "biostatistics",
    pearl: "TP / (TP + FN). Rule OUT test (SNOUT). Desirable for screening tests to minimize false negatives.",
    definition: "Proportion of true positives correctly identified by a test.",
    examTag: "PSM / Biostats",
  },
  specificity: {
    term: "Specificity",
    category: "biostatistics",
    pearl: "TN / (TN + FP). Rule IN test (SPIN). Desirable for confirmatory testing to minimize false positives.",
    definition: "Proportion of true negatives correctly identified by a test.",
    examTag: "PSM / Biostats",
  },
  tuberculosis: {
    term: "Mycobacterium Tuberculosis",
    category: "microbiology",
    pearl: "Acid-fast bacillus (Ziehl-Neelsen stain). Ghon complex = Ghon focus + hilar lymphadenopathy. First-line RIPE: Rifampin, Isoniazid (give B6), Pyrazinamide (hyperuricemia), Ethambutol (optic neuritis).",
    definition: "Chronic granulomatous infectious disease primarily affecting lungs.",
    examTag: "Infectious Disease",
  },
  turner: {
    term: "Turner Syndrome (45,X)",
    category: "genetics" as any,
    pearl: "Streak ovaries, short stature, webbed neck, shield chest, coarctation of aorta, bicuspid aortic valve, horseshoe kidney. Most common cause of primary amenorrhea.",
    definition: "Chromosomal abnormality characterized by complete or partial absence of second sex chromosome.",
    examTag: "Genetics Core",
  },
  klinefelter: {
    term: "Klinefelter Syndrome (47,XXY)",
    category: "genetics" as any,
    pearl: "Tall eunuchoid habitus, gynecomastia, small firm testes, hypergonadotropic hypogonadism (elevated FSH/LH, low testosterone). Barr body positive.",
    definition: "Male hypogonadism due to presence of one or more extra X chromosomes.",
    examTag: "Genetics Core",
  },
  pheochromocytoma: {
    term: "Pheochromocytoma",
    category: "pathology",
    pearl: "Rule of 10s. Triad: episodic Headache, Sweating, Tachycardia with refractory hypertension. Diagnosis: 24-hr urinary metanephrines. Pre-op: Alpha-blocker (Phenoxybenzamine) BEFORE Beta-blocker!",
    definition: "Catecholamine-secreting tumor of adrenal medulla chromaffin cells.",
    examTag: "Endocrine Pearl",
  },
  digoxin: {
    term: "Digoxin",
    category: "pharmacology",
    pearl: "Inhibits Na+/K+ ATPase. Toxicity exacerbated by hypokalemia! Most common ECG finding: ST scooping (Salvador Dali mustache). Most common arrhythmia: Ventricular bigeminy. Reversal: Digoxin immune Fab (DigiFab).",
    definition: "Cardiac glycoside used in heart failure and atrial fibrillation.",
    examTag: "High-Yield Pharma",
  },
};

/**
 * Searches text for any matching medical pearls or key terms.
 */
export function findMatchingPearl(wordOrPhrase: string): MedicalPearl | null {
  if (!wordOrPhrase) return null;
  const clean = wordOrPhrase.toLowerCase().replace(/[^a-z0-9]/g, "");

  for (const [key, pearl] of Object.entries(HIGH_YIELD_PEARLS)) {
    if (clean.includes(key) || key.includes(clean)) {
      return pearl;
    }
  }
  return null;
}
