export function Bolt({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <path d="M18 4 8 18h7l-2 10 11-15h-7z" fill="currentColor" />
    </svg>
  );
}

export default function Logo({ size = 36 }) {
  return (
    <span className="logo">
      <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" className="logo-icon">
        <rect width="32" height="32" rx="8" fill="var(--accent)" />
        <path d="M18 4 8 18h7l-2 10 11-15h-7z" fill="#fff" />
      </svg>
      <span className="logo-text">
        Flash<b>Varta</b>
      </span>
    </span>
  );
}
