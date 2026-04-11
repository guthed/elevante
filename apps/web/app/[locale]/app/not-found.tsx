import Link from 'next/link';

export default function AppNotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 py-16 text-center">
      <h1 className="font-serif text-3xl text-[var(--color-primary)]">
        Den sidan finns inte
      </h1>
      <p className="mt-4 max-w-md text-[var(--color-ink-muted)]">
        Antingen är länken trasig, eller så har sidan flyttats. Gå tillbaka till
        översikten så kommer du rätt.
      </p>
      <Link
        href="/sv/app"
        className="mt-8 rounded-full bg-[var(--color-accent)] px-6 py-3 text-sm font-medium text-white hover:bg-[var(--color-accent-600)]"
      >
        Tillbaka till appen
      </Link>
    </div>
  );
}
