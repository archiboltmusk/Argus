import type { ClinicalQuestion } from "./qbank-types";

export const CLINICAL_QBANK_STARTER: ClinicalQuestion[] = [
  {
    id: "med-path-01",
    subject: "Pathology",
    topic: "Thyroid Neoplasia",
    vignette: "A 29-year-old female presents with an asymptomatic, firm solitary thyroid nodule. Fine needle aspiration biopsy reveals ground-glass 'Orphan Annie eye' clear nuclei with nuclear pseudoinclusions, nuclear grooves, and concentric laminated calcifications. What is the most definitive diagnosis?",
    options: [
      "Follicular Thyroid Carcinoma",
      "Papillary Thyroid Carcinoma",
      "Medullary Thyroid Carcinoma",
      "Anaplastic Thyroid Carcinoma",
    ],
    correctIndex: 1,
    examinerTrap: "Trap: Do not pick Follicular Carcinoma. Capsular/vascular invasion is needed for Follicular, but nuclear features (Orphan Annie, grooves, pseudoinclusions) + psammoma bodies are pathognomonic for Papillary.",
    explanation: {
      correctRationale: "Papillary Thyroid Carcinoma (PTC) is the most common thyroid cancer (80%). The diagnostic hallmarks on cytology are Orphan Annie eye nuclei (cleared chromatin), nuclear grooves, and psammoma bodies (concentric calcifications). Excellent prognosis (>95% 10-year survival).",
      distractorBreakdown: [
        { option: "Follicular Thyroid Carcinoma", reason: "Cannot be diagnosed on FNAC alone; requires histology demonstrating capsular or vascular invasion. Often associated with PAX8-PPARG or RAS mutations." },
        { option: "Medullary Thyroid Carcinoma", reason: "Arises from parafollicular C cells, secretes Calcitonin, and deposits amyloid (stains Congo red with apple-green birefringence). Associated with RET mutation / MEN 2A & 2B." },
        { option: "Anaplastic Thyroid Carcinoma", reason: "Highly aggressive, occurs in elderly (>65y), rapidly enlarging neck mass invading trachea, very dismal prognosis (median survival 3-6 months)." },
      ],
      bottomLine: "Orphan Annie nuclei + Nuclear Grooves + Psammoma bodies = Papillary Thyroid Carcinoma.",
    },
    highYieldTags: ["AIIMS Repeat", "Must-Know", "Endocrine"],
  },
  {
    id: "med-pharma-02",
    subject: "Pharmacology",
    topic: "Cardiovascular Pharmacology & Antidotes",
    vignette: "A 45-year-old male with hypertension and chronic heart failure presents to the ED with severe bradycardia (HR 32 bpm), hypotension (BP 70/40 mmHg), and wheezing after taking a handful of his heart medication in a suicide attempt. Atropine 1 mg IV is administered with zero heart rate improvement. What is the specific first-line antidote?",
    options: [
      "Flumazenil",
      "IV Calcium Gluconate",
      "IV Glucagon",
      "Pralidoxime (2-PAM)",
    ],
    correctIndex: 2,
    examinerTrap: "Trap: When Atropine fails in beta-blocker overdose, the drug of choice is IV Glucagon, NOT Calcium Gluconate (which is used for Calcium Channel Blocker overdose).",
    explanation: {
      correctRationale: "IV Glucagon acts on distinct G-protein-coupled glucagon receptors on myocardium, activating adenylate cyclase and increasing intracellular cAMP directly, completely bypassing blocked beta-1 adrenergic receptors to restore inotropy and chronotropy.",
      distractorBreakdown: [
        { option: "Flumazenil", reason: "Specific antagonist for benzodiazepine overdose. Ineffective for beta-blocker toxicity." },
        { option: "IV Calcium Gluconate", reason: "First-line antidote for Calcium Channel Blocker (CCB) toxicity or hyperkalemia with ECG changes, but secondary to Glucagon for beta-blockers." },
        { option: "Pralidoxime (2-PAM)", reason: "Cholinesterase reactivator used specifically in organophosphate insecticide poisoning." },
      ],
      bottomLine: "Beta-blocker toxicity refractory to atropine = High-dose IV Glucagon.",
    },
    highYieldTags: ["Antidotes", "Cardio Pharma", "Toxicology"],
  },
  {
    id: "med-surg-03",
    subject: "Surgery",
    topic: "Trauma & Shock (ATLS 10th Ed)",
    vignette: "A 24-year-old motorcyclist is brought to the trauma bay following a high-speed collision. He is cyanotic and tachypneic. Vital signs: BP 74/46 mmHg, HR 138 bpm, RR 34/min, SpO2 81%. On examination, trachea is deviated to the left, there is absence of breath sounds and hyperresonance on the right hemithorax, and neck veins are engorged. What is the immediate next step?",
    options: [
      "Immediate portable chest X-ray to confirm pneumothorax",
      "Endotracheal intubation and mechanical ventilation",
      "Immediate needle decompression at 5th intercostal space anterior axillary line",
      "Emergent right-sided open thoracotomy",
    ],
    correctIndex: 2,
    examinerTrap: "Trap: NEVER wait for a chest X-ray in suspected tension pneumothorax! It is a clinical diagnosis. Waiting for imaging can cause fatal cardiac arrest due to impaired venous return. Also note ATLS 10th ed updated location: 5th ICS anterior/mid-axillary line (or 2nd ICS MCL in children).",
    explanation: {
      correctRationale: "Tension pneumothorax creates a one-way valve effect, compressing the SVC/IVC and shifting mediastinum, causing obstructive shock. Immediate needle thoracostomy followed by tube thoracostomy (chest drain) is life-saving and must precede any radiographic imaging.",
      distractorBreakdown: [
        { option: "Immediate portable chest X-ray", reason: "Absolute malpractice in tension pneumothorax. A clinical diagnosis requires instantaneous decompression." },
        { option: "Endotracheal intubation", reason: "Positive-pressure ventilation without decompressing a tension pneumothorax will worsen intra-thoracic pressure and accelerate hemodynamic collapse." },
        { option: "Emergent right-sided open thoracotomy", reason: "Indicated for massive hemothorax (>1500 mL initial drainage or >200 mL/hr over 2-4 hrs), not initial tension pneumothorax." },
      ],
      bottomLine: "Tension Pneumothorax = Clinical diagnosis. Zero X-ray delay. Immediate needle decompression.",
    },
    highYieldTags: ["ATLS", "Trauma", "Surgery Gold"],
  },
  {
    id: "med-medicine-04",
    subject: "Medicine",
    topic: "Acid-Base & Arterial Blood Gases (ABG)",
    vignette: "A 19-year-old male with Type 1 Diabetes is brought to the emergency department obtunded with Kussmaul respirations and fruity breath. ABG reveals: pH 7.15, PaCO2 20 mmHg, HCO3- 7 mEq/L. Serum electrolytes: Na+ 135 mEq/L, K+ 5.2 mEq/L, Cl- 98 mEq/L. What is the primary acid-base disturbance and anion gap status?",
    options: [
      "Normal anion gap metabolic acidosis with appropriate respiratory compensation",
      "High anion gap metabolic acidosis with partial metabolic alkalosis",
      "High anion gap metabolic acidosis (AG 30) with respiratory compensation",
      "Primary respiratory acidosis with renal compensation",
    ],
    correctIndex: 2,
    examinerTrap: "Trap: Anion Gap = Na+ - (Cl- + HCO3-). Here AG = 135 - (98 + 7) = 30 mEq/L (Normal is 8-12). Winter's formula: Expected PaCO2 = 1.5(HCO3-) + 8 ± 2 = 1.5(7) + 8 = 18.5 ± 2 (16.5 - 20.5). Actual PaCO2 is 20, confirming appropriate respiratory compensation without a second disorder.",
    explanation: {
      correctRationale: "The patient presents with classic Diabetic Ketoacidosis (DKA). The anion gap is 30 (significantly elevated due to unmeasured ketoacids: beta-hydroxybutyrate and acetoacetate). PaCO2 is 20, falling right within Winter's compensation window (16.5 - 20.5), indicating pure High Anion Gap Metabolic Acidosis (HAGMA) with intact respiratory compensation.",
      distractorBreakdown: [
        { option: "Normal anion gap metabolic acidosis", reason: "NAGMA (AG 8-12) occurs in diarrhea or renal tubular acidosis (RTA), not DKA." },
        { option: "High anion gap with partial metabolic alkalosis", reason: "Delta-delta ratio (ΔAG / ΔHCO3-) is (30 - 12) / (24 - 7) = 18 / 17 ≈ 1.06, which is between 0.8 and 1.2, confirming pure HAGMA without concurrent alkalosis." },
        { option: "Primary respiratory acidosis", reason: "PaCO2 is 20 (low, hyperventilation), and pH is acidic, which rules out primary respiratory acidosis." },
      ],
      bottomLine: "DKA = High Anion Gap Metabolic Acidosis (HAGMA). Winter's formula predicts expected PaCO2.",
    },
    highYieldTags: ["ABG", "Endocrinology", "AIIMS Core"],
  },
  {
    id: "med-obg-05",
    subject: "OBGYN",
    topic: "Cervical Cancer Screening & Staging",
    vignette: "A 48-year-old female presents with post-coital vaginal bleeding. Speculum examination reveals an exophytic cervical growth measuring 3.5 cm. On digital rectal examination, the parametrium is soft and pliable up to the pelvic sidewall with no induration. Biopsy confirms Squamous Cell Carcinoma. According to FIGO 2018 staging, what is the stage?",
    options: [
      "Stage IB1",
      "Stage IB2",
      "Stage IIA1",
      "Stage IIB",
    ],
    correctIndex: 1,
    examinerTrap: "Trap: FIGO 2018 revised Stage IB into 3 cutoffs: IB1 is < 2 cm; IB2 is ≥ 2 cm and < 4 cm; IB3 is ≥ 4 cm. Here the tumor is 3.5 cm confined to cervix, making it IB2.",
    explanation: {
      correctRationale: "FIGO 2018 Staging of Cervical Carcinoma: Stage I is strictly confined to the cervix. Stage IB is invasive carcinoma > 5mm depth. IB1: ≥ 5mm depth and < 2 cm; IB2: ≥ 2 cm and < 4 cm; IB3: ≥ 4 cm. Because the tumor is 3.5 cm and parametrium is clear, it is Stage IB2.",
      distractorBreakdown: [
        { option: "Stage IB1", reason: "Limited to tumors < 2.0 cm in greatest dimension." },
        { option: "Stage IIA1", reason: "Involves upper two-thirds of vagina without parametrial involvement and size < 4 cm." },
        { option: "Stage IIB", reason: "Explicit parametrial invasion present (felt as induration up to pelvic side wall on DRE)." },
      ],
      bottomLine: "FIGO 2018 Cervical Cancer: IB1 (<2cm), IB2 (2-4cm), IB3 (≥4cm). Parametrial invasion = Stage IIB.",
    },
    highYieldTags: ["FIGO 2018", "Gynecologic Oncology", "Repeat Staging"],
  },
];
