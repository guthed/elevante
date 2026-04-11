'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/Button';

export default function PublicError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[public] error boundary caught:', error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 py-16 text-center">
      <h1 className="font-serif text-3xl text-[var(--color-primary)]">
        Något gick fel
      </h1>
      <p className="mt-4 max-w-md text-[var(--color-ink-muted)]">
        Vi kunde inte ladda sidan. Försök igen, eller hör av dig till oss.
      </p>
      <div className="mt-8">
        <Button onClick={reset}>Försök igen</Button>
      </div>
    </div>
  );
}
