'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from './Button';
import { GoogleAnalytics } from './Analytics';

const STORAGE_KEY = 'elevante-cookie-consent';
type Consent = 'accepted' | 'rejected';

// GDPR/ePrivacy: Google Analytics laddas inte förrän användaren aktivt
// accepterat. Nödvändiga cookies (inloggning) är alltid på. Samtycket sparas i
// localStorage — själva samtyckeslagringen är "nödvändig" och kräver inget
// samtycke. Bannern kan öppnas igen via window-eventet nedan (se cookie-sidan).
export function CookieConsent({ locale }: { locale: 'sv' | 'en' }) {
  const sv = locale === 'sv';
  const [consent, setConsent] = useState<Consent | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === 'accepted' || stored === 'rejected') {
      setConsent(stored);
    } else {
      setOpen(true);
    }
    const reopen = () => setOpen(true);
    window.addEventListener('elevante:open-cookie-settings', reopen);
    return () =>
      window.removeEventListener('elevante:open-cookie-settings', reopen);
  }, []);

  function choose(value: Consent) {
    const previous = consent;
    window.localStorage.setItem(STORAGE_KEY, value);
    setConsent(value);
    setOpen(false);
    // Om GA redan laddats och användaren nu avböjer — ladda om för att stoppa
    // vidare spårning fullt ut.
    if (previous === 'accepted' && value === 'rejected') {
      window.location.reload();
    }
  }

  return (
    <>
      {consent === 'accepted' ? <GoogleAnalytics /> : null}
      {open ? (
        <div
          role="region"
          aria-label={sv ? 'Cookie-samtycke' : 'Cookie consent'}
          className="animate-page-in fixed inset-x-0 bottom-0 z-50 px-4 pb-4"
        >
          <div className="container-content flex flex-col gap-4 rounded-[16px] border border-[var(--color-sand)] bg-[var(--color-surface)] p-5 shadow-[0_-8px_30px_-12px_rgba(26,26,46,0.18)] md:flex-row md:items-center md:justify-between md:gap-8 md:p-6">
            <p className="text-[0.9375rem] leading-relaxed text-[var(--color-ink-secondary)]">
              {sv
                ? 'Vi använder nödvändiga cookies för att sajten ska fungera, och – med ditt samtycke – Google Analytics för anonym besöksstatistik. '
                : 'We use necessary cookies to make the site work and – with your consent – Google Analytics for anonymous visitor statistics. '}
              <Link
                href={`/${locale}/cookies`}
                className="whitespace-nowrap text-[var(--color-ink)] underline underline-offset-4 hover:text-[var(--color-coral)]"
              >
                {sv ? 'Läs mer' : 'Read more'}
              </Link>
            </p>
            <div className="flex shrink-0 gap-3">
              <Button
                type="button"
                variant="ghost"
                size="md"
                onClick={() => choose('rejected')}
              >
                {sv ? 'Endast nödvändiga' : 'Only necessary'}
              </Button>
              <Button
                type="button"
                variant="primary"
                size="md"
                onClick={() => choose('accepted')}
              >
                {sv ? 'Acceptera' : 'Accept'}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
