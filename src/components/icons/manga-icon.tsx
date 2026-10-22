export function MangaIcon({ active = false }: { active?: boolean }) {
  return (
    <svg
      width="26"
      height="26"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      style={{ overflow: "visible" }}
    >
      <g
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill={active ? "currentColor" : "none"}
        fillOpacity={active ? 0.18 : 0}
      >
        <path d="M12 6.5 C9.5 5 6.5 4.8 4 5.5 L4 18.5 C6.5 17.8 9.5 18 12 19.5 C14.5 18 17.5 17.8 20 18.5 L20 5.5 C17.5 4.8 14.5 5 12 6.5 Z" />
        <path d="M12 6.5 L12 19.5" fill="none" />
      </g>
    </svg>
  );
}
