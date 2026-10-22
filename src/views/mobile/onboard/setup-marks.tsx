import tmdbMark from "@/assets/addon-logos/tmdb.png";
import stremioMark from "@/assets/stremio.png";
import { ArgusMark } from "@/components/icons/argus-mark";
import type { SetupStepId } from "./setup-wire";

/**
 * The real mark of whatever the step is about. Argus's own is the inline
 * component rather than argus-wordmark.svg, which bakes a fill hex into a
 * <style> block and so cannot follow a token.
 */
export function StepMark({ step, className }: { step: SetupStepId; className: string }) {
  if (step === "argus") return <ArgusMark className={`${className} text-ink`} />;
  return (
    <img
      src={step === "tmdb" ? tmdbMark : stremioMark}
      alt=""
      aria-hidden
      className={`${className} rounded-[22%] object-contain`}
    />
  );
}
