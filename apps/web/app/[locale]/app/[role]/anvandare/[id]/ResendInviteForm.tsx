'use client';

import { useActionState } from 'react';
import { resendInvite, type ResendInviteState } from '@/app/actions/admin';
import { Button } from '@/components/ui/Button';
import type { Dictionary } from '@/lib/i18n/types';
import type { Locale } from '@/lib/i18n/config';

type Props = {
  userId: string;
  locale: Locale;
  labels: Dictionary['app']['pages']['admin']['users']['detail'];
};

const initialState: ResendInviteState = { status: 'idle' };

export function ResendInviteForm({ userId, locale, labels }: Props) {
  const [state, formAction, pending] = useActionState(resendInvite, initialState);

  return (
    <form action={formAction} className="space-y-2 border-t border-[var(--color-sand)] pt-4">
      <input type="hidden" name="user_id" value={userId} />
      <input type="hidden" name="locale" value={locale} />
      <p className="text-sm font-medium text-[var(--color-primary)]">{labels.resendHeading}</p>
      <p className="text-xs text-[var(--color-ink-subtle)]">{labels.resendHint}</p>
      <Button type="submit" disabled={pending} size="sm" variant="outline">
        {pending ? labels.resendSending : labels.resendSubmit}
      </Button>
      {state.status === 'success' ? (
        <p role="status" className="text-xs text-[var(--color-success)]">
          {labels.resendSuccess.replace('{email}', state.email)}
        </p>
      ) : null}
      {state.status === 'error' ? (
        <p role="alert" className="text-xs text-[var(--color-error)]">
          {labels.resendErrorGeneric}
        </p>
      ) : null}
    </form>
  );
}
