export function ArgusMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" fill="currentColor" aria-hidden className={className}>
      <path className="argus-mark-lid" d="M32 12C18 12 7 24 3 32c4 8 15 20 29 20s25-12 29-20C57 24 46 12 32 12Zm0 8a12 12 0 1 1 0 24 12 12 0 0 1 0-24Z" />
      <path className="argus-mark-pupil" d="M32 26a6 6 0 1 0 0 12 6 6 0 0 0 0-12Z" />
    </svg>
  );
}
