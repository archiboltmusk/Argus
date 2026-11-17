/**
 * Argus Synapse Medical Knowledge Graph & Cross-Linker
 *
 * Connects any Clinical Question, Topic, or Diagnostic Finding directly to:
 * 1. Dr. Zainab Vora's BTR video timestamps & local PDF workbooks
 * 2. 20th Subject Engine (DOCs, Antidotes, Biostatistics formulas, BMW guidelines)
 * 3. FSRS Spaced Repetition Memory Vault
 * 4. Multi-system differential diagnosis links
 */

import type { ClinicalQuestion, SynapseLinkage } from "./qbank-types";

export interface SynapseConceptNode {
  conceptKey: string;
  name: string;
  subject: string;
  system: string;
  primaryPill: string;
  btrLecture?: {
    title: string;
    videoFilename?: string;
    timestampLabel: string;
    timestampSeconds: number;
    workbookPdf: string;
  };
  docOrAntidote?: {
    condition: string;
    doc: string;
    antidoteOrTrap: string;
  };
  relatedConcepts: string[];
}

export const SYNAPSE_KNOWLEDGE_NODES: Record<string, SynapseConceptNode> = {
  neuroanatomy: {
    conceptKey: "neuroanatomy",
    name: "Neuroanatomy & Internal Capsule",
    subject: "Anatomy",
    system: "Central Nervous",
    primaryPill: "Posterior limb carries corticospinal tract; supplied by Charcot's lenticulostriate artery",
    btrLecture: {
      title: "Embryology & Neuro-Anatomy High Yields",
      timestampLabel: "00:00",
      timestampSeconds: 0,
      workbookPdf: "Anatomy_annotated.pdf",
    },
    relatedConcepts: ["stroke", "epidural_hematoma", "cranial_nerves"],
  },
  epidural_hematoma: {
    conceptKey: "epidural_hematoma",
    name: "Epidural vs Subdural Hematoma",
    subject: "Radiology",
    system: "Central Nervous",
    primaryPill: "EDH: Biconvex hyperdensity, Middle Meningeal Artery tear, pterion fracture, lucid interval",
    btrLecture: {
      title: "Radiology Classifications & CT Signs",
      timestampLabel: "14:20",
      timestampSeconds: 860,
      workbookPdf: "Radiology_annotated.pdf",
    },
    relatedConcepts: ["neuroanatomy", "gcs_score"],
  },
  mitral_stenosis: {
    conceptKey: "mitral_stenosis",
    name: "Rheumatic Heart Disease & Mitral Stenosis",
    subject: "Medicine",
    system: "Cardiovascular",
    primaryPill: "Loud S1, Opening Snap, Mid-diastolic murmur; P-mitrale on ECG; high decompensation in pregnancy",
    btrLecture: {
      title: "Mega BTR for INI CET Part-1: CVS Recalls",
      timestampLabel: "32:00",
      timestampSeconds: 1920,
      workbookPdf: "Integrated CVS_annotated.pdf",
    },
    docOrAntidote: {
      condition: "Rheumatic Fever Secondary Prophylaxis",
      doc: "Benzathine Penicillin G (1.2 million units IM every 3-4 weeks)",
      antidoteOrTrap: "In penicillin allergy, use Oral Erythromycin or Azithromycin",
    },
    relatedConcepts: ["jones_criteria", "atrial_fibrillation"],
  },
  apml_leukemia: {
    conceptKey: "apml_leukemia",
    name: "Acute Promyelocytic Leukemia (APML - AML M3)",
    subject: "Pathology",
    system: "Hematology & Oncology",
    primaryPill: "t(15;17) PML-RARA fusion; Faggot cells with Auer rods; High DIC risk; DOC is ATRA + ATO",
    btrLecture: {
      title: "Hematology & Oncology Translocations",
      timestampLabel: "45:10",
      timestampSeconds: 2710,
      workbookPdf: "Hematology_annotated.pdf",
    },
    docOrAntidote: {
      condition: "Acute Promyelocytic Leukemia",
      doc: "All-trans retinoic acid (ATRA / Tretinoin) + Arsenic Trioxide",
      antidoteOrTrap: "Differentiation Syndrome is treated immediately with IV Dexamethasone",
    },
    relatedConcepts: ["dic_coagulopathy", "faggot_cells"],
  },
  copd_gold: {
    conceptKey: "copd_gold",
    name: "COPD Management & GOLD 2024 Guidelines",
    subject: "Medicine",
    system: "Respiratory",
    primaryPill: "Group E (>= 2 exacerbations or 1 hospitalization) initial therapy is LABA + LAMA; ICS only if eosinophils >= 300",
    btrLecture: {
      title: "Respiratory Guidelines & PFTs",
      timestampLabel: "22:45",
      timestampSeconds: 1365,
      workbookPdf: "Respiratory.pdf",
    },
    relatedConcepts: ["asthma", "curb65_pneumonia"],
  },
  biostatistics_lr: {
    conceptKey: "biostatistics_lr",
    name: "Likelihood Ratios & 2x2 Formulas",
    subject: "PSM",
    system: "General & Multi-System",
    primaryPill: "LR+ = Sensitivity / (1 - Specificity); Independent of disease prevalence",
    btrLecture: {
      title: "Biostatistics 2x2 Formulas & BMW Guidelines",
      timestampLabel: "04:50:00",
      timestampSeconds: 17400,
      workbookPdf: "Preventive and Social Medicine_annotated.pdf",
    },
    relatedConcepts: ["nnt_calculation", "prevalence_shifts"],
  },
};

/**
 * Resolves Synapse Linkage for any Clinical Question dynamically
 */
export function resolveQuestionSynapse(q: ClinicalQuestion): SynapseLinkage {
  if (q.synapseLinks?.btrVideo) {
    return q.synapseLinks;
  }

  const text = `${q.subject} ${q.topic} ${q.vignette}`.toLowerCase();

  for (const [key, node] of Object.entries(SYNAPSE_KNOWLEDGE_NODES)) {
    if (
      text.includes(key.replace(/_/g, " ")) ||
      text.includes(node.name.toLowerCase()) ||
      (node.btrLecture && text.includes(node.subject.toLowerCase()))
    ) {
      if (node.btrLecture) {
        return {
          btrVideo: {
            title: node.btrLecture.title,
            timestampSeconds: node.btrLecture.timestampSeconds,
            label: `${node.btrLecture.title} (${node.btrLecture.timestampLabel})`,
            fileKey: node.btrLecture.workbookPdf,
          },
          docTableId: node.docOrAntidote?.condition,
          relatedTopicIds: node.relatedConcepts,
        };
      }
    }
  }

  // Fallback to subject chapter
  return {
    btrVideo: {
      title: `BTR ${q.subject} High-Yield Lecture`,
      timestampSeconds: 0,
      label: `${q.subject} Core Review (00:00)`,
    },
    relatedTopicIds: [],
  };
}
