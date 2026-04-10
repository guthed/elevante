'use client';

import { useActionState } from 'react';
import { signIn, type AuthState } from '@/app/actions/auth';
import { Field, Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import type { Locale } from '@/lib/i18n/config';
import type { Dictionary } from '@/lib/i18n/types';

type Props = {
  locale: Locale;
  next: string | undefined;
  labels: Dictionary['auth']['login'];
};

const initialState: AuthState = { status: 'idle' };

export function LoginForm({ locale, next, labels }: Props) {
  const [state, formAction, pending] = useActionState(signIn, initialState);

  const errorMessage =
    state.status === 'error'
      ? state.code === 'invalid'
        ? labels.errorInvalid
        : labels.errorGeneric
      : null;

  return (
    <form action={formAction} className="space-y-5" noValidate>
      <input type="hidden" name="locale" value={locale} />
      {next ? <input type="hidden" name="next" value={next} /> : null}

      <Field id="email" label={labels.emailLabel}>
        <Input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="you@school.se"
          invalid={state.status === 'error' && state.code === 'invalid'}
        />
      </Field>

      <Field id="password" label={labels.passwordLabel}>
        <Input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
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
