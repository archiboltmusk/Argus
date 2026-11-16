/**
 * Core BTR "20th Subject" Matrix & High-Yield Super-Volatiles Directory
 * Essential cheat-sheets, biostat calculations, Drug of Choice (DOC) lookup,
 * and clinical staging algorithms codified from Dr. Zainab Vora's master sheets.
 */

// --- 1. BIOSTATISTICS ENGINE ---
export interface Biostats2x2Input {
  tp: number; // True Positive
  fp: number; // False Positive
  fn: number; // False Negative
  tn: number; // True Negative
}

export interface BiostatsMetrics {
  sensitivity: number; // %
  specificity: number; // %
  ppv: number; // Positive Predictive Value %
  npv: number; // Negative Predictive Value %
  oddsRatio: number;
  relativeRisk: number;
  arr: number; // Absolute Risk Reduction
  nnt: number; // Number Needed to Treat
}

export function calculateBiostats(input: Biostats2x2Input): BiostatsMetrics {
  const { tp, fp, fn, tn } = input;
  const totalDiseased = tp + fn || 1;
  const totalHealthy = tn + fp || 1;
  const totalTestPositive = tp + fp || 1;
  const totalTestNegative = tn + fn || 1;

  const sensitivity = (tp / totalDiseased) * 100;
  const specificity = (tn / totalHealthy) * 100;
  const ppv = (tp / totalTestPositive) * 100;
  const npv = (tn / totalTestNegative) * 100;

  const oddsRatio = fp * fn === 0 ? 0 : (tp * tn) / (fp * fn);
  const riskExposed = tp / totalTestPositive;
  const riskUnexposed = fn / totalTestNegative;
  const relativeRisk = riskUnexposed === 0 ? 0 : riskExposed / riskUnexposed;
  const arr = Math.abs(riskUnexposed - riskExposed);
  const nnt = arr === 0 ? 0 : Math.ceil(1 / arr);

  return {
    sensitivity: Number(sensitivity.toFixed(1)),
    specificity: Number(specificity.toFixed(1)),
    ppv: Number(ppv.toFixed(1)),
    npv: Number(npv.toFixed(1)),
    oddsRatio: Number(oddsRatio.toFixed(2)),
    relativeRisk: Number(relativeRisk.toFixed(2)),
    arr: Number(arr.toFixed(3)),
    nnt: nnt,
  };
}

// --- 2. DRUG OF CHOICE (DOC) DIRECTORY ---
export interface BTROfChoiceEntry {
  id: string;
  condition: string;
  drugOfChoice: string;
  alternativeOrNotes: string;
  system: string;
  examinerTrap?: string;
}

export const BTR_DRUG_OF_CHOICE_CATALOG: BTROfChoiceEntry[] = [
  {
    id: "doc-1",
    condition: "Anaphylactic Shock",
    drugOfChoice: "Adrenaline (Epinephrine) 1:1000 IM",
    alternativeOrNotes: "Dose 0.5 mg IM into anterolateral thigh; repeat every 5-15 min if needed.",
    system: "Pharmacology & Emergency",
    examinerTrap: "Do NOT give 1:1000 IV! IV adrenaline is 1:10,000 for cardiac arrest.",
  },
  {
    id: "doc-2",
    condition: "Septic Shock (Vasopressor of Choice)",
    drugOfChoice: "Noradrenaline (Norepinephrine) IV infusion",
    alternativeOrNotes: "Target MAP >= 65 mmHg; add Vasopressin if refractory.",
    system: "Medicine & ICU",
    examinerTrap: "Dopamine is no longer first line due to tachyarrhythmia risks.",
  },
  {
    id: "doc-3",
    condition: "Trigeminal Neuralgia (Tic Douloureux)",
    drugOfChoice: "Carbamazepine",
    alternativeOrNotes: "Oxcarbazepine is second-line with fewer CYP interactions; Baclofen.",
    system: "Neurology",
    examinerTrap: "Carbamazepine requires HLA-B*1502 screening in Asians due to SJS/TEN risk.",
  },
  {
    id: "doc-4",
    condition: "Absence Seizures (Petit Mal)",
    drugOfChoice: "Ethosuximide",
    alternativeOrNotes: "Sodium Valproate if accompanied by generalized tonic-clonic seizures.",
    system: "Pediatrics & Neurology",
    examinerTrap: "Avoid Carbamazepine and Phenytoin; they exacerbate absence seizures.",
  },
  {
    id: "doc-5",
    condition: "Status Epilepticus (Initial 0-5 mins)",
    drugOfChoice: "IV Lorazepam (0.1 mg/kg)",
    alternativeOrNotes: "IM Midazolam if no IV access; followed immediately by Fosphenytoin infusion.",
    system: "Emergency Medicine",
    examinerTrap: "Phenytoin must be given in normal saline, never 5% dextrose (precipitates).",
  },
  {
    id: "doc-6",
    condition: "Wilson's Disease (Copper Overload)",
    drugOfChoice: "D-Penicillamine",
    alternativeOrNotes: "Trientine (TETA) in penicillamine intolerance; Zinc acetate for maintenance.",
    system: "Medicine & Gastroenterology",
    examinerTrap: "Give Pyridoxine (Vit B6) concurrently with D-Penicillamine to avoid neuropathy.",
  },
  {
    id: "doc-7",
    condition: "Pheochromocytoma (Pre-operative Alpha Blockade)",
    drugOfChoice: "Phenoxybenzamine (Non-competitive irreversible alpha blocker)",
    alternativeOrNotes: "Followed by Beta-blocker only AFTER full alpha blockade is established.",
    system: "Endocrinology & Surgery",
    examinerTrap: "NEVER start beta-blocker first! Unopposed alpha-stimulation leads to lethal hypertensive crisis.",
  },
  {
    id: "doc-8",
    condition: "Syphilis (Treponema pallidum - All stages)",
    drugOfChoice: "Benzathine Penicillin G",
    alternativeOrNotes: "Primary/Secondary: 2.4 MU single IM dose; Neurosyphilis: Aqueous crystalline penicillin G IV.",
    system: "Microbiology & STI",
    examinerTrap: "Watch for Jarisch-Herxheimer reaction within 24 hours of starting penicillin.",
  },
  {
    id: "doc-9",
    condition: "MRSA (Methicillin-Resistant S. aureus) Bacteremia",
    drugOfChoice: "Vancomycin IV (or Daptomycin)",
    alternativeOrNotes: "Linezolid for MRSA pneumonia (Daptomycin is inactivated by pulmonary surfactant).",
    system: "Microbiology & Pharmacology",
    examinerTrap: "Daptomycin CANNOT be used for MRSA pneumonia due to surfactant binding.",
  },
  {
    id: "doc-10",
    condition: "Pseudomonas aeruginosa Severe Infection",
    drugOfChoice: "Piperacillin-Tazobactam (or Cefepime / Ceftazidime)",
    alternativeOrNotes: "Meropenem / Polymyxin B for carbapenem-resistant strains.",
    system: "Microbiology",
  },
  {
    id: "doc-11",
    condition: "Paroxysmal Supraventricular Tachycardia (PSVT) Acute",
    drugOfChoice: "Adenosine (6 mg rapid IV push followed by flush)",
    alternativeOrNotes: "Vagal maneuvers first; Verapamil or Diltiazem second line.",
    system: "Cardiology",
    examinerTrap: "Adenosine is contraindicated in severe asthma / bronchospasm and WPW with AF.",
  },
  {
    id: "doc-12",
    condition: "Atrial Fibrillation with WPW Syndrome",
    drugOfChoice: "IV Procainamide (or Ibutilide)",
    alternativeOrNotes: "Synchronized DC cardioversion if hemodynamically unstable.",
    system: "Cardiology",
    examinerTrap: "AVOID 'ABCD' (Adenosine, Beta-blockers, CCB, Digoxin); they accelerate accessory pathway conduction to VF.",
  },
  {
    id: "doc-13",
    condition: "Hyperkalemia with Peaked T waves / Wide QRS",
    drugOfChoice: "IV 10% Calcium Gluconate (10 mL over 5-10 min)",
    alternativeOrNotes: "Stabilizes cardiac membrane; then shift K+ inside cells with regular Insulin + 25% Dextrose.",
    system: "Medicine & Nephrology",
    examinerTrap: "Calcium gluconate does NOT lower serum potassium; it only stabilizes the cardiac membrane.",
  },
  {
    id: "doc-14",
    condition: "Acute Gout Flare",
    drugOfChoice: "NSAIDs (Indomethacin / Naproxen) or Oral Colchicine",
    alternativeOrNotes: "Systemic steroids if renal dysfunction or peptic ulcer disease.",
    system: "Rheumatology",
    examinerTrap: "Do NOT initiate or stop Allopurinol during an acute gout flare (triggers sudden flare shifts).",
  },
  {
    id: "doc-15",
    condition: "Kala-Azar (Visceral Leishmaniasis in India)",
    drugOfChoice: "Liposomal Amphotericin B (Single dose 10 mg/kg IV)",
    alternativeOrNotes: "Miltefosine oral is second line.",
    system: "Parasitology",
    examinerTrap: "Sodium Stibogluconate is obsolete in Bihar/India due to high antimony resistance.",
  },
];

// --- 3. BIO-MEDICAL WASTE (BMW) MANAGEMENT 2016 RULES ---
export interface BMWCategory {
  color: string;
  bagColorHex: string;
  wasteTypes: string[];
  treatmentMethod: string;
  prohibitedItems: string;
}

export const BMW_2016_RULES: BMWCategory[] = [
  {
    color: "YELLOW",
    bagColorHex: "#eab308",
    wasteTypes: [
      "Human anatomical waste (tissues, organs, placenta)",
      "Animal anatomical waste",
      "Soiled waste (blood-soaked gauze, dressings, cotton casts)",
      "Expired or discarded cytotoxic drugs & chemotherapy",
      "Chemical liquid waste",
      "Microbiology and clinical lab cultures",
    ],
    treatmentMethod: "Incineration or Plasma Pyrolysis / Deep burial in rural areas",
    prohibitedItems: "No chlorinated plastic bags; no sharps.",
  },
  {
    color: "RED",
    bagColorHex: "#ef4444",
    wasteTypes: [
      "Contaminated recyclable plastics",
      "Disposable tubing and IV bottles (plastic)",
      "Catheters, urine bags, NG tubes",
      "Syringes WITHOUT fixed needles",
      "Vacutainers and blood collection tubes without needles",
    ],
    treatmentMethod: "Autoclaving / Microwaving followed by Shredding / Recycling",
    prohibitedItems: "No sharps, no human tissues, no glass vials.",
  },
  {
    color: "WHITE (Translucent)",
    bagColorHex: "#f8fafc",
    wasteTypes: [
      "Waste sharps (needles, scalpels, surgical blades)",
      "Contaminated needles with syringes attached (fixed needle)",
      "Lancets, suture needles, trocars",
    ],
    treatmentMethod: "Autoclaving / Dry Heat Sterilization followed by Shredding / Mutilation / Encapsulation",
    prohibitedItems: "Puncture-proof, tamper-proof container mandatory.",
  },
  {
    color: "BLUE (Cardboard Box / Container)",
    bagColorHex: "#3b82f6",
    wasteTypes: [
      "Glassware (broken or intact ampoules, medicine vials)",
      "Glass slides and cover slips",
      "Metallic orthopedic body implants",
    ],
    treatmentMethod: "Disinfection with 1% Sodium Hypochlorite / Autoclaving followed by Recycling",
    prohibitedItems: "No plastics, no gauze or soiled cotton.",
  },
];

// --- 4. GLASGOW COMA SCALE (GCS) CALCULATOR ---
export interface GCSInput {
  eye: 1 | 2 | 3 | 4;
  verbal: 1 | 2 | 3 | 4 | 5;
  motor: 1 | 2 | 3 | 4 | 5 | 6;
}

export function calculateGCS(input: GCSInput): {
  total: number;
  severity: "Severe Head Injury (GCS 3-8)" | "Moderate Head Injury (GCS 9-12)" | "Minor Head Injury (GCS 13-15)";
  intubationIndicated: boolean;
} {
  const total = input.eye + input.verbal + input.motor;
  const severity =
    total <= 8
      ? "Severe Head Injury (GCS 3-8)"
      : total <= 12
      ? "Moderate Head Injury (GCS 9-12)"
      : "Minor Head Injury (GCS 13-15)";

  return {
    total,
    severity,
    intubationIndicated: total <= 8,
  };
}

// --- 5. CURB-65 PNEUMONIA SEVERITY CALCULATOR ---
export interface CURB65Input {
  confusion: boolean;
  ureaOver7mmol: boolean; // BUN > 19 mg/dL
  respiratoryRateGe30: boolean;
  bloodPressureLow: boolean; // SBP < 90 or DBP <= 60 mmHg
  ageGe65: boolean;
}

export function calculateCURB65(input: CURB65Input): {
  score: number;
  recommendation: string;
  mortalityRisk: string;
} {
  let score = 0;
  if (input.confusion) score += 1;
  if (input.ureaOver7mmol) score += 1;
  if (input.respiratoryRateGe30) score += 1;
  if (input.bloodPressureLow) score += 1;
  if (input.ageGe65) score += 1;

  if (score <= 1) {
    return {
      score,
      recommendation: "Low Risk: Consider outpatient treatment with oral antibiotics.",
      mortalityRisk: "< 1.5% mortality",
    };
  } else if (score === 2) {
    return {
      score,
      recommendation: "Intermediate Risk: Inpatient hospital ward admission recommended.",
      mortalityRisk: "~ 9.2% mortality",
    };
  } else {
    return {
      score,
      recommendation: "High Risk: Urgent hospital admission; assess for immediate ICU transfer (especially score 4-5).",
      mortalityRisk: "22% - 30% mortality",
    };
  }
}
