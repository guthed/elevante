'use client';

import { useActionState } from 'react';
import {
  uploadSchedule,
  type ScheduleUploadState,
} from '@/app/actions/schedule';
import { Button } from '@/components/ui/Button';
import { Field, Input } from '@/components/ui/Input';
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

      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="term-start" label={labels.termStartLabel}>
          <Input id="term-start" name="term_start" type="date" />
        </Field>
        <Field id="term-end" label={labels.termEndLabel} hint={labels.termEndHint}>
          <Input id="term-end" name="term_end" type="date" />
        </Field>
      </div>

      {state.status === 'success' ? (
        <div role="status" className="space-y-2 text-sm">
          <p className="text-[var(--color-success)]">
            {labels.success}{' '}
            {labels.successDetail
              .replace('{created}', String(state.created))
              .replace('{updated}', String(state.updated))
              .replace('{skipped}', String(state.skipped))}
          </p>
          {state.unmappedTeachers.length > 0 ? (
            <div className="text-[var(--color-ink-muted)]">
              <p>{labels.unmappedTeachers}</p>
              <p className="mt-1 font-medium text-[var(--color-primary)]">
                {state.unmappedTeachers.join(', ')}
              </p>
            </div>
          ) : null}
        </div>
      ) : null}

      {state.status === 'error' ? (
        <div role="alert" className="space-y-1 text-sm text-[var(--color-error)]">
          <p>
            {state.code === 'invalid' ? labels.errorInvalid : labels.errorGeneric}
            {state.detail ? ` — ${state.detail}` : ''}
          </p>
          {state.issues && state.issues.length > 0 ? (
            <ul className="list-disc space-y-0.5 pl-5">
              {state.issues.map((issue) => (
                <li key={issue}>{issue}</li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      <Button type="submit" disabled={pending}>
        {pending ? labels.uploading : labels.uploadSubmit}
      </Button>
    </form>
  );
}
