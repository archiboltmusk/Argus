import React, { useEffect, useRef, useState, useCallback } from "react";
import { autoDriftAudio } from "./autodrift-audio";
import { Trophy, RotateCcw, Volume2, VolumeX } from "lucide-react";
import { playGamepadHaptics } from "@/views/games/haptics/gamepad-haptics";
import { earnArcadeCredits, getMetaState } from "../../arcade-meta-progression";

interface AutoDriftCanvasProps {
  onGameOver?: (score: number, distance: number) => void;
}

interface Obstacle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  type: "taxi" | "bus" | "scooter" | "cow" | "pothole" | "puddle";
  width: number;
  length: number;
  color: string;
}

interface Coin {
  x: number;
  y: number;
  radius: number;
  value: number;
  collected: boolean;
}

interface SkidMark {
  x: number;
  y: number;
  alpha: number;
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

export const AutoDriftCanvas: React.FC<AutoDriftCanvasProps> = ({ onGameOver }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [score, setScore] = useState(0);
  const [multiplier, setMultiplier] = useState(1);
  const [distance, setDistance] = useState(0);
  const [fuel, setFuel] = useState(100);
  const [health, setHealth] = useState(3);
  const [isGameOver, setIsGameOver] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  // Auto state ref
  const gameStateRef = useRef({
    // Player Rickshaw
    x: 400,
    y: 500,
    vx: 0,
    vy: 0,
    angle: -Math.PI / 2, // Facing up
    speed: 0,
    maxSpeed: 8.5,
    accel: 0.22,
    brake: 0.35,
    friction: 0.965,
    driftFactor: 0.92,
    steering: 0,
    isDrifting: false,
    driftScoreTimer: 0,

    // Road scroll
    roadOffset: 0,
    roadWidth: 520,

    // Traffic & Hazards
    obstacles: [] as Obstacle[],
    coins: [] as Coin[],
    skidMarks: [] as SkidMark[],
    particles: [] as Particle[],

    // Input state
    keys: {
      left: false,
      right: false,
      up: false,
      down: false,
      drift: false,
      horn: false,
    },

    // Stats
    score: 0,
    multiplier: 1,
    multiplierTimer: 0,
    distance: 0,
    fuel: 100,
    health: 3,
    isGameOver: false,
    isPaused: false,
    screenShake: 0,
  });

  const toggleMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    autoDriftAudio.setMuted(next);
  };

  const restartGame = useCallback(() => {
    const meta = getMetaState();
    const extraHealth = meta.upgrades.kinetic_shield || 0;
    const extraSpeed = (meta.upgrades.overdrive_nitro || 0) * 0.9;

    const state = gameStateRef.current;
    state.x = 400;
    state.y = 500;
    state.vx = 0;
    state.vy = 0;
    state.angle = -Math.PI / 2;
    state.speed = 0;
    state.maxSpeed = 8.5 + extraSpeed;
    state.obstacles = [];
    state.coins = [];
    state.skidMarks = [];
    state.particles = [];
    state.score = 0;
    state.multiplier = 1;
    state.distance = 0;
    state.fuel = 100;
    state.health = 3 + extraHealth;
    state.isGameOver = false;
    state.isPaused = false;
    state.screenShake = 0;

    setScore(0);
    setMultiplier(1);
    setDistance(0);
    setFuel(100);
    setHealth(3 + extraHealth);
    setIsGameOver(false);
    setIsPaused(false);
    autoDriftAudio.startEngine();
  }, []);

  // Keyboard handlers
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const keys = gameStateRef.current.keys;
      if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") keys.left = true;
      if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") keys.right = true;
      if (e.key === "ArrowUp" || e.key === "w" || e.key === "W") keys.up = true;
      if (e.key === "ArrowDown" || e.key === "s" || e.key === "S") keys.down = true;
      if (e.key === " " || e.key === "Shift") keys.drift = true;
      if (e.key === "h" || e.key === "H" || e.key === "Enter") {
        if (!keys.horn) {
          autoDriftAudio.playHorn();
        }
        keys.horn = true;
      }
      if (e.key === "p" || e.key === "P" || e.key === "Escape") {
        setIsPaused((p) => {
          gameStateRef.current.isPaused = !p;
          return !p;
        });
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const keys = gameStateRef.current.keys;
      if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") keys.left = false;
      if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") keys.right = false;
      if (e.key === "ArrowUp" || e.key === "w" || e.key === "W") keys.up = false;
      if (e.key === "ArrowDown" || e.key === "s" || e.key === "S") keys.down = false;
      if (e.key === " " || e.key === "Shift") keys.drift = false;
      if (e.key === "h" || e.key === "H" || e.key === "Enter") keys.horn = false;
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  // Game loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    autoDriftAudio.startEngine();
    let animId: number;
    let lastTime = performance.now();
    let obstacleTimer = 0;
    let coinTimer = 0;

    const spawnObstacle = () => {
      const state = gameStateRef.current;
      const roadLeft = (canvas.width - state.roadWidth) / 2 + 30;
      const roadRight = roadLeft + state.roadWidth - 60;
      const x = roadLeft + Math.random() * (roadRight - roadLeft);

      const types: Array<Obstacle["type"]> = ["taxi", "bus", "scooter", "cow", "pothole", "puddle"];
      const weights = [0.25, 0.2, 0.2, 0.1, 0.15, 0.1];
      const r = Math.random();
      let acc = 0;
      let chosenType: Obstacle["type"] = "taxi";
      for (let i = 0; i < types.length; i++) {
        acc += weights[i];
        if (r <= acc) {
          chosenType = types[i];
          break;
        }
      }

      let width = 36;
      let length = 60;
      let vy = 2.5 + Math.random() * 1.5;
      let color = "#eab308";

      if (chosenType === "taxi") {
        width = 38;
        length = 64;
        color = "#eab308";
        vy = 3.2;
      } else if (chosenType === "bus") {
        width = 46;
        length = 92;
        color = "#16a34a"; // Green DTC bus
        vy = 2.2;
      } else if (chosenType === "scooter") {
        width = 24;
        length = 42;
        color = "#3b82f6";
        vy = 3.8;
      } else if (chosenType === "cow") {
        width = 34;
        length = 44;
        color = "#f5f5f4";
        vy = 0.5; // slow wandering
      } else if (chosenType === "pothole") {
        width = 32;
        length = 32;
        color = "#1c1917";
        vy = 0; // static relative to road
      } else if (chosenType === "puddle") {
        width = 45;
        length = 40;
        color = "#0284c7";
        vy = 0;
      }

      state.obstacles.push({
        x,
        y: -length - 20,
        vx: 0,
        vy,
        type: chosenType,
        width,
        length,
        color,
      });
    };

    const spawnCoin = () => {
      const state = gameStateRef.current;
      const roadLeft = (canvas.width - state.roadWidth) / 2 + 40;
      const roadRight = roadLeft + state.roadWidth - 80;
      const x = roadLeft + Math.random() * (roadRight - roadLeft);
      state.coins.push({
        x,
        y: -30,
        radius: 12,
        value: 10,
        collected: false,
      });
    };

    const loop = (currentTime: number) => {
      const dt = Math.min((currentTime - lastTime) / 1000, 0.1);
      lastTime = currentTime;
      const state = gameStateRef.current;

      if (!state.isGameOver && !state.isPaused) {
        // Poll Gamepad
        const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
        let padSteer = 0;
        let padGas = 0;
        let padDrift = false;
        let padHorn = false;

        for (const pad of gamepads) {
          if (!pad) continue;
          if (Math.abs(pad.axes[0]) > 0.12) {
            padSteer = pad.axes[0];
          }
          if (pad.buttons[7] && pad.buttons[7].value > 0.1) {
            padGas = pad.buttons[7].value;
          }
          if ((pad.buttons[6] && pad.buttons[6].value > 0.2) || (pad.buttons[1] && pad.buttons[1].pressed)) {
            padDrift = true;
          }
          if (pad.buttons[0] && pad.buttons[0].pressed) {
            padHorn = true;
          }
        }

        // Steer inputs
        if (state.keys.left) padSteer = -1;
        if (state.keys.right) padSteer = 1;

        // Gas inputs
        let throttle = state.keys.up ? 1 : padGas;
        let braking = state.keys.down;
        let drifting = state.keys.drift || padDrift;

        if (padHorn && !state.keys.horn) {
          autoDriftAudio.playHorn();
        }

        // Acceleration & speed
        if (throttle > 0) {
          state.speed += state.accel * throttle;
          if (state.speed > state.maxSpeed) state.speed = state.maxSpeed;
        } else if (braking) {
          state.speed -= state.brake;
          if (state.speed < 0) state.speed = 0;
        } else {
          state.speed *= state.friction;
        }

        // Turning & Drift mechanics
        const turnSpeed = 0.052 * (state.speed / state.maxSpeed);
        state.angle += padSteer * turnSpeed;

        // Drift state
        const isTurningSharp = Math.abs(padSteer) > 0.4 && state.speed > 3;
        state.isDrifting = (drifting && state.speed > 2.5) || (isTurningSharp && drifting);

        if (state.isDrifting) {
          state.driftFactor = 0.98; // keep momentum sideways
          autoDriftAudio.playDriftSqueal();

          // Spawn smoke particles
          state.particles.push({
            x: state.x - Math.cos(state.angle) * 18 + (Math.random() - 0.5) * 8,
            y: state.y - Math.sin(state.angle) * 18 + (Math.random() - 0.5) * 8,
            vx: (Math.random() - 0.5) * 2,
            vy: (Math.random() - 0.5) * 2 + 1,
            life: 0.35,
            maxLife: 0.35,
            color: "rgba(220, 220, 220, 0.4)",
            size: 6 + Math.random() * 6,
          });

          // Add skid marks
          state.skidMarks.push({
            x: state.x,
            y: state.y,
            alpha: 0.6,
          });

          // Drift score accumulation
          state.driftScoreTimer += dt;
          if (state.driftScoreTimer > 0.15) {
            state.score += Math.floor(15 * state.multiplier);
            state.multiplier = Math.min(5, Number((state.multiplier + 0.08).toFixed(2)));
            state.driftScoreTimer = 0;
            autoDriftAudio.playDriftScore();
          }
        } else {
          state.driftFactor = 0.88;
        }

        // Velocity vector combining heading and inertia
        const forwardVx = Math.cos(state.angle) * state.speed;
        const forwardVy = Math.sin(state.angle) * state.speed;
        state.vx = state.vx * state.driftFactor + forwardVx * (1 - state.driftFactor);
        state.vy = state.vy * state.driftFactor + forwardVy * (1 - state.driftFactor);

        // Move player horizontally; vertical is locked to road flow
        state.x += state.vx * 1.5;
        // Keep within road bounds
        const roadMinX = (canvas.width - state.roadWidth) / 2 + 25;
        const roadMaxX = roadMinX + state.roadWidth - 50;

        if (state.x < roadMinX) {
          state.x = roadMinX;
          state.vx = 0;
          state.speed *= 0.8;
          autoDriftAudio.playCrash();
        } else if (state.x > roadMaxX) {
          state.x = roadMaxX;
          state.vx = 0;
          state.speed *= 0.8;
          autoDriftAudio.playCrash();
        }

        // Distance & Road offset
        const scrollStep = state.speed * 1.6;
        state.roadOffset = (state.roadOffset + scrollStep) % 60;
        state.distance += Number((scrollStep * 0.05).toFixed(1));

        // Fuel consumption
        state.fuel -= dt * 1.2;
        if (state.fuel <= 0) {
          state.fuel = 0;
          state.isGameOver = true;
          setIsGameOver(true);
          onGameOver?.(state.score, Math.floor(state.distance));
        }

        // Audio pitch update
        autoDriftAudio.updateEnginePitch(state.speed / state.maxSpeed);

        // Spawning
        obstacleTimer += dt;
        if (obstacleTimer > Math.max(0.65, 1.8 - state.distance * 0.001)) {
          spawnObstacle();
          obstacleTimer = 0;
        }

        coinTimer += dt;
        if (coinTimer > 1.2) {
          spawnCoin();
          coinTimer = 0;
        }

        // Update obstacles
        for (let i = state.obstacles.length - 1; i >= 0; i--) {
          const obs = state.obstacles[i];
          obs.y += scrollStep - obs.vy; // scroll relative to player speed

          // Horn scatters cows or scooters!
          if (padHorn || state.keys.horn) {
            if (obs.type === "cow" || obs.type === "scooter") {
              const dx = obs.x - state.x;
              if (Math.abs(dx) < 140 && obs.y < state.y && obs.y > state.y - 250) {
                obs.x += dx > 0 ? 3.5 : -3.5;
              }
            }
          }

          // Collision detection
          const rickshawRadius = 20;
          const hitX = Math.abs(obs.x - state.x) < obs.width / 2 + rickshawRadius - 5;
          const hitY = Math.abs(obs.y - state.y) < obs.length / 2 + rickshawRadius - 5;

          if (hitX && hitY) {
            if (obs.type === "puddle") {
              // Spin out
              state.angle += (Math.random() - 0.5) * 1.2;
              state.speed *= 0.7;
              autoDriftAudio.playDriftSqueal();
              playGamepadHaptics("drift");
            } else if (obs.type === "pothole") {
              state.speed *= 0.5;
              state.screenShake = 12;
              autoDriftAudio.playCrash();
              playGamepadHaptics("medium");
              state.obstacles.splice(i, 1);
              continue;
            } else {
              // Vehicle / Cow Crash
              state.health -= 1;
              state.screenShake = 20;
              state.speed = 1;
              state.multiplier = 1;
              autoDriftAudio.playCrash();
              playGamepadHaptics("heavy");
              state.obstacles.splice(i, 1);

              if (state.health <= 0) {
                state.isGameOver = true;
                setIsGameOver(true);
                earnArcadeCredits(Math.round(state.score / 8));
                onGameOver?.(state.score, Math.floor(state.distance));
              }
              continue;
            }
          }

          // Cull off-screen
          if (obs.y > canvas.height + 100 || obs.y < -200) {
            state.obstacles.splice(i, 1);
          }
        }

        // Update Coins
        for (let i = state.coins.length - 1; i >= 0; i--) {
          const coin = state.coins[i];
          coin.y += scrollStep;

          const dist = Math.hypot(coin.x - state.x, coin.y - state.y);
          if (dist < 32 && !coin.collected) {
            coin.collected = true;
            state.score += Math.floor(coin.value * state.multiplier);
            state.fuel = Math.min(100, state.fuel + 6); // Fare refuels
            autoDriftAudio.playCoin();
            state.coins.splice(i, 1);
            continue;
          }

          if (coin.y > canvas.height + 50) {
            state.coins.splice(i, 1);
          }
        }

        // Update Skid marks
        for (let i = state.skidMarks.length - 1; i >= 0; i--) {
          state.skidMarks[i].y += scrollStep;
          state.skidMarks[i].alpha -= dt * 0.4;
          if (state.skidMarks[i].alpha <= 0 || state.skidMarks[i].y > canvas.height + 50) {
            state.skidMarks.splice(i, 1);
          }
        }

        // Update particles
        for (let i = state.particles.length - 1; i >= 0; i--) {
          const p = state.particles[i];
          p.x += p.vx;
          p.y += p.vy + scrollStep * 0.5;
          p.life -= dt;
          if (p.life <= 0) {
            state.particles.splice(i, 1);
          }
        }

        // Decay screen shake
        if (state.screenShake > 0) {
          state.screenShake = Math.max(0, state.screenShake - dt * 35);
        }

        // Sync react states
        setScore(state.score);
        setMultiplier(state.multiplier);
        setDistance(Math.floor(state.distance));
        setFuel(Math.floor(state.fuel));
        setHealth(state.health);
      }

      // ================= RENDER =================
      ctx.save();
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (state.screenShake > 0) {
        ctx.translate(
          (Math.random() - 0.5) * state.screenShake,
          (Math.random() - 0.5) * state.screenShake
        );
      }

      // 1. Draw Asphalt Road
      const roadLeft = (canvas.width - state.roadWidth) / 2;
      ctx.fillStyle = "#1e293b"; // Dark asphalt
      ctx.fillRect(roadLeft, 0, state.roadWidth, canvas.height);

      // Road Borders (Yellow/White curbs)
      ctx.fillStyle = "#ca8a04";
      ctx.fillRect(roadLeft - 10, 0, 10, canvas.height);
      ctx.fillRect(roadLeft + state.roadWidth, 0, 10, canvas.height);

      // Lane dividers (Dashed white lines)
      ctx.strokeStyle = "rgba(255, 255, 255, 0.4)";
      ctx.lineWidth = 4;
      ctx.setLineDash([25, 20]);
      ctx.lineDashOffset = -state.roadOffset;

      const laneWidth = state.roadWidth / 3;
      for (let l = 1; l < 3; l++) {
        ctx.beginPath();
        ctx.moveTo(roadLeft + l * laneWidth, 0);
        ctx.lineTo(roadLeft + l * laneWidth, canvas.height);
        ctx.stroke();
      }
      ctx.setLineDash([]);

      // 2. Draw Skid Marks
      for (const skid of state.skidMarks) {
        ctx.fillStyle = `rgba(15, 23, 42, ${skid.alpha})`;
        ctx.fillRect(skid.x - 12, skid.y - 4, 6, 8);
        ctx.fillRect(skid.x + 6, skid.y - 4, 6, 8);
      }

      // 3. Draw Obstacles
      for (const obs of state.obstacles) {
        ctx.save();
        ctx.translate(obs.x, obs.y);

        if (obs.type === "puddle") {
          ctx.fillStyle = "rgba(14, 165, 233, 0.5)";
          ctx.beginPath();
          ctx.ellipse(0, 0, obs.width / 2, obs.length / 2, 0, 0, Math.PI * 2);
          ctx.fill();
        } else if (obs.type === "pothole") {
          ctx.fillStyle = "#0c0a09";
          ctx.beginPath();
          ctx.ellipse(0, 0, obs.width / 2, obs.length / 2, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = "#44403c";
          ctx.lineWidth = 3;
          ctx.stroke();
        } else if (obs.type === "cow") {
          // White sacred cow with brown spots
          ctx.fillStyle = "#f5f5f4";
          ctx.fillRect(-obs.width / 2, -obs.length / 2, obs.width, obs.length);
          ctx.fillStyle = "#78350f";
          ctx.beginPath();
          ctx.arc(-4, -6, 8, 0, Math.PI * 2);
          ctx.arc(6, 8, 6, 0, Math.PI * 2);
          ctx.fill();
          // Horns
          ctx.strokeStyle = "#a8a29e";
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(-10, -obs.length / 2);
          ctx.lineTo(-14, -obs.length / 2 - 6);
          ctx.moveTo(10, -obs.length / 2);
          ctx.lineTo(14, -obs.length / 2 - 6);
          ctx.stroke();
        } else {
          // Motorized Vehicles (Taxi / Bus / Scooter)
          ctx.fillStyle = obs.color;
          ctx.beginPath();
          ctx.roundRect(-obs.width / 2, -obs.length / 2, obs.width, obs.length, 6);
          ctx.fill();

          // Windshield
          ctx.fillStyle = "#0284c7";
          ctx.fillRect(-obs.width / 2 + 4, -obs.length / 2 + 6, obs.width - 8, 10);

          // Headlights
          ctx.fillStyle = "#fef08a";
          ctx.fillRect(-obs.width / 2 + 3, -obs.length / 2 - 2, 6, 3);
          ctx.fillRect(obs.width / 2 - 9, -obs.length / 2 - 2, 6, 3);
        }
        ctx.restore();
      }

      // 4. Draw Coins (Fare tokens)
      for (const coin of state.coins) {
        ctx.save();
        ctx.translate(coin.x, coin.y);
        ctx.fillStyle = "#fbbf24";
        ctx.beginPath();
        ctx.arc(0, 0, coin.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#b45309";
        ctx.lineWidth = 2;
        ctx.stroke();
        // ₹ glyph
        ctx.fillStyle = "#78350f";
        ctx.font = "bold 13px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("₹", 0, 1);
        ctx.restore();
      }

      // 5. Draw Smoke Particles
      for (const p of state.particles) {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * (p.life / p.maxLife), 0, Math.PI * 2);
        ctx.fill();
      }

      // 6. Draw Player Auto-Rickshaw
      ctx.save();
      ctx.translate(state.x, state.y);
      ctx.rotate(state.angle + Math.PI / 2); // Rickshaw faces upward in local frame

      // Shadow
      ctx.fillStyle = "rgba(0,0,0,0.3)";
      ctx.beginPath();
      ctx.roundRect(-16, -26, 36, 56, 8);
      ctx.fill();

      // Yellow Cab Top
      ctx.fillStyle = "#eab308"; // Iconic auto yellow
      ctx.beginPath();
      ctx.roundRect(-17, -25, 34, 50, [14, 14, 6, 6]);
      ctx.fill();

      // Green Lower Body (CNG Delhi style)
      ctx.fillStyle = "#15803d";
      ctx.beginPath();
      ctx.roundRect(-17, 2, 34, 25, [0, 0, 6, 6]);
      ctx.fill();

      // Windshield & Front Wheel Stem
      ctx.fillStyle = "#0284c7";
      ctx.fillRect(-12, -20, 24, 8);

      // Single Front Wheel
      ctx.fillStyle = "#0f172a";
      ctx.fillRect(-4, -30, 8, 10);

      // Rear Wheels
      ctx.fillRect(-19, 10, 4, 14);
      ctx.fillRect(15, 10, 4, 14);

      // Headlight Beam
      ctx.fillStyle = "rgba(254, 240, 138, 0.25)";
      ctx.beginPath();
      ctx.moveTo(-6, -28);
      ctx.lineTo(-40, -140);
      ctx.lineTo(40, -140);
      ctx.lineTo(6, -28);
      ctx.closePath();
      ctx.fill();

      ctx.restore();
      ctx.restore();

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(animId);
      autoDriftAudio.stopEngine();
    };
  }, [onGameOver]);

  return (
    <div className="relative w-full h-[640px] bg-stone-950 flex flex-col items-center justify-center select-none overflow-hidden rounded-xl border border-stone-800 shadow-2xl">
      <canvas
        ref={canvasRef}
        width={800}
        height={640}
        className="w-full h-full max-w-[800px] aspect-[5/4] bg-stone-900 rounded-lg cursor-crosshair"
      />

      {/* Floating HUD Header */}
      <div className="absolute top-4 left-6 right-6 flex items-center justify-between pointer-events-none">
        {/* Distance & Score */}
        <div className="flex items-center gap-3 bg-stone-900/85 backdrop-blur-md px-4 py-2 rounded-xl border border-stone-700/60 shadow-lg">
          <div>
            <div className="text-[10px] uppercase font-bold tracking-wider text-amber-400/80">Fare Meter</div>
            <div className="text-xl font-black text-amber-300 font-mono">₹{score}</div>
          </div>
          <div className="h-6 w-px bg-stone-700" />
          <div>
            <div className="text-[10px] uppercase font-bold tracking-wider text-stone-400">Distance</div>
            <div className="text-xl font-black text-stone-100 font-mono">{distance}m</div>
          </div>
          {multiplier > 1 && (
            <div className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-xs font-black animate-pulse">
              {multiplier}x DRIFT
            </div>
          )}
        </div>

        {/* Health & Fuel */}
        <div className="flex items-center gap-3 bg-stone-900/85 backdrop-blur-md px-4 py-2 rounded-xl border border-stone-700/60 shadow-lg pointer-events-auto">
          {/* Hearts */}
          <div className="flex items-center gap-1">
            {[1, 2, 3].map((h) => (
              <div
                key={h}
                className={`w-3.5 h-3.5 rounded-full ${
                  h <= health ? "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]" : "bg-stone-700"
                }`}
              />
            ))}
          </div>

          <div className="h-6 w-px bg-stone-700" />

          {/* CNG Fuel Bar */}
          <div className="flex flex-col">
            <div className="text-[10px] font-bold text-stone-400 uppercase">CNG Gas</div>
            <div className="w-20 h-2.5 bg-stone-800 rounded-full overflow-hidden border border-stone-700">
              <div
                className={`h-full transition-all duration-200 ${
                  fuel > 30 ? "bg-emerald-500" : "bg-red-500 animate-pulse"
                }`}
                style={{ width: `${fuel}%` }}
              />
            </div>
          </div>

          <button
            onClick={toggleMute}
            className="p-1.5 ml-2 hover:bg-stone-800 rounded-lg text-stone-400 hover:text-stone-200 transition-colors"
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Game Over Modal */}
      {isGameOver && (
        <div className="absolute inset-0 bg-black/85 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-300">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 mb-4 shadow-xl">
            <Trophy className="w-8 h-8" />
          </div>
          <h2 className="text-3xl font-black text-stone-100 uppercase tracking-wider mb-1">Trip Terminated!</h2>
          <p className="text-stone-400 text-sm max-w-sm mb-6">
            Peak hour traffic got the best of your rickshaw meter. Total earnings collected:
          </p>

          <div className="grid grid-cols-2 gap-4 w-full max-w-xs mb-8">
            <div className="bg-stone-900/90 border border-stone-800 p-3 rounded-xl">
              <div className="text-xs text-stone-400">Total Fare</div>
              <div className="text-2xl font-black text-amber-400 font-mono">₹{score}</div>
            </div>
            <div className="bg-stone-900/90 border border-stone-800 p-3 rounded-xl">
              <div className="text-xs text-stone-400">Distance</div>
              <div className="text-2xl font-black text-emerald-400 font-mono">{distance}m</div>
            </div>
          </div>

          <button
            onClick={restartGame}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 text-stone-950 font-black tracking-wider uppercase shadow-lg shadow-amber-500/25 hover:brightness-110 active:scale-95 transition-all"
          >
            <RotateCcw className="w-5 h-5" />
            Ride Again (Press A)
          </button>
        </div>
      )}

      {/* Paused Overlay */}
      {isPaused && !isGameOver && (
        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm flex flex-col items-center justify-center">
          <h3 className="text-2xl font-bold text-stone-200 tracking-wider mb-3">PAUSED</h3>
          <p className="text-stone-400 text-xs">Press Escape or P to Resume</p>
        </div>
      )}
    </div>
  );
};
