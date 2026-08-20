'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState, useTransition } from 'react';
import { submitFeedback } from '@/app/actions/feedback';
import { Button } from '@/components/ui/Button';
import type { Locale } from '@/lib/i18n/config';
import type { FeedbackCategory } from '@/lib/supabase/database';
import type { FeedbackItemContext } from '@/lib/feedback/context';
import { CATEGORY_COPY, FEEDBACK_CATEGORIES, FEEDBACK_COPY, t } from '@/lib/feedback/copy';
import { deriveSurface, surfaceLabel } from '@/lib/feedback/surface';

type Props = {
  locale: Locale;
  role: string;
  open: boolean;
  item: FeedbackItemContext | null;
  onClose: () => void;
};

type ErrorCode = 'missing' | 'rate-limit' | 'generic';

const MAX_MESSAGE = 2000;

export function FeedbackSheet({ locale, role, open, item, onClose }: Props) {
  const pathname = usePathname();
  const surface = deriveSurface(pathname);
  const [pending, startTransition] = useTransition();
  const [category, setCategory] = useState<FeedbackCategory | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState<ErrorCode | null>(null);
  const [sent, setSent] = useState(false);

  const dialogRef = useRef<HTMLDialogElement>(null);
  const firstChoiceRef = useRef<HTMLButtonElement>(null);
  const successRef = useRef<HTMLParagraphElement>(null);

  // <dialog> öppnas imperativt — showModal() ger fokusfälla, Esc och
  // inert bakgrund gratis, vilket en div-baserad overlay måste bygga för hand.
  //
  // Ingen nollställning av formuläret här: providern ger komponenten en ny
  // `key` för varje öppning, så state är färskt redan vid montering. Att i
  // stället setState:a i den här effekten gav kaskadrenders (och en riktig
  // lint-flagga) — samma familj av fel som formAction-fällan i OvaPicker:
  // state satt på fel plats i renderordningen.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      firstChoiceRef.current?.focus();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  // Kvittot ersätter formuläret — utan explicit fokus hamnar en
  // skärmläsare kvar på en knapp som inte längre finns.
  useEffect(() => {
    if (sent) successRef.current?.focus();
  }, [sent]);

  function handleSubmit() {
    if (!category) {
      setError('missing');
      return;
    }
    setError(null);

    const formData = new FormData();
    formData.set('category', category);
    formData.set('surface', surface);
    formData.set('message', message);
    formData.set('path', pathname);
    formData.set('locale', locale);
    if (item?.lessonId) formData.set('lesson_id', item.lessonId);
    if (item?.lessonTitle) formData.set('lesson_title', item.lessonTitle);
    if (item?.itemType) formData.set('item_type', item.itemType);
    if (item?.itemId) formData.set('item_id', item.itemId);
    if (item?.itemLabel) formData.set('item_label', item.itemLabel);
    if (item?.conceptName) formData.set('concept_name', item.conceptName);

    startTransition(async () => {
      const result = await submitFeedback(formData);
      if (result.ok) setSent(true);
      else setError(result.code);
    });
  }

  const attached: string[] = [surfaceLabel(surface, locale)];
  if (item?.lessonTitle) attached.push(item.lessonTitle);
  if (item?.conceptName) attached.push(item.conceptName);
  if (item?.itemType) {
    attached.push(
      item.itemType === 'flashcard'
        ? locale === 'en'
          ? 'the card you are on'
          : 'kortet du är på'
        : locale === 'en'
          ? 'the question you are on'
          : 'frågan du är på',
    );
  }

  return (
    <dialog
      ref={dialogRef}
      // onClose fångar både Esc och dialog.close() — utan den blir React-state
      // och DOM osynkade efter ett Esc-tryck och bladet går inte att öppna igen.
      onClose={onClose}
      aria-labelledby="feedback-sheet-title"
      className={[
        'w-[min(32rem,100%)] rounded-t-[20px] p-0 text-[var(--color-ink)]',
        'bg-[var(--color-canvas)] shadow-[0_-8px_40px_rgba(26,26,46,0.18)]',
        // Centreringen sätts EXPLICIT. Webbläsarens egen dialog-stil centrerar
        // via `margin: auto`, men Tailwinds preflight nollar marginalen på
        // allt — bladet hamnade då i vänsterkanten. Mobil: blad underifrån,
        // förankrat i botten. sm och uppåt: centrerad dialog, rundad runtom.
        'mx-auto mt-auto mb-0 sm:my-auto sm:rounded-[20px] sm:shadow-[0_12px_48px_rgba(26,26,46,0.18)]',
        'backdrop:bg-[rgba(26,26,46,0.35)] backdrop:backdrop-blur-[2px]',
        'open:flex open:flex-col',
      ].join(' ')}
    >
      <div className="max-h-[85vh] overflow-y-auto px-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-6 sm:px-7 sm:pb-7">
        {sent ? (
          <div className="py-4 text-center">
            <h2
              id="feedback-sheet-title"
              className="font-serif text-[1.375rem] text-[var(--color-ink)]"
            >
              {t(locale, FEEDBACK_COPY.successTitle)}
            </h2>
            <p
              ref={successRef}
              tabIndex={-1}
              className="mt-2 rounded-[8px] text-[0.9375rem] leading-relaxed text-[var(--color-ink-secondary)]"
            >
              {t(locale, FEEDBACK_COPY.successBody)}
            </p>
            <div className="mt-6">
              <Button type="button" onClick={onClose}>
                {t(locale, FEEDBACK_COPY.close)}
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-start justify-between gap-4">
              <h2
                id="feedback-sheet-title"
                className="font-serif text-[1.375rem] leading-tight text-[var(--color-ink)]"
              >
                {t(locale, FEEDBACK_COPY.title)}
              </h2>
              <button
                type="button"
                onClick={onClose}
                aria-label={t(locale, FEEDBACK_COPY.close)}
                className="-mr-1 -mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[var(--color-ink-muted)] transition-colors hover:bg-[var(--color-surface-soft)] hover:text-[var(--color-ink)]"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  aria-hidden="true"
                >
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Ramen som håller kanalen ren: rapporten handlar om appen, inte
                om ämnet. Utan den blir databasen en läxhjälpskanal. */}
            <p className="mt-2 text-[0.875rem] leading-relaxed text-[var(--color-ink-secondary)]">
              {t(locale, FEEDBACK_COPY.scopeNote)}{' '}
              <Link
                href={`/${locale}/app/${role}/chat`}
                onClick={onClose}
                className="underline underline-offset-2 hover:text-[var(--color-ink)]"
              >
                {t(locale, FEEDBACK_COPY.scopeLinkLabel)}
              </Link>
            </p>

            <div className="mt-5 space-y-2">
              {FEEDBACK_CATEGORIES.map((c, i) => {
                const active = category === c;
                return (
                  <button
                    key={c}
                    ref={i === 0 ? firstChoiceRef : undefined}
                    type="button"
                    aria-pressed={active}
                    onClick={() => {
                      setCategory(c);
                      setError(null);
                    }}
                    className={[
                      'w-full rounded-[14px] border px-4 py-3 text-left transition-colors',
                      active
                        ? 'border-[var(--color-ink)] bg-[var(--color-surface)]'
                        : 'border-[var(--color-sand)] hover:bg-[var(--color-surface-soft)]',
                    ].join(' ')}
                  >
                    <span className="block text-[0.9375rem] font-medium text-[var(--color-ink)]">
                      {t(locale, CATEGORY_COPY[c].label)}
                    </span>
                    <span className="mt-0.5 block text-[0.8125rem] leading-relaxed text-[var(--color-ink-muted)]">
                      {t(locale, CATEGORY_COPY[c].hint)}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="mt-5">
              <label
                htmlFor="feedback-message"
                className="block text-[0.8125rem] text-[var(--color-ink-secondary)]"
              >
                {t(locale, FEEDBACK_COPY.messageLabel)}
              </label>
              <textarea
                id="feedback-message"
                rows={3}
                maxLength={MAX_MESSAGE}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={t(locale, FEEDBACK_COPY.messagePlaceholder)}
                className="mt-1.5 w-full resize-y rounded-[12px] border border-[var(--color-sand)] bg-[var(--color-surface)] px-3.5 py-2.5 text-[0.9375rem] leading-relaxed text-[var(--color-ink)] placeholder:text-[var(--color-ink-soft)] focus:border-[var(--color-ink-secondary)] focus:outline-none"
              />
            </div>

            {/* Ingen insamling i smyg: eleven ser exakt vad appen bifogar. */}
            <p className="mt-3 text-[0.75rem] leading-relaxed text-[var(--color-ink-muted)]">
              <span className="font-medium">{t(locale, FEEDBACK_COPY.contextHeading)}:</span>{' '}
              {attached.join(' · ')}
            </p>

            {error ? (
              <p role="alert" className="mt-3 text-[0.8125rem] text-[var(--color-error)]">
                {error === 'missing'
                  ? t(locale, FEEDBACK_COPY.errorMissing)
                  : error === 'rate-limit'
                    ? t(locale, FEEDBACK_COPY.errorRateLimit)
                    : t(locale, FEEDBACK_COPY.errorGeneric)}
              </p>
            ) : null}

            <div className="mt-5 flex items-center justify-end gap-3">
              <Button type="button" variant="ghost" onClick={onClose} disabled={pending}>
                {t(locale, FEEDBACK_COPY.cancel)}
              </Button>
              <Button type="button" onClick={handleSubmit} disabled={pending}>
                {pending
                  ? t(locale, FEEDBACK_COPY.submitting)
                  : t(locale, FEEDBACK_COPY.submit)}
              </Button>
            </div>
          </>
        )}
      </div>
    </dialog>
  );
}
