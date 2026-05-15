import type { ReactNode } from 'react';
import type { Locale } from '@/lib/i18n/config';
import type { PracticeAnswer, PracticeQuestion } from '@/lib/supabase/database';

type Props = {
  questions: PracticeQuestion[];
  answers: PracticeAnswer[];
  overallFeedback: string;
  score: number;
  maxScore: number;
  locale: Locale;
  headerNote?: string;
  footer?: ReactNode;
};

function scoreTone(ratio: number): string {
  if (ratio >= 0.999) return 'var(--color-sage)';
  if (ratio > 0) return 'var(--color-sand-strong)';
  return 'var(--color-coral)';
}

/** Resultatvy för ett rättat testprov — delas av elev- och lärarvyn. */
export function TestResult({
  questions,
  answers,
  overallFeedback,
  score,
  maxScore,
  locale,
  headerNote,
  footer,
}: Props) {
  const sv = locale === 'sv';
  const percent = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
  const answerByQuestion = new Map(answers.map((a) => [a.question_id, a]));

  return (
    <div className="space-y-8">
      {/* Poäng-header */}
      <div className="rounded-[20px] bg-[var(--color-surface)] p-6 text-center">
        <p className="eyebrow">{headerNote ?? (sv ? 'Resultat' : 'Result')}</p>
        <p className="mt-2 font-serif text-[2.75rem] leading-none text-[var(--color-ink)] tabular-nums">
          {score}
          <span className="text-[var(--color-ink-muted)]">/{maxScore}</span>
        </p>
        <p className="mt-1 text-[0.9375rem] text-[var(--color-ink-secondary)]">
          {percent}%
        </p>
        {overallFeedback ? (
          <p className="mx-auto mt-4 max-w-xl text-[0.9375rem] italic leading-relaxed text-[var(--color-ink-secondary)]">
            {overallFeedback}
          </p>
        ) : null}
      </div>

      {/* Per fråga */}
      <ol className="space-y-5">
        {questions.map((q, idx) => {
          const a = answerByQuestion.get(q.id);
          const points = a?.points ?? 0;
          const ratio = q.max_points > 0 ? points / q.max_points : 0;
          return (
            <li
              key={q.id}
              className="rounded-[16px] border border-[var(--color-sand)] bg-[var(--color-surface)] p-5 md:p-6"
            >
              <div className="mb-3 flex items-baseline justify-between gap-4">
                <span className="text-[0.6875rem] uppercase tracking-[0.12em] text-[var(--color-ink-muted)]">
                  {sv ? 'Fråga' : 'Question'} {idx + 1}
                </span>
                <span
                  className="shrink-0 rounded-full px-2.5 py-0.5 text-[0.75rem] font-medium tabular-nums"
                  style={{
                    background: scoreTone(ratio),
                    color: ratio >= 0.999 || ratio === 0 ? '#FFF' : 'var(--color-ink)',
                  }}
                >
                  {points}/{q.max_points}
                </span>
              </div>
              <p className="font-serif text-[1.0625rem] leading-snug text-[var(--color-ink)]">
                {q.prompt}
              </p>

              <div className="mt-3 rounded-[12px] bg-[var(--color-canvas)] px-4 py-3">
                <p className="text-[0.6875rem] uppercase tracking-[0.1em] text-[var(--color-ink-muted)]">
                  {sv ? 'Svar' : 'Answer'}
                </p>
                <p className="mt-1 text-[0.9375rem] text-[var(--color-ink)]">
                  {a?.answer && a.answer.trim().length > 0
                    ? a.answer
                    : sv
                      ? '(inget svar)'
                      : '(no answer)'}
                </p>
              </div>

              {a?.feedback ? (
                <div className="mt-3 rounded-[12px] border-l-2 border-[var(--color-coral)] bg-[var(--color-canvas)] px-4 py-3">
                  <p className="text-[0.6875rem] uppercase tracking-[0.1em] text-[var(--color-ink-muted)]">
                    {sv ? 'Feedback' : 'Feedback'}
                  </p>
                  <p className="mt-1 text-[0.9375rem] leading-relaxed text-[var(--color-ink-secondary)]">
                    {a.feedback}
                  </p>
                </div>
              ) : null}
            </li>
          );
        })}
      </ol>

      {footer ? <div>{footer}</div> : null}
    </div>
  );
}
