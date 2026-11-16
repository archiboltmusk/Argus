/**
 * Smart ClearVoice™ Speech Isolation & Dynamic Range Compressor
 * Elevates whispered and muffled dialogue using human speech formant enhancement (2.8 kHz peaking EQ)
 * and tames sudden loud explosions/gunshots using psychoacoustic dynamic range compression.
 * Compatible with Web Audio API and native MPV audio filters (`af=...`).
 */

export type ClearVoiceProfile = "off" | "clear-voice" | "night-mode" | "cinema-balanced";

export interface ClearVoiceParams {
  highpassFreqHz: number;
  formantFreqHz: number;
  formantGainDb: number;
  formantQ: number;
  compressorThresholdDb: number;
  compressorRatio: number;
  compressorKneeDb: number;
  compressorAttackSec: number;
  compressorReleaseSec: number;
  makeupGainDb: number;
}

export const CLEARVOICE_PROFILES: Record<ClearVoiceProfile, ClearVoiceParams> = {
  off: {
    highpassFreqHz: 20,
    formantFreqHz: 2800,
    formantGainDb: 0,
    formantQ: 1.0,
    compressorThresholdDb: 0,
    compressorRatio: 1,
    compressorKneeDb: 0,
    compressorAttackSec: 0.01,
    compressorReleaseSec: 0.25,
    makeupGainDb: 0,
  },
  "clear-voice": {
    highpassFreqHz: 95,
    formantFreqHz: 2850,
    formantGainDb: 5.5,
    formantQ: 1.1,
    compressorThresholdDb: -22,
    compressorRatio: 3.5,
    compressorKneeDb: 10,
    compressorAttackSec: 0.003,
    compressorReleaseSec: 0.22,
    makeupGainDb: 2.5,
  },
  "night-mode": {
    highpassFreqHz: 120,
    formantFreqHz: 2900,
    formantGainDb: 6.0,
    formantQ: 1.2,
    compressorThresholdDb: -28,
    compressorRatio: 6.5,
    compressorKneeDb: 12,
    compressorAttackSec: 0.002,
    compressorReleaseSec: 0.28,
    makeupGainDb: 4.0,
  },
  "cinema-balanced": {
    highpassFreqHz: 60,
    formantFreqHz: 2700,
    formantGainDb: 3.0,
    formantQ: 0.9,
    compressorThresholdDb: -16,
    compressorRatio: 2.2,
    compressorKneeDb: 8,
    compressorAttackSec: 0.005,
    compressorReleaseSec: 0.20,
    makeupGainDb: 1.2,
  },
};

/**
 * Generates an MPV-compatible `af` (audio filter) string using lavfi filters:
 * highpass + equalizer + acompressor + volume
 */
export function buildClearVoiceMpvFilter(profile: ClearVoiceProfile): string {
  if (profile === "off") return "";

  const p = CLEARVOICE_PROFILES[profile];
  const filters: string[] = [];

  // Highpass rumble cut
  filters.push(`lavfi=[highpass=f=${p.highpassFreqHz}]`);

  // Vocal formant boost
  filters.push(`lavfi=[equalizer=f=${p.formantFreqHz}:width_type=q:w=${p.formantQ}:g=${p.formantGainDb}]`);

  // Dynamic range compressor
  // acompressor params: threshold in ratio [0.000976563 to 1], attack, release, ratio, knee
  const linearThreshold = Math.max(0.001, Math.pow(10, p.compressorThresholdDb / 20)).toFixed(4);
  const attackMs = Math.round(p.compressorAttackSec * 1000);
  const releaseMs = Math.round(p.compressorReleaseSec * 1000);
  filters.push(
    `lavfi=[acompressor=threshold=${linearThreshold}:ratio=${p.compressorRatio}:attack=${attackMs}:release=${releaseMs}:makeup=${p.makeupGainDb}dB:knee=${p.compressorKneeDb}dB]`
  );

  return filters.join(",");
}

/**
 * Configures a Web Audio API node chain for ClearVoice processing.
 */
export interface WebAudioClearVoiceNodes {
  highpass: BiquadFilterNode;
  formant: BiquadFilterNode;
  compressor: DynamicsCompressorNode;
  makeupGain: GainNode;
}

export function createClearVoiceWebAudioGraph(
  ctx: AudioContext,
  sourceNode: AudioNode,
  destinationNode: AudioNode,
  initialProfile: ClearVoiceProfile = "clear-voice"
): {
  nodes: WebAudioClearVoiceNodes;
  setProfile: (profile: ClearVoiceProfile) => void;
} {
  const highpass = ctx.createBiquadFilter();
  highpass.type = "highpass";

  const formant = ctx.createBiquadFilter();
  formant.type = "peaking";

  const compressor = ctx.createDynamicsCompressor();

  const makeupGain = ctx.createGain();

  // Connect chain: source -> highpass -> formant -> compressor -> makeupGain -> destination
  sourceNode.connect(highpass);
  highpass.connect(formant);
  formant.connect(compressor);
  compressor.connect(makeupGain);
  makeupGain.connect(destinationNode);

  const setProfile = (profile: ClearVoiceProfile) => {
    const p = CLEARVOICE_PROFILES[profile];
    const now = ctx.currentTime;

    highpass.frequency.setValueAtTime(p.highpassFreqHz, now);
    formant.frequency.setValueAtTime(p.formantFreqHz, now);
    formant.Q.setValueAtTime(p.formantQ, now);
    formant.gain.setValueAtTime(p.formantGainDb, now);

    compressor.threshold.setValueAtTime(p.compressorThresholdDb, now);
    compressor.knee.setValueAtTime(p.compressorKneeDb, now);
    compressor.ratio.setValueAtTime(p.compressorRatio, now);
    compressor.attack.setValueAtTime(p.compressorAttackSec, now);
    compressor.release.setValueAtTime(p.compressorReleaseSec, now);

    const linearGain = Math.pow(10, p.makeupGainDb / 20);
    makeupGain.gain.setValueAtTime(linearGain, now);
  };

  setProfile(initialProfile);

  return {
    nodes: { highpass, formant, compressor, makeupGain },
    setProfile,
  };
}
