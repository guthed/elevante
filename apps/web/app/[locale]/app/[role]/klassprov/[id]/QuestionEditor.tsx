'use client';

import { useRouter } from 'next/navigation';
import { useId, useState, useTransition } from 'react';
import {
  publishClassTest,
  regenerateQuestion,
  updateClassTestQuestions,
} from '@/app/actions/class-test';
import { Button } from '@/components/ui/Button';
import type { Locale } from '@/lib/i18n/config';
import type {
  PracticeQuestion,
  PracticeQuestionType,
} from '@/lib/supabase/database';

type Props = {
  testId: string;
  initialQuestions: PracticeQuestion[];
  role: string;
  locale: Locale;
  labels: {
    regenerate: string;
    publish: string;
    points: string;
    save: string;
    remove: string;
  };
};

function typeLabel(type: PracticeQuestionType, sv: boolean): string {
  if (type === 'multiple_choice') return sv ? 'Flerval' : 'Multiple choice';
  if (type === 'short_answer') return sv ? 'Kortsvar' : 'Short answer';
  if (type === 'open') return sv ? 'Öppen fråga' : 'Open question';
  return sv ? 'Resonerande' : 'Reasoning';
}

const fieldClass =
  'w-full rounded-[12px] border border-[var(--color-sand)] bg-[var(--color-canvas)] px-4 py-2.5 text-[0.9375rem] text-[var(--color-ink)] focus:border-[var(--color-ink-secondary)] focus:outline-none';
const labelClass =
  'mb-1.5 block text-[0.6875rem] uppercase tracking-[0.12em] text-[var(--color-ink-muted)]';

export function QuestionEditor({
  testId,
  initialQuestions,
  role,
  locale,
  labels,
}: Props) {
  const sv = locale === 'sv';
  const router = useRouter();
  const fieldPrefix = useId();
  const [questions, setQuestions] =
    useState<PracticeQuestion[]>(initialQuestions);
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null);

  function updateQuestion(id: string, patch: Partial<PracticeQuestion>) {
    setSaved(false);
    setQuestions((prev) =>
      prev.map((q) => (q.id === id ? { ...q, ...patch } : q)),
    );
  }

  function removeQuestion(id: string) {
    setSaved(false);
    setQuestions((prev) =>
      prev.length <= 1 ? prev : prev.filter((q) => q.id !== id),
    );
  }

  function regen(qid: string) {
    setError(null);
    setSaved(false);
    setRegeneratingId(qid);
    startTransition(async () => {
      const res = await regenerateQuestion(testId, qid);
      if (res.ok && res.question) {
        setQuestions((prev) =>
          prev.map((q) => (q.id === qid ? res.question! : q)),
        );
      } else {
        setError(
          sv
            ? 'Kunde inte regenerera frågan. Försök igen.'
            : 'Could not regenerate the question. Try again.',
        );
      }
      setRegeneratingId(null);
    });
  }

  function validate(): boolean {
    const hasEmptyPrompt = questions.some(
      (q) => q.prompt.trim().length === 0,
    );
    if (hasEmptyPrompt) {
      setError(
        sv
          ? 'Varje fråga måste ha en frågetext.'
          : 'Every question needs a prompt.',
      );
      return false;
    }
    return true;
  }

  function handleSave() {
    setError(null);
    setSaved(false);
    if (!validate()) return;
    startTransition(async () => {
      const res = await updateClassTestQuestions(testId, questions);
      if (res.ok) {
        setSaved(true);
      } else {
        setError(
          sv ? 'Kunde inte spara ändringarna.' : 'Could not save the changes.',
        );
      }
    });
  }

  function handlePublish() {
    setError(null);
    setSaved(false);
    if (!validate()) return;
    startTransition(async () => {
      const saveRes = await updateClassTestQuestions(testId, questions);
      if (!saveRes.ok) {
        setError(
          sv ? 'Kunde inte spara ändringarna.' : 'Could not save the changes.',
        );
        return;
      }
      const pubRes = await publishClassTest(testId);
      if (!pubRes.ok) {
        setError(
          sv ? 'Kunde inte publicera provet.' : 'Could not publish the test.',
        );
        return;
      }
      router.push(`/${locale}/app/${role}/klassprov/${testId}`);
      router.refresh();
    });
  }

  return (
    <div className="space-y-8">
      <ol className="space-y-6">
        {questions.map((q, idx) => {
          const promptId = `${fieldPrefix}-prompt-${q.id}`;
          const pointsId = `${fieldPrefix}-points-${q.id}`;
          const answerKeyId = `${fieldPrefix}-answerkey-${q.id}`;
          const isRegenerating = regeneratingId === q.id;
          return (
            <li
              key={q.id}
              className="rounded-[16px] border border-[var(--color-sand)] bg-[var(--color-surface)] p-5 md:p-6"
            >
              <div className="mb-4 flex items-baseline justify-between gap-4">
                <span className="text-[0.6875rem] uppercase tracking-[0.12em] text-[var(--color-ink-muted)]">
                  {sv ? 'Fråga' : 'Question'} {idx + 1} ·{' '}
                  {typeLabel(q.type, sv)}
                </span>
              </div>

              <div className="space-y-4">
                <div>
                  <label htmlFor={promptId} className={labelClass}>
                    {sv ? 'Frågetext' : 'Prompt'}
                  </label>
                  <textarea
                    id={promptId}
                    value={q.prompt}
                    onChange={(e) =>
                      updateQuestion(q.id, { prompt: e.target.value })
                    }
                    rows={3}
                    className={`${fieldClass} resize-y leading-relaxed`}
                  />
                </div>

                {q.type === 'multiple_choice' && q.options ? (
                  <fieldset>
                    <legend className={labelClass}>
                      {sv ? 'Svarsalternativ' : 'Answer options'}
                    </legend>
                    <div className="space-y-2">
                      {q.options.map((option, optIdx) => {
                        const optionId = `${fieldPrefix}-opt-${q.id}-${optIdx}`;
                        const isCorrect = q.correct_index === optIdx;
                        return (
                          <div
                            key={optIdx}
                            className="flex items-center gap-3"
                          >
                            <input
                              type="radio"
                              name={`${fieldPrefix}-correct-${q.id}`}
                              checked={isCorrect}
                              onChange={() =>
                                updateQuestion(q.id, { correct_index: optIdx })
                              }
                              aria-label={
                                sv
                                  ? `Markera alternativ ${optIdx + 1} som rätt`
                                  : `Mark option ${optIdx + 1} as correct`
                              }
                              className="h-4 w-4 shrink-0 accent-[var(--color-ink)]"
                            />
                            <input
                              id={optionId}
                              type="text"
                              value={option}
                              onChange={(e) => {
                                const nextOptions = [...(q.options ?? [])];
                                nextOptions[optIdx] = e.target.value;
                                updateQuestion(q.id, { options: nextOptions });
                              }}
                              aria-label={
                                sv
                                  ? `Alternativ ${optIdx + 1}`
                                  : `Option ${optIdx + 1}`
                              }
                              className={fieldClass}
                            />
                          </div>
                        );
                      })}
                    </div>
                  </fieldset>
                ) : null}

                <div>
                  <label htmlFor={answerKeyId} className={labelClass}>
                    {sv ? 'Facit' : 'Answer key'}
                  </label>
                  <textarea
                    id={answerKeyId}
                    value={q.answer_key}
                    onChange={(e) =>
                      updateQuestion(q.id, { answer_key: e.target.value })
                    }
                    rows={2}
                    className={`${fieldClass} resize-y leading-relaxed`}
                  />
                </div>

                <div className="w-32">
                  <label htmlFor={pointsId} className={labelClass}>
                    {labels.points}
                  </label>
                  <input
                    id={pointsId}
                    type="number"
                    min={1}
                    max={10}
                    value={q.max_points}
                    onChange={(e) => {
                      const next = Number.parseInt(e.target.value, 10);
                      updateQuestion(q.id, {
                        max_points: Number.isNaN(next)
                          ? 1
                          : Math.min(10, Math.max(1, next)),
                      });
                    }}
                    className={`${fieldClass} tabular-nums`}
                  />
                </div>
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => regen(q.id)}
                  disabled={pending}
                >
                  {isRegenerating
                    ? sv
                      ? 'Regenererar…'
                      : 'Regenerating…'
                    : labels.regenerate}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeQuestion(q.id)}
                  disabled={pending || questions.length <= 1}
                >
                  {labels.remove}
                </Button>
              </div>
            </li>
          );
        })}
      </ol>

      <div className="sticky bottom-0 -mx-4 border-t border-[var(--color-sand)] bg-[var(--color-canvas)]/95 px-4 py-4 backdrop-blur">
        {error ? (
          <p
            role="alert"
            className="mb-2 text-[0.875rem] text-[var(--color-error)]"
          >
            {error}
          </p>
        ) : null}
        {saved ? (
          <p
            role="status"
            className="mb-2 text-[0.875rem] text-[var(--color-ink-secondary)]"
          >
            {sv ? 'Ändringarna är sparade.' : 'Changes saved.'}
          </p>
        ) : null}
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleSave}
            disabled={pending}
          >
            {labels.save}
          </Button>
          <Button type="button" onClick={handlePublish} disabled={pending}>
            {labels.publish}
          </Button>
        </div>
      </div>
    </div>
  );
}
