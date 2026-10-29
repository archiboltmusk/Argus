/**
 * Specialized 10-band equalizer settings optimized for Indian film audio mixes.
 * Tames explosive low-end rumbles & loud song sequences while boosting center-channel speech frequencies.
 * Bands: [31.5Hz, 63Hz, 125Hz, 250Hz, 500Hz, 1kHz, 2kHz, 4kHz, 8kHz, 16kHz]
 */
export const REGIONAL_DIALOGUE_EQ_BANDS = [
  -3, // 31.5 Hz: Reduce sub-bass boom
  -2, // 63 Hz: Tame bass mud
  0,  // 125 Hz: Neutral upper bass
  +1, // 250 Hz: Vocal chest resonance
  +3, // 500 Hz: Core vocal body
  +5, // 1 kHz: Formant speech clarity
  +4, // 2 kHz: Consonant intelligibility
  +2, // 4 kHz: Presence & sibilance control
  0,  // 8 kHz: Neutral air
  -1, // 16 kHz: Soften harsh highs
];

export function getRegionalDialogueEq(): {
  name: string;
  bands: number[];
  enabled: boolean;
  description: string;
} {
  return {
    name: "Indian Cinema Dialogue Clarity",
    bands: REGIONAL_DIALOGUE_EQ_BANDS,
    enabled: true,
    description: "Amplifies actor dialogue and voice intelligibility over explosive sound effects and songs.",
  };
}
