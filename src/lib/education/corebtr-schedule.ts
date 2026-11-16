/**
 * Core BTR NEET-PG 2027 Master Schedule, 19-Subject Roadmap, and Super-Volatiles Vault
 * Based on Dr. Zainab Vora's high-yield curriculum (corebtr.com).
 */

export type BTRSubjectCategory =
  | "Pre-Clinical"
  | "Para-Clinical"
  | "Short Clinical"
  | "Long Clinical";

export type BTRPhaseId =
  | "phase1_foundation"
  | "phase2_bootcamp"
  | "phase3_sprint20"
  | "phase4_blitz7";

export type BTRProgressStatus =
  | "unread"
  | "in_progress"
  | "btr_annotated"
  | "td_completed"
  | "mastered";

export interface BTRSubject {
  id: string;
  name: string;
  shortCode: string;
  category: BTRSubjectCategory;
  blockNumber: 1 | 2 | 3 | 4;
  recommendedDays: number;
  highYieldPytCount: number;
  iconName: string;
  description: string;
  mustKnowTopics: string[];
  pyramidTiers: {
    tier1MustKnow: string[];
    tier2Volatile: string[];
    tier3TieBreakers: string[];
  };
}

export interface BTRSchedulePhase {
  id: BTRPhaseId;
  title: string;
  badge: string;
  dateRange: string;
  focus: string;
  strategySummary: string;
  targetDailyQuestions: number;
}

export interface BTRSubjectProgress {
  subjectId: string;
  status: BTRProgressStatus;
  hoursSpent: number;
  btrWorkbookPagesCompleted: number;
  totalWorkbookPages: number;
  lastReviewedDate?: string;
  flashcardsReviewed: number;
  qbankAccuracyPercent: number;
}

export interface BTRGrandTestRecord {
  id: string;
  title: string;
  date: string;
  totalQuestions: number;
  correctCount: number;
  incorrectCount: number;
  unattemptedCount: number;
  marksScored: number; // Correct * 4 - Incorrect * 1
  percentile: number;
  sillyMistakes: number;
  knowledgeGaps: number;
  weakSubjects: string[];
  notes?: string;
}

export interface BTRVolatileCard {
  id: string;
  subjectId: string;
  subjectName: string;
  category: BTRSubjectCategory;
  title: string;
  keyPrompt: string;
  maskedAnswer: string;
  examinerTrap: string;
  mnemonic?: string;
  highYieldScore: 1 | 2 | 3 | 4 | 5; // 5 = ultra volatile repeat
  tags: string[];
}

export const CORE_BTR_PHASES: BTRSchedulePhase[] = [
  {
    id: "phase1_foundation",
    title: "Phase 1: Foundation & Self-Study Primer",
    badge: "Nov 2026 – Jan 2027",
    dateRange: "November 16, 2026 – January 17, 2027",
    focus: "Unannotated Workbook First Pass + Base Subject Read",
    strategySummary:
      "Go through raw unannotated BTR workbooks alongside system videos. Establish daily active recall habits and build baseline question solving speed.",
    targetDailyQuestions: 60,
  },
  {
    id: "phase2_bootcamp",
    title: "Phase 2: Teaching Bootcamp & Systemic Integration",
    badge: "Jan 2027 – May 2027",
    dateRange: "January 18, 2027 – May 22, 2027",
    focus: "19-Subject Systemic Cycles + Daily T&D (Test & Discussion)",
    strategySummary:
      "Cover all 19 subjects systematically through structured blocks. Focus on integrated clinical questions, image banks, and bi-weekly full-length Grand Tests.",
    targetDailyQuestions: 100,
  },
  {
    id: "phase3_sprint20",
    title: "Phase 3: 20-Day Rapid BTR Sprint",
    badge: "May 2027 – Jun 2027",
    dateRange: "May 23, 2027 – June 12, 2027",
    focus: "High-Yield Pyramids, 5-Year PYTs & Strike Rate Boost",
    strategySummary:
      "Consolidate entire curriculum in 20 high-velocity days. Target >80% accuracy on repeat concepts and calibrate time management.",
    targetDailyQuestions: 150,
  },
  {
    id: "phase4_blitz7",
    title: "Phase 4: 7-Day Ultra-Condensation Blitz",
    badge: "Final 7 Days Pre-Exam",
    dateRange: "Final 7 Days to NEET-PG 2027",
    focus: "Super-Volatiles, Drug of Choice, Scoring Formulas & IPCs",
    strategySummary:
      "Ultra-condensed review of volatile tables: DOCs, eponymous bodies, staging systems, chromosome translocations, and IPC/BNS law sections.",
    targetDailyQuestions: 50,
  },
];

export const CORE_BTR_SUBJECTS: BTRSubject[] = [
  // Block 1: Pre-Clinical
  {
    id: "anatomy",
    name: "Anatomy & Embryology",
    shortCode: "ANAT",
    category: "Pre-Clinical",
    blockNumber: 1,
    recommendedDays: 7,
    highYieldPytCount: 95,
    iconName: "Eye",
    description: "Brachial plexus, skull base foramina, pharyngeal arches, perineum & embryology derivatives.",
    mustKnowTopics: [
      "Brachial plexus root lesions (Erb's & Klumpke's palsy)",
      "Skull foramina & cranial nerves exit pathways",
      "Pharyngeal pouches, arches, & cleft derivatives",
      "Perineal pouches and urethral injury extravasation",
      "Dermatomes landmarks (C6, T4, T10, L4, S1)",
    ],
    pyramidTiers: {
      tier1MustKnow: ["Brachial Plexus", "Cranial Foramina", "Dermatome Maps"],
      tier2Volatile: ["Pharyngeal Pouch Remnants", "Portosystemic Anastomoses"],
      tier3TieBreakers: ["Rotator Cuff Interval", "Pterygopalatine Fossa Pathways"],
    },
  },
  {
    id: "physiology",
    name: "Physiology",
    shortCode: "PHYS",
    category: "Pre-Clinical",
    blockNumber: 1,
    recommendedDays: 5,
    highYieldPytCount: 78,
    iconName: "Activity",
    description: "Cardiac cycle, oxygen dissociation curve, renal clearance, action potentials & lung volumes.",
    mustKnowTopics: [
      "Cardiac pressure-volume loops & valve murmurs",
      "Oxygen-hemoglobin dissociation curve shifts",
      "Renal counter-current multiplier and clearance formulas",
      "Nerve action potentials and refractoriness",
      "Spirometry flow-volume loops in obstructive vs restrictive patterns",
    ],
    pyramidTiers: {
      tier1MustKnow: ["Oxygen Curve Shifts", "PV Loops", "GFR & Clearances"],
      tier2Volatile: ["Sleep EEG Waveforms", "Vestibular Nystagmus Rules (COWS)"],
      tier3TieBreakers: ["Anion Gap & Winters Formula", "S-T Segment Electrophysiology"],
    },
  },
  {
    id: "biochemistry",
    name: "Biochemistry & Genetics",
    shortCode: "BIOC",
    category: "Pre-Clinical",
    blockNumber: 1,
    recommendedDays: 5,
    highYieldPytCount: 88,
    iconName: "Sparkles",
    description: "Inborn errors of metabolism, lysosomal storage diseases, vitamins, glycogen storages & enzyme kinetics.",
    mustKnowTopics: [
      "Lysosomal storage diseases (Gaucher, Tay-Sachs, Niemann-Pick, Fabry)",
      "Glycogen storage diseases (Von Gierke, Pompe, Cori, McArdle)",
      "Vitamin deficiencies (B1, B3, B12, C, D toxicity)",
      "Enzyme kinetics (Lineweaver-Burk competitive vs non-competitive)",
      "Molecular genetics (PCR, Blotting tests, Karyotyping)",
    ],
    pyramidTiers: {
      tier1MustKnow: ["Lysosomal Storage Diseases", "Vitamins & Coenzymes", "Glycogen Storage"],
      tier2Volatile: ["Urea Cycle Enzymatic Blocks", "Porphyria Cascades"],
      tier3TieBreakers: ["Lipoprotein Dislipidemias", "DNA Repair Syndromes (XP, Lynch)"],
    },
  },

  // Block 2: Para-Clinical
  {
    id: "pathology",
    name: "Pathology & Hematology",
    shortCode: "PATH",
    category: "Para-Clinical",
    blockNumber: 2,
    recommendedDays: 8,
    highYieldPytCount: 140,
    iconName: "BrainCircuit",
    description: "Chromosomal translocations, lymphoma classifications, leukemia cytology, amyloidosis, tumor markers.",
    mustKnowTopics: [
      "Chromosomal translocations (CML, Burkitt, Mantle, Follicular, APML)",
      "Histopathological bodies (Councilman, Reinke, Call-Exner, Schiller-Duval)",
      "Nephrotic vs Nephritic syndromes (PSGN, Membranous, FSGS, MPGN)",
      "Leukemia & Lymphoma IHC markers (CD15/30, CD19/20, CD3/5, TdT)",
      "Amyloidosis staining (Congo red apple-green birefringence)",
    ],
    pyramidTiers: {
      tier1MustKnow: ["Translocations in Neoplasms", "Eponymous Bodies", "Renal Biopsy Patterns"],
      tier2Volatile: ["Cluster of Differentiation (CD) Markers", "Tumor Markers"],
      tier3TieBreakers: ["Vasculitis Classifications", "Platelet Aggregometry Profiles"],
    },
  },
  {
    id: "pharmacology",
    name: "Pharmacology",
    shortCode: "PHAR",
    category: "Para-Clinical",
    blockNumber: 2,
    recommendedDays: 8,
    highYieldPytCount: 132,
    iconName: "Zap",
    description: "Drug of choice (DOC), toxicities, specific antidotes, antimicrobials, autonomic & cardiovascular drugs.",
    mustKnowTopics: [
      "Master Drug of Choice (DOC) tables across all specialties",
      "Specific antidotes (Paracetamol, Methanol, Organophosphate, Beta-blockers)",
      "Antimicrobial mechanisms, resistance & adverse effects (Gray baby, Red man)",
      "Autonomic nervous system agonists & antagonists",
      "CYP450 inducers and inhibitors interactions",
    ],
    pyramidTiers: {
      tier1MustKnow: ["Drug of Choice Tables", "Antidotes & Toxins", "Teratogenic Drugs"],
      tier2Volatile: ["Anti-Arrhythmic Classes (Vaughan-Williams)", "Anti-Epileptic Profiles"],
      tier3TieBreakers: ["Monoclonal Antibody Targets", "Immunosuppressant Pathways"],
    },
  },
  {
    id: "microbiology",
    name: "Microbiology & Parasitology",
    shortCode: "MICR",
    category: "Para-Clinical",
    blockNumber: 2,
    recommendedDays: 7,
    highYieldPytCount: 110,
    iconName: "Layers",
    description: "Bacterial toxins, culture media, viral capsid/envelopes, fungal stains, parasitic eggs & life cycles.",
    mustKnowTopics: [
      "Culture media (Lowenstein-Jensen, TCBS, Thayer-Martin, Loeffler)",
      "Stains & morphology (Ziehl-Neelsen, Albert stain, India ink)",
      "Parasite ova morphology & life cycle intermediate hosts",
      "RNA vs DNA viruses classification & capsid symmetries",
      "Opportunistic infections in HIV (CD4 cutoffs: 200, 100, 50)",
    ],
    pyramidTiers: {
      tier1MustKnow: ["Culture Media & Stains", "Parasite Eggs Morphology", "Bacterial Toxins"],
      tier2Volatile: ["HIV CD4 Infection Milestones", "Virology Genome Tables"],
      tier3TieBreakers: ["Arbovirus Vectors & Cycles", "Automated Blood Culture Tech (BACTEC)"],
    },
  },
  {
    id: "fmt",
    name: "Forensic Medicine & Toxicology",
    shortCode: "FMT",
    category: "Para-Clinical",
    blockNumber: 2,
    recommendedDays: 4,
    highYieldPytCount: 65,
    iconName: "AlertTriangle",
    description: "Post-mortem changes, asphyxia signs, firearm injuries, poisons & antidotes, Indian Penal Code sections.",
    mustKnowTopics: [
      "Post-mortem interval markers (Rigor, Livor, Algor mortis, Casper's dictum)",
      "Asphyxial deaths (Hanging vs Strangulation vs Drowning Paltauf hemorrhages)",
      "Firearm ballistic ranges (Tattooing, Scorching, Blackening)",
      "Toxicology (Dhatura vs Opioids vs Organophosphates vs Snake bites)",
      "Medicolegal IPC / BNS sections (302/103, 304A/106, 375/63, 376/64)",
    ],
    pyramidTiers: {
      tier1MustKnow: ["Post-Mortem Interval Rules", "Poison Signs & Antidotes", "Firearm Blast Signatures"],
      tier2Volatile: ["IPC & New Bharatiya Nyaya Sanhita (BNS) Laws", "Thermal Injury & Pugilistic Attitude"],
      tier3TieBreakers: ["Dentition Age Estimation Formulas", "Diatom Test for Drowning"],
    },
  },
  {
    id: "psm",
    name: "Community Medicine (PSM)",
    shortCode: "PSM",
    category: "Para-Clinical",
    blockNumber: 2,
    recommendedDays: 7,
    highYieldPytCount: 115,
    iconName: "GraduationCap",
    description: "Epidemiological study designs, biostatistics tests, National Immunization Schedule, health programs.",
    mustKnowTopics: [
      "Study designs (Case-control odds ratio vs Cohort relative risk)",
      "Biostatistics test selection (t-test, paired t-test, ANOVA, Chi-square)",
      "Screening evaluation metrics (Sensitivity, Specificity, PPV, NPV formulas)",
      "National Immunization Schedule (NIS) & vaccine cold chain storage",
      "Biomedical waste management color-coded bag allocations",
    ],
    pyramidTiers: {
      tier1MustKnow: ["Screening Metrics & 2x2 Tables", "Biomedical Waste Colors", "Immunization Schedule"],
      tier2Volatile: ["Biostat Hypotheses & Errors (Type I vs II)", "Demographic Stages & Formulas"],
      tier3TieBreakers: ["Millennium vs Sustainable Dev Goals", "Sample Size Calculations"],
    },
  },

  // Block 3: Short Clinical
  {
    id: "ent",
    name: "ENT (Otorhinolaryngology)",
    shortCode: "ENT",
    category: "Short Clinical",
    blockNumber: 3,
    recommendedDays: 3,
    highYieldPytCount: 52,
    iconName: "Flame",
    description: "Tuning fork tests, audiometry patterns, ASOM/CSOM, vestibular disorders, Little's area epistaxis.",
    mustKnowTopics: [
      "Tuning fork tests (Rinne & Weber interpretation in conductive vs sensorineural)",
      "Pure Tone Audiogram patterns (Carhart notch in Otosclerosis, 4kHz dip in NIHL)",
      "CSOM tubotympanic vs atticoantral (cholesteatoma management)",
      "Little's area (Kiesselbach plexus) arterial supplies",
      "Stridor causes in pediatric patients (Laryngomalacia omega-shaped epiglottis)",
    ],
    pyramidTiers: {
      tier1MustKnow: ["Tuning Fork & Audiometry", "Little's Area Anatomy", "Otosclerosis Features"],
      tier2Volatile: ["Laryngeal Nerve Palsy Cord Positions", "Tracheostomy Tube Types"],
      tier3TieBreakers: ["Vestibular Schwannoma Audiogram", "FESS Anatomical Landmarks"],
    },
  },
  {
    id: "ophthalmology",
    name: "Ophthalmology",
    shortCode: "OPHT",
    category: "Short Clinical",
    blockNumber: 3,
    recommendedDays: 4,
    highYieldPytCount: 68,
    iconName: "Eye",
    description: "Visual pathway defects, glaucoma drugs & gonioscopy, diabetic & hypertensive retinopathy, uveitis.",
    mustKnowTopics: [
      "Visual field defect pathways (Bitemporal hemianopia, Homonymous hemianopia)",
      "Angle closure glaucoma vs Open angle glaucoma management",
      "Diabetic retinopathy stages (NPDR vs PDR and laser photocoagulation)",
      "Retinal detachment (Rhegmatogenous vs Tractional vs Exudative)",
      "Cranial nerve 3, 4, and 6 palsies with gaze diplopia",
    ],
    pyramidTiers: {
      tier1MustKnow: ["Visual Field Defect Lesions", "Glaucoma Drug Mechanisms", "Retinopathy Stages"],
      tier2Volatile: ["Corneal Ulcer Organisms & Stains", "Cataract Surgical Milestones"],
      tier3TieBreakers: ["Retinopathy of Prematurity Stages", "Electroretinogram (ERG) Waves"],
    },
  },
  {
    id: "dermatology",
    name: "Dermatology",
    shortCode: "DERM",
    category: "Short Clinical",
    blockNumber: 3,
    recommendedDays: 3,
    highYieldPytCount: 48,
    iconName: "Sparkles",
    description: "Blistering disorders (Pemphigus vs Pemphigoid), psoriasis, leprosy, sexually transmitted diseases.",
    mustKnowTopics: [
      "Pemphigus vulgaris (flaccid, intraepidermal, Nikolsky +) vs Bullous pemphigoid (tense, subepidermal)",
      "Psoriasis plaques, Auspitz sign, Munro microabscesses",
      "Leprosy classification (Ridley-Jopling, Lepromin test, WHO MDT regimens)",
      "Genital ulcer diseases (Painful chancroid vs Painless primary chancre/syphilis)",
      "Wood's lamp fluorescence colors across infections",
    ],
    pyramidTiers: {
      tier1MustKnow: ["Blistering Autoimmune Disorders", "Psoriasis Pathognomonic Signs", "STD Ulcer Triage"],
      tier2Volatile: ["Leprosy Treatment Schemes", "Drug Eruptions (SJS / TEN SCORTEN)"],
      tier3TieBreakers: ["Darier vs Hailey-Hailey Histology", "Alopecia Areata Exclamation Marks"],
    },
  },
  {
    id: "radiology",
    name: "Radiology & Nuclear Medicine",
    shortCode: "RAD",
    category: "Short Clinical",
    blockNumber: 3,
    recommendedDays: 3,
    highYieldPytCount: 62,
    iconName: "BrainCircuit",
    description: "Classic chest X-ray and CT signs, trauma imaging FAST, MRI T1/T2 sequences, radiation safety.",
    mustKnowTopics: [
      "Classic chest signs (Hampton hump, Westermark, Batwing, Silhouette sign)",
      "Abdominal plain film & CT signs (Rigler sign, Double bubble, Coffee bean)",
      "E-FAST trauma protocol views and acoustic windows",
      "MRI T1 vs T2 vs FLAIR signal behaviors",
      "Radiation protection principles (ALARA, units: Sievert, Gray, Roentgen)",
    ],
    pyramidTiers: {
      tier1MustKnow: ["Classic Named Radiological Signs", "E-FAST Windows", "Contrast Reactions Triage"],
      tier2Volatile: ["Nuclear Medicine Scans (HIDA, MIBG, PET-CT)", "Radiation Dose Limits"],
      tier3TieBreakers: ["HRCT Lung Patterns (UIP vs NSIP)", "Interventional Stent Types"],
    },
  },
  {
    id: "psychiatry",
    name: "Psychiatry",
    shortCode: "PSYC",
    category: "Short Clinical",
    blockNumber: 3,
    recommendedDays: 3,
    highYieldPytCount: 42,
    iconName: "BrainCircuit",
    description: "Schizophrenia Schneider first-rank, depression & bipolar, defense mechanisms, substance abuse.",
    mustKnowTopics: [
      "Schneider's first rank symptoms of Schizophrenia",
      "Antipsychotic side effects (Acute dystonia, Akathisia, Tardive dyskinesia, NMS)",
      "Lithium toxicity signs, drug interactions & therapeutic window (0.8-1.2 mEq/L)",
      "Ego defense mechanisms (Splitting, Projection, Sublimation, Reaction formation)",
      "Alcohol withdrawal delirium tremens timeline and benzodiazepine management",
    ],
    pyramidTiers: {
      tier1MustKnow: ["Antipsychotic Extrapyramidal Syndromes", "Lithium Toxicity Rules", "Schneider First Rank"],
      tier2Volatile: ["Sleep Disorders & Polysomnography", "Substance Toxidromes & Antidotes"],
      tier3TieBreakers: ["Personality Disorder Clusters A/B/C", "ECT Contraindications"],
    },
  },
  {
    id: "anesthesia",
    name: "Anesthesiology",
    shortCode: "ANES",
    category: "Short Clinical",
    blockNumber: 3,
    recommendedDays: 3,
    highYieldPytCount: 44,
    iconName: "Activity",
    description: "Inhalational MAC values, neuromuscular blockers, local anesthetic toxicity (LAST), airway Mallampati.",
    mustKnowTopics: [
      "Inhalational anesthetics MAC and blood-gas partition coefficients (Nitrous, Sevoflurane, Halothane)",
      "Depolarizing (Succinylcholine hyperkalemia/malignant hyperthermia) vs Non-depolarizing relaxants",
      "Local anesthetic systemic toxicity (LAST) presentation & 20% Intralipid rescue",
      "Mallampati and Cormack-Lehane airway classification",
      "Spinal vs Epidural anesthesia anatomy and complications (Post-dural puncture headache)",
    ],
    pyramidTiers: {
      tier1MustKnow: ["Inhalational MAC & Blood:Gas", "Malignant Hyperthermia Dantrolene", "Mallampati Scores"],
      tier2Volatile: ["LAST Management Steps", "Anesthesia Machine Color Codes & Pin Index"],
      tier3TieBreakers: ["Capnography Waveform Abnormalities", "Difficult Airway Algorithm"],
    },
  },
  {
    id: "orthopedics",
    name: "Orthopedics",
    shortCode: "ORTH",
    category: "Short Clinical",
    blockNumber: 3,
    recommendedDays: 3,
    highYieldPytCount: 46,
    iconName: "Activity",
    description: "Bone tumors X-ray signs, pediatric fractures (Salter-Harris), nerve injuries in fractures, splints.",
    mustKnowTopics: [
      "Bone tumors classic X-ray (Osteosarcoma sunburst/Codman triangle, Ewing onion peel, Giant cell soap bubble)",
      "Pediatric fractures (Salter-Harris physeal injury classification)",
      "Fracture-nerve injury pairings (Humeral shaft = Radial, Supracondylar = Anterior interosseous/Median)",
      "Compartment syndrome diagnosis (Delta pressure < 30 mmHg) and fasciotomy",
      "Named splints and casts (Thomas splint, Bohler-Braun frame, Cock-up splint)",
    ],
    pyramidTiers: {
      tier1MustKnow: ["Bone Tumor Imaging Signatures", "Fracture & Nerve Associations", "Salter-Harris Types"],
      tier2Volatile: ["Compartment Syndrome Criteria", "Pediatric Hip Triage (DDH vs SCFE vs Perthes)"],
      tier3TieBreakers: ["Galeazzi vs Monteggia Fractures", "Spine Infection Potts Triad"],
    },
  },

  // Block 4: Long Clinical
  {
    id: "medicine",
    name: "General Medicine & Dermatology/Psych",
    shortCode: "MED",
    category: "Long Clinical",
    blockNumber: 4,
    recommendedDays: 10,
    highYieldPytCount: 160,
    iconName: "Stethoscope",
    description: "Cardiology ECGs, acid-base balance, neurology stroke syndromes, nephrology, endocrinology criteria.",
    mustKnowTopics: [
      "Cardiology ECG recognition (STEMI leads, Arrhythmias, Heart block stages)",
      "Acid-base disturbance step-wise analysis (Winter's formula, delta-delta gap)",
      "Stroke vascular syndromes (ACA, MCA, PCA, Lateral medullary Wallenberg)",
      "Diabetic emergencies (DKA vs HHS fluid and insulin protocols)",
      "Hypertensive emergencies vs urgencies and target organ damage management",
    ],
    pyramidTiers: {
      tier1MustKnow: ["ECG Localization of Infarction", "Acid-Base Step Algorithm", "Wallenberg Syndrome"],
      tier2Volatile: ["Endocrine Diagnostic Stimulation Tests", "Rheumatology Autoantibodies"],
      tier3TieBreakers: ["Electrolyte EKG Manifestations", "Meningitis CSF Profiles"],
    },
  },
  {
    id: "surgery",
    name: "General Surgery & Trauma",
    shortCode: "SURG",
    category: "Long Clinical",
    blockNumber: 4,
    recommendedDays: 9,
    highYieldPytCount: 145,
    iconName: "Zap",
    description: "Trauma ATLS resuscitation, burns Parkland formula, acute abdomen, breast and thyroid cancers, hernia.",
    mustKnowTopics: [
      "Trauma Primary Survey ATLS ABCDE protocol & tension pneumothorax decompression",
      "Parkland formula for burns fluid resuscitation & Wallace Rule of 9s",
      "Acute appendicitis Alvarado score and bowel obstruction X-ray signs",
      "Breast cancer TNM staging and triple-negative vs ER/PR/HER2 management",
      "Thyroid malignancies (Papillary, Follicular, Medullary RET oncogene, Anaplastic)",
    ],
    pyramidTiers: {
      tier1MustKnow: ["Parkland Burn Calculations", "ATLS Trauma Protocols", "Thyroid Carcinoma Pathologies"],
      tier2Volatile: ["Breast Cancer Surgery Types & Margins", "Gallstone Ileus & Rigler Triad"],
      tier3TieBreakers: ["Glasgow Coma Scale Scoring", "Aortic Dissection Stanford Types"],
    },
  },
  {
    id: "obgyn",
    name: "Obstetrics & Gynecology",
    shortCode: "OBG",
    category: "Long Clinical",
    blockNumber: 4,
    recommendedDays: 8,
    highYieldPytCount: 125,
    iconName: "Flame",
    description: "Labor progression partograph, CTG patterns, PPH management, cervical and ovarian cancer staging.",
    mustKnowTopics: [
      "Post-Partum Hemorrhage (PPH) 4T's protocol & Uterotonic drug ladder",
      "Cardiotocography (CTG) decelerations (Early, Variable, Late) and fetal scalp pH",
      "Preeclampsia & Eclampsia management (Magnesium sulfate Pritchard/Zuspan regimens)",
      "Cervical cancer FIGO staging and Pap smear Bethesda guidelines",
      "Contraception WHO medical eligibility criteria (MEC category 1-4)",
    ],
    pyramidTiers: {
      tier1MustKnow: ["PPH Management Ladder", "MgSO4 Toxicity & Antidote", "CTG Deceleration Interpretation"],
      tier2Volatile: ["FIGO Staging for Gynae Malignancies", "WHO Contraceptive Medical Eligibility"],
      tier3TieBreakers: ["Partograph Alert vs Action Lines", "Abnormal Uterine Bleeding PALM-COEIN"],
    },
  },
  {
    id: "pediatrics",
    name: "Pediatrics & Neonatology",
    shortCode: "PED",
    category: "Long Clinical",
    blockNumber: 4,
    recommendedDays: 6,
    highYieldPytCount: 92,
    iconName: "Sparkles",
    description: "Developmental milestones, neonatal resuscitation (NRP), congenital heart diseases, malnutrition.",
    mustKnowTopics: [
      "Developmental milestones (Gross motor, Fine motor, Speech/Language, Social)",
      "Neonatal resuscitation algorithm (APGAR score and Golden Minute ventilation)",
      "Cyanotic congenital heart diseases (Tetralogy of Fallot, TGA, TAPVC)",
      "Severe Acute Malnutrition (SAM) WHO 10-step stabilization protocol",
      "Pediatric exanthems timeline (Measles, Rubella, Roseola, Chickenpox)",
    ],
    pyramidTiers: {
      tier1MustKnow: ["Milestones Age Gates", "NRP Resuscitation Steps", "Cyanotic Heart Disease Signs"],
      tier2Volatile: ["SAM F-75 / F-100 Dietary Transitions", "Primitive Reflexes Disappearance Ages"],
      tier3TieBreakers: ["Pediatric Fluid Maintenance (Holliday-Segar)", "Immune Thrombocytopenia (ITP) Criteria"],
    },
  },
];

export const CORE_BTR_SUPER_VOLATILES: BTRVolatileCard[] = [
  // Anatomy
  {
    id: "vol-anat-1",
    subjectId: "anatomy",
    subjectName: "Anatomy",
    category: "Pre-Clinical",
    title: "Brachial Plexus Root Injury Signs",
    keyPrompt: "Erb-Duchenne Palsy involves which nerve roots, and what is the characteristic limb attitude?",
    maskedAnswer: "C5-C6 roots. Attitude: Policeman's tip / Waiter's tip (arm adducted, internally rotated, forearm pronated, wrist flexed). Loss of abductors, lateral rotators, and biceps jerk.",
    examinerTrap: "Don't confuse Erb's palsy (C5-C6) with Klumpke's palsy (C8-T1, which causes claw hand + Horner syndrome).",
    mnemonic: "Waiter's Tip = Upper trunk (C5-C6); Claw + Horner = Lower trunk (C8-T1)",
    highYieldScore: 5,
    tags: ["Brachial Plexus", "Upper Limb", "Nerve Injury"],
  },
  {
    id: "vol-anat-2",
    subjectId: "anatomy",
    subjectName: "Anatomy",
    category: "Pre-Clinical",
    title: "Skull Foramina Cranial Nerve Exits",
    keyPrompt: "Which cranial nerves pass through the Superior Orbital Fissure, Foramen Rotundum, and Foramen Ovale?",
    maskedAnswer: "Superior Orbital Fissure: CN III, IV, V1 (lacrimal, frontal, nasociliary), VI + ophthalmic veins. Foramen Rotundum: CN V2 (Maxillary). Foramen Ovale: CN V3 (Mandibular), Accessory meningeal artery, Lesser petrosal nerve, Emissary vein (MALE).",
    examinerTrap: "Mandibular nerve goes through Foramen OVALE, NOT Rotundum. Middle meningeal artery passes through Foramen Spinosum.",
    mnemonic: "Standing Room Only (V1: Superior fissure, V2: Rotundum, V3: Ovale)",
    highYieldScore: 5,
    tags: ["Skull Base", "Cranial Nerves", "Foramina"],
  },

  // Physiology
  {
    id: "vol-phys-1",
    subjectId: "physiology",
    subjectName: "Physiology",
    category: "Pre-Clinical",
    title: "Oxygen-Hemoglobin Dissociation Curve Shifts",
    keyPrompt: "What physiological changes shift the Oxygen-Hemoglobin dissociation curve to the RIGHT (facilitating O2 unloading to tissues)?",
    maskedAnswer: "CADET face Right: Increased CO2, Acidosis (low pH), increased 2,3-DPG, Exercise, increased Temperature. (Also High Altitude).",
    examinerTrap: "Fetal hemoglobin (HbF) and Carboxyhemoglobin shift the curve to the LEFT, tightly holding oxygen.",
    mnemonic: "CADET face RIGHT: CO2, Acidity, 2,3-DPG, Exercise, Temp",
    highYieldScore: 5,
    tags: ["Respiration", "Hemoglobin", "Curves"],
  },

  // Biochemistry
  {
    id: "vol-bioc-1",
    subjectId: "biochemistry",
    subjectName: "Biochemistry",
    category: "Pre-Clinical",
    title: "Cherry-Red Spot Metabolic Triage",
    keyPrompt: "Which lysosomal storage disease features a cherry-red spot in the macula WITHOUT hepatosplenomegaly?",
    maskedAnswer: "Tay-Sachs Disease (Hexosaminidase A deficiency, accumulating GM2 ganglioside). Has cherry-red spot but NO hepatosplenomegaly.",
    examinerTrap: "Niemann-Pick disease (Sphingomyelinase deficiency) HAS a cherry-red spot WITH prominent hepatosplenomegaly.",
    mnemonic: "No-man Pick his nose with a BIG liver/spleen. Tay-Sachs lacks hepato-spleno.",
    highYieldScore: 5,
    tags: ["Lysosomal Storage", "Macula", "Enzymes"],
  },

  // Pathology
  {
    id: "vol-path-1",
    subjectId: "pathology",
    subjectName: "Pathology",
    category: "Para-Clinical",
    title: "Must-Know Chromosomal Translocations",
    keyPrompt: "List the hallmark cytogenetic translocations for CML, Burkitt Lymphoma, Mantle Cell Lymphoma, Follicular Lymphoma, and APML (AML M3).",
    maskedAnswer: "CML: t(9;22) BCR-ABL1. Burkitt: t(8;14) c-MYC. Mantle Cell: t(11;14) Cyclin D1 (PRAD-1). Follicular: t(14;18) BCL-2. APML: t(15;17) PML-RARA.",
    examinerTrap: "Mantle is t(11;14) Cyclin D1. Follicular is t(14;18) BCL-2. Don't swap 11 and 18!",
    mnemonic: "Mantle = 11:14 (M comes before P), Follicular = 14:18 (F has BCL-2)",
    highYieldScore: 5,
    tags: ["Translocations", "Hematology", "Oncology"],
  },
  {
    id: "vol-path-2",
    subjectId: "pathology",
    subjectName: "Pathology",
    category: "Para-Clinical",
    title: "High-Yield Histopathology Eponymous Bodies",
    keyPrompt: "Name the diagnosis for: 1. Orphan Annie nuclei + Psammoma bodies, 2. Call-Exner bodies, 3. Schiller-Duval bodies, 4. Reinke crystals.",
    maskedAnswer: "1. Papillary Thyroid Carcinoma. 2. Granulosa Cell Tumor of Ovary (coffee-bean nuclei). 3. Yolk Sac / Endodermal Sinus Tumor (elevated AFP). 4. Leydig Cell Tumor (produces testosterone/androgens).",
    examinerTrap: "Psammoma bodies are seen in Papillary thyroid, Serous cystadenocarcinoma of ovary, Meningioma, and Mesothelioma (PSaMMoma).",
    mnemonic: "PSaMMoma: Papillary thyroid, Serous ovarian, Meningioma, Mesothelioma",
    highYieldScore: 5,
    tags: ["Histopathology", "Eponymous Bodies", "Tumors"],
  },

  // Pharmacology
  {
    id: "vol-phar-1",
    subjectId: "pharmacology",
    subjectName: "Pharmacology",
    category: "Para-Clinical",
    title: "Master Drug of Choice (DOC) Triage",
    keyPrompt: "What is the Drug of Choice for: 1. Anaphylactic shock, 2. Paroxysmal Supraventricular Tachycardia (PSVT), 3. Absence Seizure, 4. Trigeminal Neuralgia, 5. Syphilis in pregnancy?",
    maskedAnswer: "1. Anaphylaxis: Intramuscular Adrenaline (1:1000, 0.5 mg in anterolateral thigh). 2. PSVT: IV Adenosine (rapid bolus 6mg, then 12mg). 3. Absence seizure: Ethosuximide (T-type Ca2+ channel blocker). 4. Trigeminal Neuralgia: Carbamazepine. 5. Syphilis in pregnancy: Benzathine Penicillin G (desensitize if allergic).",
    examinerTrap: "In anaphylaxis, route is INTRAMUSCULAR (IM) in anterolateral thigh, NEVER subcutaneous or IV push (which can precipitate ventricular fibrillation).",
    mnemonic: "Adrenaline IM = 1:1000. Adenosine = 6mg then 12mg rapid flush.",
    highYieldScore: 5,
    tags: ["Drug of Choice", "Emergency", "Toxicology"],
  },
  {
    id: "vol-phar-2",
    subjectId: "pharmacology",
    subjectName: "Pharmacology",
    category: "Para-Clinical",
    title: "Antidotes & Reversal Agents",
    keyPrompt: "State the specific antidotes for: Methanol, Beta-blockers, Benzodiazepines, Heparin, Warfarin, and Organophosphates.",
    maskedAnswer: "Methanol: Fomepizole (inhibits alcohol dehydrogenase) or Ethanol. Beta-blockers: IV Glucagon (bypasses beta receptors to increase cAMP). Benzodiazepines: Flumazenil. Heparin: Protamine Sulfate. Warfarin: Vitamin K1 + 4-factor Prothrombin Complex Concentrate (PCC). Organophosphates: Atropine (muscarinic) + Pralidoxime/2-PAM (nicotinic acetylcholinesterase reactivator).",
    examinerTrap: "Flumazenil can trigger fatal status epilepticus in benzodiazepine-dependent patients or tricyclic antidepressant co-ingestions.",
    mnemonic: "Glucagon = G-protein rescue for Beta blockers. Protamine = Positive charge neutralizes Heparin.",
    highYieldScore: 5,
    tags: ["Antidotes", "Reversal", "Toxicology"],
  },

  // Microbiology
  {
    id: "vol-micr-1",
    subjectId: "microbiology",
    subjectName: "Microbiology",
    category: "Para-Clinical",
    title: "Selective Culture Media & Diagnostic Stains",
    keyPrompt: "Match the selective media: 1. Vibrio cholerae, 2. Corynebacterium diphtheriae, 3. Mycobacterium tuberculosis, 4. Neisseria gonorrhoeae.",
    maskedAnswer: "1. TCBS (Thiosulfate Citrate Bile Salts Sucrose - yellow colonies). 2. Loeffler's serum slope, Potassium tellurite agar (black/gray colonies), Albert stain (metachromatic volutin granules). 3. Lowenstein-Jensen (LJ) medium (rough, buff, tough colonies). 4. Thayer-Martin medium (chocolate agar + Vancomycin, Colistin, Nystatin, Trimethoprim).",
    examinerTrap: "Vibrio parahaemolyticus produces green colonies on TCBS (sucrose non-fermenter), whereas Vibrio cholerae produces yellow colonies (sucrose fermenter).",
    mnemonic: "TCBS = Yellow Cholera; Tellurite = Black Diphtheria; LJ = TB",
    highYieldScore: 5,
    tags: ["Bacteriology", "Culture Media", "Stains"],
  },

  // FMT
  {
    id: "vol-fmt-1",
    subjectId: "fmt",
    subjectName: "Forensic Medicine",
    category: "Para-Clinical",
    title: "Post-Mortem Intervals & Mortis Cascade",
    keyPrompt: "What is the typical timeline for Algor Mortis, Livor Mortis fixation, and Rigor Mortis progression according to Nysten's Law?",
    maskedAnswer: "Algor mortis: drops ~0.5-0.7°C/hr in Indian climates. Livor mortis: starts within 1-2 hours, fixes by 6-8 hours (blanching disappears). Rigor mortis: starts at 1-2 hours in small muscles (eyelids/jaw), complete by 12 hours, persists for 12 hours, disappears over next 12 hours (Nysten's Law: face -> neck -> chest -> lower limbs).",
    examinerTrap: "Cadaveric spasm is an instantaneous contraction occurring at the exact moment of death (e.g. grass clutched in drowning, weapon in suicide), needing no rigor onset.",
    mnemonic: "Rule of 12s for Rigor in temperate: 12 hrs onset, 12 hrs stays, 12 hrs passes away.",
    highYieldScore: 4,
    tags: ["Post-Mortem", "Thanatology", "Medicolegal"],
  },

  // PSM
  {
    id: "vol-psm-1",
    subjectId: "psm",
    subjectName: "Community Medicine",
    category: "Para-Clinical",
    title: "Screening Metrics & Predictive Values",
    keyPrompt: "How are Sensitivity, Specificity, Positive Predictive Value (PPV), and Negative Predictive Value (NPV) calculated in a 2x2 table? How does disease prevalence affect PPV?",
    maskedAnswer: "Sensitivity = TP / (TP + FN) [measures true disease detection]. Specificity = TN / (TN + FP) [measures true health detection]. PPV = TP / (TP + FP). NPV = TN / (TN + FN). When prevalence INCREASES, PPV increases while NPV decreases. Sensitivity and Specificity are intrinsic to the test and unaffected by prevalence.",
    examinerTrap: "Screening tests prioritize SENSITIVITY (rule out false negatives / SnNOut). Confirmatory tests prioritize SPECIFICITY (rule in disease / SpPIn).",
    mnemonic: "SnNOut: High Sensitivity Negative rules Out. SpPIn: High Specificity Positive rules In.",
    highYieldScore: 5,
    tags: ["Epidemiology", "Biostatistics", "Screening"],
  },

  // Short Clinical: ENT, Ophthal, Derma, Radio, Psych, Anesthesia, Ortho
  {
    id: "vol-ent-1",
    subjectId: "ent",
    subjectName: "ENT",
    category: "Short Clinical",
    title: "Tuning Fork Tests (Rinne & Weber)",
    keyPrompt: "What are the Rinne and Weber findings in right-sided Conductive Hearing Loss (CHL) vs right-sided Sensorineural Hearing Loss (SNHL)?",
    maskedAnswer: "Right Conductive Loss (CHL): Right ear Rinne is NEGATIVE (Bone Conduction > Air Conduction). Weber lateralizes to the AFFECTED (Right) ear. Right Sensorineural Loss (SNHL): Right ear Rinne is positive (AC > BC). Weber lateralizes to the NORMAL / BETTER (Left) ear.",
    examinerTrap: "Severe unilateral SNHL can give a 'False Negative Rinne' on the affected side due to transcranial bone conduction to the contralateral normal ear.",
    mnemonic: "Conductive = Sound stays in the bad ear (Weber to sick side). Sensorineural = Sound runs away to good ear.",
    highYieldScore: 5,
    tags: ["Audiology", "Tuning Fork", "Ear"],
  },
  {
    id: "vol-opht-1",
    subjectId: "ophthalmology",
    subjectName: "Ophthalmology",
    category: "Short Clinical",
    title: "Visual Pathway Lesions & Field Defects",
    keyPrompt: "Identify the visual field defects for lesions at: 1. Optic Chiasm, 2. Right Optic Tract, 3. Right Meyer's Loop (Temporal lobe), 4. Right Baum's Loop (Parietal lobe), 5. Occipital cortex with macular sparing.",
    maskedAnswer: "1. Optic Chiasm: Bitemporal Hemianopia (Pituitary adenoma, Craniopharyngioma). 2. Right Optic Tract: Left Homonymous Hemianopia. 3. Right Meyer's Loop (Temporal): Left Superior Quadrantanopia ('Pie in the Sky'). 4. Right Baum's Loop (Parietal): Left Inferior Quadrantanopia ('Pie on the Floor'). 5. Occipital cortex: Homonymous hemianopia with MACULAR SPARING (dual MCA/PCA blood supply).",
    examinerTrap: "Temporal lobe lesion = Superior quadrantanopia (Pie in the sky). Parietal lobe lesion = Inferior quadrantanopia (Pie on the floor).",
    mnemonic: "PITS: Parietal = Inferior, Temporal = Superior.",
    highYieldScore: 5,
    tags: ["Visual Fields", "Neuro-Ophthalmology", "Pathways"],
  },
  {
    id: "vol-derm-1",
    subjectId: "dermatology",
    subjectName: "Dermatology",
    category: "Short Clinical",
    title: "Pemphigus Vulgaris vs Bullous Pemphigoid",
    keyPrompt: "Compare Pemphigus Vulgaris and Bullous Pemphigoid regarding blister type, cleavage plane, autoantibody target, Nikolsky sign, and mucosal involvement.",
    maskedAnswer: "Pemphigus Vulgaris: Flaccid fragile bullae, intra-epidermal (suprabasal acantholysis, tombstone appearance), Desmoglein 3 & 1 antibodies, Nikolsky sign POSITIVE, extensive oral mucosal involvement. Bullous Pemphigoid: Tense tough bullae, sub-epidermal cleavage, BP180/BP230 (hemidesmosomes) antibodies, Nikolsky sign NEGATIVE, oral mucosa rarely involved.",
    examinerTrap: "Direct Immunofluorescence (DIF): Pemphigus has 'fishnet / chicken-wire' pattern (intercellular IgG). Pemphigoid has linear continuous IgG & C3 along the dermo-epidermal junction.",
    mnemonic: "Vulgaris = Vicious (flaccid, breaks easily, Nikolsky +, hurts mouth). Pemphigoid = Below (subepidermal, tense).",
    highYieldScore: 5,
    tags: ["Bullous Disorders", "Autoantibodies", "Immunofluorescence"],
  },
  {
    id: "vol-radio-1",
    subjectId: "radiology",
    subjectName: "Radiology",
    category: "Short Clinical",
    title: "Classic Chest X-Ray Signs",
    keyPrompt: "State the diagnosis for: 1. Hampton's Hump & Westermark Sign, 2. Bat-Wing / Butterfly opacities, 3. Egg-on-a-string appearance, 4. Boot-shaped heart (Coeur en sabot), 5. Snowman / Figure-of-8 heart.",
    maskedAnswer: "1. Pulmonary Thromboembolism (Hampton hump = peripheral wedge opacity; Westermark = oligemia). 2. Acute Pulmonary Edema / Cardiogenic shock. 3. Transposition of the Great Arteries (TGA). 4. Tetralogy of Fallot (RV hypertrophy upturning apex). 5. Total Anomalous Pulmonary Venous Connection (TAPVC - supracardiac).",
    examinerTrap: "Coarctation of aorta shows 'Figure-of-3 sign' on barium swallow/chest X-ray and rib notching (inferior border of 3rd to 8th ribs, sparing 1st and 2nd).",
    mnemonic: "Boot = Fallot (RV toe). Egg on string = TGA. Snowman = TAPVC.",
    highYieldScore: 5,
    tags: ["Chest Radiography", "Cardiothoracic", "Signs"],
  },
  {
    id: "vol-anes-1",
    subjectId: "anesthesia",
    subjectName: "Anesthesia",
    category: "Short Clinical",
    title: "Inhalational Anesthetic Properties & MAC",
    keyPrompt: "Rank Halothane, Isoflurane, Sevoflurane, Desflurane, and Nitrous Oxide by Minimum Alveolar Concentration (MAC) and Blood:Gas partition coefficient. Which gives the fastest induction?",
    maskedAnswer: "Potency is inversely proportional to MAC (Lower MAC = More potent). MAC values: Methoxyflurane (0.16%) > Halothane (0.75%) > Isoflurane (1.2%) > Sevoflurane (2.0%) > Desflurane (6.0%) > Nitrous oxide (104%). Induction speed is determined by Blood:Gas partition coefficient (Lowest coefficient = Fastest onset): Desflurane (0.42) > N2O (0.47) > Sevoflurane (0.69) > Isoflurane (1.4) > Halothane (2.4). Fastest induction and recovery = Desflurane.",
    examinerTrap: "Nitrous Oxide has the highest MAC (104%) so it cannot achieve surgical anesthesia on its own at 1 atm, but gives rapid induction and second gas effect.",
    mnemonic: "Blood solubility determines Speed (low solubility = fast brain equilibration). MAC determines Strength (low MAC = strong).",
    highYieldScore: 4,
    tags: ["Inhalational", "MAC", "Pharmacokinetics"],
  },
  {
    id: "vol-ortho-1",
    subjectId: "orthopedics",
    subjectName: "Orthopedics",
    category: "Short Clinical",
    title: "Fractures & Nerve Injury Pairings",
    keyPrompt: "Which nerves are injured in: 1. Fracture shaft of humerus, 2. Supracondylar fracture of humerus, 3. Fracture neck of fibula, 4. Medial epicondyle fracture, 5. Anterior shoulder dislocation?",
    maskedAnswer: "1. Shaft of humerus: Radial nerve (wrist drop). 2. Supracondylar humerus (extension type): Anterior Interosseous Nerve (AIN - inability to make 'OK' sign) or Median nerve. 3. Neck of fibula: Common Peroneal Nerve (foot drop, loss of sensation on dorsum of foot). 4. Medial epicondyle humerus: Ulnar nerve (claw hand). 5. Anterior shoulder dislocation: Axillary nerve (loss of sensation over regimental badge area of deltoid).",
    examinerTrap: "Posterior hip dislocation injures the Sciatic nerve; anterior hip dislocation injures the Femoral nerve or obturator nerve.",
    mnemonic: "Radial in spiral groove of humerus. Common Peroneal winds around neck of fibula.",
    highYieldScore: 5,
    tags: ["Fractures", "Peripheral Nerves", "Trauma"],
  },

  // Long Clinical: Medicine, Surgery, OBGYN, Pediatrics
  {
    id: "vol-med-1",
    subjectId: "medicine",
    subjectName: "Medicine",
    category: "Long Clinical",
    title: "ECG Localization of Myocardial Infarction",
    keyPrompt: "Match the ECG leads with the infarct territory and culprit coronary artery: II, III, aVF; V1-V2; V3-V4; V5-V6, I, aVL.",
    maskedAnswer: "II, III, aVF: Inferior wall MI (Right Coronary Artery - RCA in 90% dominant circulation; look for RV infarct with V4R). V1-V2: Septal wall (Left Anterior Descending - LAD branch). V3-V4: Anterior wall (LAD). V5-V6, I, aVL: Lateral wall (Left Circumflex Artery - LCx or diagonal LAD). Leads I and aVL specifically reflect High Lateral MI.",
    examinerTrap: "In Inferior wall MI with RV infarction, NITROGLYCERIN and DIURETICS are CONTRAINDICATED as they drop preload and precipitate refractory cardiogenic shock. Give IV normal saline bolus.",
    mnemonic: "SAL-I: Septal (V1-2), Anterior (V3-4), Lateral (V5-6), Inferior (II, III, aVF).",
    highYieldScore: 5,
    tags: ["Cardiology", "ECG", "Coronary"],
  },
  {
    id: "vol-surg-1",
    subjectId: "surgery",
    subjectName: "Surgery",
    category: "Long Clinical",
    title: "Parkland Formula & Wallace Rule of 9s",
    keyPrompt: "What is the Parkland Formula fluid calculation for burn resuscitation in the first 24 hours, and how is it distributed across hours?",
    maskedAnswer: "Parkland Formula: Total Ringer's Lactate (RL) = 4 mL × % Total Body Surface Area (TBSA) burned (second & third degree only) × Body Weight (kg). Distribution: Give first 50% of calculated volume in first 8 HOURS FROM TIME OF INJURY (not time of arrival). Give remaining 50% over the subsequent 16 hours. Target urine output: 0.5 to 1.0 mL/kg/hr in adults.",
    examinerTrap: "Superficial first-degree burns (erythema only, like sunburn) are NOT included in the % TBSA calculation. Clock starts from TIME OF BURN INJURY.",
    mnemonic: "4 × % TBSA × kg. Half in 8h, remainder in 16h.",
    highYieldScore: 5,
    tags: ["Burns", "Resuscitation", "Parkland Formula"],
  },
  {
    id: "vol-obg-1",
    subjectId: "obgyn",
    subjectName: "Obstetrics & Gynecology",
    category: "Long Clinical",
    title: "PPH Management & Magnesium Sulfate Regimens",
    keyPrompt: "What are the 4 T's of Post-Partum Hemorrhage? What is the Pritchard Regimen for Magnesium Sulfate in Eclampsia, and what is the toxicity antidote?",
    maskedAnswer: "4 T's: Tone (Atony - 70-80% most common), Trauma (lacerations/rupture), Tissue (retained placenta), Thrombin (coagulopathy). Pritchard Regimen for MgSO4: Loading dose = 4g IV (20% solution over 5-10 min) + 10g IM (50% solution, 5g in each buttock). Maintenance dose = 5g IM (50% solution) every 4 hours in alternate buttocks, continued for 24 hours postpartum or after last fit. MgSO4 toxicity signs: Loss of patellar knee jerk (1st sign) -> Respiratory depression (<12/min) -> Cardiac arrest. Antidote: 10 mL of 10% Calcium Gluconate IV slow push over 10 minutes.",
    examinerTrap: "Before every maintenance dose of MgSO4, 3 clinical checks MUST be confirmed: 1. Patellar reflex present, 2. Respiratory rate ≥ 12/min, 3. Urine output ≥ 30 mL/hr.",
    mnemonic: "Pritchard: 4g IV + 10g IM (5g + 5g), then 5g IM q4h. Antidote: 10mL of 10% Calcium Gluconate.",
    highYieldScore: 5,
    tags: ["Obstetrics", "PPH", "Eclampsia", "MgSO4"],
  },
  {
    id: "vol-ped-1",
    subjectId: "pediatrics",
    subjectName: "Pediatrics",
    category: "Long Clinical",
    title: "Developmental Milestone Milestones",
    keyPrompt: "At what age does a child achieve: 1. Neck holding, 2. Sitting without support, 3. Walking without support, 4. Pincer grasp, 5. 2-word meaningful sentences, 6. Tower of 6 cubes, 7. Riding a tricycle?",
    maskedAnswer: "1. Neck holding: 3 months. 2. Sitting without support: 8 months (with support at 6 months). 3. Walking alone: 12-15 months. 4. Mature pincer grasp: 12 months (immature at 9 months). 5. Two-word meaningful phrase: 2 years (24 months). 6. Tower of 6 cubes: 2 years (number of cubes = age in years × 3). 7. Riding a tricycle: 3 years (36 months).",
    examinerTrap: "Social smile appears at 2 months; stranger anxiety appears at 6-7 months. Disappearance of primitive reflexes: Moro disappears by 4-6 months; Babinski is normal up to 1-2 years.",
    mnemonic: "Cube tower = Age × 3 (18m = 3 cubes, 24m = 6 cubes, 36m = 9 cubes). Tricycle = 3 wheels = 3 years.",
    highYieldScore: 5,
    tags: ["Development", "Milestones", "Neonatology"],
  },
];

// Local Storage Keys
const STORAGE_KEY_PROGRESS = "argus_corebtr_progress_v1";
const STORAGE_KEY_GTS = "argus_corebtr_gt_records_v1";

/**
 * Load 19-Subject Progress from local storage
 */
export function loadBTRSubjectProgress(): Record<string, BTRSubjectProgress> {
  const getDefaultProgress = () => {
    const initial: Record<string, BTRSubjectProgress> = {};
    for (const subj of CORE_BTR_SUBJECTS) {
      initial[subj.id] = {
        subjectId: subj.id,
        status: "unread",
        hoursSpent: 0,
        btrWorkbookPagesCompleted: 0,
        totalWorkbookPages: 60,
        flashcardsReviewed: 0,
        qbankAccuracyPercent: 0,
      };
    }
    return initial;
  };

  try {
    if (typeof localStorage === "undefined" || !localStorage?.getItem) {
      return getDefaultProgress();
    }
    const raw = localStorage.getItem(STORAGE_KEY_PROGRESS);
    if (!raw) {
      return getDefaultProgress();
    }
    return JSON.parse(raw);
  } catch {
    return getDefaultProgress();
  }
}

/**
 * Save 19-Subject Progress to local storage
 */
export function saveBTRSubjectProgress(progress: Record<string, BTRSubjectProgress>): void {
  try {
    if (typeof localStorage !== "undefined" && localStorage?.setItem) {
      localStorage.setItem(STORAGE_KEY_PROGRESS, JSON.stringify(progress));
    }
  } catch (e) {
    console.error("Failed to persist BTR subject progress", e);
  }
}

/**
 * Update single subject status
 */
export function updateBTRSubjectStatus(
  subjectId: string,
  updates: Partial<BTRSubjectProgress>
): Record<string, BTRSubjectProgress> {
  const current = loadBTRSubjectProgress();
  const existing = current[subjectId] || {
    subjectId,
    status: "unread",
    hoursSpent: 0,
    btrWorkbookPagesCompleted: 0,
    totalWorkbookPages: 60,
    flashcardsReviewed: 0,
    qbankAccuracyPercent: 0,
  };
  current[subjectId] = { ...existing, ...updates };
  saveBTRSubjectProgress(current);
  return current;
}

/**
 * Load Grand Test (GT) records
 */
export function loadBTRGrandTestRecords(): BTRGrandTestRecord[] {
  const defaultStarter: BTRGrandTestRecord[] = [
    {
      id: "gt-baseline",
      title: "Pre-Bootcamp Baseline GT 01",
      date: "2026-11-10",
      totalQuestions: 200,
      correctCount: 132,
      incorrectCount: 56,
      unattemptedCount: 12,
      marksScored: 132 * 4 - 56, // 472 / 800
      percentile: 78.4,
      sillyMistakes: 18,
      knowledgeGaps: 38,
      weakSubjects: ["Pathology", "Biochemistry", "PSM"],
      notes: "Need faster second pass. Volatiles in Pharmacology and translocations slipped.",
    },
  ];

  try {
    if (typeof localStorage === "undefined" || !localStorage?.getItem) {
      return defaultStarter;
    }
    const raw = localStorage.getItem(STORAGE_KEY_GTS);
    if (!raw) {
      return defaultStarter;
    }
    return JSON.parse(raw);
  } catch {
    return defaultStarter;
  }
}

/**
 * Save Grand Test (GT) record
 */
export function saveBTRGrandTestRecord(record: BTRGrandTestRecord): BTRGrandTestRecord[] {
  try {
    const current = loadBTRGrandTestRecords();
    const filtered = current.filter((r) => r.id !== record.id);
    const updated = [record, ...filtered];
    if (typeof localStorage !== "undefined" && localStorage?.setItem) {
      localStorage.setItem(STORAGE_KEY_GTS, JSON.stringify(updated));
    }
    return updated;
  } catch (e) {
    console.error("Failed to save GT record", e);
    return [];
  }
}

/**
 * Delete Grand Test (GT) record
 */
export function deleteBTRGrandTestRecord(id: string): BTRGrandTestRecord[] {
  try {
    const current = loadBTRGrandTestRecords();
    const updated = current.filter((r) => r.id !== id);
    if (typeof localStorage !== "undefined" && localStorage?.setItem) {
      localStorage.setItem(STORAGE_KEY_GTS, JSON.stringify(updated));
    }
    return updated;
  } catch {
    return [];
  }
}

/**
 * Calculate countdown metrics for NEET-PG 2027 and INI-CET May 2027
 */
export function calculateExamCountdowns(targetNow?: Date): {
  neetPg: { days: number; hours: number; targetDateStr: string };
  iniCetMay: { days: number; hours: number; targetDateStr: string };
} {
  const now = targetNow || new Date();

  // Scheduled dates: INI-CET May 2027 (approx May 16, 2027) & NEET-PG 2027 (approx June 20, 2027)
  const neetPgTarget = new Date("2027-06-20T09:00:00+05:30");
  const iniCetTarget = new Date("2027-05-16T09:00:00+05:30");

  const diffNeet = Math.max(0, neetPgTarget.getTime() - now.getTime());
  const diffInicet = Math.max(0, iniCetTarget.getTime() - now.getTime());

  return {
    neetPg: {
      days: Math.floor(diffNeet / (1000 * 60 * 60 * 24)),
      hours: Math.floor((diffNeet % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
      targetDateStr: "June 20, 2027",
    },
    iniCetMay: {
      days: Math.floor(diffInicet / (1000 * 60 * 60 * 24)),
      hours: Math.floor((diffInicet % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
      targetDateStr: "May 16, 2027",
    },
  };
}

/**
 * Calculate readiness metrics across all 19 subjects
 */
export function calculateOverallReadiness(progressMap: Record<string, BTRSubjectProgress>): {
  masteredCount: number;
  annotatedCount: number;
  inProgressCount: number;
  unreadCount: number;
  completionPercentage: number;
  totalHoursLogged: number;
} {
  let masteredCount = 0;
  let annotatedCount = 0;
  let inProgressCount = 0;
  let unreadCount = 0;
  let totalHoursLogged = 0;

  for (const subj of CORE_BTR_SUBJECTS) {
    const p = progressMap[subj.id];
    if (!p || p.status === "unread") {
      unreadCount++;
    } else if (p.status === "in_progress") {
      inProgressCount++;
      totalHoursLogged += p.hoursSpent || 0;
    } else if (p.status === "btr_annotated" || p.status === "td_completed") {
      annotatedCount++;
      totalHoursLogged += p.hoursSpent || 0;
    } else if (p.status === "mastered") {
      masteredCount++;
      totalHoursLogged += p.hoursSpent || 0;
    }
  }

  // Weight: Mastered = 1.0, Annotated/TD = 0.75, InProgress = 0.35, Unread = 0
  const score =
    (masteredCount * 1.0 + annotatedCount * 0.75 + inProgressCount * 0.35) /
    CORE_BTR_SUBJECTS.length;
  const completionPercentage = Math.round(score * 100);

  return {
    masteredCount,
    annotatedCount,
    inProgressCount,
    unreadCount,
    completionPercentage,
    totalHoursLogged,
  };
}
