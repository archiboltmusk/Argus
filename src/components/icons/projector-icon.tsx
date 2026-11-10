export function ProjectorIcon({ active }: { active?: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={active ? 2.2 : 1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-[26px] w-[26px] p-[2px]"
      aria-hidden="true"
    >
      {/* Projector Body */}
      <rect x="2" y="7" width="20" height="9" rx="2" />
      {/* Projector Lens with Beam */}
      <circle cx="7" cy="11.5" r="2.5" />
      <path d="M14 10h4" />
      <path d="M14 13h2" />
      {/* Projector Feet */}
      <path d="M6 16v2" />
      <path d="M18 16v2" />
      {/* Projection Light Beam */}
      <path d="M19 9l3-2" opacity="0.6" />
      <path d="M19 14l3 2" opacity="0.6" />
    </svg>
  );
}
