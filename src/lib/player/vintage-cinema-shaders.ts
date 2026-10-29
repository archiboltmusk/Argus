/**
 * Vintage Cinema AI Shader Suite
 *
 * Specifically engineered for 1950s–1980s Indian & Bengali cinema (Satyajit Ray's Apu Trilogy,
 * Charulata, Nayak, Ritwik Ghatak's Meghe Dhaka Tara, Uttam–Suchitra classics, Mrinal Sen).
 *
 * Restores 35mm black-and-white film contrast, cleans compression macroblocking from vintage DVD rips,
 * and delivers edge reconstruction on Retina/4K displays without modern digital plastic smoothing.
 */

export interface VintageFilmPreset {
  id: string;
  name: string;
  directorOrEra: string;
  filmType: "black_and_white" | "early_color" | "technicolor";
  description: string;
  contrastBoost: number;
  grainIntensity: number; // 0 - 100
  edgeSharpness: number; // 0 - 100
  debandTuning: "soft" | "standard" | "heavy";
  mpvProps: Record<string, string>;
}

export const VINTAGE_CINEMA_PRESETS: VintageFilmPreset[] = [
  {
    id: "ray-35mm-bw",
    name: "Satyajit Ray 35mm B&W Master",
    directorOrEra: "The Apu Trilogy, Charulata, Jalsaghar, Nayak (1955–1966)",
    filmType: "black_and_white",
    description: "Deepens monochrome black levels, sharpens fine facial micro-contrasts, and preserves Subrata Mitra's natural bounce-lighting.",
    contrastBoost: 8,
    grainIntensity: 22,
    edgeSharpness: 35,
    debandTuning: "standard",
    mpvProps: {
      contrast: "6",
      brightness: "-2",
      gamma: "-3",
      saturation: "-100", // pure silver gelatin monochrome
      deband: "yes",
      "deband-iterations": "3",
      "deband-threshold": "48",
      "deband-range": "18",
    },
  },
  {
    id: "uttam-suchitra-golden",
    name: "Golden Era Tollywood (Romantic Drama)",
    directorOrEra: "Saptapadi, Harano Sur, Nayak, Jhinder Bondi (1950s–1970s)",
    filmType: "black_and_white",
    description: "Soft vintage glow with sharpened character silhouettes; smooths low-bitrate digital DVD rip ringing on modern screens.",
    contrastBoost: 5,
    grainIntensity: 18,
    edgeSharpness: 28,
    debandTuning: "soft",
    mpvProps: {
      contrast: "4",
      brightness: "0",
      gamma: "-1",
      saturation: "-100",
      deband: "yes",
      "deband-iterations": "2",
      "deband-threshold": "36",
    },
  },
  {
    id: "ghatak-realism",
    name: "Ritwik Ghatak & Mrinal Sen Stark Realism",
    directorOrEra: "Meghe Dhaka Tara, Komal Gandhar, Bhuvan Shome (1960–1975)",
    filmType: "black_and_white",
    description: "High dynamic contrast, deep expressionist shadows, and crisp wide-angle grain resolution.",
    contrastBoost: 12,
    grainIntensity: 28,
    edgeSharpness: 42,
    debandTuning: "heavy",
    mpvProps: {
      contrast: "10",
      brightness: "-3",
      gamma: "-5",
      saturation: "-100",
      deband: "yes",
      "deband-iterations": "4",
      "deband-threshold": "64",
      "deband-grain": "32",
    },
  },
  {
    id: "70s-eastmancolor",
    name: "Classic Eastmancolor Restoration",
    directorOrEra: "Sonar Kella, Joy Baba Felunath, Sholay, Deewaar (1970s–1980s)",
    filmType: "technicolor",
    description: "Recovers rich warm reds, amber desert sands (Jaisalmer), and lush Bengal greens while eliminating color blotching.",
    contrastBoost: 6,
    grainIntensity: 15,
    edgeSharpness: 30,
    debandTuning: "standard",
    mpvProps: {
      contrast: "5",
      saturation: "8",
      gamma: "1",
      deband: "yes",
      "deband-iterations": "3",
      "deband-threshold": "40",
    },
  },
];

/**
 * Resolves mpv command arguments for a chosen vintage film preset.
 */
export function getVintagePresetMpvArgs(presetId: string): Array<{ name: string; value: string }> {
  const preset = VINTAGE_CINEMA_PRESETS.find((p) => p.id === presetId);
  if (!preset) return [];

  return Object.entries(preset.mpvProps).map(([name, value]) => ({ name, value }));
}
