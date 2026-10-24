import type { QuestionDepthLevel, InicetQuestionFormat } from "./qbank-types";

/**
 * Heuristic keywords that indicate authentic clinical vignette scenarios
 */
const CLINICAL_VIGNETTE_MARKERS = [
  "year-old",
  "year old",
  "yr old",
  "y/o",
  "presented with",
  "presents with",
  "complains of",
  "history of",
  "investigation reveals",
  "examination reveals",
  "on examination",
  "diagnosed with",
  "admitted to",
  "underwent",
  "biopsy shows",
  "ct scan reveals",
  "mri reveals",
  "x-ray shows",
  "ecg shows",
  "arterial blood gas",
  "vitals are",
  "laboratory findings",
  "bp is",
  "pulse is",
  "respiratory rate",
  "prescribed",
  "administered",
];

const MULTI_STEP_REASONING_MARKERS = [
  "next best step",
  "most appropriate next step",
  "most likely diagnosis",
  "initial investigation of choice",
  "gold standard investigation",
  "drug of choice",
  "mechanism of action of the drug",
  "which of the following contraindications",
  "confirmatory test",
  "underlying pathophysiology",
  "primary defect",
  "most common complication",
];

const ASSERTION_REASON_MARKERS = [
  "assertion (a)",
  "assertion:",
  "reason (r)",
  "reason:",
  "both (a) and (r)",
  "both a and r",
];

const MATCHING_MARKERS = [
  "match the following",
  "column i",
  "column 1",
  "match list",
  "list-i",
  "list 1",
];

export type ClassificationResult = {
  depthLevel: QuestionDepthLevel;
  format: InicetQuestionFormat;
  isVignette: boolean;
  score: number; // 0 (simplest recall) to 100 (deepest clinical multi-step)
  clinicalKeywordsFound: string[];
};

/**
 * Classifies a question according to INICET cognitive depth and structure
 */
export function classifyInicetQuestion(
  vignette: string,
  options: string[] = [],
  hasImage = false,
): ClassificationResult {
  const text = (vignette || "").toLowerCase();
  const wordCount = text.split(/\s+/).filter(Boolean).length;
  const keywordsFound: string[] = [];

  for (const marker of CLINICAL_VIGNETTE_MARKERS) {
    if (text.includes(marker)) {
      keywordsFound.push(marker);
    }
  }

  const multiStepHits = MULTI_STEP_REASONING_MARKERS.filter((m) => text.includes(m));
  const isAssertionReason = ASSERTION_REASON_MARKERS.some((m) => text.includes(m));
  const isMatching = MATCHING_MARKERS.some((m) => text.includes(m));

  // Determine question format
  let format: InicetQuestionFormat = "SingleBestAnswer";
  if (isAssertionReason) {
    format = "AssertionReasoning";
  } else if (isMatching) {
    format = "MatchingMatrix";
  } else if (hasImage) {
    format = "ImageSpotter";
  } else if (options.some((o) => /both [a-d] and [a-d]|all of the above|1, 2, and 3/i.test(o))) {
    format = "MultipleTrueFalse";
  }

  // Calculate clinical reasoning score
  let score = 10;
  if (wordCount > 35) score += 20;
  if (wordCount > 75) score += 15;
  score += Math.min(keywordsFound.length * 10, 30);
  if (multiStepHits.length > 0) score += 20;
  if (hasImage) score += 15;

  const isVignette = keywordsFound.length >= 1 || (wordCount >= 40 && multiStepHits.length >= 1);

  // Determine depth level
  let depthLevel: QuestionDepthLevel = "L1_Recall";
  const hasTrapPhrases = /except|contraindicated|false regarding|incorrect|misleading|trap|least likely/i.test(text);

  if (format === "AssertionReasoning" || (score >= 80 && hasTrapPhrases)) {
    depthLevel = "L4_InicetTrap";
  } else if (score >= 40 || isVignette) {
    depthLevel = "L3_MultiStepClinical";
  } else if (hasImage || format === "ImageSpotter") {
    depthLevel = "L2_ImageSpotter";
  } else {
    depthLevel = "L1_Recall";
  }

  return {
    depthLevel,
    format,
    isVignette,
    score: Math.min(score, 100),
    clinicalKeywordsFound: keywordsFound,
  };
}
