/**
 * Core BTR Test & Discussion (T&D) Interactive Simulator Engine
 * Maps to the 17 T&D subject videos in /Users/anupam/Downloads/BTR/TND
 */

import type { GTErrorItem } from "./btr-error-vault";

export interface BTRTnDPaper {
  id: string;
  subjectId: string;
  subjectName: string;
  targetVideoFileName: string;
  totalQuestions: number;
  durationMinutes: number;
  sampleQuestions: BTRTnDQuestion[];
}

export interface BTRTnDQuestion {
  id: string;
  questionNumber: number;
  stem: string;
  options: [string, string, string, string];
  correctOptionIndex: 0 | 1 | 2 | 3;
  explanation: string;
  highYieldPearl: string;
  examinerTrap: string;
  suggestedErrorCategory: "silly_reading" | "volatile_lapse" | "examiner_trap" | "knowledge_gap";
}

export const BTR_TND_PAPERS: BTRTnDPaper[] = [
  {
    id: "tnd-anatomy",
    subjectId: "anatomy",
    subjectName: "Anatomy",
    targetVideoFileName: "TND Anatomy.mp4",
    totalQuestions: 25,
    durationMinutes: 120,
    sampleQuestions: [
      {
        id: "tnd-anat-q1",
        questionNumber: 1,
        stem: "A 28-year-old motorcyclist suffers a shoulder injury during a road collision. Physical exam reveals inability to abduct the arm past 15 degrees and loss of sensation over the lower half of the deltoid. Which nerve is most likely injured?",
        options: [
          "A) Suprascapular nerve",
          "B) Axillary nerve",
          "C) Radial nerve",
          "D) Musculocutaneous nerve",
        ],
        correctOptionIndex: 1,
        explanation: "The axillary nerve winds around the surgical neck of the humerus, supplies the deltoid and teres minor, and innervates the regimental badge area (sensory). Supraspinatus initiates abduction (0-15 degrees); deltoid continues 15-90 degrees.",
        highYieldPearl: "Surgical neck fracture humerus -> Axillary nerve; Midshaft spiral groove -> Radial nerve; Medial epicondyle -> Ulnar nerve.",
        examinerTrap: "Don't confuse initiation of abduction (0-15 deg by supraspinatus) with subsequent abduction (15-90 deg by deltoid).",
        suggestedErrorCategory: "volatile_lapse",
      },
      {
        id: "tnd-anat-q2",
        questionNumber: 2,
        stem: "During a radical neck dissection, a surgeon identifies a structure passing through the Foramen Spinosum alongside the nervus spinosus. Which artery is this?",
        options: [
          "A) Accessory meningeal artery",
          "B) Middle meningeal artery",
          "C) Internal carotid artery",
          "D) Ascending pharyngeal artery",
        ],
        correctOptionIndex: 1,
        explanation: "Foramen spinosum transmits the Middle Meningeal Artery (branch of maxillary artery) and Meningeal branch of mandibular nerve (nervus spinosus).",
        highYieldPearl: "Foramen Ovale transmits MALE: Mandibular nerve (V3), Accessory meningeal artery, Lesser petrosal nerve, Emissary vein.",
        examinerTrap: "Foramen Rotundum transmits V2 (Maxillary); Foramen Ovale transmits V3 (Mandibular).",
        suggestedErrorCategory: "silly_reading",
      },
    ],
  },
  {
    id: "tnd-pathology",
    subjectId: "pathology",
    subjectName: "Pathology",
    targetVideoFileName: "TND Pathology.mp4",
    totalQuestions: 30,
    durationMinutes: 135,
    sampleQuestions: [
      {
        id: "tnd-path-q1",
        questionNumber: 1,
        stem: "A 62-year-old male presents with fatigue and painless cervical lymphadenopathy. Lymph node biopsy demonstrates large binucleated cells with prominent eosinophilic inclusion-like nucleoli resembling 'owl eyes'. Flow cytometry would most typically reveal positivity for which pair of markers?",
        options: [
          "A) CD3 and CD5",
          "B) CD15 and CD30",
          "C) CD19 and CD20",
          "D) CD45 and CD138",
        ],
        correctOptionIndex: 1,
        explanation: "Classical Reed-Sternberg cells of Hodgkin Lymphoma are CD15+, CD30+, and characteristically CD45 negative.",
        highYieldPearl: "Nodular lymphocyte predominant Hodgkin lymphoma (NLPHL) is the exception: Popcorn cells (L&H cells) are CD20+, CD45+, and CD15- CD30-.",
        examinerTrap: "NLPHL has the opposite immunophenotype of classical Hodgkin lymphoma.",
        suggestedErrorCategory: "examiner_trap",
      },
    ],
  },
  {
    id: "tnd-pharmacology",
    subjectId: "pharmacology",
    subjectName: "Pharmacology",
    targetVideoFileName: "TND Pharmacology.mp4",
    totalQuestions: 30,
    durationMinutes: 140,
    sampleQuestions: [
      {
        id: "tnd-pharm-q1",
        questionNumber: 1,
        stem: "A 55-year-old male with acute anterior myocardial infarction develops ventricular tachycardia. He is started on an antiarrhythmic drug that causes QT prolongation but has an exceptionally low incidence of Torsades de Pointes. Which drug is this?",
        options: [
          "A) Quinidine",
          "B) Sotalol",
          "C) Amiodarone",
          "D) Ibutilide",
        ],
        correctOptionIndex: 2,
        explanation: "Amiodarone (Class III) causes marked QT prolongation by blocking delayed rectifier K+ channels, but rarely causes Torsades de Pointes because it also has Class I, II, and IV blocking actions and produces uniform refractoriness.",
        highYieldPearl: "Amiodarone monitoring: Baseline Chest X-ray/PFTs (pulmonary fibrosis), Thyroid function tests (hypo/hyperthyroidism), and LFTs.",
        examinerTrap: "Quinidine has high risk of cinchonism and Torsades; Amiodarone has low risk of Torsades despite QT prolongation.",
        suggestedErrorCategory: "volatile_lapse",
      },
    ],
  },
  {
    id: "tnd-surgery",
    subjectId: "surgery",
    subjectName: "General Surgery",
    targetVideoFileName: "TND Surgery.mp4",
    totalQuestions: 35,
    durationMinutes: 150,
    sampleQuestions: [
      {
        id: "tnd-surg-q1",
        questionNumber: 1,
        stem: "A 32-year-old female presents with a 2.5 cm solitary cold thyroid nodule. Ultrasound shows microcalcifications and irregular margins. FNAC confirms papillary thyroid carcinoma. What is the surgical management of choice?",
        options: [
          "A) Hemithyroidectomy only",
          "B) Total thyroidectomy with central compartment lymph node dissection",
          "C) Subtotal thyroidectomy",
          "D) Enucleation of the nodule",
        ],
        correctOptionIndex: 1,
        explanation: "For Papillary Thyroid Carcinoma > 1 cm (here 2.5 cm), high-risk features, or bilateral disease, Total Thyroidectomy with prophylactic/therapeutic Central Compartment Neck Dissection is the gold standard.",
        highYieldPearl: "Recurrent laryngeal nerve injury: Unilateral causes hoarseness; Bilateral causes stridor and acute airway obstruction requiring immediate tracheostomy.",
        examinerTrap: "Enucleation is never done for thyroid nodules; always remove at least the whole lobe (hemithyroidectomy) or total gland.",
        suggestedErrorCategory: "knowledge_gap",
      },
    ],
  },
];

export function buildErrorItemFromTnD(
  paper: BTRTnDPaper,
  question: BTRTnDQuestion,
  chosenIndex: number
): GTErrorItem {
  return {
    id: `err-tnd-${Date.now()}-${question.id}`,
    gtTitle: `T&D ${paper.subjectName} (Q${question.questionNumber})`,
    subjectId: paper.subjectId,
    subjectName: paper.subjectName,
    questionStem: question.stem,
    myChosenAnswer: question.options[chosenIndex] || "Unattempted",
    correctAnswer: question.options[question.correctOptionIndex],
    takeawayFact: question.highYieldPearl,
    category: question.suggestedErrorCategory,
    dateLogged: new Date().toISOString().slice(0, 10),
    reviewedCount: 0,
    isResolved: false,
  };
}
