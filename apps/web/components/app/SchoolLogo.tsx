// Logotyp för skolan (demo). Ren SVG-emblem (öppen bok) — skarp & theme-bar.

type Props = {
  size?: number;
  className?: string;
};

export function SchoolLogo({ size = 32, className }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-hidden="true"
      className={className}
    >
      <rect width="32" height="32" rx="9" fill="var(--color-ink)" />
      <path
        d="M16 9.5c-2.1-1.3-4.8-1.6-7.2-1v12.8c2.4-.6 5.1-.3 7.2 1 2.1-1.3 4.8-1.6 7.2-1V8.5c-2.4-.6-5.1-.3-7.2 1Z"
        fill="none"
        stroke="var(--color-canvas)"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <line
        x1="16"
        y1="9.5"
        x2="16"
        y2="22.3"
        stroke="var(--color-canvas)"
        strokeWidth="1.6"
      />
      <circle cx="16" cy="6.5" r="1.4" fill="var(--color-sage)" />
    </svg>
  );
}
