'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabase/browser';
import type { Locale } from '@/lib/i18n/config';

type Props = {
  locale: Locale;
};

type Status = 'processing' | 'error';

export function ConfirmClient({ locale }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<Status>('processing');
  const sv = locale === 'sv';

  // `next` är en vanlig query-param (INTE i fragmentet) — Next.js läser
  // den fint via useSearchParams(). Fallback: appöversikten för localen.
  const next = searchParams.get('next') ?? `/${locale}/app`;

  useEffect(() => {
    // Admin-inbjudningar (Auth Admin API) använder implicit flow: Supabase
    // lägger access_token/refresh_token i URL-fragmentet (#...), som ALDRIG
    // skickas till servern — bara webbläsar-JS kan läsa window.location.hash.
    const hash = window.location.hash.startsWith('#')
      ? window.location.hash.slice(1)
      : window.location.hash;

    // Städa bort tokens ur URL/historik omedelbart — innan vi ens hunnit
    // avgöra utfallet. Annars ligger access_token/refresh_token synliga i
    // adressfältet och webbläsarhistoriken på 3 av 4 grenar nedan (och även
    // på success-grenen finns ett fönster innan router.replace() städar).
    window.history.replaceState(null, '', window.location.pathname + window.location.search);

    const hashParams = new URLSearchParams(hash);

    const errorDescription = hashParams.get('error_description');
    const hashError = hashParams.get('error');
    const accessToken = hashParams.get('access_token');
    const refreshToken = hashParams.get('refresh_token');

    if (hashError || errorDescription) {
      setStatus('error');
      return;
    }

    if (!accessToken || !refreshToken) {
      setStatus('error');
      return;
    }

    let cancelled = false;
    const supabase = createSupabaseBrowserClient();
    supabase.auth
      .setSession({ access_token: accessToken, refresh_token: refreshToken })
      .then(({ error }) => {
        if (cancelled) return;
        if (error) {
          setStatus('error');
          return;
        }
        router.replace(next);
      })
      .catch(() => {
        if (!cancelled) setStatus('error');
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--color-canvas)] px-6">
      <div className="w-full max-w-sm text-center">
        {status === 'processing' ? (
          <p className="text-[0.9375rem] text-[var(--color-ink-secondary)]">
            {sv ? 'Loggar in…' : 'Signing in…'}
          </p>
        ) : (
          <div>
            <h1 className="font-serif text-[1.75rem] leading-tight text-[var(--color-ink)]">
              {sv ? 'Länken fungerar inte längre' : 'This link no longer works'}
            </h1>
            <p role="alert" className="mt-4 text-sm text-[var(--color-error)]">
              {sv
                ? 'Inbjudningslänken kan ha gått ut eller redan använts. Be din administratör att skicka en ny inbjudan.'
                : 'The invite link may have expired or already been used. Ask your administrator to resend the invitation.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
