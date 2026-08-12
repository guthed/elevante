'use client';

import { useActionState } from 'react';
import {
  updateUserRole,
  removeUser,
  type UpdateRoleState,
  type RemoveUserState,
} from '@/app/actions/admin';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Input';
import type { UserRole } from '@/lib/supabase/database';
import type { Dictionary } from '@/lib/i18n/types';

type Props = {
  userId: string;
  currentRole: UserRole;
  isSelf: boolean;
  labels: Dictionary['app']['pages']['admin']['users'];
};

const initialUpdateState: UpdateRoleState = { status: 'idle' };
const initialRemoveState: RemoveUserState = { status: 'idle' };

export function UserRoleForm({ userId, currentRole, isSelf, labels }: Props) {
  const [updateState, updateAction, updatePending] = useActionState(
    updateUserRole,
    initialUpdateState,
  );
  const [removeState, removeAction, removePending] = useActionState(
    removeUser,
    initialRemoveState,
  );

  const removeErrorLabel =
    removeState.status === 'error'
      ? removeState.code === 'last-admin'
        ? labels.remove.errorLastAdmin
        : labels.remove.errorGeneric
      : null;

  return (
    <div className="flex flex-col items-end gap-2">
      <form action={updateAction} className="flex items-center gap-2">
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
        <Button type="submit" size="sm" disabled={updatePending}>
          {updatePending ? labels.updating : labels.updateRole}
        </Button>
        {updateState.status === 'success' ? (
          <span role="status" className="text-xs text-[var(--color-success)]">
            ✓
          </span>
        ) : null}
        {updateState.status === 'error' ? (
          <span role="alert" className="text-xs text-[var(--color-error)]">
            {labels.updateError}
          </span>
        ) : null}
      </form>
      {isSelf ? null : (
        <form
          action={removeAction}
          onSubmit={(event) => {
            if (!window.confirm(labels.remove.confirm)) {
              event.preventDefault();
            }
          }}
          className="flex items-center gap-2"
        >
          <input type="hidden" name="user_id" value={userId} />
          <button
            type="submit"
            disabled={removePending}
            className="text-xs text-[var(--color-error)] underline-offset-4 hover:underline disabled:opacity-50"
          >
            {removePending ? labels.remove.removing : labels.remove.button}
          </button>
          {removeErrorLabel ? (
            <span role="alert" className="text-xs text-[var(--color-error)]">
              {removeErrorLabel}
            </span>
          ) : null}
        </form>
      )}
    </div>
  );
}
