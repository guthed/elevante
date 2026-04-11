'use client';

import { useActionState } from 'react';
import { updateUserRole, type UpdateRoleState } from '@/app/actions/admin';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Input';
import type { UserRole } from '@/lib/supabase/database';
import type { Dictionary } from '@/lib/i18n/types';

type Props = {
  userId: string;
  currentRole: UserRole;
  labels: Dictionary['app']['pages']['admin']['users'];
};

const initialState: UpdateRoleState = { status: 'idle' };

export function UserRoleForm({ userId, currentRole, labels }: Props) {
  const [state, formAction, pending] = useActionState(updateUserRole, initialState);

  return (
    <form action={formAction} className="flex items-center gap-2">
      <input type="hidden" name="user_id" value={userId} />
      <Select
        name="role"
        defaultValue={currentRole}
        className="w-36 py-2 text-sm"
      >
        <option value="student">student</option>
        <option value="teacher">teacher</option>
        <option value="admin">admin</option>
      </Select>
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? labels.updating : labels.updateRole}
      </Button>
      {state.status === 'success' ? (
        <span role="status" className="text-xs text-[var(--color-success)]">
          ✓
        </span>
      ) : null}
      {state.status === 'error' ? (
        <span role="alert" className="text-xs text-[var(--color-error)]">
          {labels.updateError}
        </span>
      ) : null}
    </form>
  );
}
