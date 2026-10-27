import { memo } from "react";

export const AmbientEdgeGlow = memo(function AmbientEdgeGlow({
  active,
  backdrop,
  opacity = 0.5,
}: {
  active: boolean;
  backdrop?: string | null;
  opacity?: number;
}) {
  if (!active || !backdrop) return null;

  return (
    <div
      aria-hidden
      data-player-ambient-glow
      className="pointer-events-none absolute inset-0 z-0 overflow-hidden transition-opacity duration-1000 ease-in-out"
      style={{ opacity: active ? opacity : 0 }}
    >
      {/* Blurred ambient backlight reflecting the video colors */}
      <img
        src={backdrop}
        alt=""
        aria-hidden
        decoding="async"
        className="absolute inset-[-15%] h-[130%] w-[130%] scale-110 object-cover blur-[100px] saturate-200 brightness-95 transform-gpu motion-safe:animate-[pulse_12s_ease-in-out_infinite]"
      />
      {/* Radial theater vignette that pulls focus into the center video screen */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(0,0,0,0)_42%,rgba(0,0,0,0.85)_88%)]" />
    </div>
  );
});
