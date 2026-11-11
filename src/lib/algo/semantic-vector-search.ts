/**
 * Local Semantic Vector "Vibe & Scene" Search Engine
 *
 * Provides on-device natural language semantic search over plots, themes,
 * moods, and atmospheres using normalized dense vector embeddings and cosine similarity.
 */

export const VECTOR_DIMENSIONS = 32;

export interface SemanticIndexEntry {
  id: string;
  title: string;
  vector: number[];
  genres: string[];
  keywords: string[];
}

export interface SemanticSearchResult {
  id: string;
  title: string;
  similarity: number; // 0.0 to 1.0
  matchConfidence: "high" | "moderate" | "low";
}

// Curated semantic concept anchors that form the coordinate axes of the embedding space
const CONCEPT_ANCHORS: string[][] = [
  ["cyberpunk", "neon", "futuristic", "dystopian", "ai", "synthetic"],
  ["noir", "detective", "crime", "investigation", "mystery", "murder"],
  ["rain", "dark", "gritty", "grime", "midnight", "shadow"],
  ["space", "galaxy", "cosmic", "spaceship", "alien", "star"],
  ["psychological", "mind", "illusion", "memory", "twist", "loop", "time"],
  ["snow", "winter", "cabin", "cold", "isolated", "frozen"],
  ["magic", "sorcery", "fantasy", "dragon", "mythical", "ancient"],
  ["action", "explosive", "martial", "combat", "chase", "adrenaline"],
  ["romance", "love", "heartbreak", "sweet", "couple", "nostalgic"],
  ["comedy", "funny", "humor", "satire", "parody", "hilarious"],
  ["horror", "terror", "monster", "demon", "haunted", "nightmare"],
  ["melancholy", "sad", "tragedy", "loss", "grief", "bittersweet"],
  ["anime", "shonen", "mecha", "manga", "powers", "otaku"],
  ["war", "soldier", "battlefield", "historical", "military", "wwii"],
  ["heist", "robbery", "con", "casino", "scheme", "vault"],
  ["superhero", "vigilante", "powers", "villain", "masked", "comic"],
];

/**
 * Computes a normalized dense semantic embedding vector from a text string.
 */
export function generateSemanticVector(text: string): number[] {
  const normalized = text.toLowerCase();
  const vector = new Array<number>(VECTOR_DIMENSIONS).fill(0);

  // 1. Project onto concept anchors
  for (let i = 0; i < CONCEPT_ANCHORS.length; i++) {
    const anchor = CONCEPT_ANCHORS[i];
    let weight = 0;
    for (const term of anchor) {
      if (normalized.includes(term)) {
        weight += 1.5;
      }
    }
    vector[i] = weight;
  }

  // 2. Hash projection for residual terms into upper dimensions
  const words = normalized.split(/\W+/).filter((w) => w.length > 3);
  for (const word of words) {
    let hash = 0;
    for (let c = 0; c < word.length; c++) {
      hash = (hash * 31 + word.charCodeAt(c)) | 0;
    }
    const idx = CONCEPT_ANCHORS.length + (Math.abs(hash) % (VECTOR_DIMENSIONS - CONCEPT_ANCHORS.length));
    vector[idx] += 0.5;
  }

  // 3. L2 Normalize vector
  let sumSq = 0;
  for (let i = 0; i < VECTOR_DIMENSIONS; i++) {
    sumSq += vector[i] * vector[i];
  }

  const magnitude = Math.sqrt(sumSq);
  if (magnitude > 0) {
    for (let i = 0; i < VECTOR_DIMENSIONS; i++) {
      vector[i] /= magnitude;
    }
  }

  return vector;
}

/**
 * Computes the cosine similarity between two unit vectors.
 */
export function calculateCosineSimilarity(u: number[], v: number[]): number {
  if (u.length !== v.length || u.length === 0) return 0;

  let dotProduct = 0;
  for (let i = 0; i < u.length; i++) {
    dotProduct += u[i] * v[i];
  }

  return Math.min(1.0, Math.max(0.0, dotProduct));
}

export class SemanticSearchIndex {
  private entries = new Map<string, SemanticIndexEntry>();

  public indexItem(item: {
    id: string;
    title: string;
    overview: string;
    genres?: string[];
    keywords?: string[];
  }): void {
    const textBlob = `${item.title} ${item.overview} ${(item.genres ?? []).join(" ")} ${(item.keywords ?? []).join(" ")}`;
    const vector = generateSemanticVector(textBlob);

    this.entries.set(item.id, {
      id: item.id,
      title: item.title,
      vector,
      genres: item.genres ?? [],
      keywords: item.keywords ?? [],
    });
  }

  public search(query: string, limit = 10, minScore = 0.25): SemanticSearchResult[] {
    if (!query.trim() || this.entries.size === 0) return [];

    const queryVector = generateSemanticVector(query);
    const results: SemanticSearchResult[] = [];

    for (const entry of this.entries.values()) {
      const similarity = calculateCosineSimilarity(queryVector, entry.vector);
      if (similarity >= minScore) {
        let matchConfidence: "high" | "moderate" | "low" = "low";
        if (similarity >= 0.65) matchConfidence = "high";
        else if (similarity >= 0.45) matchConfidence = "moderate";

        results.push({
          id: entry.id,
          title: entry.title,
          similarity: Math.round(similarity * 1000) / 1000,
          matchConfidence,
        });
      }
    }

    return results.sort((a, b) => b.similarity - a.similarity).slice(0, limit);
  }

  public getCount(): number {
    return this.entries.size;
  }

  public clear(): void {
    this.entries.clear();
  }
}
