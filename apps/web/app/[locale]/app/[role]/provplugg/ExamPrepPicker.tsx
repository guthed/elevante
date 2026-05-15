'use client';

import { useMemo, useState, useTransition } from 'react';
import { startExamPrepChat } from '@/app/actions/chat';
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
  const canSubmit = selectedCount > 0 && question.trim().length > 0 && !pending;

  function handleSubmit(formData: FormData) {
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
    <form action={handleSubmit} className="space-y-8">
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

      {/* Steg 3 — fråga */}
      <div>
        <p className="eyebrow mb-3">
          {sv ? '3 · Vad vill du börja med?' : '3 · What do you want to start with?'}
        </p>
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
            required
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder={
              sv
                ? 'T.ex. Sammanfatta det viktigaste jag behöver kunna inför provet'
                : 'E.g. Summarise the key things I need to know for the exam'
            }
          />
        </Field>
      </div>

      <div className="flex items-center gap-4">
        <Button type="submit" disabled={!canSubmit}>
          {pending
            ? sv
              ? 'Startar…'
              : 'Starting…'
            : sv
              ? `Starta provplugg (${selectedCount} ${selectedCount === 1 ? 'lektion' : 'lektioner'})`
              : `Start exam prep (${selectedCount})`}
        </Button>
        {selectedCount === 0 ? (
          <p className="text-[0.8125rem] text-[var(--color-ink-muted)]">
            {sv ? 'Välj minst en lektion.' : 'Pick at least one lesson.'}
          </p>
        ) : null}
      </div>
    </form>
  );
}
