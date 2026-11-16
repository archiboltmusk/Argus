/**
 * Core BTR High-Yield Visual Spotter & Image Bank Engine
 * 25-30% of INI-CET and NEET-PG questions are image-based diagnostic spotters.
 */

export interface BTRSpotterItem {
  id: string;
  subject: string;
  modality: "X-Ray" | "CT / MRI" | "Histopathology (H&E)" | "Clinical / Derm" | "Fundoscopy" | "ECG";
  pathognomonicSign: string;
  diagnosis: string;
  clinicalVignette: string;
  examinerTraps: string;
  associatedGeneOrOrganism?: string;
  distractorLookAlikes: string[];
}

export const BTR_HIGH_YIELD_SPOTTERS: BTRSpotterItem[] = [
  {
    id: "spot-1",
    subject: "Radiology & GI Surgery",
    modality: "X-Ray",
    pathognomonicSign: "Coffee Bean Sign / Bent Inner Tube",
    diagnosis: "Sigmoid Volvulus",
    clinicalVignette: "Elderly bedridden patient with chronic constipation presents with marked abdominal distension, obstipation, and abdominal pain.",
    examinerTraps: "Sigmoid volvulus apex points to Right Upper Quadrant; Cecal volvulus apex points to Left Upper Quadrant.",
    distractorLookAlikes: ["Cecal Volvulus", "Toxic Megacolon", "Large Bowel Obstruction via Adenocarcinoma"],
  },
  {
    id: "spot-2",
    subject: "Radiology & GI Surgery",
    modality: "X-Ray",
    pathognomonicSign: "Bird's Beak Appearance / Rat-Tail Tapering",
    diagnosis: "Achalasia Cardia (Barium Swallow)",
    clinicalVignette: "35-year-old female presents with progressive dysphagia to BOTH solids and liquids and regurgitation of undigested food.",
    examinerTraps: "Dysphagia to solids THEN liquids indicates mechanical obstruction (carcinoma esophagus); dysphagia to BOTH simultaneously indicates motility disorder (achalasia).",
    distractorLookAlikes: ["Esophageal Carcinoma", "Diffuse Esophageal Spasm (Corkscrew)", "Schatzki Ring"],
  },
  {
    id: "spot-3",
    subject: "Radiology & Pediatrics",
    modality: "X-Ray",
    pathognomonicSign: "Double Bubble Sign",
    diagnosis: "Duodenal Atresia",
    clinicalVignette: "Newborn with Down syndrome (Trisomy 21) presents with bilious vomiting within the first 24 hours of life and scaphoid lower abdomen.",
    examinerTraps: "Single bubble = Congenital Hypertrophic Pyloric Stenosis (non-bilious vomiting); Triple bubble = Jejunal atresia.",
    associatedGeneOrOrganism: "Associated with Trisomy 21 (Down Syndrome)",
    distractorLookAlikes: ["Pyloric Stenosis", "Jejunal Atresia", "Annular Pancreas"],
  },
  {
    id: "spot-4",
    subject: "Pathology & Hematology",
    modality: "Histopathology (H&E)",
    pathognomonicSign: "Starry Sky Pattern (Tingible body macrophages among uniform B-lymphoblasts)",
    diagnosis: "Burkitt Lymphoma",
    clinicalVignette: "8-year-old child from equatorial Africa presents with rapidly growing jaw swelling. Biopsy shows high proliferation index (Ki-67 ~ 100%).",
    examinerTraps: "Translocation is t(8;14) involving c-MYC and IgH; associated with EBV.",
    associatedGeneOrOrganism: "t(8;14) c-MYC translocation; Epstein-Barr Virus (EBV)",
    distractorLookAlikes: ["Diffuse Large B-Cell Lymphoma", "Lymphoblastic Lymphoma", "Ewing Sarcoma"],
  },
  {
    id: "spot-5",
    subject: "Pathology & Endocrine",
    modality: "Histopathology (H&E)",
    pathognomonicSign: "Orphan Annie Eyes (Optically clear nuclei) + Psammoma Bodies",
    diagnosis: "Papillary Thyroid Carcinoma (PTC)",
    clinicalVignette: "30-year-old woman with neck swelling and history of neck radiation in childhood. FNAC reveals nuclear grooves and pseudo-inclusions.",
    examinerTraps: "FNAC can reliably diagnose Papillary carcinoma, but FNAC CANNOT distinguish Follicular Adenoma from Follicular Carcinoma (requires capsular/vascular invasion on histopath).",
    associatedGeneOrOrganism: "BRAF V600E mutation; RET/PTC rearrangement",
    distractorLookAlikes: ["Follicular Thyroid Carcinoma", "Medullary Thyroid Carcinoma", "Anaplastic Carcinoma"],
  },
  {
    id: "spot-6",
    subject: "Radiology & Orthopedics",
    modality: "X-Ray",
    pathognomonicSign: "Codman's Triangle & Sunburst Periosteal Reaction",
    diagnosis: "Osteosarcoma (Metaphysis of distal femur)",
    clinicalVignette: "16-year-old athletic male presents with persistent knee pain worse at night and swelling above the joint line.",
    examinerTraps: "Osteosarcoma is METAPHYSEAL; Ewing sarcoma is DIAPHYSEAL with 'onion-skin' periosteal reaction.",
    associatedGeneOrOrganism: "RB1 and TP53 (Li-Fraumeni syndrome)",
    distractorLookAlikes: ["Ewing Sarcoma (Onion skin)", "Osteoid Osteoma (Nidus)", "Giant Cell Tumor (Epiphysis / Soap bubble)"],
  },
  {
    id: "spot-7",
    subject: "Dermatology",
    modality: "Clinical / Derm",
    pathognomonicSign: "Target / Iris Lesions (3 concentric zones)",
    diagnosis: "Erythema Multiforme",
    clinicalVignette: "22-year-old male develops symmetric targetoid erythematous plaques on palms and soles 10 days after a recurrent cold sore outbreak.",
    examinerTraps: "Most common trigger is Herpes Simplex Virus (HSV-1), not drugs. Drugs are the main trigger for Stevens-Johnson Syndrome (SJS).",
    associatedGeneOrOrganism: "Herpes Simplex Virus (HSV)",
    distractorLookAlikes: ["Stevens-Johnson Syndrome", "Urticaria", "Fixed Drug Eruption"],
  },
  {
    id: "spot-8",
    subject: "Ophthalmology",
    modality: "Fundoscopy",
    pathognomonicSign: "Cherry-Red Spot at Fovea with Retinal Clouding / Box-Carring",
    diagnosis: "Central Retinal Artery Occlusion (CRAO)",
    clinicalVignette: "68-year-old male with atrial fibrillation experiences sudden, painless, catastrophic vision loss in right eye.",
    examinerTraps: "CRAO is painless catastrophic vision loss with cherry red spot. CRVO presents with 'blood and thunder' flame hemorrhages across all 4 quadrants.",
    distractorLookAlikes: ["Central Retinal Vein Occlusion (Blood & Thunder)", "Tay-Sachs Disease", "Retinal Detachment"],
  },
];
