/**
 * Three-Layer Hybrid Film Discovery & Recommendation Engine
 * Specifically designed to defeat decision fatigue, popularity bias, and cold-start sparsity
 * by trading endless 50-poster grids for Three Curated Selection Paths:
 * 1. The Safe Bet (Exploitation: Highest taste-profile confidence)
 * 2. The Stretch (Exploration: Same emotional vibe in an unvisited genre)
 * 3. The Wildcard (Curated Cult/Classic/Foreign gem via Contextual Bandit)
 */

import type { Meta } from "@/lib/cinemeta";
import {
  type ContentVector,
  extractContentVector,
  cosineSimilarity,
  centroidOf,
} from "./content-dna";

export type CuratedMood =
  | "cathartic"
  | "mind-bending"
  | "cozy"
  | "high-octane"
  | "slow-burn"
  | "laugh-out-loud"
  | "unsettling"
  | "escapist";

export interface VibeSearchQuery {
  mood: CuratedMood;
  maxRuntimeMinutes?: number;
  allowForeignLanguage?: boolean;
  minImdbRating?: number;
  excludedIds?: string[];
}

export interface WatchHistoryEntry {
  meta: Meta;
  watchedAtEpochMs: number;
  completedFraction: number; // 0.0 to 1.0
  userRating?: number;       // Optional 1 to 10
}

export interface CuratedSelectionPath {
  item: Meta;
  pathType: "safe-bet" | "stretch" | "wildcard";
  confidenceScore: number; // 0 to 100
  headline: string;
  reason: string;
  vibeTags: string[];
}

export interface CuratedTriadResult {
  safeBet: CuratedSelectionPath;
  stretch: CuratedSelectionPath;
  wildcard: CuratedSelectionPath;
  candidatePoolSize: number;
  vibeCentroid: ContentVector;
}

// Layer 1: Canonical Vibe Centroids mapping emotional states to 8D DNA space
export const VIBE_CENTROIDS: Record<CuratedMood, ContentVector> = {
  cathartic: {
    pacing: 0.40,
    tone: 0.30,
    complexity: 0.75,
    atmosphere: 0.85,
    vintage: 0.35,
    violence: 0.20,
    adrenaline: 0.30,
    valence: 0.15, // High emotional release / poignant
  },
  "mind-bending": {
    pacing: 0.65,
    tone: 0.45,
    complexity: 0.98, // Extreme narrative complexity
    atmosphere: 0.88,
    vintage: 0.25,
    violence: 0.45,
    adrenaline: 0.60,
    valence: 0.40,
  },
  cozy: {
    pacing: 0.35,
    tone: 0.90,
    complexity: 0.30,
    atmosphere: 0.70,
    vintage: 0.40,
    violence: 0.02, // Gentle, zero visceral dread
    adrenaline: 0.15,
    valence: 0.88,
  },
  "high-octane": {
    pacing: 0.95,
    tone: 0.50,
    complexity: 0.40,
    atmosphere: 0.60,
    vintage: 0.15,
    violence: 0.75,
    adrenaline: 0.98, // Max kinetic energy
    valence: 0.55,
  },
  "slow-burn": {
    pacing: 0.20, // Deliberate, methodical tempo
    tone: 0.35,
    complexity: 0.80,
    atmosphere: 0.95, // Heavy atmospheric immersion
    vintage: 0.50,
    violence: 0.40,
    adrenaline: 0.25,
    valence: 0.30,
  },
  "laugh-out-loud": {
    pacing: 0.75,
    tone: 0.92,
    complexity: 0.35,
    atmosphere: 0.40,
    vintage: 0.25,
    violence: 0.08,
    adrenaline: 0.45,
    valence: 0.98, // Peak comedic relief
  },
  unsettling: {
    pacing: 0.55,
    tone: 0.08, // Pitch dark dread
    complexity: 0.70,
    atmosphere: 0.96,
    vintage: 0.30,
    violence: 0.85,
    adrenaline: 0.80,
    valence: 0.05,
  },
  escapist: {
    pacing: 0.70,
    tone: 0.80,
    complexity: 0.55,
    atmosphere: 0.98, // World-building escapism
    vintage: 0.30,
    violence: 0.30,
    adrenaline: 0.65,
    valence: 0.75,
  },
};

/**
 * Parses runtime string (e.g. "124 min", "1 h 45 min", "90m") into integer minutes.
 */
export function parseRuntimeToMinutes(runtimeStr?: string): number | null {
  if (!runtimeStr) return null;
  const cleaned = runtimeStr.toLowerCase().trim();

  // "1 h 45 min" or "2h 10m"
  const hrMatch = cleaned.match(/(\d+)\s*(?:h|hr|hours?)/);
  const minMatch = cleaned.match(/(\d+)\s*(?:m|min|mins|minutes?)/);

  if (hrMatch) {
    const hrs = parseInt(hrMatch[1], 10);
    const mins = minMatch ? parseInt(minMatch[1], 10) : 0;
    return hrs * 60 + mins;
  }

  if (minMatch) {
    return parseInt(minMatch[1], 10);
  }

  // Bare number
  const bareMatch = cleaned.match(/^(\d+)$/);
  if (bareMatch) {
    return parseInt(bareMatch[1], 10);
  }

  return null;
}

export class HybridDiscoveryEngine {
  private history: WatchHistoryEntry[] = [];
  private userTasteCentroid: ContentVector | null = null;

  constructor(history: WatchHistoryEntry[] = []) {
    this.setWatchHistory(history);
  }

  public setWatchHistory(history: WatchHistoryEntry[]) {
    this.history = [...history];
    this.recomputeTasteCentroid();
  }

  /**
   * Layer 2: Computes user taste centroid with recency time decay.
   * Recent watches carry significantly higher weight than titles watched months ago.
   */
  private recomputeTasteCentroid() {
    if (this.history.length === 0) {
      this.userTasteCentroid = null;
      return;
    }

    const now = Date.now();
    const dayMs = 86400 * 1000;
    const weightedVectors: ContentVector[] = [];

    for (const entry of this.history) {
      // Discard abandoned titles (< 15% completion without high rating)
      if (entry.completedFraction < 0.15 && (!entry.userRating || entry.userRating < 7)) {
        continue;
      }

      const daysAgo = Math.max(0, (now - entry.watchedAtEpochMs) / dayMs);
      // Exponential recency weight (half-life of ~45 days)
      const recencyWeight = Math.exp(-0.015 * daysAgo);
      const ratingMultiplier = entry.userRating ? entry.userRating / 10 : 0.8;
      const combinedWeight = recencyWeight * ratingMultiplier;

      const vec = extractContentVector(entry.meta);
      // Multiply vector components by weight
      weightedVectors.push({
        pacing: vec.pacing * combinedWeight,
        tone: vec.tone * combinedWeight,
        complexity: vec.complexity * combinedWeight,
        atmosphere: vec.atmosphere * combinedWeight,
        vintage: vec.vintage * combinedWeight,
        violence: vec.violence * combinedWeight,
        adrenaline: vec.adrenaline * combinedWeight,
        valence: vec.valence * combinedWeight,
      });
    }

    if (weightedVectors.length === 0) {
      this.userTasteCentroid = null;
      return;
    }

    this.userTasteCentroid = centroidOf(weightedVectors);
  }

  /**
   * Layer 3: Curates the optimal Triad (Safe Bet, Stretch, Wildcard) matching user intent.
   */
  public curateTriad(query: VibeSearchQuery, catalog: Meta[]): CuratedTriadResult | null {
    const targetVibe = VIBE_CENTROIDS[query.mood];
    const excluded = new Set([
      ...(query.excludedIds || []),
      ...this.history.map((h) => h.meta.id),
    ]);

    // 1. Hard Constraint Filter
    const eligible = catalog.filter((item) => {
      if (excluded.has(item.id)) return false;

      // Runtime constraint
      if (query.maxRuntimeMinutes) {
        const mins = parseRuntimeToMinutes(item.runtime);
        if (mins && mins > query.maxRuntimeMinutes) return false;
      }

      // IMDb rating filter
      if (query.minImdbRating && item.imdbRating) {
        const rating = parseFloat(item.imdbRating);
        if (rating < query.minImdbRating) return false;
      }

      return true;
    });

    if (eligible.length === 0) {
      return null;
    }

    // Identify user's dominant familiar genres from history
    const genreFrequency = new Map<string, number>();
    for (const h of this.history) {
      for (const g of h.meta.genres || []) {
        genreFrequency.set(g, (genreFrequency.get(g) || 0) + 1);
      }
    }
    const dominantGenres = new Set(
      Array.from(genreFrequency.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([g]) => g)
    );

    // Score all items against both Vibe and User Centroid
    const scoredCandidates = eligible.map((item) => {
      const vec = extractContentVector(item);
      const vibeSim = cosineSimilarity(vec, targetVibe);
      const tasteSim = this.userTasteCentroid
        ? cosineSimilarity(vec, this.userTasteCentroid)
        : 0.8; // Cold-start fallback

      const imdbScore = item.imdbRating ? Math.min(1.0, parseFloat(item.imdbRating) / 10) : 0.72;
      const compositeScore = vibeSim * 0.55 + tasteSim * 0.30 + imdbScore * 0.15;

      const genres = item.genres || [];
      const hasDominantGenre = genres.some((g) => dominantGenres.has(g));

      // Check if classic or foreign indie
      const isClassic = (item.releaseInfo && parseInt(item.releaseInfo, 10) < 1995) || vec.vintage > 0.6;
      const isForeign = item.originalLanguage && !["en", "eng"].includes(item.originalLanguage.toLowerCase());

      return {
        item,
        vec,
        vibeSim,
        tasteSim,
        compositeScore,
        hasDominantGenre,
        isClassic,
        isForeign,
      };
    });

    // Sort by composite match
    scoredCandidates.sort((a, b) => b.compositeScore - a.compositeScore);

    // 1. Pick The Safe Bet (Highest overall confidence, ideally in familiar genres)
    const safeCandidates = scoredCandidates.filter((c) => c.hasDominantGenre || dominantGenres.size === 0);
    const safeBetPick = safeCandidates[0] || scoredCandidates[0];

    // 2. Pick The Stretch (High vibe similarity, but in an unvisited / non-dominant genre)
    const stretchCandidates = scoredCandidates.filter((c) => {
      if (c.item.id === safeBetPick.item.id) return false;
      // High emotional vibe match (> 0.78), but outside dominant genres
      return c.vibeSim >= 0.70 && !c.hasDominantGenre;
    });
    const stretchPick = stretchCandidates[0] || scoredCandidates.find((c) => c.item.id !== safeBetPick.item.id) || scoredCandidates[1];

    // 3. Pick The Wildcard (Contextual Bandit: Critically acclaimed classic, foreign, or indie festival gem)
    const wildcardCandidates = scoredCandidates.filter((c) => {
      if (c.item.id === safeBetPick.item.id || c.item.id === stretchPick.item.id) return false;
      return (c.isClassic || c.isForeign || (c.item.imdbRating && parseFloat(c.item.imdbRating) >= 7.8));
    });
    const wildcardPick = wildcardCandidates[0] || scoredCandidates.find((c) => c.item.id !== safeBetPick.item.id && c.item.id !== stretchPick.item.id) || scoredCandidates[2];

    const safeBet: CuratedSelectionPath = {
      item: safeBetPick.item,
      pathType: "safe-bet",
      confidenceScore: Math.round(safeBetPick.compositeScore * 100),
      headline: `The Safe Bet: Direct Match for "${query.mood}"`,
      reason: `Matches your high-frequency taste profile with ${(safeBetPick.compositeScore * 100).toFixed(0)}% alignment and zero narrative friction.`,
      vibeTags: safeBetPick.item.genres || ["Verified Pick"],
    };

    const stretchGenre = (stretchPick.item.genres || []).find((g) => !dominantGenres.has(g)) || "Unexplored Style";
    const stretch: CuratedSelectionPath = {
      item: stretchPick.item,
      pathType: "stretch",
      confidenceScore: Math.round(stretchPick.compositeScore * 100),
      headline: `The Stretch: Cross-Genre ${stretchGenre}`,
      reason: `Captures the exact "${query.mood}" emotional tone you requested, but wrapped in a genre you rarely explore.`,
      vibeTags: [stretchGenre, "Fresh Horizon"],
    };

    const wildcardLabel = wildcardPick.isForeign
      ? "International Masterpiece"
      : wildcardPick.isClassic
      ? "Golden Age Benchmark"
      : "Critically Acclaimed";

    const wildcard: CuratedSelectionPath = {
      item: wildcardPick.item,
      pathType: "wildcard",
      confidenceScore: Math.round(wildcardPick.compositeScore * 100),
      headline: `The Wildcard: ${wildcardLabel}`,
      reason: `An artistic standout bypassing mainstream popularity bias to deliver an unforgettable emotional payoff.`,
      vibeTags: [wildcardLabel, "Bandit Pick"],
    };

    return {
      safeBet,
      stretch,
      wildcard,
      candidatePoolSize: eligible.length,
      vibeCentroid: targetVibe,
    };
  }
}
