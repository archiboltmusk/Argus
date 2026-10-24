export type CommunityCatalogEntry = {
  id: string;
  title: string;
  author: string;
  description: string;
  subject: string;
  totalQuestions: number;
  rawUrl: string;
  tags: string[];
};

export const VERIFIED_COMMUNITY_DATASETS: CommunityCatalogEntry[] = [
  {
    id: "medqa-usmle-highyield",
    title: "MedQA Clinical Board Vignettes (High-Yield)",
    author: "Open MedQA Project (GitHub)",
    description: "Multi-step clinical diagnostic questions with patient presentations, vitals, and lab values.",
    subject: "Medicine",
    totalQuestions: 250,
    rawUrl: "https://raw.githubusercontent.com/jind11/MedQA/master/data_clean/questions/US/test.jsonl",
    tags: ["Clinical", "USMLE", "Board Style"],
  },
  {
    id: "open-path-aiims",
    title: "High-Yield Pathology Diagnostic Pearls",
    author: "Medical Open Data Collective",
    description: "Translocations, histological bodies, tumor markers, and enzyme pathways.",
    subject: "Pathology",
    totalQuestions: 120,
    rawUrl: "https://raw.githubusercontent.com/archiboltmusk/Argus/main/public/datasets/pathology-core.json",
    tags: ["Pathology", "Histology", "AIIMS Repeat"],
  },
  {
    id: "open-pharma-antidotes",
    title: "Clinical Pharmacology & Drug-of-Choice Matrix",
    author: "Open Pharma Repository",
    description: "Antidotes, teratogenic drugs, antimicrobial mechanisms, and autonomic pharmacology.",
    subject: "Pharmacology",
    totalQuestions: 95,
    rawUrl: "https://raw.githubusercontent.com/archiboltmusk/Argus/main/public/datasets/pharma-core.json",
    tags: ["Pharma", "Antidotes", "Mechanisms"],
  },
  {
    id: "inicet-high-yield-blitz",
    title: "INICET & AIIMS Repeat Concept Bank",
    author: "AIIMS Scholar Network",
    description: "Previous year repeat themes compiled across short subjects (Radiology, Ortho, FMT, Dermat).",
    subject: "Mixed",
    totalQuestions: 150,
    rawUrl: "https://raw.githubusercontent.com/archiboltmusk/Argus/main/public/datasets/inicet-blitz.json",
    tags: ["INICET", "High-Yield", "PYT"],
  },
];
