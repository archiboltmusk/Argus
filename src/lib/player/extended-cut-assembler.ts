/**
 * Argus Nexus 1-Click Community Extended Cut Auto-Assembler
 *
 * Provides pre-indexed recipes and automated assembly pipelines for legendary
 * extended cuts, assembly cuts, and deleted scene reconstructions.
 */

import {
  generateMpvEdlUri,
  realignSubtitlesForExtendedCut,
  type ExtendedCutRecipe,
} from "./extended-cut-splicer";
import type { SubCue } from "@/lib/subtitles/parser";

export interface CommunityCutPreset {
  id: string;
  movieTitle: string;
  year: number;
  editionName: string;
  description: string;
  approxAddedMinutes: number;
  sampleInsertionTimecodes: number[]; // In seconds
}

export const POPULAR_EXTENDED_CUT_PRESETS: CommunityCutPreset[] = [
  {
    id: "preset-lotr-fellowship",
    movieTitle: "The Lord of the Rings: The Fellowship of the Ring",
    year: 2001,
    editionName: "Special Extended Edition",
    description: "Restores Hobbiton lore, the gift giving in Lothlórien, and extended Mines of Moria action.",
    approxAddedMinutes: 30,
    sampleInsertionTimecodes: [240, 4800, 7200],
  },
  {
    id: "preset-aliens-special-edition",
    movieTitle: "Aliens",
    year: 1986,
    editionName: "Special Edition Reconstruction",
    description: "Reintegrates the colony on Hadley's Hope before the infestation, Ripley learning of her daughter, and sentry guns.",
    approxAddedMinutes: 17,
    sampleInsertionTimecodes: [650, 1820, 5400],
  },
  {
    id: "preset-kingdom-of-heaven",
    movieTitle: "Kingdom of Heaven",
    year: 2005,
    editionName: "Director's Cut Roadshow Edition",
    description: "Crucial character arcs including Sibylla's son, Godfrey's brother, and the Battle of Hattin aftermath.",
    approxAddedMinutes: 45,
    sampleInsertionTimecodes: [1200, 3600, 6800],
  },
  {
    id: "preset-superman-ii-donner",
    movieTitle: "Superman II",
    year: 1980,
    editionName: "Richard Donner Cut Hybrid",
    description: "Restores Marlon Brando's Jor-El sequences, the Niagara Falls balcony scene, and original opening.",
    approxAddedMinutes: 14,
    sampleInsertionTimecodes: [300, 1500, 4200],
  },
];

/**
 * Assembles an instant playable extended cut from a base video and deleted scene assets.
 */
export function assemblePlayableCut(
  recipe: ExtendedCutRecipe,
  theatricalSubtitles: SubCue[] = [],
): {
  playableEdlUri: string;
  realignedSubtitles: SubCue[];
  totalRuntimeSeconds: number;
} {
  const playableEdlUri = generateMpvEdlUri(recipe);
  const realignedSubtitles = realignSubtitlesForExtendedCut(theatricalSubtitles, recipe.insertions);
  const totalAddedSec = recipe.insertions.reduce((acc, i) => acc + i.durationSeconds, 0);

  return {
    playableEdlUri,
    realignedSubtitles,
    totalRuntimeSeconds: recipe.mainMovieDurationSeconds + totalAddedSec,
  };
}
