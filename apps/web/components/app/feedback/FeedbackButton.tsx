'use client';

import type { Locale } from '@/lib/i18n/config';
import type { FeedbackItemContext } from '@/lib/feedback/context';
import { FEEDBACK_COPY, t } from '@/lib/feedback/copy';
import { useFeedback } from './FeedbackProvider';

type Props = {
  locale: Locale;
  /**
   * `icon` = app-chrome (topbar/sidomeny), diskret.
   * `inline` = inne i en vy, där problemet troligast uppstår — där ska den
   * synas och säga vad den gör.
   */
  variant?: 'icon' | 'inline';
  /** Skickar med vad eleven tittar på utan att vyn behöver registrera det globalt. */
  item?: FeedbackItemContext | null;
  label?: string;
  className?: string;
};

function FlagIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
      <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
    </svg>
  );
}

/**
 * Utlösaren. Renderar ingenting när providern saknas — rapporteringen finns
 * bara för elever, men knappen sitter i app-chrome som alla roller delar.
 */
export function FeedbackButton({ locale, variant = 'icon', item, label, className }: Props) {
  const feedback = useFeedback();
  if (!feedback) return null;

  const aria = t(locale, FEEDBACK_COPY.triggerAria);

  if (variant === 'icon') {
    return (
      <button
        type="button"
        onClick={() => feedback.open(item)}
        aria-label={aria}
        title={aria}
        className={[
          'flex h-9 w-9 items-center justify-center rounded-full text-[var(--color-ink-muted)]',
          'transition-colors hover:bg-[var(--color-surface-soft)] hover:text-[var(--color-ink)]',
          className ?? '',
        ].join(' ')}
      >
        <FlagIcon />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => feedback.open(item)}
      className={[
        'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[0.8125rem]',
        'text-[var(--color-ink-muted)] transition-colors hover:bg-[var(--color-surface-soft)]',
        'hover:text-[var(--color-ink)]',
        className ?? '',
      ].join(' ')}
    >
      <FlagIcon />
      {label ?? t(locale, FEEDBACK_COPY.trigger)}
    </button>
  );
}
