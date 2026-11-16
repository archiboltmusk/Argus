/**
 * Prerequisite Concept Graph & Root-Cause Error Diagnostics
 *
 * Maps high-level clinical and scientific problems down to foundational concepts.
 * When a student repeatedly misses questions on an advanced topic, the system
 * traverses backward through the graph to surface the exact root-cause weakness.
 */

export type ConceptNode = {
  id: string;
  title: string;
  category: "medical" | "engineering" | "science" | "math";
  description: string;
  prerequisiteIds: string[];
  refresherTip: string;
};

export type StudentConceptStats = {
  conceptId: string;
  attempts: number;
  failures: number;
  lastAttemptAt: number;
  mastered: boolean;
};

const CONCEPT_STATS_STORAGE_KEY = "argus.education.concept_stats.v1";

export const FOUNDATIONAL_CONCEPT_GRAPH: Record<string, ConceptNode> = {
  // Cardiovascular Physiology
  "cardiac-output": {
    id: "cardiac-output",
    title: "Cardiac Output & Hemodynamics",
    category: "medical",
    description: "Volume of blood pumped by each ventricle per minute (CO = HR x SV).",
    prerequisiteIds: ["stroke-volume", "heart-rate-regulation"],
    refresherTip: "Cardiac output is determined by Stroke Volume multiplied by Heart Rate. Always check which factor is altered first.",
  },
  "stroke-volume": {
    id: "stroke-volume",
    title: "Stroke Volume & Ventricular Mechanics",
    category: "medical",
    description: "End-diastolic volume minus end-systolic volume, governed by preload, afterload, and contractility.",
    prerequisiteIds: ["frank-starling", "contractility-inotropy", "afterload-resistance"],
    refresherTip: "Stroke Volume depends on 3 pillars: Preload (filling), Afterload (resistance), and Contractility (squeeze).",
  },
  "frank-starling": {
    id: "frank-starling",
    title: "Frank-Starling Relationship",
    category: "medical",
    description: "Myocardial stretch increases contractile force via optimal sarcomere length and calcium sensitivity.",
    prerequisiteIds: ["sarcomere-structure"],
    refresherTip: "Greater venous return stretches sarcomeres toward 2.2 µm, increasing force of contraction without sympathetic input.",
  },
  "sarcomere-structure": {
    id: "sarcomere-structure",
    title: "Sarcomere & Actin-Myosin Crossbridge",
    category: "medical",
    description: "Functional unit of striated muscle contraction involving actin, myosin, troponin, and tropomyosin.",
    prerequisiteIds: [],
    refresherTip: "Calcium binds troponin C, moving tropomyosin to expose myosin-binding sites on actin.",
  },

  // Upper Limb Neuroanatomy
  "brachial-plexus-roots": {
    id: "brachial-plexus-roots",
    title: "Brachial Plexus Trunks & Roots",
    category: "medical",
    description: "C5-T1 spinal nerve rami organizing into Superior, Middle, and Inferior trunks.",
    prerequisiteIds: ["spinal-nerve-roots"],
    refresherTip: "Remember: C5-C6 = Upper, C7 = Middle, C8-T1 = Lower. Upper trunk injury affects shoulder/arm flexors.",
  },
  "spinal-nerve-roots": {
    id: "spinal-nerve-roots",
    title: "Spinal Nerve Root Anatomy",
    category: "medical",
    description: "Ventral (motor) and dorsal (sensory) root convergence into mixed spinal nerves.",
    prerequisiteIds: [],
    refresherTip: "Cervical nerves C1-C7 exit above their vertebrae; C8 exits below C7; T1-L5 exit below their vertebrae.",
  },

  // Renal & Acid-Base
  "metabolic-acidosis": {
    id: "metabolic-acidosis",
    title: "Metabolic Acidosis & Anion Gap",
    category: "medical",
    description: "Primary decrease in HCO3- with compensatory hyperventilation (decreased PaCO2).",
    prerequisiteIds: ["henderson-hasselbalch", "anion-gap-principles"],
    refresherTip: "Always calculate the Anion Gap: Na - (Cl + HCO3). Normal is 10-12. If >12, look for MUDPILES causes.",
  },
  "henderson-hasselbalch": {
    id: "henderson-hasselbalch",
    title: "Henderson-Hasselbalch & Buffer Systems",
    category: "science",
    description: "pH = 6.1 + log([HCO3-] / (0.03 * PaCO2)). Carbonic acid-bicarbonate buffer system.",
    prerequisiteIds: [],
    refresherTip: "pH is a ratio: kidneys control the numerator (HCO3-), lungs control the denominator (PaCO2).",
  },
};

/**
 * Loads student concept performance history.
 */
export function loadAllConceptStats(): Record<string, StudentConceptStats> {
  try {
    const raw = localStorage.getItem(CONCEPT_STATS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

/**
 * Records an attempt on a concept, adjusting failure rate.
 */
export function recordConceptAttempt(conceptId: string, passed: boolean): StudentConceptStats {
  const all = loadAllConceptStats();
  const current = all[conceptId] || {
    conceptId,
    attempts: 0,
    failures: 0,
    lastAttemptAt: Date.now(),
    mastered: false,
  };

  current.attempts += 1;
  if (!passed) {
    current.failures += 1;
    current.mastered = false;
  } else if (current.attempts >= 3 && current.failures / current.attempts < 0.25) {
    current.mastered = true;
  }
  current.lastAttemptAt = Date.now();

  all[conceptId] = current;
  try {
    localStorage.setItem(CONCEPT_STATS_STORAGE_KEY, JSON.stringify(all));
  } catch {}

  return current;
}

export type RootCauseDiagnostic = {
  targetConcept: ConceptNode;
  rootCauseConcept?: ConceptNode;
  chain: string[];
  recommendation: string;
};

/**
 * Diagnoses root-cause failure by traversing backward through prerequisites.
 * If a student misses questions on an advanced topic and also has unmastered
 * prerequisites, flags the foundational root cause.
 */
export function diagnoseRootCause(conceptId: string): RootCauseDiagnostic | null {
  const targetNode = FOUNDATIONAL_CONCEPT_GRAPH[conceptId];
  if (!targetNode) return null;

  const stats = loadAllConceptStats();
  const chain: string[] = [targetNode.title];

  let rootCause: ConceptNode | undefined;

  const queue = [...targetNode.prerequisiteIds];
  const visited = new Set<string>([conceptId]);

  while (queue.length > 0) {
    const prereqId = queue.shift()!;
    if (visited.has(prereqId)) continue;
    visited.add(prereqId);

    const prereqNode = FOUNDATIONAL_CONCEPT_GRAPH[prereqId];
    if (!prereqNode) continue;

    chain.push(prereqNode.title);
    const prereqStats = stats[prereqId];

    // If prerequisite has high failure rate or has never been practiced, it is a likely root cause
    if (prereqStats && prereqStats.failures > 0 && prereqStats.failures / prereqStats.attempts > 0.4) {
      rootCause = prereqNode;
      break;
    } else if (prereqNode.prerequisiteIds.length > 0) {
      queue.push(...prereqNode.prerequisiteIds);
    }
  }

  // If no broken ancestor found, pick the most immediate prerequisite as a safety refresher
  if (!rootCause && targetNode.prerequisiteIds.length > 0) {
    rootCause = FOUNDATIONAL_CONCEPT_GRAPH[targetNode.prerequisiteIds[0]];
  }

  const recommendation = rootCause
    ? `Your struggle with "${targetNode.title}" traces back to "${rootCause.title}". ${rootCause.refresherTip}`
    : `Review foundational principle: ${targetNode.refresherTip}`;

  return {
    targetConcept: targetNode,
    rootCauseConcept: rootCause,
    chain,
    recommendation,
  };
}
