'use client';

import { useActionState } from 'react';
import { signUp, type AuthState } from '@/app/actions/auth';
import { Field, Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import type { Locale } from '@/lib/i18n/config';
import type { Dictionary } from '@/lib/i18n/types';

type Props = {
  locale: Locale;
  labels: Dictionary['auth']['signup'];
};

const initialState: AuthState = { status: 'idle' };

export function SignupForm({ locale, labels }: Props) {
  const [state, formAction, pending] = useActionState(signUp, initialState);

  if (state.status === 'success') {
    return (
      <div className="rounded-xl border border-[var(--color-success)] bg-[var(--color-success)]/5 p-6 text-center text-[var(--color-primary)]">
        <p>{labels.confirmSent}</p>
      </div>
    );
  }

  const errorMessage =
    state.status === 'error'
      ? state.code === 'weak-password'
        ? labels.errorWeakPassword
        : state.code === 'email-taken'
          ? labels.errorEmailTaken
          : labels.errorGeneric
      : null;

  return (
    <form action={formAction} className="space-y-5" noValidate>
      <input type="hidden" name="locale" value={locale} />

      <Field id="name" label={labels.nameLabel}>
        <Input id="name" name="name" type="text" required autoComplete="name" />
      </Field>

      <Field id="email" label={labels.emailLabel}>
        <Input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="you@school.se"
        />
      </Field>

      <Field id="password" label={labels.passwordLabel} hint="min. 8">
        <Input
          id="password"
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
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
