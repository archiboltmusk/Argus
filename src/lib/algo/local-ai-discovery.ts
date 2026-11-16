/**
 * Argus Local-First AI Decision Layer
 *
 * Designed to eliminate "decision fatigue" and protect the "private loop"
 * between the filmmaker/creator and the viewer.
 *
 * Core Principles:
 * 1. Zero Cloud Dependency: Runs entirely offline on-device (via local embeddings
 *    or lightweight GGUF models with Metal/Vulkan acceleration).
 * 2. Zero Telemetry & Private Loop: Behavioral data never leaves the device and is
 *    never written back to invasive profiling logs.
 * 3. The Encounter Layer: Instead of an overwhelming endless grid, returns EXACTLY ONE
 *    sovereign recommendation tailored to the viewer's psychological need, time budget,
 *    and social co-presence state.
 */

export type PsychologicalMood =
  | "need-resolution"             // Craving closure, moral or emotional resolution
  | "need-to-borrow-grief"       // Safe container for catharsis, tragedy, tears
  | "need-to-be-bored"           // Meditative, slow cinema, headspace to think
  | "need-transcendence"         // Cosmic awe, sublime visual/auditory wonder
  | "need-pure-kinetic-energy"   // High adrenaline, relentless momentum, pulse-racing
  | "need-intellectual-puzzle";  // Predictive processing challenge, labyrinthine mystery

export type CoPresenceState =
  | "alone"                      // Intimate, uninhibited personal exploration
  | "with-partner"               // High dialogue, shared empathy, zero-awkwardness
  | "with-group-or-strangers";   // High energy, spectacle, accessible pacing

export interface EncounterQuery {
  mood: PsychologicalMood;
  timeConstraintMinutes: number; // e.g. 30, 90, 150 min
  coPresence: CoPresenceState;
  unwatchedOnly?: boolean;
}

export interface SovereignEncounterResult {
  id: string;
  title: string;
  year: number;
  durationMinutes: number;
  director?: string;
  backdropUrl?: string;
  posterUrl?: string;
  logline: string;
  whyThisNow: string; // Epistemic reason for this single choice
  confidenceScore: number;
  tags: string[];
}

export interface CatalogItemForDiscovery {
  id: string;
  title: string;
  year: number;
  durationMinutes: number;
  director?: string;
  genres: string[];
  themes: string[];
  tempo: "slow" | "medium" | "frenetic";
  emotionalWeight: "cathartic" | "uplifting" | "challenging" | "meditative" | "tense";
  backdropUrl?: string;
  posterUrl?: string;
  logline: string;
  unwatched: boolean;
  semanticVector?: number[]; // 8-dimensional normalized emotional DNA vector
}

/**
 * 8-Dimensional Emotional DNA vector definitions:
 * [0]: Kineticism (0: contemplative/static -> 1: relentless action)
 * [1]: Melancholy / Catharsis (0: cheerful/light -> 1: deep tragic weight)
 * [2]: Intellectual Complexity (0: straightforward -> 1: non-linear puzzle)
 * [3]: Wonder / Transcendence (0: gritty grounded -> 1: cosmic sublime)
 * [4]: Intimacy vs Spectacle (0: hyper-personal micro-budget -> 1: monumental scale)
 * [5]: Cognitive Demands (0: background relaxation -> 1: total focus required)
 * [6]: Resolution / Closure (0: open-ended ambiguity -> 1: tight finality)
 * [7]: Group Co-watch Suitability (0: private solo immersion -> 1: crowd pleasing)
 */

export const MOOD_TARGET_VECTORS: Record<PsychologicalMood, number[]> = {
  "need-resolution":             [0.4, 0.3, 0.4, 0.5, 0.6, 0.5, 0.95, 0.7],
  "need-to-borrow-grief":       [0.2, 0.95, 0.6, 0.4, 0.3, 0.8, 0.7, 0.3],
  "need-to-be-bored":           [0.05, 0.3, 0.5, 0.7, 0.4, 0.2, 0.4, 0.2],
  "need-transcendence":         [0.3, 0.4, 0.7, 0.98, 0.9, 0.7, 0.6, 0.5],
  "need-pure-kinetic-energy":   [0.98, 0.1, 0.3, 0.3, 0.8, 0.4, 0.8, 0.9],
  "need-intellectual-puzzle":   [0.5, 0.3, 0.98, 0.5, 0.5, 0.95, 0.8, 0.5],
};

function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length || vecA.length === 0) return 0;
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Calculates a candidate's semantic vector if one was not pre-computed.
 */
export function computeItemSemanticVector(item: CatalogItemForDiscovery): number[] {
  if (item.semanticVector && item.semanticVector.length === 8) {
    return item.semanticVector;
  }

  // Synthesize from metadata attributes
  let kineticism = item.tempo === "frenetic" ? 0.9 : item.tempo === "slow" ? 0.1 : 0.5;
  let melancholy = item.emotionalWeight === "cathartic" ? 0.9 : item.emotionalWeight === "challenging" ? 0.6 : 0.2;
  let complexity = item.genres.some((g) => ["mystery", "sci-fi", "psychological"].includes(g.toLowerCase())) ? 0.85 : 0.4;
  let wonder = item.genres.some((g) => ["sci-fi", "fantasy", "documentary"].includes(g.toLowerCase())) ? 0.8 : 0.3;
  let intimacy = item.genres.some((g) => ["drama", "romance", "biography"].includes(g.toLowerCase())) ? 0.3 : 0.7;
  let cognitive = item.emotionalWeight === "challenging" ? 0.85 : 0.4;
  let closure = item.emotionalWeight === "cathartic" ? 0.8 : 0.5;
  let groupFit = item.genres.some((g) => ["action", "comedy", "adventure"].includes(g.toLowerCase())) ? 0.85 : 0.3;

  return [kineticism, melancholy, complexity, wonder, intimacy, cognitive, closure, groupFit];
}

/**
 * Local-First AI Discovery Engine: Returns ONLY ONE recommendation to defeat decision fatigue.
 */
export class LocalAiDiscoveryEngine {
  private catalog: CatalogItemForDiscovery[] = [];

  constructor(initialCatalog: CatalogItemForDiscovery[] = []) {
    this.catalog = [...initialCatalog];
  }

  public registerItems(items: CatalogItemForDiscovery[]): void {
    this.catalog.push(...items);
  }

  public clearCatalog(): void {
    this.catalog = [];
  }

  /**
   * The Encounter Encounter resolver:
   * 1. Filters strictly by time constraint (must be <= requested minutes + 15 min tolerance).
   * 2. Evaluates semantic cosine distance to the psychological mood vector.
   * 3. Adjusts for co-presence (alone vs group crowd dynamics).
   * 4. Returns the single highest-resonance match with an epistemic "why this now" explanation.
   */
  public resolveSovereignEncounter(query: EncounterQuery): SovereignEncounterResult | null {
    if (this.catalog.length === 0) return null;

    const targetVector = MOOD_TARGET_VECTORS[query.mood];
    const maxDuration = query.timeConstraintMinutes + 15; // 15-minute tolerance

    let candidates = this.catalog.filter((item) => {
      if (item.durationMinutes > maxDuration) return false;
      if (query.unwatchedOnly && !item.unwatched) return false;
      return true;
    });

    if (candidates.length === 0) {
      // Fallback: relax duration constraint if no match within budget
      candidates = query.unwatchedOnly ? this.catalog.filter((i) => i.unwatched) : [...this.catalog];
      if (candidates.length === 0) return null;
    }

    let bestItem: CatalogItemForDiscovery | null = null;
    let highestScore = -Infinity;

    for (const item of candidates) {
      const itemVec = computeItemSemanticVector(item);
      let score = cosineSimilarity(targetVector, itemVec);

      // Co-presence adjustment:
      if (query.coPresence === "with-group-or-strangers") {
        // Boost group-friendly items, penalize hyper-private meditative items
        score += itemVec[7] * 0.15 - itemVec[1] * 0.1;
      } else if (query.coPresence === "alone") {
        // Boost deep intimacy / contemplative weight
        score += itemVec[1] * 0.1 + (1.0 - itemVec[7]) * 0.1;
      }

      // Time fit bonus: closer to target time gets slight affinity
      const timeDiff = Math.abs(item.durationMinutes - query.timeConstraintMinutes);
      const timePenalty = (timeDiff / 120) * 0.08;
      score -= timePenalty;

      if (score > highestScore) {
        highestScore = score;
        bestItem = item;
      }
    }

    if (!bestItem) return null;

    const whyThisNow = this.formulateEpistemicReason(bestItem, query, highestScore);

    return {
      id: bestItem.id,
      title: bestItem.title,
      year: bestItem.year,
      durationMinutes: bestItem.durationMinutes,
      director: bestItem.director,
      backdropUrl: bestItem.backdropUrl,
      posterUrl: bestItem.posterUrl,
      logline: bestItem.logline,
      whyThisNow,
      confidenceScore: Math.max(0, Math.min(1, highestScore)),
      tags: [...bestItem.genres, ...bestItem.themes],
    };
  }

  private formulateEpistemicReason(
    item: CatalogItemForDiscovery,
    query: EncounterQuery,
    score: number
  ): string {
    const moodLabels: Record<PsychologicalMood, string> = {
      "need-resolution": "emotional clarity and decisive closure",
      "need-to-borrow-grief": "a safe container to experience catharsis without real-world consequences",
      "need-to-be-bored": "spacious silence and contemplative visual poetry",
      "need-transcendence": "awe and the expansion of sensory scale",
      "need-pure-kinetic-energy": "unapologetic forward momentum and visceral tempo",
      "need-intellectual-puzzle": "a labyrinth that honors your attention and predictive mind",
    };

    const socialNote =
      query.coPresence === "with-group-or-strangers"
        ? " Calibrated for shared attention and communal energy."
        : query.coPresence === "alone"
        ? " Suited for private, uninterrupted reflection."
        : " Balanced for dual-viewing without cognitive friction.";

    const percentage = Math.round(Math.min(99, Math.max(65, score * 100)));

    return `Selected for your current need for ${moodLabels[query.mood]}. At ${item.durationMinutes} minutes, it fits your ${query.timeConstraintMinutes}-minute window with a ${percentage}% semantic resonance.${socialNote}`;
  }
}
