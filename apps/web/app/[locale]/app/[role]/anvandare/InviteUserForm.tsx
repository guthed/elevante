'use client';

import { useActionState } from 'react';
import { inviteUser, type InviteUserState } from '@/app/actions/admin';
import { Button } from '@/components/ui/Button';
import { Field, Input, Select } from '@/components/ui/Input';
import type { Dictionary } from '@/lib/i18n/types';

type Props = {
  labels: Dictionary['app']['pages']['admin']['users']['invite'];
};

const initialState: InviteUserState = { status: 'idle' };

export function InviteUserForm({ labels }: Props) {
  const [state, formAction, pending] = useActionState(inviteUser, initialState);

  const errorMessage =
    state.status === 'error'
      ? state.code === 'duplicate'
        ? labels.errorDuplicate
        : state.code === 'invalid'
          ? labels.errorInvalid
          : labels.errorGeneric
      : null;

  return (
    <form action={formAction} className="space-y-4">
      <Field id="invite-name" label={labels.nameLabel}>
        <Input id="invite-name" name="name" type="text" required autoComplete="name" />
      </Field>
      <Field id="invite-email" label={labels.emailLabel}>
        <Input id="invite-email" name="email" type="email" required autoComplete="email" />
      </Field>
      <Field id="invite-role" label={labels.roleLabel}>
        <Select id="invite-role" name="role" defaultValue="student">
          <option value="student">student</option>
          <option value="teacher">teacher</option>
          <option value="admin">admin</option>
        </Select>
      </Field>

      {state.status === 'success' ? (
        <p role="status" className="text-sm text-[var(--color-success)]">
          {labels.success}
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
