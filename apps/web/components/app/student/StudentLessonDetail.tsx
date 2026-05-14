import Link from 'next/link';
import type { Locale } from '@/lib/i18n/config';
import type { Dictionary } from '@/lib/i18n/types';
import type { StudentLessonDetail as StudentLessonDetailData } from '@/lib/data/student';
import { MaterialList } from '@/app/[locale]/app/[role]/lektioner/[id]/MaterialList';
import { LessonChatForm } from '@/app/[locale]/app/[role]/lektioner/[id]/LessonChatForm';
import { LessonSummary } from '@/components/app/student/LessonSummary';
import { SuggestedQuestions } from '@/components/app/student/SuggestedQuestions';

// Editorial Calm — Stitch screen 09-lektionsdetalj.png

type Props = {
  locale: Locale;
  lesson: StudentLessonDetailData;
  dict: Dictionary;
};

function statusDotClass(status: StudentLessonDetailData['status']): string {
  if (status === 'ready') return 'status-dot status-dot--sage';
  if (status === 'processing') return 'status-dot status-dot--sand';
  if (status === 'failed') return 'status-dot status-dot--coral';
  return 'status-dot status-dot--sand';
}

function statusLabel(
  status: StudentLessonDetailData['status'],
  dict: Dictionary,
): string {
  const map = dict.app.pages.teacher.statuses;
  return map[status as keyof typeof map] ?? status;
}

export function StudentLessonDetail({ locale, lesson, dict }: Props) {
  const sv = locale === 'sv';
  const labels = dict.app.pages.student.lessonDetail;
  const chatLabels = dict.app.pages.student.chat;
  const base = `/${locale}/app/student`;

  const recordedLabel = lesson.recordedAt
    ? new Intl.DateTimeFormat(locale === 'sv' ? 'sv-SE' : 'en-GB', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(new Date(lesson.recordedAt))
    : labels.notRecorded;

  return (
    <div className="container-wide py-10 md:py-14">
      {/* Breadcrumb */}
      <nav className="mb-8 text-[0.8125rem] text-[var(--color-ink-muted)]">
        <Link href={`${base}/bibliotek`} className="hover:text-[var(--color-ink)]">
          {sv ? 'Bibliotek' : 'Library'}
        </Link>
        <span className="px-2 text-[var(--color-sand-strong)]">/</span>
        {lesson.course?.name ? (
          <Link
            href={`${base}/bibliotek?course=${lesson.course.id}`}
            className="hover:text-[var(--color-ink)]"
          >
            {lesson.course.name}
          </Link>
        ) : (
          <span>—</span>
        )}
        <span className="px-2 text-[var(--color-sand-strong)]">/</span>
        <span className="text-[var(--color-ink-secondary)]">
          {lesson.title ?? lesson.id}
        </span>
      </nav>

      {/* Header */}
      <header>
        <div className="flex items-center gap-3">
          <span className={statusDotClass(lesson.status)} aria-hidden="true" />
          <span className="text-[0.8125rem] uppercase tracking-[0.1em] text-[var(--color-ink-secondary)]">
            {statusLabel(lesson.status, dict)}
          </span>
        </div>
        <h1 className="mt-3 font-serif text-[clamp(2rem,3vw+1rem,2.75rem)] leading-tight text-[var(--color-ink)]">
          {lesson.title ?? lesson.course?.name ?? lesson.id}
        </h1>
        <p className="mt-3 text-[0.9375rem] text-[var(--color-ink-secondary)]">
          {[lesson.course?.name, lesson.teacher?.full_name, recordedLabel]
            .filter(Boolean)
            .join(' · ')}
        </p>
      </header>

      {/* 2-col layout */}
      <div className="mt-10 grid gap-10 md:grid-cols-12">
        {/* LEFT — Summary + Suggested questions + Chat input (7 col) */}
        <div className="md:col-span-7 space-y-6">
          {lesson.summary ? (
            <LessonSummary summary={lesson.summary} />
          ) : (
            <section className="rounded-[20px] bg-[var(--color-surface)] p-6 md:p-8">
              <p className="text-[0.9375rem] text-[var(--color-ink-muted)]">
                {labels.transcriptPending}
              </p>
            </section>
          )}

          {lesson.suggestedQuestions.length > 0 && (
            <SuggestedQuestions
              locale={locale}
              lessonId={lesson.id}
              questions={lesson.suggestedQuestions}
            />
          )}

          <section className="rounded-[20px] bg-[var(--color-surface)] p-6">
            <h2 className="font-serif text-[1.125rem] text-[var(--color-ink)]">
              {sv ? 'Fråga om den här lektionen' : 'Ask about this lesson'}
            </h2>
            <p className="mt-2 text-[0.875rem] text-[var(--color-ink-secondary)]">
              {sv
                ? 'Elevante svarar med exakt vad läraren sa, och var det sas.'
                : 'Elevante answers with exactly what the teacher said, and where.'}
            </p>
            <div className="mt-4">
              <LessonChatForm
                locale={locale}
                lessonId={lesson.id}
                labels={chatLabels}
                placeholderOverride={
                  lesson.suggestedQuestions.length > 0
                    ? sv
                      ? 'Eller skriv din egen fråga…'
                      : 'Or write your own question…'
                    : undefined
                }
              />
            </div>
          </section>
        </div>

        {/* RIGHT — Materials + transcript link (5 col) */}
        <aside className="space-y-6 md:col-span-5">
          <div className="rounded-[20px] border border-[var(--color-sand)] p-6">
            <h2 className="font-serif text-[1.125rem] text-[var(--color-ink)]">
              {labels.materialsHeading}
            </h2>
            <div className="mt-4">
              <MaterialList
                materials={lesson.materials}
                emptyText={labels.materialsEmpty}
              />
            </div>
          </div>

          {lesson.status === 'ready' && lesson.transcriptText && (
            <Link
              href={`${base}/lektioner/${lesson.id}/transkript`}
              className="block text-[0.875rem] text-[var(--color-ink-muted)] underline-offset-4 hover:underline"
            >
              {sv ? 'Visa hela transkriptet →' : 'View full transcript →'}
            </Link>
          )}
        </aside>
      </div>
    </div>
  );
}
