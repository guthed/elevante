import Link from 'next/link';

export default function PublicNotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 py-16 text-center">
      <h1 className="font-serif text-5xl text-[var(--color-primary)]">404</h1>
      <p className="mt-6 max-w-md text-lg text-[var(--color-ink-muted)]">
        Sidan finns inte. Den kan ha flyttats eller så är länken trasig.
      </p>
      <Link
        href="/sv"
        className="mt-10 rounded-full bg-[var(--color-accent)] px-7 py-3.5 text-base font-medium text-white hover:bg-[var(--color-accent-600)]"
      >
        Tillbaka till startsidan
      </Link>
    </div>
  );
}
