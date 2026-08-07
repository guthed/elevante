'use client';

import { useActionState } from 'react';
import { claimInvite, type ClaimInviteState } from '@/app/actions/invites';
import { Field, Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import type { Locale } from '@/lib/i18n/config';
import type { Dictionary } from '@/lib/i18n/types';

type Props = {
  locale: Locale;
  token: string;
  email: string;
  fullName: string;
  labels: Dictionary['auth']['claim'];
};

const initialState: ClaimInviteState = { status: 'idle' };

export function ClaimInviteForm({ locale, token, email, fullName, labels }: Props) {
  const [state, formAction, pending] = useActionState(claimInvite, initialState);

  const errorMessage =
    state.status === 'error'
      ? state.code === 'invalid'
        ? labels.errorInvalid
        : state.code === 'invite-invalid'
          ? labels.errorInviteInvalid
          : labels.errorGeneric
      : null;

  return (
    <form action={formAction} className="space-y-5" noValidate>
      <input type="hidden" name="token" value={token} />
      <input type="hidden" name="locale" value={locale} />

      <Field id="email" label={labels.emailLabel}>
        {/* Bara visning — den inbjudna kan inte ändra vilken e-post inviten gäller. */}
        <Input id="email" type="email" value={email} disabled readOnly />
      </Field>

      <Field id="name" label={labels.nameLabel}>
        <Input
          id="name"
          name="name"
          type="text"
          required
          defaultValue={fullName}
          autoComplete="name"
          invalid={state.status === 'error' && state.code === 'invalid'}
        />
      </Field>

      <Field id="password" label={labels.passwordLabel} hint={labels.passwordHint}>
        <Input
          id="password"
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          invalid={state.status === 'error' && state.code === 'invalid'}
        />
      </Field>

      {errorMessage ? (
        <p role="alert" className="text-sm text-[var(--color-error)]">
          {errorMessage}
        </p>
      ) : null}

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? labels.submitting : labels.submit}
      </Button>
    </form>
  );
}
