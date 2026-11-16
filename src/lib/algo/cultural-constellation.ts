/**
 * Cultural Constellation & Cross-Medium Synthesis Engine (Achriom Equivalent)
 * Bridges Cinema, Literature, Visual Fine Art, and Music into a single unified knowledge graph.
 * Discovers the artistic lineage between a film, its literary inspirations, atmospheric museum paintings,
 * and orchestral musical scores using 8D Content DNA vector mapping.
 */

import type { Meta } from "@/lib/cinemeta";
import {
  type ContentVector,
  extractContentVector,
  cosineSimilarity,
} from "./content-dna";
import {
  CURATED_MASTERPIECES,
  type MasterworkArtwork,
} from "@/lib/art/museum-gateway";
import {
  CURATED_CLASSIC_BOOKS,
  type OpdsBookEntry,
} from "@/lib/ebook/opds-catalog";

export interface CulturalConstellation {
  film: Meta;
  filmVector: ContentVector;
  literaryMatch?: {
    book: OpdsBookEntry;
    affinityScore: number;
    relationType: "direct-source" | "thematic-sister" | "philosophical-parallel";
    rationale: string;
  };
  visualArtMatch?: {
    artwork: MasterworkArtwork;
    affinityScore: number;
    aestheticLink: string;
  };
  musicalTheme?: {
    title: string;
    composerOrArtist: string;
    style: string;
    reason: string;
  };
}

export class CulturalConstellationEngine {
  private artworks: MasterworkArtwork[] = [...CURATED_MASTERPIECES];
  private books: OpdsBookEntry[] = [...CURATED_CLASSIC_BOOKS];

  /**
   * Generates the multi-medium cultural constellation around a film.
   */
  public synthesizeConstellation(film: Meta): CulturalConstellation {
    const filmVec = extractContentVector(film);

    // 1. Find closest Literary Match
    let bestBook = this.books[0];
    let bestBookScore = 0;
    let rationale = "Shared psychological depth and human existential dilemmas.";

    for (const book of this.books) {
      let score = 0.7; // baseline
      // Keyword synergy in genres / description
      const filmGenres = (film.genres || []).map((g) => g.toLowerCase());
      const bookGenres = (book.genres || []).map((g) => g.toLowerCase());

      const overlap = filmGenres.filter((g) => bookGenres.some((bg) => bg.includes(g) || g.includes(bg)));
      if (overlap.length > 0) score += 0.15;

      if (filmVec.complexity > 0.7 && (book.id.includes("dostoevsky") || book.id.includes("kafka"))) {
        score += 0.12;
      }

      if (score > bestBookScore) {
        bestBookScore = score;
        bestBook = book;
      }
    }

    if (filmVec.complexity > 0.75) {
      rationale = `Mirrors ${bestBook.authors.join(", ")}'s exploration of moral dilemmas and intense cerebral inquiry.`;
    } else if (filmVec.pacing < 0.4) {
      rationale = `Shares the contemplative, methodical literary pacing of classical 19th-century prose.`;
    }

    // 2. Find closest Visual Art Match (Aesthetic & Lighting)
    let bestArt = this.artworks[0];
    let bestArtScore = 0;

    for (const art of this.artworks) {
      let score = 0.65;
      if (filmVec.tone < 0.3 && art.id.includes("caravaggio")) {
        score = 0.94; // Dark chiaroscuro
      } else if (filmVec.atmosphere > 0.8 && art.id.includes("hopper")) {
        score = 0.91; // Modern urban atmospheric isolation
      } else if (filmVec.adrenaline > 0.7 && art.id.includes("hokusai")) {
        score = 0.88; // Kinetic power and nature
      } else if (filmVec.valence > 0.6 && art.id.includes("seurat")) {
        score = 0.86; // Light, structured harmony
      }

      if (score > bestArtScore) {
        bestArtScore = score;
        bestArt = art;
      }
    }

    // 3. Synthesize Musical Score Concept
    let musicalTheme = {
      title: "Chaconne in D Minor",
      composerOrArtist: "J.S. Bach",
      style: "Baroque Contemplative",
      reason: "Structured, haunting harmonic architecture matching the film's structural weight.",
    };

    if (filmVec.adrenaline > 0.75) {
      musicalTheme = {
        title: "The Rite of Spring",
        composerOrArtist: "Igor Stravinsky",
        style: "Kinetic Avant-Garde",
        reason: "Polytonal propulsion and visceral percussive drive.",
      };
    } else if (filmVec.atmosphere > 0.85) {
      musicalTheme = {
        title: "Spiegel im Spiegel",
        composerOrArtist: "Arvo Pärt",
        style: "Tintinnabuli Minimalism",
        reason: "Expansive stillness and meditative harmonic resonance.",
      };
    }

    return {
      film,
      filmVector: filmVec,
      literaryMatch: {
        book: bestBook,
        affinityScore: Math.round(bestBookScore * 100),
        relationType: filmVec.complexity > 0.8 ? "philosophical-parallel" : "thematic-sister",
        rationale,
      },
      visualArtMatch: {
        artwork: bestArt,
        affinityScore: Math.round(bestArtScore * 100),
        aestheticLink: `Cinematographic color palette and framing share stylistic DNA with ${bestArt.artist}'s ${bestArt.title}.`,
      },
      musicalTheme,
    };
  }
}
