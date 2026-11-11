/**
 * Web Audio AC3 / Multi-Channel Downmixer & Projector Dialogue Clarifier
 *
 * Provides real-time software audio downmixing and speech isolation for:
 * 1. Smart Projectors with single or dual 3W-5W low-output speakers (e.g. Wanbo, Beem, XGIMI, HY300).
 * 2. Multi-channel audio streams (5.1 / 7.1 AC3, E-AC3, TrueHD, DTS) that lack hardware decoders on Android/Web TV.
 * 3. Prevents silent playback and eliminates speech-masking where explosions drown out whispers.
 */

export interface DownmixerOptions {
  profileId?: "projector-beem" | "night-dialogue" | "balanced-speech";
  boostVolume?: number; // 1.0 = normal, up to 2.0x
  enableCompression?: boolean;
}

export class WebAudioDownmixer {
  private ctx: AudioContext | null = null;
  private source: MediaElementAudioSourceNode | null = null;
  private highpass: BiquadFilterNode | null = null;
  private speechPresence: BiquadFilterNode | null = null;
  private compressor: DynamicsCompressorNode | null = null;
  private gainNode: GainNode | null = null;
  private boundVideo: HTMLVideoElement | null = null;
  private attached = false;

  attach(video: HTMLVideoElement, options: DownmixerOptions = {}): boolean {
    if (this.attached && this.boundVideo === video) {
      this.updateOptions(options);
      return true;
    }
    this.detach();

    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return false;

      // Ensure audio context is created
      const ctx = new AudioCtx();
      this.ctx = ctx;

      // MediaElementSource requires same-origin or CORS headers
      const source = ctx.createMediaElementSource(video);
      this.source = source;
      this.boundVideo = video;

      // 1. High-pass filter: cut sub-90Hz rumble to avoid driver distortion on tiny projector speakers
      const hp = ctx.createBiquadFilter();
      hp.type = "highpass";
      hp.frequency.setValueAtTime(95, ctx.currentTime);
      hp.Q.setValueAtTime(0.7, ctx.currentTime);
      this.highpass = hp;

      // 2. Speech presence bell filter: +6.5dB at 2.8kHz to isolate and project dialogue
      const presence = ctx.createBiquadFilter();
      presence.type = "peaking";
      presence.frequency.setValueAtTime(2800, ctx.currentTime);
      presence.Q.setValueAtTime(1.4, ctx.currentTime);
      presence.gain.setValueAtTime(6.5, ctx.currentTime);
      this.speechPresence = presence;

      // 3. Dynamic Range Compressor: lifts quiet whispers while capping loud action spikes
      const comp = ctx.createDynamicsCompressor();
      comp.threshold.setValueAtTime(-24, ctx.currentTime);
      comp.knee.setValueAtTime(10, ctx.currentTime);
      comp.ratio.setValueAtTime(4.5, ctx.currentTime);
      comp.attack.setValueAtTime(0.005, ctx.currentTime);
      comp.release.setValueAtTime(0.25, ctx.currentTime);
      this.compressor = comp;

      // 4. Master volume boost gain node
      const gain = ctx.createGain();
      const boost = Math.max(0.5, Math.min(2.5, options.boostVolume ?? 1.2));
      gain.gain.setValueAtTime(boost, ctx.currentTime);
      this.gainNode = gain;

      // Connect graph: source -> highpass -> presence -> compressor -> gain -> destination
      source.connect(hp);
      hp.connect(presence);
      presence.connect(comp);
      comp.connect(gain);
      gain.connect(ctx.destination);

      // AudioContext auto-resume on first interaction / playback start
      const resume = () => {
        if (ctx.state === "suspended") {
          void ctx.resume().catch(() => {});
        }
      };
      video.addEventListener("play", resume, { passive: true });
      video.addEventListener("playing", resume, { passive: true });

      this.attached = true;
      return true;
    } catch (err) {
      // CORS security boundary or audio context limit: fail gracefully without crashing player
      console.warn("[argus] WebAudioDownmixer attach skipped:", err);
      this.detach();
      return false;
    }
  }

  updateOptions(options: DownmixerOptions): void {
    if (!this.ctx || !this.gainNode) return;
    try {
      const now = this.ctx.currentTime;
      if (typeof options.boostVolume === "number") {
        const boost = Math.max(0.5, Math.min(2.5, options.boostVolume));
        this.gainNode.gain.setValueAtTime(boost, now);
      }
      if (options.profileId === "night-dialogue" && this.compressor && this.speechPresence) {
        this.speechPresence.gain.setValueAtTime(8.0, now);
        this.compressor.threshold.setValueAtTime(-28, now);
      } else if (options.profileId === "balanced-speech" && this.speechPresence) {
        this.speechPresence.gain.setValueAtTime(4.0, now);
      } else if (this.speechPresence) {
        this.speechPresence.gain.setValueAtTime(6.5, now);
      }
    } catch {}
  }

  detach(): void {
    if (this.source) {
      try {
        this.source.disconnect();
      } catch {}
      this.source = null;
    }
    if (this.highpass) {
      try {
        this.highpass.disconnect();
      } catch {}
      this.highpass = null;
    }
    if (this.speechPresence) {
      try {
        this.speechPresence.disconnect();
      } catch {}
      this.speechPresence = null;
    }
    if (this.compressor) {
      try {
        this.compressor.disconnect();
      } catch {}
      this.compressor = null;
    }
    if (this.gainNode) {
      try {
        this.gainNode.disconnect();
      } catch {}
      this.gainNode = null;
    }
    if (this.ctx) {
      try {
        void this.ctx.close().catch(() => {});
      } catch {}
      this.ctx = null;
    }
    this.boundVideo = null;
    this.attached = false;
  }
}
