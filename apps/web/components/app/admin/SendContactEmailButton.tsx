'use client';
import { useState, useTransition } from 'react';
import { sendProspectContactEmail } from '@/app/actions/crm';

export function SendContactEmailButton({
  code, disabled, label, sentLabel,
}: {
  code: string; disabled: boolean; label: string; sentLabel: string;
}) {
  const [pending, startTransition] = useTransition();
  const [sent, setSent] = useState(false);

  if (disabled && !sent) return <span className="text-xs text-ink/40">—</span>;
  if (sent) return <span className="text-xs text-ink/50">{sentLabel}</span>;

  return (
    <button
      type="button"
      onClick={() =>
        startTransition(async () => {
          const res = await sendProspectContactEmail({ code });
          if (res.status === 'ok') setSent(true);
        })
      }
      disabled={pending}
      className="rounded-lg border border-ink/15 bg-canvas px-2.5 py-1 text-xs text-ink/70 disabled:opacity-50"
    >
      {pending ? '…' : label}
    </button>
  );
}
