import { useState, useRef, useEffect, useCallback, type TouchEvent, type MouseEvent, type RefObject } from "react";
import { Sun, Volume2, VolumeX, FastForward, Rewind } from "lucide-react";
import type { PlayerBridge } from "@/lib/player/bridge";

function formatTime(totalSec: number): string {
  if (!Number.isFinite(totalSec) || totalSec <= 0) return "0:00";
  const s = Math.floor(totalSec % 60);
  const m = Math.floor((totalSec / 60) % 60);
  const h = Math.floor(totalSec / 3600);
  const ss = String(s).padStart(2, "0");
  if (h > 0) {
    const mm = String(m).padStart(2, "0");
    return `${h}:${mm}:${ss}`;
  }
  return `${m}:${ss}`;
}

type GestureMode = "none" | "brightness" | "volume" | "seek";

export function DragClickStage(props: {
  drawMode: boolean;
  pipMode: boolean;
  onClick: () => void;
  onDoubleClick: () => void;
  onWheelVolume?: (deltaY: number) => void;
  seekTo?: (sec: number) => void;
  positionSec?: number;
  durationSec?: number;
  bridgeRef?: RefObject<PlayerBridge | null>;
}) {
  const {
    drawMode,
    pipMode,
    onClick,
    onDoubleClick,
    onWheelVolume,
    seekTo,
    positionSec = 0,
    durationSec = 0,
    bridgeRef,
  } = props;

  // Active HUD state
  const [hudMode, setHudMode] = useState<GestureMode>("none");
  const [brightnessVal, setBrightnessVal] = useState<number>(50); // 0 to 100%
  const [volumeVal, setVolumeVal] = useState<number>(100); // 0 to 100%
  const [seekTargetSec, setSeekTargetSec] = useState<number>(0);
  const [seekDeltaSec, setSeekDeltaSec] = useState<number>(0);
  const [doubleTapSide, setDoubleTapSide] = useState<"left" | "right" | null>(null);

  const hudTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTapRef = useRef<{ time: number; x: number; y: number } | null>(null);

  // Gesture tracking refs
  const touchStartRef = useRef<{
    x: number;
    y: number;
    time: number;
    width: number;
    height: number;
    startPos: number;
    startBrightness: number;
    startVolume: number;
    lockedMode: GestureMode;
  } | null>(null);

  const clearHudTimeout = useCallback(() => {
    if (hudTimerRef.current) {
      clearTimeout(hudTimerRef.current);
      hudTimerRef.current = null;
    }
  }, []);

  const triggerHudFade = useCallback(() => {
    clearHudTimeout();
    hudTimerRef.current = setTimeout(() => {
      setHudMode("none");
      setDoubleTapSide(null);
    }, 750);
  }, [clearHudTimeout]);

  useEffect(() => {
    return () => {
      clearHudTimeout();
      if (tapTimerRef.current) clearTimeout(tapTimerRef.current);
    };
  }, [clearHudTimeout]);

  // Touch gesture start
  const handleTouchStart = (e: TouchEvent<HTMLDivElement>) => {
    if (drawMode || pipMode || e.touches.length !== 1) return;
    const touch = e.touches[0];
    const rect = e.currentTarget.getBoundingClientRect();
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;
    const now = Date.now();

    // Double tap detection
    const last = lastTapRef.current;
    if (last && now - last.time < 300 && Math.hypot(x - last.x, y - last.y) < 45) {
      // Double tap detected! Cancel single tap
      if (tapTimerRef.current) {
        clearTimeout(tapTimerRef.current);
        tapTimerRef.current = null;
      }
      lastTapRef.current = null;

      const normX = x / rect.width;
      if (normX < 0.35) {
        // Rewind 10s
        const next = Math.max(0, positionSec - 10);
        seekTo?.(next);
        setDoubleTapSide("left");
        triggerHudFade();
      } else if (normX > 0.65) {
        // Forward 10s
        const next = Math.min(durationSec || Infinity, positionSec + 10);
        seekTo?.(next);
        setDoubleTapSide("right");
        triggerHudFade();
      } else {
        onDoubleClick();
      }
      return;
    }

    lastTapRef.current = { time: now, x, y };

    touchStartRef.current = {
      x,
      y,
      time: now,
      width: rect.width,
      height: rect.height,
      startPos: positionSec,
      startBrightness: brightnessVal,
      startVolume: volumeVal,
      lockedMode: "none",
    };
  };

  // Touch gesture move
  const handleTouchMove = (e: TouchEvent<HTMLDivElement>) => {
    const start = touchStartRef.current;
    if (!start || e.touches.length !== 1) return;

    const touch = e.touches[0];
    const rect = e.currentTarget.getBoundingClientRect();
    const curX = touch.clientX - rect.left;
    const curY = touch.clientY - rect.top;
    const dx = curX - start.x;
    const dy = curY - start.y;

    // Lock mode after threshold
    if (start.lockedMode === "none") {
      const absDx = Math.abs(dx);
      const absDy = Math.abs(dy);
      if (absDx < 12 && absDy < 12) return;

      if (absDx > absDy * 1.25) {
        start.lockedMode = "seek";
      } else if (absDy > absDx * 1.25) {
        const normX = start.x / start.width;
        if (normX < 0.45) {
          start.lockedMode = "brightness";
        } else if (normX > 0.55) {
          start.lockedMode = "volume";
        }
      }
    }

    if (start.lockedMode === "none") return;
    clearHudTimeout();
    setHudMode(start.lockedMode);

    if (start.lockedMode === "brightness") {
      // Swipe up increases brightness, swipe down decreases
      const deltaPct = (-dy / (start.height * 0.45)) * 100;
      const nextBrightness = Math.max(10, Math.min(100, Math.round(start.startBrightness + deltaPct)));
      setBrightnessVal(nextBrightness);

      // Translate 0-100% to MPV eq brightness [-50, +50]
      const mpvEq = Math.round((nextBrightness - 50));
      bridgeRef?.current?.setVideoEq("brightness", mpvEq);
    } else if (start.lockedMode === "volume") {
      // Swipe up increases volume, swipe down decreases
      const deltaPct = (-dy / (start.height * 0.45)) * 100;
      const nextVol = Math.max(0, Math.min(100, Math.round(start.startVolume + deltaPct)));
      setVolumeVal(nextVol);
      bridgeRef?.current?.setVolume(nextVol / 100);
      onWheelVolume?.(dy > 0 ? 30 : -30);
    } else if (start.lockedMode === "seek") {
      // Horizontal scrub
      const maxSpan = Math.min(durationSec || 600, 360);
      const deltaSec = Math.round((dx / (start.width * 0.75)) * maxSpan);
      const target = Math.max(0, Math.min(durationSec || Infinity, start.startPos + deltaSec));
      setSeekDeltaSec(deltaSec);
      setSeekTargetSec(target);
    }
  };

  // Touch gesture end
  const handleTouchEnd = () => {
    const start = touchStartRef.current;
    touchStartRef.current = null;

    if (start && start.lockedMode === "seek") {
      seekTo?.(seekTargetSec);
      triggerHudFade();
      return;
    }

    if (start && (start.lockedMode === "brightness" || start.lockedMode === "volume")) {
      triggerHudFade();
      return;
    }

    // Schedule single click if no gesture occurred
    if (start && start.lockedMode === "none") {
      if (tapTimerRef.current) clearTimeout(tapTimerRef.current);
      tapTimerRef.current = setTimeout(() => {
        onClick();
        tapTimerRef.current = null;
      }, 260);
    }
  };

  return (
    <div
      data-player-click-stage
      className="pointer-events-auto absolute inset-0 z-[3] select-none touch-none"
      onWheel={(e) => {
        if (drawMode || pipMode) return;
        if (e.ctrlKey || e.metaKey) return;
        onWheelVolume?.(e.deltaY);
        setVolumeVal((prev) => Math.max(0, Math.min(100, prev + (e.deltaY < 0 ? 5 : -5))));
        setHudMode("volume");
        triggerHudFade();
      }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
      onMouseDown={(e) => {
        if (e.target !== e.currentTarget) return;
        if (drawMode || pipMode) return;
        if (e.button !== 0) return;
        const startX = e.clientX;
        const startY = e.clientY;
        const startTime = Date.now();
        let dragStarted = false;
        const onMove = (ev: MouseEvent | globalThis.MouseEvent) => {
          if (dragStarted) return;
          if (Date.now() - startTime < 150) return;
          const dx = Math.abs(ev.clientX - startX);
          const dy = Math.abs(ev.clientY - startY);
          if (dx > 8 || dy > 8) {
            dragStarted = true;
            window.removeEventListener("mousemove", onMove);
            window.removeEventListener("mouseup", onUp);
            import("@tauri-apps/api/window")
              .then(({ getCurrentWindow }) => getCurrentWindow().startDragging())
              .catch(() => {});
          }
        };
        const onUp = () => {
          window.removeEventListener("mousemove", onMove);
          window.removeEventListener("mouseup", onUp);
          if (!dragStarted) onClick();
        };
        window.addEventListener("mousemove", onMove);
        window.addEventListener("mouseup", onUp);
      }}
      onDoubleClick={(e) => {
        if (e.target !== e.currentTarget) return;
        if (drawMode || pipMode) return;
        onDoubleClick();
      }}
    >
      {/* Brightness HUD Overlay */}
      {hudMode === "brightness" && (
        <div className="pointer-events-none absolute left-12 top-1/2 -translate-y-1/2 flex flex-col items-center gap-3.5 rounded-2xl border border-white/10 bg-neutral-950/80 px-4 py-6 shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150">
          <Sun size={24} className="text-amber-400" />
          <div className="relative h-32 w-2.5 overflow-hidden rounded-full bg-white/20">
            <div
              className="absolute bottom-0 left-0 w-full rounded-full bg-amber-400 transition-all duration-75"
              style={{ height: `${brightnessVal}%` }}
            />
          </div>
          <span className="text-[13px] font-semibold tracking-wider text-white">
            {brightnessVal}%
          </span>
        </div>
      )}

      {/* Volume HUD Overlay */}
      {hudMode === "volume" && (
        <div className="pointer-events-none absolute right-12 top-1/2 -translate-y-1/2 flex flex-col items-center gap-3.5 rounded-2xl border border-white/10 bg-neutral-950/80 px-4 py-6 shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150">
          {volumeVal > 0 ? (
            <Volume2 size={24} className="text-emerald-400" />
          ) : (
            <VolumeX size={24} className="text-danger" />
          )}
          <div className="relative h-32 w-2.5 overflow-hidden rounded-full bg-white/20">
            <div
              className={`absolute bottom-0 left-0 w-full rounded-full transition-all duration-75 ${
                volumeVal > 0 ? "bg-emerald-400" : "bg-danger"
              }`}
              style={{ height: `${volumeVal}%` }}
            />
          </div>
          <span className="text-[13px] font-semibold tracking-wider text-white">
            {volumeVal}%
          </span>
        </div>
      )}

      {/* Seek Scrubbing HUD Overlay */}
      {hudMode === "seek" && (
        <div className="pointer-events-none absolute left-1/2 top-1/3 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-2 rounded-2xl border border-white/10 bg-neutral-950/85 px-6 py-4 shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center gap-2.5 text-[18px] font-bold text-white">
            {seekDeltaSec >= 0 ? (
              <FastForward size={22} className="text-cyan-400" />
            ) : (
              <Rewind size={22} className="text-amber-400" />
            )}
            <span>
              {seekDeltaSec >= 0 ? `+${seekDeltaSec}` : `${seekDeltaSec}`}s
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-[14px] font-medium text-white/70">
            <span className="font-semibold text-white">{formatTime(seekTargetSec)}</span>
            <span>/</span>
            <span>{formatTime(durationSec)}</span>
          </div>
        </div>
      )}

      {/* Double Tap Ripple Badges */}
      {doubleTapSide === "left" && (
        <div className="pointer-events-none absolute left-[15%] top-1/2 -translate-y-1/2 flex flex-col items-center gap-2 rounded-full border border-white/15 bg-white/10 p-6 backdrop-blur-md animate-in fade-in zoom-in-75 duration-200">
          <Rewind size={32} className="text-white" />
          <span className="text-[14px] font-bold text-white">-10s</span>
        </div>
      )}
      {doubleTapSide === "right" && (
        <div className="pointer-events-none absolute right-[15%] top-1/2 -translate-y-1/2 flex flex-col items-center gap-2 rounded-full border border-white/15 bg-white/10 p-6 backdrop-blur-md animate-in fade-in zoom-in-75 duration-200">
          <FastForward size={32} className="text-white" />
          <span className="text-[14px] font-bold text-white">+10s</span>
        </div>
      )}
    </div>
  );
}
