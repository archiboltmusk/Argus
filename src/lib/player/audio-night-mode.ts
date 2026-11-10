/**
 * Audio Night Mode & Language-Scoped Audio Delay Manager.
 *
 * Provides:
 * 1. Persistent audio delay calibration per audio track language.
 * 2. Dynamic Range Compression (DRC) and vocal dialogue boost for late-night viewing
 *    (softens explosions/soundtrack peaks while elevating quiet whisper dialogue).
 */

const LANG_DELAY_PREFIX = "argus.audio-delay.lang.";
const memDelayStorage = new Map<string, string>();

export function saveLangAudioDelay(lang: string | undefined | null, delaySec: number): void {
  if (!lang) return;
  const cleanLang = lang.trim().toLowerCase();
  if (!cleanLang || cleanLang === "und" || cleanLang === "unknown") return;
  memDelayStorage.set(`${LANG_DELAY_PREFIX}${cleanLang}`, String(delaySec));
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(`${LANG_DELAY_PREFIX}${cleanLang}`, String(delaySec));
    }
  } catch {}
}

export function loadLangAudioDelay(lang: string | undefined | null): number {
  if (!lang) return 0;
  const cleanLang = lang.trim().toLowerCase();
  if (!cleanLang || cleanLang === "und" || cleanLang === "unknown") return 0;
  try {
    if (typeof localStorage !== "undefined") {
      const val = localStorage.getItem(`${LANG_DELAY_PREFIX}${cleanLang}`);
      if (val != null) {
        const num = parseFloat(val);
        if (Number.isFinite(num)) return num;
      }
    }
  } catch {}
  const mem = memDelayStorage.get(`${LANG_DELAY_PREFIX}${cleanLang}`);
  if (mem != null) {
    const num = parseFloat(mem);
    if (Number.isFinite(num)) return num;
  }
  return 0;
}

export function mpvNightModeFilters(enabled: boolean): string[] {
  if (!enabled) return [];
  // Dynamic audio normalizer + vocal EQ boost for mpv
  return [
    "lavfi=[dynaudnorm=f=150:g=15:m=10:p=0.71:s=12]",
    "lavfi=[equalizer=f=2400:width_type=o:w=1.2:g=3.5]",
  ];
}

export function buildNightModeMpvFilter(): string {
  return mpvNightModeFilters(true).join(",");
}

export function getNightModeWebAudioFilters() {
  return {
    compressor: {
      threshold: -24,
      knee: 30,
      ratio: 12,
      attack: 0.003,
      release: 0.25,
    },
    vocalBoost: {
      type: "peaking" as const,
      frequency: 2400,
      Q: 1.2,
      gain: 4.0,
    },
  };
}

type NightModeSession = {
  ctx: AudioContext;
  source: MediaElementAudioSourceNode;
  compressor: DynamicsCompressorNode;
  dialogueBoost: BiquadFilterNode;
  cleanup: () => void;
};

const activeSessions = new WeakMap<HTMLMediaElement, NightModeSession>();

export function setupHtml5AudioNightMode(
  mediaEl: HTMLMediaElement,
  enabled: boolean,
): () => void {
  if (typeof window === "undefined" || !("AudioContext" in window || "webkitAudioContext" in window)) {
    return () => {};
  }

  let session = activeSessions.get(mediaEl);

  if (!enabled) {
    if (session) {
      session.compressor.ratio.setValueAtTime(1, session.ctx.currentTime);
      session.dialogueBoost.gain.setValueAtTime(0, session.ctx.currentTime);
    }
    return () => {};
  }

  try {
    if (!session) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AudioCtx();
      const source = ctx.createMediaElementSource(mediaEl);
      const compressor = ctx.createDynamicsCompressor();
      
      // Dynamic compression for loud peaks
      compressor.threshold.setValueAtTime(-24, ctx.currentTime);
      compressor.knee.setValueAtTime(30, ctx.currentTime);
      compressor.ratio.setValueAtTime(12, ctx.currentTime);
      compressor.attack.setValueAtTime(0.003, ctx.currentTime);
      compressor.release.setValueAtTime(0.25, ctx.currentTime);

      // Presence filter to lift dialogue vocal band (1.8 kHz - 3.2 kHz)
      const dialogueBoost = ctx.createBiquadFilter();
      dialogueBoost.type = "peaking";
      dialogueBoost.frequency.setValueAtTime(2400, ctx.currentTime);
      dialogueBoost.Q.setValueAtTime(1.2, ctx.currentTime);
      dialogueBoost.gain.setValueAtTime(4.0, ctx.currentTime);

      source.connect(compressor);
      compressor.connect(dialogueBoost);
      dialogueBoost.connect(ctx.destination);

      const cleanup = () => {
        try {
          source.disconnect();
          compressor.disconnect();
          dialogueBoost.disconnect();
          void ctx.close();
        } catch {}
        activeSessions.delete(mediaEl);
      };

      session = { ctx, source, compressor, dialogueBoost, cleanup };
      activeSessions.set(mediaEl, session);
    } else {
      if (session.ctx.state === "suspended") void session.ctx.resume();
      session.compressor.ratio.setValueAtTime(12, session.ctx.currentTime);
      session.dialogueBoost.gain.setValueAtTime(4.0, session.ctx.currentTime);
    }

    return () => {
      if (session) {
        session.compressor.ratio.setValueAtTime(1, session.ctx.currentTime);
        session.dialogueBoost.gain.setValueAtTime(0, session.ctx.currentTime);
      }
    };
  } catch (err) {
    console.warn("[audio-night-mode] Web Audio graph setup note:", err);
    return () => {};
  }
}
