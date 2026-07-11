'use client';

import { useActionState } from 'react';
import type { Locale } from '@/lib/i18n/config';
import { TRY_COPY, tr } from '@/lib/try/copy';
import { shareTry, type ShareState } from '@/app/actions/try-share';

const initial: ShareState = { status: 'idle' };

const fieldClass =
  'w-full rounded-full border border-[var(--color-sand)] bg-[var(--color-surface)] px-4 py-3 text-[0.9375rem] text-[var(--color-ink)] outline-none transition placeholder:text-[var(--color-ink-muted)] focus:border-[var(--color-ink)]';

export function ShareTeaser({ locale }: { locale: Locale }) {
  const [state, action, pending] = useActionState(shareTry, initial);

  if (state.status === 'success') {
    return (
      <div
        aria-live="polite"
        className="rounded-[16px] border border-[var(--color-sand)] bg-[var(--color-surface)] p-6 text-[0.9375rem] text-[var(--color-ink)]"
      >
        {tr(locale, TRY_COPY.shareThanks).replace('{recipient}', state.recipient)}
      </div>
    );
  }

  const errorText =
    state.status === 'error'
      ? state.code === 'rate-limit'
        ? tr(locale, TRY_COPY.shareErrorRate)
        : state.code === 'generic'
          ? tr(locale, TRY_COPY.shareErrorGeneric)
          : tr(locale, TRY_COPY.shareErrorMissing)
      : null;

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="locale" value={locale} />
      {/* Honeypot — dolt för människor, bots fyller i det */}
      <input
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="hidden"
      />

      <div className="grid gap-3 sm:grid-cols-2">
        <input
          name="senderName"
          required
          maxLength={100}
          aria-label={tr(locale, TRY_COPY.shareName)}
          placeholder={tr(locale, TRY_COPY.shareName)}
          className={fieldClass}
        />
        <input
          name="senderEmail"
          type="email"
          required
          aria-label={tr(locale, TRY_COPY.shareYourEmail)}
          placeholder={tr(locale, TRY_COPY.shareYourEmail)}
          className={fieldClass}
        />
      </div>
      <input
        name="recipientEmail"
        type="email"
        required
        aria-label={tr(locale, TRY_COPY.shareColleagueEmail)}
        placeholder={tr(locale, TRY_COPY.shareColleagueEmail)}
        className={fieldClass}
      />
      <textarea
        name="message"
        rows={2}
        maxLength={500}
        aria-label={tr(locale, TRY_COPY.shareMessage)}
        placeholder={tr(locale, TRY_COPY.shareMessage)}
        className="w-full rounded-[16px] border border-[var(--color-sand)] bg-[var(--color-surface)] px-4 py-3 text-[0.9375rem] text-[var(--color-ink)] outline-none transition placeholder:text-[var(--color-ink-muted)] focus:border-[var(--color-ink)]"
      />

      {errorText ? (
        <p aria-live="polite" className="text-[0.875rem] text-[var(--color-coral)]">
          {errorText}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="rounded-full bg-[var(--color-ink)] px-6 py-3 text-[0.9375rem] font-medium text-[var(--color-canvas)] transition hover:opacity-90 disabled:opacity-50"
      >
        {pending ? tr(locale, TRY_COPY.shareSending) : tr(locale, TRY_COPY.shareSend)}
      </button>
    </form>
  );
}
