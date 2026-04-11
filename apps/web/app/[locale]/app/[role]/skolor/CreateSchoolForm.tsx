'use client';

import { useActionState } from 'react';
import { createSchool, type CreateSchoolState } from '@/app/actions/admin';
import { Button } from '@/components/ui/Button';
import { Field, Input } from '@/components/ui/Input';
import type { Dictionary } from '@/lib/i18n/types';

type Props = {
  labels: Dictionary['app']['pages']['admin']['schools'];
};

const initialState: CreateSchoolState = { status: 'idle' };

export function CreateSchoolForm({ labels }: Props) {
  const [state, formAction, pending] = useActionState(createSchool, initialState);

  return (
    <form action={formAction} className="space-y-4">
      <Field id="school-name" label={labels.nameLabel}>
        <Input id="school-name" name="name" type="text" required />
      </Field>
      <Field id="school-slug" label={labels.slugLabel}>
        <Input
          id="school-slug"
          name="slug"
          type="text"
          required
          pattern="[a-z0-9-]+"
          placeholder="nacka-gymnasium"
        />
      </Field>
      <Field id="school-country" label={labels.countryLabel}>
        <Input
          id="school-country"
          name="country"
          type="text"
          maxLength={2}
          defaultValue="SE"
        />
      </Field>

      {state.status === 'success' ? (
        <p role="status" className="text-sm text-[var(--color-success)]">
          {labels.createSuccess}
        </p>
      ) : null}
      {state.status === 'error' ? (
        <p role="alert" className="text-sm text-[var(--color-error)]">
          {labels.createError}
          {state.detail ? ` — ${state.detail}` : ''}
        </p>
      ) : null}

      <Button type="submit" disabled={pending} className="w-full">
        {pending ? labels.creating : labels.createSubmit}
      </Button>
    </form>
  );
}
