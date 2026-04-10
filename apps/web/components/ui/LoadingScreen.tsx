import { Spinner } from './Spinner';

type Props = {
  label?: string;
};

export function LoadingScreen({ label }: Props) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex min-h-[50vh] flex-col items-center justify-center gap-4"
    >
      <Spinner size="lg" label={label} />
      {label ? (
        <p className="text-sm text-[var(--color-ink-subtle)]">{label}</p>
      ) : null}
    </div>
  );
}
