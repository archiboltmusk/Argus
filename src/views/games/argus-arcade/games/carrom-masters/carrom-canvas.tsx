import React, { useEffect, useRef, useState, useCallback } from "react";
import { carromAudio } from "./carrom-audio";
import { Trophy, RotateCcw, Volume2, VolumeX } from "lucide-react";
import { playGamepadHaptics } from "@/views/games/haptics/gamepad-haptics";
import { earnArcadeCredits } from "../../arcade-meta-progression";

interface CarromCanvasProps {
  onGameOver?: (playerScore: number, opponentScore: number) => void;
}

interface Piece {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  mass: number;
  type: "striker" | "white" | "black" | "queen";
  color: string;
  isPocketed: boolean;
  value: number;
}

export const CarromCanvas: React.FC<CarromCanvasProps> = ({ onGameOver }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [p1Score, setP1Score] = useState(0);
  const [aiScore, setAiScore] = useState(0);
  const [currentTurn, setCurrentTurn] = useState<"player" | "ai">("player");
  const [chargePower, setChargePower] = useState(0);
  const [isGameOver, setIsGameOver] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  // Board Geometry Constants
  const BOARD_CENTER_X = 400;
  const BOARD_CENTER_Y = 320;
  const BOARD_HALF = 260; // 520x520 play area
  const MIN_X = BOARD_CENTER_X - BOARD_HALF + 16;
  const MAX_X = BOARD_CENTER_X + BOARD_HALF - 16;
  const MIN_Y = BOARD_CENTER_Y - BOARD_HALF + 16;
  const MAX_Y = BOARD_CENTER_Y + BOARD_HALF - 16;

  const POCKET_RADIUS = 24;
  const POCKETS = [
    { x: MIN_X + 16, y: MIN_Y + 16 },
    { x: MAX_X - 16, y: MIN_Y + 16 },
    { x: MIN_X + 16, y: MAX_Y - 16 },
    { x: MAX_X - 16, y: MAX_Y - 16 },
  ];

  const stateRef = useRef({
    strikerX: BOARD_CENTER_X,
    strikerBaselineY: BOARD_CENTER_Y + 175,
    aimAngle: -Math.PI / 2, // Aim straight up
    chargePower: 0,
    isCharging: false,
    isMoving: false,
    turn: "player" as "player" | "ai",

    pieces: [] as Piece[],
    p1Score: 0,
    aiScore: 0,
    queenPocketedBy: null as "player" | "ai" | null,
    isGameOver: false,
  });

  const toggleMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    carromAudio.setMuted(next);
  };

  const setupBoard = useCallback(() => {
    const pieces: Piece[] = [];
    let id = 1;

    // Red Queen in center
    pieces.push({
      id: id++,
      x: BOARD_CENTER_X,
      y: BOARD_CENTER_Y,
      vx: 0,
      vy: 0,
      radius: 13,
      mass: 1.0,
      type: "queen",
      color: "#ef4444",
      isPocketed: false,
      value: 25,
    });

    // Inner ring: 6 pieces alternating white & black
    const innerRadius = 27;
    for (let i = 0; i < 6; i++) {
      const angle = (i * Math.PI) / 3;
      const isWhite = i % 2 === 0;
      pieces.push({
        id: id++,
        x: BOARD_CENTER_X + Math.cos(angle) * innerRadius,
        y: BOARD_CENTER_Y + Math.sin(angle) * innerRadius,
        vx: 0,
        vy: 0,
        radius: 13,
        mass: 1.0,
        type: isWhite ? "white" : "black",
        color: isWhite ? "#fef08a" : "#1c1917",
        isPocketed: false,
        value: isWhite ? 10 : 5,
      });
    }

    // Outer ring: 12 pieces alternating
    const outerRadius = 54;
    for (let i = 0; i < 12; i++) {
      const angle = (i * Math.PI) / 6 + 0.2;
      const isWhite = i % 2 === 1;
      pieces.push({
        id: id++,
        x: BOARD_CENTER_X + Math.cos(angle) * outerRadius,
        y: BOARD_CENTER_Y + Math.sin(angle) * outerRadius,
        vx: 0,
        vy: 0,
        radius: 13,
        mass: 1.0,
        type: isWhite ? "white" : "black",
        color: isWhite ? "#fef08a" : "#1c1917",
        isPocketed: false,
        value: isWhite ? 10 : 5,
      });
    }

    // Striker
    pieces.push({
      id: 999,
      x: BOARD_CENTER_X,
      y: BOARD_CENTER_Y + 175,
      vx: 0,
      vy: 0,
      radius: 18,
      mass: 3.2,
      type: "striker",
      color: "#f8fafc",
      isPocketed: false,
      value: 0,
    });

    const s = stateRef.current;
    s.pieces = pieces;
    s.strikerX = BOARD_CENTER_X;
    s.strikerBaselineY = BOARD_CENTER_Y + 175;
    s.aimAngle = -Math.PI / 2;
    s.chargePower = 0;
    s.isCharging = false;
    s.isMoving = false;
    s.turn = "player";
    s.p1Score = 0;
    s.aiScore = 0;
    s.queenPocketedBy = null;
    s.isGameOver = false;

    setP1Score(0);
    setAiScore(0);
    setCurrentTurn("player");
    setChargePower(0);
    setIsGameOver(false);
  }, [BOARD_CENTER_X, BOARD_CENTER_Y]);

  useEffect(() => {
    setupBoard();
  }, [setupBoard]);

  // Execute strike
  const executeStrike = useCallback((power: number, angle: number) => {
    const s = stateRef.current;
    const striker = s.pieces.find((p) => p.type === "striker");
    if (!striker) return;

    striker.vx = Math.cos(angle) * (power * 24);
    striker.vy = Math.sin(angle) * (power * 24);
    s.isMoving = true;
    carromAudio.playClack(power);
    playGamepadHaptics(power > 0.6 ? "heavy" : "medium");
  }, []);

  // Controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const s = stateRef.current;
      if (s.isMoving || s.turn !== "player") return;

      if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") {
        s.strikerX = Math.max(BOARD_CENTER_X - 160, s.strikerX - 10);
        const striker = s.pieces.find((p) => p.type === "striker");
        if (striker) striker.x = s.strikerX;
      } else if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") {
        s.strikerX = Math.min(BOARD_CENTER_X + 160, s.strikerX + 10);
        const striker = s.pieces.find((p) => p.type === "striker");
        if (striker) striker.x = s.strikerX;
      } else if (e.key === " " || e.key === "Enter") {
        s.isCharging = true;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const s = stateRef.current;
      if (s.isMoving || s.turn !== "player") return;

      if (e.key === " " || e.key === "Enter") {
        if (s.isCharging) {
          s.isCharging = false;
          executeStrike(Math.max(0.2, s.chargePower), s.aimAngle);
          s.chargePower = 0;
          setChargePower(0);
        }
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      const canvas = canvasRef.current;
      const s = stateRef.current;
      if (!canvas || s.isMoving || s.turn !== "player") return;
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const mouseX = (e.clientX - rect.left) * scaleX;
      const mouseY = (e.clientY - rect.top) * scaleY;

      s.aimAngle = Math.atan2(mouseY - s.strikerBaselineY, mouseX - s.strikerX);
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("mousemove", handleMouseMove);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, [BOARD_CENTER_X, executeStrike]);

  // AI Turn Logic
  const triggerAiTurn = useCallback(() => {
    const s = stateRef.current;
    const striker = s.pieces.find((p) => p.type === "striker");
    if (!striker) return;

    // AI positions baseline at top
    s.strikerBaselineY = BOARD_CENTER_Y - 175;
    s.strikerX = BOARD_CENTER_X + (Math.random() - 0.5) * 140;
    striker.x = s.strikerX;
    striker.y = s.strikerBaselineY;

    // AI selects a target coin (black or queen preferred)
    const targets = s.pieces.filter((p) => !p.isPocketed && p.type !== "striker");
    if (targets.length === 0) return;

    const chosen = targets[Math.floor(Math.random() * targets.length)];
    // Add slight aim jitter
    const aim = Math.atan2(chosen.y - striker.y, chosen.x - striker.x) + (Math.random() - 0.5) * 0.12;
    const power = 0.65 + Math.random() * 0.3;

    setTimeout(() => {
      executeStrike(power, aim);
    }, 800);
  }, [BOARD_CENTER_X, BOARD_CENTER_Y, executeStrike]);

  // Physics loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let lastTime = performance.now();
    let prevPadBtnA = false;

    const loop = (now: number) => {
      const dt = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;
      const s = stateRef.current;

      // Gamepad analog input
      if (!s.isMoving && s.turn === "player") {
        const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
        for (const pad of gamepads) {
          if (!pad) continue;
          // Left stick x moves striker
          if (Math.abs(pad.axes[0]) > 0.15) {
            s.strikerX = Math.max(
              BOARD_CENTER_X - 160,
              Math.min(BOARD_CENTER_X + 160, s.strikerX + pad.axes[0] * 3.5)
            );
            const striker = s.pieces.find((p) => p.type === "striker");
            if (striker) striker.x = s.strikerX;
          }

          // Right stick aims
          if (Math.hypot(pad.axes[2], pad.axes[3]) > 0.3) {
            s.aimAngle = Math.atan2(pad.axes[3], pad.axes[2]);
          }

          // A button charge & release
          const btnA = pad.buttons[0]?.pressed || false;
          if (btnA && !prevPadBtnA) {
            s.isCharging = true;
          } else if (!btnA && prevPadBtnA && s.isCharging) {
            s.isCharging = false;
            executeStrike(Math.max(0.2, s.chargePower), s.aimAngle);
            s.chargePower = 0;
            setChargePower(0);
          }
          prevPadBtnA = btnA;
        }
      }

      // Charge power buildup
      if (s.isCharging) {
        s.chargePower = Math.min(1.0, s.chargePower + dt * 1.5);
        setChargePower(s.chargePower);
      }

      // Physics Simulation
      if (s.isMoving) {
        let totalSpeed = 0;

        // 1. Move & Cushion bounce
        for (const p of s.pieces) {
          if (p.isPocketed) continue;
          p.x += p.vx;
          p.y += p.vy;

          // Friction damping
          p.vx *= 0.982;
          p.vy *= 0.982;

          // Board Cushion Bounds
          if (p.x - p.radius < MIN_X) {
            p.x = MIN_X + p.radius;
            p.vx = -p.vx * 0.75;
            carromAudio.playCushion(Math.hypot(p.vx, p.vy));
          } else if (p.x + p.radius > MAX_X) {
            p.x = MAX_X - p.radius;
            p.vx = -p.vx * 0.75;
            carromAudio.playCushion(Math.hypot(p.vx, p.vy));
          }

          if (p.y - p.radius < MIN_Y) {
            p.y = MIN_Y + p.radius;
            p.vy = -p.vy * 0.75;
            carromAudio.playCushion(Math.hypot(p.vx, p.vy));
          } else if (p.y + p.radius > MAX_Y) {
            p.y = MAX_Y - p.radius;
            p.vy = -p.vy * 0.75;
            carromAudio.playCushion(Math.hypot(p.vx, p.vy));
          }

          // Pocket check
          for (const pocket of POCKETS) {
            const dist = Math.hypot(p.x - pocket.x, p.y - pocket.y);
            if (dist < POCKET_RADIUS - 2) {
              p.isPocketed = true;
              p.vx = 0;
              p.vy = 0;
              carromAudio.playPocket();
              playGamepadHaptics("tap");

              if (p.type !== "striker") {
                if (s.turn === "player") {
                  s.p1Score += p.value;
                  setP1Score(s.p1Score);
                } else {
                  s.aiScore += p.value;
                  setAiScore(s.aiScore);
                }
              }
              break;
            }
          }

          const spd = Math.hypot(p.vx, p.vy);
          totalSpeed += spd;
          if (spd < 0.05) {
            p.vx = 0;
            p.vy = 0;
          }
        }

        // 2. Circle-to-Circle Elastic Collision
        for (let i = 0; i < s.pieces.length; i++) {
          const p1 = s.pieces[i];
          if (p1.isPocketed) continue;

          for (let j = i + 1; j < s.pieces.length; j++) {
            const p2 = s.pieces[j];
            if (p2.isPocketed) continue;

            const dx = p2.x - p1.x;
            const dy = p2.y - p1.y;
            const dist = Math.hypot(dx, dy);
            const minDist = p1.radius + p2.radius;

            if (dist < minDist && dist > 0.001) {
              // Normal and tangent unit vectors
              const nx = dx / dist;
              const ny = dy / dist;

              // Separate overlapping circles
              const overlap = minDist - dist;
              p1.x -= nx * overlap * 0.5;
              p1.y -= ny * overlap * 0.5;
              p2.x += nx * overlap * 0.5;
              p2.y += ny * overlap * 0.5;

              // Relative velocity
              const kx = p1.vx - p2.vx;
              const ky = p1.vy - p2.vy;

              // Dot product of velocity and normal
              const p = 2 * (nx * kx + ny * ky) / (p1.mass + p2.mass);

              p1.vx -= p * p2.mass * nx * 0.95;
              p1.vy -= p * p2.mass * ny * 0.95;
              p2.vx += p * p1.mass * nx * 0.95;
              p2.vy += p * p1.mass * ny * 0.95;

              carromAudio.playClack(Math.hypot(p1.vx, p1.vy));
            }
          }
        }

        // 3. Check turn completion
        if (totalSpeed < 0.1) {
          s.isMoving = false;

          // Reset striker
          const striker = s.pieces.find((p) => p.type === "striker");
          if (striker) {
            striker.isPocketed = false;
            striker.vx = 0;
            striker.vy = 0;
          }

          // Check Win Condition: all coins pocketed
          const remainingCoins = s.pieces.filter((p) => !p.isPocketed && p.type !== "striker");
          if (remainingCoins.length === 0) {
            s.isGameOver = true;
            setIsGameOver(true);
            carromAudio.playWin();
            earnArcadeCredits(Math.max(20, Math.round(s.p1Score * 3)));
            onGameOver?.(s.p1Score, s.aiScore);
          } else {
            // Swap turns
            if (s.turn === "player") {
              s.turn = "ai";
              setCurrentTurn("ai");
              triggerAiTurn();
            } else {
              s.turn = "player";
              setCurrentTurn("player");
              s.strikerBaselineY = BOARD_CENTER_Y + 175;
              s.strikerX = BOARD_CENTER_X;
              if (striker) {
                striker.x = s.strikerX;
                striker.y = s.strikerBaselineY;
              }
            }
          }
        }
      }

      // ================= RENDER =================
      ctx.save();
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Dark surrounding table
      ctx.fillStyle = "#1c1917";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Wooden Carrom Frame
      const frameX = BOARD_CENTER_X - BOARD_HALF;
      const frameY = BOARD_CENTER_Y - BOARD_HALF;
      const frameSize = BOARD_HALF * 2;

      ctx.fillStyle = "#78350f"; // Rich mahogany wood
      ctx.beginPath();
      ctx.roundRect(frameX - 24, frameY - 24, frameSize + 48, frameSize + 48, 16);
      ctx.fill();
      ctx.strokeStyle = "#451a03";
      ctx.lineWidth = 6;
      ctx.stroke();

      // Polished Playing Surface
      ctx.fillStyle = "#fef3c7"; // Warm birch carrom surface
      ctx.fillRect(frameX, frameY, frameSize, frameSize);

      // Center Circle & Concentric Patterns
      ctx.strokeStyle = "#b45309";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(BOARD_CENTER_X, BOARD_CENTER_Y, 28, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(BOARD_CENTER_X, BOARD_CENTER_Y, 56, 0, Math.PI * 2);
      ctx.stroke();

      // Baselines (Top & Bottom)
      const drawBaseline = (y: number) => {
        ctx.strokeStyle = "#92400e";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(BOARD_CENTER_X - 160, y - 10);
        ctx.lineTo(BOARD_CENTER_X + 160, y - 10);
        ctx.moveTo(BOARD_CENTER_X - 160, y + 10);
        ctx.lineTo(BOARD_CENTER_X + 160, y + 10);
        ctx.stroke();

        // Baseline Circles at ends
        ctx.fillStyle = "#dc2626";
        ctx.beginPath();
        ctx.arc(BOARD_CENTER_X - 160, y, 10, 0, Math.PI * 2);
        ctx.arc(BOARD_CENTER_X + 160, y, 10, 0, Math.PI * 2);
        ctx.fill();
      };

      drawBaseline(BOARD_CENTER_Y + 175); // Player baseline
      drawBaseline(BOARD_CENTER_Y - 175); // Opponent baseline

      // Corner Pockets (Holes with black mesh)
      for (const pocket of POCKETS) {
        ctx.fillStyle = "#09090b";
        ctx.beginPath();
        ctx.arc(pocket.x, pocket.y, POCKET_RADIUS, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#44403c";
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      // Draw Aim Vector & Power Guide (If player's turn)
      if (!s.isMoving && s.turn === "player") {
        ctx.strokeStyle = "rgba(220, 38, 38, 0.75)";
        ctx.lineWidth = 2.5;
        ctx.setLineDash([6, 6]);
        ctx.beginPath();
        ctx.moveTo(s.strikerX, s.strikerBaselineY);
        ctx.lineTo(
          s.strikerX + Math.cos(s.aimAngle) * 220,
          s.strikerBaselineY + Math.sin(s.aimAngle) * 220
        );
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // Draw Pieces
      for (const p of s.pieces) {
        if (p.isPocketed) continue;
        ctx.save();
        ctx.translate(p.x, p.y);

        // Shadow
        ctx.fillStyle = "rgba(0,0,0,0.25)";
        ctx.beginPath();
        ctx.arc(2, 3, p.radius, 0, Math.PI * 2);
        ctx.fill();

        // Coin Body
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(0, 0, p.radius, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = p.type === "white" ? "#ca8a04" : p.type === "queen" ? "#991b1b" : "#44403c";
        ctx.lineWidth = 2;
        ctx.stroke();

        // Striker Engraving
        if (p.type === "striker") {
          ctx.strokeStyle = "#0284c7";
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(0, 0, 10, 0, Math.PI * 2);
          ctx.stroke();
        }

        ctx.restore();
      }

      ctx.restore();

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [
    BOARD_CENTER_X,
    BOARD_CENTER_Y,
    BOARD_HALF,
    MIN_X,
    MAX_X,
    MIN_Y,
    MAX_Y,
    POCKETS,
    executeStrike,
    onGameOver,
    triggerAiTurn,
  ]);

  return (
    <div className="relative w-full h-[640px] bg-stone-950 flex flex-col items-center justify-center select-none overflow-hidden rounded-xl border border-stone-800 shadow-2xl">
      <canvas
        ref={canvasRef}
        width={800}
        height={640}
        className="w-full h-full max-w-[800px] aspect-[5/4] bg-stone-950 rounded-lg cursor-crosshair"
      />

      {/* Floating HUD Header */}
      <div className="absolute top-4 left-6 right-6 flex items-center justify-between pointer-events-none">
        {/* Scores */}
        <div className="flex items-center gap-4 bg-stone-900/90 backdrop-blur-md px-4 py-2.5 rounded-xl border border-stone-700/60 shadow-lg pointer-events-auto">
          <div>
            <div className="text-[10px] uppercase font-bold tracking-wider text-amber-400">Player 1 (White)</div>
            <div className="text-xl font-black text-amber-300 font-mono">{p1Score} pts</div>
          </div>
          <div className="h-7 w-px bg-stone-700" />
          <div>
            <div className="text-[10px] uppercase font-bold tracking-wider text-stone-400">Computer (Black)</div>
            <div className="text-xl font-black text-stone-300 font-mono">{aiScore} pts</div>
          </div>
          <button
            onClick={toggleMute}
            className="p-1 hover:bg-stone-800 rounded-lg text-stone-400 hover:text-stone-200 transition-colors"
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4" />}
          </button>
        </div>

        {/* Turn & Power Meter */}
        <div className="flex items-center gap-3 bg-stone-900/90 backdrop-blur-md px-4 py-2.5 rounded-xl border border-stone-700/60 shadow-lg">
          <div className="flex flex-col">
            <div className="text-[10px] uppercase font-bold tracking-wider text-stone-400">Current Turn</div>
            <div className="text-sm font-black text-white flex items-center gap-1.5">
              <span
                className={`w-2 h-2 rounded-full ${
                  currentTurn === "player" ? "bg-amber-400 animate-pulse" : "bg-sky-400"
                }`}
              />
              {currentTurn === "player" ? "Your Strike" : "Opponent Aiming..."}
            </div>
          </div>

          {currentTurn === "player" && (
            <>
              <div className="h-7 w-px bg-stone-700" />
              <div className="flex flex-col">
                <div className="text-[10px] uppercase font-bold tracking-wider text-amber-400">Strike Power</div>
                <div className="w-24 h-2.5 bg-stone-800 rounded-full overflow-hidden mt-0.5 border border-stone-700">
                  <div
                    className="h-full bg-gradient-to-r from-amber-500 to-red-500 transition-all duration-75"
                    style={{ width: `${chargePower * 100}%` }}
                  />
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Game Over Modal */}
      {isGameOver && (
        <div className="absolute inset-0 bg-black/85 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-300">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 mb-4 shadow-xl">
            <Trophy className="w-8 h-8" />
          </div>
          <h2 className="text-3xl font-black text-amber-100 uppercase tracking-wider mb-1">
            {p1Score > aiScore ? "Match Victory!" : "Match Concluded"}
          </h2>
          <p className="text-stone-400 text-sm max-w-sm mb-6">
            All carrom coins have been pocketed. Final match scores:
          </p>

          <div className="grid grid-cols-2 gap-4 w-full max-w-xs mb-8">
            <div className="bg-stone-900/90 border border-stone-800 p-3 rounded-xl">
              <div className="text-xs text-stone-400">Player 1</div>
              <div className="text-2xl font-black text-amber-400 font-mono">{p1Score}</div>
            </div>
            <div className="bg-stone-900/90 border border-stone-800 p-3 rounded-xl">
              <div className="text-xs text-stone-400">Computer</div>
              <div className="text-2xl font-black text-stone-300 font-mono">{aiScore}</div>
            </div>
          </div>

          <button
            onClick={setupBoard}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-amber-600 to-amber-700 text-stone-950 font-black tracking-wider uppercase shadow-lg shadow-amber-600/25 hover:brightness-110 active:scale-95 transition-all"
          >
            <RotateCcw className="w-5 h-5" />
            Rematch (Press A)
          </button>
        </div>
      )}
    </div>
  );
};
