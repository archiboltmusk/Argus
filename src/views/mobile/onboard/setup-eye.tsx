/**
 * Argus's mark, taken apart so the setup flow can build it one confirmed step
 * at a time. The path data is copied from components/icons/argus-mark.tsx.
 * Each part gets its own <svg> so every transform here is plain CSS pixels.
 */
const VIEW_BOX = "0 0 64 64";

const LID_D =
  "M32 12C18 12 7 24 3 32c4 8 15 20 29 20s25-12 29-20C57 24 46 12 32 12Zm0 8a12 12 0 1 1 0 24 12 12 0 0 1 0-24Z";
const PUPIL_D = "M32 26a6 6 0 1 0 0 12 6 6 0 0 0 0-12Z";

type Part = "lid" | "pupil";

/** Earned order. The lid is the first thing that exists, the pupil opens last. */
const BUILD_ORDER: readonly Part[] = ["lid", "pupil"];
/** Paint order. */
const PAINT_ORDER: readonly Part[] = ["lid", "pupil"];

export const EYE_PARTS = BUILD_ORDER.length;

const PATH_OF: Record<Part, string> = { lid: LID_D, pupil: PUPIL_D };
const HOIST_OF: Record<Part, string> = {
  lid: "setup-hoist-hull",
  pupil: "setup-hoist-sail",
};
const LAG = ["", "setup-lag-1", "setup-lag-2"];

/** How much of the eye a run of steps is worth, so a one-step queue still
    finishes with a whole eye and a skipped step never fakes one. */
export function eyeBuilt(confirmed: number, total: number): number {
  if (total <= 0 || confirmed <= 0) return 0;
  return Math.min(EYE_PARTS, Math.ceil((EYE_PARTS * confirmed) / total));
}

export function SetupEye({
  built,
  animate = "none",
  ghost,
  className,
}: {
  built: number;
  animate?: "none" | "latest" | "all";
  /** Draws the parts not yet earned at a whisper, so the shape the viewer is
      filling in is visible from the first screen and each hoist lands into
      something. Off at the finish, where a missing sail would only nag. */
  ghost?: boolean;
  className?: string;
}) {
  return (
    <span className={`setup-eye ${className ?? ""}`} aria-hidden>
      {PAINT_ORDER.map((part) => {
        const step = BUILD_ORDER.indexOf(part);
        const earned = step < built;
        if (!earned && !ghost) return null;
        const hoist = !earned
          ? "opacity-[0.11]"
          : animate === "all"
            ? `${HOIST_OF[part]} ${LAG[step]}`
            : animate === "latest" && step === built - 1
              ? HOIST_OF[part]
              : "";
        return (
          <svg key={part} viewBox={VIEW_BOX} fill="currentColor" className={`setup-eye-part ${hoist}`}>
            <path d={PATH_OF[part]} />
          </svg>
        );
      })}
    </span>
  );
}
