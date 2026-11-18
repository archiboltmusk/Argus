import { useMemo } from "react";
import type { Settings } from "@/lib/settings";
import type { Chapter } from "@/lib/player/bridge";

export const GLASS_BG =
  "linear-gradient(180deg, rgba(255,255,255,0.28) 0%, rgba(255,255,255,0.04) 50%, rgba(0,0,0,0.18) 100%)";

export const RAINBOW_BG =
  "linear-gradient(to bottom, #ff595e 0 16.67%, #ff924c 16.67% 33.33%, #ffca3a 33.33% 50%, #8ac926 50% 66.67%, #1982c4 66.67% 83.33%, #6a4c93 83.33%)";

export function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

export function resolveAccent(settings: Settings): string {
  return (settings.seekBarColor || "").trim() || "oklch(0.78 0.13 60)";
}

export type SeekSegmentSpan = { startPct: number; endPct: number; color?: string };

export function SeekBarVisual({
  settings,
  pct,
  bufferedPct,
  scrubbing = false,
  hovered = false,
  forceDot = false,
  segments,
  durationSec,
  chapters = [],
  hoverSec,
}: {
  settings: Settings;
  pct: number;
  bufferedPct?: number;
  scrubbing?: boolean;
  hovered?: boolean;
  forceDot?: boolean;
  segments?: SeekSegmentSpan[];
  durationSec?: number;
  chapters?: Chapter[];
  hoverSec?: number | null;
}) {
  const accent = resolveAccent(settings);
  const baseHeight = clamp(settings.seekBarHeight ?? 6, 3, 14);
  // Three steps, not two. Hover and scrub were both +2, so committing to a drag
  // gave no feedback at all: the bar looked identical whether you were reading
  // it or moving it.
  const trackHeight = scrubbing ? baseHeight + 4 : hovered ? baseHeight + 2 : baseHeight;
  const shape = settings.seekDotShape ?? "circle";
  const dotMax = shape === "image" ? 200 : 64;
  const baseDot = clamp(settings.seekDotSize ?? 16, 8, dotMax);
  // The dot has to answer the pointer before the drag, not after it. Growing
  // only while scrubbing meant the target never acknowledged you were on it.
  const dotSize = scrubbing ? baseDot + 6 : hovered ? baseDot + 3 : baseDot;
  const style = settings.seekBarStyle ?? "flat";
  const isRainbow = style === "rainbow";
  const isImage = style === "image" && !!settings.seekBarImage;
  const dotColor = isRainbow || isImage ? "#ffffff" : accent;
  const revealed = forceDot || settings.seekDotHover === false || hovered || scrubbing;

  const fillStyle: React.CSSProperties = {
    width: `${pct}%`,
    height: trackHeight,
    top: "50%",
    transform: "translateY(-50%)",
    backgroundColor: isRainbow || isImage ? undefined : accent,
    backgroundImage: isRainbow
      ? RAINBOW_BG
      : isImage
      ? `url(${settings.seekBarImage})`
      : undefined,
    backgroundRepeat: isImage ? "repeat" : undefined,
    backgroundSize: isImage ? "auto 100%" : undefined,
  };
  const glassOverlay: React.CSSProperties | null =
    style === "glass" ? { backgroundImage: GLASS_BG, mixBlendMode: "overlay" } : null;

  // Compute YouTube-style chapter segments if multiple chapters are available
  const chapterSegments = useMemo(() => {
    if (
      settings.seekBarChapters === false ||
      !chapters ||
      chapters.length < 2 ||
      !durationSec ||
      durationSec <= 0
    ) {
      return null;
    }
    const sorted = [...chapters]
      .filter((c) => Number.isFinite(c.startSec))
      .sort((a, b) => a.startSec - b.startSec);
    if (sorted.length < 2) return null;

    const list: Array<{
      id: string;
      title: string;
      startSec: number;
      endSec: number;
      duration: number;
    }> = [];

    if (sorted[0].startSec > 5) {
      list.push({
        id: "seg-intro",
        title: "Intro",
        startSec: 0,
        endSec: sorted[0].startSec,
        duration: sorted[0].startSec,
      });
    }

    for (let i = 0; i < sorted.length; i++) {
      const cur = sorted[i];
      const nextStart = sorted[i + 1]?.startSec ?? durationSec;
      const startSec = Math.max(0, cur.startSec);
      const endSec = Math.min(durationSec, nextStart);
      if (endSec > startSec) {
        list.push({
          id: `seg-${i}`,
          title: cur.title || `Chapter ${list.length + 1}`,
          startSec,
          endSec,
          duration: endSec - startSec,
        });
      }
    }

    return list.length >= 2 ? list : null;
  }, [settings.seekBarChapters, chapters, durationSec]);

  const currentPosSec = durationSec && durationSec > 0 ? (pct / 100) * durationSec : 0;
  const bufferedPosSec =
    durationSec && durationSec > 0 && bufferedPct != null ? (bufferedPct / 100) * durationSec : 0;

  return (
    <>
      {chapterSegments ? (
        /* YouTube segmented seekbar with 2.5px gaps */
        <div
          className="w-full flex items-center gap-[2.5px] transition-[height] duration-150 relative"
          style={{ height: trackHeight }}
        >
          {chapterSegments.map((seg, idx) => {
            const isHoveredSeg =
              hoverSec != null && hoverSec >= seg.startSec && hoverSec < seg.endSec;
            const segHeight = isHoveredSeg ? trackHeight + (scrubbing ? 3 : 2) : trackHeight;

            let segBufPct = 0;
            if (bufferedPosSec >= seg.endSec) {
              segBufPct = 100;
            } else if (bufferedPosSec > seg.startSec) {
              segBufPct = Math.min(
                100,
                Math.max(0, ((bufferedPosSec - seg.startSec) / seg.duration) * 100),
              );
            }

            let segPlayPct = 0;
            if (currentPosSec >= seg.endSec) {
              segPlayPct = 100;
            } else if (currentPosSec > seg.startSec) {
              segPlayPct = Math.min(
                100,
                Math.max(0, ((currentPosSec - seg.startSec) / seg.duration) * 100),
              );
            }

            return (
              <div
                key={seg.id || idx}
                className="relative overflow-hidden rounded-full bg-white/15 transition-[height] duration-150"
                style={{
                  flex: `${seg.duration} 0 0%`,
                  height: segHeight,
                }}
                title={seg.title}
              >
                {/* Segment Buffered Fill */}
                {segBufPct > 0 && (
                  <div
                    className="h-full rounded-full bg-white relative z-[1]"
                    style={{
                      width: `${segBufPct}%`,
                      opacity: clamp(settings.seekBarFillOpacity ?? 0.35, 0.05, 1),
                    }}
                  />
                )}
                {/* Segment Playback Fill */}
                <div
                  className="absolute inset-y-0 left-0 overflow-hidden rounded-full z-[2] transition-[height] duration-150"
                  style={{
                    width: `${segPlayPct}%`,
                    backgroundColor: isRainbow || isImage ? undefined : accent,
                    backgroundImage: isRainbow
                      ? RAINBOW_BG
                      : isImage
                      ? `url(${settings.seekBarImage})`
                      : undefined,
                    backgroundRepeat: isImage ? "repeat" : undefined,
                    backgroundSize: isImage ? "auto 100%" : undefined,
                  }}
                >
                  {style === "pinstripe" && <div className="argus-barberpole absolute inset-0" />}
                  {glassOverlay && <div className="absolute inset-0" style={glassOverlay} />}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Continuous seekbar when no chapters exist */
        <>
          <div
            className="w-full rounded-full bg-white/15 transition-[height] duration-150 relative overflow-hidden"
            style={{ height: trackHeight }}
          >
            {settings.seekBarHeatmap !== false && durationSec != null && durationSec > 60 && (
              <div
                className="pointer-events-none absolute inset-0 opacity-40 mix-blend-screen"
                style={{
                  background:
                    "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.06) 12%, rgba(255,180,60,0.22) 28%, rgba(255,80,60,0.32) 42%, rgba(255,255,255,0.08) 55%, rgba(255,120,50,0.28) 72%, rgba(255,60,60,0.36) 84%, rgba(255,255,255,0.05) 94%, transparent 100%)",
                }}
              />
            )}
            {bufferedPct != null && bufferedPct > 0 && (
              <div
                className="h-full rounded-full bg-white relative z-[1]"
                style={{
                  width: `${bufferedPct}%`,
                  opacity: clamp(settings.seekBarFillOpacity ?? 0.35, 0.05, 1),
                }}
              />
            )}
          </div>
          <div
            className="absolute overflow-hidden rounded-full transition-[height] duration-150"
            style={fillStyle}
          >
            {style === "pinstripe" && <div className="argus-barberpole absolute inset-0" />}
            {glassOverlay && <div className="absolute inset-0" style={glassOverlay} />}
          </div>
        </>
      )}
      {(segments ?? []).map((s, i) => (
        <div
          key={`${s.startPct}-${i}`}
          className="pointer-events-none absolute rounded-full z-[3]"
          style={{
            left: `${s.startPct}%`,
            width: `${Math.max(0.4, s.endPct - s.startPct)}%`,
            height: Math.max(2, trackHeight - 2),
            top: "50%",
            transform: "translateY(-50%)",
            backgroundColor: s.color ?? "rgba(255,255,255,0.45)",
          }}
        />
      ))}
      {shape !== "hidden" && revealed && (
        <SeekDot
          shape={shape}
          size={dotSize}
          leftPct={pct}
          color={dotColor}
          image={settings.seekDotImage}
          scrubbing={scrubbing}
        />
      )}
    </>
  );
}

function SeekDot({
  shape,
  size,
  leftPct,
  color,
  image,
  scrubbing,
}: {
  shape: "circle" | "square" | "image";
  size: number;
  leftPct: number;
  color: string;
  image: string;
  scrubbing?: boolean;
}) {
  if (shape === "image" && image) {
    return (
      <img
        src={image}
        alt=""
        draggable={false}
        className={`absolute top-1/2 -translate-x-1/2 -translate-y-1/2 select-none object-contain drop-shadow-[0_0_6px_rgba(0,0,0,0.55)] transition-[width,height,opacity] duration-200 ${
          scrubbing ? "drop-shadow-[0_0_12px_rgba(255,255,255,0.85)] scale-110" : ""
        }`}
        style={{ left: `${leftPct}%`, width: size, height: size }}
      />
    );
  }
  const radius = shape === "square" ? "20%" : "50%";
  return (
    <div
      className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 transition-[width,height,border-radius,box-shadow,transform] duration-200 ease-[cubic-bezier(0.22,0.61,0.36,1)] motion-reduce:transition-none"
      style={{
        left: `${leftPct}%`,
        width: size,
        height: size,
        backgroundColor: color,
        borderRadius: radius,
        boxShadow: scrubbing
          ? `0 0 0 2px rgba(0,0,0,0.6), 0 0 16px ${color}, 0 2px 8px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.4)`
          : "0 0 0 2px rgba(0,0,0,0.5), 0 2px 6px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.35)",
      }}
    />
  );
}
