/**
 * Real-time Speech Enhancement & Vocal Normalization filters for mpv / audio player.
 * Combines highpass hum reduction, voice frequency boost (1kHz-4kHz), and loudnorm dynamics.
 */

export type AudioEnhancementMode = "off" | "voice-clarity" | "night-mode" | "speech-boost";

export type AudioFilterProfile = {
  mode: AudioEnhancementMode;
  afString: string;
  description: string;
};

export const AUDIO_PROFILES: Record<AudioEnhancementMode, AudioFilterProfile> = {
  off: {
    mode: "off",
    afString: "",
    description: "Original direct audio without filtering",
  },
  "voice-clarity": {
    mode: "voice-clarity",
    // 1. highpass=f=80: cuts out sub-bass electrical hum / rumbling
    // 2. equalizer=f=2500:t=q:w=1.2:g=4.5: boosts primary human vocal intelligibility
    // 3. lowpass=f=11000: cuts out high-frequency hiss
    // 4. loudnorm=I=-16:TP=-1.5:LRA=7: evens out whispers and sudden loud spikes
    afString: "lavfi=[highpass=f=80,equalizer=f=2500:t=q:w=1.2:g=4.5,lowpass=f=11000,loudnorm=I=-16:TP=-1.5:LRA=7]",
    description: "Cleans microphone hiss, boosts voice presence, and normalizes whisper-to-shout volume",
  },
  "speech-boost": {
    mode: "speech-boost",
    // Aggressive vocal boost for heavily muffled professor lectures
    afString: "lavfi=[highpass=f=120,equalizer=f=1800:t=q:w=1.0:g=6,equalizer=f=3200:t=q:w=1.0:g=5,loudnorm=I=-14:TP=-1:LRA=5]",
    description: "Aggressive dialogue boost for muffled or distant laptop microphones",
  },
  "night-mode": {
    mode: "night-mode",
    // Compresses dynamic range so explosions/intros are quiet while dialogue remains audible
    afString: "lavfi=[loudnorm=I=-24:TP=-3:LRA=4]",
    description: "Dynamic range compression: quiet loud effects while keeping dialogue audible at night",
  },
};

/**
 * Generates mpv command to set or clear audio filters
 */
export function getMpvAudioFilterCommand(mode: AudioEnhancementMode): string {
  const profile = AUDIO_PROFILES[mode] || AUDIO_PROFILES.off;
  return profile.afString;
}
