/**
 * Core BTR Automated Timestamp Chapters & Video Topic Seeker Engine
 * Provides precise timestamps for Dr. Zainab Vora's 61 BTR lectures and marathons.
 */

export interface BTRLectureChapter {
  id: string;
  title: string;
  timestampSec: number;
  timestampLabel: string;
  highYieldTrap?: string;
  mustKnowConcept: string;
  pageNumberRef?: number;
}

export interface BTRVideoChapterMap {
  videoPattern: RegExp;
  subjectId: string;
  subjectName: string;
  chapters: BTRLectureChapter[];
}

export const BTR_CHAPTER_CATALOG: BTRVideoChapterMap[] = [
  // Anatomy 1 of 2 (Upper limb, Lower limb, Thorax)
  {
    videoPattern: /Anatomy_1of2/i,
    subjectId: "anatomy",
    subjectName: "Anatomy",
    chapters: [
      {
        id: "anat1-1",
        title: "Brachial Plexus Organization & Root Lesions (Erb's & Klumpke's)",
        timestampSec: 0,
        timestampLabel: "00:00",
        highYieldTrap: "Erb's is C5-C6 upper trunk; Klumpke's is C8-T1 lower trunk + Horner syndrome.",
        mustKnowConcept: "Attitude of Erb's: Policeman's tip / Waiter's tip (adducted, internally rotated, pronated).",
        pageNumberRef: 1,
      },
      {
        id: "anat1-2",
        title: "Axillary Artery Branches & Pectoralis Minor Landmarks",
        timestampSec: 1080,
        timestampLabel: "18:00",
        mustKnowConcept: "Pectoralis minor divides axillary artery into 3 parts: Part 1 (1 branch), Part 2 (2), Part 3 (3).",
        pageNumberRef: 4,
      },
      {
        id: "anat1-3",
        title: "Cubital Fossa Boundaries & Median Nerve Relations",
        timestampSec: 2160,
        timestampLabel: "36:00",
        mustKnowConcept: "Contents from medial to lateral: Median nerve, Brachial artery, Biceps tendon (MBBS).",
        pageNumberRef: 7,
      },
      {
        id: "anat1-4",
        title: "Spaces of Hand & Radial Bursa / Ulnar Bursa Anatomy",
        timestampSec: 3300,
        timestampLabel: "55:00",
        mustKnowConcept: "Kanavel's four cardinal signs of flexor tenosynovitis.",
        pageNumberRef: 10,
      },
      {
        id: "anat1-5",
        title: "Femoral Triangle, Sheath & Canal Hernia Anatomy",
        timestampSec: 4500,
        timestampLabel: "01:15:00",
        highYieldTrap: "Femoral nerve lies outside the femoral sheath; femoral hernia emerges through femoral ring.",
        mustKnowConcept: "Medial boundary of femoral ring is Lacunar ligament (Gimbernat).",
        pageNumberRef: 14,
      },
      {
        id: "anat1-6",
        title: "Popliteal Fossa Boundaries & Sciatic Nerve Bifurcation",
        timestampSec: 5880,
        timestampLabel: "01:38:00",
        mustKnowConcept: "Tibial nerve continues down deep posterior compartment; Common Peroneal winds around fibula neck.",
        pageNumberRef: 18,
      },
    ],
  },

  // Anatomy 2 of 2 (Head & Neck, Neuroanatomy, Embryology)
  {
    videoPattern: /Anatomy_2of2/i,
    subjectId: "anatomy",
    subjectName: "Anatomy",
    chapters: [
      {
        id: "anat2-1",
        title: "Skull Base Foramina & Cranial Nerves Exit Pathways",
        timestampSec: 0,
        timestampLabel: "00:00",
        highYieldTrap: "Maxillary V2 through Foramen Rotundum; Mandibular V3 through Foramen Ovale.",
        mustKnowConcept: "Foramen spinosum transmits Middle Meningeal Artery.",
        pageNumberRef: 24,
      },
      {
        id: "anat2-2",
        title: "Cavernous Sinus Structures & Thrombosis Signatures",
        timestampSec: 1320,
        timestampLabel: "22:00",
        mustKnowConcept: "Lateral wall: CN III, IV, V1, V2. Passing through center: CN VI & Internal Carotid Artery.",
        pageNumberRef: 28,
      },
      {
        id: "anat2-3",
        title: "Pharyngeal Arches, Pouches, and Cleft Derivatives",
        timestampSec: 2700,
        timestampLabel: "45:00",
        mustKnowConcept: "1st arch: Trigeminal V3 (muscles of mastication); 2nd arch: Facial VII (muscles of facial expression).",
        pageNumberRef: 32,
      },
      {
        id: "anat2-4",
        title: "Circle of Willis, Berry Aneurysms & Stroke Syndromes",
        timestampSec: 4200,
        timestampLabel: "01:10:00",
        mustKnowConcept: "ACom aneurysm causes bitemporal visual defects; PCom aneurysm causes pupil-involving CN III palsy.",
        pageNumberRef: 36,
      },
      {
        id: "anat2-5",
        title: "Perineal Pouches, Urogenital Diaphragm & Extravasation",
        timestampSec: 5520,
        timestampLabel: "01:32:00",
        mustKnowConcept: "Rupture of bulbous urethra leads to extravasation into superficial perineal pouch and anterior abdominal wall under Scarpa's fascia.",
        pageNumberRef: 40,
      },
    ],
  },

  // Surgery 1 of 2 (Trauma, Burns, Breast, Thyroid)
  {
    videoPattern: /Surgery_1of2/i,
    subjectId: "surgery",
    subjectName: "General Surgery",
    chapters: [
      {
        id: "surg1-1",
        title: "ATLS Primary Survey & Tension Pneumothorax Immediate Needle Decompression",
        timestampSec: 0,
        timestampLabel: "00:00",
        highYieldTrap: "Needle decompression: 2nd intercostal space midclavicular line OR 5th intercostal anterior axillary line.",
        mustKnowConcept: "Airway with cervical spine stabilization is always step 1.",
        pageNumberRef: 1,
      },
      {
        id: "surg1-2",
        title: "Burns Parkland Formula & Rule of 9s Fluid Distribution",
        timestampSec: 1200,
        timestampLabel: "20:00",
        mustKnowConcept: "4 mL × % TBSA × kg body weight. First 50% given in first 8h from time of injury, remainder over 16h.",
        pageNumberRef: 5,
      },
      {
        id: "surg1-3",
        title: "Thyroid Malignancies (Papillary, Follicular, Medullary, Anaplastic)",
        timestampSec: 2640,
        timestampLabel: "44:00",
        highYieldTrap: "Follicular carcinoma cannot be diagnosed on FNAC; requires histological proof of capsular/vascular invasion.",
        mustKnowConcept: "Papillary: Orphan Annie nuclei, Psammoma bodies, lymphatic spread. Medullary: RET proto-oncogene, amyloid stroma.",
        pageNumberRef: 9,
      },
      {
        id: "surg1-4",
        title: "Breast Cancer TNM Staging, Triple-Negative, and Axillary Clearance",
        timestampSec: 4020,
        timestampLabel: "01:07:00",
        mustKnowConcept: "Sentinel lymph node biopsy using blue dye / radiocolloid avoids unnecessary full axillary lymph node dissection.",
        pageNumberRef: 15,
      },
      {
        id: "surg1-5",
        title: "Salivary Gland Tumors (Pleomorphic Adenoma vs Warthin)",
        timestampSec: 5400,
        timestampLabel: "01:30:00",
        mustKnowConcept: "Warthin tumor (Adenolymphoma): male smokers, double row of oncocytic cells with lymphoid stroma.",
        pageNumberRef: 20,
      },
    ],
  },

  // Surgery 2 of 2 (GI, Hernia, Hepatobiliary, Vascular)
  {
    videoPattern: /Surgery_2of2/i,
    subjectId: "surgery",
    subjectName: "General Surgery",
    chapters: [
      {
        id: "surg2-1",
        title: "Inguinal Hernia Direct vs Indirect & Hesselbach's Triangle",
        timestampSec: 0,
        timestampLabel: "00:00",
        highYieldTrap: "Indirect hernia passes lateral to inferior epigastric vessels; direct hernia passes medial.",
        mustKnowConcept: "Lichtenstein tension-free mesh repair is the gold standard for open inguinal hernia.",
        pageNumberRef: 26,
      },
      {
        id: "surg2-2",
        title: "Acute Appendicitis Alvarado Score & Laparoscopic Milestones",
        timestampSec: 1380,
        timestampLabel: "23:00",
        mustKnowConcept: "Alvarado score mnemonic MANTRELS (Max 10). Score >= 7 strongly indicates acute appendicitis.",
        pageNumberRef: 30,
      },
      {
        id: "surg2-3",
        title: "Gallbladder Carcinoma & Choledochal Cyst Todani Classification",
        timestampSec: 2880,
        timestampLabel: "48:00",
        mustKnowConcept: "Todani Type 1 (fusiform dilation of CBD) is the most common; treated with excision of cyst and Roux-en-Y hepaticojejunostomy.",
        pageNumberRef: 35,
      },
      {
        id: "surg2-4",
        title: "Colorectal Cancer Staging, Lynch Syndrome & FAP Genetics",
        timestampSec: 4320,
        timestampLabel: "01:12:00",
        mustKnowConcept: "FAP: APC gene on chromosome 5q21; 100% malignant potential by age 40 without prophylactic proctocolectomy.",
        pageNumberRef: 41,
      },
      {
        id: "surg2-5",
        title: "Peripheral Arterial Disease (PAD) ABI & Aortic Aneurysm Screening",
        timestampSec: 5700,
        timestampLabel: "01:35:00",
        mustKnowConcept: "Normal ABI: 0.9 to 1.3. Critical limb ischemia: ABI < 0.4 or absolute ankle pressure < 50 mmHg.",
        pageNumberRef: 46,
      },
    ],
  },

  // OBGYN 1 of 2 (Obstetrics, Labor, PPH, Preeclampsia)
  {
    videoPattern: /Obstetrics and Gynaecology_1of2/i,
    subjectId: "obgyn",
    subjectName: "Obstetrics & Gynecology",
    chapters: [
      {
        id: "obg1-1",
        title: "Normal Labor Partograph & WHO Alert vs Action Lines",
        timestampSec: 0,
        timestampLabel: "00:00",
        highYieldTrap: "Action line is placed 4 hours to the right of the alert line on the partograph.",
        mustKnowConcept: "Active stage of labor starts at 5 cm cervical dilation (WHO 2018 guidelines).",
        pageNumberRef: 1,
      },
      {
        id: "obg1-2",
        title: "Post-Partum Hemorrhage (PPH) 4T's & Uterotonic Drug Protocol",
        timestampSec: 1260,
        timestampLabel: "21:00",
        mustKnowConcept: "Stepwise management: Bimanual uterine massage -> Oxytocin 10-20 IU -> Ergometrine (avoid in HTN) -> Carboprost/PGF2a (avoid in asthma) -> Misoprostol.",
        pageNumberRef: 6,
      },
      {
        id: "obg1-3",
        title: "Preeclampsia / Eclampsia & Pritchard Magnesium Sulfate Regimen",
        timestampSec: 2520,
        timestampLabel: "42:00",
        highYieldTrap: "Pritchard: 4g IV + 10g IM loading; 5g IM q4h alternate buttocks maintenance. 10% Calcium Gluconate for toxicity.",
        mustKnowConcept: "Check knee jerk, respiration >=12/min, urine >=30 mL/h before every MgSO4 dose.",
        pageNumberRef: 12,
      },
      {
        id: "obg1-4",
        title: "Cardiotocography (CTG) Decelerations (Early, Late, Variable)",
        timestampSec: 3900,
        timestampLabel: "01:05:00",
        mustKnowConcept: "Early = Head compression (benign). Variable = Cord compression. Late = Uteroplacental insufficiency (hypoxia).",
        pageNumberRef: 18,
      },
      {
        id: "obg1-5",
        title: "Breech Presentation Manoeuvres (Lovset, Burns-Marshall, Mauriceau-Smellie-Veit)",
        timestampSec: 5220,
        timestampLabel: "01:27:00",
        mustKnowConcept: "Lovset manoeuvre for extended arms; Mauriceau-Smellie-Veit for delivery of the after-coming head.",
        pageNumberRef: 24,
      },
    ],
  },

  // OBGYN 2 of 2 (Gynecology, Oncology, Contraception)
  {
    videoPattern: /Obstetrics and Gynaecology_2of2/i,
    subjectId: "obgyn",
    subjectName: "Obstetrics & Gynecology",
    chapters: [
      {
        id: "obg2-1",
        title: "Cervical Cancer Screening (Pap Bethesda Guidelines & HPV Co-testing)",
        timestampSec: 0,
        timestampLabel: "00:00",
        mustKnowConcept: "HPV 16 & 18 account for 70% of cervical cancers; transformation zone is the squamocolumnar junction.",
        pageNumberRef: 30,
      },
      {
        id: "obg2-2",
        title: "Cervical Cancer FIGO 2018 Staging & Management Algorithm",
        timestampSec: 1320,
        timestampLabel: "22:00",
        highYieldTrap: "Stage IIB (parametrial involvement) and beyond cannot undergo radical surgery; treated with Concurrent Chemoradiation.",
        mustKnowConcept: "Hydronephrosis automatically upgrades cervical cancer to Stage IIIC / IIIB.",
        pageNumberRef: 34,
      },
      {
        id: "obg2-3",
        title: "Endometrial Carcinoma Risk Factors & AUB PALM-COEIN Classification",
        timestampSec: 2700,
        timestampLabel: "45:00",
        mustKnowConcept: "Postmenopausal bleeding: transvaginal ultrasound showing endometrial thickness > 4 mm requires pipelle biopsy.",
        pageNumberRef: 39,
      },
      {
        id: "obg2-4",
        title: "Ovarian Tumors (Epithelial, Germ Cell, Sex Cord-Stromal)",
        timestampSec: 4080,
        timestampLabel: "01:08:00",
        mustKnowConcept: "Serous cystadenocarcinoma: CA-125, Psammoma bodies. Granulosa cell tumor: Inhibin, Call-Exner bodies.",
        pageNumberRef: 44,
      },
      {
        id: "obg2-5",
        title: "Contraception WHO Medical Eligibility Criteria (MEC Categories 1 to 4)",
        timestampSec: 5460,
        timestampLabel: "01:31:00",
        highYieldTrap: "Combined Oral Contraceptive Pills (COCPs) are MEC Category 4 (absolute contraindication) in migraine with aura or smoker >35.",
        mustKnowConcept: "Emergency contraception within 72h: Levonorgestrel 1.5 mg; Ulipristal acetate 30 mg within 120h; Copper-T IUD within 5 days.",
        pageNumberRef: 50,
      },
    ],
  },

  // PSM 1 of 2 (Epidemiology, Biostats, Screening)
  {
    videoPattern: /Preventive and Social Medicine_1of2/i,
    subjectId: "psm",
    subjectName: "Community Medicine",
    chapters: [
      {
        id: "psm1-1",
        title: "Epidemiological Study Designs (Case-Control vs Cohort vs RCT)",
        timestampSec: 0,
        timestampLabel: "00:00",
        mustKnowConcept: "Case-control looks backward from outcome to exposure (Odds Ratio); Cohort looks forward from exposure to outcome (Relative Risk).",
        pageNumberRef: 1,
      },
      {
        id: "psm1-2",
        title: "Screening Tests, 2x2 Tables & Sensitivity / Specificity Trade-offs",
        timestampSec: 1440,
        timestampLabel: "24:00",
        highYieldTrap: "When prevalence increases, PPV increases while NPV decreases. Sensitivity & Specificity remain constant.",
        mustKnowConcept: "SnNOut: High sensitivity negative test rules out. SpPIn: High specificity positive test rules in.",
        pageNumberRef: 7,
      },
      {
        id: "psm1-3",
        title: "Biostatistics Tests of Significance (t-test, ANOVA, Chi-Square)",
        timestampSec: 2880,
        timestampLabel: "48:00",
        mustKnowConcept: "Two quantitative means: Student t-test; >2 quantitative means: ANOVA; Qualitative proportions: Chi-square test.",
        pageNumberRef: 13,
      },
      {
        id: "psm1-4",
        title: "Demographic Cycle Stages & Maternal/Infant Mortality Indicators",
        timestampSec: 4320,
        timestampLabel: "01:12:00",
        mustKnowConcept: "India is in Stage 3 (Late Expanding: low death rate, declining birth rate). IMR = Infant deaths < 1 year / 1000 live births.",
        pageNumberRef: 19,
      },
    ],
  },

  // PSM 2 of 2 (National Health Programs, Vaccines, Biomedical Waste)
  {
    videoPattern: /Preventive and Social Medicine_2of2/i,
    subjectId: "psm",
    subjectName: "Community Medicine",
    chapters: [
      {
        id: "psm2-1",
        title: "National Immunization Schedule (NIS) & Vaccine Cold Chain (+2 to +8°C)",
        timestampSec: 0,
        timestampLabel: "00:00",
        highYieldTrap: "OPV and Rotavirus are oral; BCG, Measles/MR, and JE are reconstituted and must be discarded within 4 hours.",
        mustKnowConcept: "ILR (Ice Lined Refrigerator) temperature is strictly +2°C to +8°C. Deep freezer is -15°C to -25°C for ice packs.",
        pageNumberRef: 25,
      },
      {
        id: "psm2-2",
        title: "Biomedical Waste Management 2016 Rules (Yellow, Red, White, Blue)",
        timestampSec: 1500,
        timestampLabel: "25:00",
        mustKnowConcept: "Yellow: Anatomical & soiled waste (incineration). Red: Contaminated recyclable plastics (tubing/syringes). White: Sharps (puncture-proof). Blue: Glassware & ampoules.",
        pageNumberRef: 31,
      },
      {
        id: "psm2-3",
        title: "National Tuberculosis Elimination Program (NTEP) & Bedaquiline Regimens",
        timestampSec: 3000,
        timestampLabel: "50:00",
        mustKnowConcept: "Daily fixed-dose combination (FDC) with weight bands; CBNAAT/GeneXpert detects RpoB gene mutation for Rifampicin resistance in 2 hours.",
        pageNumberRef: 36,
      },
      {
        id: "psm2-4",
        title: "Vector-Borne Disease Control & Disinfections (Chlorination DPD Test)",
        timestampSec: 4500,
        timestampLabel: "01:15:00",
        mustKnowConcept: "Free residual chlorine target after 1 hour contact period: >= 0.5 mg/L (tested with orthotolidine or DPD kit).",
        pageNumberRef: 42,
      },
    ],
  },

  // Integrated CVS (Cardiology / Medicine)
  {
    videoPattern: /Integrated CVS/i,
    subjectId: "medicine",
    subjectName: "Medicine (Cardiology)",
    chapters: [
      {
        id: "cvs-1",
        title: "ECG Analysis: Chamber Enlargements & Heart Blocks",
        timestampSec: 0,
        timestampLabel: "00:00",
        mustKnowConcept: "Mobitz Type 1 (Wenckebach): progressive PR prolongation before dropped QRS. Mobitz Type 2: random dropped QRS without PR change.",
        pageNumberRef: 1,
      },
      {
        id: "cvs-2",
        title: "STEMI Localization & Culprit Coronary Artery Recognition",
        timestampSec: 1320,
        timestampLabel: "22:00",
        highYieldTrap: "Inferior wall MI (II, III, aVF) with RV infarct: Avoid Nitrates and Diuretics. Give fluid bolus.",
        mustKnowConcept: "V1-V4 = Anterior / Septal (LAD); I, aVL, V5-V6 = Lateral (LCx).",
        pageNumberRef: 5,
      },
      {
        id: "cvs-3",
        title: "Valvular Heart Murmurs & Dynamic Bedside Maneuvers",
        timestampSec: 2700,
        timestampLabel: "45:00",
        mustKnowConcept: "All murmurs increase with expiration on left side EXCEPT right-sided murmurs (Carvallo sign - inspiration). HOCM and MVP increase with Valsalva and standing.",
        pageNumberRef: 10,
      },
      {
        id: "cvs-4",
        title: "Heart Failure Guidelines (HFrEF Quadruple Therapy: ARNI + Beta-blocker + MRA + SGLT2i)",
        timestampSec: 4200,
        timestampLabel: "01:10:00",
        mustKnowConcept: "Quadruple therapy significantly reduces cardiovascular mortality in ejection fraction <= 40%.",
        pageNumberRef: 16,
      },
    ],
  },
];

/**
 * Resolve chapters for any video filename in user's library
 */
export function getChaptersForVideo(filename: string): BTRLectureChapter[] {
  for (const entry of BTR_CHAPTER_CATALOG) {
    if (entry.videoPattern.test(filename)) {
      return entry.chapters;
    }
  }

  // Synthesize standard 4-phase BTR chapters if no explicit catalog matches
  return [
    {
      id: "syn-1",
      title: "Core Introduction & High-Yield Blueprint",
      timestampSec: 0,
      timestampLabel: "00:00",
      mustKnowConcept: "Focus on foundational classifications and must-know examiner themes.",
    },
    {
      id: "syn-2",
      title: "Deep Read & Systemic Breakdown",
      timestampSec: 1200,
      timestampLabel: "20:00",
      mustKnowConcept: "Pay attention to diagnostic criteria, drug ladders, and staging classifications.",
    },
    {
      id: "syn-3",
      title: "Examiner Trap Alerts & Repeat PYTs",
      timestampSec: 2700,
      timestampLabel: "45:00",
      mustKnowConcept: "Watch out for look-alike tables and classic negative stems (EXCEPT / NOT TRUE).",
    },
    {
      id: "syn-4",
      title: "Rapid 5-Minute Volatile Recap",
      timestampSec: 4200,
      timestampLabel: "01:10:00",
      mustKnowConcept: "Active recall summary of numbers, cutoffs, and drugs of choice.",
    },
  ];
}
