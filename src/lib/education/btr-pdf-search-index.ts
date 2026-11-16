/**
 * Core BTR Cross-PDF Search Engine & Topic Index
 * Indexes medical topics across Dr. Zainab Vora's 32 PDF workbooks in /Users/anupam/Downloads/BTR
 */

export interface BTRPdfSearchResult {
  id: string;
  topic: string;
  pdfFileName: string;
  volumeLabel: string;
  subjectName: string;
  pageNumber: number;
  highlightSnippet: string;
  highYieldTheme: string;
}

export const BTR_PDF_TOPIC_INDEX: BTRPdfSearchResult[] = [
  {
    id: "idx-brachial-plexus",
    topic: "Brachial Plexus & Nerve Injuries (Erb's & Klumpke's)",
    pdfFileName: "Anatomy.pdf",
    volumeLabel: "Pre-Clinical Workbook",
    subjectName: "Anatomy",
    pageNumber: 1,
    highlightSnippet: "Erb's paralysis (Upper trunk C5-C6) produces Waiter's/Policeman's tip hand. Klumpke's (C8-T1) causes true claw hand with Horner's syndrome.",
    highYieldTheme: "Upper Limb & Nerve Roots",
  },
  {
    id: "idx-skull-foramina",
    topic: "Skull Base Foramina & Cranial Nerve Transmissions",
    pdfFileName: "Anatomy.pdf",
    volumeLabel: "Pre-Clinical Workbook",
    subjectName: "Anatomy",
    pageNumber: 24,
    highlightSnippet: "Foramen Rotundum transmits V2; Foramen Ovale transmits MALE (V3, Access meningeal, Lesser petrosal, Emissary); Spinosum transmits Middle meningeal artery.",
    highYieldTheme: "Neuroanatomy & Head-Neck",
  },
  {
    id: "idx-glycogen-storage",
    topic: "Glycogen Storage Diseases (Von Gierke, Pompe, Cori, McArdle)",
    pdfFileName: "Biochemistry.pdf",
    volumeLabel: "Pre-Clinical Workbook",
    subjectName: "Biochemistry",
    pageNumber: 8,
    highlightSnippet: "Type I (Von Gierke): Glucose-6-phosphatase deficiency with severe fasting hypoglycemia, lactic acidosis, and doll-like face. Type II (Pompe): Lysosomal alpha-1,4-glucosidase with cardiomegaly.",
    highYieldTheme: "Metabolic Inborn Errors",
  },
  {
    id: "idx-hodgkin-markers",
    topic: "Reed-Sternberg Cells & Hodgkin Lymphoma Subtypes",
    pdfFileName: "General Pathology.pdf",
    volumeLabel: "Para-Clinical Workbook",
    subjectName: "Pathology",
    pageNumber: 19,
    highlightSnippet: "Classical RS cells: CD15+, CD30+, CD45-. Nodular sclerosis is most common with collagen bands. Popcorn cells of NLPHL are CD20+, CD45+, CD15-, CD30-.",
    highYieldTheme: "Hematology & Lymphomas",
  },
  {
    id: "idx-antidotes-table",
    topic: "Toxicology Antidotes & Mechanism Matrix",
    pdfFileName: "General Pharmacology.pdf",
    volumeLabel: "Para-Clinical Workbook",
    subjectName: "Pharmacology",
    pageNumber: 32,
    highlightSnippet: "Paracetamol -> N-Acetylcysteine; Beta-blocker -> Glucagon; Heparin -> Protamine sulfate; Organophosphates -> Atropine + Pralidoxime; Iron -> Deferoxamine.",
    highYieldTheme: "Toxicology & Emergency",
  },
  {
    id: "idx-bmw-rules",
    topic: "Bio-Medical Waste (BMW 2016) Segregation & Treatment",
    pdfFileName: "PSM.pdf",
    volumeLabel: "Para-Clinical Workbook",
    subjectName: "PSM",
    pageNumber: 15,
    highlightSnippet: "Yellow: Incineration for anatomical and soiled waste. Red: Autoclaving for recyclable plastics. White: Shredding for sharps. Blue: Glassware and metallic implants.",
    highYieldTheme: "Environmental Health & Protocols",
  },
  {
    id: "idx-biostats-tables",
    topic: "Biostatistics 2x2 Calculations, Odds Ratio & NNT",
    pdfFileName: "PSM.pdf",
    volumeLabel: "Para-Clinical Workbook",
    subjectName: "PSM",
    pageNumber: 22,
    highlightSnippet: "Odds Ratio for Case-Control = (ad)/(bc). Relative Risk for Cohort. NNT = 1/ARR. With increasing prevalence, PPV increases and NPV decreases.",
    highYieldTheme: "Epidemiology & Biostatistics",
  },
  {
    id: "idx-thyroid-surgery",
    topic: "Thyroid Carcinoma (Papillary, Follicular, Medullary, Anaplastic)",
    pdfFileName: "Surgery.pdf",
    volumeLabel: "Long Clinical Workbook",
    subjectName: "Surgery",
    pageNumber: 12,
    highlightSnippet: "Papillary: Orphan Annie eyes, psammoma bodies, lymphatic spread. Follicular: Capsular/vascular invasion hematogenous to bone. Medullary: Calcitonin, amyloid, MEN 2.",
    highYieldTheme: "Endocrine Surgery",
  },
  {
    id: "idx-vol-1-master",
    topic: "Volume 1 Master Volatiles Compilation",
    pdfFileName: "Vol 1.pdf",
    volumeLabel: "Master Volume 1",
    subjectName: "Pre & Para-Clinicals",
    pageNumber: 45,
    highlightSnippet: "Consolidated high-yield tables for Anatomy, Physiology, Biochemistry, Pathology, Pharmacology, and Microbiology.",
    highYieldTheme: "Foundations Master Revision",
  },
  {
    id: "idx-vol-2-master",
    topic: "Volume 2 Master Clinicals & Systems",
    pdfFileName: "Vol 2.pdf",
    volumeLabel: "Master Volume 2",
    subjectName: "Short & Long Clinicals",
    pageNumber: 68,
    highlightSnippet: "Consolidated high-yield tables for Ophthalmology, ENT, FMT, PSM, Medicine, Surgery, OBGYN, and Pediatrics.",
    highYieldTheme: "Clinical Master Revision",
  },
  {
    id: "idx-vol-3-master",
    topic: "Volume 3 Final Sprint Volatile Tables",
    pdfFileName: "Volume 3.pdf",
    volumeLabel: "Master Volume 3",
    subjectName: "Super-Volatiles",
    pageNumber: 14,
    highlightSnippet: "Last 7-day memory triggers: cutoffs, scores, staging criteria, and diagnostic algorithms for rapid exam sweep.",
    highYieldTheme: "Super-Volatiles Cheat Sheets",
  },
];

export function searchBTRPdfs(query: string): BTRPdfSearchResult[] {
  if (!query || !query.trim()) return BTR_PDF_TOPIC_INDEX;
  const q = query.toLowerCase().trim();

  return BTR_PDF_TOPIC_INDEX.filter((item) => {
    return (
      item.topic.toLowerCase().includes(q) ||
      item.subjectName.toLowerCase().includes(q) ||
      item.highlightSnippet.toLowerCase().includes(q) ||
      item.highYieldTheme.toLowerCase().includes(q) ||
      item.pdfFileName.toLowerCase().includes(q)
    );
  });
}
