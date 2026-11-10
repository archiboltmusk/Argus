/**
 * Android Projector Auto Frame Rate (AFR) & Cinema Optics Controller
 * Matches projector refresh rates (23.976 / 24 / 50 / 60 Hz) to eliminate judder
 * and manages automatic Day/Night lumen profiles and sleep timers.
 */

export interface FrameRateMatchResult {
  sourceFps: number;
  targetRefreshHz: number;
  applied: boolean;
  strategy: "native-mode" | "display-resample" | "cadence-smooth";
}

/**
 * Calculates optimal projector refresh rate for a given video framerate.
 */
export function calculateTargetRefreshRate(fps: number): number {
  if (fps <= 0 || !Number.isFinite(fps)) return 60;
  // 23.976 / 24 fps cinema standard
  if (Math.abs(fps - 23.976) < 0.2 || Math.abs(fps - 24.0) < 0.2) {
    return 24;
  }
  // 25 / 50 fps PAL / European broadcast
  if (Math.abs(fps - 25.0) < 0.2 || Math.abs(fps - 50.0) < 0.2) {
    return 50;
  }
  // 29.97 / 30 / 59.94 / 60 fps NTSC / High frame rate
  if (Math.abs(fps - 29.97) < 0.2 || Math.abs(fps - 30.0) < 0.2 || fps > 55) {
    return 60;
  }
  return 60;
}

/**
 * Evaluates whether current local time qualifies as Daylight or Night Cinema.
 * 07:00 - 18:30 -> Daylight Boost
 * 18:30 - 07:00 -> Night Cinema
 */
export function getAutoDayNightProfile(now: Date = new Date()): {
  mode: "daylight" | "night";
  contrastBoost: number;
  gammaLift: number;
  label: string;
} {
  const hours = now.getHours();
  const minutes = now.getMinutes();
  const timeNum = hours + minutes / 60;

  if (timeNum >= 7.0 && timeNum < 18.5) {
    return {
      mode: "daylight",
      contrastBoost: 16,
      gammaLift: 8,
      label: "Daylight High-Lumen",
    };
  }

  return {
    mode: "night",
    contrastBoost: 8,
    gammaLift: 2,
    label: "Night Deep Cinema (Warm D65)",
  };
}

/**
 * Optical Focus Acoustic Ping Synthesizer.
 * Generates an audible alignment pulse (high-frequency sweep) to assist in manual lens focusing.
 */
export function playFocusAcousticPing(): void {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    const now = ctx.currentTime;
    osc.frequency.setValueAtTime(3200, now);
    osc.frequency.exponentialRampToValueAtTime(7800, now + 0.12);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.18, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.2);
    setTimeout(() => {
      try { void ctx.close(); } catch {}
    }, 300);
  } catch {
    /* ignore audio synthesis limits */
  }
}
