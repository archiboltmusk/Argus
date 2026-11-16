/**
 * Audio-Haptic Transient Engine
 * Transforms high-impact audio transients (explosions, punch impacts, vehicle rumbles, gunshots)
 * into tactile DualSense/Xbox Gamepad dual-rumble vibrations and mobile haptic feedback in real time.
 */

export interface HapticEvent {
  intensity: number;      // 0.0 to 1.0
  durationMs: number;     // Vibration duration in ms
  lowFrequencyMotor: number; // 0.0 to 1.0
  highFrequencyMotor: number;// 0.0 to 1.0
}

export interface AudioHapticsConfig {
  enabled: boolean;
  intensityMultiplier: number; // 0.1 to 2.0
  transientThreshold: number;  // Energy spike threshold (e.g. 1.8x background)
  minCooldownMs: number;       // Anti-chatter cooldown between haptics
  subBassStartHz: number;      // Typically 30 Hz
  subBassEndHz: number;        // Typically 110 Hz
}

export const DEFAULT_HAPTICS_CONFIG: AudioHapticsConfig = {
  enabled: true,
  intensityMultiplier: 1.0,
  transientThreshold: 1.6,
  minCooldownMs: 140,
  subBassStartHz: 30,
  subBassEndHz: 110,
};

export class AudioHapticEngine {
  private config: AudioHapticsConfig;
  private backgroundEnergyEma: number = 0;
  private lastTriggerTime: number = 0;

  constructor(config: Partial<AudioHapticsConfig> = {}) {
    this.config = { ...DEFAULT_HAPTICS_CONFIG, ...config };
  }

  public setConfig(update: Partial<AudioHapticsConfig>) {
    this.config = { ...this.config, ...update };
  }

  public getConfig(): AudioHapticsConfig {
    return { ...this.config };
  }

  /**
   * Processes a frequency spectrum frame (e.g. from AnalyserNode.getByteFrequencyData)
   * and calculates if an impact transient occurred.
   */
  public processFrequencyFrame(
    frequencyData: Uint8Array,
    sampleRate: number = 44100,
    fftSize: number = 1024
  ): HapticEvent | null {
    if (!this.config.enabled || frequencyData.length === 0) return null;

    const binResolution = sampleRate / fftSize;
    const startBin = Math.max(0, Math.floor(this.config.subBassStartHz / binResolution));
    const endBin = Math.min(frequencyData.length - 1, Math.ceil(this.config.subBassEndHz / binResolution));

    let bandEnergy = 0;
    let count = 0;
    for (let i = startBin; i <= endBin; i++) {
      bandEnergy += frequencyData[i];
      count++;
    }

    const currentEnergy = count > 0 ? bandEnergy / count : 0;

    // Initialize or update background noise floor (exponential moving average)
    if (this.backgroundEnergyEma === 0) {
      this.backgroundEnergyEma = currentEnergy;
      return null;
    }

    const now = Date.now();
    const timeSinceLast = now - this.lastTriggerTime;

    let event: HapticEvent | null = null;

    // Detect transient spike above dynamic background threshold
    const threshold = Math.max(25, this.backgroundEnergyEma * this.config.transientThreshold);

    if (currentEnergy > threshold && timeSinceLast >= this.config.minCooldownMs) {
      this.lastTriggerTime = now;

      // Normalize intensity from 0 to 1
      const deltaRatio = (currentEnergy - this.backgroundEnergyEma) / 255;
      const rawIntensity = Math.min(1.0, Math.max(0.15, deltaRatio * 2.2));
      const intensity = Math.min(1.0, rawIntensity * this.config.intensityMultiplier);

      const durationMs = Math.round(Math.min(260, 100 + intensity * 150));
      const lowFrequencyMotor = Math.min(1.0, intensity * 0.95);
      const highFrequencyMotor = Math.min(1.0, intensity * 0.65);

      event = {
        intensity,
        durationMs,
        lowFrequencyMotor,
        highFrequencyMotor,
      };

      // Trigger attached hardware actuators
      this.dispatchHardwareHaptics(event);
    }

    // Slowly adapt background energy floor
    this.backgroundEnergyEma = this.backgroundEnergyEma * 0.94 + currentEnergy * 0.06;

    return event;
  }

  /**
   * Dispatches rumble to gamepads and navigator vibration
   */
  public dispatchHardwareHaptics(event: HapticEvent) {
    if (typeof navigator === "undefined") return;

    // 1. Mobile Vibration API
    if (typeof navigator.vibrate === "function") {
      try {
        navigator.vibrate(Math.round(event.durationMs * 0.6));
      } catch {
        // Ignored if user hasn't interacted or unsupported
      }
    }

    // 2. HTML5 Gamepad Vibration Actuator (DualSense, Xbox, etc.)
    if (typeof navigator.getGamepads === "function") {
      try {
        const gamepads = navigator.getGamepads();
        for (const gp of gamepads) {
          if (!gp || !gp.connected) continue;

          const actuator = (gp as unknown as {
            vibrationActuator?: {
              playEffect: (
                type: string,
                params: {
                  startDelay: number;
                  duration: number;
                  weakMagnitude: number;
                  strongMagnitude: number;
                }
              ) => Promise<unknown>;
            };
          }).vibrationActuator;

          if (actuator && typeof actuator.playEffect === "function") {
            void actuator.playEffect("dual-rumble", {
              startDelay: 0,
              duration: event.durationMs,
              weakMagnitude: event.highFrequencyMotor,
              strongMagnitude: event.lowFrequencyMotor,
            });
          }
        }
      } catch {
        // Gamepad rumble unavailable
      }
    }
  }
}
