import { invoke } from "@tauri-apps/api/core";
import { getAllQuestions } from "@/lib/education/qbank-store";
import { getStudyNotes } from "@/lib/education/notes";
import type { ClinicalQuestion } from "@/lib/education/qbank-types";
import type { StudyNote } from "@/lib/education/types";

export type GlanceSearchResult = {
  text: string;
  relatedQuestions: ClinicalQuestion[];
  relatedNotes: StudyNote[];
  medicalTermDefinition?: string;
};

// High-Yield Medical & Clinical Lexicon for instantaneous offline lookup
const CLINICAL_LEXICON: Record<string, string> = {
  pheochromocytoma: "Rule of 10s: 10% bilateral, 10% extra-adrenal (paraganglioma), 10% malignant, 10% familial (MEN2A/2B, VHL, NF1). Screen with plasma free metanephrines. Alpha-blockade (phenoxybenzamine) BEFORE beta-blockade.",
  tamponade: "Beck's Triad: Hypotension, JVD, muffled heart sounds. Pulsus paradoxus (>10mmHg drop during inspiration). Water-bottle sign on CXR. Immediate emergent pericardiocentesis.",
  kawasaki: "CRASH & Burn: Conjunctivitis (non-purulent), Rash, Adenopathy (cervical), Strawberry tongue / oral erythema, Hand/foot erythema & desquamation, Fever >5 days. Rx: IVIG + High-dose Aspirin (prevents coronary artery aneurysms).",
  myasthenia: "Autoantibodies against post-synaptic ACh receptors. Fatigable muscle weakness worsening with use. Associated with thymoma. Tensilon (edrophonium) test positive. Rx: Pyridostigmine.",
  guillain: "Post-infectious (Campylobacter, CMV) autoimmune demyelination of peripheral nerves. Ascending flaccid paralysis. Albuminocytologic dissociation in CSF (high protein, normal WBC). Rx: IVIG or Plasmapheresis. Avoid steroids.",
  hyperkalemia: "ECG: Tall peaked T waves -> Prolonged PR -> Widened QRS -> Sine wave -> Ventricular fibrillation. Membrane stabilization: IV Calcium gluconate first. Intracellular shifting: Insulin + Dextrose, Beta-2 agonists, NaHCO3.",
  ketoacidosis: "DKA: Hyperglycemia, high anion gap metabolic acidosis, positive serum ketones, Kussmaul respirations. Rx: Fluid resuscitation (normal saline) -> IV regular insulin -> Potassium repletion when K < 5.3 mEq/L.",
  wilson: "ATP7B mutation on chromosome 13 causing impaired copper excretion. Low ceruloplasmin, high urinary copper, Kayser-Fleischer rings, basal ganglia degeneration. Rx: Penicillamine or Trientine, Zinc.",
  hemochromatosis: "HFE mutation (C282Y). Bronze diabetes: hyperpigmentation, diabetes, cirrhosis, dilated cardiomyopathy, pseudogout. High ferritin and transferrin saturation >45%. Rx: Phlebotomy.",
  tetralogy: "PROVe: Pulmonary infundibular stenosis (determines prognosis), Right ventricular hypertrophy, Overriding aorta, VSD. Boot-shaped heart on CXR. Tet spells managed with knee-chest position and oxygen.",
};

/**
 * Captures current frame from mpv and processes selected crop area.
 */
export async function captureFrameRegion(crop?: { x: number; y: number; width: number; height: number }): Promise<string> {
  const fullDataUrl = await invoke<string>("mpv_screenshot_data_url");
  if (!crop) return fullDataUrl;

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = crop.width;
      canvas.height = crop.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(fullDataUrl);
        return;
      }
      ctx.drawImage(img, crop.x, crop.y, crop.width, crop.height, 0, 0, crop.width, crop.height);
      resolve(canvas.toDataURL("image/jpeg", 0.9));
    };
    img.onerror = () => reject(new Error("Failed to load frame image for cropping."));
    img.src = fullDataUrl;
  });
}

/**
 * Searches the local QBank database and study notes for relevant concepts.
 */
export function searchKnowledgeBaseForTerm(term: string): GlanceSearchResult {
  const clean = term.trim().toLowerCase();
  const allQuestions = getAllQuestions();
  const allNotes = getStudyNotes();

  const relatedQuestions = allQuestions.filter((q) => {
    return (
      q.vignette.toLowerCase().includes(clean) ||
      q.topic.toLowerCase().includes(clean) ||
      q.subject.toLowerCase().includes(clean) ||
      q.options.some((o) => o.toLowerCase().includes(clean))
    );
  }).slice(0, 5);

  const relatedNotes = allNotes.filter((n) => {
    return n.markdown.toLowerCase().includes(clean) || n.itemTitle.toLowerCase().includes(clean);
  }).slice(0, 5);

  let medicalTermDefinition: string | undefined = undefined;
  for (const [key, def] of Object.entries(CLINICAL_LEXICON)) {
    if (clean.includes(key) || key.includes(clean)) {
      medicalTermDefinition = def;
      break;
    }
  }

  return {
    text: term,
    relatedQuestions,
    relatedNotes,
    medicalTermDefinition,
  };
}
