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
    id: "archiboltmusk-qbank-01",
    title: "Prep XI QBank — Module 01 (Anaesthesia, Surgery & Clinical)",
    author: "archiboltmusk / qbank",
    description: "153 topic tests spanning Pre-Anaesthetic Evaluation, Local & Regional Anaesthesia, CPCR, and high-yield MCQs.",
    subject: "Anaesthesia",
    totalQuestions: 1530,
    rawUrl: "https://raw.githubusercontent.com/archiboltmusk/qbank/main/data/tests-01.json.gz",
    tags: ["High-Yield", "Prep XI", "Anaesthesia", "QBank"],
  },
  {
    id: "archiboltmusk-qbank-02",
    title: "Prep XI QBank — Module 02",
    author: "archiboltmusk / qbank",
    description: "Full clinical test series module covering core clinical specialties with detailed rationales.",
    subject: "Medicine",
    totalQuestions: 1500,
    rawUrl: "https://raw.githubusercontent.com/archiboltmusk/qbank/main/data/tests-02.json.gz",
    tags: ["Prep XI", "Clinical Vignettes", "Medicine"],
  },
  {
    id: "archiboltmusk-qbank-03",
    title: "Prep XI QBank — Module 03",
    author: "archiboltmusk / qbank",
    description: "Diagnostic vignette drills and board-style distractor breakdowns.",
    subject: "Surgery",
    totalQuestions: 1600,
    rawUrl: "https://raw.githubusercontent.com/archiboltmusk/qbank/main/data/tests-03.json.gz",
    tags: ["Prep XI", "Surgery", "Clinical"],
  },
  {
    id: "archiboltmusk-qbank-04",
    title: "Prep XI QBank — Module 04",
    author: "archiboltmusk / qbank",
    description: "Pathology, Pharmacology, and Microbiology board test series.",
    subject: "Pathology",
    totalQuestions: 1550,
    rawUrl: "https://raw.githubusercontent.com/archiboltmusk/qbank/main/data/tests-04.json.gz",
    tags: ["Prep XI", "Pathology", "Pharma"],
  },
  {
    id: "archiboltmusk-qbank-05",
    title: "Prep XI QBank — Module 05",
    author: "archiboltmusk / qbank",
    description: "OBGYN, Pediatrics, and Preventive & Social Medicine high-yield drills.",
    subject: "OBGYN",
    totalQuestions: 1480,
    rawUrl: "https://raw.githubusercontent.com/archiboltmusk/qbank/main/data/tests-05.json.gz",
    tags: ["Prep XI", "OBGYN", "Pediatrics"],
  },
  {
    id: "archiboltmusk-qbank-06",
    title: "Prep XI QBank — Module 06",
    author: "archiboltmusk / qbank",
    description: "Short subjects masterclass (Ophthalmology, ENT, Dermatology, Psychiatry, Radiology).",
    subject: "Mixed",
    totalQuestions: 1620,
    rawUrl: "https://raw.githubusercontent.com/archiboltmusk/qbank/main/data/tests-06.json.gz",
    tags: ["Prep XI", "Short Subjects", "INICET High Yield"],
  },
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
