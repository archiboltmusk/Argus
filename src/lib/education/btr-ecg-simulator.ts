/**
 * Core BTR Real-Time ECG & Cardiac Rhythm Simulation Engine
 * Generates mathematically accurate clinical cardiac waveforms (P-Q-R-S-T)
 * for standard sinus rhythm and high-yield NEET-PG / INI-CET pathology:
 * 1. Normal Sinus Rhythm (NSR)
 * 2. STEMI (Hyperacute T waves, ST Elevation > 2mm)
 * 3. Severe Hyperkalemia (Tall tented T-waves, PR prolongation, wide QRS)
 * 4. Ventricular Tachycardia (Monomorphic wide-complex tachycardia)
 * 5. Atrial Fibrillation (Irregularly irregular, absent P waves, fibrillatory baseline)
 * 6. 3rd-Degree Complete Heart Block (AV dissociation, slow nodal escape)
 */

export type ECGRhythmType =
  | "normal_sinus"
  | "stemi"
  | "hyperkalemia"
  | "vtach"
  | "afib"
  | "complete_heart_block";

export interface ECGRhythmDefinition {
  id: ECGRhythmType;
  title: string;
  category: "Normal" | "Ischemia" | "Electrolyte" | "Arrhythmia" | "Conduction";
  heartRateBpm: number;
  description: string;
  highYieldClue: string;
  prIntervalMs: number;
  qrsDurationMs: number;
  qtcMs: number;
  stElevationMm: number;
}

export const ECG_RHYTHM_PRESETS: Record<ECGRhythmType, ECGRhythmDefinition> = {
  normal_sinus: {
    id: "normal_sinus",
    title: "Normal Sinus Rhythm (NSR)",
    category: "Normal",
    heartRateBpm: 72,
    description: "Upright P waves before every QRS, regular R-R intervals, normal PR and QT intervals.",
    highYieldClue: "Normal baseline control. PR 120-200ms, QRS < 120ms, QTc < 440ms (males) / 460ms (females).",
    prIntervalMs: 160,
    qrsDurationMs: 80,
    qtcMs: 410,
    stElevationMm: 0,
  },
  stemi: {
    id: "stemi",
    title: "Acute STEMI (Anterior / Inferior)",
    category: "Ischemia",
    heartRateBpm: 88,
    description: "J-point elevation >= 2mm with convex tombstoning ST elevation and reciprocal ST depressions.",
    highYieldClue: "Earliest sign: Hyperacute tall symmetric T waves, followed by convex ST elevation and Q-wave formation.",
    prIntervalMs: 150,
    qrsDurationMs: 90,
    qtcMs: 440,
    stElevationMm: 3.5,
  },
  hyperkalemia: {
    id: "hyperkalemia",
    title: "Severe Hyperkalemia (K+ > 7.0 mEq/L)",
    category: "Electrolyte",
    heartRateBpm: 58,
    description: "Tall peaked tented T-waves (narrow base), flattened/absent P waves, widened QRS progressing to sine wave.",
    highYieldClue: "Treatment of choice for cardiac membrane stabilization is IV Calcium Gluconate (10ml of 10% over 2-3 min)!",
    prIntervalMs: 240,
    qrsDurationMs: 160,
    qtcMs: 480,
    stElevationMm: 0.5,
  },
  vtach: {
    id: "vtach",
    title: "Monomorphic Ventricular Tachycardia",
    category: "Arrhythmia",
    heartRateBpm: 165,
    description: "Rapid wide-complex tachycardia (QRS > 140ms), concordant morphology, AV dissociation, capture and fusion beats.",
    highYieldClue: "Brugada criteria: Absence of RS in precordial leads, onset of R to nadir of S > 100ms. In unstable patient: synchronized DC cardioversion.",
    prIntervalMs: 0,
    qrsDurationMs: 180,
    qtcMs: 520,
    stElevationMm: 0,
  },
  afib: {
    id: "afib",
    title: "Atrial Fibrillation (Rapid Ventricular Response)",
    category: "Arrhythmia",
    heartRateBpm: 125,
    description: "Irregularly irregular R-R intervals with no discrete P waves and coarse fibrillatory baseline oscillations (350-600 bpm).",
    highYieldClue: "Risk of left atrial appendage thrombus and stroke. CHA2DS2-VASc score determines oral anticoagulation need.",
    prIntervalMs: 0,
    qrsDurationMs: 85,
    qtcMs: 430,
    stElevationMm: 0,
  },
  complete_heart_block: {
    id: "complete_heart_block",
    title: "Complete (3rd Degree) Heart Block",
    category: "Conduction",
    heartRateBpm: 40,
    description: "Complete AV dissociation: regular P-P intervals (atrial ~75 bpm) independent of regular slow R-R intervals (ventricular ~40 bpm).",
    highYieldClue: "Cannon 'a' waves seen in JVP due to atrial contraction against closed tricuspid valve. Definitive management: Permanent Pacemaker (PPM).",
    prIntervalMs: 0,
    qrsDurationMs: 130,
    qtcMs: 460,
    stElevationMm: 0,
  },
};

/**
 * Calculate the voltage value (in mV) at time t (in seconds) for a given rhythm preset.
 * Time t is continuous.
 */
export function sampleECGVoltage(tSec: number, rhythmType: ECGRhythmType): number {
  const preset = ECG_RHYTHM_PRESETS[rhythmType] || ECG_RHYTHM_PRESETS.normal_sinus;
  const bpm = preset.heartRateBpm;
  const cycleDuration = 60 / bpm;

  switch (rhythmType) {
    case "vtach": {
      // Rapid wide sinusoidal / sawtooth wide QRS
      const phase = (tSec % cycleDuration) / cycleDuration;
      const wave = Math.sin(phase * Math.PI * 2);
      const notch = Math.sin(phase * Math.PI * 4) * 0.35;
      return (wave + notch) * 1.4;
    }

    case "afib": {
      // Irregularly irregular cycle duration jitter + continuous fibrillatory baseline
      const baseJitter = (Math.sin(tSec * 1.3) + Math.cos(tSec * 3.7)) * 0.12;
      const effectiveCycle = cycleDuration * (1 + baseJitter);
      const phase = (tSec % effectiveCycle) / effectiveCycle;

      // Fibrillatory waves (fine erratic baseline)
      const fibBaseline = (Math.sin(tSec * 35) * 0.06) + (Math.cos(tSec * 47) * 0.04);

      // Absent P wave, sharp QRS, normal T wave
      let v = fibBaseline;
      if (phase >= 0.25 && phase <= 0.35) {
        // QRS complex
        const qrsPhase = (phase - 0.25) / 0.1;
        v += qrsSpike(qrsPhase, 1.2, 0.08);
      } else if (phase >= 0.45 && phase <= 0.65) {
        // T wave
        const tPhase = (phase - 0.45) / 0.2;
        v += Math.sin(tPhase * Math.PI) * 0.25;
      }
      return v;
    }

    case "hyperkalemia": {
      // Tall tented peaked T-wave, flat/absent P wave, widened QRS
      const phase = (tSec % cycleDuration) / cycleDuration;
      let v = 0;

      // Flattened P wave
      if (phase >= 0.1 && phase <= 0.2) {
        const pPhase = (phase - 0.1) / 0.1;
        v += Math.sin(pPhase * Math.PI) * 0.06;
      }
      // Wide QRS
      if (phase >= 0.28 && phase <= 0.44) {
        const qrsPhase = (phase - 0.28) / 0.16;
        v += qrsSpike(qrsPhase, 1.4, 0.16);
      }
      // Tall peaked narrow tented T-wave
      if (phase >= 0.52 && phase <= 0.76) {
        const tPhase = (phase - 0.52) / 0.24;
        // Sharpen peak via exponent
        v += Math.pow(Math.sin(tPhase * Math.PI), 2.5) * 1.6;
      }
      return v;
    }

    case "stemi": {
      // Prominent ST elevation (tombstone) merging into tall T wave
      const phase = (tSec % cycleDuration) / cycleDuration;
      let v = 0;

      // Normal P wave
      if (phase >= 0.08 && phase <= 0.18) {
        const pPhase = (phase - 0.08) / 0.1;
        v += Math.sin(pPhase * Math.PI) * 0.15;
      }
      // QRS spike
      if (phase >= 0.22 && phase <= 0.3) {
        const qrsPhase = (phase - 0.22) / 0.08;
        v += qrsSpike(qrsPhase, 1.5, 0.08);
      }
      // Marked ST elevation + broad upright T wave (tombstoning)
      if (phase >= 0.3 && phase <= 0.65) {
        const stPhase = (phase - 0.3) / 0.35;
        // Elevated plateau
        v += (0.35 + Math.sin(stPhase * Math.PI) * 0.55);
      }
      return v;
    }

    case "complete_heart_block": {
      // P waves fire at 75 bpm independently of ventricular escape at 40 bpm
      const pCycle = 60 / 75; // 0.8s
      const pPhase = (tSec % pCycle) / pCycle;
      let pVal = 0;
      if (pPhase >= 0.1 && pPhase <= 0.25) {
        pVal = Math.sin(((pPhase - 0.1) / 0.15) * Math.PI) * 0.18;
      }

      // Ventricular escape rhythm at 40 bpm
      const vPhase = (tSec % cycleDuration) / cycleDuration;
      let vVal = 0;
      if (vPhase >= 0.3 && vPhase <= 0.44) {
        const qrsPhase = (vPhase - 0.3) / 0.14;
        vVal += qrsSpike(qrsPhase, 1.1, 0.14);
      } else if (vPhase >= 0.52 && vPhase <= 0.75) {
        const tPhase = (vPhase - 0.52) / 0.23;
        vVal += Math.sin(tPhase * Math.PI) * 0.3;
      }

      return pVal + vVal;
    }

    case "normal_sinus":
    default: {
      const phase = (tSec % cycleDuration) / cycleDuration;
      let v = 0;

      // P wave (atrial depolarization)
      if (phase >= 0.08 && phase <= 0.18) {
        const pPhase = (phase - 0.08) / 0.1;
        v += Math.sin(pPhase * Math.PI) * 0.15;
      }
      // PR segment is baseline (0.18 - 0.22)
      // QRS complex (ventricular depolarization)
      if (phase >= 0.22 && phase <= 0.3) {
        const qrsPhase = (phase - 0.22) / 0.08;
        v += qrsSpike(qrsPhase, 1.3, 0.08);
      }
      // ST segment is baseline (0.3 - 0.4)
      // T wave (ventricular repolarization)
      if (phase >= 0.4 && phase <= 0.6) {
        const tPhase = (phase - 0.4) / 0.2;
        v += Math.sin(tPhase * Math.PI) * 0.32;
      }
      return v;
    }
  }
}

/**
 * Standard Q-R-S triphasic spike helper
 */
function qrsSpike(phase: number, rHeight: number, _duration: number): number {
  if (phase < 0.15) {
    // Q wave (small negative)
    return -Math.sin((phase / 0.15) * Math.PI) * 0.15;
  } else if (phase < 0.65) {
    // R wave (tall positive)
    return Math.sin(((phase - 0.15) / 0.5) * Math.PI) * rHeight;
  } else {
    // S wave (negative deflection)
    return -Math.sin(((phase - 0.65) / 0.35) * Math.PI) * (rHeight * 0.25);
  }
}
