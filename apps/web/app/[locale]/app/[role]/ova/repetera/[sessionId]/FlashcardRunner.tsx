'use client';

import Link from 'next/link';
import { useEffect, useRef, useState, useTransition } from 'react';
import { gradeFlashcard } from '@/app/actions/training';
import { Button } from '@/components/ui/Button';
import type { Locale } from '@/lib/i18n/config';
import type { FlashcardSessionItem } from '@/lib/data/training';

type Grade = 'again' | 'hard' | 'good';

type Props = {
  locale: Locale;
  cards: FlashcardSessionItem[];
};

export function FlashcardRunner({ locale, cards }: Props) {
  const sv = locale === 'sv';
  const [, startTransition] = useTransition();
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [grades, setGrades] = useState<Grade[]>([]);
  const done = index >= cards.length;

  const cardButtonRef = useRef<HTMLButtonElement>(null);
  const summaryHeadingRef = useRef<HTMLHeadingElement>(null);
  const isFirstRender = useRef(true);

  // Varje betyg avmonterar den knapp som just hade fokus (nästa korts
  // flip-knapp tar dess plats, eller sammanfattningen om sessionen är
  // klar) — utan explicit refokusering hamnar webbläsarens fokus på
  // <body>, och en tangentbords-/skärmläsaranvändare måste tabba från
  // sidans topp igen för varje kort. Hoppar över den allra första
  // renderingen så vi inte stjäl fokus från någon som bara läser sidan.
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (done) {
      summaryHeadingRef.current?.focus();
    } else {
      cardButtonRef.current?.focus();
    }
  }, [index, done]);

  if (done) {
    const shaky = grades.filter((g) => g !== 'good').length;
    return (
      <div className="rounded-[16px] border border-[var(--color-sand)] bg-[var(--color-surface)] p-8 text-center">
        <h2
          ref={summaryHeadingRef}
          tabIndex={-1}
          className="rounded-[8px] font-serif text-[1.375rem] text-[var(--color-ink)]"
        >
          {sv ? 'Klart för den här gången' : 'Done for now'}
        </h2>
        <p className="mt-3 text-[0.9375rem] leading-relaxed text-[var(--color-ink-secondary)]">
          {sv
            ? `Du gick igenom ${cards.length} kort. ${shaky} kommer tillbaka snart.`
            : `You went through ${cards.length} cards. ${shaky} will come back soon.`}
        </p>
        <div className="mt-6">
          <Link href={`/${locale}/app/student/ova`}>
            <Button type="button">{sv ? 'Träna mer' : 'Practise more'}</Button>
          </Link>
        </div>
      </div>
    );
  }

  const card = cards[index];
  const hasMisconception = Boolean(card.conceptMisconception);

  function handleGrade(grade: Grade) {
    startTransition(() => {
      gradeFlashcard(card.lessonId, card.id, grade);
    });
    setGrades((prev) => [...prev, grade]);
    setFlipped(false);
    setIndex((i) => i + 1);
  }

  const misconceptionLabel = sv ? 'Vanligt missförstånd' : 'Common mix-up';

  return (
    <div className="space-y-4">
      {/* Staplas under 640px så att räknaren och den (ofta långa) lektionstiteln
          aldrig delar en rad — de bröts annars mitt i "Kort 1 av / 20". */}
      <div className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
        <p className="text-[0.8125rem] text-[var(--color-ink-muted)]">
          {sv ? 'Kort' : 'Card'} {index + 1} {sv ? 'av' : 'of'} {cards.length}
        </p>
        <p className="truncate text-[0.8125rem] text-[var(--color-ink-muted)]">
          {card.lessonTitle ?? ''}
        </p>
      </div>

      {card.conceptName ? (
        <p className="text-center text-[0.75rem] font-medium uppercase tracking-wide text-[var(--color-ink-muted)]">
          {card.conceptName}
        </p>
      ) : null}

      <div className="lg:grid lg:grid-cols-[1fr_320px] lg:items-start lg:gap-8">
        <div className="space-y-4">
          <button
            ref={cardButtonRef}
            type="button"
            onClick={() => setFlipped((f) => !f)}
            aria-expanded={flipped}
            className="flex min-h-[220px] w-full flex-col items-center justify-center rounded-[16px] border border-[var(--color-sand)] bg-[var(--color-surface)] p-8 text-center transition-colors hover:bg-[var(--color-surface-soft)] lg:min-h-[320px] lg:p-12"
          >
            <p className="font-serif text-[1.25rem] leading-snug text-[var(--color-ink)] lg:text-[1.75rem]">
              {card.front}
            </p>
            {flipped ? (
              <div className="mt-6 w-full border-t border-[var(--color-sand)] pt-6">
                <p className="text-[0.9375rem] leading-relaxed text-[var(--color-ink-secondary)] lg:text-[1.0625rem]">
                  {card.back}
                </p>
              </div>
            ) : (
              <p className="mt-4 text-[0.8125rem] text-[var(--color-ink-muted)]">
                {sv ? 'Tryck för att se svaret' : 'Tap to see the answer'}
              </p>
            )}
          </button>

          {flipped ? (
            <div className="flex flex-wrap justify-center gap-3">
              <Button type="button" variant="outline" onClick={() => handleGrade('again')}>
                {sv ? 'Vet inte' : "Don't know"}
              </Button>
              <Button type="button" variant="secondary" onClick={() => handleGrade('hard')}>
                {sv ? 'Osäker' : 'Unsure'}
              </Button>
              <Button type="button" onClick={() => handleGrade('good')}>
                {sv ? 'Kan det' : 'Got it'}
              </Button>
            </div>
          ) : null}

          {/* Under 1024px: fyller det tomma utrymmet mellan betygsknapparna och
              bottennavigationen istället för att slösas bort. Döljs på lg där
              samma innehåll istället ligger i sidopanelen till höger. */}
          {flipped && hasMisconception ? (
            <div className="rounded-[12px] border border-[var(--color-sand)] bg-[var(--color-surface-soft)] p-4 lg:hidden">
              <p className="text-[0.75rem] font-medium uppercase tracking-wide text-[var(--color-coral)]">
                {misconceptionLabel}
              </p>
              <p className="mt-1.5 text-[0.875rem] leading-relaxed text-[var(--color-ink-secondary)]">
                {card.conceptMisconception}
              </p>
            </div>
          ) : null}
        </div>

        {hasMisconception ? (
          <div className="hidden lg:block">
            {flipped ? (
              <div className="rounded-[16px] border border-[var(--color-sand)] bg-[var(--color-surface-soft)] p-6">
                <p className="text-[0.8125rem] font-medium uppercase tracking-wide text-[var(--color-coral)]">
                  {misconceptionLabel}
                </p>
                <p className="mt-2 text-[0.9375rem] leading-relaxed text-[var(--color-ink-secondary)]">
                  {card.conceptMisconception}
                </p>
              </div>
            ) : (
              <div className="rounded-[16px] border border-dashed border-[var(--color-sand)] p-6">
                <p className="text-[0.8125rem] leading-relaxed text-[var(--color-ink-muted)]">
                  {sv
                    ? 'Vänd kortet för att se ett vanligt missförstånd om det här konceptet.'
                    : 'Flip the card to see a common mix-up about this concept.'}
                </p>
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
