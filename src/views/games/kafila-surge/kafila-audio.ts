/**
 * Procedural Web Audio Engine for Kafila Surge.
 * Zero external MP3/WAV dependencies; 100% self-contained synthesized sound FX.
 */

class KafilaAudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private isMuted: boolean = false;
  private drumInterval: number | null = null;
  private drumBpm: number = 96;

  private init() {
    if (this.ctx) return;
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(0.7, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);
    } catch {
      // Audio not supported in environment
    }
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(muted ? 0 : 0.7, this.ctx.currentTime);
    }
  }

  public toggleMute(): boolean {
    this.setMuted(!this.isMuted);
    return this.isMuted;
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  public resume() {
    this.init();
    if (this.ctx && this.ctx.state === "suspended") {
      void this.ctx.resume();
    }
  }

  /**
   * Deep Dholak / Dha percussion beat
   */
  public playDholakKick(pitchScale = 1.0) {
    if (this.isMuted) return;
    this.resume();
    if (!this.ctx || !this.masterGain) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = "sine";
    const startFreq = 160 * pitchScale;
    const endFreq = 42 * pitchScale;
    osc.frequency.setValueAtTime(startFreq, t);
    osc.frequency.exponentialRampToValueAtTime(endFreq, t + 0.14);

    gain.gain.setValueAtTime(0.9, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + 0.23);
  }

  /**
   * Snappy Dholak Ta / Slap
   */
  public playDholakSlap() {
    if (this.isMuted) return;
    this.resume();
    if (!this.ctx || !this.masterGain) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = "triangle";
    osc.frequency.setValueAtTime(320, t);
    osc.frequency.exponentialRampToValueAtTime(80, t + 0.08);

    gain.gain.setValueAtTime(0.5, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.09);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + 0.1);
  }

  /**
   * Acoustic shockwave pulse for Mega-Chant
   */
  public playChantShockwave() {
    if (this.isMuted) return;
    this.resume();
    if (!this.ctx || !this.masterGain) return;

    const t = this.ctx.currentTime;
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc1.type = "sawtooth";
    osc2.type = "sine";
    osc1.frequency.setValueAtTime(110, t);
    osc1.frequency.exponentialRampToValueAtTime(440, t + 0.25);
    osc2.frequency.setValueAtTime(112, t);
    osc2.frequency.exponentialRampToValueAtTime(442, t + 0.25);

    filter.type = "lowpass";
    filter.frequency.setValueAtTime(300, t);
    filter.frequency.exponentialRampToValueAtTime(1600, t + 0.2);
    filter.frequency.exponentialRampToValueAtTime(200, t + 0.45);

    gain.gain.setValueAtTime(0.7, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc1.start(t);
    osc2.start(t);
    osc1.stop(t + 0.52);
    osc2.stop(t + 0.52);
  }

  /**
   * Barricade breaking sound
   */
  public playBarricadeCrash() {
    if (this.isMuted) return;
    this.resume();
    if (!this.ctx || !this.masterGain) return;

    const t = this.ctx.currentTime;

    // Metal clatter with decaying oscs
    for (const freq of [220, 390, 580, 820]) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(freq, t);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.4, t + 0.35);

      gain.gain.setValueAtTime(0.3, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(t);
      osc.stop(t + 0.36);
    }
  }

  /**
   * Lathi impact on crowd/cop
   */
  public playLathiHit() {
    if (this.isMuted) return;
    this.resume();
    if (!this.ctx || !this.masterGain) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(220, t);
    osc.frequency.exponentialRampToValueAtTime(50, t + 0.08);

    gain.gain.setValueAtTime(0.8, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.09);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + 0.1);
  }

  /**
   * Water cannon rushing hiss
   */
  public playWaterCannonHiss() {
    if (this.isMuted) return;
    this.resume();
    if (!this.ctx || !this.masterGain) return;

    // Filtered noise burst
    const bufferSize = this.ctx.sampleRate * 0.2;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(900, this.ctx.currentTime);
    filter.Q.setValueAtTime(2, this.ctx.currentTime);

    const gain = this.ctx.createGain();
    const t = this.ctx.currentTime;
    gain.gain.setValueAtTime(0.35, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.2);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    noise.start(t);
  }

  /**
   * Citizen recruitment chime
   */
  public playRecruitChime(pitchIndex = 0) {
    if (this.isMuted) return;
    this.resume();
    if (!this.ctx || !this.masterGain) return;

    const notes = [261.63, 293.66, 329.63, 392.0, 440.0, 523.25];
    const freq = notes[pitchIndex % notes.length];
    const t = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, t);

    gain.gain.setValueAtTime(0.4, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + 0.19);
  }

  /**
   * Starts ambient rhythm whose tempo and intensity scale with crowd size
   */
  public startCrowdMoraleBeat(crowdCount: number) {
    if (this.drumInterval) {
      clearInterval(this.drumInterval);
      this.drumInterval = null;
    }

    // Dynamic tempo: scales from 90 bpm up to 135 bpm as crowd grows
    const targetBpm = Math.min(135, 90 + Math.floor(crowdCount / 10) * 4);
    this.drumBpm = targetBpm;
    const intervalMs = (60 / this.drumBpm) * 500; // 8th-note pulse

    let step = 0;
    this.drumInterval = window.setInterval(() => {
      if (this.isMuted) return;
      if (step % 2 === 0) {
        this.playDholakKick();
      } else if (step % 4 === 1) {
        this.playDholakSlap();
      }
      step = (step + 1) % 8;
    }, intervalMs);
  }

  public stopCrowdMoraleBeat() {
    if (this.drumInterval) {
      clearInterval(this.drumInterval);
      this.drumInterval = null;
    }
  }

  /**
   * Victory Fanfare
   */
  public playVictoryFanfare() {
    if (this.isMuted) return;
    this.resume();
    if (!this.ctx || !this.masterGain) return;

    const melody = [
      { note: 392.0, time: 0.0, dur: 0.15 },
      { note: 440.0, time: 0.16, dur: 0.15 },
      { note: 523.25, time: 0.32, dur: 0.2 },
      { note: 659.25, time: 0.54, dur: 0.25 },
      { note: 783.99, time: 0.8, dur: 0.5 },
    ];

    const baseT = this.ctx.currentTime;
    for (const item of melody) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(item.note, baseT + item.time);

      gain.gain.setValueAtTime(0.5, baseT + item.time);
      gain.gain.exponentialRampToValueAtTime(0.001, baseT + item.time + item.dur);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(baseT + item.time);
      osc.stop(baseT + item.time + item.dur + 0.05);
    }
  }
}

export const kafilaAudio = new KafilaAudioEngine();
