'use client';

import { useActionState } from 'react';
import {
  uploadMaterial,
  type MaterialUploadState,
} from '@/app/actions/materials';
import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Input';
import type { Dictionary } from '@/lib/i18n/types';

type Props = {
  lessonId: string;
  labels: Dictionary['app']['pages']['teacher']['lessonDetail'];
};

const initialState: MaterialUploadState = { status: 'idle' };

export function MaterialUploadForm({ lessonId, labels }: Props) {
  const [state, formAction, pending] = useActionState(
    uploadMaterial,
    initialState,
  );

  const errorMessage =
    state.status === 'error'
      ? state.code === 'too-large'
        ? labels.uploadTooLarge
        : state.code === 'bad-type'
          ? labels.uploadBadType
          : labels.uploadError
      : null;

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="lesson_id" value={lessonId} />
      <Field id="material-file" label={labels.uploadLabel} hint={labels.uploadHint}>
        <input
          id="material-file"
          name="file"
          type="file"
          accept=".pdf,.png,.jpg,.jpeg,.webp,.txt,.docx,.pptx,.xlsx"
          required
          className="block w-full text-sm text-[var(--color-ink-muted)] file:mr-4 file:rounded-full file:border-0 file:bg-[var(--color-accent)] file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-[var(--color-accent-600)]"
        />
      </Field>

      {state.status === 'success' ? (
        <p role="status" className="text-sm text-[var(--color-success)]">
          {labels.uploadSuccess}
        </p>
      ) : null}

      {errorMessage ? (
        <p role="alert" className="text-sm text-[var(--color-error)]">
          {errorMessage}
        </p>
      ) : null}

      <Button type="submit" disabled={pending} className="w-full">
        {pending ? labels.uploading : labels.uploadSubmit}
      </Button>
    </form>
  );
}
