'use client';
import { useTransition } from 'react';
import { syncSchoolUnitAction } from '@/app/actions/crm';

export function ResyncButton({
  code,
  name,
  skolform,
  label,
}: {
  code: string;
  name: string;
  skolform: string[];
  label: string;
}) {
  const [pending, startTransition] = useTransition();

  function onResync() {
    startTransition(async () => {
      await syncSchoolUnitAction({ code, name, skolform });
    });
  }

  return (
    <button
      type="button"
      onClick={onResync}
      disabled={pending}
      className="rounded-lg border border-ink/15 bg-canvas px-2.5 py-1 text-xs text-ink/70 disabled:opacity-50"
    >
      {pending ? '…' : label}
    </button>
  );
}
