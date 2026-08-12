'use client';

import { useActionState } from 'react';
import { importStudents, type ImportStudentsState } from '@/app/actions/admin';
import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Input';
import type { Dictionary } from '@/lib/i18n/types';
import type { Locale } from '@/lib/i18n/config';

type Props = {
  locale: Locale;
  labels: Dictionary['app']['pages']['admin']['users']['import'];
};

const initialState: ImportStudentsState = { status: 'idle' };

export function ImportStudentsForm({ locale, labels }: Props) {
  const [state, formAction, pending] = useActionState(importStudents, initialState);

  const reasonLabel: Record<string, string> = {
    'invalid-row': labels.reasonInvalidRow,
    'already-exists': labels.reasonAlreadyExists,
    'class-link-failed': labels.reasonClassLinkFailed,
  };

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="locale" value={locale} />
      <Field id="import-file" label={labels.fileLabel} hint={labels.fileHint}>
        <input
          id="import-file"
          name="file"
          type="file"
          accept=".csv,text/csv"
          required
          className="block w-full text-sm text-[var(--color-primary)] file:mr-4 file:rounded-full file:border-0 file:bg-[var(--color-accent)] file:px-4 file:py-2 file:text-white"
        />
      </Field>

      {state.status === 'success' ? (
        <div role="status" className="space-y-2 text-sm">
          <p className="text-[var(--color-success)]">
            {labels.successCount.replace('{count}', String(state.invited))}
          </p>
          {state.skipped.length > 0 ? (
            <ul className="list-disc space-y-1 pl-5 text-[var(--color-error)]">
              {state.skipped.map((row, index) => (
                <li key={`${row.email}-${index}`}>
                  {row.email} — {reasonLabel[row.reason] ?? labels.reasonGeneric}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
      {state.status === 'error' ? (
        <p role="alert" className="text-sm text-[var(--color-error)]">
          {labels.errorGeneric}
          {state.detail ? ` — ${state.detail}` : ''}
        </p>
      ) : null}

      <Button type="submit" disabled={pending}>
        {pending ? labels.importing : labels.submit}
      </Button>
    </form>
  );
}
