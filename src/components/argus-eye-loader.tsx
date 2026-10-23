const ALMOND = "M32 12C18 12 7 24 3 32c4 8 15 20 29 20s25-12 29-20C57 24 46 12 32 12Z";

/** The Argus eye opening and closing: lids sweep shut, the iris glances
    sideways, and the pupil breathes while it is open. Pure CSS, so it runs on
    TV hardware where lottie is too heavy. */
export function ArgusEyeLoader({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" fill="none" aria-hidden className={`argus-eye ${className}`}>
      <defs>
        <clipPath id="argus-eye-clip">
          <path d={ALMOND} />
        </clipPath>
      </defs>
      <g className="argus-eye-ball" clipPath="url(#argus-eye-clip)">
        <g className="argus-eye-iris">
          <circle cx="32" cy="32" r="12" stroke="currentColor" strokeWidth="6" />
          <circle className="argus-eye-pupil" cx="32" cy="32" r="6" fill="currentColor" />
        </g>
      </g>
      <path className="argus-eye-lid argus-eye-lid-top" d="M3 32C7 24 18 12 32 12s25 12 29 20" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
      <path className="argus-eye-lid argus-eye-lid-bottom" d="M3 32c4 8 15 20 29 20s25-12 29-20" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}
