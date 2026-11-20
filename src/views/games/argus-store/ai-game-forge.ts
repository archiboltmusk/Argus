/**
 * AI Game Forge Engine
 * Generates and compiles prompt-driven HTML5 Canvas + Web Audio games
 * with automatic Gamepad controller injection and offline play support.
 */

export interface ForgeRequest {
  title: string;
  genre: "action" | "shooter" | "roguelike" | "runner" | "puzzle";
  artStyle: "neon_cyberpunk" | "retro_pixel" | "vector_minimal" | "sunset_arcade";
  prompt: string;
}

export interface GeneratedGame {
  id: string;
  title: string;
  description: string;
  code: string;
  genre: string;
  artStyle: string;
  generatedAt: string;
}

/**
 * Universal Gamepad & Audio Injection wrapper:
 * Injects requestAnimationFrame loop, AudioContext synthesizers, and
 * auto-translates gamepad buttons / analog sticks to window key events and game variables.
 */
export function wrapGameWithArgusBridge(innerGameJs: string, title: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${title}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { width: 100%; height: 100%; overflow: hidden; background: #0c0a09; font-family: sans-serif; }
    #canvas-container { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; position: relative; }
    canvas { background: #1c1917; border-radius: 8px; box-shadow: 0 10px 40px rgba(0,0,0,0.8); max-width: 100%; max-height: 100%; aspect-ratio: 5/4; }
    #gamepad-hud { position: absolute; bottom: 12px; left: 16px; color: rgba(255,255,255,0.7); font-size: 11px; font-family: monospace; pointer-events: none; }
  </style>
</head>
<body>
  <div id="canvas-container">
    <canvas id="gameCanvas" width="800" height="640"></canvas>
    <div id="gamepad-hud">🎮 Controller: LS / WASD to move • A / Space to act</div>
  </div>
  <script>
    // Argus Universal Gamepad Poller & Keyboard Bridge
    window.argusInput = { x: 0, y: 0, btnA: false, btnB: false, btnX: false, btnY: false, rt: 0 };
    function pollArgusGamepads() {
      const pads = navigator.getGamepads ? navigator.getGamepads() : [];
      for (const p of pads) {
        if (!p) continue;
        if (Math.abs(p.axes[0]) > 0.15) window.argusInput.x = p.axes[0];
        if (Math.abs(p.axes[1]) > 0.15) window.argusInput.y = p.axes[1];
        window.argusInput.btnA = p.buttons[0]?.pressed || false;
        window.argusInput.btnB = p.buttons[1]?.pressed || false;
        window.argusInput.btnX = p.buttons[2]?.pressed || false;
        window.argusInput.btnY = p.buttons[3]?.pressed || false;
        window.argusInput.rt = p.buttons[7]?.value || 0;
      }
      requestAnimationFrame(pollArgusGamepads);
    }
    requestAnimationFrame(pollArgusGamepads);

    // Audio Context Helper
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    window.argusAudio = new AudioCtx();
    window.playBeep = (freq = 440, type = 'sine', duration = 0.1) => {
      try {
        if (window.argusAudio.state === 'suspended') window.argusAudio.resume();
        const o = window.argusAudio.createOscillator();
        const g = window.argusAudio.createGain();
        o.type = type;
        o.frequency.setValueAtTime(freq, window.argusAudio.currentTime);
        g.gain.setValueAtTime(0.2, window.argusAudio.currentTime);
        g.gain.exponentialRampToValueAtTime(0.001, window.argusAudio.currentTime + duration);
        o.connect(g);
        g.connect(window.argusAudio.destination);
        o.start();
        o.stop(window.argusAudio.currentTime + duration);
      } catch (e) {}
    };

    // Game Logic Body
    ${innerGameJs}
  </script>
</body>
</html>`;
}

/**
 * Generates an instant, highly tuned, functional game from pre-trained AI templates.
 */
export function generateOfflineAIGame(req: ForgeRequest): GeneratedGame {
  const id = "ai_game_" + Date.now();
  const themeColors = {
    neon_cyberpunk: { bg: "#09090b", primary: "#06b6d4", accent: "#f43f5e", text: "#e0e7ff" },
    retro_pixel: { bg: "#1e1b4b", primary: "#fbbf24", accent: "#a855f7", text: "#ffffff" },
    vector_minimal: { bg: "#0f172a", primary: "#38bdf8", accent: "#34d399", text: "#f8fafc" },
    sunset_arcade: { bg: "#18181b", primary: "#f59e0b", accent: "#ea580c", text: "#fef08a" },
  }[req.artStyle];

  let gameScript = "";

  if (req.genre === "runner") {
    gameScript = `
      const canvas = document.getElementById('gameCanvas');
      const ctx = canvas.getContext('2d');
      let score = 0, speed = 6, gameOver = false;
      const player = { x: 120, y: 320, vy: 0, r: 18, jumping: false };
      const obstacles = [];
      let obsTimer = 0;

      window.addEventListener('keydown', e => {
        if ((e.code === 'Space' || e.code === 'KeyW' || e.code === 'ArrowUp') && !player.jumping && !gameOver) {
          player.vy = -14;
          player.jumping = true;
          window.playBeep(580, 'square', 0.12);
        }
        if (gameOver && (e.code === 'Space' || e.code === 'Enter')) restart();
      });

      function restart() {
        score = 0; speed = 6; gameOver = false;
        player.y = 320; player.vy = 0; player.jumping = false;
        obstacles.length = 0;
      }

      function loop() {
        if (!gameOver) {
          if ((window.argusInput.btnA || window.argusInput.y < -0.5) && !player.jumping) {
            player.vy = -14; player.jumping = true;
            window.playBeep(580, 'square', 0.12);
          }
          player.vy += 0.7; // Gravity
          player.y += player.vy;
          if (player.y >= 500) { player.y = 500; player.vy = 0; player.jumping = false; }

          obsTimer++;
          if (obsTimer > 60) {
            obsTimer = 0;
            obstacles.push({ x: 840, y: 480, w: 26, h: 40 });
          }

          for (let i = obstacles.length - 1; i >= 0; i--) {
            const o = obstacles[i];
            o.x -= speed;
            // Collision
            if (Math.abs(player.x - (o.x + o.w/2)) < player.r + o.w/2 && player.y > o.y - player.r) {
              gameOver = true;
              window.playBeep(120, 'sawtooth', 0.35);
            }
            if (o.x < -40) {
              obstacles.splice(i, 1);
              score += 10;
              speed += 0.08;
              window.playBeep(880, 'sine', 0.05);
            }
          }
        }

        // Render
        ctx.fillStyle = '${themeColors.bg}';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Ground
        ctx.fillStyle = '${themeColors.accent}';
        ctx.fillRect(0, 520, canvas.width, 120);

        // Player
        ctx.fillStyle = '${themeColors.primary}';
        ctx.beginPath();
        ctx.arc(player.x, player.y, player.r, 0, Math.PI * 2);
        ctx.fill();

        // Obstacles
        ctx.fillStyle = '${themeColors.text}';
        for (const o of obstacles) {
          ctx.fillRect(o.x, o.y, o.w, o.h);
        }

        // HUD
        ctx.fillStyle = '${themeColors.text}';
        ctx.font = 'bold 20px monospace';
        ctx.fillText('SCORE: ' + score, 30, 45);

        if (gameOver) {
          ctx.fillStyle = 'rgba(0,0,0,0.85)';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.fillStyle = '${themeColors.accent}';
          ctx.font = 'bold 36px monospace';
          ctx.textAlign = 'center';
          ctx.fillText('RUN TERMINATED', canvas.width/2, 280);
          ctx.font = 'bold 18px monospace';
          ctx.fillText('Press A or Space to Retry', canvas.width/2, 330);
          ctx.textAlign = 'left';
        }

        requestAnimationFrame(loop);
      }
      requestAnimationFrame(loop);
    `;
  } else {
    // Default: Top-down Arena Action Shooter
    gameScript = `
      const canvas = document.getElementById('gameCanvas');
      const ctx = canvas.getContext('2d');
      let score = 0, gameOver = false;
      const player = { x: 400, y: 320, r: 16, hp: 100 };
      const bullets = [], enemies = [];
      let fireTimer = 0, spawnTimer = 0;

      const keys = {};
      window.addEventListener('keydown', e => { keys[e.code] = true; });
      window.addEventListener('keyup', e => { keys[e.code] = false; });

      function loop() {
        if (!gameOver) {
          // Movement
          let dx = window.argusInput.x;
          let dy = window.argusInput.y;
          if (keys['KeyA'] || keys['ArrowLeft']) dx = -1;
          if (keys['KeyD'] || keys['ArrowRight']) dx = 1;
          if (keys['KeyW'] || keys['ArrowUp']) dy = -1;
          if (keys['KeyS'] || keys['ArrowDown']) dy = 1;

          player.x += dx * 5;
          player.y += dy * 5;
          player.x = Math.max(20, Math.min(canvas.width - 20, player.x));
          player.y = Math.max(20, Math.min(canvas.height - 20, player.y));

          // Autofire
          fireTimer++;
          if (fireTimer > 12) {
            fireTimer = 0;
            bullets.push({ x: player.x, y: player.y, vx: 0, vy: -12 });
            window.playBeep(720, 'square', 0.05);
          }

          // Spawn enemies
          spawnTimer++;
          if (spawnTimer > 35) {
            spawnTimer = 0;
            enemies.push({ x: Math.random() * (canvas.width - 60) + 30, y: -20, r: 14, hp: 2 });
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
            // Check bullet hit
            for (let j = bullets.length - 1; j >= 0; j--) {
              const b = bullets[j];
              if (Math.hypot(b.x - e.x, b.y - e.y) < e.r + 6) {
                e.hp--;
                bullets.splice(j, 1);
                if (e.hp <= 0) {
                  enemies.splice(i, 1);
                  score += 25;
                  window.playBeep(320, 'triangle', 0.1);
                  break;
                }
              }
            }

            if (Math.hypot(player.x - e.x, player.y - e.y) < player.r + e.r) {
              player.hp -= 20;
              enemies.splice(i, 1);
              window.playBeep(140, 'sawtooth', 0.2);
              if (player.hp <= 0) gameOver = true;
            }
          }
        }

        // Render
        ctx.fillStyle = '${themeColors.bg}';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Bullets
        ctx.fillStyle = '${themeColors.accent}';
        for (const b of bullets) {
          ctx.beginPath();
          ctx.arc(b.x, b.y, 4, 0, Math.PI * 2);
          ctx.fill();
        }

        // Enemies
        ctx.fillStyle = '#ef4444';
        for (const e of enemies) {
          ctx.beginPath();
          ctx.arc(e.x, e.y, e.r, 0, Math.PI * 2);
          ctx.fill();
        }

        // Player
        ctx.fillStyle = '${themeColors.primary}';
        ctx.beginPath();
        ctx.arc(player.x, player.y, player.r, 0, Math.PI * 2);
        ctx.fill();

        // HUD
        ctx.fillStyle = '${themeColors.text}';
        ctx.font = 'bold 18px monospace';
        ctx.fillText('SCORE: ' + score, 25, 40);
        ctx.fillText('SHIELD: ' + Math.max(0, player.hp) + '%', 25, 68);

        if (gameOver) {
          ctx.fillStyle = 'rgba(0,0,0,0.85)';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.fillStyle = '${themeColors.accent}';
          ctx.font = 'bold 36px monospace';
          ctx.textAlign = 'center';
          ctx.fillText('SECTOR LOST', canvas.width/2, 280);
          ctx.font = 'bold 16px monospace';
          ctx.fillText('Reloading Simulation...', canvas.width/2, 330);
          ctx.textAlign = 'left';
        }

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
