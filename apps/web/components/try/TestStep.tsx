'use client';

import { useState } from 'react';
import type { Locale } from '@/lib/i18n/config';
import { TRY_COPY, tr } from '@/lib/try/copy';

type PublicQuestion = {
  id: string;
  type: 'multiple_choice' | 'short_answer' | 'open' | 'reasoning';
  prompt: string;
  lesson_id: string;
  options: string[] | null;
  max_points: number;
};

type GradedAnswer = {
  question_id: string;
  answer: string;
  points: number;
  max_points: number;
  correct: boolean | null;
  feedback: string;
};

type GradeResponse = {
  answers: GradedAnswer[];
  overallFeedback: string;
  score: number;
  maxScore: number;
};

type Phase = 'intro' | 'answering' | 'result';

type Props = { locale: Locale; lessonIds: string[] };

export function TestStep({ locale, lessonIds }: Props) {
  const [phase, setPhase] = useState<Phase>('intro');
  const [questions, setQuestions] = useState<PublicQuestion[]>([]);
  const [token, setToken] = useState('');
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<GradeResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function createTest() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/try/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lessonIds, locale }),
      });
      const data = await res.json();
      if (res.status === 429) setError(tr(locale, TRY_COPY.rateLimited));
      else if (!res.ok || data.offline || !Array.isArray(data.questions))
        setError(tr(locale, TRY_COPY.testError));
      else {
        setQuestions(data.questions);
        setToken(data.token);
        setAnswers({});
        setPhase('answering');
      }
    } catch {
      setError(tr(locale, TRY_COPY.testError));
    } finally {
      setBusy(false);
    }
  }

  async function grade() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/try/grade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          locale,
          answers: questions.map((q) => ({ question_id: q.id, answer: answers[q.id] ?? '' })),
        }),
      });
      const data = await res.json();
      if (res.status === 429) setError(tr(locale, TRY_COPY.rateLimited));
      else if (!res.ok || !Array.isArray(data.answers)) setError(tr(locale, TRY_COPY.testError));
      else {
        setResult(data);
        setPhase('result');
      }
    } catch {
      setError(tr(locale, TRY_COPY.testError));
    } finally {
      setBusy(false);
    }
  }

  if (phase === 'intro') {
    return (
      <div>
        <h2 className="font-serif text-[clamp(1.5rem,2vw+1rem,2rem)] leading-tight text-[var(--color-ink)]">
          {tr(locale, TRY_COPY.testTitle)}
        </h2>
        <p className="mt-2 max-w-prose text-[0.9375rem] leading-relaxed text-[var(--color-ink-secondary)]">
          {tr(locale, TRY_COPY.testIntro)}
        </p>
        {error ? <p className="mt-4 text-[0.875rem] text-[var(--color-coral)]">{error}</p> : null}
        <button
          type="button"
          onClick={createTest}
          disabled={busy}
          className="mt-6 inline-flex items-center gap-2 rounded-full bg-[var(--color-ink)] px-6 py-3 text-[0.9375rem] text-[var(--color-canvas)] disabled:opacity-40"
        >
          {busy ? tr(locale, TRY_COPY.creatingTest) : tr(locale, TRY_COPY.createTest)}
        </button>
      </div>
    );
  }

  if (phase === 'answering') {
    return (
      <div>
        <h2 className="font-serif text-[1.5rem] leading-tight text-[var(--color-ink)]">
          {tr(locale, TRY_COPY.testTitle)}
        </h2>
        <ol className="mt-6 space-y-6">
          {questions.map((q, idx) => (
            <li
              key={q.id}
              className="rounded-[16px] border border-[var(--color-sand)] bg-[var(--color-surface)] p-5"
            >
              <p className="mb-3 text-[0.9375rem] font-medium text-[var(--color-ink)]">
                {idx + 1}. {q.prompt}
              </p>
              {q.type === 'multiple_choice' && q.options ? (
                <div className="space-y-2">
                  {q.options.map((opt, oi) => (
                    <label
                      key={oi}
                      className="flex cursor-pointer items-start gap-3 rounded-[10px] px-3 py-2 text-[0.9375rem] text-[var(--color-ink)] hover:bg-[var(--color-canvas)]"
                    >
                      <input
                        type="radio"
                        name={q.id}
                        checked={answers[q.id] === String(oi)}
                        onChange={() => setAnswers((a) => ({ ...a, [q.id]: String(oi) }))}
                        className="mt-1"
                      />
                      <span>{opt}</span>
                    </label>
                  ))}
                </div>
              ) : (
                <textarea
                  value={answers[q.id] ?? ''}
                  onChange={(e) => setAnswers((a) => ({ ...a, [q.id]: e.target.value }))}
                  maxLength={1000}
                  rows={3}
                  placeholder={tr(locale, TRY_COPY.answerPlaceholder)}
                  className="w-full rounded-[10px] border border-[var(--color-sand)] bg-[var(--color-canvas)] px-3 py-2 text-[0.9375rem] text-[var(--color-ink)] outline-none focus:border-[var(--color-ink)]"
                />
              )}
            </li>
          ))}
        </ol>
        {error ? <p className="mt-4 text-[0.875rem] text-[var(--color-coral)]">{error}</p> : null}
        <button
          type="button"
          onClick={grade}
          disabled={busy}
          className="mt-6 inline-flex items-center gap-2 rounded-full bg-[var(--color-ink)] px-6 py-3 text-[0.9375rem] text-[var(--color-canvas)] disabled:opacity-40"
        >
          {busy ? tr(locale, TRY_COPY.gradingTest) : tr(locale, TRY_COPY.gradeTest)}
        </button>
      </div>
    );
  }

  // phase === 'result'
  const r = result!;
  const percent = r.maxScore > 0 ? Math.round((r.score / r.maxScore) * 100) : 0;
  const byId = new Map(r.answers.map((a) => [a.question_id, a]));
  return (
    <div className="space-y-8">
      <div className="rounded-[20px] bg-[var(--color-surface)] p-6 text-center">
        <p className="eyebrow">{locale === 'en' ? 'Result' : 'Resultat'}</p>
        <p className="mt-2 font-serif text-[2.25rem] leading-none text-[var(--color-ink)] tabular-nums md:text-[2.75rem]">
          {r.score}
          <span className="text-[var(--color-ink-muted)]">/{r.maxScore}</span>
        </p>
        <p className="mt-1 text-[0.9375rem] text-[var(--color-ink-secondary)]">{percent}%</p>
        {r.overallFeedback ? (
          <p className="mx-auto mt-4 max-w-xl text-[0.9375rem] italic leading-relaxed text-[var(--color-ink-secondary)]">
            {r.overallFeedback}
          </p>
        ) : null}
      </div>

      <ol className="space-y-5">
        {questions.map((q, idx) => {
          const a = byId.get(q.id);
          return (
            <li
              key={q.id}
              className="rounded-[16px] border border-[var(--color-sand)] bg-[var(--color-surface)] p-5"
            >
              <div className="mb-2 flex items-baseline justify-between gap-4">
                <span className="text-[0.6875rem] uppercase tracking-[0.12em] text-[var(--color-ink-muted)]">
                  {locale === 'en' ? 'Question' : 'Fråga'} {idx + 1}
                </span>
                <span className="text-[0.8125rem] tabular-nums text-[var(--color-ink-secondary)]">
                  {a?.points ?? 0}/{q.max_points}
                </span>
              </div>
              <p className="text-[0.9375rem] text-[var(--color-ink)]">{q.prompt}</p>
              {a?.feedback ? (
                <p className="mt-3 rounded-[10px] bg-[var(--color-canvas)] px-3 py-2 text-[0.875rem] leading-relaxed text-[var(--color-ink-secondary)]">
                  {a.feedback}
                </p>
              ) : null}
            </li>
          );
        })}
      </ol>

      <button
        type="button"
        onClick={() => {
          setPhase('intro');
          setResult(null);
          setQuestions([]);
        }}
        className="text-[0.875rem] text-[var(--color-ink)] underline-offset-4 hover:underline"
      >
        {tr(locale, TRY_COPY.restart)}
      </button>
    </div>
  );
}
