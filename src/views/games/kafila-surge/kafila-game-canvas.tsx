import React, { useEffect, useRef, useCallback } from "react";
import {
  Citizen,
  PoliceOfficer,
  Barricade,
  WaterParticle,
  ChantPulse,
  LandmarkZone,
  GameStats,
  GameMode,
  CitizenRole,
} from "./kafila-types";
import { kafilaAudio } from "./kafila-audio";

interface KafilaGameCanvasProps {
  mode: GameMode;
  onGameOver: (stats: GameStats, won: boolean) => void;
  onStatsUpdate: (stats: GameStats) => void;
  isPaused: boolean;
}

const CHANT_SLOGANS = [
  "हल्ला बोल!",
  "इंक़लाब ज़िंदाबाद!",
  "हम देखेंगे!",
  "चलो जंतर मंतर!",
  "हमारी माँगें पूरी करो!",
  "रोटी, कपड़ा, मकान!",
  "एकता हमारी ताक़त!",
];

export const KafilaGameCanvas: React.FC<KafilaGameCanvasProps> = ({
  mode: _mode,
  onGameOver,
  onStatsUpdate,
  isPaused,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Core Game State
  const leaderRef = useRef({
    x: 400,
    y: 1800,
    vx: 0,
    vy: 0,
    speed: 3.8,
    heading: -Math.PI / 2,
    health: 100,
  });

  const citizensRef = useRef<Citizen[]>([]);
  const policeRef = useRef<PoliceOfficer[]>([]);
  const barricadesRef = useRef<Barricade[]>([]);
  const waterParticlesRef = useRef<WaterParticle[]>([]);
  const chantPulsesRef = useRef<ChantPulse[]>([]);

  const landmarkRef = useRef<LandmarkZone>({
    name: "Jantar Mantar Sanctuary",
    x: 400,
    y: 200,
    radius: 180,
    holdTimeSeconds: 45,
    currentHoldProgress: 0,
  });

  const statsRef = useRef<GameStats>({
    score: 0,
    crowdCount: 1,
    maxCrowdCount: 1,
    barricadesBust: 0,
    chantsEmitted: 0,
    copsStunned: 0,
    timeSurvivedSec: 0,
  });

  const keysPressed = useRef<Record<string, boolean>>({});
  const cameraRef = useRef({ x: 400, y: 1800, zoom: 1.0 });
  const shakeRef = useRef(0);
  const surgeEnergyRef = useRef(100);
  const isSurgingRef = useRef(false);
  const chantCooldownRef = useRef(0);

  // Setup / reset world
  const initWorld = useCallback(() => {
    // Starting position: South entrance near Ring Road
    leaderRef.current = {
      x: 400,
      y: 1900,
      vx: 0,
      vy: 0,
      speed: 3.8,
      heading: -Math.PI / 2,
      health: 100,
    };

    cameraRef.current = { x: 400, y: 1900, zoom: 1.0 };
    surgeEnergyRef.current = 100;
    chantCooldownRef.current = 0;

    // Generate Initial Supporter Core (5 followers)
    const initialCitizens: Citizen[] = [];
    const roles: CitizenRole[] = ["orator", "drummer", "banner", "medic", "regular"];
    for (let i = 0; i < 6; i++) {
      initialCitizens.push({
        id: i + 1,
        x: 400 + (Math.random() - 0.5) * 60,
        y: 1930 + Math.random() * 50,
        vx: 0,
        vy: 0,
        targetX: 400,
        targetY: 1900,
        role: roles[i % roles.length],
        state: "walking",
        health: 100,
        maxHealth: 100,
        radius: 11,
        color: i % 2 === 0 ? "#ff9933" : "#22c55e",
        isRecruited: true,
        stunTimer: 0,
        animPhase: Math.random() * Math.PI * 2,
        heading: -Math.PI / 2,
      });
    }

    // Populate Neutral Civilians throughout streets (200 bystanders)
    for (let i = 0; i < 220; i++) {
      const rx = 100 + Math.random() * 600;
      const ry = 250 + Math.random() * 1600;
      const rolePool: CitizenRole[] = ["regular", "regular", "orator", "drummer", "banner", "medic"];
      const assignedRole = rolePool[Math.floor(Math.random() * rolePool.length)];

      initialCitizens.push({
        id: 1000 + i,
        x: rx,
        y: ry,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        targetX: rx,
        targetY: ry,
        role: assignedRole,
        state: "walking",
        health: 80,
        maxHealth: 80,
        radius: 10,
        color: "#cbd5e1",
        isRecruited: false,
        stunTimer: 0,
        animPhase: Math.random() * Math.PI * 2,
        heading: Math.random() * Math.PI * 2,
      });
    }
    citizensRef.current = initialCitizens;

    // Place Barricades across key street choke points
    const barricadeList: Barricade[] = [];
    const barricadeYPositions = [1500, 1150, 800, 480];
    let bId = 1;
    for (const bY of barricadeYPositions) {
      // Dual barricades blocking main avenues
      barricadeList.push({
        id: bId++,
        x: 320,
        y: bY,
        width: 140,
        height: 22,
        health: 120,
        maxHealth: 120,
        broken: false,
        angle: 0,
      });
      barricadeList.push({
        id: bId++,
        x: 480,
        y: bY,
        width: 140,
        height: 22,
        health: 120,
        maxHealth: 120,
        broken: false,
        angle: 0,
      });
    }
    barricadesRef.current = barricadeList;

    // Place Police squads
    const policeOfficers: PoliceOfficer[] = [];
    let copId = 1;
    // Patrol cops near barricades
    for (const bY of barricadeYPositions) {
      for (let c = 0; c < 3; c++) {
        policeOfficers.push({
          id: copId++,
          x: 280 + c * 120,
          y: bY - 40,
          vx: 0,
          vy: 0,
          type: "patrol",
          health: 100,
          radius: 12,
          attackCooldown: 0,
          heading: Math.PI / 2,
          hasLathi: true,
          state: "blocking",
          stunTimer: 0,
        });
      }
    }

    // Water Cannon Riot Trucks (Vajra) at higher avenue checkpoints
    policeOfficers.push({
      id: copId++,
      x: 400,
      y: 950,
      vx: 0,
      vy: 0,
      type: "cannon_truck",
      health: 300,
      radius: 28,
      attackCooldown: 0,
      heading: Math.PI / 2,
      hasLathi: false,
      state: "spraying",
      stunTimer: 0,
    });

    policeOfficers.push({
      id: copId++,
      x: 400,
      y: 600,
      vx: 0,
      vy: 0,
      type: "cannon_truck",
      health: 300,
      radius: 28,
      attackCooldown: 0,
      heading: Math.PI / 2,
      hasLathi: false,
      state: "spraying",
      stunTimer: 0,
    });

    policeRef.current = policeOfficers;

    // Reset zone and stats
    landmarkRef.current.currentHoldProgress = 0;
    statsRef.current = {
      score: 0,
      crowdCount: 7,
      maxCrowdCount: 7,
      barricadesBust: 0,
      chantsEmitted: 0,
      copsStunned: 0,
      timeSurvivedSec: 0,
    };

    kafilaAudio.startCrowdMoraleBeat(7);
  }, []);

  // Trigger Controller Rumble / Haptic Feedback
  const triggerHaptic = (duration = 150, weak = 0.5, strong = 0.8) => {
    try {
      const pads = typeof navigator.getGamepads === "function" ? navigator.getGamepads() : [];
      for (const pad of pads) {
        if (pad && pad.vibrationActuator && typeof pad.vibrationActuator.playEffect === "function") {
          void pad.vibrationActuator.playEffect("dual-rumble", {
            duration,
            weakMagnitude: weak,
            strongMagnitude: strong,
          });
        }
      }
    } catch {
      // Haptics unavailable
    }
  };

  // Keyboard Listeners
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      keysPressed.current[e.key.toLowerCase()] = true;
      if (e.key === " " || e.key === "Spacebar") {
        e.preventDefault();
        triggerChant();
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      keysPressed.current[e.key.toLowerCase()] = false;
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, []);

  // Mega Chant execution
  const triggerChant = useCallback(() => {
    if (chantCooldownRef.current > 0) return;
    chantCooldownRef.current = 45; // 0.75s cooldown

    const leader = leaderRef.current;
    const slogan = CHANT_SLOGANS[Math.floor(Math.random() * CHANT_SLOGANS.length)];
    chantPulsesRef.current.push({
      x: leader.x,
      y: leader.y,
      radius: 20,
      maxRadius: 260,
      alpha: 1.0,
      text: slogan,
    });

    kafilaAudio.playChantShockwave();
    triggerHaptic(200, 0.4, 0.9);
    shakeRef.current = 8;
    statsRef.current.chantsEmitted++;

    // Convert nearby bystanders immediately in blast radius
    for (const c of citizensRef.current) {
      if (!c.isRecruited) {
        const dx = c.x - leader.x;
        const dy = c.y - leader.y;
        const d = Math.hypot(dx, dy);
        if (d < 240) {
          c.isRecruited = true;
          c.color = "#ff9933";
          statsRef.current.crowdCount++;
          statsRef.current.score += 50;
          kafilaAudio.playRecruitChime(statsRef.current.crowdCount);
        }
      }
    }

    // Stun nearby police officers
    for (const p of policeRef.current) {
      const dx = p.x - leader.x;
      const dy = p.y - leader.y;
      const d = Math.hypot(dx, dy);
      if (d < 220) {
        p.stunTimer = 90; // 1.5s stun
        p.state = "stunned";
        statsRef.current.copsStunned++;
      }
    }
  }, []);

  // Main Loop
  useEffect(() => {
    initWorld();
    let animId: number;
    let lastTime = performance.now();

    const loop = (now: number) => {
      const dt = Math.min((now - lastTime) / 1000, 0.1);
      lastTime = now;

      if (!isPaused) {
        updateGame(dt);
      }
      renderGame();
      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(animId);
      kafilaAudio.stopCrowdMoraleBeat();
    };
  }, [initWorld, isPaused]);

  // Update Game Physics & Simulation
  const updateGame = (dt: number) => {
    statsRef.current.timeSurvivedSec += dt;
    const leader = leaderRef.current;
    if (chantCooldownRef.current > 0) chantCooldownRef.current--;
    if (shakeRef.current > 0) shakeRef.current *= 0.88;

    // Gamepad input polling
    let moveX = 0;
    let moveY = 0;
    let padSurge = false;
    let padChant = false;

    const gamepads = typeof navigator.getGamepads === "function" ? navigator.getGamepads() : [];
    for (const pad of gamepads) {
      if (pad && pad.connected) {
        // Left Stick (Deadzone 0.15)
        const lx = pad.axes[0] || 0;
        const ly = pad.axes[1] || 0;
        if (Math.abs(lx) > 0.15) moveX = lx;
        if (Math.abs(ly) > 0.15) moveY = ly;

        // D-Pad
        if (pad.buttons[14]?.pressed) moveX = -1;
        if (pad.buttons[15]?.pressed) moveX = 1;
        if (pad.buttons[12]?.pressed) moveY = -1;
        if (pad.buttons[13]?.pressed) moveY = 1;

        // Face Buttons & Triggers
        if (pad.buttons[0]?.pressed) padChant = true; // A / Cross
        if (pad.buttons[7]?.pressed || pad.buttons[5]?.pressed) padSurge = true; // RT or RB
      }
    }

    // Keyboard Fallback
    const k = keysPressed.current;
    if (k["arrowleft"] || k["a"]) moveX = -1;
    if (k["arrowright"] || k["d"]) moveX = 1;
    if (k["arrowup"] || k["w"]) moveY = -1;
    if (k["arrowdown"] || k["s"]) moveY = 1;
    if (k["shift"]) padSurge = true;
    if (padChant) triggerChant();

    // Surge management
    if (padSurge && surgeEnergyRef.current > 10) {
      isSurgingRef.current = true;
      surgeEnergyRef.current = Math.max(0, surgeEnergyRef.current - dt * 40);
    } else {
      isSurgingRef.current = false;
      surgeEnergyRef.current = Math.min(100, surgeEnergyRef.current + dt * 15);
    }

    const currentSpeed = isSurgingRef.current ? leader.speed * 1.8 : leader.speed;

    // Normalize movement
    const len = Math.hypot(moveX, moveY);
    if (len > 0.05) {
      leader.vx = (moveX / len) * currentSpeed;
      leader.vy = (moveY / len) * currentSpeed;
      leader.heading = Math.atan2(leader.vy, leader.vx);
    } else {
      leader.vx *= 0.82;
      leader.vy *= 0.82;
    }

    leader.x += leader.vx;
    leader.y += leader.vy;

    // Boundaries (Map is 800w x 2100h)
    leader.x = Math.max(80, Math.min(720, leader.x));
    leader.y = Math.max(100, Math.min(2000, leader.y));

    // Smooth Camera Follow with dynamic zoom
    const targetZoom = Math.max(0.65, 1.05 - (statsRef.current.crowdCount / 180) * 0.35);
    cameraRef.current.x += (leader.x - cameraRef.current.x) * 0.08;
    cameraRef.current.y += (leader.y - cameraRef.current.y) * 0.08;
    cameraRef.current.zoom += (targetZoom - cameraRef.current.zoom) * 0.05;

    // --- CITIZENS & CROWD BOID FLOCKING ---
    const recruited = citizensRef.current.filter((c) => c.isRecruited);
    statsRef.current.crowdCount = recruited.length + 1;
    if (statsRef.current.crowdCount > statsRef.current.maxCrowdCount) {
      statsRef.current.maxCrowdCount = statsRef.current.crowdCount;
    }

    const oratorCount = recruited.filter((c) => c.role === "orator").length;
    const drummerCount = recruited.filter((c) => c.role === "drummer").length;
    const recruitRadius = 38 + oratorCount * 14;

    for (let i = 0; i < citizensRef.current.length; i++) {
      const c = citizensRef.current[i];

      if (c.stunTimer > 0) {
        c.stunTimer--;
        continue;
      }

      if (c.isRecruited) {
        // Cohesion towards leader with loose crowd dispersion
        const toLeaderX = leader.x - c.x;
        const toLeaderY = leader.y - c.y;
        const distToLeader = Math.hypot(toLeaderX, toLeaderY);

        // Desired distance from leader based on crowd index
        const desiredDist = 30 + Math.sqrt(i) * 12;
        let forceX = 0;
        let forceY = 0;

        if (distToLeader > desiredDist) {
          forceX += (toLeaderX / distToLeader) * 0.22;
          forceY += (toLeaderY / distToLeader) * 0.22;
        }

        // Separation from neighboring citizens (avoid clumping)
        for (let j = 0; j < recruited.length; j += 2) {
          const other = recruited[j];
          if (other.id !== c.id) {
            const dx = c.x - other.x;
            const dy = c.y - other.y;
            const d = Math.hypot(dx, dy);
            if (d > 0 && d < 24) {
              forceX += (dx / d) * (0.35 * (1 - d / 24));
              forceY += (dy / d) * (0.35 * (1 - d / 24));
            }
          }
        }

        // Bonus speed from drummers
        const moraleSpeed = 1.0 + Math.min(0.5, drummerCount * 0.1);
        c.vx = (c.vx + forceX) * 0.88 * moraleSpeed;
        c.vy = (c.vy + forceY) * 0.88 * moraleSpeed;

        c.x += c.vx;
        c.y += c.vy;

        // Bystander recruitment by proximity
        for (const bystander of citizensRef.current) {
          if (!bystander.isRecruited) {
            const bx = bystander.x - c.x;
            const by = bystander.y - c.y;
            if (Math.hypot(bx, by) < recruitRadius) {
              bystander.isRecruited = true;
              bystander.color = "#ff9933";
              statsRef.current.score += 25;
              kafilaAudio.playRecruitChime(statsRef.current.crowdCount);
            }
          }
        }
      } else {
        // Bystanders gently wander around
        c.x += c.vx;
        c.y += c.vy;
        if (Math.random() < 0.02) {
          c.vx = (Math.random() - 0.5) * 0.6;
          c.vy = (Math.random() - 0.5) * 0.6;
        }
      }
    }

    // --- BARRICADES & SURGE IMPACT ---
    for (const b of barricadesRef.current) {
      if (b.broken) continue;

      // Check leader collision
      if (
        leader.x > b.x - b.width / 2 &&
        leader.x < b.x + b.width / 2 &&
        leader.y > b.y - b.height / 2 &&
        leader.y < b.y + b.height / 2
      ) {
        leader.y = b.y + b.height / 2 + 5;
      }

      // Check crowd surge impact on barricade
      let crowdPressure = 0;
      for (const c of recruited) {
        if (
          c.x > b.x - b.width / 2 - 10 &&
          c.x < b.x + b.width / 2 + 10 &&
          c.y > b.y - b.height / 2 - 15 &&
          c.y < b.y + b.height / 2 + 15
        ) {
          crowdPressure += isSurgingRef.current ? 4 : 1;
        }
      }

      if (crowdPressure > 12) {
        b.health -= crowdPressure * 0.4;
        if (b.health <= 0) {
          b.broken = true;
          statsRef.current.barricadesBust++;
          statsRef.current.score += 500;
          kafilaAudio.playBarricadeCrash();
          triggerHaptic(300, 0.8, 1.0);
          shakeRef.current = 14;
        }
      }
    }

    // --- POLICE AI & WATER CANNONS ---
    for (const p of policeRef.current) {
      if (p.stunTimer > 0) {
        p.stunTimer--;
        continue;
      }

      if (p.type === "patrol") {
        // Find closest recruited marcher
        let closestDist = 999;
        let targetX = leader.x;
        let targetY = leader.y;

        for (const c of recruited) {
          const d = Math.hypot(c.x - p.x, c.y - p.y);
          if (d < closestDist && d < 220) {
            closestDist = d;
            targetX = c.x;
            targetY = c.y;
          }
        }

        // Move toward target
        const dx = targetX - p.x;
        const dy = targetY - p.y;
        const dist = Math.hypot(dx, dy);

        if (dist > 15 && dist < 240) {
          p.vx = (dx / dist) * 2.2;
          p.vy = (dy / dist) * 2.2;
          p.x += p.vx;
          p.y += p.vy;
          p.heading = Math.atan2(dy, dx);

          // Strike with lathi
          if (dist < 20 && p.attackCooldown <= 0) {
            p.attackCooldown = 50;
            kafilaAudio.playLathiHit();
            triggerHaptic(120, 0.3, 0.6);

            // Knock back closest marcher
            for (const c of recruited) {
              if (Math.hypot(c.x - p.x, c.y - p.y) < 25) {
                c.stunTimer = 60;
                c.vx -= (dx / dist) * 6;
                c.vy -= (dy / dist) * 6;
                c.health -= 25;
                if (c.health <= 0) {
                  c.isRecruited = false;
                  c.color = "#ef4444";
                }
              }
            }
          }
        }
        if (p.attackCooldown > 0) p.attackCooldown--;
      } else if (p.type === "cannon_truck") {
        // Spray high pressure water stream towards crowd
        const dx = leader.x - p.x;
        const dy = leader.y - p.y;
        const dist = Math.hypot(dx, dy);

        if (dist < 320 && leader.y > p.y) {
          p.heading = Math.atan2(dy, dx);

          // Spawn stream of water particles
          for (let wp = 0; wp < 3; wp++) {
            const spread = (Math.random() - 0.5) * 0.35;
            const speed = 7.5 + Math.random() * 3.0;
            waterParticlesRef.current.push({
              x: p.x,
              y: p.y,
              vx: Math.cos(p.heading + spread) * speed,
              vy: Math.sin(p.heading + spread) * speed,
              life: 35,
              maxLife: 35,
              size: 4 + Math.random() * 4,
            });
          }
          kafilaAudio.playWaterCannonHiss();
        }
      }
    }

    // --- WATER PARTICLES PHYSICS ---
    for (let i = waterParticlesRef.current.length - 1; i >= 0; i--) {
      const wp = waterParticlesRef.current[i];
      wp.x += wp.vx;
      wp.y += wp.vy;
      wp.life--;

      // Push leader & crowd back
      const ldx = leader.x - wp.x;
      const ldy = leader.y - wp.y;
      if (Math.hypot(ldx, ldy) < 25) {
        leader.x += wp.vx * 0.4;
        leader.y += wp.vy * 0.4;
        shakeRef.current = 2;
      }

      for (const c of recruited) {
        const cdx = c.x - wp.x;
        const cdy = c.y - wp.y;
        if (Math.hypot(cdx, cdy) < 20) {
          c.x += wp.vx * 0.3;
          c.y += wp.vy * 0.3;
        }
      }

      if (wp.life <= 0) {
        waterParticlesRef.current.splice(i, 1);
      }
    }

    // --- CHANT PULSES ANIMATION ---
    for (let i = chantPulsesRef.current.length - 1; i >= 0; i--) {
      const cp = chantPulsesRef.current[i];
      cp.radius += (cp.maxRadius - cp.radius) * 0.12;
      cp.alpha -= 0.025;
      if (cp.alpha <= 0) {
        chantPulsesRef.current.splice(i, 1);
      }
    }

    // --- LANDMARK DHARNA HOLD ZONE ---
    const lm = landmarkRef.current;
    const distToLandmark = Math.hypot(leader.x - lm.x, leader.y - lm.y);

    if (distToLandmark < lm.radius) {
      lm.currentHoldProgress += dt;
      statsRef.current.score += Math.floor(dt * 100);

      if (lm.currentHoldProgress >= lm.holdTimeSeconds) {
        kafilaAudio.playVictoryFanfare();
        onGameOver(statsRef.current, true);
      }
    }

    onStatsUpdate({ ...statsRef.current });
  };

  // Render Game Scene
  const renderGame = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    const cam = cameraRef.current;

    // Apply Screen Shake
    const shakeX = (Math.random() - 0.5) * shakeRef.current;
    const shakeY = (Math.random() - 0.5) * shakeRef.current;

    ctx.save();
    ctx.clearRect(0, 0, w, h);

    // Camera Transformation
    ctx.translate(w / 2 + shakeX, h / 2 + shakeY);
    ctx.scale(cam.zoom, cam.zoom);
    ctx.translate(-cam.x, -cam.y);

    // 1. Street Asphalt & City Layout
    ctx.fillStyle = "#1e293b";
    ctx.fillRect(0, 0, 800, 2100);

    // City Ring Road borders
    ctx.strokeStyle = "#334155";
    ctx.lineWidth = 12;
    ctx.strokeRect(40, 40, 720, 2020);

    // Lane markings
    ctx.strokeStyle = "#facc15";
    ctx.lineWidth = 4;
    ctx.setLineDash([25, 25]);
    ctx.beginPath();
    ctx.moveTo(400, 100);
    ctx.lineTo(400, 2050);
    ctx.stroke();
    ctx.setLineDash([]);

    // Crosswalks / Intersections
    const intersections = [1500, 1150, 800, 480];
    ctx.fillStyle = "#475569";
    for (const iy of intersections) {
      ctx.fillRect(60, iy - 45, 680, 90);
      ctx.fillStyle = "#f8fafc";
      for (let stripe = 90; stripe < 710; stripe += 40) {
        ctx.fillRect(stripe, iy - 35, 20, 70);
      }
      ctx.fillStyle = "#475569";
    }

    // 2. Jantar Mantar Landmark Complex (Top Area)
    const lm = landmarkRef.current;
    ctx.beginPath();
    ctx.arc(lm.x, lm.y, lm.radius, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(249, 115, 22, 0.12)";
    ctx.fill();
    ctx.strokeStyle = "#f97316";
    ctx.lineWidth = 4;
    ctx.stroke();

    // Landmark Progress Fill
    if (lm.currentHoldProgress > 0) {
      const fillPct = lm.currentHoldProgress / lm.holdTimeSeconds;
      ctx.beginPath();
      ctx.moveTo(lm.x, lm.y);
      ctx.arc(lm.x, lm.y, lm.radius, -Math.PI / 2, -Math.PI / 2 + fillPct * Math.PI * 2);
      ctx.fillStyle = "rgba(249, 115, 22, 0.28)";
      ctx.fill();
    }

    // Historic Geometric Yantra Structures
    ctx.fillStyle = "#b91c1c"; // Red sandstone architecture
    ctx.fillRect(lm.x - 30, lm.y - 60, 60, 80);
    ctx.beginPath();
    ctx.arc(lm.x, lm.y + 40, 35, 0, Math.PI * 2);
    ctx.fill();

    // Landmark text label
    ctx.fillStyle = "#ffedd5";
    ctx.font = "bold 20px system-ui";
    ctx.textAlign = "center";
    ctx.fillText(lm.name.toUpperCase(), lm.x, lm.y - 85);
    ctx.font = "14px system-ui";
    ctx.fillStyle = "#cbd5e1";
    ctx.fillText(
      `Hold Dharna: ${Math.floor(lm.currentHoldProgress)}s / ${lm.holdTimeSeconds}s`,
      lm.x,
      lm.y - 110,
    );

    // 3. Render Barricades
    for (const b of barricadesRef.current) {
      if (b.broken) {
        ctx.fillStyle = "#64748b";
        ctx.fillRect(b.x - b.width / 2, b.y - 3, b.width, 6);
        continue;
      }

      // Yellow police barricade
      ctx.fillStyle = "#eab308";
      ctx.fillRect(b.x - b.width / 2, b.y - b.height / 2, b.width, b.height);
      ctx.strokeStyle = "#1e293b";
      ctx.lineWidth = 3;
      ctx.strokeRect(b.x - b.width / 2, b.y - b.height / 2, b.width, b.height);

      // Warning hazard stripes
      ctx.fillStyle = "#1e293b";
      ctx.font = "bold 11px system-ui";
      ctx.textAlign = "center";
      ctx.fillText("POLICE STOP", b.x, b.y + 4);

      // Health bar
      if (b.health < b.maxHealth) {
        ctx.fillStyle = "#ef4444";
        ctx.fillRect(b.x - 30, b.y - 18, 60, 4);
        ctx.fillStyle = "#22c55e";
        ctx.fillRect(b.x - 30, b.y - 18, (b.health / b.maxHealth) * 60, 4);
      }
    }

    // 4. Render Citizens / Crowd
    for (const c of citizensRef.current) {
      ctx.save();
      ctx.translate(c.x, c.y);

      // Body circle
      ctx.beginPath();
      ctx.arc(0, 0, c.radius, 0, Math.PI * 2);
      ctx.fillStyle = c.color;
      ctx.fill();
      ctx.strokeStyle = "#0f172a";
      ctx.lineWidth = 2;
      ctx.stroke();

      // Role specific decorations
      if (c.isRecruited) {
        if (c.role === "orator") {
          // Megaphone badge
          ctx.fillStyle = "#a855f7";
          ctx.beginPath();
          ctx.arc(0, -c.radius - 3, 4, 0, Math.PI * 2);
          ctx.fill();
        } else if (c.role === "drummer") {
          // Dholak badge
          ctx.fillStyle = "#eab308";
          ctx.fillRect(-5, -c.radius - 6, 10, 5);
        } else if (c.role === "banner") {
          // Flagpole
          ctx.strokeStyle = "#ffffff";
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(3, 0);
          ctx.lineTo(8, -14);
          ctx.stroke();
          ctx.fillStyle = "#16a34a";
          ctx.fillRect(8, -14, 10, 7);
        } else if (c.role === "medic") {
          // Red cross
          ctx.fillStyle = "#ffffff";
          ctx.beginPath();
          ctx.arc(0, 0, 5, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = "#ef4444";
          ctx.fillRect(-1, -4, 2, 8);
          ctx.fillRect(-4, -1, 8, 2);
        }
      }

      ctx.restore();
    }

    // 5. Render Player Movement Leader
    const leader = leaderRef.current;
    ctx.save();
    ctx.translate(leader.x, leader.y);

    // Aura circle
    ctx.beginPath();
    ctx.arc(0, 0, 22, 0, Math.PI * 2);
    ctx.fillStyle = isSurgingRef.current ? "rgba(234, 179, 8, 0.35)" : "rgba(249, 115, 22, 0.22)";
    ctx.fill();

    // Leader avatar
    ctx.beginPath();
    ctx.arc(0, 0, 14, 0, Math.PI * 2);
    ctx.fillStyle = "#ea580c";
    ctx.fill();
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 3;
    ctx.stroke();

    // Facing direction pointer
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(leader.heading) * 20, Math.sin(leader.heading) * 20);
    ctx.strokeStyle = "#facc15";
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.restore();

    // 6. Render Police Force
    for (const p of policeRef.current) {
      ctx.save();
      ctx.translate(p.x, p.y);

      if (p.type === "patrol") {
        // Cop circle
        ctx.beginPath();
        ctx.arc(0, 0, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = "#1e40af"; // Police navy
        ctx.fill();
        ctx.strokeStyle = "#f8fafc";
        ctx.lineWidth = 2;
        ctx.stroke();

        // Lathi stick
        if (p.hasLathi) {
          ctx.strokeStyle = "#92400e";
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(5, 0);
          ctx.lineTo(Math.cos(p.heading) * 18, Math.sin(p.heading) * 18);
          ctx.stroke();
        }
      } else if (p.type === "cannon_truck") {
        // Vajra Riot Vehicle Body
        ctx.fillStyle = "#1e3a8a";
        ctx.fillRect(-24, -36, 48, 72);
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 2;
        ctx.strokeRect(-24, -36, 48, 72);

        // Water Cannon Turret
        ctx.beginPath();
        ctx.arc(0, 0, 14, 0, Math.PI * 2);
        ctx.fillStyle = "#38bdf8";
        ctx.fill();

        // Turret Nozzle
        ctx.strokeStyle = "#0284c7";
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(p.heading) * 26, Math.sin(p.heading) * 26);
        ctx.stroke();
      }

      ctx.restore();
    }

    // 7. Render Water Jet Particles
    ctx.fillStyle = "rgba(56, 189, 248, 0.75)";
    for (const wp of waterParticlesRef.current) {
      ctx.beginPath();
      ctx.arc(wp.x, wp.y, wp.size, 0, Math.PI * 2);
      ctx.fill();
    }

    // 8. Render Chant Shockwaves & Slogans
    for (const cp of chantPulsesRef.current) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(cp.x, cp.y, cp.radius, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(249, 115, 22, ${cp.alpha})`;
      ctx.lineWidth = 6;
      ctx.stroke();

      if (cp.text) {
        ctx.font = "bold 26px system-ui";
        ctx.fillStyle = `rgba(255, 255, 255, ${cp.alpha})`;
        ctx.textAlign = "center";
        ctx.fillText(cp.text, cp.x, cp.y - cp.radius - 10);
      }
      ctx.restore();
    }

    ctx.restore(); // Restore Camera
  };

  return (
    <div className="relative w-full h-full overflow-hidden select-none bg-slate-950 flex items-center justify-center">
      <canvas
        ref={canvasRef}
        width={1000}
        height={700}
        className="w-full h-full object-contain cursor-crosshair"
      />
    </div>
  );
};
