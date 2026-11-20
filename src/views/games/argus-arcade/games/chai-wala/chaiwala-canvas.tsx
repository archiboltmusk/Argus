import React, { useEffect, useRef, useState, useCallback } from "react";
import { chaiWalaAudio } from "./chaiwala-audio";
import { Trophy, RotateCcw, Volume2, VolumeX, Timer } from "lucide-react";

interface ChaiWalaCanvasProps {
  onGameOver?: (score: number, cupsServed: number) => void;
}

interface Customer {
  id: number;
  x: number;
  targetX: number;
  order: "cutting" | "masala" | "bunmaska";
  patience: number;
  maxPatience: number;
  avatarColor: string;
  label: string;
}

interface FlyingItem {
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  progress: number;
  type: "chai" | "bun";
}

export const ChaiWalaCanvas: React.FC<ChaiWalaCanvasProps> = ({ onGameOver }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [score, setScore] = useState(0);
  const [cupsServed, setCupsServed] = useState(0);
  const [trainTime, setTrainTime] = useState(90); // 90 seconds until train departs
  const [isGameOver, setIsGameOver] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  const stateRef = useRef({
    score: 0,
    cupsServed: 0,
    trainTime: 90,
    isGameOver: false,

    activeStation: 0,
    kettleHeat: 50,
    gingerCrushed: 0,
    bunToasted: false,

    customers: [] as Customer[],
    flyingItems: [] as FlyingItem[],
    nextCustId: 1,
    whistlePlayed: false,
    screenShake: 0,
  });

  const toggleMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    chaiWalaAudio.setMuted(next);
  };

  const restartGame = useCallback(() => {
    const s = stateRef.current;
    s.score = 0;
    s.cupsServed = 0;
    s.trainTime = 90;
    s.isGameOver = false;
    s.activeStation = 0;
    s.kettleHeat = 50;
    s.gingerCrushed = 0;
    s.bunToasted = false;
    s.customers = [];
    s.flyingItems = [];
    s.whistlePlayed = false;

    setScore(0);
    setCupsServed(0);
    setTrainTime(90);
    setIsGameOver(false);
  }, []);

  // Station action trigger
  const handleAction = useCallback(() => {
    const s = stateRef.current;
    if (s.isGameOver) return;

    if (s.activeStation === 0) {
      // Kettle station: Speed boil
      s.kettleHeat = Math.min(100, s.kettleHeat + 25);
      chaiWalaAudio.playBoilHiss();
    } else if (s.activeStation === 1) {
      // Ginger Station: crush
      s.gingerCrushed = (s.gingerCrushed + 1) % 4;
      chaiWalaAudio.playCrush();
    } else if (s.activeStation === 2) {
      // Bun Grill: Toggle toast
      s.bunToasted = true;
      chaiWalaAudio.playBoilHiss();
    } else if (s.activeStation === 3) {
      // Service Counter: Serve nearest customer
      if (s.customers.length === 0) return;
      const cust = s.customers[0];

      let fulfilled = false;
      if (cust.order === "cutting" && s.kettleHeat >= 40) {
        fulfilled = true;
        s.kettleHeat = Math.max(10, s.kettleHeat - 20);
      } else if (cust.order === "masala" && s.kettleHeat >= 40 && s.gingerCrushed >= 3) {
        fulfilled = true;
        s.kettleHeat = Math.max(10, s.kettleHeat - 20);
        s.gingerCrushed = 0;
      } else if (cust.order === "bunmaska" && s.bunToasted) {
        fulfilled = true;
        s.bunToasted = false;
      }

      if (fulfilled) {
        chaiWalaAudio.playCupClink();
        setTimeout(() => chaiWalaAudio.playCashChime(), 180);

        s.flyingItems.push({
          x: 620,
          y: 450,
          targetX: cust.x,
          targetY: 260,
          progress: 0,
          type: cust.order === "bunmaska" ? "bun" : "chai",
        });

        s.score += Math.floor(cust.patience * 20) + 50;
        s.cupsServed += 1;
        s.customers.shift(); // Remove served customer

        setScore(s.score);
        setCupsServed(s.cupsServed);
      }
    }
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const s = stateRef.current;
      if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") {
        s.activeStation = (s.activeStation + 3) % 4;
      } else if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") {
        s.activeStation = (s.activeStation + 1) % 4;
      } else if (e.key === " " || e.key === "Enter") {
        handleAction();
      } else if (e.key === "x" || e.key === "X") {
        s.gingerCrushed = (s.gingerCrushed + 1) % 4;
        chaiWalaAudio.playCrush();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleAction]);

  // Game loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let lastTime = performance.now();
    let spawnTimer = 0;
    let prevPadBtnA = false;
    let prevPadDpad = 0;

    const spawnCustomer = () => {
      const s = stateRef.current;
      if (s.customers.length >= 4) return;

      const orders: Array<Customer["order"]> = ["cutting", "masala", "bunmaska"];
      const order = orders[Math.floor(Math.random() * orders.length)];
      const colors = ["#f59e0b", "#3b82f6", "#ec4899", "#10b981", "#8b5cf6"];
      const labels = ["Uncle", "Student", "Passenger", "Commuter", "Traveller"];

      const idx = s.customers.length;
      s.customers.push({
        id: s.nextCustId++,
        x: canvas.width + 60,
        targetX: 200 + idx * 130,
        order,
        patience: 1.0,
        maxPatience: 1.0,
        avatarColor: colors[Math.floor(Math.random() * colors.length)],
        label: labels[Math.floor(Math.random() * labels.length)],
      });
    };

    const loop = (now: number) => {
      const dt = Math.min((now - lastTime) / 1000, 0.1);
      lastTime = now;
      const s = stateRef.current;

      if (!s.isGameOver) {
        // Countdown train timer
        s.trainTime -= dt;
        if (s.trainTime <= 0) {
          s.trainTime = 0;
          s.isGameOver = true;
          setIsGameOver(true);
          onGameOver?.(s.score, s.cupsServed);
        }

        // Play train whistle warning at 30 seconds
        if (s.trainTime <= 30 && !s.whistlePlayed) {
          chaiWalaAudio.playTrainWhistle();
          s.whistlePlayed = true;
        }

        // Slowly cool down kettle
        s.kettleHeat = Math.max(0, s.kettleHeat - dt * 2.5);

        // Poll Gamepad
        const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
        for (const pad of gamepads) {
          if (!pad) continue;
          // D-Pad left/right navigation
          const dpadX = pad.axes[0] > 0.4 || pad.buttons[15]?.pressed ? 1 : pad.axes[0] < -0.4 || pad.buttons[14]?.pressed ? -1 : 0;
          if (dpadX !== 0 && prevPadDpad === 0) {
            s.activeStation = (s.activeStation + (dpadX === 1 ? 1 : 3)) % 4;
          }
          prevPadDpad = dpadX;

          // A button action
          const btnA = pad.buttons[0]?.pressed || false;
          if (btnA && !prevPadBtnA) {
            handleAction();
          }
          prevPadBtnA = btnA;

          // RT Speed boil
          if (pad.buttons[7]?.value > 0.3) {
            s.kettleHeat = Math.min(100, s.kettleHeat + dt * 45);
          }
        }

        // Spawn customers
        spawnTimer += dt;
        if (spawnTimer > 3.2 && s.customers.length < 4) {
          spawnCustomer();
          spawnTimer = 0;
        }

        // Update Customers
        for (let i = s.customers.length - 1; i >= 0; i--) {
          const c = s.customers[i];
          // Walk to target station spot
          c.targetX = 200 + i * 130;
          c.x += (c.targetX - c.x) * 0.08;

          // Patience drain
          c.patience -= dt * 0.045;
          if (c.patience <= 0) {
            // Angry customer left!
            s.customers.splice(i, 1);
            s.score = Math.max(0, s.score - 40);
            setScore(s.score);
          }
        }

        // Update Flying items
        for (let i = s.flyingItems.length - 1; i >= 0; i--) {
          const item = s.flyingItems[i];
          item.progress += dt * 3.5;
          if (item.progress >= 1) {
            s.flyingItems.splice(i, 1);
          }
        }

        // Sync react state
        setTrainTime(Math.ceil(s.trainTime));
      }

      // ================= RENDER =================
      ctx.save();
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // 1. Station Platform Background & Train
      ctx.fillStyle = "#1e293b"; // Railway sky / depot
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Train Body (Indian Railways Classic Maroon / Blue Express)
      ctx.fillStyle = "#1e3a8a"; // Indian Railways Blue
      ctx.fillRect(0, 40, canvas.width, 180);

      // Train Yellow Stripe
      ctx.fillStyle = "#facc15";
      ctx.fillRect(0, 90, canvas.width, 12);
      ctx.fillRect(0, 160, canvas.width, 12);

      // Train Windows
      for (let w = 40; w < canvas.width; w += 90) {
        ctx.fillStyle = "#0284c7";
        ctx.fillRect(w, 105, 50, 45);
        ctx.strokeStyle = "#38bdf8";
        ctx.lineWidth = 2;
        ctx.strokeRect(w, 105, 50, 45);
      }

      // Platform 1 Concrete
      ctx.fillStyle = "#334155";
      ctx.fillRect(0, 220, canvas.width, canvas.height - 220);

      // Yellow safety line
      ctx.fillStyle = "#eab308";
      ctx.fillRect(0, 220, canvas.width, 8);

      // 2. Draw Waiting Customers
      for (const cust of s.customers) {
        ctx.save();
        ctx.translate(cust.x, 280);

        // Avatar Body
        ctx.fillStyle = cust.avatarColor;
        ctx.beginPath();
        ctx.arc(0, 0, 18, 0, Math.PI * 2);
        ctx.fill();

        // Customer Label
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 11px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(cust.label, 0, -26);

        // Order Speech Bubble
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.roundRect(-45, -68, 90, 30, 8);
        ctx.fill();
        ctx.strokeStyle = "#94a3b8";
        ctx.stroke();

        ctx.fillStyle = "#0f172a";
        ctx.font = "bold 10px sans-serif";
        const orderText =
          cust.order === "cutting" ? "☕ Cutting" : cust.order === "masala" ? "🌶 Masala" : "🍞 Maska";
        ctx.fillText(orderText, 0, -48);

        // Patience Bar
        ctx.fillStyle = "#475569";
        ctx.fillRect(-20, 24, 40, 5);
        ctx.fillStyle = cust.patience > 0.4 ? "#10b981" : "#ef4444";
        ctx.fillRect(-20, 24, 40 * cust.patience, 5);

        ctx.restore();
      }

      // 3. Draw Flying Items
      for (const item of s.flyingItems) {
        const curX = item.x + (item.targetX - item.x) * item.progress;
        const curY = item.y + (item.targetY - item.y) * item.progress - Math.sin(item.progress * Math.PI) * 50;

        ctx.save();
        ctx.translate(curX, curY);
        if (item.type === "chai") {
          ctx.fillStyle = "#b45309";
          ctx.beginPath();
          ctx.arc(0, 0, 9, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.fillStyle = "#fbbf24";
          ctx.fillRect(-8, -6, 16, 12);
        }
        ctx.restore();
      }

      // 4. Wooden Chai Stall Counter
      ctx.fillStyle = "#78350f";
      ctx.fillRect(60, 420, canvas.width - 120, canvas.height - 420);
      ctx.strokeStyle = "#451a03";
      ctx.lineWidth = 4;
      ctx.strokeRect(60, 420, canvas.width - 120, canvas.height - 420);

      // Station Slots
      const stations = [
        { x: 140, label: "1. Brass Kettle", sub: `${Math.floor(s.kettleHeat)}% Heat` },
        { x: 300, label: "2. Adrak Mortar", sub: `${s.gingerCrushed}/3 Crushed` },
        { x: 460, label: "3. Bun Toaster", sub: s.bunToasted ? "Ready! 🍞" : "Cold" },
        { x: 620, label: "4. Serve Counter", sub: "Press A to Toss" },
      ];

      stations.forEach((st, idx) => {
        const isSelected = s.activeStation === idx;
        ctx.save();
        ctx.translate(st.x, 500);

        // Station Box
        ctx.fillStyle = isSelected ? "rgba(251, 191, 36, 0.25)" : "rgba(0, 0, 0, 0.35)";
        ctx.beginPath();
        ctx.roundRect(-60, -60, 120, 110, 12);
        ctx.fill();
        ctx.strokeStyle = isSelected ? "#f59e0b" : "#92400e";
        ctx.lineWidth = isSelected ? 3 : 1.5;
        ctx.stroke();

        // Station Visuals
        if (idx === 0) {
          // Kettle
          ctx.fillStyle = "#d97706";
          ctx.beginPath();
          ctx.arc(0, -10, 24, 0, Math.PI * 2);
          ctx.fill();
          // Steam
          if (s.kettleHeat > 50) {
            ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
            ctx.beginPath();
            ctx.arc(-6, -42, 6, 0, Math.PI * 2);
            ctx.arc(6, -48, 8, 0, Math.PI * 2);
            ctx.fill();
          }
        } else if (idx === 1) {
          // Mortar & Pestle
          ctx.fillStyle = "#44403c";
          ctx.beginPath();
          ctx.arc(0, -6, 20, 0, Math.PI);
          ctx.fill();
          // Ginger
          ctx.fillStyle = "#d97706";
          ctx.fillRect(-6, -16, 12, 10);
        } else if (idx === 2) {
          // Bun Maska
          ctx.fillStyle = s.bunToasted ? "#d97706" : "#fef08a";
          ctx.beginPath();
          ctx.roundRect(-20, -22, 40, 28, 6);
          ctx.fill();
        } else {
          // Delivery Tray
          ctx.fillStyle = "#b45309";
          ctx.beginPath();
          ctx.ellipse(0, -10, 30, 14, 0, 0, Math.PI * 2);
          ctx.fill();
        }

        // Labels
        ctx.fillStyle = isSelected ? "#fef08a" : "#cbd5e1";
        ctx.font = "bold 11px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(st.label, 0, 32);

        ctx.fillStyle = isSelected ? "#38bdf8" : "#94a3b8";
        ctx.font = "10px monospace";
        ctx.fillText(st.sub, 0, 44);

        ctx.restore();
      });

      ctx.restore();

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [onGameOver, handleAction]);

  return (
    <div className="relative w-full h-[640px] bg-amber-950 flex flex-col items-center justify-center select-none overflow-hidden rounded-xl border border-amber-900/60 shadow-2xl">
      <canvas
        ref={canvasRef}
        width={800}
        height={640}
        className="w-full h-full max-w-[800px] aspect-[5/4] bg-stone-900 rounded-lg cursor-pointer"
      />

      {/* Floating HUD Header */}
      <div className="absolute top-4 left-6 right-6 flex items-center justify-between pointer-events-none">
        {/* Earnings & Cups */}
        <div className="flex items-center gap-4 bg-stone-900/90 backdrop-blur-md px-4 py-2.5 rounded-xl border border-amber-700/60 shadow-lg pointer-events-auto">
          <div>
            <div className="text-[10px] uppercase font-bold tracking-wider text-amber-400">Total Profit</div>
            <div className="text-xl font-black text-amber-300 font-mono">₹{score}</div>
          </div>
          <div className="h-7 w-px bg-stone-700" />
          <div>
            <div className="text-[10px] uppercase font-bold tracking-wider text-stone-300">Cups Served</div>
            <div className="text-xl font-black text-white font-mono">{cupsServed} ☕</div>
          </div>
          <button
            onClick={toggleMute}
            className="p-1 hover:bg-stone-800 rounded-lg text-stone-400 hover:text-stone-200 transition-colors"
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4" />}
          </button>
        </div>

        {/* Departure Timer */}
        <div className="flex items-center gap-3 bg-stone-900/90 backdrop-blur-md px-4 py-2.5 rounded-xl border border-amber-700/60 shadow-lg">
          <Timer className="w-5 h-5 text-amber-400" />
          <div>
            <div className="text-[10px] uppercase font-bold tracking-wider text-amber-300">Train Departure</div>
            <div
              className={`text-xl font-black font-mono ${
                trainTime <= 20 ? "text-red-400 animate-pulse" : "text-stone-100"
              }`}
            >
              {trainTime}s
            </div>
          </div>
        </div>
      </div>

      {/* Game Over Modal */}
      {isGameOver && (
        <div className="absolute inset-0 bg-black/85 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-300">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 mb-4 shadow-xl">
            <Trophy className="w-8 h-8" />
          </div>
          <h2 className="text-3xl font-black text-amber-100 uppercase tracking-wider mb-1">
            Train Departed Platform 1!
          </h2>
          <p className="text-stone-400 text-sm max-w-sm mb-6">
            The guard blew the final whistle. Here is your platform earnings:
          </p>

          <div className="grid grid-cols-2 gap-4 w-full max-w-xs mb-8">
            <div className="bg-stone-900/90 border border-stone-800 p-3 rounded-xl">
              <div className="text-xs text-stone-400">Total Profit</div>
              <div className="text-2xl font-black text-amber-400 font-mono">₹{score}</div>
            </div>
            <div className="bg-stone-900/90 border border-stone-800 p-3 rounded-xl">
              <div className="text-xs text-stone-400">Kulhads Delivered</div>
              <div className="text-2xl font-black text-emerald-400 font-mono">{cupsServed}</div>
            </div>
          </div>

          <button
            onClick={restartGame}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-red-600 text-stone-950 font-black tracking-wider uppercase shadow-lg shadow-amber-500/25 hover:brightness-110 active:scale-95 transition-all"
          >
            <RotateCcw className="w-5 h-5" />
            Next Express Train (Press A)
          </button>
        </div>
      )}
    </div>
  );
};
