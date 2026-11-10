import type { Meta } from "@/lib/cinemeta";
import { extractContentVector, cosineSimilarity } from "./content-dna";
import { getImpressionFatigueDiscount } from "./implicit-tracker";

export type Daypart = "late_night" | "morning" | "afternoon" | "prime_time";

export type SessionContext = {
  lastWatchedMeta?: Meta;
  lastWatchCompletionRatio?: number; // 0.0 to 1.0
  isEpisodicSeries?: boolean;
  timeOfDay: Daypart;
};

/**
 * Determine current daypart based on local hour.
 */
export function getCurrentDaypart(date = new Date()): Daypart {
  const hour = date.getHours();
  if (hour >= 23 || hour < 5) return "late_night";
  if (hour >= 5 && hour < 12) return "morning";
  if (hour >= 12 && hour < 18) return "afternoon";
  return "prime_time"; // 18:00 - 23:00
}

/**
 * YouTube-style session-aware "Watch Next" ranker.
 * Uses Markov state transitions and psychological palate cleanser rules
 * to rank what the user wants to watch *right now*.
 */
export function rankNextUpCandidates(
  candidates: Meta[],
  session: SessionContext,
  limit = 20,
): Meta[] {
  if (candidates.length === 0) return [];

  const lastVec = session.lastWatchedMeta ? extractContentVector(session.lastWatchedMeta) : null;
  const isHeavyFilm =
    lastVec &&
    (lastVec.violence > 0.5 || lastVec.tone < 0.45 || lastVec.complexity > 0.65);

  const scored = candidates.map((meta) => {
    const vec = extractContentVector(meta);
    let transitionScore = 0.5;

    // 1. Session transition heuristic:
    if (lastVec) {
      if (isHeavyFilm) {
        // Palate Cleanser Rule:
        // After a heavy, depressing, or 3-hour brain-draining drama,
        // penalize more darkness, reward comedy, animation, uplifting tone.
        const palateMatch = vec.valence * 0.4 + vec.tone * 0.4 + (1 - vec.violence) * 0.2;
        transitionScore = palateMatch;
      } else {
        // Momentum continuation: similar mood vector
        transitionScore = cosineSimilarity(lastVec, vec);
      }
    }

    // 2. Dayparting bias:
    let daypartBonus = 1.0;
    if (session.timeOfDay === "late_night") {
      // Late night favors gentle sound, lower adrenaline, comfort, or mystery
      if (vec.adrenaline > 0.75) daypartBonus *= 0.8;
      if (vec.valence > 0.6 || vec.atmosphere > 0.7) daypartBonus *= 1.25;
    } else if (session.timeOfDay === "prime_time") {
      // Prime time favors big cinematic experiences
      if (vec.pacing > 0.6 || vec.complexity > 0.6) daypartBonus *= 1.2;
    } else if (session.timeOfDay === "morning") {
      // Morning favors short, cheerful, episodic
      if (vec.valence > 0.6) daypartBonus *= 1.2;
      if (vec.violence > 0.8) daypartBonus *= 0.7;
    }

    // 3. Impression fatigue dampening (YouTube-style anti-staleness)
    const fatigueDiscount = getImpressionFatigueDiscount(meta.id);

    const finalScore = transitionScore * daypartBonus * fatigueDiscount;

    return { meta, score: finalScore };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map((s) => s.meta);
}
