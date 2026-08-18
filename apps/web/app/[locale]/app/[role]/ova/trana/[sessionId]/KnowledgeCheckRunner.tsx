'use client';

import Link from 'next/link';
import { useEffect, useRef, useState, useTransition } from 'react';
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
  const done = index >= checks.length;

  const questionCardRef = useRef<HTMLDivElement>(null);
  const nextButtonRef = useRef<HTMLButtonElement>(null);
  const summaryHeadingRef = useRef<HTMLHeadingElement>(null);
  const isFirstRender = useRef(true);

  // Att svara sätter disabled på ALLA valknappar, inklusive den som just
  // hade fokus — en disabled knapp kan inte hålla fokus, så webbläsaren
  // släpper det till <body>. Flytta fokus till knappen som precis dök upp
  // ("Nästa fråga"/"Se resultatet") så flödet fortsätter naturligt.
  useEffect(() => {
    if (picked !== null) {
      nextButtonRef.current?.focus();
    }
  }, [picked]);

  // Mellan frågor: "Nästa fråga"-knappen (som hade fokus) avmonteras när
  // picked återställs och index avancerar — samma fokusförlust som ovan,
  // fast mellan frågor istället för inom en fråga. Hoppar över första
  // renderingen så vi inte stjäl fokus vid sidladdning.
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (done) {
      summaryHeadingRef.current?.focus();
    } else {
      questionCardRef.current?.focus();
    }
  }, [index, done]);

  if (done) {
    return (
      <div className="rounded-[16px] border border-[var(--color-sand)] bg-[var(--color-surface)] p-8 text-center">
        <h2
          ref={summaryHeadingRef}
          tabIndex={-1}
          className="rounded-[8px] font-serif text-[1.375rem] text-[var(--color-ink)]"
        >
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
      {/* Staplas under 640px så att räknaren och den (ofta långa) lektionstiteln
          aldrig delar en rad — samma fix som på flashcard-skärmen. */}
      <div className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
        <p className="text-[0.8125rem] text-[var(--color-ink-muted)]">
          {sv ? 'Fråga' : 'Question'} {index + 1} {sv ? 'av' : 'of'} {checks.length}
        </p>
        <p className="truncate text-[0.8125rem] text-[var(--color-ink-muted)]">
          {check.lessonTitle ?? ''}
        </p>
      </div>

      {check.conceptName ? (
        <p className="text-center text-[0.75rem] font-medium uppercase tracking-wide text-[var(--color-ink-muted)]">
          {check.conceptName}
        </p>
      ) : null}

      <div className="lg:grid lg:grid-cols-[1fr_320px] lg:items-start lg:gap-8">
        <div
          ref={questionCardRef}
          tabIndex={-1}
          className="rounded-[16px] border border-[var(--color-sand)] bg-[var(--color-surface)] p-6"
        >
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
                <Button type="button" ref={nextButtonRef} onClick={handleNext}>
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

        {/* Definitionen är bara meningsfull som fördjupning, inte som stöd
            för att svara — visas därför bara på lg+ (horisontellt utrymme
            finns) och bara efter svar (då är frågan redan besvarad). */}
        {check.conceptDefinition ? (
          <div className="hidden lg:block">
            {answered ? (
              <div className="rounded-[16px] border border-[var(--color-sand)] bg-[var(--color-surface-soft)] p-6">
                <p className="text-[0.8125rem] font-medium uppercase tracking-wide text-[var(--color-sage-deep)]">
                  {check.conceptName ?? (sv ? 'Om konceptet' : 'About this concept')}
                </p>
                <p className="mt-2 text-[0.9375rem] leading-relaxed text-[var(--color-ink-secondary)]">
                  {check.conceptDefinition}
                </p>
              </div>
            ) : (
              <div className="rounded-[16px] border border-dashed border-[var(--color-sand)] p-6">
                <p className="text-[0.8125rem] leading-relaxed text-[var(--color-ink-muted)]">
                  {sv
                    ? 'Svara på frågan för att se mer om konceptet.'
                    : 'Answer the question to see more about this concept.'}
                </p>
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
