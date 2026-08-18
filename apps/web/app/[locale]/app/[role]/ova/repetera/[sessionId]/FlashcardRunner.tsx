'use client';

import Link from 'next/link';
import { useState, useTransition } from 'react';
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

  if (index >= cards.length) {
    const shaky = grades.filter((g) => g !== 'good').length;
    return (
      <div className="rounded-[16px] border border-[var(--color-sand)] bg-[var(--color-surface)] p-8 text-center">
        <h2 className="font-serif text-[1.375rem] text-[var(--color-ink)]">
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

  function handleGrade(grade: Grade) {
    startTransition(() => {
      gradeFlashcard(card.lessonId, card.id, grade);
    });
    setGrades((prev) => [...prev, grade]);
    setFlipped(false);
    setIndex((i) => i + 1);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-baseline justify-between gap-4">
        <p className="text-[0.8125rem] text-[var(--color-ink-muted)]">
          {sv ? 'Kort' : 'Card'} {index + 1} {sv ? 'av' : 'of'} {cards.length}
        </p>
        <p className="truncate text-[0.8125rem] text-[var(--color-ink-muted)]">
          {card.lessonTitle ?? ''}
        </p>
      </div>

      <button
        type="button"
        onClick={() => setFlipped((f) => !f)}
        aria-expanded={flipped}
        className="flex min-h-[220px] w-full flex-col items-center justify-center rounded-[16px] border border-[var(--color-sand)] bg-[var(--color-surface)] p-8 text-center transition-colors hover:bg-[var(--color-surface-soft)]"
      >
        <p className="font-serif text-[1.25rem] leading-snug text-[var(--color-ink)]">
          {card.front}
        </p>
        {flipped ? (
          <div className="mt-6 w-full border-t border-[var(--color-sand)] pt-6">
            <p className="text-[0.9375rem] leading-relaxed text-[var(--color-ink-secondary)]">
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
    </div>
  );
}
