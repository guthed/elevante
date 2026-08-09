'use client';

import { useActionState } from 'react';
import { approveUser, type ApproveUserState } from '@/app/actions/admin';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Input';
import type { Dictionary } from '@/lib/i18n/types';

type Props = {
  userId: string;
  labels: Dictionary['app']['pages']['admin']['users'];
};

const initialState: ApproveUserState = { status: 'idle' };

export function PendingApprovalForm({ userId, labels }: Props) {
  const [state, formAction, pending] = useActionState(approveUser, initialState);

  const errorMessage =
    state.status === 'error'
      ? state.code === 'stale'
        ? labels.pending.approveErrorStale
        : labels.pending.approveError
      : null;

  return (
    <form action={formAction} className="flex flex-wrap items-center justify-end gap-2">
      <input type="hidden" name="user_id" value={userId} />
      <Select name="role" defaultValue="student" className="w-36 py-2 text-sm">
        <option value="student">student</option>
        <option value="teacher">teacher</option>
        <option value="admin">admin</option>
      </Select>
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? labels.pending.approving : labels.pending.approve}
      </Button>
      {state.status === 'success' ? (
        <span role="status" className="text-xs text-[var(--color-success)]">
          ✓
        </span>
      ) : null}
      {errorMessage ? (
        <span role="alert" className="text-xs text-[var(--color-error)]">
          {errorMessage}
        </span>
      ) : null}
    </form>
  );
}
