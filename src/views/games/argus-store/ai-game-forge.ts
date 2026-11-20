/**
 * AI Game Forge Engine v2.0 (Powered by Argus Game Studio Architecture)
 * Generates and compiles prompt-driven HTML5 Canvas + Web Audio games
 * with automatic Gamepad controller injection, Game Feel "Juice" engine
 * (Screen Shake, Hit-Stop, Coyote Time, Jump Buffering, Particles),
 * Procedural Web Audio Synthesizer, and an In-Game Live Tweak HUD.
 */

export type ForgeGenre =
  | "runner"
  | "action"
  | "shooter"
  | "twinstick"
  | "metroidvania"
  | "danmaku"
  | "puzzle";

export type ForgeArtStyle =
  | "neon_cyberpunk"
  | "retro_pixel"
  | "vector_minimal"
  | "sunset_arcade";

export interface ForgeRequest {
  title: string;
  genre: ForgeGenre;
  artStyle: ForgeArtStyle;
  prompt: string;
}

export interface GeneratedGame {
  id: string;
  title: string;
  description: string;
  code: string;
  genre: ForgeGenre;
  artStyle: ForgeArtStyle;
  generatedAt: string;
}

/**
 * Universal Gamepad, Audio, Juice & Tweak HUD Injection Wrapper
 */
export function wrapGameWithArgusBridge(innerGameJs: string, title: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${title}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body {
      width: 100%; height: 100%; overflow: hidden;
      background: #09090b; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, monospace;
      user-select: none;
    }
    #canvas-container {
      width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; position: relative;
    }
    canvas {
      background: #18181b; border-radius: 8px; box-shadow: 0 12px 48px rgba(0,0,0,0.85);
      max-width: 100%; max-height: 100%; aspect-ratio: 5/4; display: block;
    }
    #crt-overlay {
      position: absolute; inset: 0; pointer-events: none; border-radius: 8px; z-index: 25; display: none;
      background: linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.38) 50%), linear-gradient(90deg, rgba(255, 0, 0, 0.03), rgba(0, 255, 0, 0.01), rgba(0, 0, 255, 0.03));
      background-size: 100% 4px, 6px 100%;
      box-shadow: inset 0 0 80px rgba(0,0,0,0.85);
    }
    #crt-overlay.active { display: block; }
    #gamepad-hud {
      position: absolute; bottom: 12px; left: 16px; color: rgba(255,255,255,0.7);
      font-size: 11px; font-family: monospace; pointer-events: none; z-index: 10;
      text-shadow: 0 2px 4px rgba(0,0,0,0.8);
    }
    #tweak-panel {
      position: absolute; top: 16px; right: 16px; width: 280px;
      background: rgba(18, 18, 24, 0.94); border: 1px solid rgba(255, 255, 255, 0.15);
      border-radius: 12px; padding: 14px; color: #e2e8f0; font-size: 11px; font-family: monospace;
      box-shadow: 0 20px 50px rgba(0,0,0,0.85); backdrop-filter: blur(12px);
      display: none; z-index: 50;
    }
    #tweak-panel.open { display: block; }
    .tweak-row { margin-bottom: 8px; display: flex; flex-direction: column; gap: 3px; }
    .tweak-label { display: flex; justify-content: space-between; font-weight: bold; color: #94a3b8; }
    .tweak-slider { width: 100%; accent-color: #06b6d4; cursor: pointer; }
    .tweak-badge { background: #06b6d4; color: #000; padding: 1px 6px; border-radius: 4px; font-size: 10px; font-weight: 900; }
  </style>
</head>
<body>
  <div id="canvas-container">
    <canvas id="gameCanvas" width="800" height="640"></canvas>
    <div id="crt-overlay"></div>
    <div id="gamepad-hud">🎮 Move: LS/WASD • Action: A/Space • Alt: B/Shift • Tweak HUD: Select/Tab</div>

    <!-- Real-time Game Feel & Juice Tweak HUD -->
    <div id="tweak-panel">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px; border-bottom:1px solid #334155; padding-bottom:6px;">
        <span style="font-weight:900; color:#38bdf8; font-size:12px;">⚡ GAME FEEL & JUICE DECK</span>
        <span class="tweak-badge" id="god-badge">NORMAL</span>
      </div>
      <div class="tweak-row">
        <div class="tweak-label"><span>GAME SPEED</span><span id="val-speed">1.0x</span></div>
        <input type="range" min="0.5" max="2.5" step="0.1" value="1.0" class="tweak-slider" id="slider-speed">
      </div>
      <div class="tweak-row">
        <div class="tweak-label"><span>SCREEN SHAKE</span><span id="val-shake">100%</span></div>
        <input type="range" min="0" max="200" step="10" value="100" class="tweak-slider" id="slider-shake">
      </div>
      <div class="tweak-row">
        <div class="tweak-label"><span>HIT-STOP FREEZE</span><span id="val-hitstop">100%</span></div>
        <input type="range" min="0" max="200" step="10" value="100" class="tweak-slider" id="slider-hitstop">
      </div>
      <div class="tweak-row">
        <div class="tweak-label"><span>PARTICLE JUICE</span><span id="val-particles">HIGH</span></div>
        <input type="range" min="0" max="3" step="1" value="2" class="tweak-slider" id="slider-particles">
      </div>
      <div class="tweak-row">
        <div class="tweak-label"><span>RETRO CRT SCANLINES</span></div>
        <button id="btn-crt" style="background:#334155; color:#fff; border:none; padding:4px 8px; border-radius:6px; cursor:pointer; font-weight:bold; font-size:11px;">CRT: OFF</button>
      </div>
      <div class="tweak-row">
        <div class="tweak-label"><span>PROCEDURAL SYNTH BGM</span><span id="val-bgm">MUTED</span></div>
        <button id="btn-bgm" style="background:#334155; color:#fff; border:none; padding:4px 8px; border-radius:6px; cursor:pointer; font-weight:bold; font-size:11px;">TOGGLE BGM</button>
      </div>
      <div class="tweak-row">
        <div class="tweak-label"><span>CONTROLLER HAPTICS</span><span id="val-haptics">ACTIVE</span></div>
        <button id="btn-haptics" style="background:#059669; color:#fff; border:none; padding:4px 8px; border-radius:6px; cursor:pointer; font-weight:bold; font-size:11px;">TEST RUMBLE</button>
      </div>
      <div class="tweak-row">
        <div class="tweak-label"><span>GOD MODE (INVULNERABLE)</span></div>
        <button id="btn-godmode" style="background:#334155; color:#fff; border:none; padding:4px 8px; border-radius:6px; cursor:pointer; font-weight:bold; font-size:11px;">TOGGLE: OFF</button>
      </div>
      <div style="font-size:9px; color:#64748b; margin-top:8px; text-align:center;">
        Toggle via Tab, ~, or Gamepad Select/Back
      </div>
    </div>
  </div>

  <script>
    // --- 1. ARGUS TWEAK & GAME FEEL ENGINE ---
    window.argusTweak = {
      speed: 1.0,
      shakeMult: 1.0,
      hitStopMult: 1.0,
      particlesLevel: 2, // 0=off, 1=low, 2=high, 3=ultra
      godMode: false,
    };

    const tweakPanel = document.getElementById('tweak-panel');
    function toggleTweakPanel() {
      tweakPanel.classList.toggle('open');
    }

    document.getElementById('slider-speed').addEventListener('input', e => {
      window.argusTweak.speed = parseFloat(e.target.value);
      document.getElementById('val-speed').textContent = window.argusTweak.speed.toFixed(1) + 'x';
    });
    document.getElementById('slider-shake').addEventListener('input', e => {
      window.argusTweak.shakeMult = parseInt(e.target.value) / 100;
      document.getElementById('val-shake').textContent = e.target.value + '%';
    });
    document.getElementById('slider-hitstop').addEventListener('input', e => {
      window.argusTweak.hitStopMult = parseInt(e.target.value) / 100;
      document.getElementById('val-hitstop').textContent = e.target.value + '%';
    });
    document.getElementById('slider-particles').addEventListener('input', e => {
      window.argusTweak.particlesLevel = parseInt(e.target.value);
      const labels = ['OFF', 'LOW', 'HIGH', 'ULTRA'];
      document.getElementById('val-particles').textContent = labels[window.argusTweak.particlesLevel];
    });
    const godBtn = document.getElementById('btn-godmode');
    const godBadge = document.getElementById('god-badge');
    godBtn.addEventListener('click', () => {
      window.argusTweak.godMode = !window.argusTweak.godMode;
      godBtn.textContent = 'TOGGLE: ' + (window.argusTweak.godMode ? 'ON' : 'OFF');
      godBtn.style.background = window.argusTweak.godMode ? '#059669' : '#334155';
      godBadge.textContent = window.argusTweak.godMode ? 'GOD MODE' : 'NORMAL';
      godBadge.style.background = window.argusTweak.godMode ? '#10b981' : '#06b6d4';
    });

    const crtOverlay = document.getElementById('crt-overlay');
    const crtBtn = document.getElementById('btn-crt');
    let crtActive = false;
    crtBtn.addEventListener('click', () => {
      crtActive = !crtActive;
      crtOverlay.classList.toggle('active', crtActive);
      crtBtn.textContent = 'CRT: ' + (crtActive ? 'ON' : 'OFF');
      crtBtn.style.background = crtActive ? '#059669' : '#334155';
    });

    // --- CONTROLLER HAPTICS DUAL-RUMBLE ENGINE ---
    window.triggerHaptics = (pattern = 'medium') => {
      try {
        const pads = navigator.getGamepads ? navigator.getGamepads() : [];
        for (const p of pads) {
          if (p && p.vibrationActuator && typeof p.vibrationActuator.playEffect === 'function') {
            let dur = 100, weak = 0.5, strong = 0.3;
            if (pattern === 'hit') { dur = 110; weak = 0.7; strong = 0.4; }
            else if (pattern === 'explosion') { dur = 280; weak = 1.0; strong = 0.85; }
            else if (pattern === 'dash') { dur = 60; weak = 0.4; strong = 0.2; }
            else if (pattern === 'jump') { dur = 40; weak = 0.3; strong = 0.1; }
            p.vibrationActuator.playEffect('dual-rumble', { startDelay: 0, duration: dur, weakMagnitude: weak, strongMagnitude: strong }).catch(() => {});
          }
        }
      } catch (e) {}
    };

    document.getElementById('btn-haptics').addEventListener('click', () => {
      window.triggerHaptics('explosion');
    });

    // --- PROCEDURAL MULTI-TRACK SYNTH BGM ENGINE ---
    window.argusBgm = {
      playing: false,
      volume: 0.10,
      tempo: 124,
      step: 0,
      timer: null
    };
    const BASS_NOTES = [65.41, 65.41, 73.42, 82.41, 58.27, 58.27, 73.42, 65.41];
    const ARP_NOTES = [261.63, 311.13, 392.00, 466.16, 523.25, 466.16, 392.00, 311.13];

    function runBgmLoop() {
      if (!window.argusBgm.playing) return;
      const stepTime = (60 / window.argusBgm.tempo) / 4;
      const t = window.argusAudio.currentTime;
      const s = window.argusBgm.step % 16;
      if (s % 4 === 0) {
        // Kick
        const o = window.argusAudio.createOscillator();
        const g = window.argusAudio.createGain();
        o.frequency.setValueAtTime(120, t);
        o.frequency.exponentialRampToValueAtTime(32, t + 0.08);
        g.gain.setValueAtTime(0.24 * window.argusBgm.volume * 5, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
        o.connect(g); g.connect(window.argusAudio.destination);
        o.start(t); o.stop(t + 0.08);
      }
      if (s % 2 === 1) {
        // Hihat
        const o = window.argusAudio.createOscillator();
        const g = window.argusAudio.createGain();
        o.type = 'triangle';
        o.frequency.setValueAtTime(1200, t);
        g.gain.setValueAtTime(0.03 * window.argusBgm.volume * 5, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.03);
        o.connect(g); g.connect(window.argusAudio.destination);
        o.start(t); o.stop(t + 0.03);
      }
      if (s % 2 === 0) {
        // Bass
        const bIdx = Math.floor(window.argusBgm.step / 4) % BASS_NOTES.length;
        const o = window.argusAudio.createOscillator();
        const g = window.argusAudio.createGain();
        o.type = 'sawtooth';
        o.frequency.setValueAtTime(BASS_NOTES[bIdx], t);
        g.gain.setValueAtTime(0.09 * window.argusBgm.volume * 5, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + stepTime * 1.8);
        o.connect(g); g.connect(window.argusAudio.destination);
        o.start(t); o.stop(t + stepTime * 1.8);
      }
      // Arp
      const aIdx = s % ARP_NOTES.length;
      const o = window.argusAudio.createOscillator();
      const g = window.argusAudio.createGain();
      o.type = 'sine';
      o.frequency.setValueAtTime(ARP_NOTES[aIdx], t);
      g.gain.setValueAtTime(0.06 * window.argusBgm.volume * 5, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + stepTime);
      o.connect(g); g.connect(window.argusAudio.destination);
      o.start(t); o.stop(t + stepTime);

      window.argusBgm.step++;
      setTimeout(runBgmLoop, stepTime * 1000);
    }

    const bgmBtn = document.getElementById('btn-bgm');
    const bgmVal = document.getElementById('val-bgm');
    bgmBtn.addEventListener('click', () => {
      window.argusBgm.playing = !window.argusBgm.playing;
      bgmVal.textContent = window.argusBgm.playing ? 'ON (124 BPM)' : 'MUTED';
      bgmBtn.style.background = window.argusBgm.playing ? '#059669' : '#334155';
      if (window.argusBgm.playing) {
        if (window.argusAudio.state === 'suspended') window.argusAudio.resume();
        runBgmLoop();
      }
    });

    window.addEventListener('keydown', e => {
      if (e.key === 'Tab' || e.key === '\`' || e.key === '~') {
        e.preventDefault();
        toggleTweakPanel();
      }
    });

    // --- 2. ARGUS GAMEPAD & INPUT BRIDGE ---
    window.argusInput = { x: 0, y: 0, rx: 0, ry: 0, btnA: false, btnB: false, btnX: false, btnY: false, rt: 0, select: false };
    let lastSelectState = false;

    function pollArgusGamepads() {
      const pads = navigator.getGamepads ? navigator.getGamepads() : [];
      for (const p of pads) {
        if (!p) continue;
        if (Math.abs(p.axes[0]) > 0.15) window.argusInput.x = p.axes[0];
        if (Math.abs(p.axes[1]) > 0.15) window.argusInput.y = p.axes[1];
        if (p.axes.length > 3) {
          if (Math.abs(p.axes[2]) > 0.15) window.argusInput.rx = p.axes[2];
          if (Math.abs(p.axes[3]) > 0.15) window.argusInput.ry = p.axes[3];
        }
        window.argusInput.btnA = p.buttons[0]?.pressed || false;
        window.argusInput.btnB = p.buttons[1]?.pressed || false;
        window.argusInput.btnX = p.buttons[2]?.pressed || false;
        window.argusInput.btnY = p.buttons[3]?.pressed || false;
        window.argusInput.rt = p.buttons[7]?.value || 0;

        const selPressed = p.buttons[8]?.pressed || p.buttons[9]?.pressed || false;
        if (selPressed && !lastSelectState) {
          toggleTweakPanel();
        }
        lastSelectState = selPressed;
      }
      requestAnimationFrame(pollArgusGamepads);
    }
    requestAnimationFrame(pollArgusGamepads);

    // Listen for parent postMessage bridge events
    window.addEventListener('message', (ev) => {
      if (ev.data && ev.data.type === 'ARGUS_GAMEPAD_SYNC') {
        const { axes, buttons } = ev.data;
        if (axes) {
          if (Math.abs(axes[0]) > 0.15) window.argusInput.x = axes[0];
          if (Math.abs(axes[1]) > 0.15) window.argusInput.y = axes[1];
          if (axes.length > 3) {
            if (Math.abs(axes[2]) > 0.15) window.argusInput.rx = axes[2];
            if (Math.abs(axes[3]) > 0.15) window.argusInput.ry = axes[3];
          }
        }
        if (buttons) {
          window.argusInput.btnA = buttons[0]?.pressed || false;
          window.argusInput.btnB = buttons[1]?.pressed || false;
          window.argusInput.btnX = buttons[2]?.pressed || false;
          window.argusInput.btnY = buttons[3]?.pressed || false;
        }
      }
    });

    // --- 3. JUICE ENGINE (SHAKE, HITSTOP, PARTICLES) ---
    window.argusJuice = {
      shake: 0,
      hitStopFrames: 0,
      particles: [],
    };

    window.triggerShake = (amt = 8) => {
      window.argusJuice.shake = Math.min(26, window.argusJuice.shake + amt * (window.argusTweak.shakeMult || 1));
      window.triggerHaptics(amt > 15 ? 'explosion' : amt > 7 ? 'heavy' : 'light');
    };

    window.triggerHitStop = (frames = 4) => {
      window.argusJuice.hitStopFrames = Math.max(window.argusJuice.hitStopFrames, Math.round(frames * (window.argusTweak.hitStopMult || 1)));
      window.triggerHaptics('hit');
    };

    window.spawnJuiceParticles = (x, y, color = '#38bdf8', count = 12, speed = 4) => {
      const mult = window.argusTweak.particlesLevel;
      if (mult === 0) return;
      const actualCount = Math.round(count * (mult === 1 ? 0.5 : mult === 3 ? 2 : 1));
      for (let i = 0; i < actualCount; i++) {
        const angle = Math.random() * Math.PI * 2;
        const spd = (Math.random() * 0.7 + 0.3) * speed;
        window.argusJuice.particles.push({
          x, y,
          vx: Math.cos(angle) * spd,
          vy: Math.sin(angle) * spd,
          color,
          size: Math.random() * 3 + 2,
          life: 1.0,
          decay: Math.random() * 0.03 + 0.02
        });
      }
    };

    window.updateAndRenderJuice = (ctx, canvas) => {
      for (let i = window.argusJuice.particles.length - 1; i >= 0; i--) {
        const p = window.argusJuice.particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life -= p.decay;
        if (p.life <= 0) {
          window.argusJuice.particles.splice(i, 1);
        } else {
          ctx.save();
          ctx.globalAlpha = Math.max(0, p.life);
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      }
      if (window.argusJuice.shake > 0) {
        window.argusJuice.shake *= 0.88;
        if (window.argusJuice.shake < 0.2) window.argusJuice.shake = 0;
      }
    };

    // --- 4. PROCEDURAL WEB AUDIO SYNTHESIZER ---
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    window.argusAudio = new AudioCtx();

    window.playJuicySound = (type = 'hit') => {
      try {
        if (type === 'explosion') window.triggerHaptics('explosion');
        else if (type === 'slash' || type === 'hit') window.triggerHaptics('hit');
        else if (type === 'dash') window.triggerHaptics('dash');
        else if (type === 'jump') window.triggerHaptics('jump');
        if (window.argusAudio.state === 'suspended') window.argusAudio.resume();
        const t = window.argusAudio.currentTime;
        if (type === 'jump') {
          const o = window.argusAudio.createOscillator();
          const g = window.argusAudio.createGain();
          o.type = 'square';
          o.frequency.setValueAtTime(140, t);
          o.frequency.exponentialRampToValueAtTime(580, t + 0.12);
          g.gain.setValueAtTime(0.18, t);
          g.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
          o.connect(g); g.connect(window.argusAudio.destination);
          o.start(t); o.stop(t + 0.12);
        } else if (type === 'laser') {
          const o = window.argusAudio.createOscillator();
          const g = window.argusAudio.createGain();
          o.type = 'sawtooth';
          o.frequency.setValueAtTime(920, t);
          o.frequency.exponentialRampToValueAtTime(120, t + 0.08);
          g.gain.setValueAtTime(0.14, t);
          g.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
          o.connect(g); g.connect(window.argusAudio.destination);
          o.start(t); o.stop(t + 0.08);
        } else if (type === 'slash') {
          const o = window.argusAudio.createOscillator();
          const g = window.argusAudio.createGain();
          o.type = 'sawtooth';
          o.frequency.setValueAtTime(450, t);
          o.frequency.exponentialRampToValueAtTime(80, t + 0.06);
          g.gain.setValueAtTime(0.22, t);
          g.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
          o.connect(g); g.connect(window.argusAudio.destination);
          o.start(t); o.stop(t + 0.06);
        } else if (type === 'hit') {
          const o = window.argusAudio.createOscillator();
          const g = window.argusAudio.createGain();
          o.type = 'triangle';
          o.frequency.setValueAtTime(160, t);
          o.frequency.exponentialRampToValueAtTime(40, t + 0.07);
          g.gain.setValueAtTime(0.24, t);
          g.gain.exponentialRampToValueAtTime(0.001, t + 0.07);
          o.connect(g); g.connect(window.argusAudio.destination);
          o.start(t); o.stop(t + 0.07);
        } else if (type === 'explosion') {
          const bSize = Math.floor(window.argusAudio.sampleRate * 0.22);
          const buf = window.argusAudio.createBuffer(1, bSize, window.argusAudio.sampleRate);
          const data = buf.getChannelData(0);
          for (let i = 0; i < bSize; i++) data[i] = Math.random() * 2 - 1;
          const noise = window.argusAudio.createBufferSource();
          noise.buffer = buf;
          const flt = window.argusAudio.createBiquadFilter();
          flt.type = 'lowpass';
          flt.frequency.setValueAtTime(700, t);
          flt.frequency.exponentialRampToValueAtTime(40, t + 0.22);
          const g = window.argusAudio.createGain();
          g.gain.setValueAtTime(0.3, t);
          g.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
          noise.connect(flt); flt.connect(g); g.connect(window.argusAudio.destination);
          noise.start(t);
        } else if (type === 'coin') {
          const o1 = window.argusAudio.createOscillator();
          const o2 = window.argusAudio.createOscillator();
          const g = window.argusAudio.createGain();
          o1.type = 'sine'; o2.type = 'sine';
          o1.frequency.setValueAtTime(987.77, t);
          o2.frequency.setValueAtTime(1318.51, t + 0.06);
          g.gain.setValueAtTime(0.18, t);
          g.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
          o1.connect(g); o2.connect(g); g.connect(window.argusAudio.destination);
          o1.start(t); o1.stop(t + 0.06);
          o2.start(t + 0.06); o2.stop(t + 0.18);
        } else if (type === 'dash') {
          const o = window.argusAudio.createOscillator();
          const g = window.argusAudio.createGain();
          o.type = 'sine';
          o.frequency.setValueAtTime(420, t);
          o.frequency.exponentialRampToValueAtTime(180, t + 0.1);
          g.gain.setValueAtTime(0.16, t);
          g.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
          o.connect(g); g.connect(window.argusAudio.destination);
          o.start(t); o.stop(t + 0.1);
        }
      } catch (e) {}
    };

    window.playBeep = (freq = 440, type = 'sine', duration = 0.1) => {
      window.playJuicySound('hit');
    };

    // --- 5. INNER GAME CODE EXECUTION ---
    ${innerGameJs}
  </script>
</body>
</html>`;
}

/**
 * Generates an instant, highly tuned, functional game using genre chipsets.
 */
export function generateOfflineAIGame(req: ForgeRequest): GeneratedGame {
  const id = "ai_game_" + Date.now();
  const themeColors = {
    neon_cyberpunk: { bg: "#09090b", primary: "#06b6d4", accent: "#f43f5e", text: "#e0e7ff", glow: "#22d3ee" },
    retro_pixel: { bg: "#1e1b4b", primary: "#fbbf24", accent: "#a855f7", text: "#ffffff", glow: "#f59e0b" },
    vector_minimal: { bg: "#0f172a", primary: "#38bdf8", accent: "#34d399", text: "#f8fafc", glow: "#38bdf8" },
    sunset_arcade: { bg: "#18181b", primary: "#f59e0b", accent: "#ea580c", text: "#fef08a", glow: "#f97316" },
  }[req.artStyle];

  let gameScript = "";

  if (req.genre === "runner") {
    // Runner with Coyote Time & Jump Buffering
    gameScript = `
      const canvas = document.getElementById('gameCanvas');
      const ctx = canvas.getContext('2d');
      let score = 0, speed = 6.5, gameOver = false;
      const player = { x: 130, y: 320, vy: 0, r: 18, grounded: false, coyoteTime: 0, jumpBuffer: 0 };
      const obstacles = [];
      let obsTimer = 0;

      window.addEventListener('keydown', e => {
        if ((e.code === 'Space' || e.code === 'KeyW' || e.code === 'ArrowUp') && !gameOver) {
          player.jumpBuffer = 6; // 6 frames buffer
        }
        if (gameOver && (e.code === 'Space' || e.code === 'Enter')) restart();
      });

      function restart() {
        score = 0; speed = 6.5; gameOver = false;
        player.y = 320; player.vy = 0; player.grounded = false;
        obstacles.length = 0;
      }

      function loop() {
        if (window.argusJuice.hitStopFrames > 0) {
          window.argusJuice.hitStopFrames--;
          requestAnimationFrame(loop);
          return;
        }

        const gameSpeed = speed * (window.argusTweak.speed || 1.0);

        if (!gameOver) {
          if (window.argusInput.btnA || window.argusInput.y < -0.5) player.jumpBuffer = 6;
          if (player.grounded) player.coyoteTime = 6; else if (player.coyoteTime > 0) player.coyoteTime--;
          if (player.jumpBuffer > 0) player.jumpBuffer--;

          // Jump execution with Coyote & Buffer
          if (player.jumpBuffer > 0 && player.coyoteTime > 0) {
            player.vy = -14.5;
            player.grounded = false;
            player.coyoteTime = 0;
            player.jumpBuffer = 0;
            window.playJuicySound('jump');
            window.spawnJuiceParticles(player.x, player.y + player.r, '${themeColors.glow}', 8, 3);
          }

          player.vy += 0.72; // Gravity
          player.y += player.vy;
          if (player.y >= 500) {
            player.y = 500;
            player.vy = 0;
            if (!player.grounded) {
              window.spawnJuiceParticles(player.x, player.y + player.r, '${themeColors.accent}', 6, 2.5);
            }
            player.grounded = true;
          }

          obsTimer++;
          if (obsTimer > 60 / (window.argusTweak.speed || 1)) {
            obsTimer = 0;
            const h = Math.random() > 0.4 ? 42 : 65;
            obstacles.push({ x: 840, y: 520 - h, w: 28, h, passed: false });
          }

          for (let i = obstacles.length - 1; i >= 0; i--) {
            const o = obstacles[i];
            o.x -= gameSpeed;
            if (Math.abs(player.x - (o.x + o.w/2)) < player.r + o.w/2 && player.y > o.y - player.r) {
              if (!window.argusTweak.godMode) {
                gameOver = true;
                window.triggerShake(16);
                window.triggerHitStop(8);
                window.playJuicySound('explosion');
                window.spawnJuiceParticles(player.x, player.y, '${themeColors.accent}', 30, 7);
              }
            }
            if (o.x < player.x && !o.passed) {
              o.passed = true;
              score += 15;
              speed += 0.05;
              window.playJuicySound('coin');
              window.spawnJuiceParticles(player.x, player.y, '${themeColors.glow}', 5, 2);
            }
            if (o.x < -50) obstacles.splice(i, 1);
          }
        }

        // Render with Juice Camera Transform
        ctx.save();
        if (window.argusJuice.shake > 0) {
          ctx.translate((Math.random() - 0.5) * window.argusJuice.shake, (Math.random() - 0.5) * window.argusJuice.shake);
        }

        ctx.fillStyle = '${themeColors.bg}';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Ground & Grid
        ctx.fillStyle = '${themeColors.accent}';
        ctx.fillRect(0, 520, canvas.width, 120);

        // Obstacles
        ctx.fillStyle = '${themeColors.text}';
        for (const o of obstacles) {
          ctx.fillRect(o.x, o.y, o.w, o.h);
        }

        // Player
        ctx.fillStyle = '${themeColors.primary}';
        ctx.beginPath();
        ctx.arc(player.x, player.y, player.r, 0, Math.PI * 2);
        ctx.fill();

        // Juice Particles
        window.updateAndRenderJuice(ctx, canvas);
        ctx.restore();

        // UI Overlay
        ctx.fillStyle = '${themeColors.text}';
        ctx.font = 'bold 20px monospace';
        ctx.fillText('SCORE: ' + score, 30, 45);
        ctx.fillText('SPEED: ' + speed.toFixed(1), 30, 72);

        if (gameOver) {
          ctx.fillStyle = 'rgba(0,0,0,0.85)';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.fillStyle = '${themeColors.accent}';
          ctx.font = 'bold 36px monospace';
          ctx.textAlign = 'center';
          ctx.fillText('RUN TERMINATED', canvas.width/2, 280);
          ctx.font = 'bold 18px monospace';
          ctx.fillStyle = '${themeColors.text}';
          ctx.fillText('Press Space / A Button to Retry', canvas.width/2, 330);
          ctx.textAlign = 'left';
        }

        requestAnimationFrame(loop);
      }
      requestAnimationFrame(loop);
    `;
  } else if (req.genre === "twinstick") {
    // Twin-Stick Arena Blast with Dash & Screen Shake
    gameScript = `
      const canvas = document.getElementById('gameCanvas');
      const ctx = canvas.getContext('2d');
      let score = 0, gameOver = false;
      const player = { x: 400, y: 320, r: 16, hp: 100, dashCooldown: 0, dashing: 0 };
      const bullets = [], enemies = [];
      let spawnTimer = 0, fireTimer = 0;

      const keys = {};
      window.addEventListener('keydown', e => {
        keys[e.code] = true;
        if ((e.code === 'ShiftLeft' || e.code === 'KeyJ') && player.dashCooldown <= 0) triggerDash();
      });
      window.addEventListener('keyup', e => { keys[e.code] = false; });

      function triggerDash() {
        player.dashing = 8;
        player.dashCooldown = 35;
        window.playJuicySound('dash');
        window.triggerShake(5);
        window.spawnJuiceParticles(player.x, player.y, '${themeColors.glow}', 14, 4);
      }

      function loop() {
        if (window.argusJuice.hitStopFrames > 0) {
          window.argusJuice.hitStopFrames--;
          requestAnimationFrame(loop);
          return;
        }

        const spd = (player.dashing > 0 ? 12 : 5) * (window.argusTweak.speed || 1.0);
        if (player.dashing > 0) player.dashing--;
        if (player.dashCooldown > 0) player.dashCooldown--;

        if (!gameOver) {
          let dx = window.argusInput.x;
          let dy = window.argusInput.y;
          if (keys['KeyA'] || keys['ArrowLeft']) dx = -1;
          if (keys['KeyD'] || keys['ArrowRight']) dx = 1;
          if (keys['KeyW'] || keys['ArrowUp']) dy = -1;
          if (keys['KeyS'] || keys['ArrowDown']) dy = 1;

          if (window.argusInput.btnB && player.dashCooldown <= 0) triggerDash();

          player.x += dx * spd;
          player.y += dy * spd;
          player.x = Math.max(20, Math.min(canvas.width - 20, player.x));
          player.y = Math.max(20, Math.min(canvas.height - 20, player.y));

          // Aiming & Firing
          let ax = window.argusInput.rx || dx || 0;
          let ay = window.argusInput.ry || dy || -1;
          if (Math.hypot(ax, ay) > 0.3) {
            fireTimer++;
            if (fireTimer > 10) {
              fireTimer = 0;
              const angle = Math.atan2(ay, ax);
              bullets.push({ x: player.x, y: player.y, vx: Math.cos(angle) * 14, vy: Math.sin(angle) * 14 });
              window.playJuicySound('laser');
              window.triggerShake(2);
            }
          }

          // Enemy Spawning
          spawnTimer++;
          if (spawnTimer > 32 / (window.argusTweak.speed || 1)) {
            spawnTimer = 0;
            const edge = Math.floor(Math.random() * 4);
            let ex = 0, ey = 0;
            if (edge === 0) { ex = Math.random() * canvas.width; ey = -20; }
            else if (edge === 1) { ex = canvas.width + 20; ey = Math.random() * canvas.height; }
            else if (edge === 2) { ex = Math.random() * canvas.width; ey = canvas.height + 20; }
            else { ex = -20; ey = Math.random() * canvas.height; }
            enemies.push({ x: ex, y: ey, r: 14, hp: 2 });
          }

          // Bullets update
          for (let i = bullets.length - 1; i >= 0; i--) {
            const b = bullets[i];
            b.x += b.vx; b.y += b.vy;
            if (b.x < 0 || b.x > canvas.width || b.y < 0 || b.y > canvas.height) bullets.splice(i, 1);
          }

          // Enemies update & collision
          for (let i = enemies.length - 1; i >= 0; i--) {
            const e = enemies[i];
            const ang = Math.atan2(player.y - e.y, player.x - e.x);
            e.x += Math.cos(ang) * 2.8;
            e.y += Math.sin(ang) * 2.8;

            // Check bullet hit
            for (let j = bullets.length - 1; j >= 0; j--) {
              const b = bullets[j];
              if (Math.hypot(b.x - e.x, b.y - e.y) < e.r + 6) {
                e.hp--;
                bullets.splice(j, 1);
                window.triggerHitStop(2);
                window.triggerShake(3);
                window.playJuicySound('hit');
                window.spawnJuiceParticles(e.x, e.y, '${themeColors.accent}', 5, 3);
                if (e.hp <= 0) {
                  enemies.splice(i, 1);
                  score += 25;
                  window.triggerShake(8);
                  window.triggerHitStop(4);
                  window.playJuicySound('explosion');
                  window.spawnJuiceParticles(e.x, e.y, '${themeColors.glow}', 22, 6);
                  break;
                }
              }
            }

            // Player contact
            if (Math.hypot(player.x - e.x, player.y - e.y) < player.r + e.r && player.dashing === 0) {
              if (!window.argusTweak.godMode) {
                player.hp -= 20;
                enemies.splice(i, 1);
                window.triggerShake(14);
                window.triggerHitStop(6);
                window.playJuicySound('hit');
                window.spawnJuiceParticles(player.x, player.y, '#ef4444', 18, 5);
                if (player.hp <= 0) gameOver = true;
              }
            }
          }
        }

        // Render Loop
        ctx.save();
        if (window.argusJuice.shake > 0) {
          ctx.translate((Math.random() - 0.5) * window.argusJuice.shake, (Math.random() - 0.5) * window.argusJuice.shake);
        }

        ctx.fillStyle = '${themeColors.bg}';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Bullets
        ctx.fillStyle = '${themeColors.glow}';
        for (const b of bullets) {
          ctx.beginPath(); ctx.arc(b.x, b.y, 4, 0, Math.PI * 2); ctx.fill();
        }

        // Enemies
        ctx.fillStyle = '#ef4444';
        for (const e of enemies) {
          ctx.beginPath(); ctx.arc(e.x, e.y, e.r, 0, Math.PI * 2); ctx.fill();
        }

        // Player
        ctx.fillStyle = player.dashing > 0 ? '${themeColors.accent}' : '${themeColors.primary}';
        ctx.beginPath(); ctx.arc(player.x, player.y, player.r, 0, Math.PI * 2); ctx.fill();

        window.updateAndRenderJuice(ctx, canvas);
        ctx.restore();

        // UI
        ctx.fillStyle = '${themeColors.text}';
        ctx.font = 'bold 18px monospace';
        ctx.fillText('SCORE: ' + score, 25, 40);
        ctx.fillText('SHIELD: ' + Math.max(0, player.hp) + '%', 25, 65);
        ctx.fillText('DASH: ' + (player.dashCooldown <= 0 ? 'READY' : 'CHARGING'), 25, 90);

        if (gameOver) {
          ctx.fillStyle = 'rgba(0,0,0,0.85)';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.fillStyle = '${themeColors.accent}';
          ctx.font = 'bold 36px monospace';
          ctx.textAlign = 'center';
          ctx.fillText('SWARM OVERWHELMED', canvas.width/2, 280);
          ctx.font = 'bold 16px monospace';
          ctx.fillStyle = '${themeColors.text}';
          ctx.fillText('Press Reload to Restart Simulation', canvas.width/2, 330);
          ctx.textAlign = 'left';
        }

        requestAnimationFrame(loop);
      }
      requestAnimationFrame(loop);
    `;
  } else if (req.genre === "metroidvania") {
    // 2D Action Platformer with Katana Slash Arc & Coyote Time
    gameScript = `
      const canvas = document.getElementById('gameCanvas');
      const ctx = canvas.getContext('2d');
      let score = 0, gameOver = false;
      const player = { x: 100, y: 400, vx: 0, vy: 0, r: 16, grounded: false, facing: 1, slashing: 0, coyote: 0 };
      const enemies = [{ x: 380, y: 480, vx: -1.5, r: 16, hp: 3 }, { x: 620, y: 480, vx: 1.5, r: 16, hp: 3 }];

      window.addEventListener('keydown', e => {
        if ((e.code === 'KeyJ' || e.code === 'KeyX' || e.code === 'KeyK') && player.slashing <= 0) slash();
        if ((e.code === 'Space' || e.code === 'KeyW' || e.code === 'ArrowUp') && player.coyote > 0) jump();
      });

      function jump() {
        player.vy = -14;
        player.grounded = false;
        player.coyote = 0;
        window.playJuicySound('jump');
        window.spawnJuiceParticles(player.x, player.y + 16, '${themeColors.glow}', 6, 2.5);
      }

      function slash() {
        player.slashing = 10;
        window.playJuicySound('slash');
        window.triggerShake(4);
      }

      function loop() {
        if (window.argusJuice.hitStopFrames > 0) {
          window.argusJuice.hitStopFrames--;
          requestAnimationFrame(loop);
          return;
        }

        if (!gameOver) {
          let dx = window.argusInput.x;
          if (dx !== 0) player.facing = dx > 0 ? 1 : -1;
          player.x += dx * 5.5 * (window.argusTweak.speed || 1);
          player.x = Math.max(20, Math.min(canvas.width - 20, player.x));

          if (window.argusInput.btnA && player.coyote > 0) jump();
          if ((window.argusInput.btnX || window.argusInput.btnB) && player.slashing <= 0) slash();

          if (player.grounded) player.coyote = 6; else if (player.coyote > 0) player.coyote--;
          if (player.slashing > 0) player.slashing--;

          player.vy += 0.75;
          player.y += player.vy;
          if (player.y >= 480) { player.y = 480; player.vy = 0; player.grounded = true; }

          // Slash Hit Detection
          if (player.slashing === 9) {
            const slashX = player.x + player.facing * 35;
            for (let i = enemies.length - 1; i >= 0; i--) {
              const e = enemies[i];
              if (Math.hypot(slashX - e.x, player.y - e.y) < 42) {
                e.hp--;
                e.x += player.facing * 30; // Knockback
                window.triggerHitStop(5);
                window.triggerShake(10);
                window.playJuicySound('hit');
                window.spawnJuiceParticles(e.x, e.y, '${themeColors.accent}', 14, 5);
                if (e.hp <= 0) {
                  enemies.splice(i, 1);
                  score += 100;
                  window.playJuicySound('explosion');
                  window.triggerShake(14);
                  window.spawnJuiceParticles(e.x, e.y, '${themeColors.glow}', 28, 7);
                }
              }
            }
          }

          // Enemy Movement
          for (const e of enemies) {
            e.x += e.vx;
            if (e.x < 150 || e.x > 720) e.vx *= -1;
            if (Math.hypot(player.x - e.x, player.y - e.y) < player.r + e.r) {
              if (!window.argusTweak.godMode) {
                window.triggerShake(12);
                window.triggerHitStop(6);
                window.playJuicySound('hit');
              }
            }
          }
        }

        // Render
        ctx.save();
        if (window.argusJuice.shake > 0) {
          ctx.translate((Math.random() - 0.5) * window.argusJuice.shake, (Math.random() - 0.5) * window.argusJuice.shake);
        }
        ctx.fillStyle = '${themeColors.bg}';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Platform
        ctx.fillStyle = '${themeColors.accent}';
        ctx.fillRect(0, 500, canvas.width, 140);

        // Enemies
        ctx.fillStyle = '#ef4444';
        for (const e of enemies) {
          ctx.beginPath(); ctx.arc(e.x, e.y, e.r, 0, Math.PI * 2); ctx.fill();
        }

        // Player
        ctx.fillStyle = '${themeColors.primary}';
        ctx.beginPath(); ctx.arc(player.x, player.y, player.r, 0, Math.PI * 2); ctx.fill();

        // Slash Arc
        if (player.slashing > 0) {
          ctx.strokeStyle = '${themeColors.glow}';
          ctx.lineWidth = 6;
          ctx.beginPath();
          const startAng = player.facing > 0 ? -Math.PI / 3 : Math.PI * 0.7;
          const endAng = player.facing > 0 ? Math.PI / 3 : Math.PI * 1.3;
          ctx.arc(player.x + player.facing * 16, player.y, 40, startAng, endAng, player.facing < 0);
          ctx.stroke();
        }

        window.updateAndRenderJuice(ctx, canvas);
        ctx.restore();

        ctx.fillStyle = '${themeColors.text}';
        ctx.font = 'bold 20px monospace';
        ctx.fillText('SCORE: ' + score, 30, 45);
        ctx.fillText('SLASH: J / X / Gamepad X', 30, 72);

        requestAnimationFrame(loop);
      }
      requestAnimationFrame(loop);
    `;
  } else if (req.genre === "danmaku") {
    // Bullet Hell Danmaku with Bullet Grazing & EMP Bomb
    gameScript = `
      const canvas = document.getElementById('gameCanvas');
      const ctx = canvas.getContext('2d');
      let score = 0, graze = 0, bombs = 3, gameOver = false;
      const player = { x: 400, y: 520, r: 6, hp: 100 };
      const bullets = [];
      let patternTimer = 0, angleStep = 0;

      window.addEventListener('keydown', e => {
        if ((e.code === 'KeyX' || e.code === 'Space') && bombs > 0) triggerBomb();
      });

      function triggerBomb() {
        bombs--;
        bullets.length = 0;
        window.triggerShake(20);
        window.triggerHitStop(8);
        window.playJuicySound('explosion');
        window.spawnJuiceParticles(player.x, player.y, '#ffffff', 40, 8);
      }

      function loop() {
        if (window.argusJuice.hitStopFrames > 0) {
          window.argusJuice.hitStopFrames--;
          requestAnimationFrame(loop);
          return;
        }

        if (!gameOver) {
          const spd = (window.argusInput.rt > 0.3 ? 2.5 : 5.0) * (window.argusTweak.speed || 1);
          player.x += window.argusInput.x * spd;
          player.y += window.argusInput.y * spd;
          player.x = Math.max(30, Math.min(canvas.width - 30, player.x));
          player.y = Math.max(30, Math.min(canvas.height - 30, player.y));

          if (window.argusInput.btnB && bombs > 0) triggerBomb();

          // Danmaku Pattern Generator
          patternTimer++;
          if (patternTimer > 6 / (window.argusTweak.speed || 1)) {
            patternTimer = 0;
            angleStep += 0.28;
            for (let k = 0; k < 6; k++) {
              const ang = angleStep + (k * Math.PI * 2) / 6;
              bullets.push({ x: 400, y: 150, vx: Math.cos(ang) * 4.2, vy: Math.sin(ang) * 4.2, r: 4, grazed: false });
            }
          }

          // Bullets update & grazing
          for (let i = bullets.length - 1; i >= 0; i--) {
            const b = bullets[i];
            b.x += b.vx; b.y += b.vy;
            const dist = Math.hypot(player.x - b.x, player.y - b.y);

            // Graze detection
            if (dist < 22 && dist > player.r + b.r && !b.grazed) {
              b.grazed = true;
              graze++;
              score += 10;
              window.playJuicySound('coin');
              window.spawnJuiceParticles(player.x, player.y, '${themeColors.glow}', 3, 2);
            }

            // Hit detection
            if (dist < player.r + b.r) {
              if (!window.argusTweak.godMode) {
                gameOver = true;
                window.triggerShake(22);
                window.triggerHitStop(10);
                window.playJuicySound('explosion');
                window.spawnJuiceParticles(player.x, player.y, '#ef4444', 35, 8);
              }
            }

            if (b.x < -30 || b.x > canvas.width + 30 || b.y < -30 || b.y > canvas.height + 30) bullets.splice(i, 1);
          }
        }

        // Render
        ctx.save();
        if (window.argusJuice.shake > 0) {
          ctx.translate((Math.random() - 0.5) * window.argusJuice.shake, (Math.random() - 0.5) * window.argusJuice.shake);
        }
        ctx.fillStyle = '${themeColors.bg}';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Bullets
        ctx.fillStyle = '${themeColors.accent}';
        for (const b of bullets) {
          ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2); ctx.fill();
        }

        // Player Core
        ctx.fillStyle = '${themeColors.primary}';
        ctx.beginPath(); ctx.arc(player.x, player.y, player.r + 8, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath(); ctx.arc(player.x, player.y, player.r, 0, Math.PI * 2); ctx.fill();

        window.updateAndRenderJuice(ctx, canvas);
        ctx.restore();

        // HUD
        ctx.fillStyle = '${themeColors.text}';
        ctx.font = 'bold 18px monospace';
        ctx.fillText('SCORE: ' + score, 25, 40);
        ctx.fillText('GRAZE: ' + graze, 25, 65);
        ctx.fillText('BOMBS: ' + '💣'.repeat(bombs), 25, 90);

        requestAnimationFrame(loop);
      }
      requestAnimationFrame(loop);
    `;
  } else {
    // Default: Top-down Arcade Space Shooter with Shields & Juice
    gameScript = `
      const canvas = document.getElementById('gameCanvas');
      const ctx = canvas.getContext('2d');
      let score = 0, gameOver = false;
      const player = { x: 400, y: 520, r: 16, hp: 100 };
      const bullets = [], enemies = [];
      let fireTimer = 0, spawnTimer = 0;

      const keys = {};
      window.addEventListener('keydown', e => { keys[e.code] = true; });
      window.addEventListener('keyup', e => { keys[e.code] = false; });

      function loop() {
        if (window.argusJuice.hitStopFrames > 0) {
          window.argusJuice.hitStopFrames--;
          requestAnimationFrame(loop);
          return;
        }

        if (!gameOver) {
          let dx = window.argusInput.x;
          let dy = window.argusInput.y;
          if (keys['KeyA'] || keys['ArrowLeft']) dx = -1;
          if (keys['KeyD'] || keys['ArrowRight']) dx = 1;
          if (keys['KeyW'] || keys['ArrowUp']) dy = -1;
          if (keys['KeyS'] || keys['ArrowDown']) dy = 1;

          player.x += dx * 5.5 * (window.argusTweak.speed || 1);
          player.y += dy * 5.5 * (window.argusTweak.speed || 1);
          player.x = Math.max(20, Math.min(canvas.width - 20, player.x));
          player.y = Math.max(20, Math.min(canvas.height - 20, player.y));

          // Autofire
          fireTimer++;
          if (fireTimer > 11) {
            fireTimer = 0;
            bullets.push({ x: player.x, y: player.y, vx: 0, vy: -13 });
            window.playJuicySound('laser');
            window.triggerShake(1.5);
          }

          // Spawn enemies
          spawnTimer++;
          if (spawnTimer > 35 / (window.argusTweak.speed || 1)) {
            spawnTimer = 0;
            enemies.push({ x: Math.random() * (canvas.width - 60) + 30, y: -20, r: 15, hp: 2 });
          }

          // Update Bullets
          for (let i = bullets.length - 1; i >= 0; i--) {
            const b = bullets[i];
            b.y += b.vy;
            if (b.y < -20) bullets.splice(i, 1);
          }

          // Update Enemies
          for (let i = enemies.length - 1; i >= 0; i--) {
            const e = enemies[i];
            e.y += 2.8;

            for (let j = bullets.length - 1; j >= 0; j--) {
              const b = bullets[j];
              if (Math.hypot(b.x - e.x, b.y - e.y) < e.r + 6) {
                e.hp--;
                bullets.splice(j, 1);
                window.triggerHitStop(2);
                window.triggerShake(3);
                window.playJuicySound('hit');
                window.spawnJuiceParticles(e.x, e.y, '${themeColors.accent}', 6, 3);
                if (e.hp <= 0) {
                  enemies.splice(i, 1);
                  score += 25;
                  window.triggerShake(8);
                  window.triggerHitStop(4);
                  window.playJuicySound('explosion');
                  window.spawnJuiceParticles(e.x, e.y, '${themeColors.glow}', 20, 6);
                  break;
                }
              }
            }

            if (Math.hypot(player.x - e.x, player.y - e.y) < player.r + e.r) {
              if (!window.argusTweak.godMode) {
                player.hp -= 20;
                enemies.splice(i, 1);
                window.triggerShake(14);
                window.triggerHitStop(6);
                window.playJuicySound('hit');
                window.spawnJuiceParticles(player.x, player.y, '#ef4444', 16, 5);
                if (player.hp <= 0) gameOver = true;
              }
            }
          }
        }

        // Render
        ctx.save();
        if (window.argusJuice.shake > 0) {
          ctx.translate((Math.random() - 0.5) * window.argusJuice.shake, (Math.random() - 0.5) * window.argusJuice.shake);
        }

        ctx.fillStyle = '${themeColors.bg}';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Bullets
        ctx.fillStyle = '${themeColors.glow}';
        for (const b of bullets) {
          ctx.beginPath(); ctx.arc(b.x, b.y, 4, 0, Math.PI * 2); ctx.fill();
        }

        // Enemies
        ctx.fillStyle = '#ef4444';
        for (const e of enemies) {
          ctx.beginPath(); ctx.arc(e.x, e.y, e.r, 0, Math.PI * 2); ctx.fill();
        }

        // Player
        ctx.fillStyle = '${themeColors.primary}';
        ctx.beginPath(); ctx.arc(player.x, player.y, player.r, 0, Math.PI * 2); ctx.fill();

        window.updateAndRenderJuice(ctx, canvas);
        ctx.restore();

        // HUD
        ctx.fillStyle = '${themeColors.text}';
        ctx.font = 'bold 18px monospace';
        ctx.fillText('SCORE: ' + score, 25, 40);
        ctx.fillText('SHIELD: ' + Math.max(0, player.hp) + '%', 25, 68);

        requestAnimationFrame(loop);
      }
      requestAnimationFrame(loop);
    `;
  }

  const fullHtml = wrapGameWithArgusBridge(gameScript, req.title || "AI Forged Game");

  return {
    id,
    title: req.title || "Procedural Game",
    description: req.prompt || `Generated ${req.genre} title in ${req.artStyle} theme.`,
    code: fullHtml,
    genre: req.genre,
    artStyle: req.artStyle,
    generatedAt: new Date().toISOString(),
  };
}
