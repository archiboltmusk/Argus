import React, { useEffect, useRef, useState, useCallback } from "react";
import { nightERAudio } from "./nighter-audio";
import { Heart, Zap, Trophy, RotateCcw, Volume2, VolumeX } from "lucide-react";

interface NightERCanvasProps {
  onGameOver?: (score: number, level: number) => void;
}

interface Mob {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  type: "chart" | "consult" | "cart" | "attending";
  hp: number;
  maxHp: number;
  speed: number;
  radius: number;
  color: string;
}

interface Projectile {
  x: number;
  y: number;
  vx: number;
  vy: number;
  damage: number;
  pierce: number;
  life: number;
  radius: number;
}

interface Pickable {
  x: number;
  y: number;
  type: "coffee" | "pearl" | "medkit";
  xp: number;
  radius: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

interface UpgradeOption {
  title: string;
  desc: string;
  stat: "speed" | "defib" | "darts" | "cautery" | "maxHp";
}

export const NightERCanvas: React.FC<NightERCanvasProps> = ({ onGameOver }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [hp, setHp] = useState(100);
  const [maxHp, setMaxHp] = useState(100);
  const [level, setLevel] = useState(1);
  const [xp, setXp] = useState(0);
  const [xpToNext, setXpToNext] = useState(100);
  const [score, setScore] = useState(0);
  const [shiftTime, setShiftTime] = useState(0);
  const [isGameOver, setIsGameOver] = useState(false);
  const [isLevelUp, setIsLevelUp] = useState(false);
  const [upgrades, setUpgrades] = useState<UpgradeOption[]>([]);
  const [isMuted, setIsMuted] = useState(false);

  const stateRef = useRef({
    // Player
    x: 400,
    y: 320,
    vx: 0,
    vy: 0,
    aimAngle: 0,
    speed: 3.5,
    hp: 100,
    maxHp: 100,
    level: 1,
    xp: 0,
    xpToNext: 100,
    invulnTimer: 0,
    dashTimer: 0,
    dashCooldown: 0,

    // Weapons
    dartCooldown: 0.35,
    dartTimer: 0,
    dartDamage: 25,

    defibLevel: 1,
    defibCooldown: 3.0,
    defibTimer: 0,
    defibPulseRadius: 0,
    defibActive: false,

    cauteryLevel: 1,
    cauteryCooldown: 1.8,
    cauteryTimer: 0,
    cauteryAngle: 0,
    cauteryActive: false,

    // Entities
    mobs: [] as Mob[],
    projectiles: [] as Projectile[],
    pickups: [] as Pickable[],
    particles: [] as Particle[],

    // Inputs
    keys: {
      w: false,
      s: false,
      a: false,
      d: false,
      dash: false,
    },
    mouse: { x: 400, y: 320, down: false },

    // Game stats
    score: 0,
    shiftTime: 0,
    isGameOver: false,
    isLevelUp: false,
    screenShake: 0,
    nextMobId: 1,
  });

  const toggleMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    nightERAudio.setMuted(next);
  };

  const generateUpgrades = useCallback((): UpgradeOption[] => {
    const pool: UpgradeOption[] = [
      { title: "Stat Caffeine Drip", desc: "Increases movement speed by 18%", stat: "speed" },
      { title: "Defibrillator Surge", desc: "Increases defib shock radius & reduces charge time", stat: "defib" },
      { title: "Syringe Rapid Fire", desc: "Reduces dart cooldown and fires twin darts", stat: "darts" },
      { title: "Bovie Cautery Arc", desc: "Unleashes wider 270° thermal electric cutting arcs", stat: "cautery" },
      { title: "Call-Room Nap", desc: "Increases Max Health by 30 and restores 50 HP", stat: "maxHp" },
    ];
    return pool.sort(() => 0.5 - Math.random()).slice(0, 3);
  }, []);

  const selectUpgrade = (opt: UpgradeOption) => {
    const s = stateRef.current;
    if (opt.stat === "speed") s.speed *= 1.18;
    if (opt.stat === "defib") {
      s.defibLevel += 1;
      s.defibCooldown = Math.max(1.5, s.defibCooldown * 0.82);
    }
    if (opt.stat === "darts") {
      s.dartCooldown = Math.max(0.14, s.dartCooldown * 0.8);
      s.dartDamage += 12;
    }
    if (opt.stat === "cautery") s.cauteryLevel += 1;
    if (opt.stat === "maxHp") {
      s.maxHp += 30;
      s.hp = Math.min(s.maxHp, s.hp + 50);
      setMaxHp(s.maxHp);
      setHp(s.hp);
    }

    s.isLevelUp = false;
    setIsLevelUp(false);
  };

  const restartGame = useCallback(() => {
    const s = stateRef.current;
    s.x = 400;
    s.y = 320;
    s.vx = 0;
    s.vy = 0;
    s.hp = 100;
    s.maxHp = 100;
    s.level = 1;
    s.xp = 0;
    s.xpToNext = 100;
    s.speed = 3.5;
    s.mobs = [];
    s.projectiles = [];
    s.pickups = [];
    s.particles = [];
    s.score = 0;
    s.shiftTime = 0;
    s.isGameOver = false;
    s.isLevelUp = false;

    setHp(100);
    setMaxHp(100);
    setLevel(1);
    setXp(0);
    setXpToNext(100);
    setScore(0);
    setShiftTime(0);
    setIsGameOver(false);
    setIsLevelUp(false);
  }, []);

  // Keyboard and mouse handlers
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const k = stateRef.current.keys;
      if (e.key === "w" || e.key === "W" || e.key === "ArrowUp") k.w = true;
      if (e.key === "s" || e.key === "S" || e.key === "ArrowDown") k.s = true;
      if (e.key === "a" || e.key === "A" || e.key === "ArrowLeft") k.a = true;
      if (e.key === "d" || e.key === "D" || e.key === "ArrowRight") k.d = true;
      if (e.key === " " || e.key === "Shift") k.dash = true;
    };
    const onKeyUp = (e: KeyboardEvent) => {
      const k = stateRef.current.keys;
      if (e.key === "w" || e.key === "W" || e.key === "ArrowUp") k.w = false;
      if (e.key === "s" || e.key === "S" || e.key === "ArrowDown") k.s = false;
      if (e.key === "a" || e.key === "A" || e.key === "ArrowLeft") k.a = false;
      if (e.key === "d" || e.key === "D" || e.key === "ArrowRight") k.d = false;
      if (e.key === " " || e.key === "Shift") k.dash = false;
    };
    const onMouseMove = (e: MouseEvent) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      stateRef.current.mouse.x = (e.clientX - rect.left) * scaleX;
      stateRef.current.mouse.y = (e.clientY - rect.top) * scaleY;
    };
    const onMouseDown = () => {
      stateRef.current.mouse.down = true;
    };
    const onMouseUp = () => {
      stateRef.current.mouse.down = false;
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mouseup", onMouseUp);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, []);

  // Main loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let lastTime = performance.now();
    let spawnTimer = 0;
    let ecgBeepTimer = 0;

    const spawnMob = () => {
      const s = stateRef.current;
      // Edge spawn
      let mx = 0;
      let my = 0;
      if (Math.random() < 0.5) {
        mx = Math.random() < 0.5 ? -30 : canvas.width + 30;
        my = Math.random() * canvas.height;
      } else {
        mx = Math.random() * canvas.width;
        my = Math.random() < 0.5 ? -30 : canvas.height + 30;
      }

      const r = Math.random();
      let type: Mob["type"] = "chart";
      let hp = 30 + s.level * 8;
      let speed = 2.4;
      let radius = 14;
      let color = "#38bdf8"; // Chart paper blue

      if (r < 0.5) {
        type = "chart";
        speed = 2.8;
        hp = 25 + s.level * 6;
      } else if (r < 0.8) {
        type = "consult";
        speed = 1.9;
        hp = 65 + s.level * 15;
        radius = 18;
        color = "#f97316";
      } else if (r < 0.95) {
        type = "cart";
        speed = 1.2;
        hp = 180 + s.level * 35;
        radius = 24;
        color = "#ef4444";
      } else {
        type = "attending";
        speed = 1.0;
        hp = 450 + s.level * 80;
        radius = 32;
        color = "#a855f7"; // Royal purple attending coat
      }

      s.mobs.push({
        id: s.nextMobId++,
        x: mx,
        y: my,
        vx: 0,
        vy: 0,
        type,
        hp,
        maxHp: hp,
        speed,
        radius,
        color,
      });
    };

    const loop = (now: number) => {
      const dt = Math.min((now - lastTime) / 1000, 0.1);
      lastTime = now;
      const s = stateRef.current;

      if (!s.isGameOver && !s.isLevelUp) {
        s.shiftTime += dt;

        // Poll Gamepad
        const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
        let padX = 0;
        let padY = 0;
        let padAimX = 0;
        let padAimY = 0;
        let padDash = false;

        for (const pad of gamepads) {
          if (!pad) continue;
          if (Math.abs(pad.axes[0]) > 0.12) padX = pad.axes[0];
          if (Math.abs(pad.axes[1]) > 0.12) padY = pad.axes[1];
          if (Math.abs(pad.axes[2]) > 0.15) padAimX = pad.axes[2];
          if (Math.abs(pad.axes[3]) > 0.15) padAimY = pad.axes[3];
          if (pad.buttons[4]?.pressed || pad.buttons[6]?.value > 0.3) padDash = true;
        }

        // Move vector
        let moveX = padX;
        let moveY = padY;
        if (s.keys.a) moveX = -1;
        if (s.keys.d) moveX = 1;
        if (s.keys.w) moveY = -1;
        if (s.keys.s) moveY = 1;

        const moveLen = Math.hypot(moveX, moveY);
        if (moveLen > 0.1) {
          moveX /= moveLen;
          moveY /= moveLen;
        } else {
          moveX = 0;
          moveY = 0;
        }

        // Aim vector
        if (Math.hypot(padAimX, padAimY) > 0.2) {
          s.aimAngle = Math.atan2(padAimY, padAimX);
        } else {
          s.aimAngle = Math.atan2(s.mouse.y - s.y, s.mouse.x - s.x);
        }

        // Dash mechanics
        s.dashCooldown = Math.max(0, s.dashCooldown - dt);
        if ((s.keys.dash || padDash) && s.dashCooldown <= 0) {
          s.dashTimer = 0.2;
          s.dashCooldown = 1.4;
          s.invulnTimer = 0.3;
          nightERAudio.playCaffeineGulp();
        }

        const currentSpeed = s.dashTimer > 0 ? s.speed * 2.5 : s.speed;
        s.dashTimer = Math.max(0, s.dashTimer - dt);
        s.invulnTimer = Math.max(0, s.invulnTimer - dt);

        s.vx = moveX;
        s.vy = moveY;
        s.x += moveX * currentSpeed;
        s.y += moveY * currentSpeed;
        s.x = Math.max(20, Math.min(canvas.width - 20, s.x));
        s.y = Math.max(20, Math.min(canvas.height - 20, s.y));

        // Periodic ECG Beep
        ecgBeepTimer += dt;
        if (ecgBeepTimer > (s.hp < 30 ? 0.45 : 1.1)) {
          nightERAudio.playECG(s.hp < 30);
          ecgBeepTimer = 0;
        }

        // WEAPON 1: Syringe Needle Darts (Autofires at closest mob)
        s.dartTimer += dt;
        if (s.dartTimer >= s.dartCooldown && s.mobs.length > 0) {
          s.dartTimer = 0;
          // Find closest mob
          let closestMob: Mob | null = null;
          let minDist = 99999;
          for (const m of s.mobs) {
            const d = Math.hypot(m.x - s.x, m.y - s.y);
            if (d < minDist) {
              minDist = d;
              closestMob = m;
            }
          }

          if (closestMob && minDist < 450) {
            const angle = Math.atan2(closestMob.y - s.y, closestMob.x - s.x);
            s.projectiles.push({
              x: s.x,
              y: s.y,
              vx: Math.cos(angle) * 11,
              vy: Math.sin(angle) * 11,
              damage: s.dartDamage,
              pierce: 1,
              life: 1.2,
              radius: 4,
            });
            nightERAudio.playDart();
          }
        }

        // WEAPON 2: Defibrillator Radial Pulse
        s.defibTimer += dt;
        if (s.defibTimer >= s.defibCooldown) {
          s.defibTimer = 0;
          s.defibActive = true;
          s.defibPulseRadius = 20;
          nightERAudio.playDefibShock();
          s.screenShake = 6;
        }

        if (s.defibActive) {
          s.defibPulseRadius += dt * 320;
          const maxRadius = 130 + s.defibLevel * 30;

          // Hit mobs in radius
          for (const m of s.mobs) {
            const d = Math.hypot(m.x - s.x, m.y - s.y);
            if (Math.abs(d - s.defibPulseRadius) < 25) {
              m.hp -= (45 + s.defibLevel * 15) * dt * 8;
              // Pushback
              const pushAngle = Math.atan2(m.y - s.y, m.x - s.x);
              m.x += Math.cos(pushAngle) * 5;
              m.y += Math.sin(pushAngle) * 5;
            }
          }

          if (s.defibPulseRadius >= maxRadius) {
            s.defibActive = false;
          }
        }

        // WEAPON 3: Cautery Arc (Sweeps towards aim)
        s.cauteryTimer += dt;
        if (s.cauteryTimer >= s.cauteryCooldown) {
          s.cauteryTimer = 0;
          s.cauteryActive = true;
          s.cauteryAngle = s.aimAngle;
          nightERAudio.playCautery();

          const arcSpread = 0.75 + s.cauteryLevel * 0.15;
          const arcReach = 140 + s.cauteryLevel * 20;

          for (const m of s.mobs) {
            const dist = Math.hypot(m.x - s.x, m.y - s.y);
            if (dist < arcReach) {
              const angleToMob = Math.atan2(m.y - s.y, m.x - s.x);
              let angleDiff = Math.abs(angleToMob - s.aimAngle);
              if (angleDiff > Math.PI) angleDiff = Math.PI * 2 - angleDiff;
              if (angleDiff < arcSpread) {
                m.hp -= 70 + s.cauteryLevel * 25;
              }
            }
          }
        }

        // Spawning Mobs
        spawnTimer += dt;
        if (spawnTimer > Math.max(0.45, 1.4 - s.shiftTime * 0.008)) {
          spawnMob();
          spawnTimer = 0;
        }

        // Update Projectiles
        for (let i = s.projectiles.length - 1; i >= 0; i--) {
          const p = s.projectiles[i];
          p.x += p.vx;
          p.y += p.vy;
          p.life -= dt;

          // Check hit against mobs
          for (const m of s.mobs) {
            const dist = Math.hypot(m.x - p.x, m.y - p.y);
            if (dist < m.radius + p.radius) {
              m.hp -= p.damage;
              p.pierce -= 1;
              break;
            }
          }

          if (p.life <= 0 || p.pierce <= 0) {
            s.projectiles.splice(i, 1);
          }
        }

        // Update Mobs
        for (let i = s.mobs.length - 1; i >= 0; i--) {
          const m = s.mobs[i];
          const angle = Math.atan2(s.y - m.y, s.x - m.x);
          m.x += Math.cos(angle) * m.speed;
          m.y += Math.sin(angle) * m.speed;

          // Damage player on contact
          const distToPlayer = Math.hypot(s.x - m.x, s.y - m.y);
          if (distToPlayer < m.radius + 14 && s.invulnTimer <= 0) {
            s.hp -= 15;
            s.invulnTimer = 0.5;
            s.screenShake = 12;
            nightERAudio.playDamage();

            if (s.hp <= 0) {
              s.hp = 0;
              s.isGameOver = true;
              setIsGameOver(true);
              onGameOver?.(s.score, s.level);
            }
          }

          // Mob Death
          if (m.hp <= 0) {
            s.score += m.maxHp;
            // Drop XP / Coffee
            s.pickups.push({
              x: m.x,
              y: m.y,
              type: Math.random() < 0.25 ? "medkit" : Math.random() < 0.5 ? "coffee" : "pearl",
              xp: m.type === "attending" ? 120 : m.type === "cart" ? 45 : 15,
              radius: 9,
            });

            // Splatter particles
            for (let k = 0; k < 6; k++) {
              s.particles.push({
                x: m.x,
                y: m.y,
                vx: (Math.random() - 0.5) * 5,
                vy: (Math.random() - 0.5) * 5,
                life: 0.35,
                maxLife: 0.35,
                color: m.color,
                size: 3 + Math.random() * 3,
              });
            }

            s.mobs.splice(i, 1);
          }
        }

        // Update Pickups
        for (let i = s.pickups.length - 1; i >= 0; i--) {
          const pick = s.pickups[i];
          const dist = Math.hypot(s.x - pick.x, s.y - pick.y);

          // Magnetic suction
          if (dist < 120) {
            const pullAngle = Math.atan2(s.y - pick.y, s.x - pick.x);
            pick.x += Math.cos(pullAngle) * 7;
            pick.y += Math.sin(pullAngle) * 7;
          }

          if (dist < 22) {
            if (pick.type === "medkit") {
              s.hp = Math.min(s.maxHp, s.hp + 25);
              nightERAudio.playCaffeineGulp();
            } else {
              s.xp += pick.xp;
              nightERAudio.playCaffeineGulp();
            }

            // Check level up
            if (s.xp >= s.xpToNext) {
              s.level += 1;
              s.xp -= s.xpToNext;
              s.xpToNext = Math.floor(s.xpToNext * 1.35);
              s.isLevelUp = true;
              setIsLevelUp(true);
              setUpgrades(generateUpgrades());
              nightERAudio.playLevelUp();
            }

            s.pickups.splice(i, 1);
          }
        }

        // Update particles
        for (let i = s.particles.length - 1; i >= 0; i--) {
          const p = s.particles[i];
          p.x += p.vx;
          p.y += p.vy;
          p.life -= dt;
          if (p.life <= 0) s.particles.splice(i, 1);
        }

        // Shake decay
        if (s.screenShake > 0) {
          s.screenShake = Math.max(0, s.screenShake - dt * 25);
        }

        // Sync React HUD state
        setHp(s.hp);
        setMaxHp(s.maxHp);
        setLevel(s.level);
        setXp(s.xp);
        setXpToNext(s.xpToNext);
        setScore(s.score);
        setShiftTime(Math.floor(s.shiftTime));
      }

      // ================= RENDER =================
      ctx.save();
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (s.screenShake > 0) {
        ctx.translate((Math.random() - 0.5) * s.screenShake, (Math.random() - 0.5) * s.screenShake);
      }

      // 1. Hospital Corridor Linoleum Grid
      ctx.fillStyle = "#0f172a"; // Night ER dark floor
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.strokeStyle = "rgba(51, 65, 85, 0.35)";
      ctx.lineWidth = 1;
      const tileSize = 40;
      for (let x = 0; x < canvas.width; x += tileSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }
      for (let y = 0; y < canvas.height; y += tileSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }

      // Red crosses on floor
      ctx.fillStyle = "rgba(225, 29, 72, 0.15)";
      ctx.fillRect(180, 200, 40, 12);
      ctx.fillRect(194, 186, 12, 40);
      ctx.fillRect(580, 420, 40, 12);
      ctx.fillRect(594, 406, 12, 40);

      // 2. Defibrillator Pulse Shockwave
      if (s.defibActive) {
        ctx.strokeStyle = "rgba(56, 189, 248, 0.75)";
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.defibPulseRadius, 0, Math.PI * 2);
        ctx.stroke();
      }

      // 3. Cautery Arc (Flashing sparks)
      if (s.cauteryTimer < 0.15) {
        ctx.fillStyle = "rgba(251, 191, 36, 0.25)";
        ctx.beginPath();
        ctx.moveTo(s.x, s.y);
        ctx.arc(s.x, s.y, 140, s.aimAngle - 0.6, s.aimAngle + 0.6);
        ctx.closePath();
        ctx.fill();
      }

      // 4. Draw Pickups
      for (const pick of s.pickups) {
        ctx.save();
        ctx.translate(pick.x, pick.y);
        if (pick.type === "medkit") {
          ctx.fillStyle = "#ef4444";
          ctx.fillRect(-8, -8, 16, 16);
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(-6, -2, 12, 4);
          ctx.fillRect(-2, -6, 4, 12);
        } else if (pick.type === "coffee") {
          ctx.fillStyle = "#78350f";
          ctx.beginPath();
          ctx.arc(0, 0, 7, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = "#d97706";
          ctx.stroke();
        } else {
          ctx.fillStyle = "#38bdf8";
          ctx.beginPath();
          ctx.arc(0, 0, 6, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }

      // 5. Draw Projectiles (Syringes)
      for (const p of s.projectiles) {
        ctx.fillStyle = "#38bdf8";
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#e0f2fe";
        ctx.stroke();
      }

      // 6. Draw Mobs
      for (const m of s.mobs) {
        ctx.save();
        ctx.translate(m.x, m.y);

        // Body
        ctx.fillStyle = m.color;
        ctx.beginPath();
        ctx.arc(0, 0, m.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Label / Symbol
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 10px monospace";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        if (m.type === "chart") ctx.fillText("📋", 0, 0);
        else if (m.type === "consult") ctx.fillText("MD", 0, 0);
        else if (m.type === "cart") ctx.fillText("⚡", 0, 0);
        else ctx.fillText("BOSS", 0, 0);

        // Mini HP Bar
        const barW = m.radius * 2;
        ctx.fillStyle = "#334155";
        ctx.fillRect(-barW / 2, -m.radius - 8, barW, 4);
        ctx.fillStyle = "#ef4444";
        ctx.fillRect(-barW / 2, -m.radius - 8, barW * (m.hp / m.maxHp), 4);

        ctx.restore();
      }

      // 7. Draw Particles
      for (const p of s.particles) {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * (p.life / p.maxLife), 0, Math.PI * 2);
        ctx.fill();
      }

      // 8. Draw Player (Junior Resident)
      ctx.save();
      ctx.translate(s.x, s.y);

      // Dash Ghost effect
      if (s.dashTimer > 0) {
        ctx.fillStyle = "rgba(16, 185, 129, 0.3)";
        ctx.beginPath();
        ctx.arc(-s.vx * 15, -s.vy * 15, 15, 0, Math.PI * 2);
        ctx.fill();
      }

      // Resident Scrub Green Body
      ctx.fillStyle = "#10b981"; // Hospital scrubs green
      ctx.beginPath();
      ctx.arc(0, 0, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#047857";
      ctx.lineWidth = 2;
      ctx.stroke();

      // Stethoscope
      ctx.strokeStyle = "#38bdf8";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(0, 0, 9, 0, Math.PI);
      ctx.stroke();

      // Aim Line Pointer
      ctx.strokeStyle = "rgba(56, 189, 248, 0.4)";
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(s.aimAngle) * 45, Math.sin(s.aimAngle) * 45);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.restore();
      ctx.restore();

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [onGameOver, generateUpgrades]);

  return (
    <div className="relative w-full h-[640px] bg-slate-950 flex flex-col items-center justify-center select-none overflow-hidden rounded-xl border border-slate-800 shadow-2xl">
      <canvas
        ref={canvasRef}
        width={800}
        height={640}
        className="w-full h-full max-w-[800px] aspect-[5/4] bg-slate-950 rounded-lg cursor-crosshair"
      />

      {/* Top HUD */}
      <div className="absolute top-4 left-6 right-6 flex items-center justify-between pointer-events-none">
        {/* Resident HP & Level */}
        <div className="flex items-center gap-4 bg-slate-900/90 backdrop-blur-md px-4 py-2.5 rounded-xl border border-slate-700/60 shadow-lg pointer-events-auto">
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5 text-xs font-bold text-rose-400">
              <Heart className="w-3.5 h-3.5 fill-rose-500" />
              <span>Sanity / HP</span>
              <span className="font-mono ml-1 text-slate-200">
                {Math.ceil(hp)}/{maxHp}
              </span>
            </div>
            <div className="w-32 h-2.5 bg-slate-800 rounded-full overflow-hidden mt-1 border border-slate-700">
              <div
                className="h-full bg-rose-500 transition-all duration-150"
                style={{ width: `${(hp / maxHp) * 100}%` }}
              />
            </div>
          </div>

          <div className="h-7 w-px bg-slate-700" />

          {/* Level & XP */}
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5 text-xs font-bold text-sky-400">
              <Zap className="w-3.5 h-3.5 fill-sky-400" />
              <span>PGY-{level} Resident</span>
              <span className="font-mono ml-1 text-slate-300">
                {xp}/{xpToNext} XP
              </span>
            </div>
            <div className="w-28 h-2.5 bg-slate-800 rounded-full overflow-hidden mt-1 border border-slate-700">
              <div
                className="h-full bg-sky-400 transition-all duration-150"
                style={{ width: `${(xp / xpToNext) * 100}%` }}
              />
            </div>
          </div>

          <button
            onClick={toggleMute}
            className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-200 transition-colors"
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4" />}
          </button>
        </div>

        {/* Shift Duration & Score */}
        <div className="flex items-center gap-4 bg-slate-900/90 backdrop-blur-md px-4 py-2.5 rounded-xl border border-slate-700/60 shadow-lg">
          <div>
            <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Shift Elapsed</div>
            <div className="text-xl font-black text-slate-100 font-mono">
              {Math.floor(shiftTime / 60)}:{(shiftTime % 60).toString().padStart(2, "0")}
            </div>
          </div>
          <div className="h-7 w-px bg-slate-700" />
          <div>
            <div className="text-[10px] uppercase font-bold tracking-wider text-amber-400">Charts Cleared</div>
            <div className="text-xl font-black text-amber-300 font-mono">{score}</div>
          </div>
        </div>
      </div>

      {/* Level Up Modal */}
      {isLevelUp && (
        <div className="absolute inset-0 bg-black/80 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center animate-in zoom-in-95 duration-200">
          <div className="w-14 h-14 rounded-2xl bg-sky-500/20 border border-sky-500/40 flex items-center justify-center text-sky-400 mb-3 shadow-xl">
            <Zap className="w-7 h-7" />
          </div>
          <h2 className="text-2xl font-black text-white uppercase tracking-wider mb-1">Board Certification!</h2>
          <p className="text-slate-400 text-xs mb-6">Select an on-call clinical upgrade to survive the shift:</p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 w-full max-w-2xl">
            {upgrades.map((u, i) => (
              <button
                key={i}
                onClick={() => selectUpgrade(u)}
                className="flex flex-col text-left p-4 rounded-xl bg-slate-900/95 border border-slate-700 hover:border-sky-500/80 hover:bg-slate-800 transition-all shadow-lg group active:scale-95"
              >
                <div className="font-bold text-sky-400 text-sm group-hover:text-sky-300 mb-1">{u.title}</div>
                <div className="text-slate-400 text-xs leading-relaxed">{u.desc}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Game Over Modal */}
      {isGameOver && (
        <div className="absolute inset-0 bg-black/85 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-300">
          <div className="w-16 h-16 rounded-2xl bg-red-500/20 border border-red-500/40 flex items-center justify-center text-red-400 mb-4 shadow-xl">
            <Trophy className="w-8 h-8" />
          </div>
          <h2 className="text-3xl font-black text-slate-100 uppercase tracking-wider mb-1">Resident Burnout!</h2>
          <p className="text-slate-400 text-sm max-w-sm mb-6">
            You collapsed in the call room before finishing your morning handover rounds.
          </p>

          <div className="grid grid-cols-2 gap-4 w-full max-w-xs mb-8">
            <div className="bg-slate-900/90 border border-slate-800 p-3 rounded-xl">
              <div className="text-xs text-slate-400">Total Score</div>
              <div className="text-2xl font-black text-sky-400 font-mono">{score}</div>
            </div>
            <div className="bg-slate-900/90 border border-slate-800 p-3 rounded-xl">
              <div className="text-xs text-slate-400">Rank Reached</div>
              <div className="text-2xl font-black text-amber-400 font-mono">PGY-{level}</div>
            </div>
          </div>

          <button
            onClick={restartGame}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 text-slate-950 font-black tracking-wider uppercase shadow-lg shadow-sky-500/25 hover:brightness-110 active:scale-95 transition-all"
          >
            <RotateCcw className="w-5 h-5" />
            Next Shift (Press A)
          </button>
        </div>
      )}
    </div>
  );
};
