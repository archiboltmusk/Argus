import type { Meta } from "@/lib/cinemeta";
import type { Profile } from "@/lib/profiles";
import {
  extractContentVector,
  centroidOf,
  cosineSimilarity,
} from "./content-dna";

export type TasteBlendResult = {
  profileA: Profile;
  profileB: Profile;
  compatibilityPercentage: number;
  sharedDNAHighlights: string[];
  combinedPicks: Array<{
    meta: Meta;
    synergyScore: number;
    reason: string;
  }>;
};

/**
 * Computes Spotify-style Taste Blend between two profiles.
 */
export function computeTasteBlend(
  profileA: Profile,
  itemsA: Meta[],
  profileB: Profile,
  itemsB: Meta[],
  candidatePool: Meta[],
): TasteBlendResult {
  const vectorsA = itemsA.map(extractContentVector);
  const vectorsB = itemsB.map(extractContentVector);

  const centroidA = centroidOf(vectorsA);
  const centroidB = centroidOf(vectorsB);

  // Cosine similarity gives raw compatibility from 0 to 1
  const rawSimilarity = cosineSimilarity(centroidA, centroidB);
  // Scale to human-friendly 65% - 99% range unless entirely empty
  const compatibilityPercentage =
    vectorsA.length === 0 || vectorsB.length === 0
      ? 75
      : Math.min(99, Math.max(62, Math.round(rawSimilarity * 100)));

  // Extract shared taste highlights
  const highlights: string[] = [];
  if (Math.abs(centroidA.complexity - centroidB.complexity) < 0.2 && centroidA.complexity > 0.6) {
    highlights.push("Both love mind-bending, cerebral plots");
  }
  if (Math.abs(centroidA.atmosphere - centroidB.atmosphere) < 0.2 && centroidA.atmosphere > 0.65) {
    highlights.push("Shared passion for immersive world-building");
  }
  if (Math.abs(centroidA.adrenaline - centroidB.adrenaline) < 0.2 && centroidA.adrenaline > 0.65) {
    highlights.push("Mutual excitement for high-octane pacing");
  }
  if (Math.abs(centroidA.valence - centroidB.valence) < 0.2 && centroidA.valence > 0.7) {
    highlights.push("Both appreciate witty, feel-good comedy");
  }
  if (highlights.length === 0) {
    highlights.push("Complementary cinematic instincts across genres");
  }

  // Filter out items already watched by either person
  const watchedIds = new Set<string>([...itemsA.map((m) => m.id), ...itemsB.map((m) => m.id)]);

  const scoredCandidates = candidatePool
    .filter((m) => !watchedIds.has(m.id))
    .map((meta) => {
      const vec = extractContentVector(meta);
      const simA = cosineSimilarity(centroidA, vec);
      const simB = cosineSimilarity(centroidB, vec);

      // Geometric mean rewards titles that appeal well to BOTH, penalizes titles that one hates
      const synergy = Math.sqrt(Math.max(0.01, simA) * Math.max(0.01, simB));

      let reason = `Balanced match for ${profileA.name} and ${profileB.name}`;
      if (simA > 0.8 && simB > 0.8) {
        reason = `Top 1% joint match for both viewers`;
      } else if (simA > 0.85) {
        reason = `Strong ${profileA.name} favorite with great crossover appeal`;
      } else if (simB > 0.85) {
        reason = `Strong ${profileB.name} favorite with great crossover appeal`;
      }

      return {
        meta,
        synergyScore: Math.round(synergy * 100),
        reason,
      };
    });

  scoredCandidates.sort((a, b) => b.synergyScore - a.synergyScore);

  return {
    profileA,
    profileB,
    compatibilityPercentage,
    sharedDNAHighlights: highlights,
    combinedPicks: scoredCandidates.slice(0, 15),
  };
}
