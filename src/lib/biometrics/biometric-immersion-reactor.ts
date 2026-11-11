/**
 * Biometric Immersion & Sleep Reactor
 *
 * Real-time biometric processing for Apple Watch, Wear OS, and BLE heart rate monitors.
 * Detects fright/thrill jump-scare spikes, provides Sleep Guard auto-pause with gentle
 * audio fade, and generates heartbeat-synced lighting pulse envelopes.
 */

export interface HeartRateSample {
  timestampMs: number;
  bpm: number;
  rrIntervalMs?: number; // Interbeat interval (R-R) for HRV analysis
}

export interface ThrillSpikeEvent {
  id: string;
  playbackSec: number;
  peakBpm: number;
  deltaBpm: number;
  baselineBpm: number;
  severity: "mild-tension" | "thrill-peak" | "jump-scare";
}

export interface SleepGuardState {
  isViewerAsleep: boolean;
  consecutiveRestingMinutes: number;
  averageRestingBpm: number;
  recommendedAction: "none" | "dim-screen" | "fade-and-pause";
  audioVolumeMultiplier: number; // 0.0 to 1.0
}

export interface BiometricConfig {
  enabled: boolean;
  restingBpmThreshold: number; // e.g. 58 BPM
  sleepConfirmationMinutes: number; // e.g. 3 minutes sustained resting BPM
  thrillSpikeDeltaBpm: number; // e.g. 22 BPM jump above baseline
  pulseAmbilightEnabled: boolean;
}

const DEFAULT_CONFIG: BiometricConfig = {
  enabled: true,
  restingBpmThreshold: 58,
  sleepConfirmationMinutes: 3,
  thrillSpikeDeltaBpm: 22,
  pulseAmbilightEnabled: true,
};

export class BiometricImmersionReactor {
  private static instance: BiometricImmersionReactor | null = null;
  private config: BiometricConfig;
  private samples: HeartRateSample[] = [];
  private spikes: ThrillSpikeEvent[] = [];
  private baselineBpm = 72;
  private sustainedRestingSec = 0;

  public constructor(initialConfig?: Partial<BiometricConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...initialConfig };
  }

  public static getInstance(): BiometricImmersionReactor {
    if (!BiometricImmersionReactor.instance) {
      BiometricImmersionReactor.instance = new BiometricImmersionReactor();
    }
    return BiometricImmersionReactor.instance;
  }

  public getConfig(): BiometricConfig {
    return { ...this.config };
  }

  public updateConfig(patch: Partial<BiometricConfig>): void {
    this.config = { ...this.config, ...patch };
  }

  /**
   * Ingests a new heart rate sample from Bluetooth/Wearable
   */
  public ingestSample(bpm: number, playbackSec: number, timestampMs: number = Date.now()): {
    spike?: ThrillSpikeEvent;
    sleepState: SleepGuardState;
  } {
    if (!this.config.enabled || bpm <= 30 || bpm >= 240) {
      return { sleepState: this.evaluateSleepGuard() };
    }

    const sample: HeartRateSample = { timestampMs, bpm };
    this.samples.push(sample);

    // Keep last 120 samples
    if (this.samples.length > 120) {
      this.samples.shift();
    }

    // Update dynamic baseline (exponential moving average over past samples)
    this.baselineBpm = Math.round(this.baselineBpm * 0.95 + bpm * 0.05);

    // 1. Check for Thrill / Jump-scare spike
    let detectedSpike: ThrillSpikeEvent | undefined;
    const delta = bpm - this.baselineBpm;

    if (delta >= this.config.thrillSpikeDeltaBpm) {
      const severity: ThrillSpikeEvent["severity"] =
        delta >= 35 ? "jump-scare" : delta >= 26 ? "thrill-peak" : "mild-tension";

      detectedSpike = {
        id: `spike-${timestampMs}`,
        playbackSec,
        peakBpm: bpm,
        deltaBpm: delta,
        baselineBpm: this.baselineBpm,
        severity,
      };

      this.spikes.push(detectedSpike);
    }

    // 2. Track Sleep Guard condition
    if (bpm <= this.config.restingBpmThreshold) {
      this.sustainedRestingSec += 1; // Assuming ~1s sample interval
    } else {
      this.sustainedRestingSec = Math.max(0, this.sustainedRestingSec - 2);
    }

    return {
      spike: detectedSpike,
      sleepState: this.evaluateSleepGuard(),
    };
  }

  /**
   * Evaluates whether viewer has fallen asleep and calculates volume fade envelope
   */
  public evaluateSleepGuard(): SleepGuardState {
    const restingMinutes = Math.round((this.sustainedRestingSec / 60) * 10) / 10;
    const isAsleep = restingMinutes >= this.config.sleepConfirmationMinutes;

    let action: SleepGuardState["recommendedAction"] = "none";
    let volumeMultiplier = 1.0;

    if (isAsleep) {
      action = "fade-and-pause";
      volumeMultiplier = 0.0;
    } else if (restingMinutes >= this.config.sleepConfirmationMinutes * 0.75) {
      action = "dim-screen";
      // Gentle volume ramp down (1.0 -> 0.3)
      const rampProgress = (restingMinutes - this.config.sleepConfirmationMinutes * 0.75) / (this.config.sleepConfirmationMinutes * 0.25);
      volumeMultiplier = Math.max(0.3, Math.round((1.0 - rampProgress * 0.7) * 100) / 100);
    }

    return {
      isViewerAsleep: isAsleep,
      consecutiveRestingMinutes: restingMinutes,
      averageRestingBpm: this.baselineBpm,
      recommendedAction: action,
      audioVolumeMultiplier: volumeMultiplier,
    };
  }

  /**
   * Generates heartbeat-synced lighting pulse multiplier based on current BPM
   */
  public calculateHeartbeatPulseMultiplier(timestampMs: number = Date.now()): number {
    if (!this.config.pulseAmbilightEnabled || this.samples.length === 0) {
      return 1.0;
    }

    const currentBpm = this.samples[this.samples.length - 1].bpm;
    const beatPeriodMs = (60 / currentBpm) * 1000;
    const phase = (timestampMs % beatPeriodMs) / beatPeriodMs;

    // Dual-lobe heartbeat pulse simulation (systolic & diastolic contraction)
    const lobe1 = Math.exp(-Math.pow((phase - 0.2) / 0.08, 2));
    const lobe2 = 0.5 * Math.exp(-Math.pow((phase - 0.4) / 0.09, 2));
    const pulseStrength = (lobe1 + lobe2);

    // Modulate between 0.90 and 1.15 multiplier
    return Math.round((0.90 + pulseStrength * 0.25) * 100) / 100;
  }

  public getSpikes(): ThrillSpikeEvent[] {
    return [...this.spikes];
  }

  public getLatestBpm(): number {
    return this.samples.length > 0 ? this.samples[this.samples.length - 1].bpm : this.baselineBpm;
  }
}
