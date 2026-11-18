import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSharedMarks } from "@/lib/together/shared-marks";
import { formatTimestamp } from "@/lib/together/chat-extras";
import { useSettings } from "@/lib/settings";
import {
  usePlaybackPositionGated,
  usePlaybackBufferedGated,
  usePlaybackDownloadedGated,
  setSeekHovering,
  setSeekScrubbing,
} from "@/lib/player/playback-clock";
import { useTrickplayState } from "@/lib/trickplay";
import { useSkipSegmentsView } from "@/lib/skip-intro/segment-store";
import { ThumbPreview } from "@/components/player/thumb-preview";
import { SeekBarVisual } from "./seek-bar-visual";
import { useHoverExitGuard } from "./use-hover-exit-guard";
import { fmtTime } from "./transport-utils";
import type { Chapter } from "@/lib/player/bridge";

const BUFFER_PAD_SEC = 4;
const PENDING_MAX_MS = 2500;

// This bar is the mouse-era scrubber and it stays that way. The ten-foot
// scrubber is views/big-picture/player/bp-player-scrub.tsx, which lives inside
// the Big Picture focus root and steps through setBpPlayerKeyHandler. A D-pad
// engine here would be unreachable: bp-focus-core only scans [data-bp-root],
// and this element is never inside one.
export function SeekBar({
  durationSec,
  onSeek,
  active,
  chapters = [],
}: {
  durationSec: number;
  onSeek: (s: number) => void;
  active: boolean;
  chapters?: Chapter[];
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<number | null>(null);
  const [scrub, setScrub] = useState<number | null>(null);
  const [pending, setPending] = useState<number | null>(null);
  const [overDot, setOverDot] = useState(false);
  const [fineRateLabel, setFineRateLabel] = useState<string | null>(null);
  const [isSnapped, setIsSnapped] = useState(false);
  const pendingAtRef = useRef<number | null>(null);
  const pointerDownRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const positionRef = useRef(0);
  const { settings } = useSettings();
  const baseDot = Math.min(Math.max(settings.seekDotSize ?? 16, 8), 200);
  const { active: trickplayActive, bufferedOnly } = useTrickplayState();
  const position = usePlaybackPositionGated(active);
  const buffered = usePlaybackBufferedGated(active);
  const downloaded = usePlaybackDownloadedGated(active);
  const dur = durationSec || 1;
  const value = scrub ?? pending ?? position;
  const pct = Math.max(0, Math.min(1, value / dur)) * 100;
  const cacheFill = Math.max(0, Math.min(1, (position + buffered) / dur));
  const fullyCached = downloaded >= 0.999;
  const bufferedPct = useMemo(
    () =>
      fullyCached || settings.seekBarFill === false ? 0 : Math.max(cacheFill, downloaded) * 100,
    [fullyCached, settings.seekBarFill, cacheFill, downloaded],
  );
  const skipSegments = useSkipSegmentsView();
  const sharedMarks = useSharedMarks();
  const segmentSpans = useMemo(
    () =>
      skipSegments
        .filter((s) => s.endSec > s.startSec && durationSec > 0)
        .map((s) => ({
          startPct: Math.max(0, Math.min(100, (s.startSec / dur) * 100)),
          endPct: Math.max(0, Math.min(100, (s.endSec / dur) * 100)),
          color: s.kind === "ad" ? "rgba(239,68,68,0.9)" : undefined,
        })),
    [skipSegments, durationSec, dur],
  );

  const snapThresholdSec = useMemo(() => {
    const width = ref.current?.clientWidth ?? 1000;
    return (dur / Math.max(width, 100)) * 12; // ~12px magnetic snap zone
  }, [dur]);

  const snapToBoundaries = useCallback(
    (sec: number): { time: number; snapped: boolean } => {
      const targets: number[] = [];
      for (const c of chapters) {
        if (c.startSec > 0 && c.startSec < dur) targets.push(c.startSec);
      }
      for (const s of skipSegments) {
        if (s.startSec > 0 && s.startSec < dur) targets.push(s.startSec);
        if (s.endSec > 0 && s.endSec < dur) targets.push(s.endSec);
      }
      for (const target of targets) {
        if (Math.abs(sec - target) <= snapThresholdSec) {
          return { time: target, snapped: true };
        }
      }
      return { time: sec, snapped: false };
    },
    [chapters, skipSegments, dur, snapThresholdSec],
  );

  const hoverChapter = useMemo(() => {
    if (hover == null || chapters.length === 0) return null;
    let found: Chapter | null = null;
    for (let i = 0; i < chapters.length; i++) {
      if (chapters[i].startSec <= hover) found = chapters[i];
      else break;
    }
    return found?.title?.trim() || null;
  }, [hover, chapters]);

  const clearInteraction = () => {
    setScrub(null);
    setHover(null);
    setOverDot(false);
    setFineRateLabel(null);
    setIsSnapped(false);
    pointerDownRef.current = null;
  };

  useEffect(() => {
    setSeekHovering(hover != null || scrub != null);
    setSeekScrubbing(scrub != null);
  }, [hover, scrub]);
  useEffect(
    () => () => {
      setSeekHovering(false);
      setSeekScrubbing(false);
    },
    [],
  );
  useEffect(() => {
    const handleClear = () => {
      setHover(null);
      setOverDot(false);
      setSeekHovering(false);
    };
    window.addEventListener("argus:clear-player-hover", handleClear);
    return () => window.removeEventListener("argus:clear-player-hover", handleClear);
  }, []);
  useEffect(() => {
    positionRef.current = position;
  }, [position]);
  useEffect(() => {
    const clearInterruptedInteraction = () => {
      setScrub(null);
      setHover(null);
    };
    const onVisibilityChange = () => {
      if (document.visibilityState !== "visible") clearInterruptedInteraction();
    };
    window.addEventListener("blur", clearInterruptedInteraction);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      window.removeEventListener("blur", clearInterruptedInteraction);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, []);
  useEffect(() => {
    if (pending == null) return;
    let frameId: number;
    const check = () => {
      if (
        Math.abs(positionRef.current - pending) < 0.75 ||
        Date.now() - (pendingAtRef.current ?? 0) >= PENDING_MAX_MS
      ) {
        setPending(null);
        pendingAtRef.current = null;
      } else {
        frameId = requestAnimationFrame(check);
      }
    };
    frameId = requestAnimationFrame(check);
    return () => cancelAnimationFrame(frameId);
  }, [pending]);

  const fromEvent = (
    clientX: number,
    clientY?: number,
  ): { time: number; snapped: boolean; rateLabel: string | null } => {
    const r = ref.current?.getBoundingClientRect();
    if (!r || r.width <= 0) return { time: 0, snapped: false, rateLabel: null };

    let rate = 1;
    let rateLabel: string | null = null;
    if (clientY != null && pointerDownRef.current != null) {
      const dy = Math.max(0, pointerDownRef.current.y - clientY);
      if (dy >= 120) {
        rate = 0.1;
        rateLabel = "Fine (0.1×)";
      } else if (dy >= 75) {
        rate = 0.25;
        rateLabel = "Fine (1/4×)";
      } else if (dy >= 35) {
        rate = 0.5;
        rateLabel = "Fine (1/2×)";
      }
    }

    let rawTime: number;
    if (rate < 1 && pointerDownRef.current != null) {
      const deltaX = clientX - pointerDownRef.current.x;
      const initialTime = pointerDownRef.current.time;
      rawTime = Math.max(0, Math.min(dur, initialTime + (deltaX / r.width) * dur * rate));
    } else {
      const x = Math.max(0, Math.min(1, (clientX - r.left) / r.width));
      rawTime = x * dur;
    }

    const { time, snapped } = snapToBoundaries(rawTime);
    return { time, snapped, rateLabel };
  };

  const onMove = (e: React.PointerEvent) => {
    const isScrubbing = scrub != null;
    const { time, snapped, rateLabel } = fromEvent(e.clientX, isScrubbing ? e.clientY : undefined);
    setHover(time);
    setIsSnapped(snapped);
    if (isScrubbing) {
      setScrub(time);
      setFineRateLabel(rateLabel);
    }
    const r = ref.current?.getBoundingClientRect();
    if (r && r.width > 0) {
      const pointerX = e.clientX - r.left;
      const dotX = (positionRef.current / dur) * r.width;
      setOverDot(Math.abs(pointerX - dotX) <= baseDot / 2 + 8);
    }
  };
  const onLeave = useCallback(() => {
    setHover(null);
    setOverDot(false);
    setIsSnapped(false);
  }, []);
  const hoverGuardRef = useRef(false);
  hoverGuardRef.current = hover != null && scrub == null;
  useHoverExitGuard(ref, hoverGuardRef, onLeave);
  const onCancel = () => clearInteraction();
  const onDown = (e: React.PointerEvent) => {
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}
    setPending(null);
    pendingAtRef.current = null;
    const { time, snapped, rateLabel } = fromEvent(e.clientX, e.clientY);
    pointerDownRef.current = { x: e.clientX, y: e.clientY, time };
    setScrub(time);
    setIsSnapped(snapped);
    setFineRateLabel(rateLabel);
  };
  const onUp = (e: React.PointerEvent) => {
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {}
    pointerDownRef.current = null;
    setFineRateLabel(null);
    setIsSnapped(false);
    if (scrub != null) {
      onSeek(scrub);
      setPending(scrub);
      pendingAtRef.current = Date.now();
    }
    setScrub(null);
  };

  return (
    <div dir="ltr" className="pointer-events-auto group/seek relative h-12">
      {fineRateLabel && (
        <div className="pointer-events-none absolute -top-14 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1.5 rounded-full border border-white/20 bg-black/90 px-3 py-1 text-[11px] font-bold text-amber-400 shadow-2xl backdrop-blur-xl animate-[argus-fade-in_150ms_ease-out]">
          <span>⚡</span>
          <span>{fineRateLabel}</span>
        </div>
      )}
      <div
        ref={ref}
        data-player-seekbar
        onPointerMove={onMove}
        onPointerLeave={onLeave}
        onPointerDown={onDown}
        onPointerUp={onUp}
        onPointerCancel={onCancel}
        onClick={(e) => {
          if (e.isTrusted) return;
          const { time } = fromEvent(e.clientX);
          setPending(time);
          pendingAtRef.current = Date.now();
          onSeek(time);
        }}
        className="absolute inset-x-0 top-1/2 -translate-y-1/2 cursor-pointer"
      >
        <SeekBarVisual
          settings={settings}
          pct={pct}
          bufferedPct={bufferedPct}
          scrubbing={scrub != null}
          hovered={hover != null}
          segments={segmentSpans}
          durationSec={durationSec}
          chapters={chapters}
          hoverSec={hover}
        />
        {sharedMarks.map((mark, index) =>
          durationSec > 0 && mark.sec >= 0 && mark.sec <= durationSec ? (
            <span
              key={`shared-${mark.sec}-${index}`}
              title={`${mark.name}: ${mark.note || formatTimestamp(mark.sec)}`}
              aria-hidden
              className="pointer-events-none absolute top-1/2 z-[3] h-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber-300 shadow-[0_0_3px_rgba(0,0,0,0.8)]"
              style={{ left: `${(mark.sec / durationSec) * 100}%`, width: 3 }}
            />
          ) : null,
        )}
        {settings.seekBarChapters !== false &&
          chapters.length < 2 &&
          durationSec > 0 &&
          chapters
            .filter((chapter) => chapter.startSec > 0 && chapter.startSec < durationSec)
            .map((chapter, index) => (
              <span
                key={`${chapter.startSec}-${index}`}
                title={chapter.title || `Chapter ${index + 1}`}
                aria-hidden
                className="pointer-events-none absolute top-1/2 z-[2] h-3 -translate-x-1/2 -translate-y-1/2 border-l border-black/65 bg-white/90 shadow-[0_0_2px_rgba(0,0,0,0.8)]"
                style={{ left: `${(chapter.startSec / durationSec) * 100}%`, width: 1 }}
              />
            ))}
        {hover != null &&
          !(overDot && scrub == null) &&
          (trickplayActive ? (
            <ThumbPreview
              time={hover}
              dur={dur}
              chapterTitle={hoverChapter}
              canFetch={!bufferedOnly || hover <= position + Math.max(0, buffered - BUFFER_PAD_SEC)}
            />
          ) : (
            <div
              className={`pointer-events-none absolute -top-9 -translate-x-1/2 flex items-center gap-1.5 whitespace-nowrap rounded-md border border-white/10 bg-black/90 px-2.5 py-1 text-[12px] font-semibold text-white shadow-lg backdrop-blur-md transition-all duration-75 ${
                isSnapped ? "ring-2 ring-amber-400/80 bg-black" : ""
              }`}
              style={{ left: `${(hover / dur) * 100}%` }}
            >
              {hoverChapter && (
                <>
                  <span className="max-w-[140px] truncate text-white/80 font-medium">
                    {hoverChapter}
                  </span>
                  <span className="text-white/40">·</span>
                </>
              )}
              <span className="font-mono tabular-nums">{fmtTime(hover)}</span>
              <span className="font-mono text-white/45 text-[11px] tabular-nums">
                (-{fmtTime(Math.max(0, dur - hover))})
              </span>
              {isSnapped && (
                <span className="rounded bg-amber-400/25 px-1 py-0.5 font-sans text-[9px] font-bold uppercase tracking-wider text-amber-300">
                  Snap
                </span>
              )}
            </div>
          ))}
      </div>
    </div>
  );
}
