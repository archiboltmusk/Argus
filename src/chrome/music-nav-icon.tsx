export function MusicNavIcon({ active }: { active: boolean }) {
  const stroke = active ? "var(--color-accent)" : "currentColor";
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M9 17.5V6.5l10-2v11" stroke={stroke} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="6.5" cy="17.5" r="2.5" stroke={stroke} strokeWidth="1.9" />
      <circle cx="16.5" cy="15.5" r="2.5" stroke={stroke} strokeWidth="1.9" />
    </svg>
  );
}
