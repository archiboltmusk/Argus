/**
 * Argus CoreBTR Socratic Cognitive Bias & Misreading Decoder
 *
 * Diagnoses the root cognitive failure modes leading to incorrect answers in
 * high-stakes medical examinations (NEET-PG / INI-CET):
 *
 * 1. NegativeBlindness: Overlooking "EXCEPT", "NOT", "FALSE", "LEAST likely"
 * 2. AnchorBias: Fixating on initial clinical presentation and ignoring late disconfirming labs/imaging
 * 3. PrematureClosure: Answering in < 15 seconds after seeing the first familiar option
 * 4. AvailabilityHeuristic: Choosing common presentation when specific pathognomonic marker pointed elsewhere
 * 5. OverthinkingTrap: Over-complicating a textbook cardinal repeat into a rare zebra
 * 6. ExaminerTrapFall: Falling directly into the distractor intentionally engineered by examiners
 * 7. PureRecallGap: Core factual knowledge absence
 */

import type { ClinicalQuestion } from "./qbank-types";

export type CognitiveBiasType =
  | "NegativeBlindness"
  | "AnchorBias"
  | "PrematureClosure"
  | "AvailabilityHeuristic"
  | "OverthinkingTrap"
  | "ExaminerTrapFall"
  | "PureRecallGap";

export interface CognitiveDiagnosis {
  biasType: CognitiveBiasType;
  confidence: number; // 0.0 to 1.0
  title: string;
  summary: string;
  socraticPrompt: string;
  prescribedRemedy: string;
  retestRecommendation: string;
  detectedClues: string[];
}

export interface CandidateResponseTelemetry {
  question: ClinicalQuestion;
  selectedIndex: number;
  timeSpentSeconds: number;
  changedMind: boolean; // Changed answer prior to submit
}

const NEGATIVE_STEM_REGEX = /\b(except|not|least likely|false|contraindicated|unlikely|incorrect)\b/i;

/**
 * Diagnoses the cognitive bias behind an incorrect medical response
 */
export function decodeCognitiveBias(telemetry: CandidateResponseTelemetry): CognitiveDiagnosis {
  const { question, selectedIndex, timeSpentSeconds, changedMind } = telemetry;
  const isCorrect = selectedIndex === question.correctIndex;

  if (isCorrect) {
    return {
      biasType: "PureRecallGap",
      confidence: 0,
      title: "Accurate Clinical Reasoning",
      summary: "Answer answered correctly with sound cognitive appraisal.",
      socraticPrompt: "Why is your chosen option definitively superior to the closest distractor?",
      prescribedRemedy: "Consolidate this high-yield pearl into long-term spaced repetition memory.",
      retestRecommendation: "Schedule FSRS spaced review in 7 days.",
      detectedClues: ["Correct answer reached"],
    };
  }

  const stem = question.vignette;
  const chosenOption = question.options[selectedIndex] || "";
  const correctOption = question.options[question.correctIndex] || "";
  const detectedClues: string[] = [];

  // Check 1: Negative Blindness (Missed EXCEPT / NOT)
  const negativeMatch = stem.match(NEGATIVE_STEM_REGEX);
  if (negativeMatch) {
    detectedClues.push(`Stem contains negative polarity keyword: "${negativeMatch[0]}"`);
    return {
      biasType: "NegativeBlindness",
      confidence: 0.94,
      title: "Negative Stem Polarity Blindness",
      summary: `You overlooked the negation ("${negativeMatch[0].toUpperCase()}") in the question stem. You identified a correct true statement rather than finding the requested exception/contraindication.`,
      socraticPrompt: `Notice the word "${negativeMatch[0].toUpperCase()}". Did you pick option ${String.fromCharCode(
        65 + selectedIndex
      )} because it felt clinically TRUE in general?`,
      prescribedRemedy:
        "Protocol for Negatives: Circle/highlight every 'EXCEPT' or 'NOT' immediately upon first reading before reading a single option.",
      retestRecommendation: "Drill 10 negative-stem exception questions consecutively to rewire reflex.",
      detectedClues,
    };
  }

  // Check 2: Premature Closure (< 18 seconds response time on a clinical vignette)
  if (timeSpentSeconds > 0 && timeSpentSeconds < 18 && stem.length > 120) {
    detectedClues.push(`Speed anomaly: ${timeSpentSeconds}s elapsed on a ${stem.length}-character vignette`);
    return {
      biasType: "PrematureClosure",
      confidence: 0.88,
      title: "Premature Cognitive Closure",
      summary:
        "You locked in your response in under 18 seconds without systematically appraising all 4 options. In competitive exams, distracter A is frequently an alluring near-miss designed for quick responders.",
      socraticPrompt:
        "Did you stop reading options thoroughly once you spotted a familiar medical term in your selected choice?",
      prescribedRemedy:
        "Implement the 'Rule of 4 Options': Never click submit until you have actively disqualified all 3 distractors.",
      retestRecommendation: "Enforce a mandatory 25-second minimum deliberation pause on vignette questions.",
      detectedClues,
    };
  }

  // Check 3: Examiner Trap Fall (Matched known examiner trap)
  if (question.examinerTrap && question.examinerTrap.length > 10) {
    detectedClues.push("Question possesses documented examiner trap profile");
    return {
      biasType: "ExaminerTrapFall",
      confidence: 0.86,
      title: "Examiner Trap Vulnerability",
      summary: `You fell into the canonical trap engineered into this item: "${question.examinerTrap.slice(0, 100)}..."`,
      socraticPrompt: `What specific discriminator distinguishes "${chosenOption}" from "${correctOption}" in this patient's age/demographic group?`,
      prescribedRemedy:
        "Examine the 'Distractor Inversion' table to understand the precise clinical presentation where your option would actually be valid.",
      retestRecommendation: "Review the BTR Inversion Matrix for this sub-topic.",
      detectedClues,
    };
  }

  // Check 4: Overthinking Trap (Second-guessing cardinal repeat)
  const isHighYieldRepeat = question.highYieldTags?.some((t) => /repeat|cardinal|must_know/i.test(t));
  if (isHighYieldRepeat && changedMind) {
    detectedClues.push("Candidate modified answer away from original choice on a high-yield cardinal repeat");
    return {
      biasType: "OverthinkingTrap",
      confidence: 0.82,
      title: "Overthinking & Second-Guessing Syndrome",
      summary:
        "You changed your mind on a classic repeat question. You assumed the question was a trick and talked yourself out of the straightforward correct answer.",
      socraticPrompt:
        "When you hear hoofbeats, think horses, not zebras. Was your initial visceral intuition correct before you rationalized a rare presentation?",
      prescribedRemedy:
        "First-Instinct Rule: Never change an answer on a cardinal repeat unless you discovered an overlooked factual clue in the vignette.",
      retestRecommendation: "Practice 15 high-speed cardinal repeat drills under timed tension.",
      detectedClues,
    };
  }

  // Check 5: Anchor Bias (Fixated on first symptom, ignored lab/imaging)
  const hasLabOrImaging = /MRI|CT|X-ray|ultrasound|biopsy|hemoglobin|creatinine|CSF|ECG|EEG/i.test(stem);
  if (hasLabOrImaging && stem.indexOf("\n") !== -1) {
    detectedClues.push("Multi-sentence vignette with conflicting symptom vs laboratory/investigation data");
    return {
      biasType: "AnchorBias",
      confidence: 0.78,
      title: "Diagnostic Anchoring Bias",
      summary:
        "You anchored onto the patient's presenting chief complaint, overlooking decisive confirmatory laboratory or radiological evidence that disqualified your diagnosis.",
      socraticPrompt:
        "Re-read the lab values and imaging report. Does your selected option reconcile with that diagnostic investigation?",
      prescribedRemedy:
        "Two-Pass Vignette Triage: Read the last sentence (the actual ask) first, then scan labs/imaging before the chief complaint narrative.",
      retestRecommendation: "Engage in image-and-investigation paired clinical vignette drills.",
      detectedClues,
    };
  }

  // Check 6: Availability Heuristic (Classic disease chosen over nuanced diagnosis)
  if (stem.length > 200) {
    detectedClues.push("Long clinical vignette with rich differential features");
    return {
      biasType: "AvailabilityHeuristic",
      confidence: 0.72,
      title: "Availability Heuristic",
      summary:
        "You selected the most readily recalled condition rather than the condition uniquely characterized by the patient's exact constellation of signs.",
      socraticPrompt: `What single atypical clinical feature ruled out "${chosenOption}"?`,
      prescribedRemedy:
        "Tabulate the differential diagnosis: identify the single pathognomonic feature that splits the two contenders.",
      retestRecommendation: "Review comparison tables in Harrison / Robbins summaries.",
      detectedClues,
    };
  }

  // Default: Pure Recall Gap
  return {
    biasType: "PureRecallGap",
    confidence: 0.65,
    title: "Knowledge / Fact Recall Gap",
    summary:
      "This question tested a specific factual guideline, anatomical boundary, or pharmacological mechanism not currently consolidated in your memory.",
    socraticPrompt: "Is this a concept you have never encountered, or one you knew but couldn't recall under pressure?",
    prescribedRemedy:
      "Convert this exact clinical pearl into a 20-word active recall prompt in your Argus Volatile Vault.",
    retestRecommendation: "Add to Argus FSRS review queue with 1-day retention interval.",
    detectedClues: ["No systemic misreading bias detected; factual discrepancy identified"],
  };
}

/**
 * Aggregates cognitive diagnoses across an entire test session to identify systemic candidate weaknesses
 */
export function aggregateSessionBiases(responses: CandidateResponseTelemetry[]): {
  primaryBias: CognitiveBiasType;
  biasCounts: Record<CognitiveBiasType, number>;
  totalErrors: number;
  executiveActionPlan: string;
} {
  const incorrectResponses = responses.filter((r) => r.selectedIndex !== r.question.correctIndex);
  const biasCounts: Record<CognitiveBiasType, number> = {
    NegativeBlindness: 0,
    AnchorBias: 0,
    PrematureClosure: 0,
    AvailabilityHeuristic: 0,
    OverthinkingTrap: 0,
    ExaminerTrapFall: 0,
    PureRecallGap: 0,
  };

  for (const resp of incorrectResponses) {
    const diag = decodeCognitiveBias(resp);
    biasCounts[diag.biasType] = (biasCounts[diag.biasType] || 0) + 1;
  }

  let primaryBias: CognitiveBiasType = "PureRecallGap";
  let maxCount = -1;

  for (const [bias, count] of Object.entries(biasCounts)) {
    if (count > maxCount) {
      maxCount = count;
      primaryBias = bias as CognitiveBiasType;
    }
  }

  let executiveActionPlan = "";
  switch (primaryBias) {
    case "NegativeBlindness":
      executiveActionPlan =
        "CRITICAL ALERT: Negative stem blindness is leaking marks on questions you clinically understand. High-priority discipline needed: physically highlight 'EXCEPT' and 'NOT' in every single item.";
      break;
    case "PrematureClosure":
      executiveActionPlan =
        "SPEED TRAP: You are rushing through questions in under 18 seconds and picking seductive distracters. Enforce an unshakeable 25-second minimum deliberation on all vignette stems.";
      break;
    case "ExaminerTrapFall":
      executiveActionPlan =
        "TRAP SENSITIVITY: You are walking into classic examiner traps. Study the 'Distractor Inversion' section after every practice session to anticipate trap architecture.";
      break;
    case "OverthinkingTrap":
      executiveActionPlan =
        "MINDSET FIX: Stop talking yourself out of the obvious answer. High-yield repeats must be locked in with conviction without second-guessing.";
      break;
    case "AnchorBias":
      executiveActionPlan =
        "TRIAGE OVERHAUL: Stop anchoring to the opening sentence. Read the final question stem and labs first before processing the narrative.";
      break;
    default:
      executiveActionPlan =
        "CONSOLIDATION PHASE: Errors are predominantly factual recall gaps. Feed these items into your Argus Spaced Repetition queue for 24-hour review.";
      break;
  }

  return {
    primaryBias,
    biasCounts,
    totalErrors: incorrectResponses.length,
    executiveActionPlan,
  };
}
