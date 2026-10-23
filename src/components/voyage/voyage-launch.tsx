import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ArgusEyeLoader } from "@/components/argus-eye-loader";
import { useT } from "@/lib/i18n";

export type LaunchThumb = { src: string; rect: DOMRect };

const RECT_W = 134.938;
const RECT_H = 211.844;
const EYE_MS = 1700;
const CROSSFADE_MS = 240;

function reduced(): boolean {
  return typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
}

export function VoyageLaunch({ thumbs, onDone }: { thumbs: LaunchThumb[]; onDone: () => void }) {
  const t = useT();
  const skipRef = useRef<HTMLButtonElement>(null);
  const cloneRefs = useRef<(HTMLDivElement | null)[]>([]);
  const doneRef = useRef(onDone);
  doneRef.current = onDone;
  const completed = useRef(false);
  const [phase, setPhase] = useState<"gathering" | "eye">("gathering");
  const cast = useRef(thumbs).current;
  const three = useRef(thumbs.slice(0, 3)).current;
  const finish = useCallback(() => {
    if (completed.current) return;
    completed.current = true;
    doneRef.current();
  }, []);

  useEffect(() => {
    if (reduced()) { finish(); return; }
    // Let the app's pointer-down cleanup finish before moving focus into the launch.
    const focusFrame = requestAnimationFrame(() => skipRef.current?.focus({ preventScroll: true }));
    let cancelled = false;
    let hold = 0;
    const animations: Animation[] = [];
    const width = Math.min(128, window.innerWidth * .16);
    const height = width * RECT_H / RECT_W;
    const gap = Math.min(18, window.innerWidth * .02);
    const startX = (window.innerWidth - three.length * width - (three.length - 1) * gap) / 2;
    const gathered = three.map((_, i) => new DOMRect(startX + i * (width + gap), (window.innerHeight - height) / 2, width, height));
    const transformTo = (from: DOMRect, to: DOMRect) =>
      `translate(${to.left - from.left}px, ${to.top - from.top}px) scale(${to.width / from.width}, ${to.height / from.height})`;
    const run = async () => {
      // Every visible confirmation poster participates; only the visual cast reduces to three.
      const collecting = cast.map((thumb, i) => {
        const el = cloneRefs.current[i];
        if (!el) return Promise.resolve();
        const to = gathered[i % gathered.length];
        const frames: Keyframe[] = i < three.length
          ? [{ transform: "none" }, { transform: transformTo(thumb.rect, to) }]
          : [{ transform: "none", opacity: 1 }, { opacity: .65, offset: .45 }, { transform: transformTo(thumb.rect, to), opacity: 0 }];
        const animation = el.animate(frames, { duration: 520, delay: i * 18, easing: "ease-in-out", fill: "forwards" });
        animations.push(animation);
        return animation.finished;
      });
      await Promise.allSettled(collecting);
      if (cancelled || completed.current) return;
      setPhase("eye");
      hold = window.setTimeout(finish, EYE_MS);
    };
    void run();
    // A failed animation must never strand the user on the launch screen.
    const bail = window.setTimeout(finish, 12000);
    return () => {
      cancelled = true;
      cancelAnimationFrame(focusFrame);
      window.clearTimeout(hold);
      window.clearTimeout(bail);
      animations.forEach(animation => animation.cancel());
    };
  }, [cast, three, finish]);

  return createPortal(
    <div className="animate-voyage-launch-in fixed inset-0 z-[1200] bg-canvas" data-voyage-launch data-phase={phase} data-tv-focus-scope>
      <div aria-hidden data-voyage-eye className="pointer-events-none absolute inset-0 flex items-center justify-center transition-opacity ease-in-out" style={{ opacity: phase === "eye" ? 1 : 0, transitionDuration: `${CROSSFADE_MS}ms` }}>
        <ArgusEyeLoader className="h-[min(40vh,40vw)] w-[min(40vh,40vw)] text-ink" />
      </div>
      {cast.map((thumb, i) => (
        <div key={i} ref={el => { cloneRefs.current[i] = el; }} aria-hidden data-voyage-flying-poster
          className="pointer-events-none absolute overflow-hidden transition-opacity ease-in-out"
          style={{ left: thumb.rect.left, top: thumb.rect.top, width: thumb.rect.width, height: thumb.rect.height,
            transformOrigin: "top left", borderRadius: Math.max(4, thumb.rect.width * .06),
            opacity: phase === "eye" ? 0 : 1, transitionDuration: `${CROSSFADE_MS}ms`, zIndex: i < 3 ? 2 : 1 }}>
          <img src={thumb.src} alt="" draggable={false} className="h-full w-full object-cover" />
        </div>
      ))}
      <button ref={skipRef} type="button" data-tv-modal-close onClick={finish} aria-label={t("Skip the launch")}
        onKeyDown={e => { if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); finish(); } }}
        className="absolute inset-0 z-10 cursor-pointer focus-visible:outline-none">
        <span className="absolute inset-x-0 bottom-8 text-center text-[12px] font-medium text-ink-subtle">{t("Click anywhere to skip")}</span>
      </button>
    </div>, document.body,
  );
}
