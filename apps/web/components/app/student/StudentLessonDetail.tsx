import Link from 'next/link';
import type { Locale } from '@/lib/i18n/config';
import type { Dictionary } from '@/lib/i18n/types';
import type { StudentLessonDetail as StudentLessonDetailData } from '@/lib/data/student';
import { MaterialList } from '@/app/[locale]/app/[role]/lektioner/[id]/MaterialList';
import { LessonChatForm } from '@/app/[locale]/app/[role]/lektioner/[id]/LessonChatForm';

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
        {/* LEFT — Transcript (60%) */}
        <div className="md:col-span-7">
          <p className="eyebrow mb-4">{labels.transcriptHeading}</p>
          <article className="rounded-[20px] bg-[var(--color-surface)] p-6 md:p-8">
            {lesson.status === 'ready' && lesson.transcriptText ? (
              <pre className="whitespace-pre-wrap font-mono text-[0.875rem] leading-[1.7] text-[var(--color-ink)]">
                {lesson.transcriptText}
              </pre>
            ) : (
              <p className="text-[0.9375rem] text-[var(--color-ink-muted)]">
                {labels.transcriptPending}
              </p>
            )}
          </article>
        </div>

        {/* RIGHT — Chat + Materials (40%) */}
        <aside className="space-y-6 md:col-span-5">
          {/* Chat CTA card */}
          <div className="rounded-[20px] bg-[var(--color-surface)] p-6">
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
              />
            </div>
          </div>

          {/* Materials */}
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
        </aside>
      </div>
    </div>
  );
}
