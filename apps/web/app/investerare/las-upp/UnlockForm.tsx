'use client';

import { useActionState } from 'react';
import { unlockInvestorDeck, type GateState } from '../actions';

export default function UnlockForm({ next, lang }: { next: string; lang: 'sv' | 'en' }) {
  const [state, action, pending] = useActionState<GateState, FormData>(unlockInvestorDeck, { error: false });
  const sv = lang === 'sv';
  return (
    <form action={action} className="flex w-full max-w-sm flex-col gap-4">
      <input type="hidden" name="next" value={next} />
      <label className="eyebrow" htmlFor="password">{sv ? 'Lösenord' : 'Password'}</label>
      <input
        id="password" name="password" type="password" autoFocus required
        className="min-h-[52px] rounded-xl border border-ink/15 bg-surface px-4 text-lg outline-none focus:border-coral"
      />
      {state.error && (
        <p className="text-sm text-coral">{sv ? 'Fel lösenord.' : 'Wrong password.'}</p>
      )}
      <button
        type="submit" disabled={pending}
        className="min-h-[52px] rounded-full bg-ink px-8 font-medium text-canvas transition-transform hover:scale-[1.02] disabled:opacity-60"
      >
        {pending ? (sv ? 'Öppnar…' : 'Opening…') : sv ? 'Visa decket →' : 'Open the deck →'}
      </button>
    </form>
  );
}
