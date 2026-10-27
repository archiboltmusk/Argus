export type InicetHighYieldTable = {
  id: string;
  category: "Pathology" | "Pharma" | "Microbiology" | "Biochem" | "PSM" | "Surgery" | "OBG" | "Medicine";
  title: string;
  trap: string;
  items: { key: string; value: string; trapNote?: string }[];
};

export const INICET_RAPID_TABLES: InicetHighYieldTable[] = [
  {
    id: "translocations",
    category: "Pathology",
    title: "Must-Know Chromosomal Translocations & Cancers",
    trap: "Don't confuse Mantle cell t(11;14) with Follicular t(14;18). Mantle = Cyclin D1, Follicular = BCL-2.",
    items: [
      { key: "CML (Chronic Myeloid)", value: "t(9;22) BCR-ABL1 (Philadelphia chromosome)" },
      { key: "Burkitt Lymphoma", value: "t(8;14) c-MYC over-expression (Starry-sky appearance)" },
      { key: "Mantle Cell Lymphoma", value: "t(11;14) Cyclin D1 (PRAD-1) over-expression" },
      { key: "Follicular Lymphoma", value: "t(14;18) BCL-2 anti-apoptotic activation" },
      { key: "APML (AML M3)", value: "t(15;17) PML-RARA (Rx: ATRA + Arsenic trioxide)" },
      { key: "Ewing Sarcoma", value: "t(11;22) EWS-FLI1 (Onion skin periosteal reaction)" },
      { key: "Synovial Sarcoma", value: "t(X;18) SS18-SSX1/2" },
    ],
  },
  {
    id: "antidotes",
    category: "Pharma",
    title: "Classic Antidotes & Specific Chelators",
    trap: "Paracetamol antidote is N-Acetylcysteine (replenishes glutathione). Methanol antidote is Fomepizole or Ethanol.",
    items: [
      { key: "Paracetamol (Acetaminophen)", value: "N-Acetylcysteine (IV or oral)" },
      { key: "Methanol / Ethylene Glycol", value: "Fomepizole (inhibits alcohol dehydrogenase)" },
      { key: "Beta Blockers", value: "Glucagon (increases cAMP bypassing beta receptor)" },
      { key: "Benzodiazepines", value: "Flumazenil (Caution: can precipitate withdrawal seizures)" },
      { key: "Opioids", value: "Naloxone (Pure mu-receptor antagonist)" },
      { key: "Organophosphates", value: "Atropine (muscarinic) + Pralidoxime/2-PAM (nicotinic reactivator)" },
      { key: "Heparin", value: "Protamine sulfate" },
      { key: "Warfarin", value: "Vitamin K1 + 4-factor Prothrombin Complex Concentrate (PCC)" },
      { key: "Iron Overload", value: "Deferoxamine (IV) or Deferasirox (Oral)" },
      { key: "Copper / Wilson Disease", value: "D-Penicillamine or Trientine" },
    ],
  },
  {
    id: "bodies-inclusions",
    category: "Pathology",
    title: "High-Frequency Eponymous Bodies & Inclusions",
    trap: "Call-Exner bodies = Granulosa cell tumor of ovary (coffee-bean nuclei). Schiller-Duval = Yolk sac (glomeruloid).",
    items: [
      { key: "Orphan Annie eye nuclei + Psammoma", value: "Papillary Thyroid Carcinoma" },
      { key: "Call-Exner bodies", value: "Granulosa Cell Tumor of Ovary (Inhibin positive)" },
      { key: "Schiller-Duval bodies", value: "Yolk Sac Tumor (Endodermal Sinus), elevated AFP" },
      { key: "Reinke crystals", value: "Leydig Cell Tumor (Precocious puberty)" },
      { key: "Reed-Sternberg cells (Owl eye)", value: "Hodgkin Lymphoma (CD15+, CD30+)" },
      { key: "Auer rods", value: "AML (especially M3 / APML), myeloperoxidase positive" },
      { key: "Councilman bodies", value: "Apoptotic hepatocytes in acute viral hepatitis / Yellow fever" },
      { key: "Lewy bodies", value: "Alpha-synuclein inclusions in Parkinson's & Lewy body dementia" },
      { key: "Negri bodies", value: "Rabies virus in Purkinje cells of cerebellum & Ammon's horn" },
    ],
  },
  {
    id: "scoring-criteria",
    category: "Surgery",
    title: "Critical Clinical Scores & Formulas",
    trap: "In Glasgow Coma Scale (GCS): Minimum score is 3, Maximum is 15. E4 V5 M6.",
    items: [
      { key: "Glasgow Coma Scale", value: "Eye (4), Verbal (5), Motor (6) — Score: 3 to 15" },
      { key: "Parkland Formula for Burns", value: "4 mL × % TBSA burned × Body weight (kg) Ringer Lactate in first 24h" },
      { key: "Rule of 9s (Wallace)", value: "Head 9%, Each Arm 9%, Chest 9%, Abdomen 9%, Upper Back 9%, Lower Back 9%, Each Leg 18%, Perineum 1%" },
      { key: "CURB-65 (Pneumonia)", value: "Confusion, Urea > 7 mmol/L, RR ≥ 30, BP < 90/60, Age ≥ 65" },
      { key: "Child-Pugh (Cirrhosis)", value: "Bilirubin, Albumin, INR/Prothrombin time, Ascites, Encephalopathy" },
      { key: "APGAR Score (Newborn)", value: "Appearance, Pulse, Grimace, Activity, Respiration (evaluated at 1 & 5 min)" },
    ],
  },
  {
    id: "biochem-storage",
    category: "Biochem",
    title: "Lysosomal Storage Diseases & Deficiencies",
    trap: "Tay-Sachs has cherry red spot with NO hepatosplenomegaly. Niemann-Pick has cherry red spot WITH hepatosplenomegaly.",
    items: [
      { key: "Gaucher Disease (Most common)", value: "Glucocerebrosidase deficiency (Tissue-paper macrophages, Erlenmeyer flask deformity)" },
      { key: "Niemann-Pick Disease", value: "Sphingomyelinase deficiency (Foamy histiocytes, Cherry red spot + Hepatosplenomegaly)" },
      { key: "Tay-Sachs Disease", value: "Hexosaminidase A deficiency (Cherry red spot, NO hepatosplenomegaly, onion-skin lysosomes)" },
      { key: "Fabry Disease (X-linked)", value: "Alpha-galactosidase A deficiency (Angiokeratomas, peripheral neuropathy, renal failure)" },
      { key: "Pompe Disease", value: "Lysosomal alpha-1,4-glucosidase / acid maltase (Cardiomegaly, 'Pompe trashes the pump')" },
      { key: "Hurler Syndrome", value: "Alpha-L-iduronidase (Corneal clouding, gargoylism, coarse facial features)" },
      { key: "Hunter Syndrome (X-linked)", value: "Iduronate-2-sulfatase (Aggressive behavior, NO corneal clouding: 'Hunter sees clearly')" },
    ],
  },
];
