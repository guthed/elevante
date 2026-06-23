'use client';

import { useActionState } from 'react';
import {
  updateProfileName,
  updatePassword,
  type AccountState,
} from '@/app/actions/account';
import { Field, Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import type { Locale } from '@/lib/i18n/config';
import type { Dictionary } from '@/lib/i18n/types';
import type { Role } from '@/lib/app/roles';

type Labels = Dictionary['app']['account'];

type Props = {
  locale: Locale;
  role: Role;
  initialName: string;
  email: string;
  labels: Labels;
};

const initial: AccountState = { status: 'idle' };

export function AccountForms({ locale, role, initialName, email, labels }: Props) {
  const [nameState, nameAction, namePending] = useActionState(updateProfileName, initial);
  const [pwState, pwAction, pwPending] = useActionState(updatePassword, initial);

  const nameError =
    nameState.status === 'error'
      ? nameState.code === 'invalid'
        ? labels.errorInvalid
        : labels.errorGeneric
      : null;

  const pwError =
    pwState.status === 'error'
      ? pwState.code === 'weak-password'
        ? labels.errorWeak
        : pwState.code === 'mismatch'
          ? labels.errorMismatch
          : labels.errorGeneric
      : null;

  return (
    <div className="space-y-12">
      {/* Profil */}
      <section>
        <h2 className="font-serif text-[1.25rem] text-[var(--color-ink)]">
          {labels.profileHeading}
        </h2>

        <form action={nameAction} className="mt-4 space-y-4" noValidate>
          <input type="hidden" name="locale" value={locale} />
          <input type="hidden" name="role" value={role} />
          <Field id="name" label={labels.nameLabel}>
            <Input
              id="name"
              name="name"
              type="text"
              required
              defaultValue={initialName}
              autoComplete="name"
              invalid={nameState.status === 'error'}
            />
          </Field>
          {nameError ? (
            <p role="alert" className="text-sm text-[var(--color-error)]">
              {nameError}
            </p>
          ) : null}
          {nameState.status === 'success' ? (
            <p role="status" className="text-sm text-[var(--color-ink-secondary)]">
              {labels.nameSaved}
            </p>
          ) : null}
          <Button type="submit" disabled={namePending}>
            {namePending ? labels.saving : labels.saveName}
          </Button>
        </form>

        <div className="mt-6">
          <Field id="email" label={labels.emailLabel}>
            <Input id="email" name="email" type="email" value={email} disabled readOnly />
          </Field>
          <p className="mt-2 text-[0.8125rem] text-[var(--color-ink-muted)]">
            {labels.emailHint}
          </p>
        </div>
      </section>

      {/* Säkerhet */}
      <section>
        <h2 className="font-serif text-[1.25rem] text-[var(--color-ink)]">
          {labels.securityHeading}
        </h2>

        <form action={pwAction} className="mt-4 space-y-4" noValidate>
          <Field id="password" label={labels.newPasswordLabel}>
            <Input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="new-password"
              invalid={pwState.status === 'error' && pwState.code === 'weak-password'}
            />
          </Field>
          <Field id="confirm" label={labels.confirmPasswordLabel}>
            <Input
              id="confirm"
              name="confirm"
              type="password"
              required
              autoComplete="new-password"
              invalid={pwState.status === 'error' && pwState.code === 'mismatch'}
            />
          </Field>
          {pwError ? (
            <p role="alert" className="text-sm text-[var(--color-error)]">
              {pwError}
            </p>
          ) : null}
          {pwState.status === 'success' ? (
            <p role="status" className="text-sm text-[var(--color-ink-secondary)]">
              {labels.passwordSaved}
            </p>
          ) : null}
          <Button type="submit" disabled={pwPending}>
            {pwPending ? labels.saving : labels.savePassword}
          </Button>
        </form>
      </section>
    </div>
  );
}
