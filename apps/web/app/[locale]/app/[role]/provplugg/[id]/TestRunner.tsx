'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { submitPracticeTest } from '@/app/actions/practice-test';
import { Button } from '@/components/ui/Button';
import type { Locale } from '@/lib/i18n/config';
import type { PracticeQuestion, PracticeQuestionType } from '@/lib/supabase/database';

type Props = {
  testId: string;
  questions: PracticeQuestion[];
  locale: Locale;
};

function typeLabel(type: PracticeQuestionType, sv: boolean): string {
  if (type === 'multiple_choice') return sv ? 'Flerval' : 'Multiple choice';
  if (type === 'short_answer') return sv ? 'Kortsvar' : 'Short answer';
  if (type === 'open') return sv ? 'Öppen fråga' : 'Open question';
  return sv ? 'Resonerande' : 'Reasoning';
}

export function TestRunner({ testId, questions, locale }: Props) {
  const sv = locale === 'sv';
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [error, setError] = useState(false);

  function setAnswer(questionId: string, value: string) {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  }

  const answeredCount = questions.filter(
    (q) => (answers[q.id] ?? '').trim().length > 0,
  ).length;

  function handleSubmit() {
    setError(false);
    const payload = questions.map((q) => ({
      question_id: q.id,
      answer: answers[q.id] ?? '',
    }));
    startTransition(async () => {
      const result = await submitPracticeTest(testId, payload);
      if (result.ok) {
        router.refresh();
      } else {
        setError(true);
      }
    });
  }

  return (
    <div className="space-y-8">
      <ol className="space-y-8">
        {questions.map((q, idx) => (
          <li
            key={q.id}
            className="rounded-[16px] border border-[var(--color-sand)] bg-[var(--color-surface)] p-5 md:p-6"
          >
            <div className="mb-3 flex items-baseline justify-between gap-4">
              <span className="text-[0.6875rem] uppercase tracking-[0.12em] text-[var(--color-ink-muted)]">
                {sv ? 'Fråga' : 'Question'} {idx + 1} · {typeLabel(q.type, sv)}
              </span>
              <span className="shrink-0 text-[0.75rem] text-[var(--color-ink-muted)] tabular-nums">
                {q.max_points} {q.max_points === 1 ? (sv ? 'poäng' : 'point') : (sv ? 'poäng' : 'points')}
              </span>
            </div>
            <p className="font-serif text-[1.0625rem] leading-snug text-[var(--color-ink)]">
              {q.prompt}
            </p>

            <div className="mt-4">
              {q.type === 'multiple_choice' && q.options ? (
                <div className="space-y-2">
                  {q.options.map((option, optIdx) => (
                    <label
                      key={optIdx}
                      className={[
                        'flex cursor-pointer items-center gap-3 rounded-[12px] border px-4 py-2.5 transition-colors',
                        answers[q.id] === String(optIdx)
                          ? 'border-[var(--color-ink-secondary)] bg-[var(--color-canvas)]'
                          : 'border-[var(--color-sand)] hover:bg-[var(--color-surface-soft)]',
                      ].join(' ')}
                    >
                      <input
                        type="radio"
                        name={q.id}
                        value={optIdx}
                        checked={answers[q.id] === String(optIdx)}
                        onChange={() => setAnswer(q.id, String(optIdx))}
                        className="h-4 w-4 shrink-0 accent-[var(--color-ink)]"
                      />
                      <span className="text-[0.9375rem] text-[var(--color-ink)]">
                        {option}
                      </span>
                    </label>
                  ))}
                </div>
              ) : q.type === 'short_answer' ? (
                <input
                  type="text"
                  value={answers[q.id] ?? ''}
                  onChange={(e) => setAnswer(q.id, e.target.value)}
                  placeholder={sv ? 'Ditt svar' : 'Your answer'}
                  className="w-full rounded-[12px] border border-[var(--color-sand)] bg-[var(--color-canvas)] px-4 py-2.5 text-[0.9375rem] text-[var(--color-ink)] focus:border-[var(--color-ink-secondary)] focus:outline-none"
                />
              ) : (
                <textarea
                  value={answers[q.id] ?? ''}
                  onChange={(e) => setAnswer(q.id, e.target.value)}
                  rows={q.type === 'reasoning' ? 6 : 4}
                  placeholder={sv ? 'Skriv ditt svar' : 'Write your answer'}
                  className="w-full resize-y rounded-[12px] border border-[var(--color-sand)] bg-[var(--color-canvas)] px-4 py-3 text-[0.9375rem] leading-relaxed text-[var(--color-ink)] focus:border-[var(--color-ink-secondary)] focus:outline-none"
                />
              )}
            </div>
          </li>
        ))}
      </ol>

      <div className="sticky bottom-0 -mx-4 border-t border-[var(--color-sand)] bg-[var(--color-canvas)]/95 px-4 py-4 backdrop-blur">
        {pending ? (
          <p className="mb-2 text-[0.875rem] text-[var(--color-ink-secondary)]">
            {sv
              ? 'Elevante rättar ditt prov — det tar en stund…'
              : 'Elevante is grading your test — this takes a moment…'}
          </p>
        ) : (
          <p className="mb-2 text-[0.8125rem] text-[var(--color-ink-muted)]">
            {sv
              ? `Du har svarat på ${answeredCount} av ${questions.length} frågor.`
              : `You've answered ${answeredCount} of ${questions.length} questions.`}
          </p>
        )}
        {error ? (
          <p role="alert" className="mb-2 text-[0.875rem] text-[var(--color-error)]">
            {sv
              ? 'Något gick fel vid rättningen. Försök igen.'
              : 'Something went wrong while grading. Try again.'}
          </p>
        ) : null}
        <Button type="button" onClick={handleSubmit} disabled={pending}>
          {pending
            ? sv
              ? 'Rättar…'
              : 'Grading…'
            : sv
              ? 'Lämna in provet'
              : 'Submit test'}
        </Button>
      </div>
    </div>
  );
}
