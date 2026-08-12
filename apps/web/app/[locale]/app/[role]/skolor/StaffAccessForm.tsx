'use client';

import { useActionState } from 'react';
import { setStaffAccess, type SetStaffAccessState } from '@/app/actions/admin';
import { Button } from '@/components/ui/Button';
import { Field, Input } from '@/components/ui/Input';
import type { Dictionary } from '@/lib/i18n/types';

type Labels = Dictionary['app']['pages']['admin']['schools']['staff'];

const initialState: SetStaffAccessState = { status: 'idle' };

function errorLabel(state: SetStaffAccessState, labels: Labels): string | null {
  if (state.status !== 'error') return null;
  if (state.code === 'not-found') return labels.errorNotFound;
  if (state.code === 'self') return labels.errorSelf;
  return labels.errorGeneric;
}

export function GrantStaffForm({ labels }: { labels: Labels }) {
  const [state, formAction, pending] = useActionState(setStaffAccess, initialState);
  const error = errorLabel(state, labels);

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="grant" value="true" />
      <Field id="grant-staff-email" label={labels.emailLabel}>
        <Input id="grant-staff-email" type="email" name="email" required maxLength={200} />
      </Field>
      <div className="flex items-center gap-2">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? labels.granting : labels.grantSubmit}
        </Button>
        {state.status === 'success' ? (
          <span role="status" className="text-xs text-[var(--color-success)]">
            ✓ {labels.success}
          </span>
        ) : null}
        {error ? (
          <span role="alert" className="text-xs text-[var(--color-error)]">
            {error}
          </span>
        ) : null}
      </div>
    </form>
  );
}

export function RevokeStaffButton({
  email,
  labels,
}: {
  email: string;
  labels: Labels;
}) {
  const [state, formAction, pending] = useActionState(setStaffAccess, initialState);
  const error = errorLabel(state, labels);

  return (
    <form action={formAction} className="flex items-center gap-2">
      <input type="hidden" name="email" value={email} />
      <input type="hidden" name="grant" value="false" />
      <button
        type="submit"
        disabled={pending}
        className="text-xs text-[var(--color-error)] underline-offset-4 hover:underline disabled:opacity-50"
      >
        {pending ? labels.revoking : labels.revoke}
      </button>
      {error ? (
        <span role="alert" className="text-xs text-[var(--color-error)]">
          {error}
        </span>
      ) : null}
    </form>
  );
}
