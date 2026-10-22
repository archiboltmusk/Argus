import type { CSSProperties } from "react";
import { LottiePlayer } from "@/components/lottie-player";
import flameData from "@/assets/lottie/flame-streak.json";

export function FlameStreak({
  size = 14,
  className,
  style,
}: {
  size?: number | string;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <span
      aria-hidden
      className={`argus-flame ${className ?? ""}`}
      style={{ width: size, height: size, ...style }}
    >
      <LottiePlayer data={flameData} className="argus-flame-art" />
    </span>
  );
}
