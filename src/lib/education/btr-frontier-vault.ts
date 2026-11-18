/**
 * CoreBTR Top-100 Frontier Tie-Breakers Vault
 *
 * The 250 ultra-volatile, rank-deciding concepts that separate AIR < 100 from Rank 2,500:
 * - 2023-2025 Revised Guidelines (FIGO 2023, BNS 2024, KDIGO 2024, GOLD 2024)
 * - Micro-Biostatistics & Diagnostic Decision Formulas
 * - Chromosomal Translocations & Molecular Cytogenetics
 * - Toxicological Antidotes & Rare Drug of Choice (DOC)
 * - Clinical Diagnostic Scoring Thresholds
 */

export interface FrontierFact {
  id: string;
  category: "Guidelines_2024" | "Biostatistics" | "Cytogenetics" | "Antidotes_DOC" | "Scores_Thresholds";
  title: string;
  mustKnowPill: string;
  clinicalContext: string;
  examinerTrap: string;
  formulaOrValue?: string;
  tags: string[];
}

export const TOP_100_FRONTIER_VAULT: FrontierFact[] = [
  // 1. Revised Guidelines & Legal Sections
  {
    id: "ff-bns-01",
    category: "Guidelines_2024",
    title: "BNS vs IPC: Medical Negligence & Criminal Law",
    mustKnowPill: "Section 106(1) BNS replaces IPC 304A for Medical Negligence",
    clinicalContext:
      "Under Bharatiya Nyaya Sanhita (BNS 2023/2024), causing death by negligence is Section 106. Medical practitioners registered with NMC have a specific proviso with reduced maximum imprisonment of 2 years (compared to 5 years for rash driving).",
    examinerTrap: "Old questions test IPC 304A. In current exams, Section 106(1) BNS is the key answer.",
    tags: ["FMT", "BNS", "IPC", "Medical Law"],
  },
  {
    id: "ff-bns-02",
    category: "Guidelines_2024",
    title: "BNS vs IPC: Rape & Assault Sections",
    mustKnowPill: "Section 64 BNS replaces IPC 376 (Rape); Section 115 BNS replaces IPC 323 (Voluntarily causing hurt)",
    clinicalContext:
      "Section 64 is basic rape. Section 70 is gang rape (replaces IPC 376D). Section 65 deals with rape of a woman under 16/12 years.",
    examinerTrap: "Examiners confuse Section 64 (Rape) with Section 69 (Sexual intercourse by deceitful means / false promise of marriage).",
    tags: ["FMT", "BNS", "IPC"],
  },
  {
    id: "ff-figo-01",
    category: "Guidelines_2024",
    title: "FIGO 2023 Endometrial Cancer Staging Revision",
    mustKnowPill: "Molecular Subtypes (POLE mut, MMRd, p53 abn) now dictate Stage I-IV Upstaging/Downstaging",
    clinicalContext:
      "POLE ultramutated tumors are downstaged to Stage I even with deep myometrial invasion. p53 abnormal (mutant) tumors are upstaged directly to Stage IIC even if confined to endometrium.",
    examinerTrap: "Examiners test whether you know POLE mut has an exceptionally favorable prognosis regardless of histology grade.",
    tags: ["OBGYN", "FIGO 2023", "Oncology"],
  },
  {
    id: "ff-kdigo-01",
    category: "Guidelines_2024",
    title: "KDIGO 2024 CKD Classification & SGLT2i Initiation Threshold",
    mustKnowPill: "SGLT2 inhibitors indicated in CKD down to eGFR >= 20 mL/min/1.73m² with UACR >= 200 mg/g",
    clinicalContext:
      "Dapagliflozin and Empagliflozin can be initiated down to eGFR 20. Once started, they can be continued until dialysis/transplantation even if eGFR drops below 20.",
    examinerTrap: "Old guideline stopped SGLT2i at eGFR 30. KDIGO 2024 lowered initiation cutoff to 20.",
    formulaOrValue: "eGFR >= 20 mL/min/1.73m²",
    tags: ["Medicine", "Nephrology", "KDIGO 2024"],
  },

  // 2. Micro-Biostatistics & Calculations
  {
    id: "ff-stat-01",
    category: "Biostatistics",
    title: "Positive & Negative Likelihood Ratios (LR+ & LR-)",
    mustKnowPill: "LR+ = Sensitivity / (1 - Specificity); LR- = (1 - Sensitivity) / Specificity",
    clinicalContext:
      "LR > 10 or LR < 0.1 generates large conclusive shifts from pre-test to post-test probability. Likelihood ratios are independent of disease prevalence.",
    examinerTrap: "Examiners swap the denominator. Remember: LR+ has False Positive Rate in denominator; LR- has Specificity in denominator.",
    formulaOrValue: "LR+ = Sens / (1 - Spec); LR- = (1 - Sens) / Spec",
    tags: ["PSM", "Biostatistics", "High-Yield"],
  },
  {
    id: "ff-stat-02",
    category: "Biostatistics",
    title: "Number Needed to Treat (NNT)",
    mustKnowPill: "NNT = 1 / Absolute Risk Reduction (ARR); Always round UP to next whole number",
    clinicalContext:
      "ARR = Event Rate in Control (CER) - Event Rate in Treatment (EER). If ARR is 0.04 (4%), NNT = 1 / 0.04 = 25.",
    examinerTrap: "Do NOT confuse ARR with Relative Risk Reduction (RRR = ARR / CER). NNT uses ARR in denominator.",
    formulaOrValue: "NNT = 1 / ARR = 1 / (CER - EER)",
    tags: ["PSM", "Biostatistics"],
  },
  {
    id: "ff-stat-03",
    category: "Biostatistics",
    title: "Post-Test Odds & Fagan Nomogram Conversion",
    mustKnowPill: "Post-test Odds = Pre-test Odds × Likelihood Ratio; Odds = Prob / (1 - Prob)",
    clinicalContext:
      "To find post-test probability: convert pre-test probability to odds -> multiply by LR -> convert back to probability (Prob = Odds / (1 + Odds)).",
    examinerTrap: "You CANNOT multiply probability directly by Likelihood Ratio. You must convert probability to odds first.",
    formulaOrValue: "Pre-Odds = P / (1-P) -> Post-Odds = Pre-Odds * LR -> Post-P = Odds / (1+Odds)",
    tags: ["PSM", "Biostatistics"],
  },

  // 3. Cytogenetics & Chromosomal Translocations
  {
    id: "ff-cyto-01",
    category: "Cytogenetics",
    title: "t(15;17)(q22;q21) - Acute Promyelocytic Leukemia (APML)",
    mustKnowPill: "PML-RARA fusion; Auer rods in bundles (Faggot cells); DOC is ATRA (Tretinoin) + Arsenic Trioxide",
    clinicalContext:
      "High risk of early DIC. RARA receptor is blocked, halting myeloid maturation at promyelocyte stage. ATRA forces differentiation.",
    examinerTrap: "Commonest complication of ATRA therapy is Differentiation Syndrome (fever, pulmonary infiltrates, pleural effusion), treated with Dexamethasone.",
    tags: ["Pathology", "Hematology", "Genetics"],
  },
  {
    id: "ff-cyto-02",
    category: "Cytogenetics",
    title: "t(11;14)(q13;q32) - Mantle Cell Lymphoma",
    mustKnowPill: "Cyclin D1 (CCND1) overexpression over IgH locus; CD5+, CD23- (vs CLL which is CD5+, CD23+)",
    clinicalContext:
      "Presents with lymphomatous polyposis in gastrointestinal tract. Cyclin D1 promotes G1 to S phase cell cycle transition.",
    examinerTrap: "CD5/CD23 distinction: Mantle cell is CD5+ CD23 negative. CLL/SLL is CD5+ CD23 positive.",
    tags: ["Pathology", "Hematology", "Lymphoma"],
  },
  {
    id: "ff-cyto-03",
    category: "Cytogenetics",
    title: "t(14;18)(q32;q21) - Follicular Lymphoma",
    mustKnowPill: "BCL-2 overexpression over IgH locus; Inhibits intrinsic apoptosis pathway",
    clinicalContext:
      "Painless waxing and waning generalized lymphadenopathy. Germinal centers lack tingible body macrophages and mantle zones.",
    examinerTrap: "Follicular lymphoma can transform to Diffuse Large B-cell Lymphoma (Richter-like transformation).",
    tags: ["Pathology", "Hematology", "Lymphoma"],
  },
  {
    id: "ff-cyto-04",
    category: "Cytogenetics",
    title: "t(8;14)(q24;q32) - Burkitt Lymphoma",
    mustKnowPill: "c-MYC proto-oncogene over IgH; 'Starry sky' histology with macrophages clearing apoptotic debris",
    clinicalContext:
      "EBV associated (100% in endemic African jaw variant, 30% in sporadic abdominal variant). High Ki-67 index near 100%.",
    examinerTrap: "Variant translocations: t(2;8) [kappa light chain] and t(8;22) [lambda light chain]. c-MYC on chromosome 8 is the constant feature.",
    tags: ["Pathology", "Hematology", "Lymphoma"],
  },

  // 4. Toxicological Antidotes & Rare Drug of Choice (DOC)
  {
    id: "ff-anti-01",
    category: "Antidotes_DOC",
    title: "Sulfonylurea-Induced Refractory Hypoglycemia",
    mustKnowPill: "DOC is Octreotide (Somatostatin analog); Inhibits glucose-stimulated insulin release from beta cells",
    clinicalContext:
      "Giving IV dextrose alone in sulfonylurea overdose paradoxically triggers more insulin release. Octreotide shuts down insulin exocytosis.",
    examinerTrap: "Giving Glucagon is ineffective in sulfonylurea overdose because glycogen stores are depleted and insulin secretion surges.",
    tags: ["Pharmacology", "Toxicology", "Endocrine"],
  },
  {
    id: "ff-anti-02",
    category: "Antidotes_DOC",
    title: "Beta-Blocker Toxicity Antidote",
    mustKnowPill: "DOC is IV Glucagon; Bypasses beta receptors to stimulate Adenylyl Cyclase via Gs, raising cAMP",
    clinicalContext:
      "Presents with severe bradycardia, hypotension, and cardiogenic shock refractory to atropine and fluids.",
    examinerTrap: "High-dose insulin euglycemia therapy (HIET) is the second-line co-therapy if glucagon is unavailable.",
    tags: ["Pharmacology", "Toxicology", "Cardiology"],
  },
  {
    id: "ff-anti-03",
    category: "Antidotes_DOC",
    title: "Methemoglobinemia Antidote",
    mustKnowPill: "DOC is Methylene Blue (1-2 mg/kg IV); Reducer using NADPH-dependent methemoglobin reductase",
    clinicalContext:
      "Triggered by Dapsone, local anesthetics (benzocaine, prilocaine), nitrites, sulfonamides. Chocolate-brown arterial blood.",
    examinerTrap: "Methylene blue is CONTRAINDICATED in patients with G6PD deficiency (can precipitate hemolytic anemia). Use Vitamin C (ascorbic acid) instead.",
    tags: ["Pharmacology", "Toxicology", "Hematology"],
  },
  {
    id: "ff-anti-04",
    category: "Antidotes_DOC",
    title: "Methanol & Ethylene Glycol Poisoning",
    mustKnowPill: "DOC is Fomepizole; Competitive inhibitor of Alcohol Dehydrogenase (ADH)",
    clinicalContext:
      "Methanol causes optic disc hyperemia and 'snowfield' blindness via formic acid. Ethylene glycol causes calcium oxalate kidney stones via oxalic acid.",
    examinerTrap: "Ethanol can be used as an alternative competitor for ADH if Fomepizole is unavailable.",
    tags: ["Pharmacology", "Toxicology"],
  },

  // 5. Clinical Diagnostic Scoring Thresholds
  {
    id: "ff-score-01",
    category: "Scores_Thresholds",
    title: "Modified Duke Criteria for Infective Endocarditis (2023 Revision)",
    mustKnowPill: "Major: Positive blood culture (2 typical or persistent), Positive imaging (Echo, Cardiac CT, PET-CT), Surgical inspection",
    clinicalContext:
      "Definite IE requires: 2 Major, OR 1 Major + 3 Minor, OR 5 Minor criteria. PET-CT is now explicitly recognized as an imaging major criterion.",
    examinerTrap: "Minor criteria mnemonic: FROM JANE (Fever, Roth spots, Osler nodes, Murmur, Janeway lesions, Arterial emboli, Nephritis, Echo findings not meeting major).",
    tags: ["Medicine", "Cardiology", "Infective Endocarditis"],
  },
  {
    id: "ff-score-02",
    category: "Scores_Thresholds",
    title: "Revised Jones Criteria 2015 for Rheumatic Fever",
    mustKnowPill: "Subdivided into Low-Risk vs Moderate/High-Risk populations. Polyarthralgia is now a MAJOR criterion in moderate/high risk.",
    clinicalContext:
      "In India (moderate/high risk population), subclinical carditis (detected only on echo) and monoarthritis or polyarthralgia can count toward diagnosis.",
    examinerTrap: "In low-risk populations, only Polyarthritis counts as Major. In high-risk populations, even Monoarthritis is Major.",
    tags: ["Pediatrics", "Cardiology", "Rheumatic Fever"],
  },

  // 6. Additional Guidelines & Sepsis Bundles
  {
    id: "ff-gold-01",
    category: "Guidelines_2024",
    title: "GOLD 2024 COPD Group ABE Classification",
    mustKnowPill: "Group E replaces old C and D: any patient with >= 2 moderate exacerbations or >= 1 hospitalization belongs to Group E (LABA + LAMA initial)",
    clinicalContext:
      "GOLD eliminated Groups C and D to highlight that exacerbation risk is paramount. Group E patients receive dual bronchodilation (LABA + LAMA). Inhaled corticosteroids (ICS) added only if blood eosinophils >= 300 cells/uL.",
    examinerTrap: "Do NOT start ICS alone in COPD. ICS is always combined with LABA/LAMA and indicated strictly when blood eosinophils >= 300.",
    tags: ["Medicine", "Pulmonology", "GOLD 2024"],
  },
  {
    id: "ff-sepsis-01",
    category: "Guidelines_2024",
    title: "Surviving Sepsis Campaign 1-Hour Bundle",
    mustKnowPill: "30 mL/kg IV crystalloid within 3 hours for hypotension or Lactate >= 4.0; First-line vasopressor is Norepinephrine (MAP target >= 65 mmHg)",
    clinicalContext:
      "Bundle components to initiate within 1 hour: measure lactate, blood cultures before antibiotics, broad-spectrum IV antimicrobials, 30 mL/kg crystalloids, and start Norepinephrine if MAP < 65.",
    examinerTrap: "Dopamine is NO LONGER first-line in septic shock due to tachyarrhythmias. Norepinephrine is the definitive first choice.",
    formulaOrValue: "30 mL/kg Crystalloid • MAP >= 65 mmHg",
    tags: ["Medicine", "Critical Care", "Sepsis"],
  },

  // 7. Additional Biostatistics Rank Deciders
  {
    id: "ff-stat-04",
    category: "Biostatistics",
    title: "Prevalence Effects on Predictive Values (PPV vs NPV)",
    mustKnowPill: "When Prevalence increases: PPV increases, NPV decreases; Sensitivity and Specificity remain UNCHANGED",
    clinicalContext:
      "Positive Predictive Value (PPV) is directly proportional to pre-test disease prevalence. In contrast, Sensitivity and Specificity are intrinsic diagnostic test properties independent of prevalence.",
    examinerTrap: "Examiners falsely state that Sensitivity changes when applied to a high-prevalence screening population. Sensitivity is constant.",
    tags: ["PSM", "Biostatistics"],
  },
  {
    id: "ff-stat-05",
    category: "Biostatistics",
    title: "Relative Risk (RR) vs Odds Ratio (OR) Rare Disease Assumption",
    mustKnowPill: "Odds Ratio approximates Relative Risk when disease incidence is rare (< 5%) in the population",
    clinicalContext:
      "Cohort studies calculate Relative Risk (Incidence in exposed / Incidence in unexposed). Case-Control studies cannot calculate incidence, so they calculate Odds Ratio (ad / bc).",
    examinerTrap: "In common diseases (> 10% incidence), the Odds Ratio significantly overestimates the Relative Risk.",
    formulaOrValue: "OR = (a*d) / (b*c); RR = [a/(a+b)] / [c/(c+d)]",
    tags: ["PSM", "Biostatistics"],
  },

  // 8. Additional Cytogenetics & Oncology Translocations
  {
    id: "ff-cyto-05",
    category: "Cytogenetics",
    title: "t(9;22)(q34;q11) - Philadelphia Chromosome (BCR-ABL1)",
    mustKnowPill: "Produces p210 oncoprotein in CML (p190 in ALL); DOC is Imatinib (Tyrosine Kinase Inhibitor)",
    clinicalContext:
      "Results from fusion of ABL1 on chromosome 9 with BCR on chromosome 22. Constitutive BCR-ABL tyrosine kinase promotes uncontrolled granulopoiesis.",
    examinerTrap: "T315I mutation in BCR-ABL confers resistance to Imatinib, Dasatinib, and Nilotinib; requires Ponatinib or Asciminib.",
    tags: ["Pathology", "Hematology", "CML"],
  },
  {
    id: "ff-cyto-06",
    category: "Cytogenetics",
    title: "t(11;22)(q24;q12) - Ewing Sarcoma",
    mustKnowPill: "EWSR1-FLI1 gene fusion; Small round blue cells with CD99 / MIC2 membranous positivity and PAS glycogen positivity",
    clinicalContext:
      "Arises in diaphysis of long bones in young boys. Onion-skin periosteal reaction on radiograph.",
    examinerTrap: "Examiners confuse Ewing Sarcoma (t(11;22)) with Synovial Sarcoma (t(X;18)) and Alveolar Rhabdomyosarcoma (t(2;13)).",
    tags: ["Pathology", "Orthopedics", "Sarcoma"],
  },
  {
    id: "ff-cyto-07",
    category: "Cytogenetics",
    title: "BRAF V600E Mutation Spectrum",
    mustKnowPill: "Found in Papillary Thyroid Carcinoma (tall cell variant), Melanoma, Hairy Cell Leukemia (100%), and LCH",
    clinicalContext:
      "Constitutively activates MAPK/ERK pathway. Targeted therapy combines BRAF inhibitors (Vemurafenib, Dabrafenib) with MEK inhibitors (Trametinib).",
    examinerTrap: "In Follicular thyroid carcinoma, RAS mutations and PAX8-PPARG translocations dominate, NOT BRAF.",
    tags: ["Pathology", "Genetics", "Oncology"],
  },

  // 9. Additional Antidotes & Rare DOCs
  {
    id: "ff-anti-05",
    category: "Antidotes_DOC",
    title: "Digoxin Toxicity & Specific Antidote",
    mustKnowPill: "DOC is Digoxin-Specific Fab fragments (DigiFab); Indications include Serum K+ > 5.0 mEq/L and lethal arrhythmias",
    clinicalContext:
      "Inhibition of Na+/K+ ATPase leads to hyperkalemia and ventricular arrhythmias (bidirectional VT is pathognomonic). Visual xanthopsia (yellow-green halos).",
    examinerTrap: "Calcium gluconate is CONTRAINDICATED in digoxin toxicity ('stone heart' arrest due to intracellular hypercalcemia).",
    tags: ["Pharmacology", "Toxicology", "Cardiology"],
  },
  {
    id: "ff-anti-06",
    category: "Antidotes_DOC",
    title: "Cyanide Poisoning Antidote Protocol",
    mustKnowPill: "DOC is Hydroxocobalamin (forms Cyanocobalamin / Vitamin B12 excreted in urine); Alternative: Sodium Nitrite + Sodium Thiosulfate",
    clinicalContext:
      "House fire smoke inhalation, nitroprusside infusion, bitter almonds. Inhibits Complex IV (Cytochrome c oxidase) causing severe lactic acidosis with bright red venous blood.",
    examinerTrap: "Nitrites produce methemoglobin to bind cyanide; therefore, Nitrites are CONTRAINDICATED in fire victims with concomitant carbon monoxide poisoning.",
    tags: ["Pharmacology", "Toxicology"],
  },
  {
    id: "ff-anti-07",
    category: "Antidotes_DOC",
    title: "DOAC (Direct Oral Anticoagulant) Reversal Agents",
    mustKnowPill: "Idarucizumab reverses Dabigatran (Thrombin inhibitor); Andexanet Alfa reverses Factor Xa inhibitors (Rivaroxaban, Apixaban)",
    clinicalContext:
      "Indicated for life-threatening or uncontrolled bleeding, or urgent surgery within 8 hours. Monoclonal antibody fragments bind DOAC with affinity > 300x higher than target.",
    examinerTrap: "Protamine sulfate DOES NOT reverse DOACs (it only reverses Unfractionated Heparin).",
    tags: ["Pharmacology", "Hematology", "Anticoagulation"],
  },
  {
    id: "ff-anti-08",
    category: "Antidotes_DOC",
    title: "Malignant Hyperthermia & Neuroleptic Malignant Syndrome",
    mustKnowPill: "DOC for Malignant Hyperthermia is IV Dantrolene (blocks RyR1 ryanodine calcium channels); DOC for NMS is Dantrolene + Bromocriptine",
    clinicalContext:
      "Malignant hyperthermia is triggered by Halothane and Succinylcholine in patients with RYR1 mutations. Sudden rise in end-tidal CO2 is earliest sign.",
    examinerTrap: "Serotonin syndrome is treated with Cyproheptadine (5-HT2A antagonist), NOT Dantrolene or Bromocriptine.",
    tags: ["Anesthesia", "Pharmacology", "Toxicology"],
  },

  // 10. Additional Clinical Scores & Cutoffs
  {
    id: "ff-score-03",
    category: "Scores_Thresholds",
    title: "CURB-65 Pneumonia Severity Score",
    mustKnowPill: "Confusion, Urea > 19 mg/dL (7 mmol/L), RR >= 30, BP (<90 systolic or <=60 diastolic), Age >= 65; Score >= 2 requires admission",
    clinicalContext:
      "Score 0-1: Low risk, outpatient treatment. Score 2: Moderate risk, inpatient ward admission. Score 3-5: Severe risk, consider ICU admission.",
    examinerTrap: "Examiners test whether Urea is in mg/dL or mmol/L: Urea > 19 mg/dL = BUN > 20 mg/dL = Urea > 7 mmol/L.",
    formulaOrValue: "Score 0-1 Outpatient • 2 Ward • 3-5 ICU",
    tags: ["Medicine", "Pulmonology", "Pneumonia"],
  },
  {
    id: "ff-score-04",
    category: "Scores_Thresholds",
    title: "Wells Criteria for Pulmonary Embolism (PE)",
    mustKnowPill: "Clinical DVT symptoms (3), Alternative less likely (3), Heart rate > 100 (1.5), Immobilization/Surgery (1.5), Prior PE/DVT (1.5), Hemoptysis (1), Cancer (1)",
    clinicalContext:
      "Wells > 4: PE Likely -> proceed directly to CT Pulmonary Angiography (CTPA). Wells <= 4: PE Unlikely -> obtain D-dimer first.",
    examinerTrap: "Do NOT order D-dimer in high-probability (Wells > 4) patients; proceed straight to CTPA because negative D-dimer cannot rule out high-risk PE.",
    formulaOrValue: "Wells > 4 = CTPA • Wells <= 4 = D-Dimer",
    tags: ["Medicine", "Cardiology", "Emergency"],
  },
  {
    id: "ff-score-05",
    category: "Scores_Thresholds",
    title: "Glasgow Coma Scale (GCS) Assessment",
    mustKnowPill: "Eye Opening (1-4), Verbal Response (1-5), Motor Response (1-6); Minimum score is 3, Maximum is 15; Score <= 8 indicates Coma & Intubation",
    clinicalContext:
      "Motor 6: Obeys commands, 5: Localizes pain, 4: Withdraws to pain, 3: Abnormal flexion (decorticate), 2: Extension (decerebrate), 1: No movement.",
    examinerTrap: "Decerebrate posturing (extension, Score 2) indicates brainstem/pons damage and has worse prognosis than Decorticate posturing (flexion, Score 3).",
    formulaOrValue: "E4 V5 M6 = 15 • Score <= 8 = Intubate",
    tags: ["Surgery", "Neurosurgery", "Emergency"],
  },
  {
    id: "ff-score-06",
    category: "Scores_Thresholds",
    title: "Ranson Criteria for Acute Pancreatitis at Admission",
    mustKnowPill: "GA LAW: Glucose > 200 mg/dL, Age > 55, LDH > 350 IU/L, AST > 250 IU/L, WBC > 16,000 /uL; >= 3 indicates severe pancreatitis",
    clinicalContext:
      "Evaluated at 0 hours (GA LAW) and 48 hours (C HOBBS: Calcium < 8, Hematocrit fall > 10%, Oxygen PaO2 < 60, Base deficit > 4, BUN increase > 5, Sequestration of fluid > 6L).",
    examinerTrap: "Serum Amylase and Lipase levels DO NOT correlate with disease severity or prognosis in acute pancreatitis.",
    formulaOrValue: "GA LAW: Glucose, Age, LDH, AST, WBC",
    tags: ["Surgery", "Gastroenterology", "Pancreas"],
  },
];
