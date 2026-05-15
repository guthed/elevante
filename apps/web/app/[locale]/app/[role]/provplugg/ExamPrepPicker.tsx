'use client';

import { useMemo, useState, useTransition } from 'react';
import { startExamPrepChat } from '@/app/actions/chat';
import { createPracticeTest } from '@/app/actions/practice-test';
import { Button } from '@/components/ui/Button';
import { Field, Textarea } from '@/components/ui/Input';
import type { Locale } from '@/lib/i18n/config';
import type { ProvpluggCourse } from '@/lib/data/student';

type Props = {
  locale: Locale;
  courses: ProvpluggCourse[];
};

export function ExamPrepPicker({ locale, courses }: Props) {
  const sv = locale === 'sv';
  const [pending, startTransition] = useTransition();
  const [courseId, setCourseId] = useState(courses[0]?.id ?? '');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [question, setQuestion] = useState('');

  const course = useMemo(
    () => courses.find((c) => c.id === courseId) ?? courses[0],
    [courses, courseId],
  );

  const lessons = course?.lessons ?? [];
  const allSelected = lessons.length > 0 && lessons.every((l) => selected.has(l.id));

  function switchCourse(id: string) {
    setCourseId(id);
    setSelected(new Set());
  }

  function toggleLesson(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(lessons.map((l) => l.id)));
  }

  const selectedCount = lessons.filter((l) => selected.has(l.id)).length;
  const canTest = selectedCount > 0 && !pending;
  const canChat = selectedCount > 0 && question.trim().length > 0 && !pending;
  const estimatedQuestions = Math.min(12, Math.max(4, selectedCount * 2));

  function handleTest(formData: FormData) {
    startTransition(() => {
      createPracticeTest(formData);
    });
  }

  function handleChat(formData: FormData) {
    startTransition(() => {
      startExamPrepChat(formData);
    });
  }

  function formatDate(iso: string | null): string {
    if (!iso) return '';
    return new Intl.DateTimeFormat(sv ? 'sv-SE' : 'en-GB', {
      day: 'numeric',
      month: 'short',
    }).format(new Date(iso));
  }

  return (
    <form className="space-y-8">
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="course_id" value={course?.id ?? ''} />
      {lessons
        .filter((l) => selected.has(l.id))
        .map((l) => (
          <input key={l.id} type="hidden" name="lesson_ids" value={l.id} />
        ))}

      {/* Steg 1 — kurs */}
      <div>
        <p className="eyebrow mb-3">{sv ? '1 · Välj kurs' : '1 · Pick a course'}</p>
        <div className="flex flex-wrap gap-2">
          {courses.map((c) => {
            const active = c.id === course?.id;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => switchCourse(c.id)}
                aria-pressed={active}
                className={[
                  'rounded-full px-4 py-2 text-[0.875rem] transition-colors',
                  active
                    ? 'bg-[var(--color-ink)] text-[var(--color-canvas)]'
                    : 'bg-[var(--color-surface)] text-[var(--color-ink-secondary)] hover:bg-[var(--color-surface-soft)]',
                ].join(' ')}
              >
                {c.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* Steg 2 — lektioner */}
      <div>
        <div className="mb-3 flex items-baseline justify-between gap-4">
          <p className="eyebrow">
            {sv ? '2 · Välj lektioner' : '2 · Pick lessons'}
          </p>
          {lessons.length > 0 ? (
            <button
              type="button"
              onClick={toggleAll}
              className="text-[0.8125rem] text-[var(--color-ink-secondary)] underline-offset-2 hover:text-[var(--color-ink)] hover:underline"
            >
              {allSelected
                ? sv
                  ? 'Avmarkera alla'
                  : 'Clear all'
                : sv
                  ? 'Markera alla'
                  : 'Select all'}
            </button>
          ) : null}
        </div>

        {lessons.length === 0 ? (
          <p className="text-[0.9375rem] text-[var(--color-ink-muted)]">
            {sv
              ? 'Den här kursen har inga färdiga lektioner ännu.'
              : 'This course has no finished lessons yet.'}
          </p>
        ) : (
          <ul className="space-y-1.5">
            {lessons.map((l) => {
              const checked = selected.has(l.id);
              return (
                <li key={l.id}>
                  <label
                    className={[
                      'flex cursor-pointer items-center gap-3 rounded-[12px] border px-4 py-3 transition-colors',
                      checked
                        ? 'border-[var(--color-ink-secondary)] bg-[var(--color-surface)]'
                        : 'border-[var(--color-sand)] hover:bg-[var(--color-surface-soft)]',
                    ].join(' ')}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleLesson(l.id)}
                      className="h-4 w-4 shrink-0 accent-[var(--color-ink)]"
                    />
                    <span className="flex-1 text-[0.9375rem] text-[var(--color-ink)]">
                      {l.title ?? (sv ? 'Namnlös lektion' : 'Untitled lesson')}
                    </span>
                    <span className="shrink-0 text-[0.75rem] text-[var(--color-ink-muted)] tabular-nums">
                      {formatDate(l.recordedAt)}
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Steg 3 — vad vill du göra */}
      <div>
        <p className="eyebrow mb-3">
          {sv ? '3 · Vad vill du göra?' : '3 · What do you want to do?'}
        </p>

        {/* Testprov — primär väg */}
        <div className="rounded-[16px] border border-[var(--color-sand)] bg-[var(--color-surface)] p-5">
          <h3 className="font-serif text-[1.125rem] text-[var(--color-ink)]">
            {sv ? 'Gör ett testprov' : 'Take a practice test'}
          </h3>
          <p className="mt-1.5 text-[0.875rem] leading-relaxed text-[var(--color-ink-secondary)]">
            {sv
              ? `Elevante skapar ett övningsprov med ca ${estimatedQuestions} frågor — flerval, kortsvar och resonerande — utifrån de valda lektionerna. Du fyller i det här och får poäng och feedback.`
              : `Elevante builds a practice test with about ${estimatedQuestions} questions — multiple choice, short answer and reasoning — from the selected lessons. Fill it in and get a score and feedback.`}
          </p>
          <div className="mt-4">
            <Button type="submit" formAction={handleTest} disabled={!canTest}>
              {pending
                ? sv
                  ? 'Skapar provet…'
                  : 'Building the test…'
                : sv
                  ? `Skapa testprov (${selectedCount} ${selectedCount === 1 ? 'lektion' : 'lektioner'})`
                  : `Create practice test (${selectedCount})`}
            </Button>
          </div>
        </div>

        {/* Chatt — sekundär väg */}
        <div className="mt-4 rounded-[16px] border border-[var(--color-sand)] p-5">
          <h3 className="font-serif text-[1.125rem] text-[var(--color-ink)]">
            {sv ? 'Eller ställ en fråga' : 'Or ask a question'}
          </h3>
          <p className="mt-1.5 text-[0.875rem] leading-relaxed text-[var(--color-ink-secondary)]">
            {sv
              ? 'Chatta fritt om de valda lektionerna — bra för att reda ut något du fastnat på.'
              : 'Chat freely about the selected lessons — good for untangling something you got stuck on.'}
          </p>
          <div className="mt-3">
            <Field
              id="exam-prep-question"
              label={
                sv
                  ? 'Ställ en första fråga om de valda lektionerna'
                  : 'Ask a first question about the selected lessons'
              }
            >
              <Textarea
                id="exam-prep-question"
                name="question"
                rows={3}
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder={
                  sv
                    ? 'T.ex. Förklara skillnaden mellan näringskedja och näringsväv'
                    : 'E.g. Explain the difference between a food chain and a food web'
                }
              />
            </Field>
            <div className="mt-3">
              <Button
                type="submit"
                variant="secondary"
                formAction={handleChat}
                disabled={!canChat}
              >
                {pending
                  ? sv
                    ? 'Startar…'
                    : 'Starting…'
                  : sv
                    ? 'Starta chatt'
                    : 'Start chat'}
              </Button>
            </div>
          </div>
        </div>

        {selectedCount === 0 ? (
          <p className="mt-3 text-[0.8125rem] text-[var(--color-ink-muted)]">
            {sv ? 'Välj minst en lektion ovan.' : 'Pick at least one lesson above.'}
          </p>
        ) : null}
      </div>
    </form>
  );
}
