'use client';

import { useActionState } from 'react';
import { bulkInviteUsers, type BulkInviteState } from '@/app/actions/admin';
import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Input';
import type { Dictionary } from '@/lib/i18n/types';

type Props = {
  labels: Dictionary['app']['pages']['admin']['users']['bulkInvite'];
};

const initialState: BulkInviteState = { status: 'idle' };

export function BulkInviteForm({ labels }: Props) {
  const [state, formAction, pending] = useActionState(bulkInviteUsers, initialState);

  const summary =
    state.status === 'success'
      ? labels.resultSummary
          .replace('{invited}', String(state.invited))
          .replace('{alreadyInvited}', String(state.alreadyInvited))
      : null;
  const failedSummary =
    state.status === 'success' && state.failed > 0
      ? labels.resultFailed.replace('{failed}', String(state.failed))
      : null;

  const errorMessage =
    state.status === 'error'
      ? state.code === 'invalid'
        ? `${labels.errorInvalid}${state.detail ? ` — ${state.detail}` : ''}`
        : labels.errorGeneric
      : null;

  return (
    <form action={formAction} className="space-y-4">
      <Field id="bulk-invite-file" label={labels.uploadLabel} hint={labels.hint}>
        <input
          id="bulk-invite-file"
          name="file"
          type="file"
          accept=".csv,text/csv"
          required
          className="block w-full rounded-lg border border-[var(--color-border)] bg-white px-4 py-3 text-sm text-[var(--color-primary)] file:mr-4 file:rounded-full file:border-0 file:bg-[var(--color-primary)] file:px-4 file:py-2 file:text-sm file:font-medium file:text-white"
        />
      </Field>

      {summary ? (
        <p role="status" className="text-sm text-[var(--color-success)]">
          {summary}
        </p>
      ) : null}
      {failedSummary ? (
        <p role="alert" className="text-sm text-[var(--color-error)]">
          {failedSummary}
        </p>
      ) : null}
      {errorMessage ? (
        <p role="alert" className="text-sm text-[var(--color-error)]">
          {errorMessage}
        </p>
      ) : null}

      <Button type="submit" disabled={pending} className="w-full">
        {pending ? labels.submitting : labels.submit}
      </Button>
    </form>
  );
}
