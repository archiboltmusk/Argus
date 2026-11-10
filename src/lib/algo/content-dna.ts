import type { Meta } from "@/lib/cinemeta";

/**
 * 8-Dimensional Content Vector defining the aesthetic, narrative,
 * and emotional DNA of a film or television title.
 * Each dimension is normalized from 0.0 to 1.0.
 */
export type ContentVector = {
  pacing: number; // 0.0: Slow-burn contemplative -> 1.0: Non-stop adrenaline
  tone: number; // 0.0: Pitch black / cynical -> 1.0: Uplifting / feel-good
  complexity: number; // 0.0: Straightforward popcorn -> 1.0: Cerebral mind-bending
  atmosphere: number; // 0.0: Grounded realism -> 1.0: Immersive stylized world-building
  vintage: number; // 0.0: Ultra-modern -> 1.0: Classic / Golden Age
  violence: number; // 0.0: Cozy / gentle -> 1.0: Visceral / brutal / horror
  adrenaline: number; // 0.0: Conversational / quiet -> 1.0: High-stakes action / chase
  valence: number; // 0.0: Melancholy / tragic -> 1.0: Euphoric / comedic
};

export type TasteCluster = {
  id: string;
  name: string;
  tagline: string;
  centroid: ContentVector;
  gradient: [string, string];
  tags: string[];
  items: Meta[];
  matchScore: number;
};

export const DEFAULT_VECTOR: ContentVector = {
  pacing: 0.5,
  tone: 0.5,
  complexity: 0.5,
  atmosphere: 0.5,
  vintage: 0.2,
  violence: 0.3,
  adrenaline: 0.5,
  valence: 0.5,
};

const GENRE_WEIGHTS: Record<string, Partial<ContentVector>> = {
  Action: { pacing: 0.85, adrenaline: 0.9, violence: 0.65, tone: 0.55 },
  Adventure: { pacing: 0.75, adrenaline: 0.75, atmosphere: 0.8, tone: 0.7 },
  Animation: { atmosphere: 0.85, tone: 0.8, valence: 0.75, violence: 0.15 },
  Comedy: { valence: 0.9, tone: 0.85, pacing: 0.65, violence: 0.1, complexity: 0.3 },
  Crime: { violence: 0.75, tone: 0.25, complexity: 0.7, pacing: 0.6 },
  Documentary: { complexity: 0.7, atmosphere: 0.3, pacing: 0.4, vintage: 0.4 },
  Drama: { pacing: 0.4, complexity: 0.7, tone: 0.4, valence: 0.35 },
  Family: { tone: 0.9, valence: 0.85, violence: 0.05, complexity: 0.25 },
  Fantasy: { atmosphere: 0.95, complexity: 0.65, adrenaline: 0.65 },
  History: { vintage: 0.8, complexity: 0.75, pacing: 0.4 },
  Horror: { violence: 0.9, tone: 0.1, adrenaline: 0.85, valence: 0.1 },
  Music: { atmosphere: 0.7, valence: 0.75, tone: 0.7 },
  Mystery: { complexity: 0.85, pacing: 0.5, atmosphere: 0.7, tone: 0.4 },
  Romance: { tone: 0.75, valence: 0.7, pacing: 0.45, violence: 0.05 },
  "Sci-Fi": { complexity: 0.8, atmosphere: 0.9, pacing: 0.65 },
  "Science Fiction": { complexity: 0.8, atmosphere: 0.9, pacing: 0.65 },
  Thriller: { pacing: 0.8, adrenaline: 0.85, violence: 0.7, complexity: 0.7, tone: 0.3 },
  War: { violence: 0.95, tone: 0.2, pacing: 0.65, adrenaline: 0.8 },
  Western: { vintage: 0.7, atmosphere: 0.75, violence: 0.6, pacing: 0.5 },
};

const KEYWORD_TINTS: Array<{ pattern: RegExp; bias: Partial<ContentVector> }> = [
  { pattern: /cyberpunk|dystopia|neo-noir|futuristic/i, bias: { atmosphere: 0.9, tone: 0.25, complexity: 0.75 } },
  { pattern: /heist|con artist|robbery/i, bias: { pacing: 0.8, complexity: 0.75, adrenaline: 0.75 } },
  { pattern: /space|cosmos|alien|astronaut/i, bias: { atmosphere: 0.95, complexity: 0.75 } },
  { pattern: /psychological|mind-bending|twist/i, bias: { complexity: 0.95, tone: 0.3, pacing: 0.55 } },
  { pattern: /superhero|marvel|dc|comic/i, bias: { adrenaline: 0.85, atmosphere: 0.75, pacing: 0.8 } },
  { pattern: /serial killer|murder|detective|investigation/i, bias: { violence: 0.75, tone: 0.2, complexity: 0.8 } },
  { pattern: /feel-good|heartwarming|inspiring|uplifting/i, bias: { tone: 0.95, valence: 0.95, violence: 0.05 } },
  { pattern: /satire|parody|dark comedy/i, bias: { tone: 0.4, complexity: 0.65, valence: 0.7 } },
];

/**
 * Extract the 8D Content Vector from any Cinemeta Meta object.
 */
export function extractContentVector(meta: Meta): ContentVector {
  const vec: ContentVector = { ...DEFAULT_VECTOR };
  let count = 0;

  // 1. Genre blend
  const genres = meta.genres ?? [];
  for (const g of genres) {
    const w = GENRE_WEIGHTS[g];
    if (w) {
      applyBias(vec, w, 0.4);
      count++;
    }
  }

  // 2. Keyword / overview analysis
  const text = `${meta.name ?? ""} ${meta.description ?? ""}`;
  for (const kt of KEYWORD_TINTS) {
    if (kt.pattern.test(text)) {
      applyBias(vec, kt.bias, 0.35);
    }
  }

  // 3. Vintage based on release year
  const yearStr = meta.releaseInfo ?? (meta.listingYear ? String(meta.listingYear) : meta.releaseDate ?? "");
  const yearMatch = yearStr.match(/\b(19\d\d|20\d\d)\b/);
  if (yearMatch) {
    const year = parseInt(yearMatch[1], 10);
    const currentYear = new Date().getFullYear();
    const age = Math.max(0, currentYear - year);
    // Vintage ranges from 0 (this year) to 1.0 (50+ years ago)
    vec.vintage = Math.min(1.0, age / 50);
  }

  // 4. Runtime pacing heuristic
  if (meta.runtime) {
    const minsMatch = meta.runtime.match(/(\d+)/);
    if (minsMatch) {
      const mins = parseInt(minsMatch[1], 10);
      if (mins > 150) {
        // Long epic tends to be more contemplative or sprawling
        vec.complexity = Math.min(1.0, vec.complexity + 0.15);
        vec.pacing = Math.max(0.1, vec.pacing - 0.1);
      } else if (mins < 95 && mins > 20) {
        // Tighter pacing
        vec.pacing = Math.min(1.0, vec.pacing + 0.15);
      }
    }
  }

  normalizeVector(vec);
  return vec;
}

function applyBias(target: ContentVector, bias: Partial<ContentVector>, strength: number) {
  for (const key of Object.keys(bias) as Array<keyof ContentVector>) {
    const val = bias[key];
    if (val !== undefined) {
      target[key] = target[key] * (1 - strength) + val * strength;
    }
  }
}

function normalizeVector(v: ContentVector) {
  for (const key of Object.keys(v) as Array<keyof ContentVector>) {
    v[key] = Math.max(0.0, Math.min(1.0, v[key]));
  }
}

/**
 * Cosine similarity between two 8D Content Vectors (1.0 = identical, 0.0 = orthogonal/opposite).
 */
export function cosineSimilarity(a: ContentVector, b: ContentVector): number {
  const keys = Object.keys(a) as Array<keyof ContentVector>;
  let dot = 0;
  let magA = 0;
  let magB = 0;
  for (const k of keys) {
    dot += a[k] * b[k];
    magA += a[k] * a[k];
    magB += b[k] * b[k];
  }
  if (magA === 0 || magB === 0) return 0;
  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}

/**
 * Computes average vector of a collection of vectors.
 */
export function centroidOf(vectors: ContentVector[]): ContentVector {
  if (vectors.length === 0) return { ...DEFAULT_VECTOR };
  const res: ContentVector = {
    pacing: 0,
    tone: 0,
    complexity: 0,
    atmosphere: 0,
    vintage: 0,
    violence: 0,
    adrenaline: 0,
    valence: 0,
  };
  for (const v of vectors) {
    for (const k of Object.keys(res) as Array<keyof ContentVector>) {
      res[k] += v[k];
    }
  }
  for (const k of Object.keys(res) as Array<keyof ContentVector>) {
    res[k] /= vectors.length;
  }
  return res;
}

const CLUSTER_ARCHETYPES = [
  {
    name: "Late-Night Adrenaline & Cyberpunk",
    tagline: "High-octane neon visuals, gritty pacing, and thrilling stakes",
    vector: { pacing: 0.85, tone: 0.3, complexity: 0.7, atmosphere: 0.9, vintage: 0.1, violence: 0.7, adrenaline: 0.9, valence: 0.4 },
    gradient: ["#ec4899", "#8b5cf6"] as [string, string],
    tags: ["High Adrenaline", "Atmospheric", "Stylized"],
  },
  {
    name: "Mind-Bending Psychological Puzzles",
    tagline: "Cerebral narratives, unexpected twists, and intellectual depth",
    vector: { pacing: 0.5, tone: 0.35, complexity: 0.95, atmosphere: 0.75, vintage: 0.3, violence: 0.4, adrenaline: 0.55, valence: 0.3 },
    gradient: ["#06b6d4", "#3b82f6"] as [string, string],
    tags: ["Cerebral", "Complex", "Mind-Bending"],
  },
  {
    name: "Warm Nostalgia & Comfort Cinema",
    tagline: "Heartwarming characters, rich vintage charm, and cozy storytelling",
    vector: { pacing: 0.45, tone: 0.85, complexity: 0.4, atmosphere: 0.65, vintage: 0.7, violence: 0.1, adrenaline: 0.3, valence: 0.85 },
    gradient: ["#f59e0b", "#ef4444"] as [string, string],
    tags: ["Feel-Good", "Comfort", "Timeless"],
  },
  {
    name: "Visceral Neo-Noir & Crime Sagas",
    tagline: "Shadowy underworlds, moral ambiguity, and relentless tension",
    vector: { pacing: 0.65, tone: 0.2, complexity: 0.8, atmosphere: 0.8, vintage: 0.4, violence: 0.85, adrenaline: 0.75, valence: 0.2 },
    gradient: ["#10b981", "#047857"] as [string, string],
    tags: ["Gritty", "Tense", "Dark"],
  },
  {
    name: "Euphoric Laughs & Feel-Good Comedy",
    tagline: "Pure entertainment, rapid banter, and zero stress",
    vector: { pacing: 0.7, tone: 0.95, complexity: 0.3, atmosphere: 0.3, vintage: 0.25, violence: 0.05, adrenaline: 0.4, valence: 0.95 },
    gradient: ["#eab308", "#f97316"] as [string, string],
    tags: ["Comedy", "Upbeat", "Popcorn"],
  },
];

/**
 * Clusters a pool of items into Spotify-style "Daily Mixes" using K-Means
 * over 8-Dimensional Content DNA.
 */
export function generateDailyMixes(
  watchedItems: Meta[],
  candidatePool: Meta[],
  clusterCount = 4,
  epsilonSerendipity = 0.2,
): TasteCluster[] {
  if (watchedItems.length === 0 && candidatePool.length === 0) {
    return [];
  }

  // Precompute vectors for candidate pool
  const candidateVectors = candidatePool.map((m) => ({
    meta: m,
    vector: extractContentVector(m),
  }));

  // If user has few or no watched items, seed clusters from known archetypes
  let centroids: ContentVector[];
  if (watchedItems.length < 3) {
    centroids = CLUSTER_ARCHETYPES.slice(0, clusterCount).map((a) => ({ ...a.vector }));
  } else {
    const userVectors = watchedItems.map(extractContentVector);
    centroids = kMeansCentroids(userVectors, clusterCount, 6);
  }

  const clusters: TasteCluster[] = [];

  for (let i = 0; i < centroids.length; i++) {
    const centroid = centroids[i];
    // Find closest archetype for naming & aesthetics
    let bestArchetype = CLUSTER_ARCHETYPES[0];
    let bestSim = -1;
    for (const arch of CLUSTER_ARCHETYPES) {
      const sim = cosineSimilarity(centroid, arch.vector);
      if (sim > bestSim) {
        bestSim = sim;
        bestArchetype = arch;
      }
    }

    // Score all candidates against this centroid
    const scoredCandidates = candidateVectors.map(({ meta, vector }) => {
      const sim = cosineSimilarity(centroid, vector);
      return { meta, sim };
    });

    // Sort descending by similarity
    scoredCandidates.sort((a, b) => b.sim - a.sim);

    // Epsilon-Greedy Bandit: 80% top match exploitation + 20% high-quality exploration
    const exploitCount = Math.floor(15 * (1 - epsilonSerendipity));
    const exploreCount = 15 - exploitCount;

    const chosen: Meta[] = [];
    const seenIds = new Set<string>();

    for (const item of scoredCandidates) {
      if (seenIds.has(item.meta.id)) continue;
      chosen.push(item.meta);
      seenIds.add(item.meta.id);
      if (chosen.length >= exploitCount) break;
    }

    // Serendipity sample: pick items from the 40th-70th percentile of similarity
    const midPool = scoredCandidates.slice(Math.floor(scoredCandidates.length * 0.4), Math.floor(scoredCandidates.length * 0.8));
    for (let j = 0; j < exploreCount && midPool.length > 0; j++) {
      const randIdx = Math.floor(Math.random() * midPool.length);
      const pick = midPool.splice(randIdx, 1)[0];
      if (pick && !seenIds.has(pick.meta.id)) {
        chosen.push(pick.meta);
        seenIds.add(pick.meta.id);
      }
    }

    // Average similarity score percentage
    const avgScore = Math.round(
      (scoredCandidates.slice(0, 5).reduce((acc, c) => acc + c.sim, 0) / Math.max(1, Math.min(5, scoredCandidates.length))) * 100,
    );

    clusters.push({
      id: `daily-mix-${i + 1}`,
      name: `Daily Mix ${i + 1}`,
      tagline: bestArchetype.name,
      centroid,
      gradient: bestArchetype.gradient,
      tags: bestArchetype.tags,
      items: chosen,
      matchScore: Math.min(99, Math.max(68, avgScore)),
    });
  }

  return clusters;
}

/**
 * Standard K-Means implementation in 8D vector space.
 */
function kMeansCentroids(vectors: ContentVector[], k: number, iterations = 6): ContentVector[] {
  if (vectors.length <= k) {
    return vectors.map((v) => ({ ...v }));
  }

  // Seed centroids using K-Means++
  const centroids: ContentVector[] = [{ ...vectors[Math.floor(Math.random() * vectors.length)] }];
  while (centroids.length < k) {
    let bestDist = -1;
    let bestCandidate = vectors[0];
    for (const v of vectors) {
      const minDist = Math.min(...centroids.map((c) => 1 - cosineSimilarity(v, c)));
      if (minDist > bestDist) {
        bestDist = minDist;
        bestCandidate = v;
      }
    }
    centroids.push({ ...bestCandidate });
  }

  // Iterate
  for (let iter = 0; iter < iterations; iter++) {
    const buckets: ContentVector[][] = Array.from({ length: k }, () => []);
    for (const v of vectors) {
      let closestIdx = 0;
      let highestSim = -1;
      for (let cIdx = 0; cIdx < centroids.length; cIdx++) {
        const sim = cosineSimilarity(v, centroids[cIdx]);
        if (sim > highestSim) {
          highestSim = sim;
          closestIdx = cIdx;
        }
      }
      buckets[closestIdx].push(v);
    }

    for (let cIdx = 0; cIdx < k; cIdx++) {
      if (buckets[cIdx].length > 0) {
        centroids[cIdx] = centroidOf(buckets[cIdx]);
      }
    }
  }

  return centroids;
}
