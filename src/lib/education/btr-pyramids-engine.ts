/**
 * Core BTR 3-Tier Pyramid Subject Visualizer & Mastery Engine
 * Codifies Dr. Zainab Vora's signature 3-tier pyramid strategy across subjects.
 */

export interface BTRPyramidData {
  subjectId: string;
  subjectName: string;
  tier1MustKnow: string[]; // Base: 70% of marks
  tier2Volatiles: string[]; // Middle: 20% repeat traps
  tier3TieBreakers: string[]; // Apex: 10% rank-deciders
}

export const BTR_PYRAMID_CATALOG: Record<string, BTRPyramidData> = {
  anatomy: {
    subjectId: "anatomy",
    subjectName: "Anatomy",
    tier1MustKnow: [
      "Brachial plexus roots, cords, branches & lesions (Erb's / Klumpke's)",
      "Skull base foramina & cranial nerves exit pathways (Rotundum vs Ovale vs Spinosum)",
      "Femoral triangle, sheath, canal & inguinal canal boundaries",
      "Coronary artery anatomy & dominant circulation",
      "Peritoneal pouches & lesser sac (Foramen of Winslow) boundaries",
    ],
    tier2Volatiles: [
      "Laryngeal muscle nerve supply (All recurrent except Cricothyroid by external laryngeal)",
      "Urethral rupture locations (Membranous vs Spongy urethra)",
      "Sensory innervation of tongue (Anterior 2/3 vs Posterior 1/3 vs Vallecula)",
      "Spaces of the hand (Midpalmar vs Thenar space boundaries)",
    ],
    tier3TieBreakers: [
      "Embryological aortic arch derivatives (3rd, 4th, 6th arches)",
      "Branchial cleft vs pouch derivatives (DiGeorge syndrome 3rd & 4th pouch)",
      "Cross-sectional brainstem levels (Open medulla vs Closed medulla vs Midbrain colliculi)",
    ],
  },
  pathology: {
    subjectId: "pathology",
    subjectName: "Pathology",
    tier1MustKnow: [
      "Cell injury: Reversible vs Irreversible hallmarks (Mitochondrial calcification)",
      "Necrosis types & examples (Coagulative, Liquefactive, Caseous, Fibrinoid, Fat)",
      "Acute vs Chronic inflammation cellular mediators (IL-1, TNF-alpha, IL-6)",
      "Neoplasia nomenclature, grading vs staging, hallmarks of cancer",
      "Shock pathogenesis & stages (Septic, Hypovolemic, Cardiogenic, Anaphylactic)",
    ],
    tier2Volatiles: [
      "Leukemia & Lymphoma translocation matrix (t(9;22), t(8;14), t(14;18), t(15;17), t(11;14))",
      "Glomerulonephritis immunofluorescence patterns (Linear vs Granular vs Pauci-immune)",
      "Flow cytometry cluster differentiation (CD15, CD30, CD19, CD20, CD3, CD4, CD8, CD138)",
      "Amyloidosis stains (Congo red -> Apple-green birefringence under polarized light)",
    ],
    tier3TieBreakers: [
      "Hereditary cancer syndromes & repair mechanisms (Lynch MMR, Xeroderma pigmentosum NER)",
      "Vasculitis classification & ANCA associations (c-ANCA PR3 vs p-ANCA MPO)",
      "Tumor markers matrix (AFP, beta-hCG, CA-125, CA 19-9, CEA, Calcitonin)",
    ],
  },
  pharmacology: {
    subjectId: "pharmacology",
    subjectName: "Pharmacology",
    tier1MustKnow: [
      "Autonomic nervous system receptors (Alpha 1 & 2, Beta 1, 2 & 3, Muscarinic M1-M3)",
      "Antihypertensive step ladders (ACEi/ARB, CCB, Thiazides)",
      "Antimicrobial classes, mechanisms of action, and ribosomal subunits (30S vs 50S)",
      "Antidiabetic drug mechanisms (Metformin, SGLT2i, GLP-1 RA, DPP-4i, Sulfonylureas)",
      "Anti-tubercular therapy (HRZE) regimens & characteristic toxicities",
    ],
    tier2Volatiles: [
      "Specific antidotes list (Paracetamol -> NAC, Digoxin -> Fab, Organophosphates -> Atropine + Pralidoxime)",
      "Cytochrome P450 Inducers vs Inhibitors mnemonic tables",
      "Therapeutic drug monitoring ranges (Digoxin 0.5-2 ng/mL, Lithium 0.6-1.2 mEq/L, Phenytoin 10-20 mcg/mL)",
      "Teratogenic drug effects (Thalidomide phocomelia, Isotretinoin, ACEi renal dysgenesis)",
    ],
    tier3TieBreakers: [
      "Targeted monoclonal antibodies mechanisms (Trastuzumab HER2, Rituximab CD20, Nivolumab PD-1)",
      "Inhalational anesthetics MAC values & blood-gas partition coefficients",
      "Antiarrhythmic Vaughan Williams classes and pro-arrhythmic risks",
    ],
  },
  surgery: {
    subjectId: "surgery",
    subjectName: "General Surgery",
    tier1MustKnow: [
      "Trauma ATLS primary survey (Airway, Breathing, Circulation, Disability, Exposure)",
      "Burns Parkland formula, rule of nines & initial resuscitation",
      "Appendicitis Alvarado score, imaging & laparoscopic appendectomy steps",
      "Intestinal obstruction causes, signs & strangulation indicators",
      "Gallstone disease: Biliary colic vs Acute cholecystitis vs Choledocholithiasis vs Cholangitis (Charcot's triad)",
    ],
    tier2Volatiles: [
      "Thyroid carcinoma staging, surgery extents & radioactive iodine protocols",
      "Breast cancer Triple Assessment, Nottingham grading & TNM surgical options",
      "Arterial vs Venous ulcers of lower limb: characteristics and CEAP classification",
      "Hernia anatomy: Direct vs Indirect vs Femoral vs Obturator (Nyhus classification)",
    ],
    tier3TieBreakers: [
      "MEN 1, MEN 2A & MEN 2B syndrome manifestations and RET proto-oncogene screening",
      "Post-gastrectomy syndromes (Dumping syndrome, Afferent loop syndrome)",
      "Pediatric surgery milestones (Intussusception target sign, Hirschsprung rectal biopsy)",
    ],
  },
};

const STORAGE_KEY_PYRAMID = "argus_corebtr_pyramid_checked_v1";
let memoryPyramidChecked: Set<string> | null = null;

export function loadCheckedPyramidTopics(): Set<string> {
  try {
    if (typeof localStorage === "undefined" || !localStorage?.getItem) {
      return memoryPyramidChecked || (memoryPyramidChecked = new Set());
    }
    const raw = localStorage.getItem(STORAGE_KEY_PYRAMID);
    if (!raw) return memoryPyramidChecked || (memoryPyramidChecked = new Set());
    const parsed = JSON.parse(raw);
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch {
    return memoryPyramidChecked || (memoryPyramidChecked = new Set());
  }
}

export function togglePyramidTopic(topicKey: string): boolean {
  const current = loadCheckedPyramidTopics();
  let nowChecked = false;
  if (current.has(topicKey)) {
    current.delete(topicKey);
    nowChecked = false;
  } else {
    current.add(topicKey);
    nowChecked = true;
  }
  memoryPyramidChecked = current;
  try {
    if (typeof localStorage !== "undefined" && localStorage?.setItem) {
      localStorage.setItem(STORAGE_KEY_PYRAMID, JSON.stringify(Array.from(current)));
    }
  } catch {
    // ignore
  }
  return nowChecked;
}

export function calculatePyramidProgress(
  data: BTRPyramidData,
  checkedSet: Set<string>
): {
  tier1Percentage: number;
  tier2Percentage: number;
  tier3Percentage: number;
  totalPercentage: number;
} {
  const getPct = (items: string[], prefix: string) => {
    if (items.length === 0) return 0;
    const checked = items.filter((_, idx) => checkedSet.has(`${prefix}-${idx}`)).length;
    return Math.round((checked / items.length) * 100);
  };

  const t1 = getPct(data.tier1MustKnow, `${data.subjectId}-t1`);
  const t2 = getPct(data.tier2Volatiles, `${data.subjectId}-t2`);
  const t3 = getPct(data.tier3TieBreakers, `${data.subjectId}-t3`);

  const totalItems = data.tier1MustKnow.length + data.tier2Volatiles.length + data.tier3TieBreakers.length;
  const totalChecked =
    data.tier1MustKnow.filter((_, i) => checkedSet.has(`${data.subjectId}-t1-${i}`)).length +
    data.tier2Volatiles.filter((_, i) => checkedSet.has(`${data.subjectId}-t2-${i}`)).length +
    data.tier3TieBreakers.filter((_, i) => checkedSet.has(`${data.subjectId}-t3-${i}`)).length;

  return {
    tier1Percentage: t1,
    tier2Percentage: t2,
    tier3Percentage: t3,
    totalPercentage: totalItems === 0 ? 0 : Math.round((totalChecked / totalItems) * 100),
  };
}
