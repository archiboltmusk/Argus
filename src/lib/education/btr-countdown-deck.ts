/**
 * Argus CoreBTR T-Minus 7 Days Super-Volatile Revision Engine
 *
 * Implements the automated countdown protocol for the final 7 days before NEET-PG/INI-CET:
 * Day -7: BNS 2024 vs IPC Legal Sections & Forensic Thresholds
 * Day -6: PSM Biostatistics Decision Formulas & National Health Guidelines
 * Day -5: Molecular Cytogenetics, Chromosomal Translocations & Tumor Markers
 * Day -4: Toxicological Antidotes, Rare Drug of Choice (DOC) & ADRs
 * Day -3: FIGO 2023 Staging Criteria & Pediatric Milestones
 * Day -2: High-Yield Anatomical Spaces & Radiological DICOM Criteria
 * Day -1: Cardinal Sin Must-Know Repeats & Low-Stress Consolidation
 */

import type { ClinicalQuestion } from "./qbank-types";
import { TOP_100_FRONTIER_VAULT } from "./btr-frontier-vault";

export interface CountdownDayPlan {
  dayNumber: number; // 7, 6, 5, 4, 3, 2, 1
  dayTitle: string;
  focusSpecialty: string;
  strategicObjective: string;
  mustMemorizePills: string[];
  vaultFilterTags: string[];
}

export const T_MINUS_7_PLANS: CountdownDayPlan[] = [
  {
    dayNumber: 7,
    dayTitle: "T-7 Days: Forensic Medicine & BNS 2024 Revisions",
    focusSpecialty: "FMT & Medical Jurisprudence",
    strategicObjective: "Master Bharatiya Nyaya Sanhita (BNS) section replacements over outdated IPC codes.",
    mustMemorizePills: [
      "Section 106(1) BNS replaces IPC 304A for Registered Medical Practitioner Negligence (max 2 yrs).",
      "Section 64 BNS replaces IPC 376 (Rape); Section 70 BNS replaces IPC 376D (Gang Rape).",
      "Section 115 BNS replaces IPC 323 (Voluntarily causing hurt).",
      "Cephalic index: Dolichocephalic (< 75), Mesaticephalic (75-79.9), Brachycephalic (> 80).",
      "Gustafson method for dental age estimation: 6 criteria (S-A-P-P-R-C).",
    ],
    vaultFilterTags: ["FMT", "BNS", "IPC", "Legal"],
  },
  {
    dayNumber: 6,
    dayTitle: "T-6 Days: PSM Biostatistics & Screening Formulas",
    focusSpecialty: "Community Medicine & Biostatistics",
    strategicObjective: "Lock in positive/negative predictive value formulas and national immunization schedule.",
    mustMemorizePills: [
      "Sensitivity = TP / (TP + FN); Specificity = TN / (TN + FP).",
      "Positive Predictive Value (PPV) rises as disease prevalence rises; NPV decreases.",
      "Number Needed to Treat (NNT) = 1 / Absolute Risk Reduction (ARR).",
      "Odds Ratio = (ad) / (bc) from a 2x2 table in Case-Control studies.",
      "Incidence is measured in Cohort studies; Prevalence in Cross-Sectional studies.",
    ],
    vaultFilterTags: ["Biostatistics", "PSM", "Epidemiology"],
  },
  {
    dayNumber: 5,
    dayTitle: "T-5 Days: Cytogenetics, Translocations & Tumor Markers",
    focusSpecialty: "Pathology & Genetics",
    strategicObjective: "Eliminate error on reciprocal chromosomal translocations and oncogenes.",
    mustMemorizePills: [
      "t(9;22) BCR-ABL: CML (Ph chromosome), ALL (poor prognosis).",
      "t(15;17) PML-RARA: Acute Promyelocytic Leukemia (APML) -> Treat with ATRA + Arsenic Trioxide.",
      "t(8;14) c-myc and Ig heavy chain: Burkitt Lymphoma (Starry sky pattern).",
      "t(11;14) Cyclin D1: Mantle Cell Lymphoma.",
      "t(11;22) EWS-FLI1: Ewing Sarcoma (small round blue cells, onion skin periosteal reaction).",
      "t(14;18) BCL-2: Follicular Lymphoma.",
    ],
    vaultFilterTags: ["Cytogenetics", "Translocations", "Pathology"],
  },
  {
    dayNumber: 4,
    dayTitle: "T-4 Days: Antidotes, Rare Drug of Choice & Toxicity",
    focusSpecialty: "Pharmacology & Toxicology",
    strategicObjective: "Rapid recall of specific pharmacological antagonists and lethal poisonings.",
    mustMemorizePills: [
      "Beta-blocker overdose antidote: IV Glucagon (bypasses beta receptors via adenylate cyclase).",
      "Methanol / Ethylene Glycol poisoning: Fomepizole (inhibits alcohol dehydrogenase) or Ethanol.",
      "Cyanide poisoning: Hydroxocobalamin (binds cyanide to form cyanocobalamin) or Sodium Nitrite + Thiosulfate.",
      "Organophosphate toxicity: Atropine (muscarinic) + Pralidoxime (2-PAM, nicotinic cholinesterase reactivator).",
      "Heparin reversal: Protamine Sulfate; Warfarin reversal: 4-Factor Prothrombin Complex Concentrate (PCC) + Vitamin K.",
    ],
    vaultFilterTags: ["Antidotes_DOC", "Pharmacology", "Toxicity"],
  },
  {
    dayNumber: 3,
    dayTitle: "T-3 Days: FIGO 2023 Staging & Pediatric Milestones",
    focusSpecialty: "Obstetrics, Gynecology & Pediatrics",
    strategicObjective: "Incorporate molecular parameters in gynecologic oncology staging.",
    mustMemorizePills: [
      "FIGO 2023 Endometrial Staging: Molecular subgroups (POLE mut, MMRd, p53 abn) determine stage adjustment.",
      "POLE ultramutated tumors are restricted to Stage I regardless of lymphovascular space invasion.",
      "p53 abnormal tumors are automatically upstaged to Stage IIC if confined to uterus.",
      "Social smile (2 months), Neck holding (3 months), Rolls over (5 months), Sits without support (6-8 months).",
      "Pincer grasp (9-10 months), Tower of 2 cubes (15 months), Tower of 6 cubes (2 years).",
    ],
    vaultFilterTags: ["Guidelines_2024", "Obstetrics", "Pediatrics"],
  },
  {
    dayNumber: 2,
    dayTitle: "T-2 Days: Anatomical Spaces & Radiological CT Windows",
    focusSpecialty: "Anatomy & Radiology",
    strategicObjective: "High-speed visual recognition of surgical triangles, spaces, and acute CT signs.",
    mustMemorizePills: [
      "Pterygopalatine Fossa: Communicates with infratemporal fossa via pterygomaxillary fissure.",
      "Femoral Sheath contents (lateral to medial): Femoral artery, Femoral vein, Femoral canal (nerve is OUTSIDE).",
      "Extradural Hemorrhage (EDH): Biconvex lens-shaped, hyperdense, does not cross cranial suture lines (MMA rupture).",
      "Subdural Hemorrhage (SDH): Crescentic, crosses suture lines, limited by dural reflections (bridging veins).",
      "Pneumoperitoneum: Rigler's sign (double wall sign), continuous diaphragm sign on CXR.",
    ],
    vaultFilterTags: ["Anatomy", "Radiology", "Spaces"],
  },
  {
    dayNumber: 1,
    dayTitle: "T-1 Day: Cardinal Sin Repeats & Zen Affirmation",
    focusSpecialty: "Integrated Cardinal Pearls",
    strategicObjective: "Zero new information. Consolidate only the 50 most repeated classic facts to preserve energy.",
    mustMemorizePills: [
      "Most common site of ectopic pregnancy: Ampulla of fallopian tube.",
      "Most common cause of post-partum hemorrhage (PPH): Uterine atony.",
      "Gold standard for DVT diagnosis: Contrast venography (bedside first-line: Compression Duplex US).",
      "Drug of choice for anaphylactic shock: Intramuscular Adrenaline 1:1,000 (0.5 mg in anterolateral thigh).",
      "Trust your first instinct on classic repeats. Do not second-guess obvious questions tomorrow.",
    ],
    vaultFilterTags: ["CardinalRepeat", "MustKnow", "FirstLine"],
  },
];

/**
 * Builds a curated 20-question micro-burst review test for a specific countdown day
 */
export function buildCountdownQuestionsForDay(dayNumber: number): ClinicalQuestion[] {
  const plan = T_MINUS_7_PLANS.find((p) => p.dayNumber === dayNumber) || T_MINUS_7_PLANS[0];

  const matchingFrontier = TOP_100_FRONTIER_VAULT.filter((f) => {
    return (
      f.tags.some((t) => plan.vaultFilterTags.includes(t)) ||
      plan.vaultFilterTags.includes(f.category)
    );
  });

  const pool = matchingFrontier.length > 0 ? matchingFrontier : TOP_100_FRONTIER_VAULT.slice(0, 15);

  return pool.map((f) => ({
    id: `tminus-${plan.dayNumber}-${f.id}`,
    subject: plan.focusSpecialty,
    topic: f.title,
    vignette: `${f.clinicalContext}\n\nWhat is the absolute gold standard or pathognomonic pearl according to national guidelines?`,
    options: [
      f.mustKnowPill,
      `Examiner Trap: ${f.examinerTrap}`,
      "Routine non-specific clinical variant with no acute bearing",
      "Contraindicated in all adult cohorts",
    ],
    correctIndex: 0,
    examinerTrap: f.examinerTrap,
    highYieldTags: f.tags,
    explanation: {
      bottomLine: f.mustKnowPill,
      correctRationale: f.clinicalContext,
      distractorBreakdown: [
        { option: "B", reason: `Trap: ${f.examinerTrap}` },
        { option: "C", reason: "Incorrect: not non-specific." },
        { option: "D", reason: "Incorrect: not contraindicated." },
      ],
      whyCorrect: {
        mechanism: f.clinicalContext,
        clinicalRule: f.mustKnowPill,
      },
    },
  }));
}
