import { SchoolLogo } from './SchoolLogo';

type Props = {
  schoolName: string;
  // Underrad: roll, samt klass för elever (t.ex. "Elev · NA1A").
  roleLabel: string;
  className?: string | null;
  logoSize?: number;
};

export function SchoolBadge({
  schoolName,
  roleLabel,
  className,
  logoSize = 32,
}: Props) {
  const sub = className ? `${roleLabel} · ${className}` : roleLabel;
  return (
    <div className="flex items-center gap-3">
      <SchoolLogo size={logoSize} className="shrink-0" />
      <div className="min-w-0">
        <p className="truncate text-[0.9375rem] font-semibold leading-tight tracking-tight text-[var(--color-ink)]">
          {schoolName}
        </p>
        <p className="truncate text-[0.75rem] leading-tight text-[var(--color-ink-muted)]">
          {sub}
        </p>
      </div>
    </div>
  );
}
