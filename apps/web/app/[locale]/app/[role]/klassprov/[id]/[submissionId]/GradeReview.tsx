'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import {
  releaseSubmission,
  updateSubmissionGrade,
} from '@/app/actions/class-test';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Input';
import type { Locale } from '@/lib/i18n/config';
import type {
  ClassTest,
  ClassTestSubmission,
  PracticeQuestionType,
} from '@/lib/supabase/database';

type Props = {
  test: ClassTest;
  submission: ClassTestSubmission;
  role: string;
  locale: Locale;
  labels: {
    release: string;
    released: string;
    overallFeedback: string;
    points: string;
    save: string;
  };
};

function typeLabel(type: PracticeQuestionType, sv: boolean): string {
  if (type === 'multiple_choice') return sv ? 'Flerval' : 'Multiple choice';
  if (type === 'short_answer') return sv ? 'Kortsvar' : 'Short answer';
  if (type === 'open') return sv ? 'Öppen fråga' : 'Open question';
  return sv ? 'Resonerande' : 'Reasoning';
}

export function GradeReview({ submission, test, locale, labels }: Props) {
  const sv = locale === 'sv';
  const router = useRouter();

  const [answers, setAnswers] = useState(
    submission.answers.map((a) => ({
      question_id: a.question_id,
      points: a.points,
      feedback: a.feedback,
    })),
  );
  const [overall, setOverall] = useState(submission.overall_feedback);
  const [pending, startTransition] = useTransition();
  const [released, setReleased] = useState(submission.status === 'released');
  const [saved, setSaved] = useState(false);

  function updatePoints(questionId: string, raw: number, max: number) {
    const clamped = Number.isFinite(raw)
      ? Math.max(0, Math.min(raw, max))
      : 0;
    setSaved(false);
    setAnswers((prev) =>
      prev.map((a) =>
        a.question_id === questionId ? { ...a, points: clamped } : a,
      ),
    );
  }

  function updateFeedback(questionId: string, value: string) {
    setSaved(false);
    setAnswers((prev) =>
      prev.map((a) =>
        a.question_id === questionId ? { ...a, feedback: value } : a,
      ),
    );
  }

  const total = answers.reduce((sum, a) => sum + a.points, 0);

  function handleSave() {
    startTransition(async () => {
      const r = await updateSubmissionGrade(submission.id, {
        answers,
        overallFeedback: overall,
      });
      if (r.ok) setSaved(true);
    });
  }

  function handleRelease() {
    startTransition(async () => {
      const r = await updateSubmissionGrade(submission.id, {
        answers,
        overallFeedback: overall,
      });
      if (!r.ok) return;
      const rel = await releaseSubmission(submission.id);
      if (rel.ok) {
        setReleased(true);
        setSaved(true);
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between gap-4 rounded-[12px] border border-[var(--color-sand)] bg-[var(--color-surface)] px-5 py-4">
        <span className="text-[0.8125rem] uppercase tracking-[0.12em] text-[var(--color-ink-muted)]">
          {sv ? 'Total poäng' : 'Total score'}
        </span>
        <span
          className="font-serif text-[1.375rem] tabular-nums text-[var(--color-ink)]"
          aria-live="polite"
        >
          {total} / {submission.max_score}
        </span>
      </div>

      <ol className="space-y-6">
        {submission.answers.map((a, idx) => {
          const q = test.questions.find((qq) => qq.id === a.question_id);
          const max = q?.max_points ?? a.max_points;
          const edited = answers.find((e) => e.question_id === a.question_id);
          const pointsId = `points-${a.question_id}`;
          const feedbackId = `feedback-${a.question_id}`;
          return (
            <li
              key={a.question_id}
              className="rounded-[16px] border border-[var(--color-sand)] bg-[var(--color-surface)] p-5 md:p-6"
            >
              <div className="mb-3 flex items-baseline justify-between gap-4">
                <span className="text-[0.6875rem] uppercase tracking-[0.12em] text-[var(--color-ink-muted)]">
                  {sv ? 'Fråga' : 'Question'} {idx + 1}
                  {q ? ` · ${typeLabel(q.type, sv)}` : ''}
                </span>
                <span className="shrink-0 text-[0.75rem] tabular-nums text-[var(--color-ink-muted)]">
                  {sv ? 'Max' : 'Max'} {max}
                </span>
              </div>

              {q ? (
                <p className="font-serif text-[1.0625rem] leading-snug text-[var(--color-ink)]">
                  {q.prompt}
                </p>
              ) : null}

              {q ? (
                <div className="mt-3 rounded-[10px] border border-[var(--color-sand)] bg-[var(--color-canvas)] px-4 py-3">
                  <p className="text-[0.6875rem] uppercase tracking-[0.12em] text-[var(--color-ink-muted)]">
                    {sv ? 'Facit' : 'Answer key'}
                  </p>
                  <p className="mt-1 text-[0.875rem] leading-relaxed text-[var(--color-ink-secondary)]">
                    {q.answer_key}
                  </p>
                </div>
              ) : null}

              <div className="mt-4">
                <p className="text-[0.6875rem] uppercase tracking-[0.12em] text-[var(--color-ink-muted)]">
                  {sv ? 'Elevens svar' : "Student's answer"}
                </p>
                <p className="mt-1 whitespace-pre-wrap text-[0.9375rem] leading-relaxed text-[var(--color-ink)]">
                  {a.answer || (
                    <span className="italic text-[var(--color-ink-muted)]">
                      {sv ? '(inget svar)' : '(no answer)'}
                    </span>
                  )}
                </p>
              </div>

              <p className="mt-4 text-[0.8125rem] leading-relaxed text-[var(--color-ink-muted)]">
                AI: {a.ai_points}/{max} — {a.ai_feedback}
              </p>

              <div className="mt-4 grid gap-4 sm:grid-cols-[160px_1fr]">
                <div>
                  <label
                    htmlFor={pointsId}
                    className="block text-[0.8125rem] font-medium text-[var(--color-ink-secondary)]"
                  >
                    {labels.points}
                  </label>
                  <input
                    id={pointsId}
                    type="number"
                    min={0}
                    max={max}
                    inputMode="numeric"
                    value={edited?.points ?? a.points}
                    onChange={(e) =>
                      updatePoints(a.question_id, e.target.valueAsNumber, max)
                    }
                    aria-describedby={`${pointsId}-max`}
                    className="mt-1.5 w-full rounded-[12px] border border-[var(--color-sand)] bg-[var(--color-canvas)] px-4 py-2.5 text-[0.9375rem] tabular-nums text-[var(--color-ink)] focus:border-[var(--color-ink-secondary)] focus:outline-none"
                  />
                  <span
                    id={`${pointsId}-max`}
                    className="mt-1 block text-[0.75rem] text-[var(--color-ink-muted)]"
                  >
                    {sv ? `av ${max}` : `of ${max}`}
                  </span>
                </div>
                <div>
                  <label
                    htmlFor={feedbackId}
                    className="block text-[0.8125rem] font-medium text-[var(--color-ink-secondary)]"
                  >
                    {sv ? 'Feedback' : 'Feedback'}
                  </label>
                  <Textarea
                    id={feedbackId}
                    rows={3}
                    value={edited?.feedback ?? a.feedback}
                    onChange={(e) =>
                      updateFeedback(a.question_id, e.target.value)
                    }
                    className="mt-1.5"
                  />
                </div>
              </div>
            </li>
          );
        })}
      </ol>

      <div>
        <label
          htmlFor="overall-feedback"
          className="block text-[0.8125rem] font-medium text-[var(--color-ink-secondary)]"
        >
          {labels.overallFeedback}
        </label>
        <Textarea
          id="overall-feedback"
          rows={4}
          value={overall}
          onChange={(e) => {
            setSaved(false);
            setOverall(e.target.value);
          }}
          className="mt-1.5"
        />
      </div>

      <div className="sticky bottom-0 -mx-4 flex flex-wrap items-center gap-3 border-t border-[var(--color-sand)] bg-[var(--color-canvas)]/95 px-4 py-4 backdrop-blur">
        <Button type="button" onClick={handleSave} disabled={pending}>
          {pending ? (sv ? 'Sparar…' : 'Saving…') : labels.save}
        </Button>
        {released ? (
          <Badge tone="success">{labels.released}</Badge>
        ) : (
          <Button
            type="button"
            variant="outline"
            onClick={handleRelease}
            disabled={pending}
          >
            {labels.release}
          </Button>
        )}
        {saved && !pending ? (
          <span
            role="status"
            className="text-[0.8125rem] text-[var(--color-ink-muted)]"
          >
            {sv ? 'Sparat' : 'Saved'}
          </span>
        ) : null}
      </div>
    </div>
  );
}
