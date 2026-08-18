'use client';

import Link from 'next/link';
import { useState, useTransition } from 'react';
import { answerKnowledgeCheck } from '@/app/actions/training';
import { Button } from '@/components/ui/Button';
import type { Locale } from '@/lib/i18n/config';
import type { KnowledgeCheckSessionItem } from '@/lib/data/training';

type Props = {
  locale: Locale;
  checks: KnowledgeCheckSessionItem[];
};

export function KnowledgeCheckRunner({ locale, checks }: Props) {
  const sv = locale === 'sv';
  const [, startTransition] = useTransition();
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [correctCount, setCorrectCount] = useState(0);

  if (index >= checks.length) {
    return (
      <div className="rounded-[16px] border border-[var(--color-sand)] bg-[var(--color-surface)] p-8 text-center">
        <h2 className="font-serif text-[1.375rem] text-[var(--color-ink)]">
          {sv ? 'Klart' : 'Done'}
        </h2>
        <p className="mt-3 text-[0.9375rem] leading-relaxed text-[var(--color-ink-secondary)]">
          {sv
            ? `Du hade rätt på ${correctCount} av ${checks.length}.`
            : `You got ${correctCount} of ${checks.length} right.`}
        </p>
        <div className="mt-6">
          <Link href={`/${locale}/app/student/ova`}>
            <Button type="button">{sv ? 'Träna mer' : 'Practise more'}</Button>
          </Link>
        </div>
      </div>
    );
  }

  const check = checks[index];
  const answered = picked !== null;
  const isLast = index === checks.length - 1;

  function handlePick(i: number) {
    if (picked !== null) return;
    const isCorrect = i === check.correct_index;
    setPicked(i);
    if (isCorrect) setCorrectCount((c) => c + 1);
    startTransition(() => {
      answerKnowledgeCheck(check.lessonId, check.id, isCorrect);
    });
  }

  function handleNext() {
    setPicked(null);
    setIndex((i) => i + 1);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-baseline justify-between gap-4">
        <p className="text-[0.8125rem] text-[var(--color-ink-muted)]">
          {sv ? 'Fråga' : 'Question'} {index + 1} {sv ? 'av' : 'of'} {checks.length}
        </p>
        <p className="truncate text-[0.8125rem] text-[var(--color-ink-muted)]">
          {check.lessonTitle ?? ''}
        </p>
      </div>

      <div className="rounded-[16px] border border-[var(--color-sand)] bg-[var(--color-surface)] p-6">
        <p className="font-serif text-[1.0625rem] leading-snug text-[var(--color-ink)]">
          {check.question}
        </p>

        <div className="mt-5 space-y-2">
          {check.choices.map((choice, i) => {
            const isPicked = picked === i;
            const isCorrect = i === check.correct_index;
            let stateClass = 'border-[var(--color-sand)] hover:bg-[var(--color-surface-soft)]';
            if (answered) {
              if (isCorrect) {
                stateClass = 'border-[var(--color-sage-deep)] bg-[var(--color-sage)]/25';
              } else if (isPicked) {
                stateClass = 'border-[var(--color-coral)] bg-[var(--color-coral)]/15';
              } else {
                stateClass = 'border-[var(--color-sand)] opacity-60';
              }
            }
            return (
              <button
                key={i}
                type="button"
                onClick={() => handlePick(i)}
                disabled={answered}
                aria-pressed={isPicked}
                className={[
                  'w-full rounded-[12px] border px-4 py-3 text-left text-[0.9375rem] text-[var(--color-ink)] transition-colors disabled:cursor-default',
                  stateClass,
                ].join(' ')}
              >
                {choice}
              </button>
            );
          })}
        </div>

        {answered ? (
          <div className="mt-5 border-t border-[var(--color-sand)] pt-5">
            <p className="text-[0.875rem] leading-relaxed text-[var(--color-ink-secondary)]">
              {check.explanation}
            </p>
            <div className="mt-4">
              <Button type="button" onClick={handleNext}>
                {isLast
                  ? sv
                    ? 'Se resultatet'
                    : 'See the result'
                  : sv
                    ? 'Nästa fråga'
                    : 'Next question'}
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
