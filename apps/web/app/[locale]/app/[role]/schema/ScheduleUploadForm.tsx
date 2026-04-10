'use client';

import { useActionState } from 'react';
import {
  uploadSchedule,
  type ScheduleUploadState,
} from '@/app/actions/schedule';
import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Input';
import type { Dictionary } from '@/lib/i18n/types';

type Props = {
  labels: Dictionary['app']['pages']['admin']['schedule'];
};

const initialState: ScheduleUploadState = { status: 'idle' };

export function ScheduleUploadForm({ labels }: Props) {
  const [state, formAction, pending] = useActionState(uploadSchedule, initialState);

  return (
    <form action={formAction} className="space-y-5">
      <Field id="file" label={labels.uploadLabel} hint={labels.uploadHint}>
        <input
          id="file"
          name="file"
          type="file"
          accept=".csv,text/csv"
          required
          className="block w-full text-sm text-[var(--color-ink-muted)] file:mr-4 file:rounded-full file:border-0 file:bg-[var(--color-accent)] file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-[var(--color-accent-600)]"
        />
      </Field>

      {state.status === 'success' ? (
        <p role="status" className="text-sm text-[var(--color-success)]">
          {labels.success} ({state.inserted})
        </p>
      ) : null}

      {state.status === 'error' ? (
        <p role="alert" className="text-sm text-[var(--color-error)]">
          {state.code === 'invalid' ? labels.errorInvalid : labels.errorGeneric}
          {state.detail ? ` — ${state.detail}` : ''}
        </p>
      ) : null}

      <Button type="submit" disabled={pending}>
        {pending ? labels.uploading : labels.uploadSubmit}
      </Button>
    </form>
  );
}
