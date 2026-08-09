'use client';

import { useState } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase/browser';
import { Button } from '@/components/ui/Button';
import { SITE_URL } from '@/lib/site';
import type { Locale } from '@/lib/i18n/config';
import type { Dictionary } from '@/lib/i18n/types';

type Props = {
  locale: Locale;
  labels: Dictionary['auth']['login'];
};

type SsoProvider = 'google' | 'azure';

// Provisionerad inloggning: knapparna kör hela vägen client-side (full-page
// redirect till IdP:ns samtyckesskärm). Gating (invite-match / domän-match /
// avslag) sker i /api/auth/callback när IdP:n skickar tillbaka koden.
export function SsoButtons({ locale, labels }: Props) {
  const [pendingProvider, setPendingProvider] = useState<SsoProvider | null>(null);
  const [hasError, setHasError] = useState(false);

  async function handleSignIn(provider: SsoProvider) {
    setHasError(false);
    setPendingProvider(provider);

    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${SITE_URL}/api/auth/callback?next=/${locale}/app`,
      },
    });

    // Vid framgång navigerar webbläsaren bort till IdP:n innan detta ens hinner
    // köras — den här grenen täcker bara det ovanliga fallet att anropet
    // misslyckas innan redirecten (t.ex. nätverksfel).
    if (error) {
      setHasError(true);
      setPendingProvider(null);
    }
  }

  return (
    <div className="space-y-3">
      <Button
        type="button"
        variant="outline"
        className="w-full"
        disabled={pendingProvider !== null}
        onClick={() => handleSignIn('google')}
      >
        {labels.ssoGoogle}
      </Button>
      <Button
        type="button"
        variant="outline"
        className="w-full"
        disabled={pendingProvider !== null}
        onClick={() => handleSignIn('azure')}
      >
        {labels.ssoMicrosoft}
      </Button>
      {hasError ? (
        <p role="alert" className="text-sm text-[var(--color-error)]">
          {labels.errorGeneric}
        </p>
      ) : null}
    </div>
  );
}
