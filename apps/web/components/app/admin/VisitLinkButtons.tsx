'use client';

import { useState, useTransition } from 'react';
import { ensureVisitLinkAction } from '@/app/actions/crm';

type Dict = { rektor: string; larare: string; copied: string; failed: string };

/**
 * Hämtar (och myntar vid behov) skolans personliga besökslänk och lägger den i
 * urklipp. Koden är stabil, så knappen kan tryckas hur många gånger som helst.
 */
export function VisitLinkButtons({ code, dict }: { code: string; dict: Dict }) {
  const [pending, startTransition] = useTransition();
  const [status, setStatus] = useState<'idle' | 'copied' | 'failed'>('idle');

  function copy(page: 'rektor' | 'larare') {
    setStatus('idle');
    startTransition(async () => {
      try {
        const links = await ensureVisitLinkAction({ code });
        if (!links) {
          setStatus('failed');
          return;
        }
        await navigator.clipboard.writeText(links[page]);
        setStatus('copied');
      } catch {
        setStatus('failed');
      }
    });
  }

  return (
    <span className="flex items-center gap-2">
      {(['rektor', 'larare'] as const).map((page) => (
        <button
          key={page}
          type="button"
          onClick={() => copy(page)}
          disabled={pending}
          className="rounded-full border border-ink/15 px-2.5 py-1 text-xs text-ink/70 transition-colors hover:border-ink/30 hover:text-ink disabled:opacity-50"
        >
          {dict[page]}
        </button>
      ))}
      <span aria-live="polite" className="text-xs text-ink/50">
        {status === 'copied' ? dict.copied : status === 'failed' ? dict.failed : ''}
      </span>
    </span>
  );
}
